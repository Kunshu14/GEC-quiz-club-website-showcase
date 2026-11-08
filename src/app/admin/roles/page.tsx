import { redirect } from "next/navigation";
import { Button, DismissibleNotice, HighlighterMark, WorkspaceNavbar } from "@/components/ui";
import { getViewer, hasPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { createRole } from "./actions";
import { RoleCard } from "./RoleCard";

export const dynamic = "force-dynamic";

export default async function RolesPage({
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

  const [roles, permissions] = await Promise.all([
    prisma.role.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        rolePermissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    }),
    prisma.permission.findMany({ orderBy: { key: "asc" } }),
  ]);

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <WorkspaceNavbar />
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-8 px-4 sm:px-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl">
              <HighlighterMark tone="pink">Role</HighlighterMark> management
            </h1>
            <p className="mt-1 font-body text-xs text-ink/70">
              Configure council leadership roles and system access permissions.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Button as="a" href="/admin" variant="alt" className="text-xs">
              Back to admin
            </Button>
          </div>
        </div>

      {error && (
        <DismissibleNotice tone="orange" paramToClear="error" className="max-w-2xl">
          {error}
        </DismissibleNotice>
      )}

      {/* Add new role */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl">Add a new role</h2>
        <form action={createRole} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 font-body text-sm">
            <span className="font-bold uppercase tracking-wide">Role name</span>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. Secretary"
              className="border-[3px] border-ink bg-cream px-3 py-2 font-body text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-ink"
            />
          </label>
          <Button type="submit" variant="primary">
            Add role
          </Button>
        </form>
      </section>

      {/* Roles list */}
      <section className="flex flex-col gap-6">
        <h2 className="text-2xl">Existing roles</h2>
        {roles.map((role) => (
          <RoleCard
            key={role.id}
            id={role.id}
            name={role.name}
            isSystem={role.isSystem}
            userCount={role._count.users}
            rolePermissions={role.rolePermissions}
            allPermissions={permissions}
          />
        ))}
      </section>
    </main>
  </div>
);
}