import { useState, useEffect } from "react";
import { THEME_KEY } from "../constants/appConstants";
import { storageModel } from "../models/storageModel";

export function useThemeController() {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    async function loadTheme() {
      const t = await storageModel.get(THEME_KEY);
      if (t) setTheme(t);
    }
    loadTheme();
  }, []);

  async function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    await storageModel.set(THEME_KEY, next);
  }

  return { theme, toggleTheme, isDark: theme === "dark" };
}
