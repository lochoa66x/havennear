import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const base = new URL(`${protocol}://${host}`);

  return {
    metadataBase: base,
    title: "HavenNear — Find a safe place tonight",
    description:
      "Free, private shelter information with recently confirmed availability. No visitor account needed.",
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
      },
    },
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title: "HavenNear — Find a safe place tonight",
      description: "Free · Private · No account needed",
      type: "website",
      url: base,
      images: [{ url: new URL("/og.png", base), width: 1536, height: 1024, alt: "HavenNear — Find a safe place tonight" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "HavenNear — Find a safe place tonight",
      description: "Free · Private · No account needed",
      images: [new URL("/og.png", base)],
    },
  };
}

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
