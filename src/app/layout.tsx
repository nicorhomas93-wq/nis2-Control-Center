import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MarketingProviders } from "@/components/acquisition/MarketingProviders";
import { DesktopLayoutShell } from "@/components/layout/DesktopLayoutShell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TKND NIS2 Control Center",
  description:
    "NIS2-Dokumentation in Tagen statt Monaten – Betroffenheitsprüfung, Risikoanalyse und Audit-Nachweise.",
};

/** Desktop-Viewport: kein responsives Umlegen auf Mobile */
export const viewport: Viewport = {
  width: 1280,
  initialScale: 0.3,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full overflow-x-auto">
        <DesktopLayoutShell>
          <MarketingProviders>{children}</MarketingProviders>
        </DesktopLayoutShell>
      </body>
    </html>
  );
}
