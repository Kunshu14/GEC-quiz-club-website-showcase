"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  parseLegacySpreadsheet,
  type LegacyParseResult,
} from "@/lib/import/legacyImport";
import {
  Button,
  CardShell,
  FramedPanel,
  HighlighterMark,
  Tag,
  ZapIcon,
  UploadIcon,
  CheckCircleIcon,
} from "@/components/ui";

const SAMPLE_TEMPLATE = `Question\tAnswer\tCategory\tDifficulty\tSub-genre\tUsed Before\tOriginal Submitter\tMedia URL\tNotes
Which element has the highest electrical conductivity of all metals?\tSilver\tScience\tMedium\tChemistry\tAnnual Quiz 2023\tVikram Desai\thttps://example.com/silver.jpg\tOften confused with copper.
What is the traditional Japanese art of paper folding called?\tOrigami\tArts\tEasy\tCrafts\tFresher's Cup\tAnanya Rao\t\tLiterally means 'folding paper'.
In what year did the Apollo 11 mission successfully land humans on the Moon?\t1969\tHistory\tEasy\tSpace Exploration\tMELA Quiz\tRahul Naik\t\tJuly 20, 1969.`;

export function LegacyImportWorkspace() {
  const router = useRouter();
  const [rawText, setRawText] = useState("");
  const [parsed, setParsed] = useState<LegacyParseResult | null>(null);
  const [attributeMode, setAttributeMode] = useState<"LEGACY_BOT" | "CURRENT_USER">("LEGACY_BOT");
  const [defaultStatus, setDefaultStatus] = useState<"APPROVED" | "PENDING">("APPROVED");
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [importing, setImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    totalProcessed: number;
    importedClean: number;
    importedFlagged: number;
  } | null>(null);

  const handleTextChange = (text: string) => {
    setRawText(text);
    setErrorMessage(null);
    setImportResult(null);

    if (text.trim().length > 0) {
      const result = parseLegacySpreadsheet(text);
      setParsed(result);
    } else {
      setParsed(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      handleTextChange(text);
    };
    reader.readAsText(file);
  };

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(SAMPLE_TEMPLATE);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2000);
  };

  const handlePasteTemplate = () => {
    handleTextChange(SAMPLE_TEMPLATE);
  };

  const handleRunImport = async () => {
    if (!parsed || parsed.totalValid === 0) return;

    setImporting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/questions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText,
          defaultStatus,
          attributeMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process import.");
      }

      setImportResult({
        totalProcessed: data.totalProcessed,
        importedClean: data.importedClean,
        importedFlagged: data.importedFlagged,
      });
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred during import.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Import Settings Bar */}
      <CardShell tone="cream" className="p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="block font-body text-xs font-bold uppercase tracking-wider text-ink mb-2">
              Attribution for Imported Questions
            </label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 font-body text-sm cursor-pointer">
                <input
                  type="radio"
                  name="attributeMode"
                  value="LEGACY_BOT"
                  checked={attributeMode === "LEGACY_BOT"}
                  onChange={() => setAttributeMode("LEGACY_BOT")}
                  className="accent-ink"
                />
                <span>
                  <strong>Archive Account</strong> (&ldquo;Legacy Question Bank&rdquo;)
                </span>
              </label>
              <label className="flex items-center gap-2 font-body text-sm cursor-pointer">
                <input
                  type="radio"
                  name="attributeMode"
                  value="CURRENT_USER"
                  checked={attributeMode === "CURRENT_USER"}
                  onChange={() => setAttributeMode("CURRENT_USER")}
                  className="accent-ink"
                />
                <span>
                  <strong>My Account</strong> (attributed to your user profile)
                </span>
              </label>
            </div>
            <p className="mt-2 font-body text-xs text-ink/70">
              Original submitter names found in the spreadsheet will also be preserved in question notes.
            </p>
          </div>

          <div>
            <label className="block font-body text-xs font-bold uppercase tracking-wider text-ink mb-2">
              Default Question Review Status
            </label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 font-body text-sm cursor-pointer">
                <input
                  type="radio"
                  name="defaultStatus"
                  value="APPROVED"
                  checked={defaultStatus === "APPROVED"}
                  onChange={() => setDefaultStatus("APPROVED")}
                  className="accent-ink"
                />
                <span>
                  <strong>Approved</strong> (verified legacy questions ready for quiz running orders)
                </span>
              </label>
              <label className="flex items-center gap-2 font-body text-sm cursor-pointer">
                <input
                  type="radio"
                  name="defaultStatus"
                  value="PENDING"
                  checked={defaultStatus === "PENDING"}
                  onChange={() => setDefaultStatus("PENDING")}
                  className="accent-ink"
                />
                <span>
                  <strong>Pending</strong> (requires council re-verification)
                </span>
              </label>
            </div>
            <p className="mt-2 font-body text-xs text-ink/70 flex items-start gap-1.5">
              <ZapIcon size={13} className="text-yellow shrink-0 mt-0.5" />
              <span><em>Duplicate Protection:</em> Any question closely matching an existing question is automatically placed in the duplicate review queue, regardless of this setting.</span>
            </p>
          </div>
        </div>
      </CardShell>

      {/* Input Section */}
      <CardShell tone="cream" className="p-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label htmlFor="spreadsheet-input" className="font-heading text-lg text-ink">
            Paste Spreadsheet or Upload CSV/TSV
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="alt"
              onClick={handleCopyTemplate}
            >
              {copiedTemplate ? "Copied! ✓" : "Copy Template Columns"}
            </Button>
            <Button
              type="button"
              variant="alt"
              onClick={handlePasteTemplate}
            >
              Load Sample Data
            </Button>
            <label className="cursor-pointer border-[3px] border-ink bg-white px-3 py-1.5 font-body text-xs font-bold uppercase text-ink shadow-[2px_2px_0_var(--ink)] hover:bg-cream">
              Upload .CSV / .TSV
              <input
                type="file"
                accept=".csv,.tsv,.txt"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </div>

        <textarea
          id="spreadsheet-input"
          value={rawText}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Paste rows copied directly from Google Sheets or Excel here (including header row: Question, Answer, Category, Difficulty, Sub-genre, Used Before, Submitter, Media URL)..."
          rows={8}
          className="w-full border-[3px] border-ink bg-white p-3 font-mono text-xs text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-ink"
        />

        {errorMessage && (
          <div className="border-[3px] border-ink bg-pink/30 p-3 font-body text-xs font-bold text-ink">
            ✕ Error: {errorMessage}
          </div>
        )}

        {/* Parsing Summary & Warnings */}
        {parsed && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Tag tone={parsed.totalValid > 0 ? "mint" : "orange"}>
                {parsed.totalValid} valid {parsed.totalValid === 1 ? "question" : "questions"} detected
              </Tag>
              {parsed.detectedColumns.mediaUrl && (
                <Tag tone="lavender">Media Bridge: Active</Tag>
              )}
              {parsed.detectedColumns.category && (
                <Tag tone="yellow">Category Column: Found</Tag>
              )}
            </div>

            {parsed.errors.length > 0 && (
              <div className="border-[2px] border-ink bg-pink/20 p-2 text-xs font-body text-ink">
                <strong>Formatting Errors:</strong>
                <ul className="list-disc pl-4 mt-1">
                  {parsed.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {parsed.warnings.length > 0 && (
              <div className="border-[2px] border-ink bg-yellow/20 p-2 text-xs font-body text-ink">
                <strong>Notices:</strong>
                <ul className="list-disc pl-4 mt-1">
                  {parsed.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Live Data Preview Table */}
            {parsed.rows.length > 0 && (
              <div className="mt-2 flex flex-col gap-2">
                <span className="font-heading text-sm text-ink">
                  Preview ({parsed.rows.slice(0, 5).length} of {parsed.rows.length} rows):
                </span>
                <div className="overflow-x-auto border-[3px] border-ink">
                  <table className="w-full text-left font-body text-xs">
                    <thead className="border-b-[3px] border-ink bg-ink text-cream uppercase">
                      <tr>
                        <th className="p-2">#</th>
                        <th className="p-2">Question</th>
                        <th className="p-2">Answer</th>
                        <th className="p-2">Category</th>
                        <th className="p-2">Difficulty</th>
                        <th className="p-2">Media</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y border-ink/20 bg-white">
                      {parsed.rows.slice(0, 8).map((r) => (
                        <tr key={r.rowIndex} className={r.isValid ? "" : "bg-pink/10"}>
                          <td className="p-2 font-mono">{r.rowIndex}</td>
                          <td className="p-2 font-bold max-w-[280px] truncate">
                            {r.text || <span className="italic text-ink/40">Empty</span>}
                          </td>
                          <td className="p-2 max-w-[150px] truncate">{r.answerText}</td>
                          <td className="p-2">
                            <Tag tone="lavender">{r.categoryName}</Tag>
                          </td>
                          <td className="p-2 uppercase">{r.difficulty}</td>
                          <td className="p-2">
                            {r.mediaUrl ? (
                              <span className="text-xs font-bold text-ink underline truncate block max-w-[120px]">
                                {r.mediaUrl}
                              </span>
                            ) : (
                              <span className="text-ink/40">—</span>
                            )}
                          </td>
                          <td className="p-2">
                            {r.isValid ? (
                              <Tag tone="mint">Valid</Tag>
                            ) : (
                              <Tag tone="pink">{r.validationError}</Tag>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Execute Import Action Button */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 pt-4 border-t-[2px] border-ink">
              <div className="font-body text-xs text-ink/70">
                Ready to import {parsed.totalValid} questions into the active bank.
              </div>
              <Button
                type="button"
                variant="primary"
                onClick={handleRunImport}
                disabled={importing || parsed.totalValid === 0}
                className="inline-flex items-center gap-1.5"
              >
                {importing ? (
                  "Importing & Checking Duplicates..."
                ) : (
                  <>
                    <UploadIcon size={14} />
                    Import {parsed.totalValid} Questions
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardShell>

      {/* Post-Import Result Summary Modal / Panel */}
      {importResult && (
        <FramedPanel tone="mint" className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-2xl text-ink flex items-center gap-2">
              <CheckCircleIcon size={24} className="text-forest" />
              Import Completed!
            </h2>
            <Tag tone="ink">{importResult.totalProcessed} Processed</Tag>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CardShell tone="cream" className="p-4">
              <span className="block font-heading text-3xl text-ink">
                {importResult.importedClean}
              </span>
              <span className="block font-body text-xs font-bold uppercase tracking-wider text-ink/70">
                Added Directly to Question Pool ({defaultStatus})
              </span>
              <p className="mt-1 font-body text-xs text-ink/70">
                These questions were verified unique and added directly into the pool.
              </p>
            </CardShell>

            <CardShell tone="pink" className="p-4">
              <span className="block font-heading text-3xl text-ink">
                {importResult.importedFlagged}
              </span>
              <span className="block font-body text-xs font-bold uppercase tracking-wider text-ink/70">
                Held in Duplicate Review Queue
              </span>
              <p className="mt-1 font-body text-xs text-ink/70">
                Caught by trigram duplicate detection! Held safely in the review queue to prevent duplicate-flooding.
              </p>
            </CardShell>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-2">
            <Button as="a" href="/questions" variant="primary">
              View Question Pool →
            </Button>
            {importResult.importedFlagged > 0 && (
              <Button as="a" href="/admin/duplicates" variant="alt">
                Review Held Duplicates ({importResult.importedFlagged}) →
              </Button>
            )}
            <Button
              type="button"
              variant="alt"
              onClick={() => {
                setRawText("");
                setParsed(null);
                setImportResult(null);
              }}
            >
              Import Another Batch
            </Button>
          </div>
        </FramedPanel>
      )}
    </div>
  );
}
