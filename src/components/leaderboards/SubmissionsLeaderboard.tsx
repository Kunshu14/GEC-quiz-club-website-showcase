"use client";

import { useState, useMemo } from "react";
import { Tag, CardShell, PencilIcon, TargetIcon, CheckIcon, CrownIcon } from "@/components/ui";
import type { SubmissionsLeaderboardEntry } from "@/lib/leaderboards";

interface SubmissionsLeaderboardProps {
  initialEntries: SubmissionsLeaderboardEntry[];
  availableYears: string[];
}

export function SubmissionsLeaderboard({
  initialEntries,
  availableYears,
}: SubmissionsLeaderboardProps) {
  const [selectedYear, setSelectedYear] = useState<string>("ALL");
  const [selectedSemester, setSelectedSemester] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [entries, setEntries] = useState<SubmissionsLeaderboardEntry[]>(initialEntries);
  const [isLoading, setIsLoading] = useState(false);

  // Filter or re-fetch when academic year or semester changes
  const handleFilterChange = async (year: string, semester: string) => {
    setSelectedYear(year);
    setSelectedSemester(semester);
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("type", "submissions");
      if (year !== "ALL") params.set("year", year);
      if (semester !== "ALL") params.set("semester", semester);

      const res = await fetch(`/api/leaderboards?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
      }
    } catch (err) {
      console.error("Failed to filter submissions leaderboard", err);
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
        e.email.toLowerCase().includes(q) ||
        e.roleName.toLowerCase().includes(q)
    );
  }, [entries, searchQuery]);

  // Top 3 podium
  const top3 = filteredEntries.slice(0, 3);

  return (
    <div className="flex flex-col gap-8">
      {/* Scoring Rule Callout */}
      <CardShell tone="cream" shadow="sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center border-[3px] border-ink bg-yellow font-bold shadow-sm">
              <PencilIcon size={20} className="text-ink" />
            </span>
            <div>
              <h3 className="font-heading text-lg font-bold text-ink">Council Submissions Scoring</h3>
              <p className="font-body text-sm text-ink/80">
                <span className="font-bold text-ink">Approved question = 1 pt</span> ·{" "}
                <span className="font-bold text-ink">Used in a quiz = 5 pts</span> ·{" "}
                <span className="italic">Furthest-stage rule applies (points do not stack: used = 5, not 6)</span>. Unreviewed submissions earn 0.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tag tone="mint">1 pt Approved</Tag>
            <Tag tone="pink">5 pts Used</Tag>
          </div>
        </div>
      </CardShell>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-[3px] border-ink bg-cream p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          {/* Academic Year Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="year-select" className="font-heading text-xs font-bold uppercase tracking-wider text-ink/70">
              Academic Year:
            </label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={(e) => handleFilterChange(e.target.value, selectedSemester)}
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

          {/* Semester Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="semester-select" className="font-heading text-xs font-bold uppercase tracking-wider text-ink/70">
              Semester:
            </label>
            <select
              id="semester-select"
              value={selectedSemester}
              onChange={(e) => handleFilterChange(selectedYear, e.target.value)}
              className="border-[3px] border-ink bg-cream px-3 py-1.5 font-heading text-sm font-semibold text-ink shadow-sm focus:outline-none"
            >
              <option value="ALL">All Semesters</option>
              <option value="Autumn">Autumn (Jul–Dec)</option>
              <option value="Spring">Spring (Jan–Jun)</option>
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search contributor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-56 border-[3px] border-ink bg-cream px-3 py-1.5 font-body text-sm text-ink placeholder:text-ink/50 shadow-sm focus:outline-none"
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
          <p className="font-heading text-base font-bold animate-pulse text-ink">Calculating standings...</p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <CardShell tone="cream" className="py-12 text-center">
          <p className="font-body text-base text-ink/70">
            No submissions recorded for the selected filters.
          </p>
        </CardShell>
      ) : (
        <>
          {/* Top 3 Podium (Shown only when not searching and at least 3 entries) */}
          {!searchQuery && top3.length >= 1 && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* #2 Silver / Mint */}
              {top3[1] && (
                <CardShell tone="mint" shadow="md" className="order-2 flex flex-col justify-between md:order-1">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-ink bg-cream font-heading text-base font-black text-ink shadow-sm">
                        #2
                      </span>
                      <Tag tone="ink">Silver Podia</Tag>
                    </div>
                    <h4 className="mt-3 truncate font-heading text-xl font-bold text-ink">{top3[1].name}</h4>
                    <p className="truncate font-body text-xs text-ink/70">{top3[1].email}</p>
                    <div className="mt-2">
                      <Tag tone="yellow">{top3[1].roleName}</Tag>
                    </div>
                  </div>
                  <div className="mt-5 border-t-[3px] border-ink pt-3">
                    <div className="flex items-baseline justify-between">
                      <span className="font-heading text-3xl font-black text-ink">{top3[1].totalPoints}</span>
                      <span className="font-heading text-xs uppercase font-bold text-ink/70">Points</span>
                    </div>
                    <div className="mt-2 flex justify-between font-body text-xs font-bold text-ink">
                      <span className="flex items-center gap-1">
                        <TargetIcon size={12} /> {top3[1].usedCount} Used
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckIcon size={12} className="text-forest" /> {top3[1].approvedCount} Appr.
                      </span>
                      <span>{top3[1].acceptanceRate}% Rate</span>
                    </div>
                  </div>
                </CardShell>
              )}

              {/* #1 Gold / Yellow */}
              {top3[0] && (
                <CardShell tone="yellow" shadow="lg" className="order-1 flex flex-col justify-between md:order-2 md:-mt-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-ink bg-cream font-heading text-base font-black text-ink shadow-sm">
                        #1
                      </span>
                      <Tag tone="ink" className="inline-flex items-center gap-1">
                        <CrownIcon size={12} className="text-yellow" /> Grand Scribe
                      </Tag>
                    </div>
                    <h4 className="mt-4 truncate font-heading text-2xl font-black text-ink">{top3[0].name}</h4>
                    <p className="truncate font-body text-sm text-ink/80">{top3[0].email}</p>
                    <div className="mt-2">
                      <Tag tone="pink">{top3[0].roleName}</Tag>
                    </div>
                  </div>
                  <div className="mt-6 border-t-[3px] border-ink pt-3">
                    <div className="flex items-baseline justify-between">
                      <span className="font-heading text-4xl font-black text-ink">{top3[0].totalPoints}</span>
                      <span className="font-heading text-sm uppercase font-bold text-ink/70">Points</span>
                    </div>
                    <div className="mt-2 flex justify-between font-body text-xs font-bold text-ink">
                      <span className="flex items-center gap-1">
                        <TargetIcon size={12} /> {top3[0].usedCount} Used
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckIcon size={12} className="text-forest" /> {top3[0].approvedCount} Appr.
                      </span>
                      <span>{top3[0].acceptanceRate}% Rate</span>
                    </div>
                  </div>
                </CardShell>
              )}

              {/* #3 Bronze / Lavender */}
              {top3[2] && (
                <CardShell tone="lavender" shadow="md" className="order-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-ink bg-cream font-heading text-base font-black text-ink shadow-sm">
                        #3
                      </span>
                      <Tag tone="ink">Bronze Podia</Tag>
                    </div>
                    <h4 className="mt-3 truncate font-heading text-xl font-bold text-ink">{top3[2].name}</h4>
                    <p className="truncate font-body text-xs text-ink/70">{top3[2].email}</p>
                    <div className="mt-2">
                      <Tag tone="mint">{top3[2].roleName}</Tag>
                    </div>
                  </div>
                  <div className="mt-5 border-t-[3px] border-ink pt-3">
                    <div className="flex items-baseline justify-between">
                      <span className="font-heading text-3xl font-black text-ink">{top3[2].totalPoints}</span>
                      <span className="font-heading text-xs uppercase font-bold text-ink/70">Points</span>
                    </div>
                    <div className="mt-2 flex justify-between font-body text-xs font-bold text-ink">
                      <span className="flex items-center gap-1">
                        <TargetIcon size={12} /> {top3[2].usedCount} Used
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckIcon size={12} className="text-forest" /> {top3[2].approvedCount} Appr.
                      </span>
                      <span>{top3[2].acceptanceRate}% Rate</span>
                    </div>
                  </div>
                </CardShell>
              )}
            </div>
          )}

          {/* Full Standings Table */}
          <div className="border-[3px] border-ink bg-cream shadow-md">
            <div className="border-b-[3px] border-ink bg-cream px-6 py-4">
              <h4 className="font-heading text-base font-bold text-ink">All Council Contributors ({filteredEntries.length})</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-body text-sm">
                <thead>
                  <tr className="border-b-[3px] border-ink bg-ink font-heading text-xs font-bold uppercase tracking-wider text-cream">
                    <th className="px-5 py-3">Rank</th>
                    <th className="px-5 py-3">Contributor</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3 text-right">Points</th>
                    <th className="px-5 py-3 text-right">Used (5pt)</th>
                    <th className="px-5 py-3 text-right">Approved (1pt)</th>
                    <th className="px-5 py-3 text-right">Total Subm.</th>
                    <th className="px-5 py-3 text-right">Acceptance</th>
                  </tr>
                </thead>
                <tbody className="divide-y-[3px] divide-ink/10">
                  {filteredEntries.map((entry) => (
                    <tr
                      key={entry.userId}
                      className="hover:bg-yellow/20 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink font-heading text-xs font-bold ${entry.rank === 1
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
                        <div className="font-heading font-bold text-ink">{entry.name}</div>
                        <div className="text-xs text-ink/60">{entry.email}</div>
                      </td>
                      <td className="px-5 py-4">
                        <Tag tone="lavender">{entry.roleName}</Tag>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="font-heading text-lg font-black text-ink">
                          {entry.totalPoints}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-ink">
                        {entry.usedCount}
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-ink">
                        {entry.approvedCount}
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-ink/70">
                        {entry.totalSubmitted}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span
                          className={`border-2 border-ink px-2 py-0.5 text-xs font-bold ${entry.acceptanceRate >= 75
                              ? "bg-mint text-ink"
                              : entry.acceptanceRate >= 40
                                ? "bg-yellow text-ink"
                                : "bg-cream text-ink"
                            }`}
                        >
                          {entry.acceptanceRate}%
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
