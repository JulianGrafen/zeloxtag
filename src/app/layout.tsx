import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";

import {
  DEFAULT_OG_DESCRIPTION,
  pageSocialMetadata,
} from "@/lib/seo/open-graph";
import { getSiteUrl } from "@/lib/seo/site-url";

import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "ZeloxTag",
    template: "%s · ZeloxTag",
  },
  description: DEFAULT_OG_DESCRIPTION,
  applicationName: "ZeloxTag",
  manifest: "/manifest.webmanifest",
  ...pageSocialMetadata({
    title: "ZeloxTag",
    description: DEFAULT_OG_DESCRIPTION,
    path: "/",
  }),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ececea",
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
