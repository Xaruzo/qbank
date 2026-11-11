import { SUPERADMIN_EMAILS, SUPERADMIN_UIDS, QUESTION_ADMIN_EMAILS } from "../constants/appConstants";
import { supabase, isNetworkOrFetchError } from "../utils/supabaseClient";
import type { UserRole, UserRoleRecord } from "../types";

export const USER_ROLES_STORAGE_KEY = "cse-qbank-user-roles-v1";
const USER_ROLES_TABLE = "user_roles";
const PROFILES_TABLE = "profiles";
const LOCAL_CREDENTIALS_STORAGE_KEY = "cse-qbank-local-credentials-v1";

const roleWeight = (role: UserRole) =>
  role === "superadmin" ? 3 : role === "admin" ? 2 : role === "moderator" ? 1 : 0;

const sortUserRecords = (records: UserRoleRecord[]) =>
  records.sort((a, b) => {
    const diff = roleWeight(b.role) - roleWeight(a.role);
    if (diff !== 0) return diff;
    return a.email.localeCompare(b.email);
  });

const DEFAULT_SUPERADMINS: Record<string, UserRoleRecord> = {
  "xaruzowarlord@gmail.com": {
    id: "superadmin-root-01",
    email: "xaruzowarlord@gmail.com",
    fullName: "xaruzowarlord",
    role: "superadmin",
    assignedAt: new Date("2026-01-01").toISOString(),
    assignedBy: "System Root",
    notes: "Primary System Superadministrator",
  },
};

const safeParse = (raw: string | null, fallback: any) => {
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
};

export const rolesModel = {
  getStoredRoles(): Record<string, UserRoleRecord> {
    try {
      const raw = localStorage.getItem(USER_ROLES_STORAGE_KEY);
      const parsed = safeParse(raw, {});
      return {
        ...DEFAULT_SUPERADMINS,
        ...parsed,
      };
    } catch {
      return { ...DEFAULT_SUPERADMINS };
    }
  },

  saveStoredRoles(roles: Record<string, UserRoleRecord>) {
    try {
      localStorage.setItem(USER_ROLES_STORAGE_KEY, JSON.stringify(roles));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("qbank-roles-updated", { detail: roles }));
      }
    } catch (e) {
      console.warn("Could not save roles locally:", e);
    }
  },

  getUserRole(identifier: { id?: string | null; email?: string | null } | null): UserRole {
    if (!identifier) return "reviewer";

    const cleanEmail = (identifier.email || "").trim().toLowerCase();
    const userId = identifier.id || "";

    // Hardcoded primary root superadmin
    if (cleanEmail && SUPERADMIN_EMAILS.some((e) => e.toLowerCase() === cleanEmail)) {
      return "superadmin";
    }
    if (userId && SUPERADMIN_UIDS.includes(userId)) {
      return "superadmin";
    }

    const roles = this.getStoredRoles();
    if (cleanEmail && roles[cleanEmail]?.role) {
      return roles[cleanEmail].role;
    }
    if (userId && roles[userId]?.role) {
      return roles[userId].role;
    }

    // Legacy Question Admins default to admin
    if (cleanEmail && QUESTION_ADMIN_EMAILS.some((e) => e.toLowerCase() === cleanEmail)) {
      return "admin";
    }

    return "reviewer";
  },

  async assignRole(
    targetEmail: string,
    role: UserRole,
    assignerInfo?: { email?: string; fullName?: string },
    targetName?: string
  ): Promise<{ success: boolean; record?: UserRoleRecord; error?: string }> {
    const cleanEmail = (targetEmail || "").trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { success: false, error: "Please provide a valid user email address." };
    }

    // Safety guardrail: cannot demote primary root superadmin
    if (cleanEmail === "xaruzowarlord@gmail.com" && role !== "superadmin") {
      return { success: false, error: "The primary root Superadmin role cannot be revoked or altered." };
    }

    const roles = this.getStoredRoles();
    const existing = roles[cleanEmail];

    const record: UserRoleRecord = {
      id: existing?.id || `role-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      email: cleanEmail,
      fullName: targetName || existing?.fullName || cleanEmail.split("@")[0],
      role,
      assignedAt: new Date().toISOString(),
      assignedBy: assignerInfo?.email || assignerInfo?.fullName || "Superadmin",
      notes: role === "superadmin" ? "Superadministrator permissions" : role === "admin" ? "Question Bank Administrator" : "Civil Service Reviewer",
    };

    roles[cleanEmail] = record;
    this.saveStoredRoles(roles);

    // If Supabase table exists, try to sync in background
    if (supabase) {
      try {
        await supabase.from(USER_ROLES_TABLE).upsert(
          {
            email: cleanEmail,
            role,
            assigned_at: record.assignedAt,
            assigned_by: record.assignedBy,
            full_name: record.fullName,
          },
          { onConflict: "email" }
        );
      } catch (e) {
        if (!isNetworkOrFetchError(e)) {
          // Graceful fallback to local storage
        }
      }
    }

    return { success: true, record };
  },

  async revokeRole(
    targetEmail: string
  ): Promise<{ success: boolean; error?: string }> {
    const cleanEmail = (targetEmail || "").trim().toLowerCase();
    if (!cleanEmail) return { success: false, error: "Invalid email." };

    if (cleanEmail === "xaruzowarlord@gmail.com") {
      return { success: false, error: "Cannot revoke permissions from the primary root Superadmin." };
    }

    const roles = this.getStoredRoles();
    if (roles[cleanEmail]) {
      // Revert to standard reviewer
      roles[cleanEmail].role = "reviewer";
      roles[cleanEmail].assignedAt = new Date().toISOString();
      roles[cleanEmail].notes = "Role revoked; standard reviewer permissions.";
      this.saveStoredRoles(roles);
    }

    if (supabase) {
      try {
        await supabase.from(USER_ROLES_TABLE).delete().eq("email", cleanEmail);
      } catch {}
    }

    return { success: true };
  },

  /**
   * Aggregates all registered users, profiles, and assigned roles
   * so the Superadmin can view and pick users easily.
   */
  getAllUsers(): UserRoleRecord[] {
    const roles = this.getStoredRoles();
    const usersMap = new Map<string, UserRoleRecord>();

    // 1. Seed from stored roles
    (Object.values(roles) as UserRoleRecord[]).forEach((r) => {
      if (r?.email) {
        usersMap.set(r.email.toLowerCase(), { ...r });
      }
    });

    // 2. Scan locally registered credentials in localStorage
    try {
      const rawCreds = localStorage.getItem(LOCAL_CREDENTIALS_STORAGE_KEY);
      const parsedCreds = rawCreds ? JSON.parse(rawCreds) : {};
      if (parsedCreds && typeof parsedCreds === "object") {
        Object.keys(parsedCreds).forEach((email) => {
          const cleanEmail = email.trim().toLowerCase();
          if (cleanEmail && !usersMap.has(cleanEmail)) {
            const role = this.getUserRole({ email: cleanEmail });
            usersMap.set(cleanEmail, {
              id: `user-${cleanEmail}`,
              email: cleanEmail,
              fullName: cleanEmail.split("@")[0],
              role,
              assignedAt: parsedCreds[email]?.createdAt || new Date().toISOString(),
              assignedBy: "Registration",
            });
          }
        });
      }
    } catch {}

    // 3. Scan user profiles stored in localStorage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("cse-qbank-profile-user-")) {
          const raw = localStorage.getItem(key);
          const profile = raw ? JSON.parse(raw) : null;
          const email = (profile?.email || "").trim().toLowerCase();
          if (email) {
            const existing = usersMap.get(email);
            if (existing) {
              if (profile.fullName && !existing.fullName) existing.fullName = profile.fullName;
            } else {
              usersMap.set(email, {
                id: key.replace("cse-qbank-profile-user-", ""),
                email,
                fullName: profile.fullName || email.split("@")[0],
                role: this.getUserRole({ email }),
                assignedAt: new Date().toISOString(),
                assignedBy: "Profile",
              });
            }
          }
        }
      }
    } catch {}

    // 4. Ensure root superadmin is always included
    if (!usersMap.has("xaruzowarlord@gmail.com")) {
      usersMap.set("xaruzowarlord@gmail.com", DEFAULT_SUPERADMINS["xaruzowarlord@gmail.com"]);
    }

    return sortUserRecords(Array.from(usersMap.values()));
  },

  /**
   * Loads the full account roster from Supabase (profiles + user_roles)
   * and merges it with anything cached locally. Falls back gracefully to
   * local data when Supabase is unavailable or the request is blocked.
   */
  async loadAllUsers(): Promise<UserRoleRecord[]> {
    const usersMap = new Map<string, UserRoleRecord>();
    this.getAllUsers().forEach((record) => {
      if (record?.email) usersMap.set(record.email.toLowerCase(), { ...record });
    });

    if (!supabase) return sortUserRecords(Array.from(usersMap.values()));

    try {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from(PROFILES_TABLE).select("id,email,full_name,avatar_url"),
        supabase
          .from(USER_ROLES_TABLE)
          .select("email,role,full_name,assigned_at,assigned_by"),
      ]);

      const stored = this.getStoredRoles();
      let rolesChanged = false;

      const remoteRoles = Array.isArray(rolesRes.data) ? rolesRes.data : [];
      remoteRoles.forEach((row: any) => {
        const email = (row?.email || "").trim().toLowerCase();
        if (!email) return;

        const record: UserRoleRecord = {
          id: stored[email]?.id || `role-${email}`,
          email,
          fullName: row.full_name || stored[email]?.fullName || email.split("@")[0],
          role: (row.role as UserRole) || "reviewer",
          assignedAt: row.assigned_at || stored[email]?.assignedAt || new Date().toISOString(),
          assignedBy: row.assigned_by || stored[email]?.assignedBy || "Supabase",
          notes: stored[email]?.notes,
        };

        if (
          !stored[email] ||
          stored[email].role !== record.role ||
          stored[email].fullName !== record.fullName
        ) {
          stored[email] = record;
          rolesChanged = true;
        }

        usersMap.set(email, { ...(usersMap.get(email) || record), ...record });
      });

      if (rolesChanged) this.saveStoredRoles(stored);

      const profiles = Array.isArray(profilesRes.data) ? profilesRes.data : [];
      profiles.forEach((row: any) => {
        const email = (row?.email || "").trim().toLowerCase();
        if (!email) return;

        const existing = usersMap.get(email);
        if (existing) {
          if (row.full_name) existing.fullName = existing.fullName || row.full_name;
          if (row.id) existing.id = row.id;
          if (row.avatar_url) existing.avatarUrl = row.avatar_url;
          return;
        }

        usersMap.set(email, {
          id: row.id || `user-${email}`,
          email,
          fullName: row.full_name || email.split("@")[0],
          role: stored[email]?.role || this.getUserRole({ email }),
          assignedAt: stored[email]?.assignedAt || new Date().toISOString(),
          assignedBy: stored[email]?.assignedBy || "Registration",
          notes: stored[email]?.notes,
          avatarUrl: row.avatar_url || null,
        });
      });
    } catch (error) {
      if (!isNetworkOrFetchError(error)) {
        console.warn("Could not load remote user roster:", error);
      }
    }

    return sortUserRecords(Array.from(usersMap.values()));
  },
};
