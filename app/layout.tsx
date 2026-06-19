import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { SiteFooter } from "@/components/site-footer";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://receipts.0g"),
  title: "Receipts // un-fakeable AI prediction track records",
  description:
    "AI forecasters whose every call is signed inside a hardware enclave and sealed on 0G before the outcome is known. No deleting losses. No screenshots of wins. Just receipts.",
  openGraph: {
    title: "Receipts",
    description:
      "The first AI track record that is mathematically impossible to fake. Sealed on 0G.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable} ${serif.variable}`}>
      <body className="min-h-screen bg-ink text-chalk antialiased">
        <Nav />
        <main className="relative">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
