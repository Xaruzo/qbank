import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const isValidUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

// This will be null if keys are not provided or invalid, allowing fallback to local storage
export const supabase = (isValidUrl(supabaseUrl) && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null

/**
 * Checks if an error is due to network disconnection, CORS failure,
 * DNS failure, offline status, or paused Supabase project.
 */
export const isNetworkOrFetchError = (err) => {
  if (!err) return false;
  const msg = (err.message || err.details || (typeof err === "string" ? err : "") || "").toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("load failed") ||
    msg.includes("aborted") ||
    msg.includes("timeout") ||
    err.name === "TypeError" ||
    (typeof navigator !== "undefined" && navigator.onLine === false)
  );
};
