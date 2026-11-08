"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import {
  Button,
  CardShell,
  Tag,
  SpreadsheetIcon,
  TargetIcon,
  MedalIcon,
  LightbulbIcon,
  CopyIcon,
  CheckCircleIcon,
  DownloadIcon,
  XIcon,
} from "@/components/ui";
import type { QuizResultsExportData } from "@/lib/export/results";

interface ExportResultsModalProps {
  quizId: string;
  quizTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ExportResultsModal({
  quizId,
  quizTitle,
  isOpen,
  onClose,
}: ExportResultsModalProps) {
  const [data, setData] = useState<QuizResultsExportData | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Export options
  const [viewMode, setViewMode] = useState<"ROUNDS" | "QUESTIONS">("ROUNDS");
  const [includeEmails, setIncludeEmails] = useState(false);
  const [includeColleges, setIncludeColleges] = useState(true);
  const [includeNoShows, setIncludeNoShows] = useState(false);
  const [includeUnseated, setIncludeUnseated] = useState(false);

  // Copy-to-clipboard state
  const [copySuccess, setCopySuccess] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;

    async function loadData() {
      try {
        const res = await fetch(`/api/quizzes/${quizId}/export/results-csv?format=json`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to load quiz results");
        }
        const json = await res.json();
        if (mounted) {
          setData(json.data);
          setError(null);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError((err as Error)?.message || "Failed to load quiz results");
        }
      } finally {
        if (mounted) {
          setIsFetching(false);
        }
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [isOpen, quizId]);

  const isLoading = isFetching || (isOpen && !data && !error);

  // Filtered rows based on user options
  const filteredRows = useMemo(() => {
    if (!data) return [];
    return data.rows.filter((row) => {
      if (!includeNoShows && row.isNoShow) return false;
      if (!includeUnseated && row.seatNo === null) return false;
      return true;
    });
  }, [data, includeNoShows, includeUnseated]);

  // Handle TSV Clipboard Copy for Google Sheets
  const handleCopyForSheets = async () => {
    if (!data) return;

    try {
      const headers = ["Rank", "Seat #", "Team Name", "Members"];
      if (includeColleges) headers.push("College");
      if (includeEmails) headers.push("Member Emails");

      if (viewMode === "QUESTIONS") {
        for (const round of data.rounds) {
          const qList = data.questionsByRound?.[round] || [];
          if (qList.length > 0) {
            qList.forEach((_, idx) => {
              headers.push(`${round} - Q${idx + 1}`);
            });
            headers.push(`${round} Total`);
          } else {
            headers.push(`${round} Total`);
          }
        }
        headers.push("Grand Total", "Status");
      } else {
        for (const round of data.rounds) {
          headers.push(round);
        }
        headers.push("Total Points", "Status");
      }

      const lines: string[] = [headers.join("\t")];

      for (const row of filteredRows) {
        const lineValues: (string | number)[] = [
          row.displayRank,
          row.seatNo !== null ? row.seatNo : "Unassigned",
          row.teamName,
          row.members.join(", "),
        ];

        if (includeColleges) lineValues.push(row.colleges.join(", "));
        if (includeEmails) lineValues.push(row.emails.join(", "));

        if (viewMode === "QUESTIONS") {
          for (const round of data.rounds) {
            const qList = data.questionsByRound?.[round] || [];
            const roundPoints = row.roundScores[round] ?? 0;
            const qScores = row.questionScores?.[round] || {};

            if (qList.length > 0) {
              qList.forEach((q) => {
                const pts = qScores[q.id] ?? 0;
                lineValues.push(pts);
              });
              lineValues.push(roundPoints);
            } else {
              lineValues.push(roundPoints);
            }
          }
          lineValues.push(row.totalPoints, row.overallStatus);
        } else {
          for (const round of data.rounds) {
            const score = row.roundScores[round] ?? 0;
            lineValues.push(score);
          }
          lineValues.push(row.totalPoints, row.overallStatus);
        }

        lines.push(lineValues.join("\t"));
      }

      const tsvContent = lines.join("\n");
      await navigator.clipboard.writeText(tsvContent);

      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 4000);
    } catch {
      setError("Unable to copy to clipboard. Please use the Download CSV option.");
    }
  };

  // Handle direct file download
  const handleDownloadCsv = () => {
    setIsDownloading(true);
    const query = new URLSearchParams({
      format: "csv",
      viewMode,
      emails: String(includeEmails),
      colleges: String(includeColleges),
      noShows: String(includeNoShows),
      unseated: String(includeUnseated),
    });

    const link = document.createElement("a");
    link.href = `/api/quizzes/${quizId}/export/results-csv?${query.toString()}`;
    const suffix = viewMode === "QUESTIONS" ? "_questions" : "_results";
    link.download = `${quizTitle.replace(/[^a-zA-Z0-9_-]/g, "_")}${suffix}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setIsDownloading(false);
    }, 1000);
  };

  // Calculate dynamic colspan for empty table state
  const totalColumns = useMemo(() => {
    let base = 4; // Rank, Seat, Team, Members
    if (includeColleges) base += 1;
    if (includeEmails) base += 1;
    base += 2; // Grand Total, Status

    if (!data) return base;

    if (viewMode === "QUESTIONS") {
      let qCols = 0;
      for (const round of data.rounds) {
        const qCount = data.questionsByRound?.[round]?.length || 0;
        qCols += qCount > 0 ? qCount + 1 : 1;
      }
      return base + qCols;
    } else {
      return base + data.rounds.length;
    }
  }, [data, viewMode, includeColleges, includeEmails]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6 backdrop-blur-xs">
      <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col animate-in fade-in zoom-in-95 duration-150">
        <CardShell
          tone="cream"
          className="flex flex-col overflow-hidden border-[3px] border-ink p-4 sm:p-6 shadow-[6px_6px_0_var(--ink)]"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-ink pb-3 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg sm:text-xl font-black text-ink flex items-center gap-2">
                  Export Quiz Results <SpreadsheetIcon size={18} />
                </h2>
                <Tag tone={viewMode === "QUESTIONS" ? "mint" : "yellow"} className="font-mono text-[11px] font-bold">
                  {viewMode === "QUESTIONS" ? (
                    <span className="flex items-center gap-1">
                      <TargetIcon size={12} /> Question Matrix Breakdown
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <SpreadsheetIcon size={12} /> Round Summary
                    </span>
                  )}
                </Tag>
              </div>
              <p className="mt-0.5 font-body text-xs text-ink/70">
                {quizTitle} · Ready for Google Sheets, Microsoft Excel, or CSV import
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center border-2 border-ink bg-white font-bold text-xs hover:bg-pink transition-colors cursor-pointer"
            >
              <XIcon size={14} />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-4">
            {error && (
              <div className="border-2 border-ink bg-pink p-3 font-body text-xs font-bold text-ink shadow-[2px_2px_0_var(--ink)]">
                ✕ {error}
              </div>
            )}

            {copySuccess && (
              <div className="border-2 border-ink bg-mint p-3 font-body text-xs font-bold text-ink shadow-[2px_2px_0_var(--ink)] flex items-center justify-between animate-in fade-in">
                <span>✓ Copied to clipboard! Switch to Google Sheets or Excel and press <strong>Ctrl+V</strong> (or ⌘+V).</span>
                <span className="font-mono text-[10px] uppercase font-black">Ready to paste</span>
              </div>
            )}

            {/* View Mode Switcher Tabs */}
            <div className="flex items-center gap-2 border-2 border-ink bg-white p-1.5 shadow-[2px_2px_0_var(--ink)]">
              <span className="text-[11px] font-mono font-bold text-ink/70 px-2 uppercase">
                Export Format:
              </span>
              <button
                type="button"
                onClick={() => setViewMode("ROUNDS")}
                className={`px-3 py-1 text-xs font-bold transition-all cursor-pointer border-2 flex items-center gap-1.5 ${
                  viewMode === "ROUNDS"
                    ? "border-ink bg-yellow text-ink shadow-[2px_2px_0_var(--ink)]"
                    : "border-transparent text-ink/70 hover:text-ink hover:bg-cream"
                }`}
              >
                <SpreadsheetIcon size={13} /> Round-by-Round Summary
              </button>
              <button
                type="button"
                onClick={() => setViewMode("QUESTIONS")}
                className={`px-3 py-1 text-xs font-bold transition-all cursor-pointer border-2 flex items-center gap-1.5 ${
                  viewMode === "QUESTIONS"
                    ? "border-ink bg-mint text-ink shadow-[2px_2px_0_var(--ink)]"
                    : "border-transparent text-ink/70 hover:text-ink hover:bg-cream"
                }`}
              >
                <TargetIcon size={13} /> Question Matrix Breakdown
              </button>
            </div>

            {isLoading ? (
              <div className="py-12 text-center font-body text-xs text-ink/70">
                Compiling round scores, team standings, and roster...
              </div>
            ) : data ? (
              <>
                {/* Options Bar */}
                <div className="border-2 border-ink bg-white p-3 shadow-[2px_2px_0_var(--ink)] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-4 text-xs font-body font-bold text-ink">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeColleges}
                        onChange={(e) => setIncludeColleges(e.target.checked)}
                        className="h-3.5 w-3.5 border-2 border-ink accent-yellow cursor-pointer"
                      />
                      <span>College</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeEmails}
                        onChange={(e) => setIncludeEmails(e.target.checked)}
                        className="h-3.5 w-3.5 border-2 border-ink accent-yellow cursor-pointer"
                      />
                      <span>Member Emails</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeUnseated}
                        onChange={(e) => setIncludeUnseated(e.target.checked)}
                        className="h-3.5 w-3.5 border-2 border-ink accent-yellow cursor-pointer"
                      />
                      <span>Unseated Teams</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeNoShows}
                        onChange={(e) => setIncludeNoShows(e.target.checked)}
                        className="h-3.5 w-3.5 border-2 border-ink accent-yellow cursor-pointer"
                      />
                      <span>No-Shows</span>
                    </label>
                  </div>

                  <div className="font-mono text-xs text-ink/60">
                    {data.rounds.length} {data.rounds.length === 1 ? "Round" : "Rounds"} · {filteredRows.length} Teams
                  </div>
                </div>

                {/* Table Preview */}
                <div className="border-2 border-ink bg-white shadow-[2px_2px_0_var(--ink)] overflow-hidden">
                  <div className="bg-cream/70 px-3 py-1.5 border-b-2 border-ink flex items-center justify-between text-[11px] font-mono font-bold text-ink/80">
                    <span>
                      Sheet Preview ({filteredRows.length} rows) · Mode: {viewMode === "QUESTIONS" ? "Question Breakdown" : "Round Summary"}
                    </span>
                    <span>Values formatted for Excel / Sheets formulas</span>
                  </div>

                  <div className="max-h-64 overflow-auto">
                    <table className="w-full border-collapse text-left font-body text-xs">
                      <thead>
                        <tr className="border-b-2 border-ink bg-cream font-display font-black text-[11px] text-ink uppercase tracking-wider sticky top-0 z-10">
                          <th className="p-2 border-r border-ink/30 text-center w-12">Rank</th>
                          <th className="p-2 border-r border-ink/30 text-center w-14">Seat #</th>
                          <th className="p-2 border-r border-ink/30 min-w-32">Team Name</th>
                          <th className="p-2 border-r border-ink/30 min-w-36">Members</th>
                          {includeColleges && (
                            <th className="p-2 border-r border-ink/30 min-w-28">College</th>
                          )}
                          {includeEmails && (
                            <th className="p-2 border-r border-ink/30 min-w-32">Emails</th>
                          )}

                          {/* Headers dependent on viewMode */}
                          {viewMode === "QUESTIONS" ? (
                            data.rounds.map((round) => {
                              const qList = data.questionsByRound?.[round] || [];
                              if (qList.length > 0) {
                                return (
                                  <Fragment key={round}>
                                    {qList.map((q, idx) => (
                                      <th
                                        key={q.id}
                                        className="p-2 border-r border-ink/30 text-right bg-mint/30 font-mono text-[10px] min-w-14"
                                        title={`${round} - Question ${idx + 1}: ${q.text}`}
                                      >
                                        R{round.replace(/[^0-9]/g, "") || round[0]} Q{idx + 1}
                                      </th>
                                    ))}
                                    <th className="p-2 border-r border-ink/30 text-right bg-mint/50 font-mono text-[11px] min-w-18">
                                      {round} Tot
                                    </th>
                                  </Fragment>
                                );
                              } else {
                                return (
                                  <th
                                    key={round}
                                    className="p-2 border-r border-ink/30 text-right bg-mint/40 font-mono text-[11px] min-w-20"
                                  >
                                    {round}
                                  </th>
                                );
                              }
                            })
                          ) : (
                            data.rounds.map((round) => (
                              <th
                                key={round}
                                className="p-2 border-r border-ink/30 text-right bg-yellow/30 font-mono text-[11px] min-w-20"
                              >
                                {round}
                              </th>
                            ))
                          )}

                          <th className="p-2 border-r border-ink/30 text-right font-mono bg-yellow/60 min-w-24">
                            Total Pts
                          </th>
                          <th className="p-2 text-center min-w-20">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={totalColumns}
                              className="p-6 text-center text-ink/60 font-mono italic"
                            >
                              No teams matching selected filters
                            </td>
                          </tr>
                        ) : (
                          filteredRows.map((row, idx) => {
                            const isPodium = typeof row.displayRank === "number" && row.displayRank <= 3;
                            return (
                              <tr
                                key={row.rosterId || idx}
                                className={`border-b border-ink/20 hover:bg-cream/40 transition-colors ${
                                  isPodium ? "bg-yellow/10" : ""
                                }`}
                              >
                                <td className="p-2 border-r border-ink/30 text-center font-mono font-bold">
                                  {row.displayRank === 1 ? (
                                    <span className="inline-flex items-center gap-1">
                                      <MedalIcon size={14} className="text-yellow" /> 1
                                    </span>
                                  ) : row.displayRank === 2 ? (
                                    <span className="inline-flex items-center gap-1">
                                      <MedalIcon size={14} className="text-ink/60" /> 2
                                    </span>
                                  ) : row.displayRank === 3 ? (
                                    <span className="inline-flex items-center gap-1">
                                      <MedalIcon size={14} className="text-[#CD7F32]" /> 3
                                    </span>
                                  ) : (
                                    row.displayRank
                                  )}
                                </td>
                                <td className="p-2 border-r border-ink/30 text-center font-mono text-ink/70">
                                  {row.seatNo !== null ? `#${row.seatNo}` : "-"}
                                </td>
                                <td className="p-2 border-r border-ink/30 font-bold text-ink truncate max-w-44">
                                  {row.teamName}
                                </td>
                                <td className="p-2 border-r border-ink/30 text-[11px] text-ink/80 truncate max-w-44">
                                  {row.members.join(", ") || "-"}
                                </td>
                                {includeColleges && (
                                  <td className="p-2 border-r border-ink/30 text-[11px] text-ink/70 truncate max-w-32">
                                    {row.colleges.join(", ") || "-"}
                                  </td>
                                )}
                                {includeEmails && (
                                  <td className="p-2 border-r border-ink/30 text-[11px] text-ink/60 font-mono truncate max-w-36">
                                    {row.emails.join(", ") || "-"}
                                  </td>
                                )}

                                {/* Score Cells dependent on viewMode */}
                                {viewMode === "QUESTIONS" ? (
                                  data.rounds.map((round) => {
                                    const qList = data.questionsByRound?.[round] || [];
                                    const roundPts = row.roundScores[round] ?? 0;
                                    const qScores = row.questionScores?.[round] || {};

                                    if (qList.length > 0) {
                                      return (
                                        <Fragment key={round}>
                                          {qList.map((q) => {
                                            const pts = qScores[q.id] ?? 0;
                                            return (
                                              <td
                                                key={q.id}
                                                className="p-2 border-r border-ink/30 text-right font-mono text-[11px] text-ink/80"
                                              >
                                                {pts}
                                              </td>
                                            );
                                          })}
                                          <td className="p-2 border-r border-ink/30 text-right font-mono font-bold bg-mint/10 text-ink">
                                            {roundPts}
                                          </td>
                                        </Fragment>
                                      );
                                    } else {
                                      return (
                                        <td
                                          key={round}
                                          className="p-2 border-r border-ink/30 text-right font-mono font-bold text-ink"
                                        >
                                          {roundPts}
                                        </td>
                                      );
                                    }
                                  })
                                ) : (
                                  data.rounds.map((round) => {
                                    const pts = row.roundScores[round] ?? 0;
                                    const status = row.roundStatuses[round];
                                    const isEliminated = status === "ELIMINATED";

                                    return (
                                      <td
                                        key={round}
                                        className={`p-2 border-r border-ink/30 text-right font-mono font-bold ${
                                          isEliminated ? "text-pink bg-pink/10" : "text-ink"
                                        }`}
                                      >
                                        {pts}
                                      </td>
                                    );
                                  })
                                )}

                                <td className="p-2 border-r border-ink/30 text-right font-mono font-black text-ink bg-yellow/20">
                                  {row.totalPoints}
                                </td>
                                <td className="p-2 text-center">
                                  <span
                                    className={`px-1.5 py-0.5 rounded-xs text-[10px] font-bold uppercase ${
                                      row.overallStatus === "Eliminated"
                                        ? "border border-pink bg-pink/20 text-ink"
                                        : row.overallStatus === "No Show"
                                          ? "border border-ink/30 bg-gray-200 text-ink/60"
                                          : "border border-mint bg-mint text-ink"
                                    }`}
                                  >
                                    {row.overallStatus}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* Action Footer */}
          <div className="border-t-2 border-ink pt-3 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-body text-ink/70">
              <LightbulbIcon size={14} className="text-yellow shrink-0" />
              <span>Pro-tip: Click <strong>Copy for Google Sheets</strong> to paste directly into any sheet with formatting intact.</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                type="button"
                onClick={handleCopyForSheets}
                disabled={!data || isLoading}
                variant="alt"
                className="flex-1 sm:flex-none cursor-pointer font-bold text-xs flex items-center justify-center gap-1.5"
              >
                {copySuccess ? (
                  <>
                    <CheckCircleIcon size={14} className="text-forest" />
                    Copied!
                  </>
                ) : (
                  <>
                    <CopyIcon size={14} />
                    Copy for Google Sheets
                  </>
                )}
              </Button>

              <Button
                type="button"
                onClick={handleDownloadCsv}
                disabled={!data || isLoading || isDownloading}
                variant="primary"
                className="flex-1 sm:flex-none cursor-pointer font-bold text-xs shadow-[2px_2px_0_var(--ink)] flex items-center justify-center gap-1.5"
              >
                {isDownloading ? (
                  "Downloading..."
                ) : (
                  <>
                    <DownloadIcon size={14} />
                    Download CSV (.csv)
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardShell>
      </div>
    </div>
  );
}
