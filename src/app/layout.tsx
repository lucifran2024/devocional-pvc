import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Devocional PVC | Sua Jornada Espiritual Diária",
  description: "Devocionais diários personalizados com profundidade teológica e inteligência artificial. Transforme sua leitura bíblica em uma experiência espiritual única.",
  keywords: ["devocional", "bíblia", "leitura diária", "espiritualidade", "PVC"],
  authors: [{ name: "Devocional PVC" }],
  openGraph: {
    title: "Devocional PVC | Sua Jornada Espiritual Diária",
    description: "Devocionais diários personalizados com profundidade teológica e inteligência artificial.",
    type: "website",
    locale: "pt_BR",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
