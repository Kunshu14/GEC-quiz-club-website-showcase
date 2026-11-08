import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string | null;
}

/**
 * Creates a single in-app notification for a user.
 */
export async function createNotification(params: CreateNotificationParams) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      linkUrl: params.linkUrl ?? null,
    },
  });
}

/**
 * Creates notifications for multiple users simultaneously.
 */
export async function notifyUsers(
  userIds: string[],
  params: Omit<CreateNotificationParams, "userId">
) {
  if (userIds.length === 0) return { count: 0 };

  const uniqueIds = Array.from(new Set(userIds));
  return prisma.notification.createMany({
    data: uniqueIds.map((userId) => ({
      userId,
      type: params.type,
      title: params.title,
      message: params.message,
      linkUrl: params.linkUrl ?? null,
    })),
  });
}

/**
 * Sends a notification to all active council members who hold a specific permission,
 * plus all administrators.
 */
export async function notifyCouncilWithPermission(
  permissionKey: string,
  params: Omit<CreateNotificationParams, "userId">,
  excludeUserId?: string
) {
  // Find roles that have this permission, or are Admin
  const rolesWithPermission = await prisma.rolePermission.findMany({
    where: {
      permission: { key: permissionKey },
    },
    select: { roleId: true },
  });

  const roleIds = new Set(rolesWithPermission.map((rp) => rp.roleId));

  // Also include Admin roles
  const adminRoles = await prisma.role.findMany({
    where: { name: "Admin" },
    select: { id: true },
  });
  adminRoles.forEach((r) => roleIds.add(r.id));

  // Find all active users with these roles
  const users = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      roleId: { in: Array.from(roleIds) },
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true },
  });

  const userIds = users.map((u) => u.id);
  return notifyUsers(userIds, params);
}

/**
 * Sends a notification to all assigned Quizmasters of a quiz.
 */
export async function notifyQuizmasters(
  quizId: string,
  params: Omit<CreateNotificationParams, "userId">,
  excludeUserId?: string
) {
  const qms = await prisma.quizQm.findMany({
    where: {
      quizId,
      ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
    },
    select: { userId: true },
  });

  const userIds = qms.map((qm) => qm.userId);
  return notifyUsers(userIds, params);
}
