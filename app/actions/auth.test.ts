import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockAuthAdmin = {
  createUser: vi.fn(),
  deleteUser: vi.fn(),
  updateUserById: vi.fn(),
};

const mockAuth = {
  getUser: vi.fn(),
  admin: mockAuthAdmin,
};

// Create a builder pattern mock for Supabase query chains
const createMockDbChain = () => {
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockResolvedValue({ error: null });
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
  // Add a special then function so the chain acts as a promise for non-terminating queries if needed
  chain.then = (resolve: any) => resolve({ data: null, error: null });
  return chain;
};

let mockDbChain = createMockDbChain();

const mockSupabaseAdmin = {
  auth: mockAuth,
  from: vi.fn().mockImplementation(() => mockDbChain),
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockSupabaseAdmin),
}));

describe("Auth Actions", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    vi.clearAllMocks();
    mockDbChain = createMockDbChain(); // Reset the chain

    // Default environment variables for success cases
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://valid-project.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "valid-service-key";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("createUser", () => {
    beforeEach(() => {
      // Mock the superadmin check to return at least one superadmin so standard auth flow applies
      mockDbChain.limit = vi.fn().mockResolvedValueOnce({
        data: [{ id: "superadmin-exists" }],
        error: null,
      });
    });

    it("should return an error if token validation fails", async () => {
      mockAuth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error("Invalid token"),
      });

      const { createUser } = await import("./auth");
      const result = await createUser("test@test.com", "pass123", "employee", "lot1", undefined, "bad-token");

      expect(result).toEqual({ success: false, error: "Token inválido o expirado." });
    });

    it("should return an error if profile is not found", async () => {
      mockAuth.getUser.mockResolvedValueOnce({
        data: { user: { id: "admin1" } },
        error: null,
      });

      mockDbChain.single.mockResolvedValueOnce({
        data: null,
        error: new Error("Profile not found"),
      });

      const { createUser } = await import("./auth");
      const result = await createUser("test@test.com", "pass123", "employee", "lot1", undefined, "valid-token");

      expect(result).toEqual({ success: false, error: "Usuario no autorizado." });
    });

    it("should return an error if role is not admin or superadmin", async () => {
      mockAuth.getUser.mockResolvedValueOnce({
        data: { user: { id: "emp1" } },
        error: null,
      });

      mockDbChain.single.mockResolvedValueOnce({
        data: { role: "employee", parking_lot_id: "lot1" },
        error: null,
      });

      const { createUser } = await import("./auth");
      const result = await createUser("test@test.com", "pass123", "employee", "lot1", undefined, "valid-token");

      expect(result).toEqual({ success: false, error: "No tienes permisos para crear usuarios." });
    });

    it("should restrict admin from creating users in another parking lot", async () => {
      mockAuth.getUser.mockResolvedValueOnce({
        data: { user: { id: "admin1" } },
        error: null,
      });

      mockDbChain.single.mockResolvedValueOnce({
        data: { role: "admin", parking_lot_id: "lot1" },
        error: null,
      });

      const { createUser } = await import("./auth");
      const result = await createUser("test@test.com", "pass123", "employee", "lot2", undefined, "valid-token");

      expect(result).toEqual({ success: false, error: "No tienes permisos para crear usuarios en este parqueadero." });
    });

    it("should restrict admin from creating admin users", async () => {
      mockAuth.getUser.mockResolvedValueOnce({
        data: { user: { id: "admin1" } },
        error: null,
      });

      mockDbChain.single.mockResolvedValueOnce({
        data: { role: "admin", parking_lot_id: "lot1" },
        error: null,
      });

      const { createUser } = await import("./auth");
      const result = await createUser("test@test.com", "pass123", "admin", "lot1", undefined, "valid-token");

      expect(result).toEqual({ success: false, error: "Los administradores no pueden crear usuarios con roles administrativos." });
    });

    it("should handle duplicate email errors from auth.users", async () => {
      mockAuth.getUser.mockResolvedValueOnce({
        data: { user: { id: "super1" } },
        error: null,
      });

      mockDbChain.single.mockResolvedValueOnce({
        data: { role: "superadmin", parking_lot_id: null },
        error: null,
      });

      mockAuthAdmin.createUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: "User already registered" },
      });

      const { createUser } = await import("./auth");
      const result = await createUser("test@test.com", "pass123", "admin", "lot1", undefined, "valid-token");

      expect(result).toEqual({ success: false, error: "El nombre de usuario ya está en uso. Por favor, elige otro." });
    });

    it("should rollback user creation if profile creation fails", async () => {
      mockAuth.getUser.mockResolvedValueOnce({
        data: { user: { id: "super1" } },
        error: null,
      });

      // Caller's profile
      mockDbChain.single.mockResolvedValueOnce({
        data: { role: "superadmin", parking_lot_id: null },
        error: null,
      });

      // auth.users creation success
      mockAuthAdmin.createUser.mockResolvedValueOnce({
        data: { user: { id: "new_user_1" } },
        error: null,
      });

      // profiles insertion error
      mockDbChain.insert.mockResolvedValueOnce({
        error: { message: "Profile insert error" },
      });

      mockAuthAdmin.deleteUser.mockResolvedValueOnce({ error: null });

      const { createUser } = await import("./auth");
      const result = await createUser("test@test.com", "pass123", "admin", "lot1", undefined, "valid-token");

      expect(mockAuthAdmin.deleteUser).toHaveBeenCalledWith("new_user_1");
      expect(result).toEqual({ success: false, error: "Profile insert error" });
    });

    it("should successfully create user and profile", async () => {
      mockAuth.getUser.mockResolvedValueOnce({
        data: { user: { id: "super1" } },
        error: null,
      });

      // Caller's profile
      mockDbChain.single.mockResolvedValueOnce({
        data: { role: "superadmin", parking_lot_id: null },
        error: null,
      });

      // auth.users creation success
      mockAuthAdmin.createUser.mockResolvedValueOnce({
        data: { user: { id: "new_user_2" } },
        error: null,
      });

      // profiles insertion success
      mockDbChain.insert.mockResolvedValueOnce({ error: null });

      const { createUser } = await import("./auth");
      const result = await createUser("test@test.com", "pass123", "employee", "lot1", "custom123", "valid-token");

      expect(mockAuthAdmin.createUser).toHaveBeenCalledWith({ email: "test@test.com", password: "pass123", email_confirm: true });
      expect(mockDbChain.insert).toHaveBeenCalledWith({
        id: "new_user_2",
        email: "test@test.com",
        role: "employee",
        parking_lot_id: "lot1",
        custom_role_id: "custom123"
      });
      expect(result).toEqual({ success: true, user: { id: "new_user_2" } });
    });
  });

  describe("deleteEmployee", () => {
    it("should return an error if token validation fails", async () => {
      mockAuth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error("Invalid token"),
      });

      const { deleteEmployee } = await import("./auth");
      const result = await deleteEmployee("user-to-delete", "bad-token");

      expect(result).toEqual({ success: false, error: "Token inválido o expirado." });
    });

    it("should return an error if authorization fails (non-admin)", async () => {
      mockAuth.getUser.mockResolvedValueOnce({
        data: { user: { id: "emp1" } },
        error: null,
      });

      mockDbChain.single.mockResolvedValueOnce({
        data: { role: "employee", parking_lot_id: "lot1" },
        error: null,
      });

      const { deleteEmployee } = await import("./auth");
      const result = await deleteEmployee("user-to-delete", "valid-token");

      expect(result).toEqual({ success: false, error: "No tienes permisos para eliminar usuarios." });
    });

    it("should restrict admin from deleting an employee in a different parking lot", async () => {
      // Caller (Admin in lot1)
      mockAuth.getUser.mockResolvedValueOnce({
        data: { user: { id: "admin1" } },
        error: null,
      });
      mockDbChain.single.mockResolvedValueOnce({
        data: { role: "admin", parking_lot_id: "lot1" },
        error: null,
      });

      // Target (Employee in lot2)
      mockDbChain.single.mockResolvedValueOnce({
        data: { role: "employee", parking_lot_id: "lot2" },
        error: null,
      });

      const { deleteEmployee } = await import("./auth");
      const result = await deleteEmployee("target-emp", "valid-token");

      expect(result).toEqual({ success: false, error: "No tienes permisos sobre este usuario." });
    });

    it("should restrict admin from deleting another admin", async () => {
      // Caller (Admin in lot1)
      mockAuth.getUser.mockResolvedValueOnce({
        data: { user: { id: "admin1" } },
        error: null,
      });
      mockDbChain.single.mockResolvedValueOnce({
        data: { role: "admin", parking_lot_id: "lot1" },
        error: null,
      });

      // Target (Admin in lot1)
      mockDbChain.single.mockResolvedValueOnce({
        data: { role: "admin", parking_lot_id: "lot1" },
        error: null,
      });

      const { deleteEmployee } = await import("./auth");
      const result = await deleteEmployee("target-admin", "valid-token");

      expect(result).toEqual({ success: false, error: "Los administradores solo pueden eliminar empleados." });
    });

    it("should restrict superadmin from deleting non-admins", async () => {
      // Caller (Superadmin)
      mockAuth.getUser.mockResolvedValueOnce({
        data: { user: { id: "super1" } },
        error: null,
      });
      mockDbChain.single.mockResolvedValueOnce({
        data: { role: "superadmin", parking_lot_id: null },
        error: null,
      });

      // Target (Employee)
      mockDbChain.single.mockResolvedValueOnce({
        data: { role: "employee", parking_lot_id: "lot1" },
        error: null,
      });

      const { deleteEmployee } = await import("./auth");
      const result = await deleteEmployee("target-emp", "valid-token");

      expect(result).toEqual({ success: false, error: "Los superadministradores solo pueden eliminar administradores." });
    });

    it("should successfully delete a user and manually clean up related records", async () => {
      // Caller (Superadmin)
      mockAuth.getUser.mockResolvedValueOnce({
        data: { user: { id: "super1" } },
        error: null,
      });
      mockDbChain.single.mockResolvedValueOnce({
        data: { role: "superadmin", parking_lot_id: null },
        error: null,
      });

      // Target (Admin)
      mockDbChain.single.mockResolvedValueOnce({
        data: { role: "admin", parking_lot_id: "lot1" },
        error: null,
      });

      // Manual cleanup mocks (already handled by chain.then logic returning {error:null})

      // auth.users deletion mock
      mockAuthAdmin.deleteUser.mockResolvedValueOnce({ error: null });

      const { deleteEmployee } = await import("./auth");
      const result = await deleteEmployee("target-admin", "valid-token");

      expect(mockAuthAdmin.deleteUser).toHaveBeenCalledWith("target-admin");
      expect(mockDbChain.delete).toHaveBeenCalled(); // Profiles and related deletes
      expect(result).toEqual({ success: true });
    });
  });

  describe("updateEmployeePassword", () => {
    it("should return an error if token validation fails", async () => {
      mockAuth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error("Invalid token"),
      });

      const { updateEmployeePassword } = await import("./auth");
      const result = await updateEmployeePassword("user-id", "newPass123", "bad-token");

      expect(result).toEqual({ success: false, error: "Token inválido o expirado." });
    });

    it("should return an error if authorization fails (non-admin)", async () => {
      mockAuth.getUser.mockResolvedValueOnce({
        data: { user: { id: "emp1" } },
        error: null,
      });

      mockDbChain.single.mockResolvedValueOnce({
        data: { role: "employee", parking_lot_id: "lot1" },
        error: null,
      });

      const { updateEmployeePassword } = await import("./auth");
      const result = await updateEmployeePassword("user-id", "newPass123", "valid-token");

      expect(result).toEqual({ success: false, error: "No tienes permisos para editar usuarios." });
    });

    it("should restrict admin from updating an employee in a different parking lot", async () => {
      // Caller (Admin in lot1)
      mockAuth.getUser.mockResolvedValueOnce({
        data: { user: { id: "admin1" } },
        error: null,
      });
      mockDbChain.single.mockResolvedValueOnce({
        data: { role: "admin", parking_lot_id: "lot1" },
        error: null,
      });

      // Target (Employee in lot2)
      mockDbChain.single.mockResolvedValueOnce({
        data: { role: "employee", parking_lot_id: "lot2" },
        error: null,
      });

      const { updateEmployeePassword } = await import("./auth");
      const result = await updateEmployeePassword("target-emp", "newPass123", "valid-token");

      expect(result).toEqual({ success: false, error: "No tienes permisos sobre este usuario." });
    });

    it("should restrict admin from updating another admin", async () => {
      // Caller (Admin in lot1)
      mockAuth.getUser.mockResolvedValueOnce({
        data: { user: { id: "admin1" } },
        error: null,
      });
      mockDbChain.single.mockResolvedValueOnce({
        data: { role: "admin", parking_lot_id: "lot1" },
        error: null,
      });

      // Target (Admin in lot1)
      mockDbChain.single.mockResolvedValueOnce({
        data: { role: "admin", parking_lot_id: "lot1" },
        error: null,
      });

      const { updateEmployeePassword } = await import("./auth");
      const result = await updateEmployeePassword("target-admin", "newPass123", "valid-token");

      expect(result).toEqual({ success: false, error: "No puedes editar a un usuario con rol igual o superior." });
    });

    it("should restrict superadmin from updating another superadmin", async () => {
      // Caller (Superadmin)
      mockAuth.getUser.mockResolvedValueOnce({
        data: { user: { id: "super1" } },
        error: null,
      });
      mockDbChain.single.mockResolvedValueOnce({
        data: { role: "superadmin", parking_lot_id: null },
        error: null,
      });

      // Target (Superadmin)
      mockDbChain.single.mockResolvedValueOnce({
        data: { role: "superadmin", parking_lot_id: null },
        error: null,
      });

      const { updateEmployeePassword } = await import("./auth");
      const result = await updateEmployeePassword("target-super", "newPass123", "valid-token");

      expect(result).toEqual({ success: false, error: "No puedes editar a un superadministrador." });
    });

    it("should successfully update user password", async () => {
      // Caller (Superadmin)
      mockAuth.getUser.mockResolvedValueOnce({
        data: { user: { id: "super1" } },
        error: null,
      });
      mockDbChain.single.mockResolvedValueOnce({
        data: { role: "superadmin", parking_lot_id: null },
        error: null,
      });

      // Target (Admin)
      mockDbChain.single.mockResolvedValueOnce({
        data: { role: "admin", parking_lot_id: "lot1" },
        error: null,
      });

      mockAuthAdmin.updateUserById.mockResolvedValueOnce({ error: null });

      const { updateEmployeePassword } = await import("./auth");
      const result = await updateEmployeePassword("target-admin", "newPass123", "valid-token");

      expect(mockAuthAdmin.updateUserById).toHaveBeenCalledWith("target-admin", { password: "newPass123" });
      expect(result).toEqual({ success: true });
    });
  });
});
