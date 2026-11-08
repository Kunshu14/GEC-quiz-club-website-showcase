import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { MediaType } from "@prisma/client";

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_AUDIO_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

export const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
];

export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
];

export function getMediaTypeFromMime(mimeType: string): MediaType | null {
  if (ALLOWED_IMAGE_TYPES.includes(mimeType) || mimeType.startsWith("image/")) {
    return "IMAGE";
  }
  if (ALLOWED_AUDIO_TYPES.includes(mimeType) || mimeType.startsWith("audio/")) {
    return "AUDIO";
  }
  if (ALLOWED_VIDEO_TYPES.includes(mimeType) || mimeType.startsWith("video/")) {
    return "VIDEO";
  }
  return null;
}

export function validateMediaFile(file: File | Blob, mimeType: string): { valid: boolean; error?: string; type?: MediaType } {
  const type = getMediaTypeFromMime(mimeType);
  if (!type) {
    return {
      valid: false,
      error: "Unsupported file type. Supported formats: images (JPG, PNG, WebP, GIF), audio (MP3, WAV, OGG, WebM, M4A), video (MP4, WebM).",
    };
  }

  if (type === "IMAGE" && file.size > MAX_IMAGE_SIZE_BYTES) {
    return { valid: false, error: "Image file exceeds maximum limit of 10MB." };
  }

  if ((type === "AUDIO" || type === "VIDEO") && file.size > MAX_AUDIO_VIDEO_SIZE_BYTES) {
    return { valid: false, error: `${type === "AUDIO" ? "Audio" : "Video"} file exceeds maximum limit of 50MB.` };
  }

  return { valid: true, type };
}

/**
 * Uploads a file buffer or blob to storage.
 * If Supabase Storage credentials are present in env, uploads to Supabase Storage bucket 'question-media'.
 * Otherwise, falls back to public uploads directory so the app works seamlessly everywhere.
 */
export async function uploadMediaFile({
  buffer,
  fileName,
  mimeType,
  subFolder = "questions",
}: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  subFolder?: string;
}): Promise<string> {
  const ext = fileName.includes(".") ? fileName.split(".").pop() : "bin";
  const uniqueName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${subFolder}/${uniqueName}`;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vfpsbqbdjysucaewrejs.supabase.co";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseKey) {
    try {
      const uploadUrl = `${supabaseUrl}/storage/v1/object/question-media/${path}`;
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": mimeType,
          "x-upsert": "true",
        },
        body: new Uint8Array(buffer),
      });

      if (response.ok) {
        return `${supabaseUrl}/storage/v1/object/public/question-media/${path}`;
      } else {
        console.warn("Supabase storage upload returned status", response.status, await response.text());
      }
    } catch (e) {
      console.warn("Supabase storage upload failed, falling back to local:", e);
    }
  }

  // Fallback: save to public/uploads directory
  try {
    const uploadDir = join(process.cwd(), "public", "uploads", subFolder);
    await mkdir(uploadDir, { recursive: true });
    const localFilePath = join(uploadDir, uniqueName);
    await writeFile(localFilePath, buffer);
    return `/uploads/${subFolder}/${uniqueName}`;
  } catch (err) {
    console.error("Local file write error:", err);
    // If running in a read-only serverless environment without storage keys, use a data URI as ultimate fallback
    const base64 = buffer.toString("base64");
    return `data:${mimeType};base64,${base64}`;
  }
}
