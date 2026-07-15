import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css"; // Global styles
import { ConnectionBanner } from "@/components/ui/ConnectionBanner";
import { VersionIndicator } from "@/components/ui/VersionIndicator";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

const appName = process.env.NEXT_PUBLIC_APP_NAME || "Sistema de Parqueaderos";

export const metadata: Metadata = {
  title: `${appName} - Gestión Inteligente de Parqueaderos`,
  description: "Sistema avanzado de gestión y facturación de parqueaderos",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Parqueadero",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a7ea4",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="scroll-smooth">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body
        suppressHydrationWarning
        className={`${poppins.className} antialiased text-slate-800 bg-slate-50 min-h-screen flex flex-col`}
      >
        <ConnectionBanner />
        {children}
        <VersionIndicator />
      </body>
    </html>
  );
}
