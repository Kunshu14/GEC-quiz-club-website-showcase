import { prisma } from "./prisma";

/**
 * Distinct existing sub-genres grouped by category id. Provides the suggestion
 * lists for both the submit/edit by-genre comboboxes and the sub-genre filter,
 * so they "shrink as you type" against real values.
 *
 * Returns `Record<categoryId, string[]>` (sorted, de-duplicated).
 */
export async function getSubGenresByCategory(): Promise<Record<string, string[]>> {
  const rows = await prisma.questionCategory.findMany({
    where: { subGenre: { not: null } },
    select: { categoryId: true, subGenre: true },
    distinct: ["categoryId", "subGenre"],
  });

  const byCategory: Record<string, string[]> = {};
  for (const r of rows) {
    if (!r.subGenre) continue;
    (byCategory[r.categoryId] ??= []).push(r.subGenre);
  }
  for (const key of Object.keys(byCategory)) {
    byCategory[key].sort();
  }
  return byCategory;
}
