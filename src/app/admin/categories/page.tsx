import { redirect } from "next/navigation";
import { Button, CardShell, DismissibleNotice, HighlighterMark, Tag, WorkspaceNavbar } from "@/components/ui";
import { getViewer, hasPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { createCategory, deleteCategory, renameCategory } from "./actions";

export const dynamic = "force-dynamic";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const viewer = await getViewer();

  if (viewer.kind === "anonymous") redirect("/");
  if (viewer.kind === "revoked") redirect("/access-revoked");
  if (viewer.kind === "unregistered") redirect("/request-access");
  if (!(await hasPermission(viewer.user, "manage_categories"))) redirect("/dashboard");

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { questionCategories: true } },
    },
  });

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <WorkspaceNavbar />
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-8 px-4 sm:px-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl">
              <HighlighterMark tone="pink">Category</HighlighterMark> management
            </h1>
            <p className="mt-1 font-body text-xs text-ink/70">
              Admin-managed topic genres for organizing and balancing question distributions.
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

      {/* Add new category */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl">Add a new category</h2>
        <form action={createCategory} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 font-body text-sm">
            <span className="font-bold uppercase tracking-wide">Category name</span>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. Philosophy"
              className="border-[3px] border-ink bg-cream px-3 py-2 font-body text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-ink"
            />
          </label>
          <Button type="submit" variant="primary">
            Add category
          </Button>
        </form>
      </section>

      {/* Categories list */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl">Existing categories</h2>
        <div className="flex flex-col gap-3">
          {categories.map((cat) => (
            <CardShell key={cat.id} tone="cream" className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h3 className="font-body text-sm font-bold">{cat.name}</h3>
                <Tag tone="lavender">
                  {cat._count.questionCategories} question{cat._count.questionCategories === 1 ? "" : "s"}
                </Tag>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <form action={renameCategory} className="flex items-center gap-1">
                  <input type="hidden" name="categoryId" value={cat.id} />
                  <input
                    type="text"
                    name="newName"
                    defaultValue={cat.name}
                    className="border-[3px] border-ink bg-cream px-2 py-1 font-body text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-ink"
                  />
                  <Button type="submit" variant="alt">
                    Rename
                  </Button>
                </form>
                <form action={deleteCategory}>
                  <input type="hidden" name="categoryId" value={cat.id} />
                  <Button type="submit" variant="alt">
                    Delete
                  </Button>
                </form>
              </div>
            </CardShell>
          ))}
        </div>
      </section>
    </main>
  </div>
);
}