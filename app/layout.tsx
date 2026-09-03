import type { Metadata } from "next";
import { DM_Serif_Display, Manrope } from "next/font/google";
import "./globals.css";

const display = DM_Serif_Display({ subsets: ["latin"], variable: "--font-display", weight: "400" });
const ui = Manrope({ subsets: ["latin"], variable: "--font-ui", weight: "variable" });

export const metadata: Metadata = {
  title: "Meridian",
  description: "Meridian manages power for AI data centers.",
  metadataBase: new URL("https://meridian.kianfoshee.com"),
  openGraph: {
    title: "Meridian",
    description: "Power for AI data centers.",
    url: "https://meridian.kianfoshee.com",
    siteName: "Meridian",
    images: [
      { url: "/og.png", width: 1729, height: 910, alt: "Meridian — Power for AI data centers." },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Meridian",
    description: "Power for AI data centers.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable}`}>
      <body>{children}</body>
    </html>
  );
}
