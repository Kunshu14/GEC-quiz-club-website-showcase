import { parseDelimitedText } from "./googleFormImport";

export interface ParsedLegacyQuestion {
  rowIndex: number;
  text: string;
  answerText: string;
  categoryName: string;
  subGenre?: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  usedBefore?: string;
  submitter?: string;
  mediaUrl?: string;
  notes?: string;
  isValid: boolean;
  validationError?: string;
}

export interface LegacyParseResult {
  headers: string[];
  detectedColumns: {
    question?: string;
    answer?: string;
    category?: string;
    subGenre?: string;
    difficulty?: string;
    usedBefore?: string;
    submitter?: string;
    mediaUrl?: string;
    notes?: string;
  };
  rows: ParsedLegacyQuestion[];
  totalValid: number;
  warnings: string[];
  errors: string[];
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseDifficulty(raw?: string): "EASY" | "MEDIUM" | "HARD" {
  if (!raw) return "MEDIUM";
  const lower = raw.trim().toLowerCase();
  if (lower.includes("easy") || lower === "e" || lower === "1") return "EASY";
  if (lower.includes("hard") || lower === "h" || lower === "3" || lower.includes("diff")) return "HARD";
  return "MEDIUM";
}

/**
 * Parses raw CSV or TSV spreadsheet content into structured question records.
 */
export function parseLegacySpreadsheet(rawText: string): LegacyParseResult {
  const rows = parseDelimitedText(rawText);
  if (rows.length === 0) {
    return {
      headers: [],
      detectedColumns: {},
      rows: [],
      totalValid: 0,
      warnings: [],
      errors: ["The input text is empty or could not be parsed."],
    };
  }

  const rawHeaders = rows[0];
  const colMap: Record<string, number> = {};
  const detectedColumns: LegacyParseResult["detectedColumns"] = {};

  rawHeaders.forEach((h, idx) => {
    const norm = normalizeHeader(h);

    if (!colMap["question"] && (norm.includes("question") || norm === "q" || norm.includes("prompt") || norm.includes("clue"))) {
      colMap["question"] = idx;
      detectedColumns.question = h;
    } else if (!colMap["answer"] && (norm.includes("answer") || norm === "a" || norm.includes("ans"))) {
      colMap["answer"] = idx;
      detectedColumns.answer = h;
    } else if (!colMap["category"] && (norm.includes("category") || norm.includes("genre") || norm.includes("topic") || norm === "cat")) {
      colMap["category"] = idx;
      detectedColumns.category = h;
    } else if (!colMap["subGenre"] && (norm.includes("subgenre") || norm.includes("subtopic") || norm.includes("subgenre"))) {
      colMap["subGenre"] = idx;
      detectedColumns.subGenre = h;
    } else if (!colMap["difficulty"] && (norm.includes("diff") || norm.includes("level"))) {
      colMap["difficulty"] = idx;
      detectedColumns.difficulty = h;
    } else if (!colMap["usedBefore"] && (norm.includes("used") || norm.includes("previous") || norm.includes("history"))) {
      colMap["usedBefore"] = idx;
      detectedColumns.usedBefore = h;
    } else if (!colMap["submitter"] && (norm.includes("submitter") || norm.includes("author") || norm.includes("writer") || norm.includes("contributor") || norm.includes("by"))) {
      colMap["submitter"] = idx;
      detectedColumns.submitter = h;
    } else if (!colMap["mediaUrl"] && (norm.includes("media") || norm.includes("image") || norm.includes("drive") || norm.includes("url") || norm.includes("audio") || norm.includes("video") || norm.includes("link"))) {
      colMap["mediaUrl"] = idx;
      detectedColumns.mediaUrl = h;
    } else if (!colMap["notes"] && (norm.includes("note") || norm.includes("explanation") || norm.includes("source") || norm.includes("trivia"))) {
      colMap["notes"] = idx;
      detectedColumns.notes = h;
    }
  });

  const warnings: string[] = [];
  const errors: string[] = [];

  if (colMap["question"] === undefined) {
    errors.push("Missing required 'Question' column header.");
  }
  if (colMap["answer"] === undefined) {
    errors.push("Missing required 'Answer' column header.");
  }

  if (errors.length > 0) {
    return {
      headers: rawHeaders,
      detectedColumns,
      rows: [],
      totalValid: 0,
      warnings,
      errors,
    };
  }

  const parsedRows: ParsedLegacyQuestion[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    // Skip entirely empty rows
    if (r.every((cell) => !cell.trim())) continue;

    const questionText = (r[colMap["question"]] ?? "").trim();
    const answerText = (r[colMap["answer"]] ?? "").trim();
    const categoryName = colMap["category"] !== undefined ? (r[colMap["category"]] ?? "").trim() : "General";
    const subGenre = colMap["subGenre"] !== undefined ? (r[colMap["subGenre"]] ?? "").trim() : undefined;
    const diffRaw = colMap["difficulty"] !== undefined ? r[colMap["difficulty"]] : undefined;
    const usedRaw = colMap["usedBefore"] !== undefined ? (r[colMap["usedBefore"]] ?? "").trim() : undefined;
    const submitter = colMap["submitter"] !== undefined ? (r[colMap["submitter"]] ?? "").trim() : undefined;
    const mediaUrl = colMap["mediaUrl"] !== undefined ? (r[colMap["mediaUrl"]] ?? "").trim() : undefined;
    const notes = colMap["notes"] !== undefined ? (r[colMap["notes"]] ?? "").trim() : undefined;

    let isValid = true;
    let validationError: string | undefined;

    if (!questionText) {
      isValid = false;
      validationError = "Question text is empty.";
    } else if (!answerText) {
      isValid = false;
      validationError = "Answer text is empty.";
    }

    parsedRows.push({
      rowIndex: i + 1,
      text: questionText,
      answerText,
      categoryName: categoryName || "General",
      subGenre: subGenre || undefined,
      difficulty: parseDifficulty(diffRaw),
      usedBefore: usedRaw || undefined,
      submitter: submitter || undefined,
      mediaUrl: mediaUrl || undefined,
      notes: notes || undefined,
      isValid,
      validationError,
    });
  }

  const totalValid = parsedRows.filter((r) => r.isValid).length;

  if (colMap["category"] === undefined) {
    warnings.push("No Category column detected — questions will default to 'General' or the first available category.");
  }
  if (colMap["mediaUrl"] === undefined) {
    warnings.push("No Media URL column detected — questions will be imported as text-only.");
  }

  return {
    headers: rawHeaders,
    detectedColumns,
    rows: parsedRows,
    totalValid,
    warnings,
    errors,
  };
}
