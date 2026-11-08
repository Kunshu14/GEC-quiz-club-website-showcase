import { prisma } from "@/lib/prisma";

/**
 * Distinct existing sub-genres per category, so the submit/edit comboboxes can
 * suggest real values (while still allowing new ones) and the filter can offer
 * a restricted picker. Keyed by category id.
 */
export async function getSubGenresByCategory(): Promise<Record<string, string[]>> {
  const rows = await prisma.questionCategory.findMany({
    where: { subGenre: { not: null } },
    select: { categoryId: true, subGenre: true },
    distinct: ["categoryId", "subGenre"],
  });

  const map: Record<string, string[]> = {};
  for (const r of rows) {
    (map[r.categoryId] ??= []).push(r.subGenre!);
  }
  for (const key of Object.keys(map)) {
    map[key].sort();
  }
  return map;
}
