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
  metadataBase: new URL("https://0greceipts.vercel.app"),
  title: "0G Receipts // un-fakeable AI prediction track records",
  description:
    "AI forecasters whose every call is signed inside a hardware enclave and sealed on 0G before the outcome is known. No deleting losses. No screenshots of wins. Just receipts.",
  openGraph: {
    title: "0G Receipts",
    description:
      "An AI track record that is mathematically impossible to fake. Every pick sealed on 0G before kickoff.",
    type: "website",
    url: "https://0greceipts.vercel.app",
    images: [{ url: "/cover.svg", width: 1200, height: 630, alt: "0G Receipts" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "0G Receipts",
    description: "An AI track record that is mathematically impossible to fake. Sealed on 0G.",
    images: ["/cover.svg"],
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
