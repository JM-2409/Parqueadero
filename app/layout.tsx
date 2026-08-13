import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { ConnectionBanner } from "@/components/ui/ConnectionBanner";
import { VersionIndicator } from "@/components/ui/VersionIndicator";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
  display: "swap",
});

const appName = process.env.NEXT_PUBLIC_APP_NAME || "NexoPark";

export const metadata: Metadata = {
  title: `${appName} · Gestión Inteligente de Parqueaderos`,
  description: "Sistema avanzado de gestión, facturación y control de parqueaderos. Rápido, seguro y accesible desde cualquier dispositivo.",
  keywords: ["parqueadero", "parking", "gestión", "facturación", "sistema"],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NexoPark",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#070b14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="scroll-smooth">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body
        suppressHydrationWarning
        className={`${poppins.variable} antialiased min-h-dvh flex flex-col`}
        style={{ fontFamily: "var(--font-poppins), sans-serif" }}
      >
        <ConnectionBanner />
        {children}
        <VersionIndicator />
      </body>
    </html>
  );
}
