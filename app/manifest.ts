import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let appName = "Parqueadero";
  let appIcon = "/icons/icon-192x192.png";
  let shortName = "Parqueadero";

  try {
    const { data: globalSettings, error } = await supabase
      .from('global_settings')
      .select('app_name, logo_url')
      .eq('id', 1)
      .single();

    if (!error && globalSettings) {
      if (globalSettings.app_name) {
        appName = globalSettings.app_name;
        shortName = globalSettings.app_name.substring(0, 12);
      }
      if (globalSettings.logo_url) {
        appIcon = globalSettings.logo_url;
      }
    }
  } catch (err) {
    console.error("Error al cargar manifest dinámico", err);
  }

  return {
    name: `${appName} - Sistema de Gestión`,
    short_name: shortName,
    description: "Sistema de gestión y facturación de parqueaderos",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: "#0a7ea4",
    background_color: "#ffffff",
    icons: [
      {
        src: appIcon,
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: appIcon,
        sizes: "512x512",
        type: "image/png"
      }
    ],
  };
}
