import { PROBLEM_LABELS } from "../constants/appConstants";

export interface ExtractedQuestionPayload {
  question: string;
  choices: string[];
  topic: string;
  label: string;
  correctIndex: number | null;
  solution: string;
}

const VALID_TOPICS = new Set(["numerical", "verbal", "general", "analytical", "clerical"]);

/**
 * Strips choice prefixes like "A. ", "B) ", "(C) ", "D: ", "E - " while
 * preserving normal English words starting with A–E (e.g. "A government...").
 */
export function stripChoicePrefix(raw: unknown): string {
  const text = String(raw ?? "").trim();
  if (!text) return "";
  return text.replace(/^(?:\([A-Ea-e]\)\s*|[A-Ea-e](?:[.):]\s*|\s*[-–—]\s+))/, "").trim();
}

export function normalizeTopicId(rawTopic: unknown): string {
  const val = String(rawTopic ?? "").trim().toLowerCase();
  if (!val) return "numerical";
  if (VALID_TOPICS.has(val)) return val;

  // Check analytical synonyms before verbal so "Verbal Analogy" / "Word Analogy" maps to analytical.
  if (
    val.includes("analyt") ||
    val.includes("analog") ||
    val.includes("logic") ||
    val.includes("syllog") ||
    val.includes("series") ||
    val.includes("word assoc")
  ) {
    return "analytical";
  }
  if (val.includes("numer") || val.includes("math") || val.includes("quant") || val.includes("arith")) {
    return "numerical";
  }
  if (val.includes("verb") || val.includes("vocab") || val.includes("grammar") || val.includes("read") || val.includes("english")) {
    return "verbal";
  }
  if (val.includes("reason")) {
    return "analytical";
  }
  if (val.includes("cleric") || val.includes("filing") || val.includes("alphabet") || val.includes("spell")) {
    return "clerical";
  }
  if (val.includes("general") || val.includes("constitut") || val.includes("ra 6713") || val.includes("history") || val.includes("gov")) {
    return "general";
  }
  return "numerical";
}

export function normalizeProblemLabel(rawLabel: unknown): string {
  const clean = String(rawLabel ?? "").trim();
  if (!clean) return "";
  const exactPreset = PROBLEM_LABELS.find((p) => p.toLowerCase() === clean.toLowerCase());
  return exactPreset || clean;
}

function isWordAnalogyContent(question: string, choices: string[], label: string): boolean {
  if (/\banalog(?:y|ies)\b/i.test(label) || /\bword\s+association\b/i.test(label)) {
    return true;
  }

  const hasDoubleColonWordStem =
    /[A-Za-z][A-Za-z\s'-]*\s*:\s*(?:[A-Za-z][A-Za-z\s'-]*|_{2,})[\s\S]*::/.test(question) ||
    /::[\s\S]*[A-Za-z_][A-Za-z\s'_-]*\s*:\s*(?:[A-Za-z][A-Za-z\s'-]*|_{2,})/.test(question);

  if (hasDoubleColonWordStem) {
    return true;
  }

  const pairedWordChoices = choices.filter((c) =>
    /^[A-Za-z][A-Za-z\s'-]{0,35}\s*:\s*[A-Za-z_][A-Za-z\s'_-]{0,35}$/.test(c.trim())
  );
  if (pairedWordChoices.length >= 3) {
    return true;
  }

  return false;
}

export function normalizeExtractedQuestion(
  raw: any,
  includeSolution: boolean
): ExtractedQuestionPayload {
  const question = String(raw?.question ?? "").trim();

  const rawChoices = Array.isArray(raw?.choices) ? raw.choices : [];
  const cleanedChoices = rawChoices
    .map((c: unknown) => stripChoicePrefix(c))
    .slice(0, 5);

  while (cleanedChoices.length < 4) {
    cleanedChoices.push("");
  }

  // Drop a blank 5th slot if only 4 choices existed
  if (cleanedChoices.length === 5 && !cleanedChoices[4]) {
    cleanedChoices.pop();
  }

  const nonEmptyCount = cleanedChoices.filter((c) => c.length > 0).length;
  const rawIdx = typeof raw?.correctIndex === "number" && Number.isInteger(raw.correctIndex)
    ? raw.correctIndex
    : Number.isInteger(Number(raw?.correctIndex))
      ? Number(raw.correctIndex)
      : -1;

  const correctIndex =
    rawIdx >= 0 && rawIdx < cleanedChoices.length && rawIdx < nonEmptyCount
      ? rawIdx
      : null;

  const solution = includeSolution ? String(raw?.solution ?? "").trim() : "";

  let topic = normalizeTopicId(raw?.topic);
  let label = normalizeProblemLabel(raw?.label);

  // Under the Philippine Civil Service Exam, Word Analogy / Word Association / Syllogisms
  // belong to Analytical Ability rather than Verbal Ability.
  if (topic === "verbal") {
    if (isWordAnalogyContent(question, cleanedChoices, label)) {
      topic = "analytical";
      if (!label || /^(vocabulary|verbal)$/i.test(label)) {
        label = "Word Analogy";
      }
    } else if (/\b(?:syllogism|logical\s+reasoning|assumptions?\s+and\s+conclusions?)\b/i.test(label)) {
      topic = "analytical";
    }
  }

  return {
    question,
    choices: cleanedChoices,
    topic,
    label,
    correctIndex,
    solution,
  };
}

export async function fileToImagePayload(
  file: File
): Promise<{ base64: string; mimeType: string; previewUrl: string }> {
  const readAsDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Could not read the selected image file."));
      reader.readAsDataURL(blob);
    });

  const dataUrl = await readAsDataUrl(file);
  const rawMime = file.type === "image/jpg" ? "image/jpeg" : (file.type || "image/png");

  // Compress screenshots and large photos above 350KB or 1400px down to crisp JPEG
  // so uploads and multimodal vision tokenization stay fast.
  if (rawMime !== "image/gif") {
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new window.Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("Image decode failed"));
        el.src = dataUrl;
      });
      const maxDim = 1400;
      const largestSide = Math.max(img.width || 1, img.height || 1);
      const shouldOptimize = file.size > 350 * 1024 || largestSide > maxDim;

      if (shouldOptimize) {
        const scale = Math.min(1, maxDim / largestSide);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Fill white behind transparent PNGs before converting to JPEG
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressedUrl = canvas.toDataURL("image/jpeg", 0.86);
          const commaIdx = compressedUrl.indexOf(",");
          return {
            base64: commaIdx >= 0 ? compressedUrl.slice(commaIdx + 1) : compressedUrl,
            mimeType: "image/jpeg",
            previewUrl: compressedUrl,
          };
        }
      }
    } catch {
      // Fallback to original dataUrl if canvas resize fails
    }
  }

  const commaIdx = dataUrl.indexOf(",");
  return {
    base64: commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl,
    mimeType: rawMime,
    previewUrl: dataUrl,
  };
}
