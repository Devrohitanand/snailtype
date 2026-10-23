import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SnailType",
  description:
    "A quiet, deliberate typing test. Cadence over sprint. A little slower. A little better.",
  applicationName: "snailtype",
  authors: [{ name: "hxr.shhhhhhh" }],
  keywords: ["typing test", "snailtype", "wpm", "cadence", "deliberate typing"],
  robots: "index,follow",
  openGraph: {
    title: "SnailType",
    description: "A quiet, deliberate typing test.",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#050405",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
