import { cache } from "react";
import type { AccessRequest, User } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Master prompt Section 5.4: "Once an email accumulates N denied requests
// (default N = 3), Path A locks for that email."
export const DENIAL_CAP = 3;

export type Viewer =
  | { kind: "anonymous" }
  | { kind: "revoked"; email: string; name: string | null; user: User }
  | {
      kind: "unregistered";
      email: string;
      name: string | null;
      latestAccessRequest: AccessRequest | null;
      denialCount: number;
      capped: boolean;
    }
  | { kind: "member"; email: string; name: string | null; user: UserWithRole };

export type UserWithRole = User & {
  role: {
    name: string;
    rolePermissions?: {
      permission: { key: string };
    }[];
  };
  permissions?: string[];
};

/**
 * The single source of truth for "who is asking, and what are they
 * allowed to do" (Section 4/5). Always re-queries the `users` table fresh
 * — never trusts a cached role/status from the session token — so a
 * revocation takes effect on the very next request (Section 4's
 * requirement), not after some session-lifetime delay.
 *
 * Single-query optimization: fetches user, role, and all granted permission
 * keys in ONE database round-trip, caching them in-memory for the lifetime of
 * the request so subsequent `hasPermission` checks are instantaneous (0ms).
 * Wrapped in React cache() to deduplicate multiple calls during a single render pass.
 */
export const getViewer = cache(async (): Promise<Viewer> => {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) {
    return { kind: "anonymous" };
  }

  const name = session?.user?.name ?? null;
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      role: {
        select: {
          name: true,
          rolePermissions: {
            select: {
              permission: {
                select: { key: true },
              },
            },
          },
        },
      },
    },
  });

  if (user) {
    // Self-heal: if the DB name is NULL but the Google session has a name,
    // backfill it immediately so the user sees their name on the next page
    // load without needing to sign out and back in.
    if (!user.name && name) {
      await prisma.user.update({ where: { email }, data: { name } });
      user.name = name;
    }

    const permissions = user.role.rolePermissions.map((rp) => rp.permission.key);
    const viewerUser: UserWithRole = {
      ...user,
      permissions,
    };

    if (user.status === "REVOKED") {
      return { kind: "revoked", email, name, user: viewerUser };
    }
    return { kind: "member", email, name, user: viewerUser };
  }

  const [latestAccessRequest, denialCount] = await Promise.all([
    prisma.accessRequest.findFirst({
      where: { email },
      orderBy: { requestedAt: "desc" },
    }),
    prisma.accessRequest.count({ where: { email, status: "DENIED" } }),
  ]);

  return {
    kind: "unregistered",
    email,
    name,
    latestAccessRequest,
    denialCount,
    capped: denialCount >= DENIAL_CAP,
  };
});

/**
 * Fetches the permission keys granted to a user's role.
 * If permissions were already loaded with the user object (e.g. from getViewer()),
 * returns them directly without querying the database.
 */
export async function getUserPermissions(
  user: Pick<User, "roleId"> & {
    permissions?: string[];
    role?: {
      rolePermissions?: { permission: { key: string } }[];
    };
  },
): Promise<string[]> {
  if (user.permissions) {
    return user.permissions;
  }
  if (user.role?.rolePermissions) {
    return user.role.rolePermissions.map((rp) => rp.permission.key);
  }
  const perms = await prisma.rolePermission.findMany({
    where: { roleId: user.roleId },
    include: { permission: { select: { key: true } } },
  });
  return perms.map((rp) => rp.permission.key);
}

/**
 * Returns true if the member currently has the given permission key.
 * If permissions were already loaded with the user object (e.g. from getViewer()),
 * performs an instantaneous in-memory check without querying the database.
 */
export async function hasPermission(
  user: Pick<User, "roleId"> & {
    permissions?: string[];
    role?: {
      rolePermissions?: { permission: { key: string } }[];
    };
  },
  permissionKey: string,
): Promise<boolean> {
  if (user.permissions) {
    return user.permissions.includes(permissionKey);
  }
  if (user.role?.rolePermissions) {
    return user.role.rolePermissions.some(
      (rp) => rp.permission?.key === permissionKey,
    );
  }
  const count = await prisma.rolePermission.count({
    where: { roleId: user.roleId, permission: { key: permissionKey } },
  });
  return count > 0;
}

/**
 * Server-side permission gate for use in pages/route handlers
 * (Section 4: "All of these checks must be enforced server-side, in the
 * API layer — never rely on hiding UI elements as the only gate.").
 *
 * Returns the authorized User row (with role) or null if the viewer
 * doesn't qualify (not signed in, revoked, unregistered, or lacks the
 * permission).
 */
export async function requirePermission(
  permissionKey: string,
): Promise<UserWithRole | null> {
  const viewer = await getViewer();
  if (viewer.kind !== "member") return null;
  if (!(await hasPermission(viewer.user, permissionKey))) return null;
  return viewer.user;
}