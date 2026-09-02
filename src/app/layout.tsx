import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { Poppins, Inter } from "next/font/google";

import {
  DEFAULT_OG_DESCRIPTION,
  pageSocialMetadata,
} from "@/lib/seo/open-graph";
import { getSiteUrl } from "@/lib/seo/site-url";

import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

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
  themeColor: "#fafafa",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Required for nonce-based CSP — pages render per request, not at build time.
  await connection();

  return (
    <html
      lang="de"
      className={cn("h-full antialiased", inter.variable, poppins.variable)}
    >
      <body className="min-h-full bg-background font-sans text-foreground">
        {children}
      </body>
    </html>
  );
}
