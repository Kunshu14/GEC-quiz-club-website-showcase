import { redirect } from "next/navigation";
import { Button, CardShell, DismissibleNotice, HighlighterMark, WorkspaceNavbar } from "@/components/ui";
import { getViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getSubGenresByCategory } from "@/lib/subgenres";
import { QuestionSubmitForm } from "./QuestionSubmitForm";

export const dynamic = "force-dynamic";

export default async function NewQuestionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const viewer = await getViewer();

  if (viewer.kind === "anonymous") redirect("/");
  if (viewer.kind === "revoked") redirect("/access-revoked");
  if (viewer.kind === "unregistered") redirect("/request-access");

  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  const subGenresByCategory = await getSubGenresByCategory();

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <WorkspaceNavbar />
      <main className="mx-auto flex w-full max-w-[800px] flex-1 flex-col gap-8 px-4 sm:px-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl">
              <HighlighterMark tone="yellow">Submit</HighlighterMark> a question
            </h1>
            <p className="mt-1 font-body text-xs text-ink/70">
              Contribute clues to the central question repository (+1 pt upon approval).
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Button as="a" href="/questions" variant="alt" className="text-xs">
              Back to pool
            </Button>
          </div>
        </div>

        {error && (
          <DismissibleNotice tone="orange" paramToClear="error" className="max-w-2xl">
            {error}
          </DismissibleNotice>
        )}

        <CardShell tone="cream" className="max-w-2xl">
          <QuestionSubmitForm categories={categories} subGenresByCategory={subGenresByCategory} />
        </CardShell>
      </main>
    </div>
  );
}