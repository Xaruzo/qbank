import { useState, useEffect, useLayoutEffect } from "react";
import { THEME_KEY } from "../constants/appConstants";
import { storageModel } from "../models/storageModel";

export type ThemeMode = "dark" | "light" | "system";

const systemPrefersDark = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia &&
  window.matchMedia("(prefers-color-scheme: dark)").matches;

const normalizeMode = (value: unknown): ThemeMode | null =>
  value === "light" || value === "dark" || value === "system" ? value : null;

/**
 * PolicyPulse-style theme logic: explicit Dark/Light/System preference with a
 * resolved theme, persisted locally + remotely, live system-preference
 * tracking while in System mode, and cross-tab sync via storage events.
 */
export function useThemeController() {
  const [themeMode, setMode] = useState<ThemeMode>(() => {
    try {
      const cached = window.localStorage?.getItem(THEME_KEY);
      return normalizeMode(cached) ?? "dark";
    } catch {
      return "dark";
    }
  });
  const [systemDark, setSystemDark] = useState<boolean>(() => systemPrefersDark());

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => setSystemDark(mql.matches);
    apply();
    if (mql.addEventListener) mql.addEventListener("change", apply);
    else mql.addListener(apply);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", apply);
      else mql.removeListener(apply);
    };
  }, []);

  useEffect(() => {
    async function loadTheme() {
      const t = await storageModel.get(THEME_KEY);
      const persisted = normalizeMode(t);
      if (persisted) setMode((prev) => (prev === persisted ? prev : persisted));
    }
    loadTheme();
  }, []);

  // Cross-tab sync: another tab persisting a new theme adopts it here too.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_KEY) return;
      const next = normalizeMode(e.newValue);
      if (next) setMode((prev) => (prev === next ? prev : next));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const resolvedTheme: "dark" | "light" = themeMode === "system" ? (systemDark ? "dark" : "light") : themeMode;

  useLayoutEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const isLight = resolvedTheme === "light";

    root.classList.add("qb-theme-switching");
    root.classList.toggle("light", isLight);
    root.setAttribute("data-theme", resolvedTheme);
    if (body) {
      body.classList.toggle("light", isLight);
      body.setAttribute("data-theme", resolvedTheme);
    }

    // Force synchronous style/layout flush while transitions are disabled
    void root.offsetHeight;

    const rafId = window.requestAnimationFrame(() => {
      root.classList.remove("qb-theme-switching");
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      root.classList.remove("qb-theme-switching");
    };
  }, [resolvedTheme]);

  const persistTheme = async (mode: ThemeMode) => {
    try {
      window.localStorage?.setItem(THEME_KEY, mode);
    } catch {
      // Ignore storage write errors
    }
    await storageModel.set(THEME_KEY, mode);
  };

  async function toggleTheme() {
    const next: ThemeMode = resolvedTheme === "dark" ? "light" : "dark";
    document.documentElement.classList.add("qb-theme-switching");
    setMode(next);
    await persistTheme(next);
  }

  async function setThemeMode(mode: ThemeMode) {
    if (mode === themeMode) return;
    document.documentElement.classList.add("qb-theme-switching");
    setMode(mode);
    await persistTheme(mode);
  }

  return { theme: resolvedTheme, themeMode, setThemeMode, toggleTheme, isDark: resolvedTheme === "dark" };
}
