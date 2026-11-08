import { useEffect, useMemo, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import { SYSTEM_AUTH_STORAGE_KEY } from "../constants/appConstants";

const getProfileDetails = (user) => {
  const fallbackName = user?.email?.split("@")[0] || "User";
  const fullName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    fallbackName;
  const avatarUrl = null;
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "U";

  return {
    fullName,
    avatarUrl,
    initials,
    email: user?.email || "",
  };
};

const getStoredSystemUser = () => {
  try {
    const raw = localStorage.getItem(SYSTEM_AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.email) {
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
  const profile = useMemo(() => getProfileDetails(user), [user]);

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
              id: cleanEmail,
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
      id: cleanEmail,
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
    signInWithGoogle,
    signInWithEmail,
    signOut,
  };
}
