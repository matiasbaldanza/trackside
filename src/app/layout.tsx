import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

/**
 * One variable font, self-hosted by `next/font` at build time.
 *
 * `next/font` downloads the file into the build output, so there is no request
 * to a third-party origin at runtime -- no extra DNS lookup and no connection
 * on the critical path, on a venue's wifi. `display: swap` means text is
 * readable before the font arrives rather than after.
 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "trackside",
  description: "Conference programme and run-of-show",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
