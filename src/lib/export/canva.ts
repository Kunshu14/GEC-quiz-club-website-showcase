import type { ExportQuizData } from "./pptx";

function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  // Always wrap in quotes and escape internal double quotes by doubling them
  return `"${str.replace(/"/g, '""')}"`;
}

export interface CanvaExportOptions {
  includeSafetySlide?: boolean;
  safetyImageUrl?: string | null;
}

/**
 * Generates a Canva Bulk Create CSV string.
 * Canva Bulk Create connects data columns directly to text/image elements in any Canva template.
 */
export function generateCanvaCsv(
  quiz: ExportQuizData,
  options: CanvaExportOptions = {},
): string {
  const { safetyImageUrl = "" } = options;

  const headers = [
    "Question_Number",
    "Round",
    "Difficulty",
    "Category",
    "Question_Text",
    "Answer_Text",
    "Notes",
    "Safety_Slide_Image",
    "Question_Media_URL",
    "Answer_Media_URL",
  ];

  const rows: string[] = [headers.join(",")];

  for (const log of quiz.usageLogs) {
    const q = log.question;
    const round = log.roundName?.trim() || "";
    const category = q.categories.map((c) => c.name).join(", ");
    const qMedia = q.media.find((m) => m.role === "QUESTION")?.url || "";
    const aMedia = q.media.find((m) => m.role === "ANSWER")?.url || "";

    const row = [
      escapeCsvField(log.orderIndex),
      escapeCsvField(round),
      escapeCsvField(q.difficulty),
      escapeCsvField(category),
      escapeCsvField(q.text),
      escapeCsvField(q.answerText),
      escapeCsvField(q.notes || ""),
      escapeCsvField(safetyImageUrl || ""),
      escapeCsvField(qMedia),
      escapeCsvField(aMedia),
    ];

    rows.push(row.join(","));
  }

  return rows.join("\r\n");
}
