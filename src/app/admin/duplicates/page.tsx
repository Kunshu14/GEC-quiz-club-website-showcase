import { redirect } from "next/navigation";
import { Button, CardShell, FramedPanel, HighlighterMark, Tag, ComparisonBlock, AlertTriangleIcon, WorkspaceNavbar } from "@/components/ui";
import { MediaDisplay } from "@/components/questions/MediaDisplay";
import { getViewer, hasPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { resolveDuplicateAsDifferent, resolveDuplicateAsSame } from "./actions";

export const dynamic = "force-dynamic";

const DIFFICULTY_TONE = { EASY: "mint", MEDIUM: "yellow", HARD: "orange" } as const;

export default async function DuplicateReviewPage() {
  const viewer = await getViewer();

  if (viewer.kind === "anonymous") redirect("/");
  if (viewer.kind === "revoked") redirect("/access-revoked");
  if (viewer.kind === "unregistered") redirect("/request-access");
  if (!(await hasPermission(viewer.user, "manage_questions"))) redirect("/dashboard");

  const flaggedQuestions = await prisma.question.findMany({
    where: { status: "FLAGGED" },
    orderBy: { createdAt: "desc" },
    include: {
      submittedBy: { select: { name: true, email: true } },
      questionCategories: { include: { category: true } },
      media: true,
      duplicateOf: {
        include: {
          submittedBy: { select: { name: true, email: true } },
          questionCategories: { include: { category: true } },
          media: true,
        },
      },
    },
  });

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <WorkspaceNavbar />
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-8 px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl">
              <HighlighterMark tone="pink">Duplicate</HighlighterMark> review queue
            </h1>
            <p className="mt-2 font-body text-xs sm:text-sm text-ink opacity-80 max-w-2xl">
              Submissions flagged by the trigram similarity engine (threshold ≥ 0.32).
              Compare the candidate against the matched question in the pool to decide whether
              it offers a fresh angle or should be rejected as a duplicate.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Button as="a" href="/admin" variant="alt" className="text-xs">
              Admin console
            </Button>
            <Button as="a" href="/questions" variant="alt" className="text-xs">
              Question pool
            </Button>
          </div>
        </div>

      {/* Flagged Queue */}
      <section className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl">Flagged Submissions ({flaggedQuestions.length})</h2>
        </div>

        {flaggedQuestions.length === 0 ? (
          <FramedPanel tone="mint" className="flex flex-col items-center justify-center p-12 text-center">
            <h3 className="font-heading text-xl text-ink">Duplicate queue is clear</h3>
            <p className="mt-2 max-w-md font-body text-sm text-ink/80">
              No questions are currently held for review. Any future submissions or legacy imports that trigger similarity will appear here for side-by-side comparison.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button as="a" href="/questions" variant="primary">
                Browse Question Pool
              </Button>
              <Button as="a" href="/admin" variant="alt">
                Admin Console
              </Button>
            </div>
          </FramedPanel>
        ) : (
          <div className="flex flex-col gap-8">
            {flaggedQuestions.map((candidate) => {
              const original = candidate.duplicateOf;
              const matchPercent = candidate.duplicateScore
                ? Math.round(candidate.duplicateScore * 100)
                : null;

              return (
                <div
                  key={candidate.id}
                  className="flex flex-col gap-4 border-[3px] border-ink bg-cream p-6 shadow-[6px_6px_0_var(--ink)]"
                >
                  {/* Top Bar with Match Score */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b-[2px] border-ink pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Tag tone="pink">Flagged Submission</Tag>
                      {matchPercent !== null && (
                        <Tag tone={matchPercent > 50 ? "orange" : "yellow"}>
                          Trigram Match: {matchPercent}%
                        </Tag>
                      )}
                      {original?.status === "REJECTED" && (
                        <Tag tone="orange" className="inline-flex items-center gap-1">
                          <AlertTriangleIcon size={12} /> Re-submission of REJECTED Question
                        </Tag>
                      )}
                    </div>
                    <span className="font-body text-xs text-ink opacity-60">
                      ID: #{candidate.id.slice(-8)} · Submitted {candidate.createdAt.toLocaleDateString()}
                    </span>
                  </div>

                  {/* Warning Callout if matched question was previously rejected */}
                  {original?.status === "REJECTED" && (
                    <div className="flex items-center gap-2 border-[2px] border-ink bg-orange/20 p-3 text-xs font-body text-ink shadow-[2px_2px_0_var(--ink)]">
                      <AlertTriangleIcon size={16} className="text-ink shrink-0" />
                      <p>
                        <strong>Council Alert — Previously Rejected Question:</strong> This candidate matches a question that was previously <strong>REJECTED</strong> by the council on {original.createdAt.toLocaleDateString()}. Verify whether this submission addresses previous rejection reasons, or reject it to maintain the council decision.
                      </p>
                    </div>
                  )}

                  {/* Side-by-side Comparison using ComparisonBlock */}
                  <ComparisonBlock
                    left={{
                      heading: original
                        ? `Existing Question (#${original.id.slice(-8)})`
                        : "Original Matched Question (Missing / Deleted)",
                      items: original
                        ? [
                            <div key="orig-text" className="flex flex-col gap-1">
                              <span className="text-xs font-bold uppercase opacity-70">Question Text:</span>
                              <p className="font-bold text-ink">{original.text}</p>
                            </div>,
                            <div key="orig-ans" className="flex flex-col gap-1 mt-1">
                              <span className="text-xs font-bold uppercase opacity-70">Answer:</span>
                              <p className="text-ink">{original.answerText}</p>
                            </div>,
                            original.notes ? (
                              <div key="orig-notes" className="flex flex-col gap-1 mt-1">
                                <span className="text-xs font-bold uppercase opacity-70">Notes:</span>
                                <p className="text-xs text-ink opacity-80">{original.notes}</p>
                              </div>
                            ) : null,
                            <div key="orig-meta" className="flex flex-wrap gap-2 mt-2">
                              <Tag tone={DIFFICULTY_TONE[original.difficulty as keyof typeof DIFFICULTY_TONE]}>
                                {original.difficulty}
                              </Tag>
                              <Tag tone={original.status === "REJECTED" ? "orange" : original.status === "PENDING" ? "lavender" : "mint"}>
                                {original.status}
                              </Tag>
                              {original.questionCategories.map((qc) => (
                                <Tag key={qc.categoryId} tone="ink">
                                  {qc.category.name}
                                  {qc.subGenre ? ` · ${qc.subGenre}` : ""}
                                </Tag>
                              ))}
                            </div>,
                            original.media.length > 0 ? (
                              <div key="orig-media" className="mt-2">
                                <MediaDisplay media={original.media} />
                              </div>
                            ) : null,
                            <div key="orig-sub" className="mt-2 text-xs opacity-60">
                              By {original.submittedBy.name ?? original.submittedBy.email}
                            </div>,
                          ].filter(Boolean)
                        : [
                            <p key="no-orig" className="text-sm italic opacity-70">
                              No original match reference record found.
                            </p>,
                          ],
                    }}
                    right={{
                      heading: `Candidate Submission (by ${candidate.submittedBy.name ?? candidate.submittedBy.email})`,
                      items: [
                        <div key="cand-text" className="flex flex-col gap-1">
                          <span className="text-xs font-bold uppercase opacity-70">Question Text:</span>
                          <p className="font-bold text-ink">{candidate.text}</p>
                        </div>,
                        <div key="cand-ans" className="flex flex-col gap-1 mt-1">
                          <span className="text-xs font-bold uppercase opacity-70">Answer:</span>
                          <p className="text-ink">{candidate.answerText}</p>
                        </div>,
                        candidate.notes ? (
                          <div key="cand-notes" className="flex flex-col gap-1 mt-1">
                            <span className="text-xs font-bold uppercase opacity-70">Notes:</span>
                            <p className="text-xs text-ink opacity-80">{candidate.notes}</p>
                          </div>
                        ) : null,
                        <div key="cand-meta" className="flex flex-wrap gap-2 mt-2">
                          <Tag tone={DIFFICULTY_TONE[candidate.difficulty as keyof typeof DIFFICULTY_TONE]}>
                            {candidate.difficulty}
                          </Tag>
                          <Tag tone="pink">{candidate.status}</Tag>
                          {candidate.questionCategories.map((qc) => (
                            <Tag key={qc.categoryId} tone="ink">
                              {qc.category.name}
                              {qc.subGenre ? ` · ${qc.subGenre}` : ""}
                            </Tag>
                          ))}
                        </div>,
                        candidate.media.length > 0 ? (
                          <div key="cand-media" className="mt-2">
                            <MediaDisplay media={candidate.media} />
                          </div>
                        ) : null,
                        <div key="cand-sub" className="mt-2 text-xs opacity-60">
                          Submitted on {candidate.createdAt.toLocaleString()}
                        </div>,
                      ].filter(Boolean),
                    }}
                  />

                  {/* Resolution Action Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-t-[2px] border-ink pt-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <form action={resolveDuplicateAsDifferent}>
                        <input type="hidden" name="questionId" value={candidate.id} />
                        <Button type="submit" variant="primary">
                          Resolve as Different (Approve into Pool)
                        </Button>
                      </form>

                      <form action={resolveDuplicateAsSame}>
                        <input type="hidden" name="questionId" value={candidate.id} />
                        <Button type="submit" variant="alt">
                          Resolve as Duplicate (Reject submission)
                        </Button>
                      </form>
                    </div>

                    <Button
                      as="a"
                      href={`/questions/${candidate.id}/edit`}
                      variant="underline"
                      className="text-xs font-bold"
                    >
                      Edit Candidate Question →
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  </div>
);
}
