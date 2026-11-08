"use client";

import { useState, useMemo } from "react";
import { Tag, CardShell, TrophyIcon, MedalIcon, CrownIcon } from "@/components/ui";
import type { WinnerLeaderboardEntry } from "@/lib/leaderboards";

interface WinnerLeaderboardProps {
  initialEntries: WinnerLeaderboardEntry[];
  availableYears: string[];
}

export function WinnerLeaderboard({
  initialEntries,
  availableYears,
}: WinnerLeaderboardProps) {
  const [selectedYear, setSelectedYear] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [entries, setEntries] = useState<WinnerLeaderboardEntry[]>(initialEntries);
  const [isLoading, setIsLoading] = useState(false);

  const handleYearChange = async (year: string) => {
    setSelectedYear(year);
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("type", "winners");
      if (year !== "ALL") params.set("year", year);

      const res = await fetch(`/api/leaderboards?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
      }
    } catch (err) {
      console.error("Failed to filter winner leaderboard", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.collegeOrOrg && e.collegeOrOrg.toLowerCase().includes(q))
    );
  }, [entries, searchQuery]);

  const top3 = filteredEntries.slice(0, 3);

  return (
    <div className="flex flex-col gap-8">
      {/* Rules Notice */}
      <CardShell tone="cream" shadow="sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center border-[3px] border-ink bg-pink text-cream shadow-sm">
              <TrophyIcon size={22} className="text-cream" />
            </span>
            <div>
              <h3 className="font-heading text-lg font-bold text-ink">Quizzing Champions Leaderboard</h3>
              <p className="font-body text-sm text-ink/80">
                Ranked by official tournament victories (<span className="font-bold text-ink">1st Place / Final Rank = 1</span>).
                Wins are unweighted by team size — solo wins and 5-person team wins both count as <span className="font-bold text-ink">1 full win</span> per teammate.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tag tone="pink">1st Place = 1 Win</Tag>
            <Tag tone="lavender">Podiums = Top 3</Tag>
          </div>
        </div>
      </CardShell>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-[3px] border-ink bg-cream p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <label htmlFor="winner-year" className="font-heading text-xs font-bold uppercase tracking-wider text-ink/70">
            Season:
          </label>
          <select
            id="winner-year"
            value={selectedYear}
            onChange={(e) => handleYearChange(e.target.value)}
            className="border-[3px] border-ink bg-cream px-3 py-1.5 font-heading text-sm font-semibold text-ink shadow-sm focus:outline-none"
          >
            <option value="ALL">All Time</option>
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search champion or college..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 border-[3px] border-ink bg-cream px-3 py-1.5 font-body text-sm text-ink placeholder:text-ink/50 shadow-sm focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="border-[3px] border-ink bg-cream px-2 py-1 text-xs font-bold text-ink shadow-sm hover:bg-yellow"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center border-[3px] border-dashed border-ink/40 bg-cream">
          <p className="font-heading text-base font-bold animate-pulse text-ink">Calculating champions...</p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center border-[3px] border-dashed border-ink/40 bg-cream p-8 text-center">
          <MedalIcon size={32} className="mb-2 text-ink" />
          <p className="font-heading text-lg font-bold text-ink">No tournament records found</p>
          <p className="font-body text-sm text-ink/70">
            Once quizzes are completed and final ranks are recorded in Phase 6 scoresheets, participants will appear here.
          </p>
        </div>
      ) : (
        <>
          {/* Top 3 Champions Podium */}
          {top3.length > 0 && (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {/* #2 */}
              {top3[1] && (
                <CardShell tone="mint" shadow="md" className="order-2 flex flex-col justify-between md:order-1">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-ink bg-cream font-heading text-base font-black text-ink shadow-sm">
                        #2
                      </span>
                      <Tag tone="ink">Runner Up</Tag>
                    </div>
                    <h4 className="mt-3 truncate font-heading text-xl font-bold text-ink">{top3[1].name}</h4>
                    <p className="truncate font-body text-xs text-ink/70">
                      {top3[1].collegeOrOrg || "Independent"}
                    </p>
                    {top3[1].isCouncilMember && (
                      <div className="mt-2">
                        <Tag tone="pink">Council · {top3[1].councilRole}</Tag>
                      </div>
                    )}
                  </div>
                  <div className="mt-5 border-t-[3px] border-ink pt-3">
                    <div className="flex items-baseline justify-between">
                      <span className="font-heading text-3xl font-black text-ink flex items-center gap-1.5">
                        {top3[1].wins} <TrophyIcon size={20} className="text-yellow fill-yellow stroke-ink" />
                      </span>
                      <span className="font-heading text-xs uppercase font-bold text-ink/70">Wins</span>
                    </div>
                    <div className="mt-2 flex justify-between font-body text-xs font-bold text-ink">
                      <span className="flex items-center gap-1">
                        <MedalIcon size={13} className="text-ink/60" /> {top3[1].podiums} Podiums
                      </span>
                      <span>{top3[1].quizzesPlayed} Played</span>
                      <span>{top3[1].winRate}% Win Rate</span>
                    </div>
                  </div>
                </CardShell>
              )}

              {/* #1 */}
              {top3[0] && (
                <CardShell tone="yellow" shadow="lg" className="order-1 flex flex-col justify-between md:order-2 md:-mt-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-ink bg-cream font-heading text-base font-black text-ink shadow-sm">
                        #1
                      </span>
                      <Tag tone="ink" className="inline-flex items-center gap-1">
                        <CrownIcon size={12} className="text-yellow" /> Grand Champion
                      </Tag>
                    </div>
                    <h4 className="mt-4 truncate font-heading text-2xl font-black text-ink">{top3[0].name}</h4>
                    <p className="truncate font-body text-sm text-ink/80">
                      {top3[0].collegeOrOrg || "Independent"}
                    </p>
                    {top3[0].isCouncilMember && (
                      <div className="mt-2">
                        <Tag tone="pink">Council · {top3[0].councilRole}</Tag>
                      </div>
                    )}
                  </div>
                  <div className="mt-6 border-t-[3px] border-ink pt-3">
                    <div className="flex items-baseline justify-between">
                      <span className="font-heading text-4xl font-black text-ink flex items-center gap-1.5">
                        {top3[0].wins} <TrophyIcon size={24} className="text-yellow fill-yellow stroke-ink" />
                      </span>
                      <span className="font-heading text-sm uppercase font-bold text-ink/70">Victories</span>
                    </div>
                    <div className="mt-2 flex justify-between font-body text-xs font-bold text-ink">
                      <span className="flex items-center gap-1">
                        <MedalIcon size={13} className="text-ink/60" /> {top3[0].podiums} Podiums
                      </span>
                      <span>{top3[0].quizzesPlayed} Quizzes</span>
                      <span>{top3[0].winRate}% Win Rate</span>
                    </div>
                  </div>
                </CardShell>
              )}

              {/* #3 */}
              {top3[2] && (
                <CardShell tone="lavender" shadow="md" className="order-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-ink bg-cream font-heading text-base font-black text-ink shadow-sm">
                        #3
                      </span>
                      <Tag tone="ink">3rd Place</Tag>
                    </div>
                    <h4 className="mt-3 truncate font-heading text-xl font-bold text-ink">{top3[2].name}</h4>
                    <p className="truncate font-body text-xs text-ink/70">
                      {top3[2].collegeOrOrg || "Independent"}
                    </p>
                    {top3[2].isCouncilMember && (
                      <div className="mt-2">
                        <Tag tone="pink">Council · {top3[2].councilRole}</Tag>
                      </div>
                    )}
                  </div>
                  <div className="mt-5 border-t-[3px] border-ink pt-3">
                    <div className="flex items-baseline justify-between">
                      <span className="font-heading text-3xl font-black text-ink flex items-center gap-1.5">
                        {top3[2].wins} <TrophyIcon size={20} className="text-yellow fill-yellow stroke-ink" />
                      </span>
                      <span className="font-heading text-xs uppercase font-bold text-ink/70">Wins</span>
                    </div>
                    <div className="mt-2 flex justify-between font-body text-xs font-bold text-ink">
                      <span className="flex items-center gap-1">
                        <MedalIcon size={13} className="text-ink/60" /> {top3[2].podiums} Podiums
                      </span>
                      <span>{top3[2].quizzesPlayed} Played</span>
                      <span>{top3[2].winRate}% Win Rate</span>
                    </div>
                  </div>
                </CardShell>
              )}
            </div>
          )}

          {/* Full Table */}
          <div className="border-[3px] border-ink bg-cream shadow-md">
            <div className="border-b-[3px] border-ink bg-cream px-6 py-4">
              <h4 className="font-heading text-base font-bold text-ink">All Competitors ({filteredEntries.length})</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-body text-sm">
                <thead>
                  <tr className="border-b-[3px] border-ink bg-ink font-heading text-xs font-bold uppercase tracking-wider text-cream">
                    <th className="px-5 py-3">Rank</th>
                    <th className="px-5 py-3">Participant</th>
                    <th className="px-5 py-3">Affiliation</th>
                    <th className="px-5 py-3 text-right">Wins (1st)</th>
                    <th className="px-5 py-3 text-right">Podiums (Top 3)</th>
                    <th className="px-5 py-3 text-right">Played</th>
                    <th className="px-5 py-3 text-right">Win Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y-[3px] divide-ink/10">
                  {filteredEntries.map((entry) => (
                    <tr
                      key={entry.participantId}
                      className="hover:bg-yellow/20 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink font-heading text-xs font-bold ${
                            entry.rank === 1
                              ? "bg-yellow text-ink"
                              : entry.rank === 2
                              ? "bg-mint text-ink"
                              : entry.rank === 3
                              ? "bg-lavender text-ink"
                              : "bg-cream text-ink"
                          }`}
                        >
                          {entry.rank}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-heading font-bold text-ink">{entry.name}</span>
                          {entry.isCouncilMember && (
                            <Tag tone="mint">Council</Tag>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-ink/70">
                        {entry.collegeOrOrg || "—"}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="font-heading text-lg font-black text-ink">
                          {entry.wins}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-ink">
                        {entry.podiums}
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-ink/70">
                        {entry.quizzesPlayed}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span
                          className={`border-2 border-ink px-2 py-0.5 text-xs font-bold ${
                            entry.winRate >= 50
                              ? "bg-yellow text-ink"
                              : entry.winRate > 0
                              ? "bg-mint text-ink"
                              : "bg-cream text-ink"
                          }`}
                        >
                          {entry.winRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
