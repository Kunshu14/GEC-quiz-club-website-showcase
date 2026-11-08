import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getViewer, hasPermission } from "@/lib/access";
import { generateCanvaCsv } from "@/lib/export/canva";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer();
  if (viewer.kind !== "member") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const canBuild = await hasPermission(viewer.user, "build_quizzes");
  const canManage = await hasPermission(viewer.user, "manage_questions");

  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: {
      qms: {
        include: {
          user: { select: { name: true, email: true } },
        },
      },
      usageLogs: {
        orderBy: { orderIndex: "asc" },
        include: {
          question: {
            include: {
              questionCategories: { include: { category: true } },
              media: true,
            },
          },
        },
      },
    },
  });

  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  const isQm = quiz.qms.some((q) => q.userId === viewer.user.id);
  if (!canBuild && !canManage && !isQm) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = await request.json().catch(() => ({}));
  const { safetyImageUrl = null } = body;

  const exportData = {
    id: quiz.id,
    title: quiz.title,
    academicYear: quiz.academicYear,
    date: quiz.date,
    venueOrPlatform: quiz.venueOrPlatform,
    qms: quiz.qms.map((q) => ({ name: q.user.name, email: q.user.email })),
    usageLogs: quiz.usageLogs.map((log) => ({
      orderIndex: log.orderIndex,
      roundName: log.roundName,
      question: {
        id: log.question.id,
        text: log.question.text,
        answerText: log.question.answerText,
        difficulty: log.question.difficulty,
        notes: log.question.notes,
        categories: log.question.questionCategories.map((qc) => ({
          name: qc.category.name,
          subGenre: qc.subGenre,
        })),
        media: log.question.media.map((m) => ({
          role: m.role,
          type: m.type,
          url: m.url,
        })),
      },
    })),
  };

  const csv = generateCanvaCsv(exportData, { safetyImageUrl });
  const safeTitle = quiz.title.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `${safeTitle}_canva.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
