import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/access";
import {
  getSubmissionsLeaderboard,
  getWinnerLeaderboard,
  getDerivedStats,
  getMemberStanding,
} from "@/lib/leaderboards";
import { LeaderboardTabs } from "@/components/leaderboards/LeaderboardTabs";
import { Button, Tag, HighlighterMark, CardShell, MedalIcon, TrophyIcon, WorkspaceNavbar } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leaderboards & Stats | GEC Quiz Club",
  description:
    "Official council question submission rankings, tournament champions leaderboard, and historic quizzing records.",
};

export default async function LeaderboardPage() {
  const viewer = await getViewer();
  if (viewer.kind === "anonymous") redirect("/");
  if (viewer.kind === "revoked") redirect("/access-revoked");
  if (viewer.kind === "unregistered") redirect("/request-access");

  // Fetch all leaderboard datasets in parallel
  const [submissions, winners, trivia] = await Promise.all([
    getSubmissionsLeaderboard(),
    getWinnerLeaderboard(),
    getDerivedStats(),
  ]);

  // Fetch personal standing if logged in as a council member
  const memberStanding =
    viewer.kind === "member" ? await getMemberStanding(viewer.user.id) : null;

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <WorkspaceNavbar />
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-8 px-4 sm:px-6 py-8">
        {/* Top Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl sm:text-4xl font-black">
              Club <HighlighterMark tone="yellow">Leaderboards</HighlighterMark> & Records
            </h1>
            <p className="mt-2 max-w-2xl font-body text-xs sm:text-sm text-neutral-600">
              Celebrating council contributors who fuel the question bank and the tournament champions who conquer the podium.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button as="a" href="/questions/new" variant="primary" className="text-xs">
              + Submit Question
            </Button>
          </div>
        </div>

      {/* Personal Standing Card (if Member) */}
      {memberStanding && (
        <CardShell tone="yellow" shadow="md">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-ink bg-cream shadow-sm">
                <MedalIcon size={22} className="text-yellow" />
              </span>
              <div>
                <span className="font-heading text-xs font-bold uppercase tracking-wider text-ink/70">
                  Your Personal Standing
                </span>
                <h3 className="font-heading text-xl font-bold text-ink">
                  {viewer.kind === "member" && (viewer.name ?? viewer.email)}
                </h3>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="border-[3px] border-ink bg-cream px-3.5 py-2 shadow-sm">
                <div className="font-heading text-[10px] font-bold uppercase text-ink/70">
                  Council Submissions
                </div>
                <div className="font-heading text-lg font-black text-ink">
                  {memberStanding.submissionRank ? `#${memberStanding.submissionRank}` : "Unranked"} · {memberStanding.submissionPoints} pts
                </div>
              </div>

              <div className="border-[3px] border-ink bg-cream px-3.5 py-2 shadow-sm">
                <div className="font-heading text-[10px] font-bold uppercase text-ink/70">
                  Bank Contributions
                </div>
                <div className="font-heading text-lg font-black text-ink">
                  {memberStanding.usedQuestionsCount} Used · {memberStanding.approvedQuestionsCount} Approved
                </div>
              </div>

              {memberStanding.linkedParticipant && (
                <div className="border-[3px] border-ink bg-cream px-3.5 py-2 shadow-sm">
                  <div className="font-heading text-[10px] font-bold uppercase text-ink/70">
                    Player Tournament Rank
                  </div>
                  <div className="font-heading text-lg font-black text-ink">
                    {memberStanding.linkedParticipant.winnerRank
                      ? `#${memberStanding.linkedParticipant.winnerRank}`
                      : "Unranked"}{" "}
                    · {memberStanding.linkedParticipant.wins} Wins <TrophyIcon size={16} className="text-yellow fill-yellow stroke-ink inline ml-0.5 align-middle" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardShell>
      )}

      {/* Main Leaderboard Tabs */}
      <LeaderboardTabs
        initialSubmissions={submissions}
        initialWinners={winners}
        initialTrivia={trivia}
      />
    </main>
  </div>
);
}
