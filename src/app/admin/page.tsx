import { redirect } from "next/navigation";
import { Button, CardShell, DismissibleNotice, HighlighterMark, Tag, type Tone, AlertTriangleIcon, WorkspaceNavbar } from "@/components/ui";
import { getViewer, hasPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import {
  approveAccessRequest,
  denyAccessRequest,
  inviteByEmail,
  markAlumni,
  promoteUser,
  reinstateUser,
  revokeUser,
  updateAlumniYear,
} from "./actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_TONE = { ACTIVE: "mint", ALUMNI: "lavender", REVOKED: "orange" } as const;
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

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const viewer = await getViewer();

  if (viewer.kind === "anonymous") redirect("/");
  if (viewer.kind === "revoked") redirect("/access-revoked");
  if (viewer.kind === "unregistered") redirect("/request-access");
  if (!(await hasPermission(viewer.user, "manage_users"))) redirect("/dashboard");

  const canManageCategories = await hasPermission(viewer.user, "manage_categories");
  const canManageQuestions = await hasPermission(viewer.user, "manage_questions");
  const currentAdminId = viewer.user.id;

  const [
    pendingRequests,
    users,
    recentDecisions,
    activeAdminCount,
    allRoles,
    flaggedDuplicatesCount,
    postApprovalEditsCount,
  ] = await Promise.all([
    prisma.accessRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { requestedAt: "asc" },
    }),
    prisma.user.findMany({
      orderBy: [{ status: "asc" }, { email: "asc" }],
      include: {
        role: {
          select: {
            name: true,
            rolePermissions: {
              select: { permission: { select: { key: true } } },
            },
          },
        },
      },
    }),
    prisma.accessRequest.findMany({
      where: { status: { in: ["APPROVED", "DENIED", "INVITED"] } },
      orderBy: { decidedAt: "desc" },
      take: 15,
    }),
    prisma.user.count({
      where: {
        status: "ACTIVE",
        role: { rolePermissions: { some: { permission: { key: "manage_users" } } } },
      },
    }),
    prisma.role.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.question.count({ where: { status: "FLAGGED" } }),
    prisma.question.count({ where: { isEditedAfterApproval: true } }),
  ]);

  // Pre-calculate permission flags in memory with 0 extra queries
  const permMap = Object.fromEntries(
    users.map((user) => [
      user.id,
      user.role.rolePermissions.some((rp) => rp.permission.key === "manage_users"),
    ]),
  );

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <WorkspaceNavbar />
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-10 px-4 sm:px-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl">
              <HighlighterMark tone="pink">Admin</HighlighterMark> control center
            </h1>
            <p className="mt-1 font-body text-xs text-ink/70">
              Access requests, council user roles, and system configuration.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {canManageQuestions && (
              <Button as="a" href="/admin/audit" variant="alt" className="text-xs">
                Audit Log {postApprovalEditsCount > 0 && `(${postApprovalEditsCount})`}
              </Button>
            )}
            {canManageQuestions && (
              <Button as="a" href="/admin/duplicates" variant="alt" className="text-xs">
                Duplicates ({flaggedDuplicatesCount})
              </Button>
            )}
            <Button as="a" href="/admin/roles" variant="alt" className="text-xs">
              Manage roles
            </Button>
            {canManageCategories && (
              <Button as="a" href="/admin/categories" variant="alt" className="text-xs">
                Manage categories
              </Button>
            )}
          </div>
        </div>

      {postApprovalEditsCount > 0 && canManageQuestions && (
        <CardShell tone="yellow" className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangleIcon size={24} className="text-ink shrink-0" />
            <div>
              <p className="font-body text-sm font-bold">
                {postApprovalEditsCount} approved question{postApprovalEditsCount === 1 ? "" : "s"} edited by authors
              </p>
              <p className="font-body text-xs text-ink opacity-80 mt-0.5">
                Authors modified these questions after council approval. Inspect changes in the Audit Log.
              </p>
            </div>
          </div>
          <Button as="a" href="/admin/audit?filter=EDITED_BY_AUTHOR" variant="primary">
            Review post-approval edits ({postApprovalEditsCount}) →
          </Button>
        </CardShell>
      )}

      {flaggedDuplicatesCount > 0 && canManageQuestions && (
        <CardShell tone="pink" className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-body text-sm font-bold">
              {flaggedDuplicatesCount} question{flaggedDuplicatesCount === 1 ? "" : "s"} flagged for duplicate review
            </p>
            <p className="font-body text-xs text-ink opacity-80 mt-0.5">
              Trigram similarity engine flagged candidate questions for council review.
            </p>
          </div>
          <Button as="a" href="/admin/duplicates" variant="primary">
            Review duplicates ({flaggedDuplicatesCount}) →
          </Button>
        </CardShell>
      )}

      {error && (
        <DismissibleNotice tone="orange" paramToClear="error" className="max-w-2xl">
          {error}
        </DismissibleNotice>
      )}

      {/* Path A review queue — requests waiting on admin action */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl">
          Pending access requests ({pendingRequests.length})
        </h2>
        {pendingRequests.length === 0 ? (
          <p className="font-body text-sm text-ink opacity-70">
            Queue is clear — no pending requests.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {pendingRequests.map((request) => (
              <CardShell key={request.id} tone="cream" className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-body text-sm font-bold">{request.email}</p>
                  {request.note && (
                    <p className="font-body text-xs italic opacity-80">
                      &ldquo;{request.note}&rdquo;
                    </p>
                  )}
                  <p className="mt-1 font-body text-xs opacity-70">
                    Requested {request.requestedAt.toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={approveAccessRequest}>
                    <input type="hidden" name="requestId" value={request.id} />
                    <Button type="submit" variant="primary">
                      Approve
                    </Button>
                  </form>
                  <form action={denyAccessRequest}>
                    <input type="hidden" name="requestId" value={request.id} />
                    <Button type="submit" variant="alt">
                      Deny
                    </Button>
                  </form>
                </div>
              </CardShell>
            ))}
          </div>
        )}
      </section>

      {/* Path B — admin-initiated invite / pre-approval */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl">Pre-approve an email</h2>
        <p className="max-w-xl font-body text-sm text-ink">
          Pre-approve an email address for someone who has never logged in yet.
          When they sign in with Google for the first time, access is granted automatically.
        </p>
        <form action={inviteByEmail} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 font-body text-sm">
            <span className="font-bold uppercase tracking-wide">Email</span>
            <input
              type="email"
              name="email"
              required
              placeholder="name@gmail.com"
              className="border-[3px] border-ink bg-cream px-3 py-2 font-body text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-ink"
            />
          </label>
          <label className="flex flex-col gap-1 font-body text-sm">
            <span className="font-bold uppercase tracking-wide">Note (optional)</span>
            <input
              type="text"
              name="note"
              placeholder="e.g. new Quizmaster for next semester"
              className="border-[3px] border-ink bg-cream px-3 py-2 font-body text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-ink"
            />
          </label>
          <Button type="submit" variant="primary">
            Pre-approve email
          </Button>
        </form>
      </section>

      {/* Users list — roles, status, and the safeguarded management actions */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl">Council members</h2>
        <p className="font-body text-xs text-ink opacity-70">
          {activeAdminCount} active manager{activeAdminCount === 1 ? "" : "s"} right now.
        </p>
        <div className="flex flex-col gap-3">
          {users.map((user) => {
            const isSelf = user.id === currentAdminId;
            const userIsManager = permMap[user.id] ?? false;
            const isLastActiveManager = userIsManager && user.status === "ACTIVE" && activeAdminCount <= 1;

            return (
              <CardShell key={user.id} tone="cream" className="flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-body text-sm font-bold">
                      {user.name ?? user.email}
                      {isSelf && <span className="ml-2 font-body text-xs opacity-60">(you)</span>}
                    </p>
                    <p className="font-body text-xs opacity-70">{user.email}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Tag tone={ROLE_TONE_MAP[user.role.name] ?? "lavender"}>{user.role.name}</Tag>
                      <Tag tone={STATUS_TONE[user.status as keyof typeof STATUS_TONE] ?? "ink"}>
                        {user.status}
                      </Tag>
                      {user.status === "ALUMNI" && (
                        user.graduatingYear ? (
                          <Tag tone="mint">Class of {user.graduatingYear}</Tag>
                        ) : (
                          <Tag tone="ink">No Grad Year</Tag>
                        )
                      )}
                      {user.wasAdmin && !userIsManager && (
                        <Tag tone="pink">Previously a manager</Tag>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {user.status === "ACTIVE" && (
                      <>
                        <form action={promoteUser} className="flex items-center gap-1">
                          <input type="hidden" name="userId" value={user.id} />
                          <select
                            key={user.roleId}
                            name="roleId"
                            defaultValue={user.roleId}
                            className="border-[3px] border-ink bg-cream px-2 py-1.5 font-body text-xs uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-ink"
                          >
                            {allRoles.map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.name}
                              </option>
                            ))}
                          </select>
                          <Button type="submit" variant="alt">
                            Set role
                          </Button>
                        </form>
                        <form action={markAlumni} className="flex items-center gap-1">
                          <input type="hidden" name="userId" value={user.id} />
                          <input
                            type="number"
                            name="graduatingYear"
                            placeholder="Grad Year"
                            className="w-20 border-[2px] border-ink bg-cream px-1.5 py-1 font-body text-xs focus:bg-white focus:outline-none"
                          />
                          <Button type="submit" variant="alt" disabled={isSelf || isLastActiveManager}>
                            Mark alumni
                          </Button>
                        </form>
                        <form action={revokeUser}>
                          <input type="hidden" name="userId" value={user.id} />
                          <Button type="submit" variant="alt" disabled={isSelf || isLastActiveManager}>
                            Revoke
                          </Button>
                        </form>
                      </>
                    )}

                    {user.status === "ALUMNI" && (
                      <div className="flex flex-wrap items-center gap-2">
                        <form action={updateAlumniYear} className="flex items-center gap-1">
                          <input type="hidden" name="userId" value={user.id} />
                          <input
                            key={user.graduatingYear ?? "none"}
                            type="number"
                            name="graduatingYear"
                            defaultValue={user.graduatingYear ?? ""}
                            placeholder="Grad Year"
                            className="w-24 border-[2px] border-ink bg-cream px-1.5 py-1 font-body text-xs focus:bg-white focus:outline-none"
                          />
                          <Button type="submit" variant="alt">
                            Save Year
                          </Button>
                        </form>
                        <form action={reinstateUser}>
                          <input type="hidden" name="userId" value={user.id} />
                          <Button type="submit" variant="primary">
                            Reinstate
                          </Button>
                        </form>
                      </div>
                    )}

                    {user.status === "REVOKED" && (
                      <form action={reinstateUser}>
                        <input type="hidden" name="userId" value={user.id} />
                        <Button type="submit" variant="primary">
                          Reinstate
                        </Button>
                      </form>
                    )}
                  </div>
                </div>

                {/* Section 5.6 explicit callout for returning/reinstated managers */}
                {user.wasAdmin && !userIsManager && user.status === "ACTIVE" && (
                  <div className="bg-yellow/30 border-2 border-ink px-3 py-2 font-body text-xs font-bold text-ink flex items-start gap-1.5">
                    <AlertTriangleIcon size={14} className="shrink-0 mt-0.5" />
                    <span><strong>Previously a Manager:</strong> Reinstated/Alumni returning accounts reset to plain Member baseline (Section 5.6). To restore administrative privileges, explicitly select an Admin role from the dropdown above and click &ldquo;Set role&rdquo;.</span>
                  </div>
                )}
              </CardShell>
            );
          })}
        </div>
      </section>

      {/* Recent decision log */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl">Recent decisions</h2>
        {recentDecisions.length === 0 ? (
          <p className="font-body text-sm text-ink">Nothing decided yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {recentDecisions.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 border-b border-ink/20 py-1 font-body text-xs">
                <Tag tone={entry.status === "DENIED" ? "orange" : entry.status === "INVITED" ? "lavender" : "mint"}>
                  {entry.status}
                </Tag>
                <span>{entry.email}</span>
                <span className="opacity-60">
                  {(entry.decidedAt ?? entry.requestedAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  </div>
);
}