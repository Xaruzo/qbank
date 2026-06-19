import { useEffect, useMemo, useState } from "react";
import { supabase } from "../utils/supabaseClient";

const getProfileDetails = (user) => {
  const fallbackName = user?.email?.split("@")[0] || "User";
  const fullName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    fallbackName;
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
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

export function useAuthController() {
  const [session, setSession] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(!!supabase);

  console.log('[useAuthController] Initializing, supabase available:', !!supabase);

  useEffect(() => {
    if (!supabase) {
      console.log('[useAuthController] No supabase available, setting isAuthLoading to false');
      setIsAuthLoading(false);
      return undefined;
    }

    let active = true;

    console.log('[useAuthController] Calling supabase.auth.getSession()');
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      console.log('[useAuthController] getSession() result:', { data, error, sessionExists: !!data?.session });
      if (error) console.error("Failed to get auth session:", error);
      setSession(data?.session || null);
      setIsAuthLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      console.log('[useAuthController] onAuthStateChange:', { _event, nextSession });
      setSession(nextSession || null);
      setIsAuthLoading(false);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const user = session?.user || null;
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

  const signOut = async () => {
    if (!supabase) return { error: null };
    const { error } = await supabase.auth.signOut();
    return { error: error || null };
  };

  return {
    authAvailable: !!supabase,
    isAuthLoading,
    isAuthenticated: !!user,
    session,
    user,
    profile,
    signInWithGoogle,
    signOut,
  };
}
