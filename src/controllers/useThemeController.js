import { useState, useEffect, useLayoutEffect } from "react";
import { THEME_KEY } from "../constants/appConstants";
import { storageModel } from "../models/storageModel";

export function useThemeController() {
  const [theme, setTheme] = useState(() => {
    try {
      const cached = window.localStorage?.getItem(THEME_KEY);
      if (cached === "light" || cached === "dark") return cached;
    } catch {
      // Ignore storage read errors
    }
    return "dark";
  });

  useEffect(() => {
    async function loadTheme() {
      const t = await storageModel.get(THEME_KEY);
      if (t === "light" || t === "dark") setTheme(t);
    }
    loadTheme();
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add("qb-theme-switching");
    // Force synchronous style/layout flush while transitions are disabled
    void root.offsetHeight;

    const rafId = window.requestAnimationFrame(() => {
      root.classList.remove("qb-theme-switching");
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      root.classList.remove("qb-theme-switching");
    };
  }, [theme]);

  async function toggleTheme() {
    document.documentElement.classList.add("qb-theme-switching");
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    await storageModel.set(THEME_KEY, next);
  }

  return { theme, toggleTheme, isDark: theme === "dark" };
}

