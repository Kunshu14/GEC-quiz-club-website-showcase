import { redirect } from "next/navigation";
import Link from "next/link";
import { getViewer, hasPermission } from "@/lib/access";
import { getAlumniDirectory } from "@/lib/alumni";
import {
  Button,
  CardShell,
  FramedPanel,
  HighlighterMark,
  Tag,
  TrophyIcon,
  MedalIcon,
} from "@/components/ui";
import { AppHeader } from "@/components/ui/AppHeader";

export const dynamic = "force-dynamic";

export default async function AlumniPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; year?: string }>;
}) {
  const viewer = await getViewer();
  if (viewer.kind === "anonymous") redirect("/");
  if (viewer.kind === "revoked") redirect("/access-revoked");
  if (viewer.kind === "unregistered") redirect("/request-access");

  const canManage = await hasPermission(viewer.user, "manage_users");

  const { q: searchQuery, year: yearFilter } = await searchParams;

  const directory = await getAlumniDirectory();

  // Filter in memory for responsiveness
  const filteredGroups = directory.groups
    .map((group) => {
      // Filter by year if specified
      if (yearFilter && yearFilter !== "ALL") {
        if (yearFilter === "UNKNOWN" && group.year !== null) return null;
        if (yearFilter !== "UNKNOWN" && String(group.year) !== yearFilter) return null;
      }

      // Filter by search query if specified
      let members = group.members;
      if (searchQuery && searchQuery.trim().length > 0) {
        const query = searchQuery.trim().toLowerCase();
        members = members.filter(
          (m) =>
            m.name.toLowerCase().includes(query) ||
            m.email.toLowerCase().includes(query) ||
            m.quizzesHostedList.some((qh) => qh.title.toLowerCase().includes(query))
        );
      }

      if (members.length === 0) return null;

      return {
        ...group,
        members,
      };
    })
    .filter((g): g is NonNullable<typeof g> => g !== null);

  const availableYears = directory.groups
    .map((g) => g.year)
    .filter((y): y is number => y !== null);

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader
        userRole={viewer.user.role.name}
        userName={viewer.user.name}
        canManage={canManage}
      />

      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-10 px-6 py-12 sm:px-10">
        {/* Page Header */}
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-body text-xs font-bold uppercase tracking-widest text-ink/70">
                Council Roll of Honor
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-heading tracking-tight">
              <HighlighterMark tone="yellow">Alumni</HighlighterMark> Archive
            </h1>
            <p className="mt-2 max-w-2xl font-body text-sm text-ink/80">
              Honoring past council members, quizmasters, and pioneers who shaped the GEC Quiz Club.
              Organized by graduating year with lifetime contributions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button as="a" href="/dashboard" variant="alt">
              ← Dashboard
            </Button>
            <Button as="a" href="/leaderboard" variant="alt">
              <TrophyIcon size={14} className="mr-1.5" /> Leaderboards
            </Button>
          </div>
        </div>

        {/* All-Time Lifetime Impact Metrics */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <CardShell tone="mint" className="flex flex-col gap-1 p-4">
            <span className="font-body text-xs font-bold uppercase tracking-wider text-ink/70">
              Total Alumni
            </span>
            <span className="font-heading text-3xl text-ink">
              {directory.totalAlumni}
            </span>
          </CardShell>

          <CardShell tone="yellow" className="flex flex-col gap-1 p-4">
            <span className="font-body text-xs font-bold uppercase tracking-wider text-ink/70">
              Questions Authored
            </span>
            <span className="font-heading text-3xl text-ink">
              {directory.totalQuestionsWritten}
            </span>
          </CardShell>

          <CardShell tone="lavender" className="flex flex-col gap-1 p-4">
            <span className="font-body text-xs font-bold uppercase tracking-wider text-ink/70">
              Quizzes Hosted
            </span>
            <span className="font-heading text-3xl text-ink">
              {directory.totalQuizzesHosted}
            </span>
          </CardShell>

          <CardShell tone="pink" className="flex flex-col gap-1 p-4">
            <span className="font-body text-xs font-bold uppercase tracking-wider text-ink/70">
              Championships Won
            </span>
            <span className="font-heading text-3xl text-ink">
              {directory.totalChampionships}
            </span>
          </CardShell>
        </div>

        {/* Search & Filter Bar */}
        <CardShell tone="cream" className="p-4">
          <form method="GET" className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[240px]">
              <label htmlFor="alumni-search" className="block font-body text-xs font-bold uppercase tracking-wide mb-1 text-ink/80">
                Search by name or email
              </label>
              <input
                id="alumni-search"
                type="text"
                name="q"
                defaultValue={searchQuery ?? ""}
                placeholder="Search alumni..."
                className="w-full border-[3px] border-ink bg-cream px-3 py-2 font-body text-sm text-ink placeholder:text-ink/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-ink"
              />
            </div>

            <div className="w-full sm:w-auto min-w-[180px]">
              <label htmlFor="alumni-year" className="block font-body text-xs font-bold uppercase tracking-wide mb-1 text-ink/80">
                Graduating Class
              </label>
              <select
                id="alumni-year"
                name="year"
                defaultValue={yearFilter ?? "ALL"}
                className="w-full border-[3px] border-ink bg-cream px-3 py-2 font-body text-sm text-ink uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-ink"
              >
                <option value="ALL">All Graduating Classes</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={String(yr)}>
                    Class of {yr}
                  </option>
                ))}
                <option value="UNKNOWN">Pioneers / Unspecified</option>
              </select>
            </div>

            <div className="flex gap-2">
              <Button type="submit" variant="primary">
                Filter
              </Button>
              {(searchQuery || (yearFilter && yearFilter !== "ALL")) && (
                <Button as="a" href="/alumni" variant="alt">
                  Clear
                </Button>
              )}
            </div>
          </form>
        </CardShell>

        {/* Directory Listings Grouped by Class Year */}
        {filteredGroups.length === 0 ? (
          /* Section 3.6 compliant empty state */
          <FramedPanel tone="yellow" className="flex flex-col items-center justify-center p-12 text-center">
            <h2 className="text-2xl font-heading mb-2">No alumni records found</h2>
            <p className="max-w-md font-body text-sm text-ink/80 mb-6">
              {searchQuery || yearFilter
                ? "No past members match your current search or class filter. Clear the filters to view the complete alumni roll."
                : "No members have graduated or transitioned to alumni status yet. When active members leave the council, their lifetime records are archived here."}
            </p>
            <div className="flex gap-3">
              {(searchQuery || yearFilter) ? (
                <Button as="a" href="/alumni" variant="primary">
                  View all alumni
                </Button>
              ) : (
                <Button as="a" href="/dashboard" variant="primary">
                  Return to dashboard
                </Button>
              )}
            </div>
          </FramedPanel>
        ) : (
          <div className="flex flex-col gap-12">
            {filteredGroups.map((group) => (
              <section key={group.displayYear} className="flex flex-col gap-5">
                <div className="flex items-center gap-3 border-b-[3px] border-ink pb-2">
                  <h2 className="text-2xl font-heading text-ink">
                    {group.displayYear}
                  </h2>
                  <Tag tone="ink">{group.members.length} {group.members.length === 1 ? "member" : "members"}</Tag>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {group.members.map((alumnus) => (
                    <CardShell
                      key={alumnus.id}
                      tone="cream"
                      className="flex flex-col justify-between p-6 transition-transform hover:-translate-y-1"
                    >
                      <div>
                        {/* Member Header */}
                        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                          <div>
                            <h3 className="font-heading text-xl text-ink">
                              {alumnus.name}
                            </h3>
                            <p className="font-body text-xs text-ink/60">
                              {alumnus.email}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {alumnus.graduatingYear ? (
                              <Tag tone="mint">Class &apos;{String(alumnus.graduatingYear).slice(-2)}</Tag>
                            ) : (
                              <Tag tone="yellow">Pioneer</Tag>
                            )}
                            {alumnus.wasAdmin && (
                              <Tag tone="pink">Former Admin</Tag>
                            )}
                          </div>
                        </div>

                        {/* All-Time Lifetime Contribution Stats Grid */}
                        <div className="my-4 grid grid-cols-3 gap-2 rounded-none border-[2px] border-ink bg-white/60 p-3 text-center">
                          <div>
                            <span className="block font-heading text-lg text-ink">
                              {alumnus.stats.questionsSubmitted}
                            </span>
                            <span className="block font-body text-[10px] font-bold uppercase tracking-wider text-ink/70">
                              Questions ({alumnus.stats.questionsUsed} used)
                            </span>
                          </div>

                          <div>
                            <span className="block font-heading text-lg text-ink">
                              {alumnus.stats.quizzesHosted}
                            </span>
                            <span className="block font-body text-[10px] font-bold uppercase tracking-wider text-ink/70">
                              Quizzes Hosted
                            </span>
                          </div>

                          <div>
                            <span className="block font-heading text-lg text-ink">
                              {alumnus.stats.tournamentWins}
                            </span>
                            <span className="block font-body text-[10px] font-bold uppercase tracking-wider text-ink/70">
                              Championships
                            </span>
                          </div>
                        </div>

                        {/* Quizzes Hosted List */}
                        {alumnus.quizzesHostedList.length > 0 && (
                          <div className="mt-3">
                            <span className="font-body text-[11px] font-bold uppercase tracking-wider text-ink/70">
                              Conducted Quizzes:
                            </span>
                            <ul className="mt-1 space-y-1">
                              {alumnus.quizzesHostedList.slice(0, 3).map((q) => (
                                <li key={q.id} className="font-body text-xs text-ink/85 flex items-center gap-1.5">
                                  <span className="text-ink/40">★</span>
                                  <Link
                                    href={`/quizzes/${q.id}`}
                                    className="font-bold underline decoration-ink/40 hover:decoration-ink"
                                  >
                                    {q.title}
                                  </Link>
                                </li>
                              ))}
                              {alumnus.quizzesHostedList.length > 3 && (
                                <li className="font-body text-xs italic text-ink/60 pl-3">
                                  + {alumnus.quizzesHostedList.length - 3} more tournaments
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Footer Info */}
                      <div className="mt-4 pt-3 border-t border-ink/10 flex items-center justify-between text-[11px] font-body text-ink/50">
                        <span>Member since {new Date(alumnus.joinedAt).getFullYear()}</span>
                        {alumnus.stats.tournamentPodiums > 0 && (
                          <span className="font-bold text-ink/80 inline-flex items-center gap-1">
                            <MedalIcon size={12} className="text-yellow" /> {alumnus.stats.tournamentPodiums} Career Podiums
                          </span>
                        )}
                      </div>
                    </CardShell>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
