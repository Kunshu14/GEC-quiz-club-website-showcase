import pptxgen from "pptxgenjs";
import fs from "fs";
import path from "path";

export interface ExportQuestionMedia {
  role: string;
  type: string;
  url: string;
}

export interface ExportUsageLog {
  orderIndex: number;
  roundName: string | null;
  question: {
    id: string;
    text: string;
    answerText: string;
    difficulty: string;
    notes: string | null;
    categories: { name: string; subGenre: string | null }[];
    media: ExportQuestionMedia[];
  };
}

export interface ExportQuizData {
  id: string;
  title: string;
  academicYear: string;
  date: Date | string;
  venueOrPlatform: string;
  format?: string | null;
  mode?: string | null;
  timing?: string | null;
  qms: { name: string | null; email: string }[];
  usageLogs: ExportUsageLog[];
}

export interface PptxExportOptions {
  includeSafetySlide?: boolean;
  safetyImageUrl?: string | null;
  includeNotes?: boolean;
  includeRoundTransitions?: boolean;
}

interface ResolvedImage {
  path?: string;
  data?: string;
  size?: { width: number; height: number };
}

interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Extracts width and height in pixels from PNG, JPEG, GIF, and WebP image buffers.
 * Returns null if the format cannot be determined or buffer is too short.
 */
function getImageSize(buffer: Buffer): { width: number; height: number } | null {
  if (!buffer || buffer.length < 16) return null;

  // 1. PNG: magic 89 50 4E 47 0D 0A 1A 0A, width at 16, height at 20 (big-endian 32-bit)
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    if (buffer.length >= 24) {
      return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
      };
    }
  }

  // 2. GIF: 'GIF87a' or 'GIF89a', width at 6, height at 8 (little-endian 16-bit)
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46
  ) {
    if (buffer.length >= 10) {
      return {
        width: buffer.readUInt16LE(6),
        height: buffer.readUInt16LE(8),
      };
    }
  }

  // 3. JPEG: Starts with FF D8
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset < buffer.length - 8) {
      if (buffer[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = buffer[offset + 1];
      // SOF0 through SOF15 except DHT, JPG, DAC
      if (
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc
      ) {
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);
        if (width > 0 && height > 0) {
          return { width, height };
        }
      }
      const segmentLength = buffer.readUInt16BE(offset + 2);
      if (segmentLength <= 0) break;
      offset += 2 + segmentLength;
    }
  }

  // 4. WebP: RIFF ... WEBP
  if (
    buffer.length >= 30 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    const chunkHeader = buffer.subarray(12, 16).toString("ascii");
    if (chunkHeader === "VP8 " && buffer.length >= 30) {
      return {
        width: buffer.readUInt16LE(26) & 0x3fff,
        height: buffer.readUInt16LE(28) & 0x3fff,
      };
    } else if (chunkHeader === "VP8X" && buffer.length >= 30) {
      const width = 1 + buffer.readUIntLE(24, 3);
      const height = 1 + buffer.readUIntLE(27, 3);
      return { width, height };
    }
  }

  return null;
}

/**
 * Calculates (x, y, w, h) for an image to fit inside a target bounding box
 * while strictly preserving its aspect ratio and centering it.
 */
function calculateFittedImage(
  imgSize: { width: number; height: number } | undefined,
  box: BoundingBox,
): BoundingBox {
  if (!imgSize || !imgSize.width || !imgSize.height) {
    return box;
  }

  const imgRatio = imgSize.width / imgSize.height;
  const boxRatio = box.w / box.h;

  let finalW = box.w;
  let finalH = box.h;

  if (imgRatio > boxRatio) {
    // Image is wider than box -> constrained by box width
    finalW = box.w;
    finalH = box.w / imgRatio;
  } else {
    // Image is taller than box -> constrained by box height
    finalH = box.h;
    finalW = box.h * imgRatio;
  }

  // Center horizontally and vertically within target box
  const finalX = box.x + (box.w - finalW) / 2;
  const finalY = box.y + (box.h - finalH) / 2;

  return {
    x: Number(finalX.toFixed(3)),
    y: Number(finalY.toFixed(3)),
    w: Number(finalW.toFixed(3)),
    h: Number(finalH.toFixed(3)),
  };
}

/**
 * Resolves an image input (remote URL, relative /uploads/... path, or data URL)
 * into a format pptxgenjs can embed without filesystem ENOENT errors across platforms.
 * Also parses dimensions whenever buffer data is available.
 */
function resolveImageParam(url: string | null | undefined): ResolvedImage | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // 1. Data URL
  if (trimmed.startsWith("data:")) {
    const base64Match = trimmed.match(/^data:image\/[^;]+;base64,(.+)$/);
    if (base64Match) {
      try {
        const buf = Buffer.from(base64Match[1], "base64");
        const size = getImageSize(buf);
        return { data: trimmed, size: size || undefined };
      } catch {
        return { data: trimmed };
      }
    }
    return { data: trimmed };
  }

  // 2. Relative URL from public directory (e.g. /uploads/questions/...)
  if (trimmed.startsWith("/")) {
    const cleanRelPath = trimmed.replace(/^\/+/, "");
    const p1 = path.join(process.cwd(), "public", cleanRelPath);
    const p2 = path.join(process.cwd(), "quiz-club-app", "public", cleanRelPath);
    const resolvedPath = fs.existsSync(p1) ? p1 : fs.existsSync(p2) ? p2 : null;

    if (resolvedPath) {
      try {
        const buf = fs.readFileSync(resolvedPath);
        const size = getImageSize(buf);
        const ext = path.extname(resolvedPath).slice(1).toLowerCase() || "png";
        const mime = ext === "jpg" ? "jpeg" : ext;
        const base64Data = buf.toString("base64");
        return {
          data: `image/${mime};base64,${base64Data}`,
          size: size || undefined,
        };
      } catch (err) {
        console.warn("Could not read local file in public:", resolvedPath, err);
      }
    }
  }

  // 3. Remote URL (http / https)
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return { path: trimmed };
  }

  // 4. Absolute path on disk
  if (fs.existsSync(trimmed)) {
    try {
      const buf = fs.readFileSync(trimmed);
      const size = getImageSize(buf);
      const ext = path.extname(trimmed).slice(1).toLowerCase() || "png";
      const mime = ext === "jpg" ? "jpeg" : ext;
      const base64Data = buf.toString("base64");
      return {
        data: `image/${mime};base64,${base64Data}`,
        size: size || undefined,
      };
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Generates an unformatted, clean 16:9 widescreen PowerPoint presentation.
 * Uses exact standard 13.333" x 7.5" slide canvas with safe margins (>= 0.8" everywhere).
 * Features shrink-to-fit dynamic text, word wrapping, and aspect-ratio preserved media
 * guaranteeing no text or images ever extend outside the slide boundaries.
 */
export async function generatePptx(
  quiz: ExportQuizData,
  options: PptxExportOptions = {},
): Promise<Buffer> {
  const {
    includeSafetySlide = true,
    safetyImageUrl = null,
    includeNotes = true,
    includeRoundTransitions = true,
  } = options;

  const pres = new pptxgen();

  // Explicitly define modern 16:9 widescreen (13.333 inches wide by 7.5 inches high)
  pres.defineLayout({ name: "WIDESCREEN_16x9", width: 13.333, height: 7.5 });
  pres.layout = "WIDESCREEN_16x9";

  pres.author = "GEC Quiz Club";
  pres.company = "GEC Quiz Club Council";
  pres.title = quiz.title;

  const defaultFont = "Arial";

  // -------------------------------------------------------------
  // 1. Title Slide (Clean & Unformatted)
  // -------------------------------------------------------------
  const titleSlide = pres.addSlide();
  titleSlide.background = { color: "FFFFFF" };

  titleSlide.addText(quiz.title, {
    x: 1.0,
    y: 1.6,
    w: 11.33,
    h: 2.5,
    fontSize: quiz.title.length > 50 ? 32 : 38,
    fontFace: defaultFont,
    bold: true,
    color: "111111",
    align: "left",
    valign: "bottom",
    wrap: true,
    fit: "shrink",
    lineSpacingMultiple: 1.15,
  });

  const qmNames = quiz.qms.map((q) => q.name || q.email).join(", ");
  const dateStr = new Date(quiz.date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const metadataLines = [
    `Academic Year: ${quiz.academicYear}  |  Date: ${dateStr}`,
    `Venue: ${quiz.venueOrPlatform}${quiz.timing ? `  |  Time: ${quiz.timing}` : ""}`,
    qmNames ? `Quizmasters: ${qmNames}` : "",
  ].filter(Boolean);

  titleSlide.addText(metadataLines.join("\n"), {
    x: 1.0,
    y: 4.4,
    w: 11.33,
    h: 2.1,
    fontSize: 16,
    fontFace: defaultFont,
    color: "555555",
    align: "left",
    valign: "top",
    lineSpacingMultiple: 1.25,
    wrap: true,
    fit: "shrink",
  });

  // -------------------------------------------------------------
  // 2. Question, Safety & Answer Slides in Sequence
  // -------------------------------------------------------------
  let currentRound: string | null = null;

  for (const log of quiz.usageLogs) {
    const q = log.question;
    const roundName = log.roundName?.trim() || null;

    // Optional Round Transition Slide
    if (includeRoundTransitions && roundName && roundName !== currentRound) {
      currentRound = roundName;
      const roundSlide = pres.addSlide();
      roundSlide.background = { color: "FFFFFF" };

      roundSlide.addText(roundName.toUpperCase(), {
        x: 1.0,
        y: 2.2,
        w: 11.33,
        h: 3.1,
        fontSize: roundName.length > 30 ? 34 : 42,
        fontFace: defaultFont,
        bold: true,
        color: "111111",
        align: "center",
        valign: "middle",
        wrap: true,
        fit: "shrink",
        lineSpacingMultiple: 1.15,
      });
    }

    // -----------------------------------------------------------
    // Question Slide
    // -----------------------------------------------------------
    const qSlide = pres.addSlide();
    qSlide.background = { color: "FFFFFF" };

    // Header info: Question Number + Round + Category / Difficulty
    const headerParts: string[] = [`QUESTION #${log.orderIndex}`];
    if (roundName) headerParts.push(roundName);
    if (q.categories.length > 0) {
      headerParts.push(q.categories.map((c) => c.name).join(", "));
    }
    if (q.difficulty) headerParts.push(q.difficulty);

    qSlide.addText(headerParts.join("   •   "), {
      x: 1.0,
      y: 0.8,
      w: 11.33,
      h: 0.5,
      fontSize: 12,
      fontFace: defaultFont,
      bold: true,
      color: "777777",
      wrap: true,
      fit: "shrink",
    });

    const questionImages = q.media.filter((m) => m.role === "QUESTION" && m.type === "IMAGE");
    const qImageParam = questionImages.length > 0 ? resolveImageParam(questionImages[0].url) : null;

    if (qImageParam) {
      // 2-column layout: left text (6.0" wide), right image (5.0" wide)
      const qTextSize = q.text.length > 300 ? 18 : q.text.length > 150 ? 20 : 24;

      qSlide.addText(q.text, {
        x: 1.0,
        y: 1.5,
        w: 6.0,
        h: 5.1,
        fontSize: qTextSize,
        fontFace: defaultFont,
        color: "111111",
        align: "left",
        valign: "middle",
        lineSpacingMultiple: 1.15,
        wrap: true,
        fit: "shrink",
      });

      // Fit image inside bounding box: x=7.4, y=1.5, w=4.9, h=5.1
      const imageTargetBox: BoundingBox = { x: 7.4, y: 1.5, w: 4.9, h: 5.1 };
      const fitted = calculateFittedImage(qImageParam.size, imageTargetBox);

      try {
        if (qImageParam.data) {
          qSlide.addImage({
            data: qImageParam.data,
            x: fitted.x,
            y: fitted.y,
            w: fitted.w,
            h: fitted.h,
          });
        } else if (qImageParam.path) {
          qSlide.addImage({
            path: qImageParam.path,
            x: fitted.x,
            y: fitted.y,
            w: fitted.w,
            h: fitted.h,
          });
        }
      } catch (err) {
        console.warn("Could not embed question image in PPTX:", err);
      }
    } else {
      // Full-width question text (11.33" wide)
      const qTextSize = q.text.length > 300 ? 22 : q.text.length > 150 ? 26 : 30;

      qSlide.addText(q.text, {
        x: 1.0,
        y: 1.5,
        w: 11.33,
        h: 5.1,
        fontSize: qTextSize,
        fontFace: defaultFont,
        color: "111111",
        align: "left",
        valign: "middle",
        lineSpacingMultiple: 1.2,
        wrap: true,
        fit: "shrink",
      });
    }

    // -----------------------------------------------------------
    // Safety Buffer Slide (Fail-safe against accidental slide advance)
    // -----------------------------------------------------------
    if (includeSafetySlide) {
      const safetySlide = pres.addSlide();
      safetySlide.background = { color: "FFFFFF" };

      if (safetyImageUrl) {
        const safetyImgParam = resolveImageParam(safetyImageUrl);
        if (safetyImgParam) {
          // Fit safety image within slide frame: x=0.8, y=0.8, w=11.73, h=5.9
          const safetyBox: BoundingBox = { x: 0.8, y: 0.8, w: 11.73, h: 5.9 };
          const fitted = calculateFittedImage(safetyImgParam.size, safetyBox);

          try {
            if (safetyImgParam.data) {
              safetySlide.addImage({
                data: safetyImgParam.data,
                x: fitted.x,
                y: fitted.y,
                w: fitted.w,
                h: fitted.h,
              });
            } else if (safetyImgParam.path) {
              safetySlide.addImage({
                path: safetyImgParam.path,
                x: fitted.x,
                y: fitted.y,
                w: fitted.w,
                h: fitted.h,
              });
            }
          } catch (err) {
            console.warn("Could not embed custom safety slide image in PPTX:", err);
          }
        }
      }
      // If no safetyImageUrl is provided, safetySlide remains a clean, blank buffer slide
    }

    // -----------------------------------------------------------
    // Answer Slide
    // -----------------------------------------------------------
    const ansSlide = pres.addSlide();
    ansSlide.background = { color: "FFFFFF" };

    // Header info: Answer • Question #X
    ansSlide.addText(`ANSWER  •  QUESTION #${log.orderIndex}`, {
      x: 1.0,
      y: 0.8,
      w: 11.33,
      h: 0.5,
      fontSize: 12,
      fontFace: defaultFont,
      bold: true,
      color: "777777",
      wrap: true,
      fit: "shrink",
    });

    const answerImages = q.media.filter((m) => m.role === "ANSWER" && m.type === "IMAGE");
    const aImageParam = answerImages.length > 0 ? resolveImageParam(answerImages[0].url) : null;

    const availableTextWidth = aImageParam ? 6.0 : 11.33;
    const hasNotes = Boolean(includeNotes && q.notes?.trim());
    const ansFontSize = q.answerText.length > 70 ? 22 : 28;

    // Revealed Answer (Bold, prominent)
    ansSlide.addText(q.answerText, {
      x: 1.0,
      y: 1.5,
      w: availableTextWidth,
      h: hasNotes ? 2.1 : 5.0,
      fontSize: ansFontSize,
      fontFace: defaultFont,
      bold: true,
      color: "111111",
      valign: hasNotes ? "top" : "middle",
      wrap: true,
      fit: "shrink",
      lineSpacingMultiple: 1.15,
    });

    // Optional Explanation Notes
    if (hasNotes && q.notes?.trim()) {
      ansSlide.addText(`Notes / Explanation:\n${q.notes.trim()}`, {
        x: 1.0,
        y: 3.8,
        w: availableTextWidth,
        h: 2.8,
        fontSize: 15,
        fontFace: defaultFont,
        color: "444444",
        valign: "top",
        lineSpacingMultiple: 1.2,
        wrap: true,
        fit: "shrink",
      });
    }

    if (aImageParam) {
      const aImageBox: BoundingBox = { x: 7.4, y: 1.5, w: 4.9, h: 5.1 };
      const fitted = calculateFittedImage(aImageParam.size, aImageBox);

      try {
        if (aImageParam.data) {
          ansSlide.addImage({
            data: aImageParam.data,
            x: fitted.x,
            y: fitted.y,
            w: fitted.w,
            h: fitted.h,
          });
        } else if (aImageParam.path) {
          ansSlide.addImage({
            path: aImageParam.path,
            x: fitted.x,
            y: fitted.y,
            w: fitted.w,
            h: fitted.h,
          });
        }
      } catch (err) {
        console.warn("Could not embed answer image in PPTX:", err);
      }
    }
  }

  const output = await pres.write({ outputType: "nodebuffer" });
  return output as Buffer;
}
