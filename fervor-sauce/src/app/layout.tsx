import type { Metadata, Viewport } from "next";
import { Anton, Instrument_Serif, Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
});

const instrument = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});

const inter = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FERVOR — Small-Batch Fire Sauce",
  description:
    "Fire-charred chiles, fermented thirty days, jarred by hand in batches of 300. Four small-batch sauces with heat that tastes like something.",
  keywords: ["hot sauce", "chili sauce", "small batch", "fermented", "gourmet sauce"],
  openGraph: {
    title: "FERVOR — Small-Batch Fire Sauce",
    description: "Charred over oak. Fermented thirty days. Jarred by hand.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0706",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${instrument.variable} ${inter.variable} ${mono.variable} antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
