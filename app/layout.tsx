import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Adjective Bloom — Match the Opposites",
  description: "Match 14 pairs of opposite personality adjectives and grow a little flower with every correct answer.",
  openGraph: {
    title: "Adjective Bloom",
    description: "Match the opposites. Grow your word garden.",
    images: [{ url: "/adjectivebloom/og.png", width: 1536, height: 1024 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Adjective Bloom",
    description: "Match the opposites. Grow your word garden.",
    images: ["/adjectivebloom/og.png"],
  },
  other: { "codex-preview": "development" },
  icons: {
    icon: "/adjectivebloom/favicon.svg",
    shortcut: "/adjectivebloom/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
