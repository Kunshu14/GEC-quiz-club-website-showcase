import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getViewer, hasPermission } from "@/lib/access";
import { generatePptx } from "@/lib/export/pptx";

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

  // Check permissions: build_quizzes or manage_questions or QM for this quiz
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
  const {
    includeSafetySlide = true,
    safetyImageUrl = null,
    includeNotes = true,
    includeRoundTransitions = true,
  } = body;

  const exportData = {
    id: quiz.id,
    title: quiz.title,
    academicYear: quiz.academicYear,
    date: quiz.date,
    venueOrPlatform: quiz.venueOrPlatform,
    format: quiz.format,
    mode: quiz.mode,
    timing: quiz.timing,
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

  try {
    const buffer = await generatePptx(exportData, {
      includeSafetySlide,
      safetyImageUrl,
      includeNotes,
      includeRoundTransitions,
    });

    const safeTitle = quiz.title.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `${safeTitle}.pptx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    console.error("PPTX generation error:", err);
    return NextResponse.json(
      { error: (err as Error)?.message || "Failed to generate PPTX" },
      { status: 500 },
    );
  }
}
