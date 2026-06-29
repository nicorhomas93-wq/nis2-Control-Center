import type { Document } from "@/lib/types";
import { getDocumentTypeLabel } from "@/lib/nis2/document-types";
import { formatDate } from "@/lib/utils";
import {
  getGenerationModeLabel,
  resolveGenerationMode,
} from "@/lib/documents/generation-mode";

interface DocumentMetadataProps {
  document: Document;
  companyName?: string;
  variant?: "screen" | "print";
}

export function DocumentMetadata({
  document: doc,
  companyName,
  variant = "screen",
}: DocumentMetadataProps) {
  const mode = resolveGenerationMode(doc);
  const rows = [
    { label: "Dokumenttyp", value: getDocumentTypeLabel(doc.document_type) },
    { label: "Dokumentenstatus", value: doc.status === "published" ? "Veröffentlicht" : "Entwurf" },
    { label: "Version", value: `v${doc.version ?? 1}` },
    { label: "Erstellt am", value: formatDate(doc.created_at) },
    { label: "Zuletzt aktualisiert", value: formatDate(doc.updated_at) },
    { label: "Unternehmen", value: companyName ?? "—" },
    { label: "Erzeugungsmodus", value: getGenerationModeLabel(mode) },
  ];

  if (variant === "print") {
    return (
      <table className="meta-table">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th>{row.label}</th>
              <td>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <dl className="grid gap-0 grid-cols-2">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className={`flex flex-col gap-0.5 px-4 py-3 ${i < rows.length - 1 ? "border-b border-slate-100 border-b-0" : ""} ${i % 2 === 0 ? "border-r border-slate-100" : ""}`}
          >
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {row.label}
            </dt>
            <dd className="text-sm font-medium text-slate-800">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
