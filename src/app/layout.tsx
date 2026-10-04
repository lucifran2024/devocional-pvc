import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { NotificationManager } from "@/components/NotificationManager";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Navigation } from "@/components/ui/Navigation";
import { AuthProvider } from "@/components/AuthProvider";

// Fontes guardadas no próprio app (03/10/2026): o next/font/google baixava
// do Google na hora do build e o Turbopack às vezes quebrava com o endereço
// /l/font?kit=…&skey=… ("queries have exactly one entry"). Mesmos arquivos
// latinos (variáveis) que o Google servia; licença SIL OFL (fonts/LICENCA.md).
const geistSans = localFont({
  src: "./fonts/geist-latin.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});

// Serifada de leitura (Bíblia / passagem do dia) — elegante e legível
const newsreader = localFont({
  src: [
    { path: "./fonts/newsreader-latin.woff2", weight: "400 600", style: "normal" },
    { path: "./fonts/newsreader-latin-italic.woff2", weight: "400 600", style: "italic" },
  ],
  variable: "--font-reading",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

export const metadata: Metadata = {
  title: "Bíblia | Sua Jornada Espiritual Diária",
  description: "Devocionais diários com profundidade teológica. Transforme sua leitura bíblica em uma experiência espiritual única.",
  keywords: ["devocional", "bíblia", "leitura diária", "espiritualidade"],
  authors: [{ name: "Bíblia" }],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Bíblia",
  },
  openGraph: {
    title: "Bíblia | Sua Jornada Espiritual Diária",
    description: "Devocionais diários com profundidade teológica.",
    type: "website",
    locale: "pt_BR",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// Tela do celular em escala 1, com a pinça liberada (sem maximumScale nem
// userScalable): o zoom acidental é evitado no CSS (globals.css), não aqui.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F59E0B",
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${newsreader.variable} antialiased min-h-screen bg-surface-0 text-text-primary transition-colors duration-300`}
        suppressHydrationWarning
      >
        <ThemeProvider defaultTheme="dark" storageKey="devocional-theme">
          {/* A abertura da marca agora é a tela do AuthProvider: aparece só
              enquanto a sessão é conferida, sem somar 700 ms a cada abertura. */}
          <AuthProvider>
            <Navigation />
            <div className="md:pl-24 pb-20 md:pb-0 min-h-screen">
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </div>
            <ServiceWorkerRegistration />
            <NotificationManager />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
