"use client";

import { useState, useEffect, useMemo } from "react";
import { Button, CardShell, TrophyIcon, AlertTriangleIcon, CheckIcon, XIcon } from "@/components/ui";
import { RosterItem } from "../roster/RosterChecklist";

interface FinalRankingModalProps {
  quizId: string;
  roster: RosterItem[];
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

interface RankAssignment {
  rosterId: string;
  teamName: string;
  seatNo: number;
  totalPoints: number;
  rank: number;
}

export function FinalRankingModal({
  quizId,
  roster,
  isOpen,
  onClose,
  onSaved,
}: FinalRankingModalProps) {
  // Only include seated teams with confirmed status
  const eligibleTeams = useMemo(() => {
    return roster
      .filter((r) => r.seatNo !== null && r.status !== "NO_SHOW")
      .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
  }, [roster]);

  const [assignments, setAssignments] = useState<RankAssignment[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize ranks based on total points
  useEffect(() => {
    if (eligibleTeams.length > 0) {
      const initial = eligibleTeams.map((team, index) => ({
        rosterId: team.id,
        teamName: team.teamName,
        seatNo: team.seatNo!,
        totalPoints: team.totalPoints || 0,
        rank: index + 1,
      }));
      setAssignments(initial);
    }
  }, [eligibleTeams]);

  // Detect ties in total points
  const tiedGroups = useMemo(() => {
    const pointsMap = new Map<number, string[]>();
    for (const item of assignments) {
      const list = pointsMap.get(item.totalPoints) || [];
      list.push(item.teamName);
      pointsMap.set(item.totalPoints, list);
    }

    const ties: { points: number; teams: string[] }[] = [];
    for (const [points, teams] of pointsMap.entries()) {
      if (teams.length > 1) {
        ties.push({ points, teams });
      }
    }
    return ties;
  }, [assignments]);

  // Check rank uniqueness
  const rankConflict = useMemo(() => {
    const ranks = assignments.map((a) => a.rank);
    const hasDuplicates = new Set(ranks).size !== ranks.length;
    const hasInvalid = ranks.some((r) => isNaN(r) || r < 1);
    return hasDuplicates || hasInvalid;
  }, [assignments]);

  const handleRankChange = (rosterId: string, newRank: number) => {
    setAssignments((prev) =>
      prev.map((a) => (a.rosterId === rosterId ? { ...a, rank: newRank } : a)),
    );
  };

  const handleSaveRankings = async () => {
    if (rankConflict) {
      setErrorMessage("Ties are not allowed. Every team must have a unique rank (1, 2, 3...).");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const payload = {
        rankings: assignments.map((a) => ({
          rosterId: a.rosterId,
          seatNo: a.seatNo,
          rank: a.rank,
          totalPoints: a.totalPoints,
        })),
      };

      const res = await fetch(`/api/quizzes/${quizId}/rankings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save final rankings");
      }

      onSaved?.();
      onClose();
    } catch (err: unknown) {
      setErrorMessage((err as Error)?.message || "Failed to record rankings");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        <CardShell
          tone="cream"
          className="border-[3px] border-ink p-6 shadow-[6px_6px_0_var(--ink)] flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-ink pb-3 shrink-0">
            <div>
              <h3 className="font-display text-xl text-ink flex items-center gap-2">
                Record Final Rankings <TrophyIcon size={20} className="text-yellow" />
              </h3>
              <p className="font-body text-xs text-ink/70">
                Lock in final placements for this quiz. Ranks must be strictly unique (no shared placements).
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

          {/* Tie Warning Banner */}
          {tiedGroups.length > 0 && (
            <div className="mt-3 border-2 border-ink bg-yellow/40 p-3 font-body text-xs shrink-0 shadow-[2px_2px_0_var(--ink)]">
              <span className="font-bold text-ink flex items-center gap-1.5">
                <AlertTriangleIcon size={14} className="text-ink" /> Live Tiebreaker Required:
              </span>
              <p className="mt-0.5 text-ink/80 leading-relaxed">
                The following teams share equal points. Per council rules, break all ties live (e.g. via tiebreaker question) and assign distinct 1st, 2nd, etc. placements before locking in:
              </p>
              <ul className="mt-1.5 list-disc list-inside space-y-0.5 font-mono text-[11px] text-ink">
                {tiedGroups.map((tg, idx) => (
                  <li key={idx}>
                    <strong>{tg.points} pts:</strong> {tg.teams.join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {errorMessage && (
            <div className="mt-3 border-2 border-ink bg-pink p-2.5 font-body text-xs font-bold text-ink shrink-0 flex items-center gap-1.5">
              <XIcon size={14} /> {errorMessage}
            </div>
          )}

          {/* Scrollable Rankings List */}
          <div className="mt-4 overflow-y-auto flex-1 pr-1 flex flex-col gap-2">
            {assignments.map((item) => (
              <div
                key={item.rosterId}
                className="flex items-center justify-between gap-3 border-2 border-ink bg-white p-2.5 shadow-[2px_2px_0_var(--ink)]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-ink bg-cream font-mono font-bold text-xs text-ink/70">
                    #{item.seatNo}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-display font-bold text-sm text-ink truncate">
                      {item.teamName}
                    </h4>
                    <span className="font-mono text-xs text-ink/60">
                      Total: <strong>{item.totalPoints} pts</strong>
                    </span>
                  </div>
                </div>

                {/* Rank Selector / Input */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-body text-xs font-bold text-ink">Rank:</span>
                  <input
                    type="number"
                    min="1"
                    max={eligibleTeams.length}
                    value={item.rank}
                    onChange={(e) =>
                      handleRankChange(item.rosterId, parseInt(e.target.value, 10) || 1)
                    }
                    className="w-16 border-2 border-ink bg-white px-2 py-1 text-center font-display font-bold text-sm shadow-[1px_1px_0_var(--ink)] focus:outline-none focus:bg-yellow/20"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Footer Actions */}
          <div className="mt-4 flex items-center justify-between border-t-2 border-ink pt-3 shrink-0">
            <span className="text-[11px] font-body text-ink/60">
              {rankConflict ? (
                <span className="text-pink font-bold flex items-center gap-1">
                  <AlertTriangleIcon size={13} /> Duplicate rank detected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-ink/70">
                  <CheckIcon size={13} className="text-forest" /> All ranks are unique
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              <Button type="button" onClick={onClose} variant="underline" className="text-xs">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveRankings}
                disabled={isSaving || rankConflict}
                variant="primary"
                className="text-xs font-bold cursor-pointer flex items-center gap-1.5"
              >
                {isSaving ? "Locking In..." : (
                  <>
                    <TrophyIcon size={14} className="text-yellow" />
                    Confirm & Save Placements
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
