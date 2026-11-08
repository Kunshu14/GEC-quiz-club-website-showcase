import { NextRequest, NextResponse } from "next/server";
import { getViewer, hasPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { parseLegacySpreadsheet } from "@/lib/import/legacyImport";
import { findSimilarQuestion } from "@/lib/duplicates";
import { MediaType, QuestionDifficulty, QuestionStatus } from "@prisma/client";

function getMediaTypeFromUrl(url: string): MediaType {
  const lower = url.toLowerCase().split("?")[0];
  if (lower.endsWith(".mp3") || lower.endsWith(".wav") || lower.endsWith(".ogg") || lower.endsWith(".m4a") || lower.includes("audio")) {
    return MediaType.AUDIO;
  }
  if (lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".mov") || lower.endsWith(".mkv") || lower.includes("video")) {
    return MediaType.VIDEO;
  }
  return MediaType.IMAGE;
}

export async function POST(req: NextRequest) {
  try {
    const viewer = await getViewer();
    if (viewer.kind !== "member") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canManageQuestions = await hasPermission(
      viewer.user,
      "manage_questions"
    );
    if (!canManageQuestions) {
      return NextResponse.json(
        { error: "Forbidden: requires question management privileges." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      rawText,
      defaultStatus = "APPROVED",
      attributeMode = "CURRENT_USER",
    } = body;

    if (!rawText || typeof rawText !== "string") {
      return NextResponse.json(
        { error: "Spreadsheet content is required." },
        { status: 400 }
      );
    }

    const parsed = parseLegacySpreadsheet(rawText);
    if (parsed.errors.length > 0) {
      return NextResponse.json(
        { error: parsed.errors.join("; "), details: parsed },
        { status: 400 }
      );
    }

    const validRows = parsed.rows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      return NextResponse.json(
        { error: "No valid question rows found to import." },
        { status: 400 }
      );
    }

    // Resolve submitter user ID
    let submitterId = viewer.user.id;

    if (attributeMode === "LEGACY_BOT") {
      // Find or create dedicated legacy import user
      let legacyUser = await prisma.user.findUnique({
        where: { email: "legacy-import@gecquizclub.internal" },
      });

      if (!legacyUser) {
        const defaultRole = await prisma.role.findFirst({
          where: { name: "Member" },
        });
        legacyUser = await prisma.user.create({
          data: {
            email: "legacy-import@gecquizclub.internal",
            name: "Legacy Question Bank",
            roleId: defaultRole?.id || viewer.user.roleId,
            status: "ACTIVE",
          },
        });
      }
      submitterId = legacyUser.id;
    }

    // Load available categories
    const categories = await prisma.category.findMany();
    const categoryMap = new Map<string, string>();
    for (const cat of categories) {
      categoryMap.set(cat.name.toLowerCase().trim(), cat.id);
    }
    const fallbackCategoryId = categories[0]?.id;

    let importedClean = 0;
    let importedFlagged = 0;
    const itemSummaries: Array<{
      rowIndex: number;
      text: string;
      status: QuestionStatus;
      duplicateScore?: number;
    }> = [];

    // Process questions
    for (const row of validRows) {
      // 1. Run duplicate similarity check
      const duplicateMatch = await findSimilarQuestion(
        row.text,
        row.answerText
      );

      const isDuplicate = Boolean(duplicateMatch);
      const questionStatus: QuestionStatus = isDuplicate
        ? QuestionStatus.FLAGGED
        : (defaultStatus as QuestionStatus);

      if (isDuplicate) {
        importedFlagged++;
      } else {
        importedClean++;
      }

      // 2. Resolve category
      let categoryId = fallbackCategoryId;
      if (row.categoryName) {
        const normCat = row.categoryName.toLowerCase().trim();
        if (categoryMap.has(normCat)) {
          categoryId = categoryMap.get(normCat)!;
        } else {
          // Fuzzy match against existing categories
          for (const [existingName, id] of categoryMap.entries()) {
            if (
              existingName.includes(normCat) ||
              normCat.includes(existingName)
            ) {
              categoryId = id;
              break;
            }
          }
        }
      }

      // 3. Assemble notes
      const notesParts: string[] = [];
      if (row.notes) notesParts.push(row.notes);
      if (row.usedBefore) {
        notesParts.push(`[Used Previously: ${row.usedBefore}]`);
      }
      if (row.submitter) {
        notesParts.push(`[Original Author: ${row.submitter}]`);
      }
      const finalNotes = notesParts.length > 0 ? notesParts.join("\n") : null;

      // 4. Create Question record
      const question = await prisma.question.create({
        data: {
          text: row.text,
          answerText: row.answerText,
          difficulty: row.difficulty as QuestionDifficulty,
          notes: finalNotes,
          status: questionStatus,
          duplicateOfId: duplicateMatch?.id ?? null,
          duplicateScore: duplicateMatch?.score ?? null,
          submittedById: submitterId,
        },
      });

      // 5. Link category if resolved
      if (categoryId) {
        await prisma.questionCategory.create({
          data: {
            questionId: question.id,
            categoryId,
            subGenre: row.subGenre || null,
          },
        });
      }

      // 6. Bridge media URL if present
      if (row.mediaUrl) {
        await prisma.questionMedia.create({
          data: {
            questionId: question.id,
            role: "QUESTION",
            type: getMediaTypeFromUrl(row.mediaUrl),
            url: row.mediaUrl,
            uploadedById: submitterId,
          },
        });
      }

      itemSummaries.push({
        rowIndex: row.rowIndex,
        text: row.text.slice(0, 60),
        status: questionStatus,
        duplicateScore: duplicateMatch?.score,
      });
    }

    return NextResponse.json({
      ok: true,
      totalProcessed: validRows.length,
      importedClean,
      importedFlagged,
      items: itemSummaries,
    });
  } catch (error) {
    console.error("Legacy question import error:", error);
    return NextResponse.json(
      { error: "Failed to process legacy question import." },
      { status: 500 }
    );
  }
}
