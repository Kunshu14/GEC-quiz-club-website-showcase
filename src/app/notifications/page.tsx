import { redirect } from "next/navigation";
import Link from "next/link";
import { getViewer, hasPermission } from "@/lib/access";
import { AppHeader } from "@/components/ui/AppHeader";
import { CardShell, Tag, Button, HighlighterMark } from "@/components/ui";
import { NotificationsTableClient } from "./NotificationsTableClient";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const viewer = await getViewer();
  if (viewer.kind === "anonymous") redirect("/");
  if (viewer.kind === "revoked") redirect("/access-revoked");
  if (viewer.kind === "unregistered") redirect("/request-access");

  const { user, name } = viewer;
  const canManage = await hasPermission(user, "manage_users");

  const initialNotifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="min-h-screen flex flex-col bg-cream/30">
      <AppHeader
        userName={name}
        userRole={user.role.name}
        canManage={canManage}
      />

      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-6 px-6 py-10">
        {/* Breadcrumb & Title */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b-3 border-ink pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-ink/70">
              <Link href="/dashboard" className="hover:underline">
                Dashboard
              </Link>
              <span>/</span>
              <span className="font-bold text-ink">Notifications</span>
            </div>
            <h1 className="mt-1 font-display text-3xl font-black text-ink tracking-tight">
              Notifications & <HighlighterMark tone="yellow">Alerts Audit</HighlighterMark>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button as="a" href="/dashboard" variant="alt" className="text-xs">
              ← Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Notifications Table Client Component */}
        <NotificationsTableClient initialNotifications={initialNotifications.map(n => ({
          ...n,
          createdAt: n.createdAt.toISOString(),
        }))} />
      </main>
    </div>
  );
}
