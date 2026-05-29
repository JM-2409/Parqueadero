import { expect, test, describe, mock, beforeEach, afterEach } from "bun:test";

const mockFetch = mock();
globalThis.fetch = mockFetch;

import { createUser } from "../../app/actions/auth";

describe("createUser Error Paths via fetch mock", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  test("debería rechazar la creación de usuarios que no sean superadmin si no existe ninguno en el sistema", async () => {
    // 0. check superadmins
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200, headers: { 'content-type': 'application/json' } }));

    const result = await createUser("test@example.com", "password", "admin", "lot-id");

    expect(mockFetch).toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      error: "Creación no autorizada. Solo se puede inicializar un perfil de superadministrador.",
    });
  });

  test("debería retornar error amigable si el usuario ya está registrado ('already registered')", async () => {
    // 0. check superadmins
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200, headers: { 'content-type': 'application/json' } }));

    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
      error: { message: "User already registered" },
      message: "User already registered"
    }), { status: 400, headers: { 'content-type': 'application/json' } }));

    const result = await createUser("test@example.com", "password", "superadmin", null);

    expect(mockFetch).toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      error: "El nombre de usuario ya está en uso. Por favor, elige otro.",
    });
  });

  test("debería retornar error amigable si el usuario ya existe ('already exists')", async () => {
    // 0. check superadmins
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200, headers: { 'content-type': 'application/json' } }));

    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
      error: { message: "User already exists" },
      message: "User already exists"
    }), { status: 400, headers: { 'content-type': 'application/json' } }));

    const result = await createUser("test2@example.com", "password", "superadmin", null);

    expect(mockFetch).toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      error: "El nombre de usuario ya está en uso. Por favor, elige otro.",
    });
  });

  test("debería retornar el mensaje original para cualquier otro error de autenticación", async () => {
    // 0. check superadmins
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200, headers: { 'content-type': 'application/json' } }));

    const originalErrorMessage = "Password is too weak";
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
      error: { message: originalErrorMessage },
      message: originalErrorMessage
    }), { status: 400, headers: { 'content-type': 'application/json' } }));

    const result = await createUser("test3@example.com", "123", "superadmin", null);

    expect(mockFetch).toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      error: originalErrorMessage,
    });
  });

  test("debería eliminar el usuario de auth y retornar error si falla la creación del perfil", async () => {
    // 0. check superadmins
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200, headers: { 'content-type': 'application/json' } }));

    // 1. Auth createUser success
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
      id: "123e4567-e89b-12d3-a456-426614174000", email: "test4@example.com"
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    // 2. Profile creation fails
    const profileErrorMessage = "Database error";
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
      error: { message: profileErrorMessage },
      message: profileErrorMessage
    }), { status: 400, headers: { 'content-type': 'application/json' } }));

    // 3. Rollback (delete user)
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));

    const result = await createUser("test4@example.com", "pwd", "superadmin", null);

    expect(mockFetch).toHaveBeenCalled();
    expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2);

    expect(result).toEqual({
      success: false,
      error: profileErrorMessage,
    });
  });

  test("happy path: debería crear usuario y perfil exitosamente con customRoleId", async () => {
    // 0. check superadmins
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200, headers: { 'content-type': 'application/json' } }));

    // 1. Auth createUser success
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
      id: "123e4567-e89b-12d3-a456-426614174000", email: "test5@example.com"
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    // 2. Profile creation success
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify([
      { id: "profile-123" }
    ]), { status: 200, headers: { 'content-type': 'application/json' } }));

    const result = await createUser("test5@example.com", "pwd", "superadmin", null, "custom-role-id");

    expect(mockFetch).toHaveBeenCalled();

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
  });
});

describe("createUser Missing Env Vars", () => {
  let originalUrl: string | undefined;
  let originalKey: string | undefined;

  beforeEach(() => {
    // Guardar variables de entorno originales
    originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  afterEach(() => {
    // Restaurar variables de entorno originales
    if (originalUrl !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalKey !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });

  test("debería retornar error si faltan las variables de entorno de Supabase", async () => {
    // Limpiar variables de entorno
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "";

    // Importación dinámica para evitar la caché y forzar re-evaluación del módulo auth.ts
    const { createUser: createUserWithoutEnv } = await import(
      `../../app/actions/auth.ts?bust=${Date.now()}`
    );

    const result = await createUserWithoutEnv(
      "test-env@example.com",
      "password",
      "admin",
      "lot-id"
    );

    expect(result).toEqual({
      success: false,
      error:
        "Faltan las variables de entorno de Supabase (URL o Service Role Key) en el servidor.",
    });
  });
});
