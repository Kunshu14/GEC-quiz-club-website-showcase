import { redirect } from "next/navigation";
import {
  Button,
  CardShell,
  FramedPanel,
  HighlighterMark,
  Tag,
  type Tone,
  TrophyIcon,
  LightbulbIcon,
  CalendarIcon,
  MapPinIcon,
  CoinsIcon,
  WorkspaceNavbar,
} from "@/components/ui";
import { DismissibleNotice } from "@/components/ui/DismissibleNotice";
import { prisma } from "@/lib/prisma";
import { getViewer, hasPermission } from "@/lib/access";

export const dynamic = "force-dynamic";

interface QuizzesPageProps {
  searchParams: Promise<{
    q?: string;
    year?: string;
    mode?: string;
    theme?: string;
    deleted?: string;
  }>;
}

const MODE_TONE: Record<string, Tone> = {
  IN_PERSON: "mint",
  ONLINE: "lavender",
  HYBRID: "yellow",
};

export default async function QuizzesPage({ searchParams }: QuizzesPageProps) {
  const { q = "", year = "", mode = "", theme = "", deleted } = await searchParams;

  const viewer = await getViewer();
  if (viewer.kind === "anonymous") redirect("/");
  if (viewer.kind === "revoked") redirect("/access-revoked");
  if (viewer.kind === "unregistered") redirect("/request-access");

  const isMember = viewer.user.role.name === "Member";
  const canBuild =
    ((await hasPermission(viewer.user, "build_quizzes")) ||
    (await hasPermission(viewer.user, "manage_questions")) ||
    viewer.user.role.name === "Admin") &&
    !isMember;

  // Build filters
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { venueOrPlatform: { contains: q, mode: "insensitive" } },
      { format: { contains: q, mode: "insensitive" } },
      { lessonsLearned: { contains: q, mode: "insensitive" } },
    ];
  }

  if (year) {
    where.academicYear = year;
  }

  if (mode) {
    where.mode = mode;
  }

  if (theme) {
    where.themeId = theme;
  }

  const [quizzes, themes, distinctYears] = await Promise.all([
    prisma.quiz.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        theme: true,
        qms: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        usageLogs: {
          include: {
            question: { select: { difficulty: true } },
          },
        },
      },
    }),
    prisma.quizTheme.findMany({ orderBy: { name: "asc" } }),
    prisma.quiz.findMany({
      select: { academicYear: true },
      distinct: ["academicYear"],
      orderBy: { academicYear: "desc" },
    }),
  ]);

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <WorkspaceNavbar />
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-8 px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl">
              <HighlighterMark tone="mint">Quiz</HighlighterMark> repository & history
            </h1>
            <p className="mt-1 font-body text-xs text-ink/70">
              Past quiz archives, running orders, QM lineups, and lessons learned.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {canBuild && (
              <Button as="a" href="/quizzes/new" variant="primary" className="text-xs">
                + Build new quiz
              </Button>
            )}
          </div>
        </div>

      {deleted && (
        <DismissibleNotice tone="mint" paramToClear="deleted" className="max-w-2xl">
          Quiz successfully deleted from archive.
        </DismissibleNotice>
      )}

      {/* Filter Toolbar */}
      <CardShell tone="cream" className="p-4">
        <form method="GET" action="/quizzes" className="flex flex-wrap items-end gap-3 font-body text-xs">
          <div className="flex min-w-[200px] flex-1 flex-col gap-1">
            <label htmlFor="q" className="font-bold uppercase tracking-wider">
              Search
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Search title, venue, notes..."
              className="border-3 border-ink bg-white px-3 py-2 text-sm shadow-[2px_2px_0_var(--ink)] focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="year" className="font-bold uppercase tracking-wider">
              Academic Year
            </label>
            <select
              id="year"
              name="year"
              defaultValue={year}
              className="border-3 border-ink bg-white px-3 py-2 text-sm shadow-[2px_2px_0_var(--ink)] focus:outline-none"
            >
              <option value="">All years</option>
              {distinctYears.map((y) => (
                <option key={y.academicYear} value={y.academicYear}>
                  {y.academicYear}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="mode" className="font-bold uppercase tracking-wider">
              Mode
            </label>
            <select
              id="mode"
              name="mode"
              defaultValue={mode}
              className="border-3 border-ink bg-white px-3 py-2 text-sm shadow-[2px_2px_0_var(--ink)] focus:outline-none"
            >
              <option value="">All modes</option>
              <option value="IN_PERSON">In-Person</option>
              <option value="ONLINE">Online</option>
              <option value="HYBRID">Hybrid</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="theme" className="font-bold uppercase tracking-wider">
              Theme
            </label>
            <select
              id="theme"
              name="theme"
              defaultValue={theme}
              className="border-3 border-ink bg-white px-3 py-2 text-sm shadow-[2px_2px_0_var(--ink)] focus:outline-none"
            >
              <option value="">All themes</option>
              {themes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Button type="submit" variant="primary" className="h-[42px]">
              Filter
            </Button>
            {(q || year || mode || theme) && (
              <Button as="a" href="/quizzes" variant="alt" className="h-[42px]">
                Reset
              </Button>
            )}
          </div>
        </form>
      </CardShell>

      {/* Quizzes List */}
      {quizzes.length === 0 ? (
        <FramedPanel tone="mint" className="flex flex-col items-center justify-center p-12 text-center">
          <p className="font-heading text-xl text-ink">No quizzes found</p>
          <p className="mt-2 max-w-md font-body text-sm text-ink/80">
            {q || year || mode || theme
              ? "No tournaments match your current filters. Clear the search and filters to view all scheduled and archived quizzes."
              : "No quizzes have been created in the repository yet. Build a quiz running order and schedule your first event."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {(q || year || mode || theme) && (
              <Button as="a" href="/quizzes" variant="alt">
                Clear all filters
              </Button>
            )}
            {canBuild && (
              <Button as="a" href="/quizzes/new" variant="primary">
                + Build a quiz
              </Button>
            )}
          </div>
        </FramedPanel>
      ) : (
        <div className="flex flex-col gap-4">
          {quizzes.map((quiz) => {
            const isQM = quiz.qms.some((qm) => qm.userId === viewer.user.id);
            const canViewDetails = canBuild && !isMember;
            const easyCount = quiz.usageLogs.filter((l) => l.question.difficulty === "EASY").length;
            const medCount = quiz.usageLogs.filter((l) => l.question.difficulty === "MEDIUM").length;
            const hardCount = quiz.usageLogs.filter((l) => l.question.difficulty === "HARD").length;

            return (
              <CardShell
                key={quiz.id}
                tone="cream"
                className="flex flex-col justify-between gap-4 p-5 md:flex-row md:items-start"
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={canViewDetails ? `/quizzes/${quiz.id}` : `/quizzes/${quiz.id}?tab=roster`}
                      className="font-display text-xl hover:underline decoration-3 underline-offset-4"
                    >
                      {quiz.title}
                    </a>
                    <Tag tone={MODE_TONE[quiz.mode] ?? "mint"}>
                      {quiz.mode.replace("_", " ")}
                    </Tag>
                    <Tag tone="ink">{quiz.academicYear}</Tag>
                    {quiz.theme && <Tag tone="pink">{quiz.theme.name}</Tag>}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-sm text-ink opacity-80">
                    <span className="inline-flex items-center gap-1">
                      <CalendarIcon size={14} />
                      {new Date(quiz.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    {quiz.timing && <span>· {quiz.timing}</span>}
                    <span className="inline-flex items-center gap-1">
                      <MapPinIcon size={14} />
                      {quiz.venueOrPlatform}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CoinsIcon size={14} />
                      ₹{Number(quiz.budget).toLocaleString()}
                    </span>
                  </div>

                  <p className="mt-1 font-body text-xs text-ink opacity-70">
                    Format: <span className="font-semibold">{quiz.format}</span>
                  </p>

                  {/* QMs */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 font-body text-xs">
                    <span className="font-bold uppercase tracking-wider text-ink opacity-60">
                      Quizmasters:
                    </span>
                    {quiz.qms.length === 0 ? (
                      <span className="italic text-ink opacity-50">None assigned</span>
                    ) : (
                      quiz.qms.map((qm) => (
                        <Tag key={qm.userId} tone="lavender">
                          {qm.user.name ?? qm.user.email}
                        </Tag>
                      ))
                    )}
                  </div>

                  {/* Question & Difficulty Tally Bar */}
                  {canViewDetails && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 font-body text-xs">
                      <span className="font-semibold text-ink">
                        {quiz.usageLogs.length} questions in running order:
                      </span>
                      <Tag tone="mint">{easyCount} Easy</Tag>
                      <Tag tone="yellow">{medCount} Medium</Tag>
                      <Tag tone="pink">{hardCount} Hard</Tag>
                    </div>
                  )}

                  {/* Lessons Learned Snippet */}
                  {quiz.lessonsLearned && (
                    <div className="mt-3 border-l-4 border-yellow bg-cream p-2.5 font-body text-xs text-ink">
                      <span className="font-bold uppercase tracking-wider text-ink inline-flex items-center gap-1">
                        <LightbulbIcon size={14} className="text-ink" /> Lessons Learned:
                      </span>
                      <p className="mt-0.5 line-clamp-2 opacity-90">{quiz.lessonsLearned}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-end">
                  <Button
                    as="a"
                    href={canViewDetails ? `/quizzes/${quiz.id}` : `/quizzes/${quiz.id}?tab=roster`}
                    variant="primary"
                    className="text-xs"
                  >
                    {canViewDetails ? "View Details →" : "Roster & Scores →"}
                  </Button>
                  {canBuild && (
                    <>
                      <Button
                        as="a"
                        href={`/quizzes/${quiz.id}/builder`}
                        variant="alt"
                        className="text-xs"
                      >
                        Edit Running Order ↗
                      </Button>
                      <Button
                        as="a"
                        href={`/quizzes/${quiz.id}/edit`}
                        variant="underline"
                        className="text-xs"
                      >
                        Edit Metadata
                      </Button>
                    </>
                  )}
                </div>
              </CardShell>
            );
          })}
        </div>
      )}
    </main>
  </div>
);
}
