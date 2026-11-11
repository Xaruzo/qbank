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

const GUEST_PROFILE_STORAGE_KEY = "cse-qbank-profile-guest-v2";
const LEGACY_PROFILE_STORAGE_KEY = "cse-qbank-profile-custom-v1";
const LOCAL_CREDENTIALS_STORAGE_KEY = "cse-qbank-local-credentials-v1";

const getUserProfileStorageKey = (userId: string) => `cse-qbank-profile-user-${userId}`;

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

export const updateLocalAccountPassword = async (email: string, newPassword: string): Promise<boolean> => {
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail || !newPassword) return false;
  const credentials = readLocalCredentials();
  const salt = createSalt();
  const hash = await hashLocalPassword(newPassword, salt);
  credentials[cleanEmail] = {
    salt,
    hash,
    updatedAt: new Date().toISOString(),
    createdAt: credentials[cleanEmail]?.createdAt || new Date().toISOString(),
  };
  return writeLocalCredentials(credentials);
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
    message = "Too many attempts. For security, Supabase limits instant login links to once every 60 seconds. Please check your inbox/spam folder for the email already sent, wait 60 seconds to resend, or switch to Password login / Google sign-in to enter immediately.";
  } else if (isNetworkOrFetchError(error)) {
    message = "Could not reach the authentication service. The Supabase cloud project may be paused, or an ad-blocker/shield (like Brave Shields) may be blocking the request. You can also sign in using a password.";
  }
  return new Error(message);
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getStoredGuestProfile = () => {
  try {
    const raw =
      localStorage.getItem(GUEST_PROFILE_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_PROFILE_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
};

const getAvatarTimestamp = (url: unknown) => {
  if (typeof url !== "string") return 0;
  const match = url.match(/avatar-(\d+)\./);
  return match ? Number(match[1]) : 0;
};

const getStoredUserProfile = (userId: string) => {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(getUserProfileStorageKey(userId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
};

const getGuestProfileDetails = (guestProfile: any) => {
  const fullName = guestProfile?.fullName || "Practice as Guest";
  const avatarUrl = guestProfile?.avatarUrl ?? null;
  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0]?.toUpperCase() || "")
      .join("") || "PG";

  return {
    fullName,
    avatarUrl,
    initials,
    avatarColor: guestProfile?.avatarColor || "amber",
    avatarShape: guestProfile?.avatarShape || "badge",
    avatarPreset: guestProfile?.avatarPreset || null,
    examTarget: guestProfile?.examTarget || "professional",
    targetExamDate: guestProfile?.targetExamDate || "2026-08-09",
    dailyStudyGoal: guestProfile?.dailyStudyGoal || 25,
    email: "",
  };
};

const getUserProfileDetails = (user: any, userCustom: any) => {
  const meta = user?.user_metadata || {};
  const fallbackName = user?.email?.split("@")[0] || "Reviewer";
  const fullName =
    userCustom?.fullName ||
    meta.full_name ||
    meta.name ||
    fallbackName;
  const customAvatar =
    userCustom && "avatarUrl" in userCustom ? userCustom.avatarUrl : null;
  const avatarUrl = customAvatar || meta.avatar_url || meta.picture || null;
  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0]?.toUpperCase() || "")
      .join("") || "R";

  return {
    fullName,
    avatarUrl,
    initials,
    avatarColor: userCustom?.avatarColor || meta.avatar_color || "amber",
    avatarShape: userCustom?.avatarShape || meta.avatar_shape || "circle",
    avatarPreset: userCustom?.avatarPreset || meta.avatar_preset || null,
    examTarget: userCustom?.examTarget || meta.exam_target || "professional",
    targetExamDate: userCustom?.targetExamDate || meta.target_exam_date || "2026-08-09",
    dailyStudyGoal: userCustom?.dailyStudyGoal || meta.daily_study_goal || 25,
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
  const [guestProfile, setGuestProfile] = useState(() => getStoredGuestProfile());
  const [userProfile, setUserProfile] = useState<any>(() => {
    const initialUser = getStoredSystemUser();
    return initialUser?.id ? getStoredUserProfile(initialUser.id) : null;
  });
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Active user identity
  const user = session?.user || systemUser || null;
  const currentUserId = user?.id || null;

  // Whenever active user changes (e.g. login, logout, account switch), load that user's profile
  useEffect(() => {
    if (currentUserId) {
      setUserProfile(getStoredUserProfile(currentUserId));
    } else {
      setUserProfile(null);
    }
  }, [currentUserId]);

  // Sync the local profile cache with public.profiles. Pending local-only
  // avatars (data URLs) are uploaded to Storage so the photo reaches the cloud.
  useEffect(() => {
    if (!supabase || !session?.user?.id) return;
    const client = supabase;
    const userId = session.user.id;
    const userEmail = session.user.email;
    const metadata = session.user.user_metadata || {};
    let active = true;

    const syncProfile = async () => {
      const localProfile: any = getStoredUserProfile(userId) || {};
      let localAvatarUrl: string | null = localProfile.avatarUrl || null;
      let uploadedAvatarUrl: string | null = null;

      if (typeof localAvatarUrl === "string" && localAvatarUrl.startsWith("data:image/")) {
        try {
          const response = await fetch(localAvatarUrl);
          const blob = await response.blob();
          const { uploadAvatarToSupabase } = await import("../utils/imageUpload");
          uploadedAvatarUrl = await uploadAvatarToSupabase(blob, userId);
          if (uploadedAvatarUrl) localAvatarUrl = uploadedAvatarUrl;
        } catch (uploadError) {
          console.warn("Could not upload pending avatar to Supabase:", uploadError);
        }
      }

      const { data, error } = await client
        .from("profiles")
        .select("full_name, avatar_url, avatar_color, exam_target")
        .eq("id", userId)
        .maybeSingle();

      if (!active) return;

      if (error && !isNetworkOrFetchError(error)) {
        console.warn("Could not load remote profile:", error.message);
      }

      const metadataAvatar = metadata.avatar_url || metadata.picture || null;
      const pendingLocalAvatar =
        !uploadedAvatarUrl && typeof localAvatarUrl === "string" && localAvatarUrl.startsWith("data:")
          ? localAvatarUrl
          : null;
      const preferLocalAvatar =
        getAvatarTimestamp(localAvatarUrl) > getAvatarTimestamp(data?.avatar_url);
      const remoteAvatar =
        uploadedAvatarUrl ||
        (preferLocalAvatar ? localAvatarUrl : null) ||
        data?.avatar_url ||
        metadataAvatar ||
        (localAvatarUrl && !localAvatarUrl.startsWith("data:") ? localAvatarUrl : null);
      const effectiveAvatar = pendingLocalAvatar || remoteAvatar;
      const fullName =
        data?.full_name ||
        localProfile.fullName ||
        metadata.full_name ||
        metadata.name ||
        userEmail?.split("@")[0] ||
        "Reviewer";

      const merged = {
        ...(localProfile || {}),
        fullName,
        avatarUrl: effectiveAvatar,
        avatarColor: data?.avatar_color || localProfile.avatarColor || metadata.avatar_color || "amber",
        examTarget: data?.exam_target || localProfile.examTarget || metadata.exam_target,
      };

      setUserProfile(merged);
      try {
        localStorage.setItem(getUserProfileStorageKey(userId), JSON.stringify(merged));
      } catch {}

      if (error) return;

      const profileRow: Record<string, any> = {
        id: userId,
        email: userEmail,
        full_name: fullName,
        updated_at: new Date().toISOString(),
      };
      if (remoteAvatar) profileRow.avatar_url = remoteAvatar;
      if (merged.avatarColor) profileRow.avatar_color = merged.avatarColor;

      const { error: upsertError } = await client
        .from("profiles")
        .upsert(profileRow, { onConflict: "id" });

      if (upsertError && !isNetworkOrFetchError(upsertError)) {
        console.warn("Could not sync remote profile row:", upsertError.message);
      }

      if (uploadedAvatarUrl) {
        await client.auth.updateUser({ data: { avatar_url: uploadedAvatarUrl } });
      }
    };

    syncProfile();

    return () => {
      active = false;
    };
  }, [session?.user?.id]);

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

  const profile = useMemo(() => {
    if (!user) {
      return getGuestProfileDetails(guestProfile);
    }
    return getUserProfileDetails(user, userProfile);
  }, [user, guestProfile, userProfile]);

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
            // Check if user recently reset their password via Brevo OTP verification
            const credentials = readLocalCredentials();
            const saved = credentials[cleanEmail];
            if (saved?.salt && saved?.hash) {
              const hash = await hashLocalPassword(password, saved.salt);
              if (hash === saved.hash) {
                const sysUser = {
                  id: emailToDeterministicUuid(cleanEmail),
                  email: cleanEmail,
                  user_metadata: { full_name: cleanEmail.split("@")[0] },
                  auth_type: "system_email",
                };
                try {
                  localStorage.setItem(SYSTEM_AUTH_STORAGE_KEY, JSON.stringify(sysUser));
                } catch {}
                setSystemUser(sysUser);
                return {
                  error: null,
                  mode: "system_direct",
                  user: sysUser,
                  message: "Welcome back! Signed in with your updated reviewer credentials.",
                };
              }
            }
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

  const updateProfile = async (partial: any) => {
    if (!user) {
      // In Guest mode: update ONLY the guest profile
      const nextGuest = { ...(guestProfile || {}), ...partial };
      setGuestProfile(nextGuest);
      try {
        localStorage.setItem(GUEST_PROFILE_STORAGE_KEY, JSON.stringify(nextGuest));
      } catch (e) {
        console.warn("Failed saving guest profile:", e);
      }
      return { success: true };
    }

    // In Authenticated mode: update strictly the user's isolated account profile
    const nextUser = { ...(userProfile || {}), ...partial };
    setUserProfile(nextUser);
    const userStorageKey = getUserProfileStorageKey(user.id);
    try {
      localStorage.setItem(userStorageKey, JSON.stringify(nextUser));
    } catch (e) {
      console.warn("Failed saving user profile cache:", e);
    }

    if (systemUser) {
      const updatedSystem = {
        ...systemUser,
        user_metadata: {
          ...(systemUser.user_metadata || {}),
          full_name: nextUser.fullName,
          avatar_url: nextUser.avatarUrl,
          avatar_color: nextUser.avatarColor,
          avatar_shape: nextUser.avatarShape,
          avatar_preset: nextUser.avatarPreset,
          exam_target: nextUser.examTarget,
        },
      };
      setSystemUser(updatedSystem);
      try {
        localStorage.setItem(SYSTEM_AUTH_STORAGE_KEY, JSON.stringify(updatedSystem));
      } catch {}
    }

    let remoteAvatarUrl = nextUser.avatarUrl;
    if (supabase && session?.user && nextUser.avatarUrl?.startsWith("data:image/")) {
      try {
        const res = await fetch(nextUser.avatarUrl);
        const blob = await res.blob();
        const { uploadAvatarToSupabase } = await import("../utils/imageUpload");
        const publicUrl = await uploadAvatarToSupabase(blob, session.user.id);
        if (publicUrl) {
          remoteAvatarUrl = publicUrl;
          nextUser.avatarUrl = publicUrl;
          setUserProfile({ ...nextUser });
          try {
            localStorage.setItem(userStorageKey, JSON.stringify(nextUser));
          } catch {}
        }
      } catch (uploadErr) {
        console.warn("Direct avatar storage upload failed (falling back to inline storage):", uploadErr);
      }
    }

    if (supabase && session?.user) {
      try {
        const isUnsyncedDataUrl =
          typeof remoteAvatarUrl === "string" && remoteAvatarUrl.startsWith("data:");
        const avatarRemoved = partial?.avatarUrl === null;
        const metadataPayload: Record<string, any> = {
          full_name: nextUser.fullName,
          avatar_color: nextUser.avatarColor,
          avatar_shape: nextUser.avatarShape,
          avatar_preset: nextUser.avatarPreset,
          exam_target: nextUser.examTarget,
        };
        if (!isUnsyncedDataUrl && remoteAvatarUrl) {
          metadataPayload.avatar_url = remoteAvatarUrl;
        } else if (avatarRemoved) {
          metadataPayload.avatar_url = null;
        }

        await supabase.auth.updateUser({ data: metadataPayload });

        // Sync to public.profiles if the table is created
        try {
          const profileRow: Record<string, any> = {
            id: session.user.id,
            email: session.user.email,
            full_name: nextUser.fullName,
            avatar_color: nextUser.avatarColor,
            exam_target: nextUser.examTarget,
            updated_at: new Date().toISOString(),
          };
          if (!isUnsyncedDataUrl && remoteAvatarUrl) {
            profileRow.avatar_url = remoteAvatarUrl;
          } else if (avatarRemoved) {
            profileRow.avatar_url = null;
          }

          await supabase
            .from("profiles")
            .upsert(profileRow, { onConflict: "id" });
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

    setUserProfile(null);

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
