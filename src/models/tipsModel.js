import { TIPS_KEY } from "../constants/appConstants";

const safeParse = (raw, fallback) => {
  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const readValue = async (key) => {
  if (window.storage && typeof window.storage.get === "function") {
    try {
      const result = await window.storage.get(key);
      return result?.value ?? null;
    } catch {}
  }
  return localStorage.getItem(key);
};

const writeValue = async (key, value) => {
  if (window.storage && typeof window.storage.set === "function") {
    try {
      await window.storage.set(key, value);
      return;
    } catch {}
  }
  localStorage.setItem(key, value);
};

export const tipsModel = {
  async getAll() {
    const raw = await readValue(TIPS_KEY);
    const map = safeParse(raw || "{}", {});
    return map && typeof map === "object" ? map : {};
  },

  async setTip(questionId, text) {
    if (!questionId) return;
    const map = await this.getAll();
    const normalized = typeof text === "string" ? text : "";
    const trimmed = normalized.trim();

    if (!trimmed) {
      if (map[questionId] !== undefined) {
        delete map[questionId];
        await writeValue(TIPS_KEY, JSON.stringify(map));
      }
      return;
    }

    if (map[questionId] === normalized) return;
    map[questionId] = normalized;
    await writeValue(TIPS_KEY, JSON.stringify(map));
  },

  async deleteTip(questionId) {
    if (!questionId) return;
    const map = await this.getAll();
    if (map[questionId] === undefined) return;
    delete map[questionId];
    await writeValue(TIPS_KEY, JSON.stringify(map));
  },
};

