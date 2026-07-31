import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
