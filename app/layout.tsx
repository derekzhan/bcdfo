import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "BC Salmon Map | DFO Region 2 Fishing Guide";
const description =
  "A bilingual, mobile-friendly map of the salmon opportunities, limits and boundaries listed by Fisheries and Oceans Canada for Region 2.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "bc-salmon-map-region2.derekzhan.chatgpt.site";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    title,
    description,
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: `${origin}/og-v3.png`, width: 1732, height: 908, alt: "BC Salmon Map — Region 2 boundary starts" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${origin}/og-v3.png`],
    },
  };
}

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
