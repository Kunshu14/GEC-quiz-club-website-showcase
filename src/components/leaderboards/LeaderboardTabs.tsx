"use client";

import { useState } from "react";
import { Button, PencilIcon, TrophyIcon, SparklesIcon, RefreshIcon } from "@/components/ui";
import { SubmissionsLeaderboard } from "./SubmissionsLeaderboard";
import { WinnerLeaderboard } from "./WinnerLeaderboard";
import { TriviaStatsCards } from "./TriviaStatsCards";
import type {
  SubmissionsLeaderboardEntry,
  WinnerLeaderboardEntry,
  DerivedStats,
} from "@/lib/leaderboards";

interface LeaderboardTabsProps {
  initialSubmissions: {
    entries: SubmissionsLeaderboardEntry[];
    availableYears: string[];
    totalContributors: number;
  };
  initialWinners: {
    entries: WinnerLeaderboardEntry[];
    availableYears: string[];
    totalChampions: number;
  };
  initialTrivia: DerivedStats;
}

export function LeaderboardTabs({
  initialSubmissions,
  initialWinners,
  initialTrivia,
}: LeaderboardTabsProps) {
  const [activeTab, setActiveTab] = useState<"submissions" | "winners" | "trivia">(
    "submissions"
  );
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recalcSuccess, setRecalcSuccess] = useState<string | null>(null);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    setRecalcSuccess(null);
    try {
      const res = await fetch("/api/leaderboards/recalculate", {
        method: "POST",
      });
      if (res.ok) {
        setRecalcSuccess("Leaderboard stats recomputed & fresh!");
        // Refresh after 1 second so page gets new data
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        setRecalcSuccess("Failed to recalculate.");
      }
    } catch (e) {
      console.error(e);
      setRecalcSuccess("Network error recalculating.");
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Tab Switcher & Refresh Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-[3px] border-ink pb-4">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setActiveTab("submissions")}
            className={`flex items-center gap-2 border-[3px] border-ink px-4 py-2 font-heading text-sm font-bold shadow-sm transition-transform active:translate-x-0.5 active:translate-y-0.5 cursor-pointer ${
              activeTab === "submissions"
                ? "bg-yellow text-ink"
                : "bg-cream text-ink hover:bg-yellow/30"
            }`}
          >
            <PencilIcon size={16} />
            <span>Council Submissions</span>
            <span className="ml-1 rounded-full border-2 border-ink bg-ink px-2 py-0.5 text-xs text-cream">
              {initialSubmissions.totalContributors}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("winners")}
            className={`flex items-center gap-2 border-[3px] border-ink px-4 py-2 font-heading text-sm font-bold shadow-sm transition-transform active:translate-x-0.5 active:translate-y-0.5 cursor-pointer ${
              activeTab === "winners"
                ? "bg-pink text-cream"
                : "bg-cream text-ink hover:bg-pink/20"
            }`}
          >
            <TrophyIcon size={16} />
            <span>Quizzing Champions</span>
            <span className="ml-1 rounded-full border-2 border-ink bg-cream px-2 py-0.5 text-xs text-ink">
              {initialWinners.totalChampions}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("trivia")}
            className={`flex items-center gap-2 border-[3px] border-ink px-4 py-2 font-heading text-sm font-bold shadow-sm transition-transform active:translate-x-0.5 active:translate-y-0.5 cursor-pointer ${
              activeTab === "trivia"
                ? "bg-mint text-ink"
                : "bg-cream text-ink hover:bg-mint/30"
            }`}
          >
            <SparklesIcon size={16} />
            <span>Hall of Fame & Trivia</span>
          </button>
        </div>

        {/* Recalculate Trigger */}
        <div className="flex items-center gap-3">
          {recalcSuccess && (
            <span className="border-[3px] border-ink bg-mint px-2.5 py-1 font-body text-xs font-bold text-ink shadow-sm">
              {recalcSuccess}
            </span>
          )}
          <button
            onClick={handleRecalculate}
            disabled={isRecalculating}
            className="flex items-center gap-2 border-[3px] border-ink bg-cream px-3.5 py-2 font-heading text-xs font-bold text-ink shadow-sm hover:bg-yellow disabled:opacity-50 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
            title="Recalculate all rankings and purge cache"
          >
            <RefreshIcon size={14} className={isRecalculating ? "animate-spin" : ""} />
            <span>{isRecalculating ? "Recalculating..." : "Recalculate Stats"}</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === "submissions" && (
        <SubmissionsLeaderboard
          initialEntries={initialSubmissions.entries}
          availableYears={initialSubmissions.availableYears}
        />
      )}

      {activeTab === "winners" && (
        <WinnerLeaderboard
          initialEntries={initialWinners.entries}
          availableYears={initialWinners.availableYears}
        />
      )}

      {activeTab === "trivia" && <TriviaStatsCards stats={initialTrivia} />}
    </div>
  );
}
