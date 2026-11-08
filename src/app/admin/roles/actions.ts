"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";

function fail(message: string): never {
  redirect(`/admin/roles?error=${encodeURIComponent(message)}`);
}

async function requireManager() {
  const admin = await requirePermission("manage_users");
  if (!admin) fail("You don't have permission to do that.");
  return admin;
}

export async function createRole(formData: FormData) {
  await requireManager();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) fail("Role name is required.");
  if (name.length > 100) fail("Role name is too long.");

  const existing = await prisma.role.findUnique({ where: { name } });
  if (existing) fail(`A role named "${name}" already exists.`);

  const maxOrder = await prisma.role.aggregate({ _max: { sortOrder: true } });
  const nextSortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  await prisma.role.create({
    data: { name, isSystem: false, sortOrder: nextSortOrder },
  });
  revalidatePath("/admin/roles");
}

export async function renameRole(formData: FormData) {
  await requireManager();
  const roleId = String(formData.get("roleId") ?? "");
  const newName = String(formData.get("newName") ?? "").trim();

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) fail("Role not found.");
  if (role.isSystem) fail("System roles cannot be renamed.");
  if (!newName) fail("New name is required.");

  const clash = await prisma.role.findUnique({ where: { name: newName } });
  if (clash) fail(`A role named "${newName}" already exists.`);

  await prisma.role.update({ where: { id: roleId }, data: { name: newName } });
  revalidatePath("/admin/roles");
}

export async function deleteRole(formData: FormData) {
  await requireManager();
  const roleId = String(formData.get("roleId") ?? "");

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) fail("Role not found.");
  if (role.isSystem) fail("System roles cannot be deleted.");

  const userCount = await prisma.user.count({ where: { roleId } });
  if (userCount > 0) fail(`Cannot delete "${role.name}" — ${userCount} user(s) still have this role. Reassign them first.`);

  await prisma.role.delete({ where: { id: roleId } });
  revalidatePath("/admin/roles");
}

export async function togglePermission(formData: FormData) {
  await requireManager();
  const roleId = String(formData.get("roleId") ?? "");
  const permissionId = String(formData.get("permissionId") ?? "");

  const existing = await prisma.rolePermission.findUnique({
    where: { roleId_permissionId: { roleId, permissionId } },
  });

  if (existing) {
    await prisma.rolePermission.delete({
      where: { roleId_permissionId: { roleId, permissionId } },
    });
  } else {
    await prisma.rolePermission.create({
      data: { roleId, permissionId },
    });
  }

  revalidatePath("/admin/roles");
}