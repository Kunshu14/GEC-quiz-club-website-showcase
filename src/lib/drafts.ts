"use server";

import { DraftStatus, Prisma } from "@prisma/client";
import { getViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export async function saveDraftAction(params: {
  type: string;
  data: Record<string, unknown>;
  status?: DraftStatus;
}) {
  const viewer = await getViewer();
  if (viewer.kind !== "member") return { ok: false, error: "Unauthorized" };

  const { type, data, status = "IN_PROGRESS" } = params;

  await prisma.draft.upsert({
    where: {
      userId_type: {
        userId: viewer.user.id,
        type,
      },
    },
    update: {
      data: data as Prisma.InputJsonValue,
      status,
    },
    create: {
      userId: viewer.user.id,
      type,
      data: data as Prisma.InputJsonValue,
      status,
    },
  });

  return { ok: true };
}

export async function getDraftAction(type: string) {
  const viewer = await getViewer();
  if (viewer.kind !== "member") return null;

  return prisma.draft.findUnique({
    where: {
      userId_type: {
        userId: viewer.user.id,
        type,
      },
    },
  });
}

export async function clearDraftAction(type: string) {
  const viewer = await getViewer();
  if (viewer.kind !== "member") return { ok: false };

  await prisma.draft.deleteMany({
    where: {
      userId: viewer.user.id,
      type,
    },
  });

  return { ok: true };
}
