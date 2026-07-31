const SHORTCUTS = [
  { key: "1/2 ", char: "½ " },
  { key: "1/3 ", char: "⅓ " },
  { key: "2/3 ", char: "⅔ " },
  { key: "1/4 ", char: "¼ " },
  { key: "3/4 ", char: "¾ " },
  { key: "+-", char: "±" },
  { key: "^0", char: "⁰" },
  { key: "^1", char: "¹" },
  { key: "^2", char: "²" },
  { key: "^3", char: "³" },
  { key: "^4", char: "⁴" },
  { key: "^5", char: "⁵" },
  { key: "^6", char: "⁶" },
  { key: "^7", char: "⁷" },
  { key: "^8", char: "⁸" },
  { key: "^9", char: "⁹" },
  { key: "^+", char: "⁺" },
  { key: "^-", char: "⁻" },
  { key: "^=", char: "⁼" },
  { key: "^(", char: "⁽" },
  { key: "^)", char: "⁾" },
  { key: "sqrt", char: "√" },
  { key: "deg", char: "°" },
  { key: "<=", char: "≤" },
  { key: ">=", char: "≥" },
  { key: "==", char: "≈" },
  { key: "!=", char: "≠" },
];

/**
 * Handles symbol shortcuts in an input/textarea.
 * Replaces patterns like "1/2 " with "½ ".
 * @param {HTMLInputElement|HTMLTextAreaElement} el 
 * @param {string} value 
 * @param {Function} onChange 
 */
export function handleSymbolShortcuts(el, value, onChange) {
  if (!el) return;
  const start = el.selectionStart;
  if (start === null) return;

  // We only check for shortcuts when the user types a character that might complete a shortcut
  // or after a space. To keep it simple, we'll check the text before the cursor.
  const textBefore = value.substring(0, start);
  
  for (const { key, char } of SHORTCUTS) {
    if (textBefore.endsWith(key)) {
      const newVal = value.substring(0, start - key.length) + char + value.substring(start);
      onChange(newVal);
      
      // Restore cursor position after state update
      setTimeout(() => {
        const nextPos = start - key.length + char.length;
        el.setSelectionRange(nextPos, nextPos);
      }, 0);
      
      return true; // Shortcut handled
    }
  }
  
  return false;
}
