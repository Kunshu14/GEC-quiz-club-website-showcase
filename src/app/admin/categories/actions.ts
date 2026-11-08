"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";

function fail(message: string): never {
  redirect(`/admin/categories?error=${encodeURIComponent(message)}`);
}

async function requireCatManager() {
  const admin = await requirePermission("manage_categories");
  if (!admin) fail("You don't have permission to do that.");
  return admin;
}

export async function createCategory(formData: FormData) {
  await requireCatManager();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) fail("Category name is required.");

  const existing = await prisma.category.findUnique({ where: { name } });
  if (existing) fail(`A category named "${name}" already exists.`);

  await prisma.category.create({ data: { name } });
  revalidatePath("/admin/categories");
}

export async function renameCategory(formData: FormData) {
  await requireCatManager();
  const categoryId = String(formData.get("categoryId") ?? "");
  const newName = String(formData.get("newName") ?? "").trim();

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) fail("Category not found.");
  if (!newName) fail("New name is required.");

  const clash = await prisma.category.findUnique({ where: { name: newName } });
  if (clash) fail(`A category named "${newName}" already exists.`);

  await prisma.category.update({ where: { id: categoryId }, data: { name: newName } });
  revalidatePath("/admin/categories");
}

export async function deleteCategory(formData: FormData) {
  await requireCatManager();
  const categoryId = String(formData.get("categoryId") ?? "");

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) fail("Category not found.");

  const questionCount = await prisma.questionCategory.count({ where: { categoryId } });
  if (questionCount > 0) {
    fail(`Cannot delete "${category.name}" — ${questionCount} question(s) still use this category. Remove the category from those questions first.`);
  }

  await prisma.category.delete({ where: { id: categoryId } });
  revalidatePath("/admin/categories");
}