const SUPER = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const SUB = "₀₁₂₃₄₅₆₇₈₉";
const VULGAR = "½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞";

const SUPER_MAP = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9" };
const SUB_MAP = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9" };

function decodeSuper(str) {
  return [...str].map((c) => SUPER_MAP[c] ?? c).join("");
}

function decodeSub(str) {
  return [...str].map((c) => SUB_MAP[c] ?? c).join("");
}

function decodeMixed(str) {
  return [...str].map((c) => SUPER_MAP[c] ?? SUB_MAP[c] ?? c).join("");
}

const FRACTION_RE = new RegExp(
  `\\(([^)]*)\\)\\s*/\\s*\\(([^)]*)\\)|` +
    `([${SUPER}]+)\\/([${SUB}\\d]+)|` +
    `(\\d+)\\/([${SUB}]+)|` +
    `(\\d+)\\s*/\\s*(\\d+)|` +
    `([${VULGAR}])`,
  "g"
);

export function parseMathText(text) {
  if (!text) return [{ type: "text", value: "" }];

  const parts = [];
  let last = 0;
  let match;

  while ((match = FRACTION_RE.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ type: "text", value: text.slice(last, match.index) });
    }

    if (match[1] !== undefined) {
      parts.push({ type: "frac", num: match[1].trim(), den: match[2].trim() });
    } else if (match[3] !== undefined) {
      parts.push({ type: "frac", num: decodeSuper(match[3]), den: decodeMixed(match[4]) });
    } else if (match[5] !== undefined) {
      parts.push({ type: "frac", num: match[5], den: decodeSub(match[6]) });
    } else if (match[7] !== undefined) {
      parts.push({ type: "frac", num: match[7], den: match[8] });
    } else if (match[9] !== undefined) {
      parts.push({ type: "vulgar", value: match[9] });
    }

    last = match.index + match[0].length;
  }

  if (last < text.length) {
    parts.push({ type: "text", value: text.slice(last) });
  }

  if (parts.length === 0) {
    parts.push({ type: "text", value: text });
  }

  return parts;
}
