import type { Metadata } from "next";
import "./globals.css"; // Global styles

const appName = process.env.NEXT_PUBLIC_APP_NAME || "Sistema de Parqueaderos";

export const metadata: Metadata = {
  title: `${appName} - Gestión Inteligente de Parqueaderos`,
  description: "Plataforma integral SaaS para la administración corporativa y operativa de múltiples parqueaderos en tiempo real.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="scroll-smooth">
      <body suppressHydrationWarning className="antialiased text-slate-800 bg-slate-50 min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
