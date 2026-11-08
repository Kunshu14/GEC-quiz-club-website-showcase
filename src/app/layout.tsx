import type { Metadata } from "next";
import { Archivo_Black, Space_Grotesk } from "next/font/google";
import { SessionSync } from "@/components/auth/SessionSync";
import "./globals.css";

// Display/heading font — Section 3.2. Reserved for h1–h3 only, never body copy.
const archivoBlack = Archivo_Black({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

// Body/UI font — Section 3.2. Paragraphs, nav, buttons, labels, tables.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quiz Club Council Suite — Tournament & Operations Platform",
  description: "Full-stack tournament management, quiz building, roster desk, and scoring system.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${archivoBlack.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SessionSync />
        {children}
      </body>
    </html>
  );
}
