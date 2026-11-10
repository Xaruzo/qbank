import { useState, useEffect } from "react";
import type { AppSettings } from "../types";

export const SETTINGS_STORAGE_KEY = "cse-qbank-app-settings-v1";

export const DEFAULT_SETTINGS: AppSettings = {
  liteMode: false,
  animationsEnabled: true,
  performanceTier: "high",
  examTarget: "professional",
  targetExamDate: "2026-08-09",
  dailyStudyGoal: 25,
  soundEffects: true,
  hapticFeedback: true,
};

const readStoredSettings = (): AppSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    const performanceTier =
      parsed.performanceTier ||
      (parsed.liteMode ? "lite" : parsed.animationsEnabled === false ? "lite" : "high");
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      performanceTier,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export function useSettingsController() {
  const [settings, setSettings] = useState<AppSettings>(() => readStoredSettings());

  // Apply LITE / Power Saver class to document
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (settings.liteMode) {
      root.classList.add("qb-lite-mode");
      body.classList.add("qb-lite-mode");
    } else {
      root.classList.remove("qb-lite-mode");
      body.classList.remove("qb-lite-mode");
    }

    if (!settings.animationsEnabled) {
      root.classList.add("qb-no-animations");
      body.classList.add("qb-no-animations");
    } else {
      root.classList.remove("qb-no-animations");
      body.classList.remove("qb-no-animations");
    }
  }, [settings.liteMode, settings.animationsEnabled]);

  const updateSettings = (partial: Partial<AppSettings>) => {
    let resolved = { ...partial };
    if (partial.performanceTier) {
      if (partial.performanceTier === "high") {
        resolved.liteMode = false;
        resolved.animationsEnabled = true;
      } else if (partial.performanceTier === "lite") {
        resolved.liteMode = true;
        resolved.animationsEnabled = false;
      } else if (partial.performanceTier === "auto") {
        const prefersReduced =
          typeof window !== "undefined" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4;
        const mem =
          typeof navigator !== "undefined" && "deviceMemory" in navigator
            ? (navigator as any).deviceMemory || 4
            : 4;
        const isBudget = prefersReduced || (cores < 4 && mem < 4);
        resolved.liteMode = isBudget;
        resolved.animationsEnabled = !isBudget;
      }
    }

    setSettings((prev) => {
      const next = { ...prev, ...resolved };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
      } catch (err) {
        console.warn("Failed to persist app settings:", err);
      }
      return next;
    });
  };

  const toggleLiteMode = () => {
    updateSettings({ liteMode: !settings.liteMode });
  };

  const toggleAnimations = () => {
    updateSettings({ animationsEnabled: !settings.animationsEnabled });
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    } catch {}
  };

  return {
    settings,
    updateSettings,
    toggleLiteMode,
    toggleAnimations,
    resetSettings,
  };
}
