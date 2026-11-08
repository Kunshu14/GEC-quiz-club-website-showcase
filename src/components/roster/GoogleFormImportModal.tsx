"use client";

import { useState, useTransition, useId } from "react";
import {
  Button,
  CardShell,
  Tag,
  UploadIcon,
  CopyIcon,
  UsersIcon,
  UserIcon,
  AlertTriangleIcon,
  CheckIcon,
  XIcon,
  FileTextIcon,
} from "@/components/ui";
import {
  parseGoogleFormResponse,
  ParseResult,
} from "@/lib/import/googleFormImport";

interface GoogleFormImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizId: string;
  isOnlineMode?: boolean;
  onImportComplete: () => void;
}

export function GoogleFormImportModal({
  isOpen,
  onClose,
  quizId,
  isOnlineMode = false,
  onImportComplete,
}: GoogleFormImportModalProps) {
  const [inputTab, setInputTab] = useState<"paste" | "upload">("paste");
  const [rawText, setRawText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [autoAssignSeats, setAutoAssignSeats] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiSuccess, setApiSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fileInputId = useId();

  if (!isOpen) return null;

  const handleTextChange = (text: string) => {
    setRawText(text);
    setApiError(null);
    setApiSuccess(null);
    if (!text.trim()) {
      setParseResult(null);
      return;
    }
    const res = parseGoogleFormResponse(text);
    setParseResult(res);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setApiError(null);
    setApiSuccess(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (content) {
        setRawText(content);
        const res = parseGoogleFormResponse(content);
        setParseResult(res);
      }
    };
    reader.onerror = () => {
      setApiError("Failed to read the selected file.");
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = () => {
    if (!parseResult || parseResult.teams.length === 0) {
      setApiError("No valid teams found to import. Please check your data format.");
      return;
    }

    startTransition(async () => {
      setApiError(null);
      setApiSuccess(null);

      try {
        const payload = {
          teams: parseResult.teams.map((t) => ({
            teamName: t.teamName,
            members: t.members,
          })),
          mode: importMode,
          autoAssignSeats,
        };

        const res = await fetch(`/api/quizzes/${quizId}/roster/import`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to import roster.");
        }

        const successMsg = `Successfully imported ${data.importedTeamsCount} teams (${data.importedParticipantsCount} new participants, ${data.reusedParticipantsCount} existing participants matched).`;
        setApiSuccess(successMsg);

        setTimeout(() => {
          onImportComplete();
          onClose();
        }, 1200);
      } catch (err: unknown) {
        setApiError((err as Error)?.message || "Import failed. Please try again.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/75 p-4 backdrop-blur-xs">
      <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto">
        <CardShell tone="cream" className="p-6 md:p-8">
          {/* Header */}
          <div className="flex items-start justify-between border-b-[3px] border-ink pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-2xl font-black text-ink flex items-center gap-2">
                  <UploadIcon size={24} /> Import Roster from Google Form / Sheet
                </h2>
                <Tag tone="yellow" className="font-mono text-xs">
                  Section 7.14
                </Tag>
              </div>
              <p className="mt-1 font-body text-xs text-ink/75">
                Paste directly from Google Sheets/Excel or upload a response CSV. Multi-member
                teams and solo participants are auto-detected.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="border-2 border-ink bg-white px-2.5 py-1 font-mono text-sm font-black text-ink shadow-[2px_2px_0_var(--ink)] hover:bg-pink cursor-pointer"
            >
              <XIcon size={14} />
            </button>
          </div>

          {/* Feedback alerts */}
          {apiError && (
            <div className="mt-4 border-[3px] border-ink bg-pink p-3 font-body text-xs font-bold text-ink shadow-[3px_3px_0_var(--ink)] flex items-center gap-2">
              <XIcon size={14} /> {apiError}
            </div>
          )}
          {apiSuccess && (
            <div className="mt-4 border-[3px] border-ink bg-mint p-3 font-body text-xs font-bold text-ink shadow-[3px_3px_0_var(--ink)] flex items-center gap-2">
              <CheckIcon size={14} /> {apiSuccess}
            </div>
          )}

          {/* Input Method Tabs */}
          <div className="mt-5 flex gap-2 border-b-2 border-ink pb-2 font-display text-xs">
            <button
              type="button"
              onClick={() => setInputTab("paste")}
              className={`border-2 border-ink px-4 py-1.5 font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                inputTab === "paste"
                  ? "bg-yellow text-ink shadow-[2px_2px_0_var(--ink)] -translate-y-0.5"
                  : "bg-white text-ink hover:bg-cream"
              }`}
            >
              <CopyIcon size={14} /> Paste TSV / CSV Data
            </button>
            <button
              type="button"
              onClick={() => setInputTab("upload")}
              className={`border-2 border-ink px-4 py-1.5 font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                inputTab === "upload"
                  ? "bg-yellow text-ink shadow-[2px_2px_0_var(--ink)] -translate-y-0.5"
                  : "bg-white text-ink hover:bg-cream"
              }`}
            >
              <UploadIcon size={14} /> Upload CSV File
            </button>
          </div>

          {/* Input Controls */}
          <div className="mt-4">
            {inputTab === "paste" ? (
              <div className="flex flex-col gap-2">
                <label className="font-display text-xs font-bold text-ink">
                  Paste rows from Google Sheets (including header row):
                </label>
                <textarea
                  value={rawText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder={`Timestamp\tTeam Name\tMember 1 Name\tMember 1 Email\tMember 2 Name\tMember 2 Email\n2026-09-14\tQuizards\tArjun K\tarjun@gec.ac.in\tRohan S\trohan@gec.ac.in`}
                  rows={6}
                  className="w-full border-2 border-ink bg-white p-3 font-mono text-xs shadow-[2px_2px_0_var(--ink)] focus:outline-none focus:bg-yellow/5"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <label
                  htmlFor={fileInputId}
                  className="font-display text-xs font-bold text-ink"
                >
                  Select CSV File downloaded from Google Forms / Sheets:
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id={fileInputId}
                    type="file"
                    accept=".csv,.tsv,.txt"
                    onChange={handleFileUpload}
                    className="border-2 border-ink bg-white p-2 font-body text-xs shadow-[2px_2px_0_var(--ink)] file:mr-3 file:border file:border-ink file:bg-yellow file:px-3 file:py-1 file:font-mono file:text-xs file:font-bold file:text-ink cursor-pointer"
                  />
                  {fileName && (
                    <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-ink">
                      <FileTextIcon size={14} /> {fileName}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Parse Result Summary & Preview */}
          {parseResult && (
            <div className="mt-5 space-y-4">
              {/* Stat badges */}
              <div className="flex flex-wrap items-center gap-2 border-2 border-ink bg-white p-3 shadow-[2px_2px_0_var(--ink)]">
                <Tag tone="mint" className="font-mono text-xs font-bold">
                  {parseResult.isTeamFormat ? (
                    <span className="flex items-center gap-1">
                      <UsersIcon size={12} /> Team Format
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <UserIcon size={12} /> Solo Participant Format
                    </span>
                  )}
                </Tag>
                <Tag tone="yellow" className="font-mono text-xs font-bold">
                  {parseResult.teams.length} Teams Detected
                </Tag>
                <Tag tone="lavender" className="font-mono text-xs font-bold">
                  {parseResult.totalParticipants} Participants Detected
                </Tag>
              </div>

              {/* Warnings if any */}
              {parseResult.warnings.length > 0 && (
                <div className="border-2 border-ink bg-yellow/30 p-3 font-body text-xs text-ink shadow-[2px_2px_0_var(--ink)]">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangleIcon size={14} /> Warnings ({parseResult.warnings.length}):
                  </div>
                  <ul className="mt-1 list-disc pl-5 space-y-0.5">
                    {parseResult.warnings.slice(0, 4).map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                    {parseResult.warnings.length > 4 && (
                      <li className="font-bold">
                        ...and {parseResult.warnings.length - 4} more warnings.
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Errors if any */}
              {parseResult.errors.length > 0 && (
                <div className="border-2 border-ink bg-pink p-3 font-body text-xs font-bold text-ink shadow-[2px_2px_0_var(--ink)]">
                  ✕ {parseResult.errors.join(", ")}
                </div>
              )}

              {/* Preview table (up to 5 rows) */}
              {parseResult.teams.length > 0 && (
                <div className="border-2 border-ink bg-white shadow-[2px_2px_0_var(--ink)]">
                  <div className="border-b-2 border-ink bg-cream px-3 py-2 font-display text-xs font-bold text-ink">
                    Preview (showing first {Math.min(5, parseResult.teams.length)} of {parseResult.teams.length} teams):
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-left font-body text-xs">
                      <thead className="border-b border-ink/30 bg-ink/5 font-bold uppercase text-[11px]">
                        <tr>
                          <th className="p-2">#</th>
                          <th className="p-2">Team Name</th>
                          <th className="p-2">Members</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink/10">
                        {parseResult.teams.slice(0, 5).map((t, idx) => (
                          <tr key={idx} className="hover:bg-yellow/10">
                            <td className="p-2 font-mono font-bold text-ink/60">{idx + 1}</td>
                            <td className="p-2 font-bold text-ink">{t.teamName}</td>
                            <td className="p-2 text-ink">
                              {t.members.map((m, mIdx) => (
                                <span key={mIdx} className="inline-block mr-2">
                                  <strong>{m.name}</strong>
                                  {m.email && (
                                    <span className="text-ink/60 text-[11px]"> ({m.email})</span>
                                  )}
                                  {m.college && (
                                    <span className="text-ink/60 text-[11px]"> · {m.college}</span>
                                  )}
                                  {mIdx < t.members.length - 1 && ", "}
                                </span>
                              ))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Import Options */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-2 border-ink bg-cream p-3 shadow-[2px_2px_0_var(--ink)] font-body text-xs">
                {/* Append vs Replace */}
                <div className="flex items-center gap-4">
                  <span className="font-bold text-ink">Mode:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === "append"}
                      onChange={() => setImportMode("append")}
                      className="accent-ink"
                    />
                    <span>Append to roster</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === "replace"}
                      onChange={() => setImportMode("replace")}
                      className="accent-ink"
                    />
                    <span className="text-pink-700 font-bold">Replace entire roster</span>
                  </label>
                </div>

                {/* Auto assign seats / breakouts */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoAssignSeats}
                    onChange={(e) => setAutoAssignSeats(e.target.checked)}
                    className="accent-ink"
                  />
                  <span className="font-bold text-ink">
                    {isOnlineMode
                      ? "Auto-assign Breakout Room # (1, 2, 3...)"
                      : "Auto-assign Seat # (1, 2, 3...)"}
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="mt-6 flex items-center justify-end gap-3 border-t-[3px] border-ink pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="alt"
              className="text-xs"
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleImportSubmit}
              variant="primary"
              className="text-xs font-bold"
              disabled={isPending || !parseResult || parseResult.teams.length === 0}
            >
              {isPending ? (
                "Importing Teams..."
              ) : (
                <span className="flex items-center gap-1.5">
                  <UploadIcon size={14} />
                  Confirm & Import {parseResult?.teams.length ? `${parseResult.teams.length} Teams` : "Roster"}
                </span>
              )}
            </Button>
          </div>
        </CardShell>
      </div>
    </div>
  );
}
