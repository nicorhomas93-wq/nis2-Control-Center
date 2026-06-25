import type { Document } from "@/lib/types";
import { generateDocumentFileNameFromDocument } from "@/lib/fileNaming";
import { buildPrintHtml } from "@/lib/documents/export";
import { resolveGenerationMode } from "@/lib/documents/generation-mode";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const RENDER_WIDTH_PX = 794;
const MARGIN_MM = 18;
const FOOTER_ZONE_MM = 12;
const BLOCK_GAP_MM = 2;

const CONTENT_TOP_MM = MARGIN_MM;
const CONTENT_BOTTOM_MM = A4_HEIGHT_MM - MARGIN_MM - FOOTER_ZONE_MM;
const MAX_CONTENT_HEIGHT_MM = CONTENT_BOTTOM_MM - CONTENT_TOP_MM;

async function createRenderFrame(html: string): Promise<{
  iframe: HTMLIFrameElement;
  body: HTMLElement;
  generatedAt: string;
}> {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = `position:fixed;left:-10000px;top:0;width:${RENDER_WIDTH_PX}px;border:0;visibility:hidden;`;
  document.body.appendChild(iframe);

  const frameDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!frameDoc) {
    document.body.removeChild(iframe);
    throw new Error("PDF-Rendering konnte nicht initialisiert werden.");
  }

  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  await new Promise<void>((resolve) => setTimeout(resolve, 450));

  const body = frameDoc.body;
  if (frameDoc.documentElement) {
    frameDoc.documentElement.style.background = "#ffffff";
  }
  body.style.width = `${RENDER_WIDTH_PX}px`;
  body.style.background = "#ffffff";

  const generatedAt = body.getAttribute("data-generated-at") ?? "";

  return { iframe, body, generatedAt };
}

function addPdfFooters(
  pdf: InstanceType<typeof import("jspdf").default>,
  generatedAt: string
): void {
  const totalPages = pdf.getNumberOfPages();
  const footerY = A4_HEIGHT_MM - MARGIN_MM + 4;
  const leftText = `Generiert mit TKND NIS2 Control Center · ${generatedAt}`;

  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(leftText, MARGIN_MM, footerY, { align: "left" });
    pdf.text(`Seite ${i} von ${totalPages}`, A4_WIDTH_MM - MARGIN_MM, footerY, {
      align: "right",
    });
  }
}

/**
 * Rendert jeden Inhaltsblock einzeln — Seitenumbrüche nur zwischen Blöcken.
 */
async function renderBlocksToPdf(
  body: HTMLElement,
  pdf: InstanceType<typeof import("jspdf").default>
): Promise<void> {
  const html2canvas = (await import("html2canvas")).default;
  const contentWidth = A4_WIDTH_MM - MARGIN_MM * 2;

  let y = CONTENT_TOP_MM;

  const elements = [
    ...body.querySelectorAll<HTMLElement>(".print-header"),
    ...body.querySelectorAll<HTMLElement>(".meta-table"),
    ...body.querySelectorAll<HTMLElement>(".pdf-block"),
  ];

  if (elements.length === 0) {
    elements.push(...body.querySelectorAll<HTMLElement>(".document-body > *"));
  }

  for (const element of elements) {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      width: RENDER_WIDTH_PX,
      windowWidth: RENDER_WIDTH_PX,
    });

    const imgData = canvas.toDataURL("image/png");
    const imgHeight = (canvas.height * contentWidth) / canvas.width;

    if (imgHeight > MAX_CONTENT_HEIGHT_MM) {
      let offsetY = 0;
      let remaining = imgHeight;

      while (remaining > 0) {
        if (y + Math.min(remaining, MAX_CONTENT_HEIGHT_MM) > CONTENT_BOTTOM_MM) {
          pdf.addPage();
          y = CONTENT_TOP_MM;
        }

        const sliceHeight = Math.min(remaining, MAX_CONTENT_HEIGHT_MM);
        const sourceY = (offsetY / imgHeight) * canvas.height;
        const sourceH = (sliceHeight / imgHeight) * canvas.height;
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sourceH;
        const ctx = sliceCanvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(
            canvas,
            0,
            sourceY,
            canvas.width,
            sourceH,
            0,
            0,
            canvas.width,
            sourceH
          );
          pdf.addImage(
            sliceCanvas.toDataURL("image/png"),
            "PNG",
            MARGIN_MM,
            y,
            contentWidth,
            sliceHeight
          );
        }

        y += sliceHeight + BLOCK_GAP_MM;
        offsetY += sliceHeight;
        remaining -= sliceHeight;

        if (remaining > 0) {
          pdf.addPage();
          y = CONTENT_TOP_MM;
        }
      }
      continue;
    }

    if (y + imgHeight > CONTENT_BOTTOM_MM) {
      pdf.addPage();
      y = CONTENT_TOP_MM;
    }

    pdf.addImage(imgData, "PNG", MARGIN_MM, y, contentWidth, imgHeight);
    y += imgHeight + BLOCK_GAP_MM;
  }
}

export async function generateDocumentPdfBlob(
  doc: Document,
  companyName?: string
): Promise<{ blob: Blob; filename: string }> {
  const mode = resolveGenerationMode(doc);
  const html = buildPrintHtml(doc, companyName, mode, true);
  const filename = generateDocumentFileNameFromDocument(doc, companyName, "pdf");

  const { default: jsPDF } = await import("jspdf");
  const { iframe, body, generatedAt } = await createRenderFrame(html);

  try {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    await renderBlocksToPdf(body, pdf);
    addPdfFooters(pdf, generatedAt);
    return { blob: pdf.output("blob"), filename };
  } finally {
    document.body.removeChild(iframe);
  }
}

export async function downloadDocumentPdf(
  doc: Document,
  companyName?: string
): Promise<string> {
  const { blob, filename } = await generateDocumentPdfBlob(doc, companyName);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return filename;
}
