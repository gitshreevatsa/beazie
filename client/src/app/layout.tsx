import "@/app/globals.css";
import "@/app/expressive-code.css";

import type { Metadata } from "next";
import { Syne, DM_Sans } from "next/font/google";

import Navbar from "@/components/Navbar";
import { Toaster } from "@/components/ui/toaster";
import Footer from "@/components/Footer";
import { Providers } from "./providers";

const display = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
});

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Beazie Arcade",
  description: "One drop. One secret prize. Claim it when you're ready.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${display.variable} ${body.variable} font-body antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          <Navbar />
          {children}
          <div id="drawer"></div>
          <div id="modal"></div>
          <Footer />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
