import type { Metadata } from "next";
import Link from "next/link";
import { Cormorant_Garamond, Geist, Geist_Mono } from "next/font/google";
import { Logo } from "@/components/logo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AM Management",
  description: "Gestion des engagements de concert de l'agence",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-foreground/10 bg-card/60 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-6xl px-4 py-3">
            <Link href="/tableau-de-bord" aria-label="AM Management, tableau de bord">
              <Logo />
            </Link>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
