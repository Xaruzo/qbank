import { useState, useEffect } from "react";
import type { AppSettings } from "../types";

export const SETTINGS_STORAGE_KEY = "cse-qbank-app-settings-v1";

export const DEFAULT_SETTINGS: AppSettings = {
  liteMode: false,
  animationsEnabled: true,
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
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
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
    setSettings((prev) => {
      const next = { ...prev, ...partial };
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
