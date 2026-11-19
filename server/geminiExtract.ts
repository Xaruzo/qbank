import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import {
  normalizeExtractedQuestion,
  type ExtractedQuestionPayload,
} from "../src/utils/questionImageImport";

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = (process.env.GEMINI_API_KEY || "")
    .trim()
    .replace(/^["']|["']$/g, "");
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function normalizeMimeType(rawMime: unknown): string {
  const clean = String(rawMime ?? "").trim().toLowerCase();
  if (clean === "image/jpg") return "image/jpeg";
  return ALLOWED_MIME_TYPES.has(clean) ? clean : "image/png";
}

function stripDataUrlPrefix(rawBase64: unknown): { base64: string; detectedMime?: string } {
  const str = String(rawBase64 ?? "").trim();
  const match = str.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s);
  if (match) {
    return {
      detectedMime: normalizeMimeType(match[1]),
      base64: match[2].replace(/\s+/g, ""),
    };
  }
  return { base64: str.replace(/\s+/g, "") };
}

function isRetryableError(err: any): boolean {
  const status = Number(err?.status ?? err?.statusCode ?? err?.code);
  const msg = String(err?.message || "").toLowerCase();
  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
    return true;
  }
  return (
    msg.includes("temporarily unavailable") ||
    msg.includes("rate limit") ||
    msg.includes("timeout") ||
    msg.includes("econnreset") ||
    msg.includes("fetch failed")
  );
}

function extractReadableErrorMessage(err: any): string {
  const raw = String(err?.message || "").trim();
  if (!raw) return "";
  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw);
      const msg = parsed?.error?.message || parsed?.message;
      if (typeof msg === "string" && msg.trim()) return msg.trim();
    } catch {
      // ignore JSON parse failure
    }
  }
  return raw;
}

function formatGeminiApiError(err: any): { statusCode: number; message: string } {
  const status = Number(err?.status ?? err?.statusCode);
  const rawMessage = extractReadableErrorMessage(err);
  const lower = rawMessage.toLowerCase();

  console.warn(
    `[Gemini Extract Warning] status=${Number.isFinite(status) ? status : "unknown"} message=${rawMessage || String(err || "Unknown error")}`
  );

  if (
    (status === 400 || status === 401) &&
    (lower.includes("api_key_invalid") ||
      lower.includes("api key not valid") ||
      lower.includes("invalid api key"))
  ) {
    return {
      statusCode: 500,
      message: `Gemini API key is invalid or unauthorized (${rawMessage}). Please check GEMINI_API_KEY in Settings > Secrets.`,
    };
  }
  if (status === 403 || lower.includes("permission_denied")) {
    return {
      statusCode: 500,
      message: `Gemini API permission denied (${rawMessage || "forbidden"}). Please verify GEMINI_API_KEY in Settings > Secrets.`,
    };
  }
  if (status === 429 || lower.includes("resource_exhausted")) {
    return {
      statusCode: 429,
      message: "Gemini API quota limit reached. Please wait a moment and try again, or check your billing/key settings in Settings > Secrets.",
    };
  }
  if (status === 404 || lower.includes("not_found")) {
    return {
      statusCode: 500,
      message: `Configured Gemini model is unavailable (${rawMessage || "not found"}).`,
    };
  }
  return {
    statusCode: status >= 400 && status < 500 ? status : 500,
    message: rawMessage || "Failed to extract question from image.",
  };
}

export interface ExtractQuestionInput {
  imageBase64: string;
  mimeType?: string;
  includeSolution?: boolean;
}

export async function extractQuestionFromImage(
  input: ExtractQuestionInput
): Promise<ExtractedQuestionPayload> {
  const ai = getGeminiClient();
  if (!ai) {
    const err = new Error(
      "Gemini API key is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets."
    ) as Error & { statusCode?: number };
    err.statusCode = 500;
    throw err;
  }

  const { base64, detectedMime } = stripDataUrlPrefix(input.imageBase64);
  if (!base64 || base64.length < 32) {
    const err = new Error("Please upload a valid image file.") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }
  if (base64.length > 16 * 1024 * 1024) {
    const err = new Error("Image payload is too large. Please use an image under 10MB.") as Error & { statusCode?: number };
    err.statusCode = 413;
    throw err;
  }

  const mimeType = detectedMime || normalizeMimeType(input.mimeType);
  const includeSolution = input.includeSolution !== false;

  const systemInstruction = [
    "You are an expert Philippine Civil Service Exam (CSE) question transcriber and solver.",
    "Given an image (such as a reviewer graphic, exam screenshot, worksheet, or textbook photo), extract the multiple-choice question cleanly into structured JSON.",
    "Rules:",
    "1. question: Extract the exact question stem cleanly. Do NOT include decorative headers/banners like 'CIVIL SERVICE EXAM REVIEW', page numbers, or watermarks. If the question depends on a table/chart/equation inside the image, include all necessary numbers/details cleanly in text.",
    "2. choices: Extract all answer choices in order (up to 5 choices A through E). Strip choice letter prefixes like 'A.', 'B)', '(C)', 'D:' so only the option text remains.",
    "3. topic: Pick the single best CSE category ID from strictly: 'numerical', 'verbal', 'general', 'analytical', 'clerical'. Use visual subject headers (e.g. 'Numerical Ability' -> 'numerical') or content to classify.",
    "4. label: Extract the short sub-topic/problem tag if shown or obvious (e.g. 'Ratio Problem', 'Age Problem', 'Percentage', 'Number Series', 'Vocabulary', 'Alphabetical Filing', 'Government Term'), or '' if unclear.",
    includeSolution
      ? "5. correctIndex & solution: Carefully solve the question step by step, verify your final result against the extracted choices, set correctIndex to the 0-based index (0=A, 1=B, 2=C, 3=D, 4=E) of the matching option, and write a clear, concise step-by-step solution ending with 'Answer: <LETTER>. <OPTION_TEXT>'. Use clean symbols (÷, ×, −, =, %)."
      : "5. correctIndex & solution: The user chose NOT to auto-generate a solution. Set solution to '' (empty string). Set correctIndex to -1 unless the uploaded image explicitly highlights, circles, or marks the answer key.",
    "If the image does not contain a readable question, return empty question and empty choices.",
  ].join("\n");

  const promptText = includeSolution
    ? "Extract the question, choices, topic, and label from this image, then solve it to fill correctIndex and a step-by-step solution."
    : "Extract only the question, choices, topic, and label from this image (do not generate a solution).";

  const imagePart = {
    inlineData: {
      mimeType,
      data: base64,
    },
  };
  const textPart = { text: promptText };

  let lastErr: any = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: { parts: [imagePart, textPart] },
        config: {
          systemInstruction,
          thinkingConfig: {
            thinkingLevel: includeSolution ? ThinkingLevel.HIGH : ThinkingLevel.LOW,
          },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              question: {
                type: Type.STRING,
                description: "Extracted question stem without decorative headers.",
              },
              choices: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Extracted answer choices in order without A./B./C. prefixes.",
              },
              topic: {
                type: Type.STRING,
                description: "One of: numerical, verbal, general, analytical, clerical.",
              },
              label: {
                type: Type.STRING,
                description: "Short problem type label, or empty string.",
              },
              correctIndex: {
                type: Type.INTEGER,
                description: "0-based index of correct choice (0..4), or -1 if unknown.",
              },
              solution: {
                type: Type.STRING,
                description: "Step-by-step explanation if requested, otherwise empty string.",
              },
            },
            required: ["question", "choices", "topic", "label", "correctIndex", "solution"],
          },
        },
      });

      const rawText = (response.text ?? "{}").trim();
      const parsed = JSON.parse(rawText);
      const normalized = normalizeExtractedQuestion(parsed, includeSolution);

      if (!normalized.question && normalized.choices.every((c) => !c)) {
        const err = new Error(
          "No readable question or answer choices were detected in that image. Try a clearer screenshot."
        ) as Error & { statusCode?: number };
        err.statusCode = 422;
        throw err;
      }

      return normalized;
    } catch (err: any) {
      lastErr = err;
      if (err?.statusCode === 422 || err?.statusCode === 400) {
        throw err;
      }
      if (attempt < 2 && isRetryableError(err)) {
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
        continue;
      }
      break;
    }
  }

  const formatted = formatGeminiApiError(lastErr);
  const error = new Error(formatted.message) as Error & { statusCode?: number };
  error.statusCode = formatted.statusCode;
  throw error;
}
