import type { Metadata } from "next";
import "./globals.css"; // Global styles

export const metadata: Metadata = {
  title: "ParkManager - Gestión Inteligente de Parqueaderos",
  description: "Plataforma integral SaaS para la administración corporativa y operativa de múltiples parqueaderos en tiempo real.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
