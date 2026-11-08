"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasPermission, requirePermission } from "@/lib/access";
import { getRoleIdByName, MEMBER_ROLE_NAME } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

function fail(message: string): never {
  redirect(`/admin?error=${encodeURIComponent(message)}`);
}

async function requireAdmin() {
  const admin = await requirePermission("manage_users");
  if (!admin) fail("You don't have permission to do that.");
  return admin;
}

// Section 5.2 step 3: "Admin approves (access on immediately)."
export async function approveAccessRequest(formData: FormData) {
  const admin = await requireAdmin();
  const requestId = String(formData.get("requestId") ?? "");
  const request = await prisma.accessRequest.findUnique({ where: { id: requestId } });
  if (!request || request.status !== "PENDING") {
    fail("That request is no longer pending.");
  }

  const memberRoleId = await getRoleIdByName(MEMBER_ROLE_NAME);
  if (!memberRoleId) fail("Default member role is missing — check the seed.");

  await prisma.$transaction([
    prisma.user.upsert({
      where: { email: request.email },
      update: {},
      create: { email: request.email, roleId: memberRoleId, status: "ACTIVE" },
    }),
    prisma.accessRequest.update({
      where: { id: requestId },
      data: { status: "APPROVED", decidedById: admin.id, decidedAt: new Date() },
    }),
  ]);

  revalidatePath("/admin");
}

// Section 5.2 step 3 / 5.4: denying "adds a denied row" toward the cap —
// implemented as updating this request's own row to DENIED rather than
// inserting a duplicate, since each self-request cycle is one row that
// transitions pending -> denied; a *new* request cycle (Section 5.4: "the
// person can request again") is what creates the next fresh row.
export async function denyAccessRequest(formData: FormData) {
  const admin = await requireAdmin();
  const requestId = String(formData.get("requestId") ?? "");
  const request = await prisma.accessRequest.findUnique({ where: { id: requestId } });
  if (!request || request.status !== "PENDING") {
    fail("That request is no longer pending.");
  }

  await prisma.accessRequest.update({
    where: { id: requestId },
    data: { status: "DENIED", decidedById: admin.id, decidedAt: new Date() },
  });

  revalidatePath("/admin");
}

// Path B (Section 5.3): admin adds an email as invited before that person
// has ever logged in. Only for genuinely new people — someone who already
// has a `users` row should be Reinstated/Promoted instead, not re-invited.
export async function inviteByEmail(formData: FormData) {
  const admin = await requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const note = String(formData.get("note") ?? "").trim();

  if (!email || !email.includes("@")) {
    fail("Enter a valid email address.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    fail(`The email "${email}" already has an active account — use Reinstate or Promote instead.`);
  }

  const existingRequest = await prisma.accessRequest.findFirst({
    where: { email, status: { in: ["INVITED", "PENDING"] } },
    orderBy: { requestedAt: "desc" },
  });

  if (existingRequest) {
    if (existingRequest.status === "INVITED") {
      fail(`An invite has already been sent to "${email}".`);
    }
    if (existingRequest.status === "PENDING") {
      fail(`The email "${email}" already has a pending access request waiting in the review queue.`);
    }
  }

  await prisma.accessRequest.create({
    data: {
      email,
      note: note.length > 0 ? note : null,
      status: "INVITED",
      decidedById: admin.id,
      decidedAt: new Date(),
    },
  });

  revalidatePath("/admin");
}

// A "admin-capable" count now means: any ACTIVE user whose role carries the
// manage_users permission (president, admin, etc.), not a hardcoded role.
async function countActiveAdmins() {
  return prisma.user.count({
    where: {
      status: "ACTIVE",
      role: { rolePermissions: { some: { permission: { key: "manage_users" } } } },
    },
  });
}

// Section 5.5 safeguards: never revoke the last active admin-capable user,
// and a manager can't revoke their own account.
export async function revokeUser(formData: FormData) {
  const admin = await requireAdmin();
  const targetId = String(formData.get("userId") ?? "");

  if (targetId === admin.id) {
    fail("You can't revoke your own account — ask another manager.");
  }

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) fail("User not found.");
  if (target.status === "REVOKED") {
    revalidatePath("/admin");
    return;
  }

  if (await hasPermission(target, "manage_users")) {
    const activeAdmins = await countActiveAdmins();
    if (activeAdmins <= 1) {
      fail("You can't revoke the last remaining manager.");
    }
  }

  await prisma.user.update({
    where: { id: targetId },
    data: { status: "REVOKED" },
  });

  revalidatePath("/admin");
}

// Modeled as the symmetric counterpart to Revoke, including the same
// last-manager/self-action safeguards. Flagged as a resolved ambiguity in
// PROJECT_STATE.md rather than left unbuilt.
export async function markAlumni(formData: FormData) {
  const admin = await requireAdmin();
  const targetId = String(formData.get("userId") ?? "");

  if (targetId === admin.id) {
    fail("You can't mark your own account as alumni — ask another manager.");
  }

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) fail("User not found.");
  if (target.status !== "ACTIVE") {
    fail("Only active members can be marked as alumni.");
  }

  if (await hasPermission(target, "manage_users")) {
    const activeAdmins = await countActiveAdmins();
    if (activeAdmins <= 1) {
      fail("You can't mark the last remaining manager as alumni.");
    }
  }

  const memberRoleId = await getRoleIdByName(MEMBER_ROLE_NAME);
  if (!memberRoleId) fail("Default member role is missing — check the seed.");

  const gradYearRaw = formData.get("graduatingYear");
  const parsedGradYear = gradYearRaw ? parseInt(String(gradYearRaw), 10) : null;
  const graduatingYear = Number.isInteger(parsedGradYear) ? parsedGradYear : null;

  await prisma.user.update({
    where: { id: targetId },
    data: {
      status: "ALUMNI",
      roleId: memberRoleId,
      ...(graduatingYear ? { graduatingYear } : {}),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/alumni");
}

export async function updateAlumniYear(formData: FormData) {
  await requireAdmin();
  const targetId = String(formData.get("userId") ?? "");
  const gradYearRaw = formData.get("graduatingYear");
  const parsedGradYear = gradYearRaw ? parseInt(String(gradYearRaw), 10) : null;
  const graduatingYear = Number.isInteger(parsedGradYear) ? parsedGradYear : null;

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) fail("User not found.");

  await prisma.user.update({
    where: { id: targetId },
    data: { graduatingYear },
  });

  revalidatePath("/admin");
  revalidatePath("/alumni");
}

// Section 5.6: baseline reset is automatic — status -> active, role ->
// Member, regardless of what they held before. Re-promoting is a
// separate, explicit action (promoteUser below), never a side effect of
// this one.
export async function reinstateUser(formData: FormData) {
  await requireAdmin();
  const targetId = String(formData.get("userId") ?? "");

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) fail("User not found.");
  if (target.status === "ACTIVE") {
    revalidatePath("/admin");
    return;
  }

  const memberRoleId = await getRoleIdByName(MEMBER_ROLE_NAME);
  if (!memberRoleId) fail("Default member role is missing — check the seed.");

  await prisma.user.update({
    where: { id: targetId },
    data: { status: "ACTIVE", roleId: memberRoleId },
  });

  revalidatePath("/admin");
}

// Section 5.6: "Restoring privileges is a separate, explicit 'promote'
// action by a current manager — never automatic." Role assignment now
// picks from the roles table (any role, including custom ones added later).
export async function promoteUser(formData: FormData) {
  await requireAdmin();
  const targetId = String(formData.get("userId") ?? "");
  const roleId = String(formData.get("roleId") ?? "");

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) fail("Not a valid role.");

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) fail("User not found.");
  if (target.status !== "ACTIVE") {
    fail("Only active members can have their role changed — reinstate them first.");
  }

  const promotedToManager = await prisma.rolePermission.count({
    where: { roleId, permission: { key: "manage_users" } },
  });

  await prisma.user.update({
    where: { id: targetId },
    data: {
      roleId,
      // Sticky flag, never unset — Section 5.6 needs a way to remember
      // "this person was previously a manager" even after a later reset
      // back to Member (e.g. via alumni transition or reinstatement).
      wasAdmin: target.wasAdmin || promotedToManager > 0,
    },
  });

  revalidatePath("/admin");
}