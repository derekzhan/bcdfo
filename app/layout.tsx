import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BC Salmon Map | DFO Region 2 Fishing Guide",
  description:
    "A bilingual, mobile-friendly map of the salmon opportunities, limits and boundaries listed by Fisheries and Oceans Canada for Region 2.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
