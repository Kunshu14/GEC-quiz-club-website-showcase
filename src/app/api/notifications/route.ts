import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const viewer = await getViewer();
  if (viewer.kind !== "member") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const where = {
    userId: viewer.user.id,
    ...(unreadOnly ? { read: false } : {}),
  };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.notification.count({ where: { userId: viewer.user.id } }),
    prisma.notification.count({
      where: { userId: viewer.user.id, read: false },
    }),
  ]);

  return NextResponse.json({
    notifications,
    total,
    unreadCount,
    limit,
    offset,
  });
}

export async function PATCH(request: NextRequest) {
  const viewer = await getViewer();
  if (viewer.kind !== "member") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { all, ids } = body;

    if (all) {
      const result = await prisma.notification.updateMany({
        where: { userId: viewer.user.id, read: false },
        data: { read: true },
      });
      return NextResponse.json({ ok: true, markedCount: result.count });
    }

    if (Array.isArray(ids) && ids.length > 0) {
      const result = await prisma.notification.updateMany({
        where: {
          id: { in: ids.map(String) },
          userId: viewer.user.id,
        },
        data: { read: true },
      });
      return NextResponse.json({ ok: true, markedCount: result.count });
    }

    return NextResponse.json({ error: "Missing 'all' flag or 'ids' array" }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error)?.message || "Failed to update notifications" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const viewer = await getViewer();
  if (viewer.kind !== "member") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const clearRead = searchParams.get("clearRead") === "true";

    if (id) {
      await prisma.notification.deleteMany({
        where: { id, userId: viewer.user.id },
      });
      return NextResponse.json({ ok: true });
    }

    if (clearRead) {
      const result = await prisma.notification.deleteMany({
        where: { userId: viewer.user.id, read: true },
      });
      return NextResponse.json({ ok: true, deletedCount: result.count });
    }

    return NextResponse.json({ error: "Specify 'id' or 'clearRead=true'" }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error)?.message || "Failed to delete notifications" },
      { status: 500 }
    );
  }
}
