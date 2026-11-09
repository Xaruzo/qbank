import { useEffect, useMemo, useState } from "react";
import { supabase, isValidUuid, isNetworkOrFetchError } from "../utils/supabaseClient";
import { SYSTEM_AUTH_STORAGE_KEY } from "../constants/appConstants";

export const emailToDeterministicUuid = (email) => {
  const clean = (email || "").trim().toLowerCase();
  if (!clean) return "00000000-0000-0000-0000-000000000000";
  let h1 = 0xdeadbeef, h2 = 0x41c64e6d, h3 = 0x9e3779b9, h4 = 0x85ebca6b;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822507);
    h4 = Math.imul(h4 ^ ch, 3266489909);
  }
  const toHex = (n) => (n >>> 0).toString(16).padStart(8, "0");
  const hex = toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};

const GUEST_PROFILE_STORAGE_KEY = "cse-qbank-profile-custom-v1";
const LOCAL_CREDENTIALS_STORAGE_KEY = "cse-qbank-local-credentials-v1";

const readLocalCredentials = () => {
  try {
    const raw = localStorage.getItem(LOCAL_CREDENTIALS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === "object") return parsed;
  } catch {}
  return {};
};

const writeLocalCredentials = (credentials) => {
  try {
    localStorage.setItem(LOCAL_CREDENTIALS_STORAGE_KEY, JSON.stringify(credentials));
    return true;
  } catch {
    return false;
  }
};

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

const createSalt = () => {
  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    return bytesToHex(bytes);
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
};

const hashLocalPassword = async (password, salt) => {
  const payload = `${salt}:${password}`;
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(payload)
    );
    return bytesToHex(new Uint8Array(digest));
  }
  let hash = 5381;
  for (let i = 0; i < payload.length; i += 1) {
    hash = Math.imul(hash, 33) ^ payload.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
};

const toAuthError = (error, fallback) => {
  const raw = error?.message || (typeof error === "string" ? error : "") || fallback;
  const lower = raw.toLowerCase();
  let message = raw;
  if (lower.includes("invalid login credentials") || lower.includes("invalid credentials")) {
    message = "Incorrect email or password. Please double-check and try again.";
  } else if (lower.includes("email not confirmed")) {
    message = "Your email has not been confirmed yet. Check your inbox, confirm your account, then sign in.";
  } else if (lower.includes("user already registered") || lower.includes("already registered")) {
    message = "An account with this email already exists. Please sign in instead.";
  } else if (
    lower.includes("password should be at least") ||
    lower.includes("weak password") ||
    lower.includes("password is too short")
  ) {
    message = "Please choose a stronger password with at least 6 characters.";
  } else if (
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("security purposes")
  ) {
    message = "Too many attempts. Please wait a moment before trying again.";
  } else if (isNetworkOrFetchError(error)) {
    message = "Could not reach the authentication service. The Supabase cloud project may be paused, or an ad-blocker/shield (like Brave Shields) may be blocking the request. You can also sign in using a password.";
  }
  return new Error(message);
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getStoredCustomProfile = () => {
  try {
    const raw = localStorage.getItem(GUEST_PROFILE_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
};

const getProfileDetails = (user, customProfile) => {
  const fallbackName = customProfile?.fullName || user?.email?.split("@")[0] || "Reviewer";
  const fullName =
    customProfile?.fullName ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    fallbackName;
  const avatarUrl = customProfile?.avatarUrl ?? user?.user_metadata?.avatar_url ?? null;
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "R";

  return {
    fullName,
    avatarUrl,
    initials,
    avatarColor: customProfile?.avatarColor || "amber",
    examTarget: customProfile?.examTarget || user?.user_metadata?.exam_target || "professional",
    targetExamDate: customProfile?.targetExamDate || "2026-08-09",
    dailyStudyGoal: customProfile?.dailyStudyGoal || 25,
    email: user?.email || "",
  };
};

const getStoredSystemUser = () => {
  try {
    const raw = localStorage.getItem(SYSTEM_AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.email) {
      if (!isValidUuid(parsed.id)) {
        parsed.id = emailToDeterministicUuid(parsed.email);
        try {
          localStorage.setItem(SYSTEM_AUTH_STORAGE_KEY, JSON.stringify(parsed));
        } catch {}
      }
      return parsed;
    }
  } catch (e) {
    console.warn("Could not read local system auth session:", e);
  }
  return null;
};

export function useAuthController() {
  const [session, setSession] = useState(null);
  const [systemUser, setSystemUser] = useState(() => getStoredSystemUser());
  const [customProfile, setCustomProfile] = useState(() => getStoredCustomProfile());
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    let active = true;

    if (!supabase) {
      setIsAuthLoading(false);
      return undefined;
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) console.error("Failed to get auth session:", error);
      if (data?.session) {
        setSession(data.session);
      }
      setIsAuthLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
      setIsAuthLoading(false);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  // Prefer remote Supabase user if present, otherwise fallback to system direct email user
  const user = session?.user || systemUser || null;
  const profile = useMemo(() => getProfileDetails(user, customProfile), [user, customProfile]);

  const signInWithGoogle = async () => {
    if (!supabase) return { error: new Error("Supabase auth is not configured.") };

    const redirectTo = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    return { error: error || null };
  };

  /**
   * Email authentication.
   * - With Supabase configured, credentials are always validated remotely.
   *   Failed sign-ins return an error instead of creating a local session.
   * - Without Supabase, accounts are stored locally with salted password
   *   hashes so passwords are still verified.
   */
  const signInWithEmail = async (email, password = "", options: { mode?: string } = {}) => {
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail || !EMAIL_PATTERN.test(cleanEmail)) {
      return { error: new Error("Please enter a valid email address.") };
    }

    const isSignUp = options.mode === "signup";

    if (supabase) {
      try {
        if (isSignUp) {
          if (!password) {
            return { error: new Error("Please enter a password to create your account.") };
          }
          const redirectTo = `${window.location.origin}${window.location.pathname}${window.location.search}`;
          const { data, error } = await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              emailRedirectTo: redirectTo,
              data: { full_name: cleanEmail.split("@")[0] },
            },
          });
          if (error) {
            return { error: toAuthError(error, "Failed to create your account.") };
          }
          if (Array.isArray(data?.user?.identities) && data.user.identities.length === 0) {
            return { error: new Error("An account with this email already exists. Please sign in instead.") };
          }
          if (data?.session) {
            setSession(data.session);
            return { error: null, mode: "remote" };
          }
          return {
            error: null,
            mode: "confirm_email",
            message: "Account created. Check your email to confirm your account, then sign in.",
          };
        }

        if (password) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });
          if (error) {
            return { error: toAuthError(error, "Failed to sign in. Please check your credentials.") };
          }
          if (!data?.session) {
            return { error: new Error("Unable to start a session. Please try again.") };
          }
          setSession(data.session);
          return { error: null, mode: "remote" };
        }

        const redirectTo = `${window.location.origin}${window.location.pathname}${window.location.search}`;
        const { error } = await supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) {
          return { error: toAuthError(error, "Failed to send the sign-in link.") };
        }
        const sysUser = {
          id: emailToDeterministicUuid(cleanEmail),
          email: cleanEmail,
          user_metadata: { full_name: cleanEmail.split("@")[0] },
          auth_type: "system_email",
        };
        localStorage.setItem(SYSTEM_AUTH_STORAGE_KEY, JSON.stringify(sysUser));
        setSystemUser(sysUser);
        return { error: null, mode: "otp_sent", message: "Magic link sent to your email, and local session activated!" };
      } catch (err) {
        return { error: toAuthError(err, "Authentication failed. Please try again.") };
      }
    }

    const credentials = readLocalCredentials();

    if (isSignUp) {
      if (!password) {
        return { error: new Error("Please enter a password to create your account.") };
      }
      if (password.length < 6) {
        return { error: new Error("Password must be at least 6 characters.") };
      }
      if (credentials[cleanEmail]) {
        return { error: new Error("An account with this email already exists. Please sign in instead.") };
      }
      const salt = createSalt();
      const hash = await hashLocalPassword(password, salt);
      credentials[cleanEmail] = { salt, hash, createdAt: new Date().toISOString() };
      if (!writeLocalCredentials(credentials)) {
        return { error: new Error("Could not create the account in this browser. Storage may be unavailable.") };
      }
    } else if (password) {
      const saved = credentials[cleanEmail];
      if (!saved) {
        return { error: new Error("No account found for this email. Create an account first.") };
      }
      const hash = await hashLocalPassword(password, saved.salt);
      if (hash !== saved.hash) {
        return { error: new Error("Incorrect password. Please try again.") };
      }
    }

    const sysUser = {
      id: emailToDeterministicUuid(cleanEmail),
      email: cleanEmail,
      user_metadata: { full_name: cleanEmail.split("@")[0] },
      auth_type: "system_email",
    };
    try {
      localStorage.setItem(SYSTEM_AUTH_STORAGE_KEY, JSON.stringify(sysUser));
    } catch (e) {
      console.warn("Failed saving system user to localStorage:", e);
    }
    setSystemUser(sysUser);
    return {
      error: null,
      mode: isSignUp ? "local_signup" : "system_direct",
      user: sysUser,
    };
  };

  const updateProfile = async (partial) => {
    const nextCustom = { ...(customProfile || {}), ...partial };
    setCustomProfile(nextCustom);
    try {
      localStorage.setItem(GUEST_PROFILE_STORAGE_KEY, JSON.stringify(nextCustom));
    } catch (e) {
      console.warn("Failed saving custom profile:", e);
    }

    if (systemUser) {
      const updatedSystem = {
        ...systemUser,
        user_metadata: {
          ...(systemUser.user_metadata || {}),
          full_name: nextCustom.fullName,
          avatar_url: nextCustom.avatarUrl,
          avatar_color: nextCustom.avatarColor,
          exam_target: nextCustom.examTarget,
        },
      };
      setSystemUser(updatedSystem);
      try {
        localStorage.setItem(SYSTEM_AUTH_STORAGE_KEY, JSON.stringify(updatedSystem));
      } catch {}
    }

    let remoteAvatarUrl = nextCustom.avatarUrl;
    if (supabase && session?.user && nextCustom.avatarUrl?.startsWith("data:image/")) {
      try {
        const res = await fetch(nextCustom.avatarUrl);
        const blob = await res.blob();
        const { uploadAvatarToSupabase } = await import("../utils/imageUpload");
        const publicUrl = await uploadAvatarToSupabase(blob, session.user.id);
        if (publicUrl) {
          remoteAvatarUrl = publicUrl;
          nextCustom.avatarUrl = publicUrl;
          setCustomProfile({ ...nextCustom });
          try {
            localStorage.setItem(GUEST_PROFILE_STORAGE_KEY, JSON.stringify(nextCustom));
          } catch {}
        }
      } catch (uploadErr) {
        console.warn("Direct avatar storage upload failed (falling back to inline storage):", uploadErr);
      }
    }

    if (supabase && session?.user) {
      try {
        await supabase.auth.updateUser({
          data: {
            full_name: nextCustom.fullName,
            avatar_url: remoteAvatarUrl,
            avatar_color: nextCustom.avatarColor,
            exam_target: nextCustom.examTarget,
          },
        });

        // Sync to public.profiles if the table is created
        try {
          await supabase
            .from("profiles")
            .upsert({
              id: session.user.id,
              email: session.user.email,
              full_name: nextCustom.fullName,
              avatar_url: remoteAvatarUrl,
              avatar_color: nextCustom.avatarColor,
              exam_target: nextCustom.examTarget,
              updated_at: new Date().toISOString(),
            }, { onConflict: "id" });
        } catch {}
      } catch (err) {
        console.warn("Could not sync profile to remote auth:", err);
      }
    }

    return { success: true };
  };

  const signOut = async () => {
    try {
      localStorage.removeItem(SYSTEM_AUTH_STORAGE_KEY);
      setSystemUser(null);
    } catch (e) {
      console.warn("Failed clearing system user storage:", e);
    }

    if (supabase) {
      const { error } = await supabase.auth.signOut();
      setSession(null);
      return { error: error || null };
    }
    return { error: null };
  };

  return {
    authAvailable: true, // Always available with system login system
    isAuthLoading,
    isAuthenticated: !!user,
    session,
    user,
    profile,
    updateProfile,
    signInWithGoogle,
    signInWithEmail,
    signOut,
  };
}
