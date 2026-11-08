import { NextRequest, NextResponse } from "next/server";
import { getViewer } from "@/lib/access";
import { uploadMediaFile, validateMediaFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const viewer = await getViewer();
  if (viewer.kind !== "member") {
    return NextResponse.json(
      { error: "You must be signed in as an active council member to upload media." },
      { status: 401 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const role = (formData.get("role") as string) || "QUESTION";

    if (!file) {
      return NextResponse.json({ error: "No file provided in upload request." }, { status: 400 });
    }

    const mimeType = file.type || "application/octet-stream";
    const validation = validateMediaFile(file, mimeType);

    if (!validation.valid || !validation.type) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const url = await uploadMediaFile({
      buffer,
      fileName: file.name || `media_${Date.now()}`,
      mimeType,
      subFolder: role.toLowerCase() === "answer" ? "answers" : "questions",
    });

    return NextResponse.json({
      ok: true,
      url,
      type: validation.type,
      role: role.toUpperCase() === "ANSWER" ? "ANSWER" : "QUESTION",
      fileName: file.name,
      size: file.size,
    });
  } catch (error) {
    console.error("Upload route error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process upload." },
      { status: 500 },
    );
  }
}
