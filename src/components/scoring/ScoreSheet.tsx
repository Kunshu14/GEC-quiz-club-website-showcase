"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import {
  Button,
  CardShell,
  Tag,
  ZapIcon,
  TargetIcon,
  SettingsIcon,
  SaveIcon,
  SpreadsheetIcon,
  TrophyIcon,
  MedalIcon,
} from "@/components/ui";
import { RosterItem } from "../roster/RosterChecklist";
import { FinalRankingModal } from "./FinalRankingModal";
import { ExportResultsModal } from "./ExportResultsModal";
import { MarkingSchemeModal } from "./MarkingSchemeModal";
import {
  type RoundMarkingScheme,
  type QuizRoundSettings,
  getRoundMarkingScheme,
  getDeltaOptions,
} from "@/lib/scoring/markingSchemes";

export interface RoundQuestion {
  id: string;
  text: string;
  answerText: string;
  difficulty: string;
  orderIndex: number;
}

export interface ScoreItem {
  id: string;
  quizId: string;
  rosterId: string;
  seatNo: number;
  roundLabel: string;
  points: number | string;
  status: "ACTIVE" | "ELIMINATED" | "ADVANCED";
  questionScores?: Record<string, number | { points: number }>;
}

export interface FinalRankItem {
  id: string;
  rosterId: string;
  seatNo: number;
  rank: number;
  totalPoints?: number | string | null;
}

interface ScoreSheetProps {
  quizId: string;
  quizTitle?: string;
  canEdit: boolean;
  initialRoster: RosterItem[];
}

export function ScoreSheet({ quizId, quizTitle = "Quiz", canEdit, initialRoster }: ScoreSheetProps) {
  const [roster, setRoster] = useState<RosterItem[]>(initialRoster);
  const [scores, setScores] = useState<ScoreItem[]>([]);
  const [rounds, setRounds] = useState<string[]>([]);
  const [activeRound, setActiveRound] = useState<string>("");
  const [finalRanks, setFinalRanks] = useState<FinalRankItem[]>([]);

  // Dual Scoring Mode: Round Tally vs Question Matrix
  const [scoringMode, setScoringMode] = useState<"ROUND_TALLY" | "QUESTION_MATRIX">("ROUND_TALLY");
  const [questionsByRound, setQuestionsByRound] = useState<Record<string, RoundQuestion[]>>({});
  const [roundQuestionScores, setRoundQuestionScores] = useState<Record<string, Record<string, number>>>({});

  const [roundScores, setRoundScores] = useState<Record<string, { points: string; status: "ACTIVE" | "ELIMINATED" | "ADVANCED" }>>({});
  const [newRoundInput, setNewRoundInput] = useState("");
  const [isAddingRound, setIsAddingRound] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRankingModalOpen, setIsRankingModalOpen] = useState(false);
  const [isExportResultsOpen, setIsExportResultsOpen] = useState(false);
  const [isMarkingModalOpen, setIsMarkingModalOpen] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [roundSettings, setRoundSettings] = useState<QuizRoundSettings | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [, startTransition] = useTransition();

  // Load scores and rounds from API
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [scoresRes, ranksRes, rosterRes] = await Promise.all([
        fetch(`/api/quizzes/${quizId}/scores`),
        fetch(`/api/quizzes/${quizId}/rankings`),
        fetch(`/api/quizzes/${quizId}/roster`),
      ]);

      if (scoresRes.ok) {
        const data = await scoresRes.json();
        setScores(data.scores || []);
        setQuestionsByRound(data.questionsByRound || {});
        setRoundSettings(data.roundSettings || null);
        const fetchedRounds: string[] = data.rounds || [];
        setRounds(fetchedRounds);
        if (fetchedRounds.length > 0 && !activeRound) {
          setActiveRound(fetchedRounds[0]);
        }
      }

      if (ranksRes.ok) {
        const data = await ranksRes.json();
        setFinalRanks(data.rankings || []);
      }

      if (rosterRes.ok) {
        const data = await rosterRes.json();
        setRoster(data.roster || []);
      }
    } catch (err: unknown) {
      setErrorMessage((err as Error)?.message || "Failed to load scoring data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  // Seated teams only
  const seatedTeams = useMemo(() => {
    return roster
      .filter((r) => r.seatNo !== null && r.status !== "NO_SHOW")
      .sort((a, b) => (a.seatNo || 0) - (b.seatNo || 0));
  }, [roster]);

  // Identify eliminated teams up to active round
  const eliminatedRosterIdsBeforeActiveRound = useMemo(() => {
    const eliminated = new Set<string>();
    const currentRoundIdx = rounds.indexOf(activeRound);
    if (currentRoundIdx <= 0) return eliminated;

    for (let i = 0; i < currentRoundIdx; i++) {
      const priorRound = rounds[i];
      for (const s of scores) {
        if (s.roundLabel === priorRound && s.status === "ELIMINATED") {
          eliminated.add(s.rosterId);
        }
      }
    }
    return eliminated;
  }, [rounds, activeRound, scores]);

  // Active round marking scheme and delta options
  const activeScheme = useMemo(() => {
    return getRoundMarkingScheme(roundSettings, activeRound);
  }, [roundSettings, activeRound]);

  const activeDeltas = useMemo(() => {
    return getDeltaOptions(activeScheme);
  }, [activeScheme]);

  const handleSaveMarkingScheme = async (scope: "ROUND" | "ALL", newScheme: RoundMarkingScheme) => {
    setIsSavingSettings(true);
    try {
      const existingSchemes = roundSettings?.markingSchemes ? { ...roundSettings.markingSchemes } : {};
      if (scope === "ALL") {
        for (const r of rounds) {
          existingSchemes[r] = newScheme;
        }
      } else {
        existingSchemes[activeRound] = newScheme;
      }

      const updatedSettings: QuizRoundSettings = {
        ...roundSettings,
        markingSchemes: existingSchemes,
      };

      const res = await fetch(`/api/quizzes/${quizId}/scores`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundSettings: updatedSettings }),
      });

      if (!res.ok) {
        throw new Error("Failed to save marking scheme");
      }

      setRoundSettings(updatedSettings);
      setIsMarkingModalOpen(false);
      setSuccessMessage(`Marking scheme updated for ${scope === "ALL" ? "all rounds" : activeRound}!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setErrorMessage((err as Error)?.message || "Failed to update marking scheme");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Active round questions from running order
  const activeQuestions = useMemo(() => {
    return questionsByRound[activeRound] || [];
  }, [questionsByRound, activeRound]);

  // Sync inputs when activeRound changes
  useEffect(() => {
    if (!activeRound) return;

    const initialMap: Record<string, { points: string; status: "ACTIVE" | "ELIMINATED" | "ADVANCED" }> = {};
    const initialQMap: Record<string, Record<string, number>> = {};

    for (const team of seatedTeams) {
      const existing = scores.find((s) => s.rosterId === team.id && s.roundLabel === activeRound);
      if (existing) {
        initialMap[team.id] = {
          points: String(existing.points),
          status: existing.status,
        };
        // Parse existing questionScores if present
        if (existing.questionScores && typeof existing.questionScores === "object") {
          const qMap: Record<string, number> = {};
          for (const [k, v] of Object.entries(existing.questionScores)) {
            if (typeof v === "number") {
              qMap[k] = v;
            } else if (v && typeof v === "object" && "points" in v) {
              qMap[k] = Number((v as { points: unknown }).points ?? 0);
            }
          }
          initialQMap[team.id] = qMap;
        } else {
          initialQMap[team.id] = {};
        }
      } else {
        const wasEliminated = eliminatedRosterIdsBeforeActiveRound.has(team.id);
        initialMap[team.id] = {
          points: "0",
          status: wasEliminated ? "ELIMINATED" : "ACTIVE",
        };
        initialQMap[team.id] = {};
      }
    }
    setRoundScores(initialMap);
    setRoundQuestionScores(initialQMap);
  }, [activeRound, seatedTeams, scores, eliminatedRosterIdsBeforeActiveRound]);

  // Total scores per team across all rounds
  const teamTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const team of seatedTeams) {
      totals[team.id] = 0;
    }
    for (const score of scores) {
      if (totals[score.rosterId] !== undefined) {
        totals[score.rosterId] += Number(score.points || 0);
      }
    }
    return totals;
  }, [seatedTeams, scores]);

  // Enriched roster with total points for ranking modal
  const rosterWithTotals = useMemo(() => {
    return roster.map((item) => ({
      ...item,
      totalPoints: teamTotals[item.id] || 0,
    }));
  }, [roster, teamTotals]);

  // Leaderboard sorted descending
  const leaderboard = useMemo(() => {
    return [...seatedTeams].sort((a, b) => {
      const ptsA = teamTotals[a.id] || 0;
      const ptsB = teamTotals[b.id] || 0;
      return ptsB - ptsA;
    });
  }, [seatedTeams, teamTotals]);

  const handleScoreChange = (rosterId: string, points: string) => {
    setRoundScores((prev) => ({
      ...prev,
      [rosterId]: {
        ...prev[rosterId],
        points,
      },
    }));
  };

  const handleStatusToggle = (rosterId: string) => {
    setRoundScores((prev) => {
      const current = prev[rosterId]?.status || "ACTIVE";
      const newStatus = current === "ELIMINATED" ? "ACTIVE" : "ELIMINATED";
      return {
        ...prev,
        [rosterId]: {
          ...prev[rosterId],
          status: newStatus,
        },
      };
    });
  };

  const handleQuickAdd = (rosterId: string, delta: number) => {
    setRoundScores((prev) => {
      const currentPoints = parseFloat(prev[rosterId]?.points || "0") || 0;
      const newPoints = currentPoints + delta;
      return {
        ...prev,
        [rosterId]: {
          ...prev[rosterId],
          points: String(newPoints),
        },
      };
    });
  };

  const handleSetQuestionScore = (rosterId: string, questionId: string, targetPoints: number) => {
    setRoundQuestionScores((prev) => {
      const currentTeamQs = { ...(prev[rosterId] || {}) };
      currentTeamQs[questionId] = targetPoints;

      // Recalculate round total from all questions for this team
      const newRoundSum = activeQuestions.reduce((sum, q) => sum + (currentTeamQs[q.id] || 0), 0);

      // Keep roundScores in sync
      setRoundScores((prevScores) => ({
        ...prevScores,
        [rosterId]: {
          ...prevScores[rosterId],
          points: String(newRoundSum),
        },
      }));

      return {
        ...prev,
        [rosterId]: currentTeamQs,
      };
    });
  };

  const handleSaveRoundScores = async () => {
    if (!activeRound) return;
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const scoresPayload = seatedTeams
        .filter((team) => {
          // If eliminated in an earlier round, skip adding a row in this round per Section 6
          const wasEliminatedEarlier = eliminatedRosterIdsBeforeActiveRound.has(team.id);
          return !wasEliminatedEarlier;
        })
        .map((team) => {
          const entry = roundScores[team.id] || { points: "0", status: "ACTIVE" };
          const qScores = roundQuestionScores[team.id];
          return {
            rosterId: team.id,
            seatNo: team.seatNo!,
            points: parseFloat(entry.points) || 0,
            status: entry.status,
            questionScores: qScores && Object.keys(qScores).length > 0 ? qScores : undefined,
          };
        });

      const res = await fetch(`/api/quizzes/${quizId}/scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roundLabel: activeRound,
          scores: scoresPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save scores");
      }

      setSuccessMessage(`Saved scores for "${activeRound}"!`);
      await loadData();
    } catch (err: unknown) {
      setErrorMessage((err as Error)?.message || "Failed to save round scores");
    } finally {
      setIsSaving(false);
    }
  };

  const roundHasData = useMemo(() => {
    const dataMap: Record<string, boolean> = {};
    for (const r of rounds) {
      const hasScores = scores.some(
        (s) =>
          s.roundLabel?.toLowerCase() === r.toLowerCase() &&
          (Number(s.points) > 0 || s.status === "ELIMINATED"),
      );
      const hasQuestions = (questionsByRound[r]?.length || 0) > 0;
      dataMap[r] = Boolean(hasScores || hasQuestions);
    }
    return dataMap;
  }, [rounds, scores, questionsByRound]);

  const handleCreateRound = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newRoundInput.trim();
    if (!trimmed) return;

    let canonical = trimmed;
    if (/^round\s*\d+$/i.test(trimmed)) {
      canonical = `Round ${trimmed.replace(/\D/g, "")}`;
    } else if (/^finals?$/i.test(trimmed)) {
      canonical = "Finals";
    } else if (/^prelims?$/i.test(trimmed)) {
      canonical = "Prelims";
    } else if (/^tie\s*breaker$/i.test(trimmed)) {
      canonical = "Tiebreaker";
    }

    if (rounds.some((r) => r.toLowerCase() === canonical.toLowerCase())) {
      setErrorMessage(`Round "${canonical}" already exists.`);
      return;
    }

    startTransition(() => {
      const updated = [...rounds, canonical];
      setRounds(updated);
      setActiveRound(canonical);
      setNewRoundInput("");
      setIsAddingRound(false);
      setErrorMessage(null);
    });
  };

  const handleDeleteRound = async (roundToDelete: string) => {
    if (rounds.length <= 1) return;
    const updated = rounds.filter((r) => r !== roundToDelete);
    setRounds(updated);
    if (activeRound === roundToDelete) {
      setActiveRound(updated[0]);
    }

    // Persistently delete any empty/orphan scores in database for this round
    try {
      await fetch(`/api/quizzes/${quizId}/scores?roundLabel=${encodeURIComponent(roundToDelete)}`, {
        method: "DELETE",
      });
      setScores((prev) =>
        prev.filter((s) => s.roundLabel?.toLowerCase() !== roundToDelete.toLowerCase()),
      );
    } catch {
      // Ignore background network error
    }
  };

  if (isLoading) {
    return (
      <CardShell tone="cream" className="border-2 border-ink p-8 text-center">
        <p className="font-body text-xs text-ink/70">Loading live scoring sheet...</p>
      </CardShell>
    );
  }

  if (seatedTeams.length === 0) {
    return (
      <CardShell tone="cream" className="border-[3px] border-ink p-8 text-center shadow-[4px_4px_0_var(--ink)]">
        <h3 className="font-display text-lg text-ink">No Seated Teams Yet</h3>
        <p className="mt-1 font-body text-xs text-ink/70 max-w-md mx-auto">
          Scores can only be entered for teams once a seat has been assigned in the <strong>Roster & Check-In</strong> checklist.
        </p>
      </CardShell>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Official Podium / Locked Rankings Banner */}
      {finalRanks.length > 0 && (
        <div className="border-[3px] border-ink bg-yellow p-4 shadow-[4px_4px_0_var(--ink)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-mono text-xs font-black uppercase tracking-wider text-ink/70">
                Official Results
              </span>
              <h3 className="font-display font-black text-xl text-ink flex items-center gap-2">
                Final Quiz Rankings Locked In <TrophyIcon size={20} className="text-yellow fill-yellow stroke-ink" />
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => setIsExportResultsOpen(true)}
                variant="alt"
                className="text-xs font-bold cursor-pointer border-2 border-ink bg-white shadow-[2px_2px_0_var(--ink)] flex items-center gap-1.5"
              >
                <SpreadsheetIcon size={14} /> Export Results
              </Button>
              {canEdit && (
                <Button
                  type="button"
                  onClick={() => setIsRankingModalOpen(true)}
                  variant="alt"
                  className="text-xs font-bold cursor-pointer"
                >
                  Edit Final Placements
                </Button>
              )}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 font-body text-xs">
            {finalRanks.slice(0, 3).map((rankItem) => {
              const team = roster.find((r) => r.id === rankItem.rosterId);
              const medalLabel = rankItem.rank === 1 ? "1st" : rankItem.rank === 2 ? "2nd" : "3rd";
              const medalColor = rankItem.rank === 1 ? "text-yellow" : rankItem.rank === 2 ? "text-ink/60" : "text-[#CD7F32]";
              return (
                <div
                  key={rankItem.id}
                  className="border-2 border-ink bg-white p-2.5 shadow-[2px_2px_0_var(--ink)]"
                >
                  <div className="font-display font-black text-base text-ink flex items-center gap-1.5">
                    <MedalIcon size={16} className={medalColor} />
                    {medalLabel} Place
                  </div>
                  <div className="font-bold text-ink truncate">{team?.teamName || `Seat #${rankItem.seatNo}`}</div>
                  <div className="font-mono text-[11px] text-ink/70">
                    Seat #{rankItem.seatNo} · {rankItem.totalPoints || 0} pts
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Scoring Workspace & Leaderboard Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Cols: Round Scoring Workspace */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Round Selector Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 border-b-2 border-ink pb-2">
            {rounds.map((round) => {
              const isCurrent = round === activeRound;
              const canDeleteThisRound = canEdit && rounds.length > 1 && !roundHasData[round];

              return (
                <div key={round} className="relative inline-flex items-center group">
                  <button
                    type="button"
                    onClick={() => setActiveRound(round)}
                    className={`border-2 border-ink px-3 py-1.5 font-display text-xs font-bold transition-all cursor-pointer ${
                      isCurrent
                        ? "bg-yellow text-ink shadow-[2px_2px_0_var(--ink)]"
                        : "bg-white text-ink/70 hover:bg-cream"
                    } ${canDeleteThisRound ? "pr-6" : ""}`}
                  >
                    {round}
                  </button>
                  {canDeleteThisRound && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRound(round);
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center text-[10px] font-bold text-ink/40 hover:text-pink hover:bg-black/10 rounded-full cursor-pointer"
                      title={`Remove unused round tab "${round}"`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}

            {canEdit && (
              isAddingRound ? (
                <form onSubmit={handleCreateRound} className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newRoundInput}
                    onChange={(e) => setNewRoundInput(e.target.value)}
                    placeholder="Round Name"
                    className="w-28 border-2 border-ink px-2 py-1 text-xs font-body"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="border border-ink bg-yellow px-2 py-1 text-xs font-bold"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingRound(false)}
                    className="border border-ink bg-white px-2 py-1 text-xs"
                  >
                    ✕
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingRound(true)}
                  className="border-2 border-dashed border-ink/40 px-2.5 py-1.5 text-xs font-bold text-ink/60 hover:text-ink hover:border-ink"
                >
                  + New Round
                </button>
              )
            )}
          </div>

          {/* Scoring Mode Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink pb-2">
            <div className="flex items-center gap-1 border-2 border-ink bg-cream p-0.5 shadow-[1px_1px_0_var(--ink)]">
              <button
                type="button"
                onClick={() => setScoringMode("ROUND_TALLY")}
                className={`px-3 py-1 font-display text-xs font-bold transition-all cursor-pointer ${
                  scoringMode === "ROUND_TALLY"
                    ? "bg-yellow text-ink border border-ink shadow-[1px_1px_0_var(--ink)]"
                    : "text-ink/70 hover:text-ink"
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <ZapIcon size={14} className="text-ink" /> Round Tally Mode
                </span>
              </button>
              <button
                type="button"
                onClick={() => setScoringMode("QUESTION_MATRIX")}
                className={`px-3 py-1 font-display text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  scoringMode === "QUESTION_MATRIX"
                    ? "bg-yellow text-ink border border-ink shadow-[1px_1px_0_var(--ink)]"
                    : "text-ink/70 hover:text-ink"
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <TargetIcon size={14} className="text-ink" /> Question Matrix Mode
                </span>
                {activeQuestions.length > 0 && (
                  <span className="rounded-xs border border-ink bg-white px-1 text-[10px] font-mono font-bold text-ink">
                    {activeQuestions.length} Qs
                  </span>
                )}
              </button>
            </div>

            {/* Configurable Marking Scheme Button */}
            {canEdit && (
              <button
                type="button"
                onClick={() => setIsMarkingModalOpen(true)}
                className="border-2 border-ink bg-white px-2.5 py-1 text-xs font-bold text-ink shadow-[1px_1px_0_var(--ink)] hover:bg-yellow/30 transition-all flex items-center gap-1.5 cursor-pointer"
                title={`Configure marking scheme for ${activeRound}`}
              >
                <span className="inline-flex items-center gap-1">
                  <SettingsIcon size={13} className="text-ink" /> Scheme:
                </span>
                <span className="font-mono text-[11px] font-black underline">
                  {activeScheme.chips.map((c) => (c > 0 ? `+${c}` : c)).join(" / ")}
                </span>
                <span className="text-[10px] text-ink/60 hidden sm:inline">▾</span>
              </button>
            )}

            <span className="font-mono text-[11px] text-ink/70 hidden sm:inline">
              {scoringMode === "ROUND_TALLY"
                ? "Direct point adjustments per round"
                : "Score per question (auto-calculates round total)"}
            </span>
          </div>

          {/* Feedback Banners */}
          {errorMessage && (
            <div className="border-[3px] border-ink bg-pink p-3 font-body text-xs font-bold text-ink shadow-[2px_2px_0_var(--ink)]">
              ✕ {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="border-[3px] border-ink bg-yellow p-3 font-body text-xs font-bold text-ink shadow-[2px_2px_0_var(--ink)]">
              ✓ {successMessage}
            </div>
          )}

          {/* MODE 1: Round Tally Cards (Mobile-Optimized) */}
          {scoringMode === "ROUND_TALLY" && (
            <div className="flex flex-col gap-2.5">
              {seatedTeams.map((team) => {
                const wasEliminatedEarlier = eliminatedRosterIdsBeforeActiveRound.has(team.id);
                const scoreEntry = roundScores[team.id] || { points: "0", status: "ACTIVE" };
                const isEliminatedInThisRound = scoreEntry.status === "ELIMINATED";

                return (
                  <div
                    key={team.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-2 border-ink p-3 shadow-[2px_2px_0_var(--ink)] transition-all ${
                      wasEliminatedEarlier
                        ? "bg-gray-100 opacity-50 border-dashed"
                        : isEliminatedInThisRound
                          ? "bg-pink/15 border-pink"
                          : "bg-white"
                    }`}
                  >
                    {/* Left: Seat and Team Name */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-ink bg-cream font-display font-black text-sm text-ink shadow-[1px_1px_0_var(--ink)]">
                        #{team.seatNo}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-display font-bold text-sm text-ink truncate">
                            {team.teamName}
                          </h4>
                          {wasEliminatedEarlier && (
                            <span className="rounded-xs border border-ink bg-gray-300 px-1 text-[9px] font-bold uppercase text-ink/70">
                              Eliminated Prior
                            </span>
                          )}
                          {!wasEliminatedEarlier && isEliminatedInThisRound && (
                            <span className="rounded-xs border border-pink bg-pink px-1 text-[9px] font-black uppercase text-ink">
                              Knocked Out
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-body text-ink/60">
                          Total before {activeRound}: <strong>{teamTotals[team.id] || 0} pts</strong>
                        </span>
                      </div>
                    </div>

                    {/* Right: Point Inputs & Steppers */}
                    {!wasEliminatedEarlier ? (
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Quick delta buttons dynamically generated from active round scheme */}
                        {canEdit && (
                          <div className="flex flex-wrap items-center gap-1 font-mono text-xs">
                            {activeDeltas.map((delta) => (
                              <button
                                key={delta}
                                type="button"
                                onClick={() => handleQuickAdd(team.id, delta)}
                                className={`min-h-[36px] min-w-[34px] px-2 border-2 border-ink font-mono font-bold text-xs transition-colors cursor-pointer select-none touch-manipulation ${
                                  delta < 0
                                    ? "bg-white text-pink hover:bg-pink/20 active:bg-pink active:text-white"
                                    : "bg-white text-ink hover:bg-yellow active:bg-yellow"
                                }`}
                                title={`${delta > 0 ? `+${delta}` : delta} pts`}
                              >
                                {delta > 0 ? `+${delta}` : delta}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Numeric Input */}
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.5"
                            disabled={!canEdit}
                            value={scoreEntry.points}
                            onChange={(e) => handleScoreChange(team.id, e.target.value)}
                            className="w-20 border-2 border-ink bg-white px-2 py-1 text-center font-mono font-bold text-sm shadow-[1px_1px_0_var(--ink)] focus:outline-none focus:bg-yellow/15"
                          />
                          <span className="text-xs font-bold text-ink/60 font-mono">pts</span>
                        </div>

                        {/* Knockout / Elimination Toggle */}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleStatusToggle(team.id)}
                            className={`border-2 border-ink px-2 py-1 font-body text-xs font-bold transition-colors cursor-pointer ${
                              isEliminatedInThisRound
                                ? "bg-pink text-ink shadow-[1px_1px_0_var(--ink)]"
                                : "bg-white text-ink/60 hover:bg-cream"
                            }`}
                            title="Toggle elimination in knockout rounds"
                          >
                            {isEliminatedInThisRound ? "Eliminated ✕" : "Active ✓"}
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="font-mono text-xs text-ink/40 italic">
                        No score (Eliminated)
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* MODE 2: Question Matrix Grid */}
          {scoringMode === "QUESTION_MATRIX" && (
            activeQuestions.length === 0 ? (
              <div className="border-[3px] border-ink bg-white p-6 text-center shadow-[3px_3px_0_var(--ink)]">
                <h4 className="font-display font-bold text-base text-ink">
                  No Questions Mapped to &ldquo;{activeRound}&rdquo;
                </h4>
                <p className="mt-1 font-body text-xs text-ink/70 max-w-md mx-auto">
                  This round does not have questions assigned in the running order. You can score this round using <strong>Round Tally Mode</strong>, or assign questions to this round in the <strong>Quiz Builder</strong>.
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    onClick={() => setScoringMode("ROUND_TALLY")}
                    variant="primary"
                    className="text-xs font-bold cursor-pointer"
                  >
                    Switch to Round Tally Mode
                  </Button>
                  {canEdit && (
                    <Button
                      as="a"
                      href={`/quizzes/${quizId}/builder`}
                      variant="alt"
                      className="text-xs font-bold"
                    >
                      Open Quiz Builder ↗
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="border-2 border-ink bg-white shadow-[2px_2px_0_var(--ink)] overflow-x-auto">
                <table className="w-full border-collapse text-left font-body text-xs">
                  <thead>
                    <tr className="border-b-2 border-ink bg-cream font-display font-black text-[11px] text-ink uppercase tracking-wider sticky top-0 z-20">
                      <th className="p-2.5 border-r border-ink/30 text-center w-12 sticky left-0 z-30 bg-cream">Seat</th>
                      <th className="p-2.5 border-r border-ink/30 min-w-36 sticky left-12 z-30 bg-cream shadow-[2px_0_4px_rgba(0,0,0,0.08)]">Team Name</th>
                      {activeQuestions.map((q, idx) => (
                        <th
                          key={q.id}
                          className="p-2 border-r border-ink/30 text-center font-mono text-[11px] min-w-24 group relative cursor-help"
                          title={`${q.text}\n\nAnswer: ${q.answerText}`}
                        >
                          <div className="flex flex-col items-center">
                            <span className="font-black text-ink">Q{idx + 1}</span>
                            <span className="text-[9px] font-normal text-ink/60 uppercase">
                              {q.difficulty}
                            </span>
                          </div>
                        </th>
                      ))}
                      <th className="p-2.5 border-r border-ink/30 text-right font-mono bg-yellow/40 min-w-24">
                        Round Total
                      </th>
                      <th className="p-2.5 text-center min-w-20">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seatedTeams.map((team) => {
                      const wasEliminatedEarlier = eliminatedRosterIdsBeforeActiveRound.has(team.id);
                      const scoreEntry = roundScores[team.id] || { points: "0", status: "ACTIVE" };
                      const isEliminatedInThisRound = scoreEntry.status === "ELIMINATED";
                      const teamQs = roundQuestionScores[team.id] || {};

                      return (
                        <tr
                          key={team.id}
                          className={`border-b border-ink/20 hover:bg-cream/30 transition-colors ${
                            wasEliminatedEarlier ? "bg-gray-100 opacity-40" : isEliminatedInThisRound ? "bg-pink/10" : ""
                          }`}
                        >
                          <td className="p-2.5 border-r border-ink/30 text-center font-mono font-black sticky left-0 z-10 bg-white">
                            #{team.seatNo}
                          </td>
                          <td className="p-2.5 border-r border-ink/30 font-bold text-ink truncate max-w-44 sticky left-12 z-10 bg-white shadow-[2px_0_4px_rgba(0,0,0,0.08)]">
                            {team.teamName}
                          </td>
                          {!wasEliminatedEarlier ? (
                            <>
                              {activeQuestions.map((q) => {
                                const currentPts = teamQs[q.id] ?? 0;
                                return (
                                  <td
                                    key={q.id}
                                    className="p-1 border-r border-ink/30 text-center"
                                  >
                                    {canEdit ? (
                                      <div className="flex items-center justify-center gap-0.5">
                                        {activeScheme.chips.map((chipVal) => {
                                          const isSelected = currentPts === chipVal;
                                          return (
                                            <button
                                              key={chipVal}
                                              type="button"
                                              onClick={() =>
                                                handleSetQuestionScore(team.id, q.id, isSelected ? 0 : chipVal)
                                              }
                                              className={`h-7 px-1.5 border text-[10px] font-mono font-bold transition-all cursor-pointer ${
                                                isSelected
                                                  ? chipVal >= 10
                                                    ? "bg-yellow text-ink border-ink shadow-[1px_1px_0_var(--ink)]"
                                                    : chipVal > 0
                                                      ? "bg-mint text-ink border-ink shadow-[1px_1px_0_var(--ink)]"
                                                      : "bg-pink text-ink border-ink shadow-[1px_1px_0_var(--ink)]"
                                                  : "bg-white text-ink/70 border-ink/40 hover:bg-cream"
                                              }`}
                                              title={`${chipVal > 0 ? `+${chipVal}` : chipVal} pts (click to toggle/clear)`}
                                            >
                                              {chipVal > 0 ? `+${chipVal}` : chipVal}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <span
                                        className={`font-mono font-bold text-xs ${
                                          currentPts > 0 ? "text-ink" : currentPts < 0 ? "text-pink font-black" : "text-ink/40"
                                        }`}
                                      >
                                        {currentPts !== 0 ? (currentPts > 0 ? `+${currentPts}` : currentPts) : "·"}
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="p-2.5 border-r border-ink/30 text-right font-mono font-black text-sm text-ink bg-yellow/20">
                                {scoreEntry.points} pts
                              </td>
                              <td className="p-2.5 text-center">
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => handleStatusToggle(team.id)}
                                    className={`border border-ink px-2 py-0.5 text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                                      isEliminatedInThisRound
                                        ? "bg-pink text-ink shadow-[1px_1px_0_var(--ink)]"
                                        : "bg-white text-ink/70 hover:bg-cream"
                                    }`}
                                  >
                                    {isEliminatedInThisRound ? "Eliminated ✕" : "Active ✓"}
                                  </button>
                                )}
                              </td>
                            </>
                          ) : (
                            <td
                              colSpan={activeQuestions.length + 2}
                              className="p-2.5 text-center font-mono text-xs text-ink/40 italic"
                            >
                              Eliminated in earlier round
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Save Button */}
          {canEdit && (
            <div className="mt-2 flex items-center justify-end">
              <Button
                type="button"
                onClick={handleSaveRoundScores}
                disabled={isSaving}
                variant="primary"
                className="cursor-pointer font-bold text-xs sm:text-sm shadow-[3px_3px_0_var(--ink)] flex items-center gap-1.5"
              >
                {isSaving ? "Saving Scores..." : (
                  <>
                    <SaveIcon size={14} />
                    Save {activeRound} Scores
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Right Col: Live Running Leaderboard */}
        <div className="flex flex-col gap-4 border-[3px] border-ink bg-cream p-4 shadow-[4px_4px_0_var(--ink)]">
          <div className="flex items-center justify-between border-b-2 border-ink pb-2">
            <div>
              <h3 className="font-display text-lg text-ink">Live Leaderboard</h3>
              <p className="font-body text-[11px] text-ink/70">Running total across all rounds</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsExportResultsOpen(true)}
                className="border-2 border-ink bg-white px-2 py-0.5 font-display text-[11px] font-bold text-ink shadow-[1px_1px_0_var(--ink)] hover:bg-yellow transition-colors cursor-pointer flex items-center gap-1"
                title="Export round-by-round results as CSV / Google Sheets"
              >
                <SpreadsheetIcon size={12} />
                Export
              </button>
              <Tag tone="yellow" className="font-mono text-xs">
                {leaderboard.length} Teams
              </Tag>
            </div>
          </div>

          {/* Sorted Standings List */}
          <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
            {leaderboard.map((team, idx) => {
              const pts = teamTotals[team.id] || 0;
              const isTopThree = idx < 3;
              return (
                <div
                  key={team.id}
                  className={`flex items-center justify-between gap-2 border-2 border-ink p-2 shadow-[1px_1px_0_var(--ink)] ${
                    isTopThree ? "bg-white" : "bg-white/80"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center font-display font-black text-xs ${
                        idx === 0
                          ? "bg-yellow text-ink border border-ink"
                          : idx === 1
                            ? "bg-lavender text-ink border border-ink"
                            : idx === 2
                              ? "bg-pink/40 text-ink border border-ink"
                              : "text-ink/60"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="font-display font-bold text-xs text-ink truncate block">
                        {team.teamName}
                      </span>
                      <span className="font-mono text-[10px] text-ink/60">
                        Seat #{team.seatNo}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-xs text-ink shrink-0">
                    {pts} pts
                  </span>
                </div>
              );
            })}
          </div>

          {/* Lock In Final Rankings Trigger */}
          {canEdit && (
            <div className="border-t-2 border-ink pt-3">
              <Button
                type="button"
                onClick={() => setIsRankingModalOpen(true)}
                variant="alt"
                className="w-full justify-center font-bold text-xs cursor-pointer shadow-[2px_2px_0_var(--ink)] flex items-center gap-1.5"
              >
                <TrophyIcon size={14} className="text-yellow" />
                Lock In Final Rankings
              </Button>
              <p className="mt-1 text-center font-body text-[10px] text-ink/60">
                Requires resolving all ties before saving placements.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Final Ranking Modal Dialog */}
      <FinalRankingModal
        quizId={quizId}
        roster={rosterWithTotals}
        isOpen={isRankingModalOpen}
        onClose={() => setIsRankingModalOpen(false)}
        onSaved={() => {
          setSuccessMessage("Final rankings locked in successfully!");
          loadData();
        }}
      />

      {/* Export Results Modal Dialog */}
      <ExportResultsModal
        quizId={quizId}
        quizTitle={quizTitle}
        isOpen={isExportResultsOpen}
        onClose={() => setIsExportResultsOpen(false)}
      />

      {/* Marking Scheme Configuration Modal */}
      <MarkingSchemeModal
        isOpen={isMarkingModalOpen}
        onClose={() => setIsMarkingModalOpen(false)}
        activeRound={activeRound}
        allRounds={rounds}
        currentScheme={activeScheme}
        onSave={handleSaveMarkingScheme}
        isSaving={isSavingSettings}
      />
    </div>
  );
}
