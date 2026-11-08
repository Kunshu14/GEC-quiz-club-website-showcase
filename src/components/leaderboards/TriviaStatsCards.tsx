"use client";

import { Tag, CardShell, ZapIcon, FlameIcon, MedalIcon, TrophyIcon, MicIcon, BookOpenIcon } from "@/components/ui";
import type { DerivedStats } from "@/lib/leaderboards";

interface TriviaStatsCardsProps {
  stats: DerivedStats;
}

export function TriviaStatsCards({ stats }: TriviaStatsCardsProps) {
  return (
    <div className="flex flex-col gap-8">
      {/* Overview Stat Badges */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <CardShell tone="orange" shadow="sm">
          <span className="font-heading text-xs font-bold uppercase tracking-wider text-ink/70">
            Quizzes Hosted
          </span>
          <div className="mt-1 font-heading text-3xl font-black text-ink">
            {stats.totalQuizzesRecorded}
          </div>
          <span className="text-xs text-ink/70">Official tournament records</span>
        </CardShell>

        <CardShell tone="mint" shadow="sm">
          <span className="font-heading text-xs font-bold uppercase tracking-wider text-ink/70">
            Total Quizzers
          </span>
          <div className="mt-1 font-heading text-3xl font-black text-ink">
            {stats.totalParticipantsRecorded}
          </div>
          <span className="text-xs text-ink/70">Registered participants</span>
        </CardShell>

        <CardShell tone="lavender" shadow="sm">
          <span className="font-heading text-xs font-bold uppercase tracking-wider text-ink/70">
            Record Round Score
          </span>
          <div className="mt-1 font-heading text-3xl font-black text-ink">
            {stats.topRoundScores[0]?.points ?? 0} pts
          </div>
          <span className="text-xs text-ink/70">All-time highest round</span>
        </CardShell>

        <CardShell tone="yellow" shadow="sm">
          <span className="font-heading text-xs font-bold uppercase tracking-wider text-ink/70">
            Record Win Streak
          </span>
          <div className="mt-1 font-heading text-3xl font-black text-ink">
            {stats.longestWinStreaks[0]?.streakLength ?? 0} Quizzes
          </div>
          <span className="text-xs text-ink/70">Consecutive #1 finishes</span>
        </CardShell>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* 1. Highest Single-Round Scores */}
        <CardShell tone="cream" shadow="md">
          <div className="mb-4 flex items-center justify-between border-b-[3px] border-ink pb-3">
            <div className="flex items-center gap-2">
              <ZapIcon size={22} className="text-yellow fill-yellow stroke-ink" />
              <h3 className="font-heading text-lg font-bold text-ink">Highest Single-Round Scores</h3>
            </div>
            <Tag tone="yellow">Historic Highs</Tag>
          </div>

          {stats.topRoundScores.length === 0 ? (
            <p className="py-6 text-center font-body text-sm text-ink/60">
              No round scores recorded yet. Complete Phase 6 scoresheets to populate this board.
            </p>
          ) : (
            <div className="flex flex-col divide-y-[3px] divide-ink/10">
              {stats.topRoundScores.map((score, idx) => (
                <div key={score.scoreId} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink bg-cream font-heading text-xs font-bold text-ink">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="font-heading font-bold text-ink">
                        {score.teamName || `Seat #${score.seatNo}`}
                        <span className="ml-2 font-normal text-xs text-ink/60">
                          ({score.roundLabel})
                        </span>
                      </div>
                      <div className="font-body text-xs text-ink/70">
                        {score.quizTitle} · {new Date(score.quizDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                      </div>
                      {score.teamMembers.length > 0 && (
                        <div className="mt-1 text-xs text-ink/60">
                          Players: {score.teamMembers.map((m) => m.name).join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-heading text-2xl font-black text-ink">
                      {score.points}
                    </span>
                    <div className="font-heading text-[10px] font-bold uppercase text-ink/60">
                      Points
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardShell>

        {/* 2. Longest Win Streaks */}
        <CardShell tone="cream" shadow="md">
          <div className="mb-4 flex items-center justify-between border-b-[3px] border-ink pb-3">
            <div className="flex items-center gap-2">
              <FlameIcon size={22} className="text-pink" />
              <h3 className="font-heading text-lg font-bold text-ink">Longest Consecutive Win Streaks</h3>
            </div>
            <Tag tone="pink">Unbroken Streaks</Tag>
          </div>

          {stats.longestWinStreaks.length === 0 ? (
            <p className="py-6 text-center font-body text-sm text-ink/60">
              No win streaks recorded yet. A participant must win consecutive tournaments to register here.
            </p>
          ) : (
            <div className="flex flex-col divide-y-[3px] divide-ink/10">
              {stats.longestWinStreaks.map((streak, idx) => (
                <div key={streak.participantId} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink bg-yellow font-heading text-xs font-bold text-ink">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="font-heading font-bold text-ink">{streak.name}</div>
                      <div className="font-body text-xs text-ink/70">
                        {streak.collegeOrOrg || "Independent"}
                      </div>
                      <div className="mt-1 text-xs text-ink/70">
                        Across: {streak.quizzes.map((q) => q.title).join(" ➔ ")}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-heading text-2xl font-black text-pink">
                      {streak.streakLength}
                    </span>
                    <div className="font-heading text-[10px] font-bold uppercase text-ink/60">
                      Straight Wins
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardShell>

        {/* 3. Season MVPs */}
        <CardShell tone="cream" shadow="md">
          <div className="mb-4 flex items-center justify-between border-b-[3px] border-ink pb-3">
            <div className="flex items-center gap-2">
              <MedalIcon size={22} className="text-yellow" />
              <h3 className="font-heading text-lg font-bold text-ink">Season MVPs (Most Wins / Year)</h3>
            </div>
            <Tag tone="mint">Annual Laureates</Tag>
          </div>

          {stats.seasonMvps.length === 0 ? (
            <p className="py-6 text-center font-body text-sm text-ink/60">
              No season records found yet.
            </p>
          ) : (
            <div className="flex flex-col divide-y-[3px] divide-ink/10">
              {stats.seasonMvps.map((mvp) => (
                <div key={mvp.academicYear} className="flex items-center justify-between py-3">
                  <div>
                    <div className="inline-block border-[3px] border-ink bg-yellow px-2 py-0.5 font-heading text-xs font-bold text-ink shadow-sm">
                      Academic Year {mvp.academicYear}
                    </div>
                    <div className="mt-1 font-heading text-base font-bold text-ink">{mvp.name}</div>
                    <div className="text-xs text-ink/60">
                      Played {mvp.totalPlayed} tournaments in this cycle
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-heading text-2xl font-black text-ink flex items-center justify-end gap-1.5">
                      {mvp.wins} <TrophyIcon size={18} className="text-yellow fill-yellow stroke-ink" />
                    </span>
                    <div className="font-heading text-[10px] font-bold uppercase text-ink/60">
                      Wins
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardShell>

        {/* 4. Quizmaster Hall of Fame */}
        <CardShell tone="cream" shadow="md">
          <div className="mb-4 flex items-center justify-between border-b-[3px] border-ink pb-3">
            <div className="flex items-center gap-2">
              <MicIcon size={22} className="text-ink" />
              <h3 className="font-heading text-lg font-bold text-ink">Quizmaster Hall of Fame</h3>
            </div>
            <Tag tone="lavender">Master Hosts</Tag>
          </div>

          {stats.topQuizmasters.length === 0 ? (
            <p className="py-6 text-center font-body text-sm text-ink/60">
              No quizmasters designated on quizzes yet.
            </p>
          ) : (
            <div className="flex flex-col divide-y-[3px] divide-ink/10">
              {stats.topQuizmasters.map((qm, idx) => (
                <div key={qm.userId} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink bg-mint font-heading text-xs font-bold text-ink">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="font-heading font-bold text-ink">{qm.name}</div>
                      <div className="font-body text-xs text-ink/70">{qm.roleName}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-heading text-2xl font-black text-ink">
                      {qm.hostedCount}
                    </span>
                    <div className="font-heading text-[10px] font-bold uppercase text-ink/60">
                      Quizzes Conducted
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardShell>
      </div>

      {/* 5. Most Active Question Categories */}
      <CardShell tone="cream" shadow="md">
        <div className="mb-4 flex items-center justify-between border-b-[3px] border-ink pb-3">
          <div className="flex items-center gap-2">
            <BookOpenIcon size={22} className="text-ink" />
            <h3 className="font-heading text-lg font-bold text-ink">Question Bank Topic Distribution</h3>
          </div>
          <span className="font-body text-xs text-ink/70">Most submitted & used genres</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.topCategories.map((cat) => (
            <div
              key={cat.categoryId}
              className="border-[3px] border-ink bg-cream p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-heading text-base font-bold text-ink">{cat.categoryName}</span>
                <span className="font-heading text-xs font-bold uppercase text-ink/70">
                  {cat.usageRate}% Used
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="font-body text-xs text-ink/70">
                  Total Questions: <span className="font-bold text-ink">{cat.totalQuestions}</span>
                </span>
                <span className="font-body text-xs text-ink/70">
                  Used in Quizzes: <span className="font-bold text-ink">{cat.usedCount}</span>
                </span>
              </div>
              <div className="mt-2 h-3 w-full overflow-hidden border-[3px] border-ink bg-cream shadow-sm">
                <div
                  className="h-full bg-ink transition-all"
                  style={{ width: `${cat.usageRate}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardShell>
    </div>
  );
}
