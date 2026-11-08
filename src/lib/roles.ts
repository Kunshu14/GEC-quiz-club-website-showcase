import { prisma } from "@/lib/prisma";

// Convenience lookup for the system-seeded roles referenced by name in
// application code (Member catch-all, Admin dev/maintenance role). Role
// IDs are CUIDs generated at migration time, so look up by the stable
// unique `name` rather than hard-coding an id literal.
export async function getRoleIdByName(name: string): Promise<string | null> {
  const role = await prisma.role.findUnique({ where: { name }, select: { id: true } });
  return role?.id ?? null;
}

export const MEMBER_ROLE_NAME = "Member";
export const ADMIN_ROLE_NAME = "Admin";