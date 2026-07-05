import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { NotificationManager } from "@/components/NotificationManager";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SplashScreen } from "@/components/SplashScreen";
import { Navigation } from "@/components/ui/Navigation";
import { AuthProvider } from "@/components/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Serifada de leitura (Bíblia / passagem do dia) — elegante e legível
const newsreader = Newsreader({
  variable: "--font-reading",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
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

export const viewport: Viewport = {
  themeColor: "#F59E0B",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} antialiased min-h-screen bg-surface-0 text-text-primary transition-colors duration-300`}
        suppressHydrationWarning
      >
        <ThemeProvider defaultTheme="dark" storageKey="devocional-theme">
          <AuthProvider>
            <SplashScreen />
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
