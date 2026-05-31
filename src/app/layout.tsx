import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { NotificationManager } from "@/components/NotificationManager";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SplashScreen } from "@/components/SplashScreen";

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
  manifest: "/manifest.json",
  themeColor: "#F59E0B",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PVC Devocional",
  },
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

import { Navigation } from "@/components/ui/Navigation";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-surface-0 text-text-primary transition-colors duration-300`}
        suppressHydrationWarning
      >
        <ThemeProvider defaultTheme="dark" storageKey="devocional-theme">
          <SplashScreen />
          <Navigation />
          <div className="md:pl-24 pb-20 md:pb-0 min-h-screen">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
          <ServiceWorkerRegistration />
          <NotificationManager />
        </ThemeProvider>
      </body>
    </html>
  );
}
