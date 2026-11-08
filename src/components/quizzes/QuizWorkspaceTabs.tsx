"use client";

import { useState } from "react";
import { SpreadsheetIcon, TicketIcon, ZapIcon } from "@/components/ui";
import { Globe } from "lucide-react";
import { RosterChecklist, RosterItem } from "../roster/RosterChecklist";
import { ScoreSheet } from "../scoring/ScoreSheet";

interface QuizWorkspaceTabsProps {
  quizId: string;
  quizTitle?: string;
  canEdit: boolean;
  initialRoster: RosterItem[];
  overviewContent: React.ReactNode;
  mode?: "IN_PERSON" | "ONLINE" | "HYBRID";
  venueOrPlatform?: string | null;
  initialTab?: "overview" | "roster" | "scoring";
}

export function QuizWorkspaceTabs({
  quizId,
  quizTitle = "Quiz",
  canEdit,
  initialRoster,
  overviewContent,
  mode = "IN_PERSON",
  venueOrPlatform,
  initialTab = "overview",
}: QuizWorkspaceTabsProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "roster" | "scoring">(initialTab);
  const [roster, setRoster] = useState<RosterItem[]>(initialRoster);

  const isOnline = mode === "ONLINE" || mode === "HYBRID";
  const seatedCount = roster.filter((r) => r.seatNo !== null && r.status !== "NO_SHOW").length;
  const totalCount = roster.length;

  return (
    <div className="flex flex-col gap-6">
      {/* Neo-brutalist Main Workspace Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b-[3px] border-ink pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`border-[2.5px] border-ink px-4 py-2 font-display text-sm font-black transition-all cursor-pointer ${
            activeTab === "overview"
              ? "bg-yellow text-ink shadow-[3px_3px_0_var(--ink)] -translate-y-0.5"
              : "bg-white text-ink/75 hover:bg-cream"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <SpreadsheetIcon size={14} /> Overview & Running Order
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("roster")}
          className={`border-[2.5px] border-ink px-4 py-2 font-display text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "roster"
              ? "bg-yellow text-ink shadow-[3px_3px_0_var(--ink)] -translate-y-0.5"
              : "bg-white text-ink/75 hover:bg-cream"
          }`}
        >
          <span className="flex items-center gap-1.5">
            {isOnline ? (
              <Globe size={14} strokeWidth={2.5} className="inline-block shrink-0" />
            ) : (
              <TicketIcon size={14} />
            )}
            {isOnline ? "Breakouts & Roster" : "Roster & Check-In"}
          </span>
          <span className="rounded-xs border border-ink bg-white px-1.5 py-0.2 font-mono text-[11px] font-bold text-ink">
            {seatedCount}/{totalCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("scoring")}
          className={`border-[2.5px] border-ink px-4 py-2 font-display text-sm font-black transition-all cursor-pointer ${
            activeTab === "scoring"
              ? "bg-yellow text-ink shadow-[3px_3px_0_var(--ink)] -translate-y-0.5"
              : "bg-white text-ink/75 hover:bg-cream"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <ZapIcon size={14} /> Live Scoring & Results
          </span>
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === "overview" && <div>{overviewContent}</div>}

        {activeTab === "roster" && (
          <RosterChecklist
            quizId={quizId}
            initialRoster={roster}
            canEdit={canEdit}
            mode={mode}
            venueOrPlatform={venueOrPlatform}
            onRosterUpdated={async () => {
              try {
                const res = await fetch(`/api/quizzes/${quizId}/roster`);
                if (res.ok) {
                  const data = await res.json();
                  setRoster(data.roster || []);
                }
              } catch {
                // ignore
              }
            }}
          />
        )}

        {activeTab === "scoring" && (
          <ScoreSheet
            quizId={quizId}
            quizTitle={quizTitle}
            canEdit={canEdit}
            initialRoster={roster}
          />
        )}
      </div>
    </div>
  );
}
