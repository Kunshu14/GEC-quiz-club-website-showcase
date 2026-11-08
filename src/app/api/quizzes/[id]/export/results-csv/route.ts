import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getViewer, hasPermission } from "@/lib/access";
import {
  buildQuizResultsExportData,
  generateResultsCsv,
  generateResultsTsv,
} from "@/lib/export/results";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer();
  if (viewer.kind !== "member") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const quiz = await prisma.quiz.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      qms: { select: { userId: true } },
    },
  });

  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  const canBuild = await hasPermission(viewer.user, "build_quizzes");
  const canManage = await hasPermission(viewer.user, "manage_questions");
  const isQm = quiz.qms.some((q) => q.userId === viewer.user.id);
  const isAdmin = viewer.user.role?.name === "Admin";

  if (!canBuild && !canManage && !isQm && !isAdmin) {
    return NextResponse.json({ error: "Forbidden: You do not have permission to export quiz results" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "csv"; // 'csv' | 'tsv' | 'json'
  const viewMode = searchParams.get("viewMode") === "QUESTIONS" ? "QUESTIONS" : "ROUNDS";
  const includeEmails = searchParams.get("emails") !== "false";
  const includeColleges = searchParams.get("colleges") !== "false";
  const includeNoShows = searchParams.get("noShows") !== "false";
  const includeUnseated = searchParams.get("unseated") !== "false";

  const exportData = await buildQuizResultsExportData(id);
  if (!exportData) {
    return NextResponse.json({ error: "Unable to compile quiz results" }, { status: 500 });
  }

  const options = {
    includeEmails,
    includeColleges,
    includeNoShows,
    includeUnseated,
    viewMode: viewMode as "ROUNDS" | "QUESTIONS",
  };

  const suffix = viewMode === "QUESTIONS" ? "_questions" : "_results";
  const safeTitle = `${exportData.quizTitle.replace(/[^a-zA-Z0-9_-]/g, "_")}${suffix}`;

  if (format === "json") {
    return NextResponse.json({ data: exportData });
  }

  if (format === "tsv") {
    const tsv = generateResultsTsv(exportData, options);
    return new NextResponse(tsv, {
      status: 200,
      headers: {
        "Content-Type": "text/tab-separated-values; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeTitle}_results.tsv"`,
      },
    });
  }

  // Default: CSV with UTF-8 BOM
  const csv = generateResultsCsv(exportData, options);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeTitle}_results.csv"`,
    },
  });
}
