import { beforeEach, describe, expect, it, vi } from "vitest";

const backingStore = new Map<string, string>();
const localStorageStub = {
  getItem: (key: string) => (backingStore.has(key) ? backingStore.get(key) ?? null : null),
  setItem: (key: string, value: string) => {
    backingStore.set(key, String(value));
  },
  removeItem: (key: string) => {
    backingStore.delete(key);
  },
  key: (index: number) => Array.from(backingStore.keys())[index] ?? null,
  get length() {
    return backingStore.size;
  },
};

vi.mock("../src/utils/supabaseClient", () => ({
  supabase: null,
  isNetworkOrFetchError: () => false,
}));

beforeEach(() => {
  backingStore.clear();
  vi.stubGlobal("localStorage", localStorageStub);
});

const loadRolesModel = async () => {
  vi.resetModules();
  return import("../src/models/rolesModel");
};

describe("rolesModel Discord-style granular admin permissions", () => {
  it("grants full permissions to superadmin and zero permissions to reviewer", async () => {
    const { rolesModel, ALL_ADMIN_PERMISSIONS, NO_ADMIN_PERMISSIONS } = await loadRolesModel();

    expect(rolesModel.getUserPermissions({ email: "xaruzowarlord@gmail.com" })).toEqual(
      ALL_ADMIN_PERMISSIONS
    );
    expect(rolesModel.getUserPermissions({ email: "examinee@example.com" })).toEqual(
      NO_ADMIN_PERMISSIONS
    );
  });

  it("applies default Admin role permissions and supports per-admin overrides", async () => {
    const { rolesModel, DEFAULT_ADMIN_PERMISSIONS } = await loadRolesModel();

    await rolesModel.assignRole("staff.admin@example.com", "admin", {
      email: "xaruzowarlord@gmail.com",
    });

    // Inherits default Admin template
    expect(rolesModel.getUserPermissions({ email: "staff.admin@example.com" })).toEqual(
      DEFAULT_ADMIN_PERMISSIONS
    );

    // Update default Admin role permissions
    rolesModel.saveDefaultAdminPermissions({
      ...DEFAULT_ADMIN_PERMISSIONS,
      deleteQuestions: false,
      moderateUsers: true,
    });

    expect(rolesModel.getUserPermissions({ email: "staff.admin@example.com" })).toMatchObject({
      createQuestions: true,
      editQuestions: true,
      deleteQuestions: false,
      moderateUsers: true,
      manageRoles: false,
    });

    // Apply custom per-admin override
    const updateRes = await rolesModel.updateUserPermissions(
      "staff.admin@example.com",
      {
        createQuestions: true,
        editQuestions: false,
        deleteQuestions: false,
        reviewSubmissions: true,
        bulkImport: false,
        moderateUsers: false,
        manageRoles: false,
      },
      { email: "xaruzowarlord@gmail.com" }
    );

    expect(updateRes.success).toBe(true);
    expect(rolesModel.hasCustomPermissions(updateRes.record)).toBe(true);
    expect(rolesModel.getUserPermissions({ email: "staff.admin@example.com" })).toEqual({
      createQuestions: true,
      editQuestions: false,
      deleteQuestions: false,
      reviewSubmissions: true,
      bulkImport: false,
      moderateUsers: false,
      manageRoles: false,
    });

    // Apply default role permissions across all admins resets overrides
    rolesModel.saveDefaultAdminPermissions(DEFAULT_ADMIN_PERMISSIONS, true);
    expect(rolesModel.getUserPermissions({ email: "staff.admin@example.com" })).toEqual(
      DEFAULT_ADMIN_PERMISSIONS
    );
  });

  it("blocks modifying protected root superadmin permissions or revoking their role", async () => {
    const { rolesModel } = await loadRolesModel();

    const permRes = await rolesModel.updateUserPermissions("xaruzowarlord@gmail.com", {
      createQuestions: false,
    });
    expect(permRes.success).toBe(false);

    const revokeRes = await rolesModel.revokeRole("xaruzowarlord@gmail.com");
    expect(revokeRes.success).toBe(false);
  });
});
