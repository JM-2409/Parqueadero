import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
  order: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));

describe("GET /api/superadmin/data", () => {
  const originalEnv = process.env;
  const queryBuilder = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: mocks.maybeSingle,
    order: mocks.order,
  };
  const authClient = {
    auth: { getUser: mocks.getUser },
  };
  const adminClient = {
    from: vi.fn(() => queryBuilder),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "service-key",
    };
    queryBuilder.select.mockReturnValue(queryBuilder);
    queryBuilder.eq.mockReturnValue(queryBuilder);
    mocks.createClient.mockImplementation((_url, key) =>
      key === "anon-key" ? authClient : adminClient,
    );
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mocks.maybeSingle.mockResolvedValue({
      data: { role: "superadmin" },
      error: null,
    });
    mocks.order.mockResolvedValue({ data: [], error: null });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("rechaza solicitudes sin token", async () => {
    const response = await GET(
      new Request("http://localhost/api/superadmin/data?type=admins"),
    );

    expect(response.status).toBe(401);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("rechaza sesiones que no pertenecen a un superadministrador", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: { role: "admin" },
      error: null,
    });

    const response = await GET(
      new Request("http://localhost/api/superadmin/data?type=admins", {
        headers: { Authorization: "Bearer valid-token" },
      }),
    );

    expect(response.status).toBe(403);
    expect(mocks.order).not.toHaveBeenCalled();
  });

  it("devuelve datos para un superadministrador autenticado", async () => {
    mocks.order.mockResolvedValue({
      data: [{ id: "admin-1", email: "admin@example.com" }],
      error: null,
    });

    const response = await GET(
      new Request("http://localhost/api/superadmin/data?type=admins", {
        headers: { Authorization: "Bearer valid-token" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: [{ id: "admin-1" }],
    });
    expect(mocks.getUser).toHaveBeenCalledWith("valid-token");
  });
});
