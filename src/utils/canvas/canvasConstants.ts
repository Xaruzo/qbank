export interface FontOption {
  name: string;
  value: string;
}

export interface PaletteColor {
  name: string;
  value: string;
}

export interface StickyPreset {
  label: string;
  bg: string;
  text: string;
}

export interface CalloutPreset {
  id: string;
  label: string;
  defaultText: string;
  bg: string;
  border: string;
  text: string;
}

export interface MathSymbol {
  sym: string;
  title: string;
}

export const CANVA_FONTS: FontOption[] = [
  { name: "Modern", value: "DM Sans, sans-serif" },
  { name: "Serif", value: "Georgia, serif" },
  { name: "Math", value: "JetBrains Mono, monospace" },
  { name: "Hand", value: "Caveat, Comic Sans MS, cursive" },
];

export const FILL_PALETTE: PaletteColor[] = [
  { name: "Transparent", value: "transparent" },
  { name: "White", value: "#ffffff" },
  { name: "Dark", value: "#1a2540" },
  { name: "Yellow", value: "#fef08a" },
  { name: "Blue", value: "#bfdbfe" },
  { name: "Green", value: "#bbf7d0" },
  { name: "Pink", value: "#fbcfe8" },
  { name: "Peach", value: "#fed7aa" },
  { name: "Purple", value: "#e9d5ff" },
  { name: "Solid Red", value: "#ef4444" },
  { name: "Solid Blue", value: "#3b82f6" },
  { name: "Solid Green", value: "#10b981" },
  { name: "Solid Amber", value: "#f59e0b" },
];

export const STICKY_PRESETS: StickyPreset[] = [
  { label: "Yellow Note", bg: "#fef08a", text: "#713f12" },
  { label: "Green Note", bg: "#bbf7d0", text: "#14532d" },
  { label: "Blue Note", bg: "#bfdbfe", text: "#1e3a8a" },
  { label: "Pink Note", bg: "#fbcfe8", text: "#831843" },
  { label: "Peach Note", bg: "#fed7aa", text: "#7c2d12" },
];

export const CALLOUT_PRESETS: CalloutPreset[] = [
  {
    id: "final",
    label: "Final Answer Box",
    defaultText: "∴ Final Answer: ",
    bg: "#dcfce7",
    border: "#16a34a",
    text: "#14532d",
  },
  {
    id: "formula",
    label: "Formula / Shortcut",
    defaultText: "Shortcut / Formula:\n",
    bg: "#fef3c7",
    border: "#d97706",
    text: "#78350f",
  },
  {
    id: "trap",
    label: "Common Exam Trap",
    defaultText: "Watch Out:\n",
    bg: "#fee2e2",
    border: "#dc2626",
    text: "#7f1d1d",
  },
];

export const EXTRA_MATH_SYMBOLS: MathSymbol[] = [
  { sym: "≠", title: "Not Equal" },
  { sym: "≈", title: "Approximately Equal" },
  { sym: "≤", title: "Less Than or Equal" },
  { sym: "≥", title: "Greater Than or Equal" },
  { sym: "±", title: "Plus or Minus" },
  { sym: "%", title: "Percent" },
  { sym: "√", title: "Square Root" },
  { sym: "π", title: "Pi" },
  { sym: "∴", title: "Therefore" },
  { sym: "∵", title: "Because" },
  { sym: "°", title: "Degree" },
  { sym: "x²", title: "Squared" },
  { sym: "x³", title: "Cubed" },
  { sym: "½", title: "One Half" },
  { sym: "¼", title: "One Quarter" },
  { sym: "¾", title: "Three Quarters" },
  { sym: "₱", title: "Peso" },
  { sym: ":", title: "Ratio" },
];

export const STEP_CIRCLES: string[] = [
  "①",
  "②",
  "③",
  "④",
  "⑤",
  "⑥",
  "⑦",
  "⑧",
  "⑨",
  "⑩",
  "⑪",
  "⑫",
];
