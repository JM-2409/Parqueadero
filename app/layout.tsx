import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { ConnectionBanner } from "@/components/ui/ConnectionBanner";
import { VersionIndicator } from "@/components/ui/VersionIndicator";
import { GoogleAnalytics } from "@next/third-parties/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
  display: "swap",
});

const appName = process.env.NEXT_PUBLIC_APP_NAME || "NexoPark";
const googleAnalyticsId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

export const metadata: Metadata = {
  title: `${appName} · Gestión Inteligente de Parqueaderos`,
  description: "Gestión administrativa y operación de parqueaderos con PWA, control de caja menor y acceso desde cualquier dispositivo.",
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
        <meta charSet="utf-8" />
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
        {googleAnalyticsId && <GoogleAnalytics gaId={googleAnalyticsId} />}
      </body>
    </html>
  );
}
