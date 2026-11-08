import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Button,
  CardShell,
  HighlighterMark,
  Tag,
  WorkspaceNavbar,
  AlertTriangleIcon,
  PencilIcon,
  type Tone,
} from "@/components/ui";
import { getViewer, hasPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { approveQuestion } from "@/app/questions/actions";
import type { QuestionAuditAction } from "@prisma/client";

export const dynamic = "force-dynamic";

const ACTION_CONFIG: Record<
  QuestionAuditAction,
  { label: string; tone: Tone; desc: string }
> = {
  APPROVED: { label: "Approved", tone: "mint", desc: "Question verified & approved" },
  REJECTED: { label: "Rejected", tone: "orange", desc: "Question rejected by review" },
  EDITED_BY_ADMIN: { label: "Admin Edit", tone: "pink", desc: "Modified by council manager" },
  EDITED_BY_AUTHOR: { label: "Author Edit", tone: "yellow", desc: "Modified by submitter" },
};

const ROLE_TONE_MAP: Record<string, Tone> = {
  Admin: "pink",
  President: "pink",
  "Vice President": "pink",
  "Head of Quizzing": "mint",
  Treasurer: "yellow",
  "PR Head": "lavender",
  "Creative Head": "lavender",
  Member: "ink",
};

export default async function QuestionAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const viewer = await getViewer();
  if (viewer.kind === "anonymous") redirect("/");
  if (viewer.kind === "revoked") redirect("/access-revoked");
  if (viewer.kind === "unregistered") redirect("/request-access");

  const canManageQuestions = await hasPermission(viewer.user, "manage_questions");
  const canManageUsers = await hasPermission(viewer.user, "manage_users");

  if (!canManageQuestions && !canManageUsers) {
    redirect("/dashboard");
  }

  const { filter = "ALL" } = await searchParams;

  // Build where filter
  const whereClause: { action?: QuestionAuditAction } = {};
  if (filter === "APPROVED") whereClause.action = "APPROVED";
  else if (filter === "REJECTED") whereClause.action = "REJECTED";
  else if (filter === "EDITED_BY_ADMIN") whereClause.action = "EDITED_BY_ADMIN";
  else if (filter === "EDITED_BY_AUTHOR") whereClause.action = "EDITED_BY_AUTHOR";

  const [logs, totalApprovals, totalRejections, postApprovalEditsCount, totalEdits] =
    await Promise.all([
      prisma.questionAuditLog.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
              role: { select: { name: true } },
            },
          },
          question: {
            select: {
              id: true,
              text: true,
              answerText: true,
              status: true,
              difficulty: true,
              isEditedAfterApproval: true,
              questionCategories: {
                include: { category: true },
              },
            },
          },
        },
      }),
      prisma.questionAuditLog.count({ where: { action: "APPROVED" } }),
      prisma.questionAuditLog.count({ where: { action: "REJECTED" } }),
      prisma.question.count({ where: { isEditedAfterApproval: true } }),
      prisma.questionAuditLog.count({
        where: { action: { in: ["EDITED_BY_ADMIN", "EDITED_BY_AUTHOR"] } },
      }),
    ]);

  const tabs = [
    { key: "ALL", label: "All Activity", count: null },
    { key: "APPROVED", label: "Approvals", count: totalApprovals },
    { key: "REJECTED", label: "Rejections", count: totalRejections },
    { key: "EDITED_BY_AUTHOR", label: "Author Edits", count: null },
    { key: "EDITED_BY_ADMIN", label: "Admin Edits", count: null },
  ];

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <WorkspaceNavbar />
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-8 px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/admin"
                className="font-body text-xs font-bold text-ink hover:underline uppercase tracking-wide opacity-70"
              >
                ← Admin Control Center
              </Link>
            </div>
            <h1 className="text-3xl sm:text-4xl">
              <HighlighterMark tone="yellow">Question</HighlighterMark> Audit Log
            </h1>
            <p className="mt-1 font-body text-xs text-ink/70">
              Track council review decisions, question approvals, rejections, and post-approval edits.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button as="a" href="/questions" variant="alt" className="text-xs">
              Question Pool
            </Button>
            <Button as="a" href="/admin/duplicates" variant="alt" className="text-xs">
              Duplicates
            </Button>
            <Button as="a" href="/admin" variant="alt" className="text-xs">
              Users & Roles
            </Button>
          </div>
        </div>

        {/* Post-Approval Alert Banner if any questions require re-review */}
        {postApprovalEditsCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 border-[3px] border-ink bg-yellow p-4 shadow-[4px_4px_0_var(--ink)]">
            <div className="flex items-center gap-3">
              <AlertTriangleIcon size={24} className="text-ink shrink-0" />
              <div>
                <p className="font-display text-base font-bold text-ink">
                  {postApprovalEditsCount} approved question{postApprovalEditsCount === 1 ? "" : "s"} edited by authors
                </p>
                <p className="font-body text-xs text-ink/80">
                  Authors revised their questions after council approval. Inspect the changes to verify accuracy.
                </p>
              </div>
            </div>
            <Button as="a" href="/admin/audit?filter=EDITED_BY_AUTHOR" variant="primary">
              View Author Edits →
            </Button>
          </div>
        )}

        {/* Metrics Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <CardShell tone="cream" className="p-4">
            <p className="font-body text-xs font-bold uppercase tracking-wider text-ink/60">Total Approvals</p>
            <p className="font-display text-2xl sm:text-3xl font-bold text-ink mt-1">{totalApprovals}</p>
          </CardShell>
          <CardShell tone="cream" className="p-4">
            <p className="font-body text-xs font-bold uppercase tracking-wider text-ink/60">Total Rejections</p>
            <p className="font-display text-2xl sm:text-3xl font-bold text-ink mt-1">{totalRejections}</p>
          </CardShell>
          <CardShell tone="cream" className="p-4">
            <p className="font-body text-xs font-bold uppercase tracking-wider text-ink/60">Edits Logged</p>
            <p className="font-display text-2xl sm:text-3xl font-bold text-ink mt-1">{totalEdits}</p>
          </CardShell>
          <CardShell tone={postApprovalEditsCount > 0 ? "yellow" : "cream"} className="p-4">
            <p className="font-body text-xs font-bold uppercase tracking-wider text-ink/60">Post-Approval Edits</p>
            <p className="font-display text-2xl sm:text-3xl font-bold text-ink mt-1">{postApprovalEditsCount}</p>
          </CardShell>
        </div>

        {/* Tab Filter Bar */}
        <div className="flex flex-wrap gap-2 border-b-[3px] border-ink pb-3">
          {tabs.map((tab) => {
            const isActive = filter === tab.key;
            return (
              <Link
                key={tab.key}
                href={`/admin/audit?filter=${tab.key}`}
                className={`border-[2px] border-ink px-3 py-1.5 font-body text-xs font-bold uppercase tracking-wide transition-all ${
                  isActive
                    ? "bg-ink text-cream shadow-[2px_2px_0_var(--ink)]"
                    : "bg-cream text-ink hover:bg-cream/80"
                }`}
              >
                {tab.label}
                {tab.count !== null && ` (${tab.count})`}
              </Link>
            );
          })}
        </div>

        {/* Audit Log Entries */}
        {logs.length === 0 ? (
          <CardShell tone="cream" className="p-8 text-center">
            <p className="font-body text-sm font-bold text-ink">No audit logs recorded yet.</p>
            <p className="font-body text-xs text-ink/70 mt-1">
              Actions will appear here as council managers approve, reject, or edit questions.
            </p>
          </CardShell>
        ) : (
          <div className="flex flex-col gap-3">
            {logs.map((log) => {
              const cfg = ACTION_CONFIG[log.action] ?? {
                label: log.action,
                tone: "cream" as Tone,
                desc: "",
              };
              const actorRole = log.actor.role?.name ?? "Member";
              const roleTone = ROLE_TONE_MAP[actorRole] ?? "cream";
              const isPostApproval =
                log.action === "EDITED_BY_AUTHOR" && log.question.isEditedAfterApproval;
              const isRevisedRejected =
                log.action === "EDITED_BY_AUTHOR" && log.previousStatus === "REJECTED";

              return (
                <CardShell
                  key={log.id}
                  tone={isPostApproval ? "yellow" : isRevisedRejected ? "cream" : "cream"}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4"
                >
                  <div className="flex flex-col gap-2 flex-1 min-w-0">
                    {/* Top row: Action, Actor, Timestamp */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Tag tone={cfg.tone} className="text-[11px] font-bold">
                        {cfg.label}
                      </Tag>
                      {isPostApproval && (
                        <span className="inline-flex items-center gap-1 border border-ink bg-yellow px-1.5 py-0.5 font-body text-[10px] font-bold text-ink">
                          <AlertTriangleIcon size={10} />
                          Post-Approval Edit
                        </span>
                      )}
                      {isRevisedRejected && (
                        <span className="inline-flex items-center gap-1 border border-ink bg-orange/20 px-1.5 py-0.5 font-body text-[10px] font-bold text-ink">
                          <AlertTriangleIcon size={10} />
                          Revised Rejected Question
                        </span>
                      )}
                      <span className="font-body text-xs font-bold text-ink">
                        {log.actor.name ?? log.actor.email}
                      </span>
                      <Tag tone={roleTone} className="text-[10px] py-0 px-1.5">
                        {actorRole}
                      </Tag>
                      <span className="font-body text-xs text-ink/60">
                        · {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>

                    {/* Question Content Snippet */}
                    <div className="border-l-2 border-ink/40 pl-2.5 py-0.5">
                      <p className="font-body text-sm text-ink line-clamp-2">
                        &ldquo;{log.question.text}&rdquo;
                      </p>
                      <p className="font-body text-xs text-ink/70 mt-0.5">
                        <strong>Answer:</strong> {log.question.answerText}
                      </p>
                    </div>

                    {/* Meta info & Notes */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-body text-ink/70">
                      {log.question.questionCategories.map((qc) => (
                        <span
                          key={qc.categoryId}
                          className="border border-ink/40 px-1.5 py-0.2 bg-cream text-[10px]"
                        >
                          {qc.category.name}
                        </span>
                      ))}
                      <span className="uppercase font-bold tracking-wider text-[10px]">
                        {log.question.difficulty}
                      </span>
                      {log.notes && (
                        <span className="italic text-ink/80">({log.notes})</span>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {log.question.isEditedAfterApproval && canManageQuestions && (
                      <form action={approveQuestion}>
                        <input type="hidden" name="questionId" value={log.question.id} />
                        <Button type="submit" variant="primary" className="text-xs bg-mint hover:bg-mint/80">
                          Re-Approve
                        </Button>
                      </form>
                    )}
                    {!log.question.isEditedAfterApproval && log.question.status === "PENDING" && canManageQuestions && (
                      <form action={approveQuestion}>
                        <input type="hidden" name="questionId" value={log.question.id} />
                        <Button type="submit" variant="primary" className="text-xs bg-mint hover:bg-mint/80">
                          Approve
                        </Button>
                      </form>
                    )}
                    <Button
                      as="a"
                      href={`/questions/${log.question.id}/edit`}
                      variant="alt"
                      className="text-xs"
                    >
                      <PencilIcon size={12} className="mr-1" /> View / Edit
                    </Button>
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
