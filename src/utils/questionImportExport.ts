import { TOPICS } from "../constants/appConstants";
import type { Question, TopicId } from "../types";

export interface ImportedQuestionDraft {
  topic: TopicId;
  label: string;
  question: string;
  choices: string[];
  correct: number;
  solution: string;
}

export interface ImportParseResult {
  valid: ImportedQuestionDraft[];
  duplicateCount: number;
  totalParsed: number;
  errors: string[];
}

const VALID_TOPICS = new Set<string>(TOPICS.map((t) => t.id));

const TOPIC_ALIASES: Record<string, TopicId> = {
  "numerical": "numerical",
  "numerical ability": "numerical",
  "numerical reasoning": "numerical",
  "math": "numerical",
  "mathematics": "numerical",
  "verbal": "verbal",
  "verbal ability": "verbal",
  "verbal reasoning": "verbal",
  "english": "verbal",
  "general": "general",
  "general information": "general",
  "gen info": "general",
  "gen. info": "general",
  "analytical": "analytical",
  "analytical ability": "analytical",
  "logic": "analytical",
  "clerical": "clerical",
  "clerical ability": "clerical",
  "clerical operations": "clerical",
};

const resolveTopicId = (raw: unknown): TopicId | null => {
  if (typeof raw !== "string") return null;
  const clean = raw.trim().toLowerCase();
  if (!clean) return null;
  if (VALID_TOPICS.has(clean)) return clean as TopicId;
  if (TOPIC_ALIASES[clean]) return TOPIC_ALIASES[clean];
  const byLabel = TOPICS.find(
    (t) =>
      t.label.toLowerCase() === clean ||
      (t.short && t.short.toLowerCase() === clean)
  );
  return byLabel ? byLabel.id : null;
};

const parseCorrectIndex = (raw: unknown, choicesCount: number): number | null => {
  if (typeof raw === "number" && Number.isInteger(raw)) {
    return raw >= 0 && raw < choicesCount ? raw : null;
  }
  if (typeof raw === "string") {
    const clean = raw.trim().toUpperCase();
    if (!clean) return null;
    if (/^[A-E]$/.test(clean)) {
      const idx = clean.charCodeAt(0) - 65;
      return idx >= 0 && idx < choicesCount ? idx : null;
    }
    if (/^\d+$/.test(clean)) {
      const idx = Number(clean);
      return idx >= 0 && idx < choicesCount ? idx : null;
    }
  }
  return null;
};

const normalizeQuestionSignature = (text: string) =>
  text.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * RFC-4180 compliant CSV parser supporting quoted fields, escaped quotes (""),
 * and multi-line values inside quotes.
 */
export const parseCsvRows = (csvText: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  const text = csvText.replace(/^\uFEFF/, "");

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\r") {
      if (text[i + 1] === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((r) => r.some((c) => c.trim().length > 0));
};

const validateQuestionEntry = (
  entry: Record<string, any>,
  rowLabel: string,
  seenSignatures: Set<string>,
  errors: string[]
): { draft: ImportedQuestionDraft | null; isDuplicate: boolean } => {
  const topic = resolveTopicId(entry.topic);
  if (!topic) {
    errors.push(`${rowLabel}: Invalid or missing topic "${String(entry.topic || "")}".`);
    return { draft: null, isDuplicate: false };
  }

  const questionText = typeof entry.question === "string" ? entry.question.trim() : "";
  if (!questionText) {
    errors.push(`${rowLabel}: Question prompt is required.`);
    return { draft: null, isDuplicate: false };
  }

  let choices: string[] = [];
  if (Array.isArray(entry.choices)) {
    choices = entry.choices
      .map((c) => (typeof c === "string" ? c.trim() : ""))
      .filter((c) => c.length > 0);
  } else {
    choices = [
      entry.choiceA ?? entry.choicea ?? entry.a,
      entry.choiceB ?? entry.choiceb ?? entry.b,
      entry.choiceC ?? entry.choicec ?? entry.c,
      entry.choiceD ?? entry.choiced ?? entry.d,
      entry.choiceE ?? entry.choicee ?? entry.e,
    ]
      .map((c) => (typeof c === "string" ? c.trim() : ""))
      .filter((c) => c.length > 0);
  }

  if (choices.length < 4 || choices.length > 5) {
    errors.push(`${rowLabel}: Expected 4 or 5 non-empty choices (found ${choices.length}).`);
    return { draft: null, isDuplicate: false };
  }

  const correct = parseCorrectIndex(entry.correct, choices.length);
  if (correct === null) {
    errors.push(`${rowLabel}: Invalid correct answer "${String(entry.correct ?? "")}". Use A-E or 0-${choices.length - 1}.`);
    return { draft: null, isDuplicate: false };
  }

  const signature = normalizeQuestionSignature(questionText);
  if (seenSignatures.has(signature)) {
    return { draft: null, isDuplicate: true };
  }
  seenSignatures.add(signature);

  return {
    draft: {
      topic,
      label: typeof entry.label === "string" ? entry.label.trim() : "",
      question: questionText,
      choices,
      correct,
      solution: typeof entry.solution === "string" ? entry.solution.trim() : "",
    },
    isDuplicate: false,
  };
};

export const parseImportedQuestions = (
  rawText: string,
  fileName: string,
  existingQuestions: Pick<Question, "question">[] = []
): ImportParseResult => {
  const seenSignatures = new Set<string>(
    (existingQuestions || [])
      .map((q) => (typeof q.question === "string" ? normalizeQuestionSignature(q.question) : ""))
      .filter(Boolean)
  );

  const valid: ImportedQuestionDraft[] = [];
  const errors: string[] = [];
  let duplicateCount = 0;
  let totalParsed = 0;

  const trimmed = (rawText || "").trim();
  const isJson = fileName.toLowerCase().endsWith(".json") || trimmed.startsWith("[") || trimmed.startsWith("{");

  if (isJson) {
    let parsed: any;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return {
        valid: [],
        duplicateCount: 0,
        totalParsed: 0,
        errors: ["Invalid JSON file syntax."],
      };
    }

    const list = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.questions)
        ? parsed.questions
        : null;

    if (!list) {
      return {
        valid: [],
        duplicateCount: 0,
        totalParsed: 0,
        errors: ["JSON must be an array of questions or an object containing a questions array."],
      };
    }

    totalParsed = list.length;
    list.forEach((item: any, idx: number) => {
      if (!item || typeof item !== "object") {
        errors.push(`Item #${idx + 1}: Expected a question object.`);
        return;
      }
      const res = validateQuestionEntry(item, `Item #${idx + 1}`, seenSignatures, errors);
      if (res.isDuplicate) duplicateCount += 1;
      else if (res.draft) valid.push(res.draft);
    });

    return { valid, duplicateCount, totalParsed, errors };
  }

  const rows = parseCsvRows(rawText);
  if (rows.length < 2) {
    return {
      valid: [],
      duplicateCount: 0,
      totalParsed: 0,
      errors: ["CSV file must contain a header row and at least one question row."],
    };
  }

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const dataRows = rows.slice(1);
  totalParsed = dataRows.length;

  dataRows.forEach((cells, idx) => {
    const record: Record<string, string> = {};
    headers.forEach((header, colIdx) => {
      record[header] = cells[colIdx] ?? "";
    });
    const res = validateQuestionEntry(record, `Row ${idx + 2}`, seenSignatures, errors);
    if (res.isDuplicate) duplicateCount += 1;
    else if (res.draft) valid.push(res.draft);
  });

  return { valid, duplicateCount, totalParsed, errors };
};

export const serializeQuestionsForExport = (questions: Question[]) =>
  questions.map((q) => ({
    id: q.id,
    topic: q.topic,
    label: q.label || "",
    question: q.question,
    choices: q.choices,
    correct: q.correct,
    solution: q.solution || "",
    ...(q.dateAdded ? { dateAdded: q.dateAdded } : {}),
  }));

export const exportQuestionsJson = (questions: Question[]): void => {
  const payload = serializeQuestionsForExport(questions);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `cse-qbank-questions-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
