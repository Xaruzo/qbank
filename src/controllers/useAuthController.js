import { useEffect, useMemo, useState } from "react";
import { supabase, isValidUuid } from "../utils/supabaseClient";
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
  const avatarUrl = user?.user_metadata?.avatar_url || null;
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
   * System Direct Email Login:
   * 1. Attempts Supabase OTP / Magic link if supabase is connected.
   * 2. Always provisions/activates system user session with full account capabilities.
   */
  const signInWithEmail = async (email, password = "") => {
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { error: new Error("Please enter a valid email address.") };
    }

    // Try Supabase auth if connected
    if (supabase) {
      try {
        if (password) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });
          if (!error && data?.session) {
            setSession(data.session);
            return { error: null, mode: "remote" };
          }
        } else {
          // Send magic link
          const redirectTo = `${window.location.origin}${window.location.pathname}${window.location.search}`;
          const { error } = await supabase.auth.signInWithOtp({
            email: cleanEmail,
            options: { emailRedirectTo: redirectTo },
          });
          if (!error) {
            // Also store system session for seamless immediate local session
            const sysUser = {
              id: emailToDeterministicUuid(cleanEmail),
              email: cleanEmail,
              user_metadata: { full_name: cleanEmail.split("@")[0] },
              auth_type: "system_email",
            };
            localStorage.setItem(SYSTEM_AUTH_STORAGE_KEY, JSON.stringify(sysUser));
            setSystemUser(sysUser);
            return { error: null, mode: "otp_sent", message: "Magic link sent to your email, and local session activated!" };
          }
        }
      } catch (err) {
        console.warn("Remote Supabase email auth failed, falling back to system direct login:", err);
      }
    }

    // Direct system login with email:
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
    return { error: null, mode: "system_direct", user: sysUser };
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
          avatar_color: nextCustom.avatarColor,
          exam_target: nextCustom.examTarget,
        },
      };
      setSystemUser(updatedSystem);
      try {
        localStorage.setItem(SYSTEM_AUTH_STORAGE_KEY, JSON.stringify(updatedSystem));
      } catch {}
    }

    if (supabase && session?.user) {
      try {
        await supabase.auth.updateUser({
          data: {
            full_name: nextCustom.fullName,
            avatar_color: nextCustom.avatarColor,
            exam_target: nextCustom.examTarget,
          },
        });
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
