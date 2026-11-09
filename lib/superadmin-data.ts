import { supabase } from "@/lib/supabase";

export async function getAuthorizationHeader() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;
  if (!session?.access_token) throw new Error("No estás autenticado.");

  return `Bearer ${session.access_token}`;
}

export async function fetchSuperadminData<T>(type: string): Promise<T> {
  const authorization = await getAuthorizationHeader();
  const response = await fetch(
    `/api/superadmin/data?type=${encodeURIComponent(type)}`,
    {
      headers: { Authorization: authorization },
      cache: "no-store",
    },
  );
  const result = (await response.json()) as {
    success?: boolean;
    data?: T;
    error?: string;
  };

  if (!response.ok || !result.success) {
    throw new Error(result.error || "No se pudieron cargar los datos.");
  }

  if (result.data === undefined) {
    throw new Error("La respuesta del servidor no contiene datos.");
  }

  return result.data;
}
