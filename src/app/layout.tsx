import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";

import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ZeloxTag",
  description:
    "Digitale Fahrzeugakte per QR-Code — Rechnungen, ABE und Service sicher verwalten.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f0f0f0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full bg-[color:var(--vd-bg)] font-sans text-[color:var(--vd-text)]">
        {children}
      </body>
    </html>
  );
}
