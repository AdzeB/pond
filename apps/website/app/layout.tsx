import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const SITE_URL = "https://pond.app";
const TITLE = "Pond";
const DESCRIPTION =
  "A local-first archive for everything you save across X, Instagram, Pinterest, Are.na, Cosmos, TikTok, YouTube, and any web article.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · Pond",
  },
  description: DESCRIPTION,
  applicationName: TITLE,
  authors: [
    { name: "Raphael Salaja", url: "https://github.com/raphaelsalaja" },
  ],
  generator: "Next.js",
  keywords: [
    "Pond",
    "local-first",
    "archive",
    "bookmarks",
    "Twitter",
    "X",
    "Instagram",
    "Pinterest",
    "Are.na",
    "Cosmos",
    "TikTok",
    "YouTube",
    "Mac",
  ],
  openGraph: {
    type: "website",
    siteName: TITLE,
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Pond. A local-first archive for the open web.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/opengraph-image"],
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
