import { SUPERADMIN_EMAILS, SUPERADMIN_UIDS, QUESTION_ADMIN_EMAILS } from "../constants/appConstants";
import { supabase, isNetworkOrFetchError } from "../utils/supabaseClient";
import type { UserAccountStatus, UserRole, UserRoleRecord } from "../types";

export const USER_ROLES_STORAGE_KEY = "cse-qbank-user-roles-v1";
const USER_ROLES_TABLE = "user_roles";
const PROFILES_TABLE = "profiles";
const LOCAL_CREDENTIALS_STORAGE_KEY = "cse-qbank-local-credentials-v1";

const roleWeight = (role: UserRole) =>
  role === "superadmin" ? 3 : role === "admin" ? 2 : role === "moderator" ? 1 : 0;

const normalizeStatus = (raw?: unknown): UserAccountStatus => {
  if (raw === "banned" || raw === "deleted") return raw;
  return "active";
};

const isProtectedRootEmail = (email: string) =>
  SUPERADMIN_EMAILS.some((e) => e.toLowerCase() === email.toLowerCase());

const isMissingColumnError = (err: any) => {
  const code = String(err?.code || "");
  const msg = String(err?.message || err?.details || "").toLowerCase();
  return code === "42703" || (msg.includes("column") && msg.includes("does not exist"));
};

const sortUserRecords = (records: UserRoleRecord[]) =>
  records.sort((a, b) => {
    const aStatus = normalizeStatus(a.status);
    const bStatus = normalizeStatus(b.status);
    if (aStatus !== bStatus) {
      const order: Record<UserAccountStatus, number> = { active: 0, banned: 1, deleted: 2 };
      return order[aStatus] - order[bStatus];
    }
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
    status: "active",
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

const getAccessToken = async (): Promise<string | null> => {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  } catch {
    return null;
  }
};

const clearLocalUserArtifacts = (cleanEmail: string) => {
  try {
    const rawCreds = localStorage.getItem(LOCAL_CREDENTIALS_STORAGE_KEY);
    const parsedCreds = safeParse(rawCreds, {});
    if (cleanEmail in parsedCreds) {
      delete parsedCreds[cleanEmail];
      localStorage.setItem(LOCAL_CREDENTIALS_STORAGE_KEY, JSON.stringify(parsedCreds));
    }
  } catch {}

  try {
    const toDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("cse-qbank-profile-user-")) {
        const raw = localStorage.getItem(key);
        const profile = safeParse(raw, null);
        if (profile?.email && String(profile.email).trim().toLowerCase() === cleanEmail) {
          toDelete.push(key);
        }
      }
    }
    toDelete.forEach((key) => localStorage.removeItem(key));
  } catch {}
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

  getAccountRestriction(
    identifier: { id?: string | null; email?: string | null } | null
  ): { restricted: boolean; status: UserAccountStatus; reason?: string } {
    if (!identifier) return { restricted: false, status: "active" };

    const cleanEmail = (identifier.email || "").trim().toLowerCase();
    const userId = identifier.id || "";

    if (cleanEmail && isProtectedRootEmail(cleanEmail)) {
      return { restricted: false, status: "active" };
    }
    if (userId && SUPERADMIN_UIDS.includes(userId)) {
      return { restricted: false, status: "active" };
    }

    const roles = this.getStoredRoles();
    const rec =
      (cleanEmail && roles[cleanEmail]) ||
      (userId && (Object.values(roles) as UserRoleRecord[]).find((r) => r?.id === userId)) ||
      null;

    const status = normalizeStatus(rec?.status);
    return {
      restricted: status === "banned" || status === "deleted",
      status,
      reason: rec?.statusReason,
    };
  },

  async fetchRemoteAccountRestriction(
    email?: string | null
  ): Promise<{ restricted: boolean; status: UserAccountStatus; reason?: string }> {
    const cleanEmail = (email || "").trim().toLowerCase();
    const local = this.getAccountRestriction({ email: cleanEmail });
    if (!cleanEmail || isProtectedRootEmail(cleanEmail)) {
      return { restricted: false, status: "active" };
    }
    if (!supabase) return local;

    try {
      const { data, error } = await supabase
        .from(USER_ROLES_TABLE)
        .select("email,role,status,status_reason,status_updated_at,status_updated_by,deleted_at")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (error || !data) return local;

      const status = normalizeStatus(data.status);
      const roles = this.getStoredRoles();
      const existing = roles[cleanEmail];
      if (!existing || existing.status !== status || existing.statusReason !== data.status_reason) {
        roles[cleanEmail] = {
          ...(existing || {
            id: `role-${cleanEmail}`,
            email: cleanEmail,
            fullName: cleanEmail.split("@")[0],
            role: (data.role as UserRole) || "reviewer",
            assignedAt: new Date().toISOString(),
          }),
          status,
          statusReason: data.status_reason || undefined,
          statusUpdatedAt: data.status_updated_at || undefined,
          statusUpdatedBy: data.status_updated_by || undefined,
          deletedAt: data.deleted_at || null,
        };
        this.saveStoredRoles(roles);
      }

      return {
        restricted: status === "banned" || status === "deleted",
        status,
        reason: data.status_reason || undefined,
      };
    } catch {
      return local;
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
    const rec =
      (cleanEmail && roles[cleanEmail]) ||
      (userId && roles[userId]) ||
      null;
    if (rec) {
      if (normalizeStatus(rec.status) !== "active") {
        return "reviewer";
      }
      if (rec.role) return rec.role;
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
    if (isProtectedRootEmail(cleanEmail) && role !== "superadmin") {
      return { success: false, error: "The primary root Superadmin role cannot be revoked or altered." };
    }

    const roles = this.getStoredRoles();
    const existing = roles[cleanEmail];
    if (existing && normalizeStatus(existing.status) !== "active") {
      return {
        success: false,
        error: "Restore this account to Active status before assigning administrative roles.",
      };
    }

    const record: UserRoleRecord = {
      id: existing?.id || `role-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      email: cleanEmail,
      fullName: targetName || existing?.fullName || cleanEmail.split("@")[0],
      role,
      status: "active",
      assignedAt: new Date().toISOString(),
      assignedBy: assignerInfo?.email || assignerInfo?.fullName || "Superadmin",
      notes:
        role === "superadmin"
          ? "Superadministrator permissions"
          : role === "admin"
            ? "Question Bank Administrator"
            : "Civil Service Reviewer",
    };

    roles[cleanEmail] = record;
    this.saveStoredRoles(roles);

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

    if (isProtectedRootEmail(cleanEmail)) {
      return { success: false, error: "Cannot revoke permissions from the primary root Superadmin." };
    }

    const roles = this.getStoredRoles();
    if (roles[cleanEmail]) {
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

  async setUserStatus(
    targetEmail: string,
    status: UserAccountStatus,
    actorInfo?: { email?: string; fullName?: string },
    reason?: string,
    targetName?: string
  ): Promise<{
    success: boolean;
    record?: UserRoleRecord;
    serverSynced?: boolean;
    warning?: string;
    error?: string;
  }> {
    const cleanEmail = (targetEmail || "").trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { success: false, error: "Please provide a valid user email address." };
    }

    if (isProtectedRootEmail(cleanEmail)) {
      return {
        success: false,
        error: "The primary root Superadmin account is protected and cannot be suspended or removed.",
      };
    }

    const actorEmail = (actorInfo?.email || "").trim().toLowerCase();
    if (actorEmail && actorEmail === cleanEmail && status !== "active") {
      return {
        success: false,
        error: "You cannot ban or remove your own currently signed-in account.",
      };
    }

    const roles = this.getStoredRoles();
    const existing = roles[cleanEmail];
    const nowIso = new Date().toISOString();
    const cleanReason = (reason || "").trim() || undefined;
    // Security rule: automatically strip elevated roles when suspending or soft-deleting
    const nextRole: UserRole = status === "active" ? existing?.role || "reviewer" : "reviewer";

    const record: UserRoleRecord = {
      id: existing?.id || `user-${cleanEmail}`,
      email: cleanEmail,
      fullName: targetName || existing?.fullName || cleanEmail.split("@")[0],
      role: nextRole,
      status,
      statusReason: status === "active" ? undefined : cleanReason,
      statusUpdatedAt: nowIso,
      statusUpdatedBy: actorInfo?.email || actorInfo?.fullName || "Superadmin",
      deletedAt: status === "deleted" ? nowIso : null,
      assignedAt: nowIso,
      assignedBy: actorInfo?.email || actorInfo?.fullName || existing?.assignedBy || "Superadmin",
      avatarUrl: existing?.avatarUrl || null,
      notes:
        status === "banned"
          ? "Account suspended by administrator"
          : status === "deleted"
            ? "Account soft-deleted (archived)"
            : "Account active",
    };

    let serverSynced = false;
    let warning: string | undefined;
    const token = await getAccessToken();
    if (token) {
      try {
        const res = await fetch("/api/admin/user-status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: cleanEmail,
            status,
            reason: cleanReason,
            fullName: record.fullName,
          }),
        });
        const payload = await res.json().catch(() => null);
        if (res.ok) {
          serverSynced = true;
          if (payload?.authUserFound && !payload?.authUpdated) {
            warning =
              payload?.authError ||
              "Supabase Auth account ban status could not be updated automatically.";
          } else if (payload?.schemaMigrated === false) {
            warning =
              payload?.authUpdated
                ? "Supabase Auth was updated, but public.user_roles is missing moderation columns (status, deleted_at, etc.)."
                : "public.user_roles is missing moderation columns (status, deleted_at, etc.) for cross-device sync.";
          }
        } else if (res.status === 401 || res.status === 403) {
          return {
            success: false,
            error: payload?.error || "Administrator privileges required to update account status.",
          };
        } else {
          warning =
            payload?.error ||
            "Server could not update Supabase Auth status (check SUPABASE_SERVICE_ROLE_KEY).";
        }
      } catch {
        warning = "Could not reach backend admin endpoint to update Supabase Auth.";
      }
    } else if (supabase) {
      warning =
        "Signed in via local fallback session; sign in with Supabase password or Google so Supabase Auth can also be updated.";
    }

    roles[cleanEmail] = record;
    this.saveStoredRoles(roles);

    if (supabase && !serverSynced) {
      try {
        const extendedPayload = {
          email: cleanEmail,
          role: record.role,
          full_name: record.fullName,
          assigned_at: record.assignedAt,
          assigned_by: record.assignedBy,
          status,
          status_reason: cleanReason || null,
          status_updated_at: nowIso,
          status_updated_by: record.statusUpdatedBy,
          deleted_at: record.deletedAt,
        };
        const { error } = await supabase
          .from(USER_ROLES_TABLE)
          .upsert(extendedPayload, { onConflict: "email" });

        if (error && isMissingColumnError(error)) {
          if (!warning) {
            warning =
              "public.user_roles is missing moderation columns (status, deleted_at, etc.).";
          }
          await supabase.from(USER_ROLES_TABLE).upsert(
            {
              email: cleanEmail,
              role: record.role,
              full_name: record.fullName,
              assigned_at: record.assignedAt,
              assigned_by: record.assignedBy,
            },
            { onConflict: "email" }
          );
        }
      } catch {}
    }

    return { success: true, record, serverSynced, warning };
  },

  async permanentlyDeleteUser(
    targetEmail: string,
    actorInfo?: { email?: string; fullName?: string }
  ): Promise<{ success: boolean; serverDeleted?: boolean; warning?: string; error?: string }> {
    const cleanEmail = (targetEmail || "").trim().toLowerCase();
    if (!cleanEmail) return { success: false, error: "Invalid user email." };

    if (isProtectedRootEmail(cleanEmail)) {
      return {
        success: false,
        error: "The primary root Superadmin account cannot be permanently deleted.",
      };
    }

    const actorEmail = (actorInfo?.email || "").trim().toLowerCase();
    if (actorEmail && actorEmail === cleanEmail) {
      return {
        success: false,
        error: "You cannot permanently delete your own currently signed-in account.",
      };
    }

    let serverDeleted = false;
    let warning: string | undefined;
    const token = await getAccessToken();
    if (token) {
      try {
        const res = await fetch("/api/admin/user-delete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ email: cleanEmail }),
        });
        const payload = await res.json().catch(() => null);
        if (res.ok) {
          serverDeleted = true;
          if (payload?.authUserFound && !payload?.authDeleted) {
            warning = payload?.authError || "Supabase Auth user could not be deleted.";
          }
        } else if (res.status === 401 || res.status === 403) {
          return {
            success: false,
            error: payload?.error || "Administrator privileges required to delete accounts.",
          };
        } else {
          warning = payload?.error || "Server could not delete the Supabase Auth user.";
        }
      } catch {
        warning = "Could not reach backend admin endpoint to delete Supabase Auth user.";
      }
    } else if (supabase) {
      warning = "Local session active; Supabase Auth user must be removed with an active Supabase admin session.";
    }

    const roles = this.getStoredRoles();
    if (roles[cleanEmail]) {
      delete roles[cleanEmail];
      this.saveStoredRoles(roles);
    }
    clearLocalUserArtifacts(cleanEmail);

    if (supabase && !serverDeleted) {
      try {
        await supabase.from(USER_ROLES_TABLE).delete().eq("email", cleanEmail);
      } catch {}
    }

    return { success: true, serverDeleted, warning };
  },

  /**
   * Aggregates all registered users, profiles, and assigned roles
   * so the Superadmin can view and manage accounts easily.
   */
  getAllUsers(): UserRoleRecord[] {
    const roles = this.getStoredRoles();
    const usersMap = new Map<string, UserRoleRecord>();

    // 1. Seed from stored roles
    (Object.values(roles) as UserRoleRecord[]).forEach((r) => {
      if (r?.email) {
        usersMap.set(r.email.toLowerCase(), {
          ...r,
          status: normalizeStatus(r.status),
        });
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
              status: "active",
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
                status: "active",
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
   * local data when Supabase is unavailable or columns aren't migrated yet.
   */
  async loadAllUsers(): Promise<UserRoleRecord[]> {
    const usersMap = new Map<string, UserRoleRecord>();
    this.getAllUsers().forEach((record) => {
      if (record?.email) {
        usersMap.set(record.email.toLowerCase(), {
          ...record,
          status: normalizeStatus(record.status),
        });
      }
    });

    if (!supabase) return sortUserRecords(Array.from(usersMap.values()));

    try {
      const profilesPromise = supabase
        .from(PROFILES_TABLE)
        .select("id,email,full_name,avatar_url");

      let rolesRes: any = await supabase
        .from(USER_ROLES_TABLE)
        .select(
          "email,role,full_name,assigned_at,assigned_by,status,status_reason,status_updated_at,status_updated_by,deleted_at"
        );

      if (rolesRes.error && isMissingColumnError(rolesRes.error)) {
        rolesRes = await supabase
          .from(USER_ROLES_TABLE)
          .select("email,role,full_name,assigned_at,assigned_by");
      }

      const profilesRes = await profilesPromise;

      const stored = this.getStoredRoles();
      let rolesChanged = false;

      const remoteRoles = Array.isArray(rolesRes.data) ? rolesRes.data : [];
      remoteRoles.forEach((row: any) => {
        const email = (row?.email || "").trim().toLowerCase();
        if (!email) return;

        const remoteStatus: UserAccountStatus =
          "status" in row
            ? normalizeStatus(row.status)
            : normalizeStatus(stored[email]?.status);

        const record: UserRoleRecord = {
          id: stored[email]?.id || `role-${email}`,
          email,
          fullName: row.full_name || stored[email]?.fullName || email.split("@")[0],
          role: (row.role as UserRole) || "reviewer",
          status: remoteStatus,
          statusReason:
            "status_reason" in row ? row.status_reason || undefined : stored[email]?.statusReason,
          statusUpdatedAt:
            "status_updated_at" in row
              ? row.status_updated_at || undefined
              : stored[email]?.statusUpdatedAt,
          statusUpdatedBy:
            "status_updated_by" in row
              ? row.status_updated_by || undefined
              : stored[email]?.statusUpdatedBy,
          deletedAt: "deleted_at" in row ? row.deleted_at || null : stored[email]?.deletedAt ?? null,
          assignedAt: row.assigned_at || stored[email]?.assignedAt || new Date().toISOString(),
          assignedBy: row.assigned_by || stored[email]?.assignedBy || "Supabase",
          notes: stored[email]?.notes,
        };

        if (
          !stored[email] ||
          stored[email].role !== record.role ||
          stored[email].fullName !== record.fullName ||
          normalizeStatus(stored[email].status) !== record.status
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
          status: normalizeStatus(stored[email]?.status),
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
