import { prisma } from "@/lib/prisma";

/**
 * Distinct existing sub-genres per category, so the sub-genre comboboxes/filter
 * can suggest real values (submit/edit allow new ones; the filter restricts).
 * Returns `Record<categoryId, string[]>` (sorted, de-duplicated).
 */
export async function getSubGenresByCategory(): Promise<Record<string, string[]>> {
  const rows = await prisma.questionCategory.findMany({
    where: { subGenre: { not: null } },
    select: { categoryId: true, subGenre: true },
    distinct: ["categoryId", "subGenre"],
  });

  const map: Record<string, string[]> = {};
  for (const r of rows) {
    (map[r.categoryId] ??= []).push(r.subGenre as string);
  }
  for (const key of Object.keys(map)) {
    map[key].sort();
  }
  return map;
}

/** Build a hidden-input name for a category's sub-genre field (FormData key). */
export function subGenreFieldName(categoryId: string): string {
  return `subGenre_${categoryId}`;
}
