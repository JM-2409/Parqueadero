import { expect, test, describe, mock, beforeEach } from "bun:test";

const mockFetch = mock();
globalThis.fetch = mockFetch;

import { createUser } from "../../app/actions/auth";

describe("createUser Error Paths via fetch mock", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  test("debería retornar error amigable si el usuario ya está registrado ('already registered')", async () => {
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
      error: { message: "User already registered" },
      message: "User already registered"
    }), { status: 400, headers: { 'content-type': 'application/json' } }));

    const result = await createUser("test@example.com", "password", "admin", "lot-id");

    expect(mockFetch).toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      error: "El nombre de usuario ya está en uso. Por favor, elige otro.",
    });
  });

  test("debería retornar error amigable si el usuario ya existe ('already exists')", async () => {
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
      error: { message: "User already exists" },
      message: "User already exists"
    }), { status: 400, headers: { 'content-type': 'application/json' } }));

    const result = await createUser("test2@example.com", "password", "employee", "lot-id2");

    expect(mockFetch).toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      error: "El nombre de usuario ya está en uso. Por favor, elige otro.",
    });
  });

  test("debería retornar el mensaje original para cualquier otro error de autenticación", async () => {
    const originalErrorMessage = "Password is too weak";
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
      error: { message: originalErrorMessage },
      message: originalErrorMessage
    }), { status: 400, headers: { 'content-type': 'application/json' } }));

    const result = await createUser("test3@example.com", "123", "admin", null);

    expect(mockFetch).toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      error: originalErrorMessage,
    });
  });

  test("debería eliminar el usuario de auth y retornar error si falla la creación del perfil", async () => {
    // 1. Auth createUser success
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
      id: "123e4567-e89b-12d3-a456-426614174000", email: "test4@example.com"
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    // 2. Profile creation fails
    const profileErrorMessage = "Foreign key violation: parking_lot_id";
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
      error: { message: profileErrorMessage },
      message: profileErrorMessage
    }), { status: 400, headers: { 'content-type': 'application/json' } }));

    // 3. Rollback (delete user)
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));

    const result = await createUser("test4@example.com", "pwd", "admin", "invalid-lot");

    expect(mockFetch).toHaveBeenCalled();
    expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2);

    expect(result).toEqual({
      success: false,
      error: profileErrorMessage,
    });
  });

  test("happy path: debería crear usuario y perfil exitosamente", async () => {
    // 1. Auth createUser success
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
      id: "123e4567-e89b-12d3-a456-426614174000", email: "test5@example.com"
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    // 2. Profile creation success
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify([
      { id: "profile-123" }
    ]), { status: 200, headers: { 'content-type': 'application/json' } }));

    const result = await createUser("test5@example.com", "pwd", "admin", "lot-id");

    expect(mockFetch).toHaveBeenCalled();

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
  });
});
