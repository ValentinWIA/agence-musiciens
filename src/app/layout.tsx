import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Titres et logo : Playfair Display, choisie par l'humain le 18/10 (docs/design.md) à la place de Cormorant.
const titres = Playfair_Display({
  variable: "--font-titres",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CM Management",
  description: "Gestion des engagements de concert de l'agence",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} ${titres.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* L'en-tête est dans (public)/layout.tsx, le menu dans (connecte)/layout.tsx. */}
        {children}
      </body>
    </html>
  );
}
