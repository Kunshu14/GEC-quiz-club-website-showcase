import { redirect } from "next/navigation";
import { getViewer, hasPermission } from "@/lib/access";
import { Button, HighlighterMark } from "@/components/ui";
import { AppHeader } from "@/components/ui/AppHeader";
import { LegacyImportWorkspace } from "@/components/questions/LegacyImportWorkspace";

export const dynamic = "force-dynamic";

export default async function QuestionImportPage() {
  const viewer = await getViewer();
  if (viewer.kind === "anonymous") redirect("/");
  if (viewer.kind === "revoked") redirect("/access-revoked");
  if (viewer.kind === "unregistered") redirect("/request-access");

  const canManageQuestions = await hasPermission(
    viewer.user,
    "manage_questions"
  );
  if (!canManageQuestions) {
    redirect("/questions");
  }
  const canManageUsers = await hasPermission(viewer.user, "manage_users");

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader
        userRole={viewer.user.role.name}
        userName={viewer.user.name}
        canManage={canManageUsers}
      />

      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-10 px-6 py-12 sm:px-10">
        {/* Page Header */}
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-body text-xs font-bold uppercase tracking-widest text-ink/70">
                Data Migration & Ingestion
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-heading tracking-tight">
              <HighlighterMark tone="pink">Legacy</HighlighterMark> Question Import
            </h1>
            <p className="mt-2 max-w-2xl font-body text-sm text-ink/80">
              Bulk-import spreadsheets of past quiz questions from previous editions, Google Sheets, or Excel.
              Automatic duplicate detection prevents flooding the bank with repeated clues.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button as="a" href="/questions" variant="alt">
              ← Question Pool
            </Button>
            <Button as="a" href="/admin/duplicates" variant="alt">
              Duplicate Queue
            </Button>
          </div>
        </div>

        {/* Import Workspace Component */}
        <LegacyImportWorkspace />
      </main>
    </div>
  );
}
