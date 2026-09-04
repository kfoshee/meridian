import type { Metadata } from "next";
import { DM_Serif_Display, Manrope } from "next/font/google";
import "./globals.css";

const display = DM_Serif_Display({ subsets: ["latin"], variable: "--font-display", weight: "400" });
const ui = Manrope({ subsets: ["latin"], variable: "--font-ui", weight: "variable" });

export const metadata: Metadata = {
  metadataBase: new URL("https://meridian.kianfoshee.com"),
  title: "Meridian",
  description: "Meridian manages power for AI data centers.",
  openGraph: { title: "Meridian", description: "Meridian manages power for AI data centers.", url: "https://meridian.kianfoshee.com", siteName: "Meridian", images: [{ url: "/media/meridian-mark-16.png", width: 720, height: 610 }] },
  twitter: { card: "summary", title: "Meridian", description: "Meridian manages power for AI data centers.", images: ["/media/meridian-mark-16.png"] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable}`}>
      <body>{children}</body>
    </html>
  );
}
