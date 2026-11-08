"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "./Button";
import { Tag } from "./Tag";
import { MaximizeIcon, CheckIcon, ExternalLinkIcon, XIcon } from "./icons";

export interface AttachedMedia {
  url: string;
  role: "QUESTION" | "ANSWER";
  type: "IMAGE" | "AUDIO" | "VIDEO";
  fileName: string;
}

/**
 * Returns a clean, human-friendly filename without overflowing long hashes or data URIs.
 */
export function getFriendlyFileName(url: string, type: string, index = 0): string {
  if (!url) return `${type.toLowerCase()}_media`;
  if (url.startsWith("data:")) {
    const ext = type === "IMAGE" ? "png" : type === "AUDIO" ? "webm" : "mp4";
    return `${type.toLowerCase()}_attachment_${index + 1}.${ext}`;
  }
  try {
    const parts = url.split("/");
    const lastPart = parts[parts.length - 1] || "";
    const cleanName = lastPart.split("?")[0].split("#")[0];
    if (cleanName && !cleanName.startsWith("data:")) {
      const decoded = decodeURIComponent(cleanName);
      return decoded.length > 32 ? decoded.slice(0, 28) + "..." : decoded;
    }
  } catch {
    // fallback below
  }
  return `${type.toLowerCase()}_attachment_${index + 1}`;
}

interface MediaUploaderProps {
  role: "QUESTION" | "ANSWER";
  label: string;
  description?: string;
  initialMedia?: AttachedMedia | AttachedMedia[] | null;
  onMediaChange?: (media: AttachedMedia[]) => void;
}

function normalizeInitial(init?: AttachedMedia | AttachedMedia[] | null): AttachedMedia[] {
  if (!init) return [];
  return Array.isArray(init) ? init : [init];
}

export function MediaUploader({
  role,
  label,
  description,
  initialMedia = null,
  onMediaChange,
}: MediaUploaderProps) {
  const [mediaList, setMediaList] = useState<AttachedMedia[]>(() => normalizeInitial(initialMedia));
  const [uploading, setUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [activeModalMedia, setActiveModalMedia] = useState<AttachedMedia | null>(null);

  // In-browser Audio Recording state (optional tool)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Listen for Escape key to close fullscreen modal
  useEffect(() => {
    if (!activeModalMedia) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveModalMedia(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeModalMedia]);

  // Only sync initialMedia if the actual URLs change from outside (e.g. question navigated or changed)
  const initialKey = Array.isArray(initialMedia)
    ? initialMedia.map((m) => m.url).join("|")
    : initialMedia?.url || "";
  const prevInitialKeyRef = useRef(initialKey);

  useEffect(() => {
    if (prevInitialKeyRef.current !== initialKey) {
      prevInitialKeyRef.current = initialKey;
      setMediaList(normalizeInitial(initialMedia));
    }
  }, [initialKey, initialMedia]);

  // Cleanup audio preview URL on unmount
  useEffect(() => {
    return () => {
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [recordedAudioUrl]);

  const uploadSingleFile = async (file: File | Blob, customFileName?: string): Promise<AttachedMedia> => {
    const formData = new FormData();
    const fileName = customFileName || (file instanceof File ? file.name : `recording_${Date.now()}.webm`);
    formData.append("file", file, fileName);
    formData.append("role", role);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || "Upload failed");
    }

    return {
      url: data.url,
      role: data.role,
      type: data.type,
      fileName: getFriendlyFileName(data.fileName || data.url, data.type),
    };
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);
    setUploadProgressText(files.length > 1 ? `Uploading ${files.length} files...` : "Uploading...");

    try {
      const newItems: AttachedMedia[] = [];
      for (let i = 0; i < files.length; i++) {
        setUploadProgressText(`Uploading file ${i + 1} of ${files.length}...`);
        const item = await uploadSingleFile(files[i]);
        newItems.push(item);
      }

      setMediaList((prev) => {
        const updated = [...prev, ...newItems];
        onMediaChange?.(updated);
        return updated;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      setUploadProgressText("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = (indexToRemove: number) => {
    setMediaList((prev) => {
      const updated = prev.filter((_, idx) => idx !== indexToRemove);
      onMediaChange?.(updated);
      return updated;
    });
    setError(null);
  };

  // Optional In-browser Mic Recording handlers
  const startRecording = async () => {
    setError(null);
    setRecordedBlob(null);
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedAudioUrl(url);

        // Stop all tracks to release mic
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250); // collect 250ms chunks
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((sec) => sec + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      setError("Could not access microphone. Please check browser microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  };

  const cancelRecording = () => {
    stopRecording();
    setRecordedBlob(null);
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
    }
  };

  const uploadRecording = async () => {
    if (!recordedBlob) return;
    setUploading(true);
    setUploadProgressText("Attaching voice recording...");
    setError(null);

    try {
      const item = await uploadSingleFile(recordedBlob, `voice_recording_${Date.now()}.webm`);
      setMediaList((prev) => {
        const updated = [...prev, item];
        onMediaChange?.(updated);
        return updated;
      });

      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
        setRecordedAudioUrl(null);
        setRecordedBlob(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audio upload failed.");
    } finally {
      setUploading(false);
      setUploadProgressText("");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="font-body text-sm font-bold uppercase tracking-wide text-ink">
          {label}
        </label>
        {mediaList.length > 0 && (
          <Tag tone="mint">
            <span className="inline-flex items-center gap-1">
              <CheckIcon size={12} /> {mediaList.length} media item{mediaList.length === 1 ? "" : "s"} attached
            </span>
          </Tag>
        )}
      </div>

      {description && (
        <p className="font-body text-xs text-ink opacity-70">
          {description}
        </p>
      )}

      {/* Hidden input to supply media JSON array in standard FormData */}
      <input
        type="hidden"
        name={role === "QUESTION" ? "questionMedia" : "answerMedia"}
        value={JSON.stringify(mediaList)}
      />

      {/* List of currently attached media items */}
      {mediaList.length > 0 && (
        <div className="flex flex-col gap-3">
          {mediaList.map((item, index) => (
            <div
              key={`${item.url}-${index}`}
              className="flex flex-col gap-3 border-[3px] border-ink bg-white p-4 shadow-[4px_4px_0_var(--ink)] overflow-hidden"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-[2px] border-ink pb-2">
                <div className="flex items-center gap-2 min-w-0 max-w-[calc(100%-110px)] overflow-hidden">
                  <Tag tone={item.type === "IMAGE" ? "pink" : item.type === "AUDIO" ? "mint" : "lavender"}>
                    {item.type}
                  </Tag>
                  <span
                    className="font-body text-xs font-bold uppercase tracking-wider text-ink truncate block max-w-[200px] sm:max-w-xs md:max-w-md"
                    title={item.fileName}
                  >
                    {item.fileName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveModalMedia(item)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-ink underline hover:text-orange cursor-pointer"
                  >
                    <MaximizeIcon size={12} /> Fullscreen
                  </button>
                  <Button
                    type="button"
                    variant="underline"
                    onClick={() => handleRemove(index)}
                    className="inline-flex items-center gap-1 text-xs text-orange hover:text-ink font-bold whitespace-nowrap"
                  >
                    Remove <XIcon size={12} />
                  </Button>
                </div>
              </div>

              {item.type === "IMAGE" && (
                <div
                  onClick={() => setActiveModalMedia(item)}
                  className="group relative max-h-64 overflow-hidden border-[2px] border-ink bg-cream p-1 cursor-pointer"
                  title="Click for full-screen view"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
                    alt={item.fileName}
                    className="max-h-60 w-auto object-contain mx-auto transition-transform group-hover:scale-[1.02]"
                  />
                  <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 bg-ink text-cream text-[10px] font-bold px-1.5 py-0.5 opacity-0 group-hover:opacity-90 transition-opacity">
                    <MaximizeIcon size={10} /> Click for Fullscreen
                  </span>
                </div>
              )}

              {item.type === "AUDIO" && (
                <div className="p-2 border-[2px] border-ink bg-cream flex flex-col gap-1">
                  <audio controls preload="metadata" src={item.url} className="w-full" />
                  <span className="font-body text-[10px] text-ink opacity-60">
                    Seek timeline, pause/play, volume, and mute controls enabled
                  </span>
                </div>
              )}

              {item.type === "VIDEO" && (
                <div className="max-h-72 overflow-hidden border-[2px] border-ink bg-ink">
                  <video controls playsInline preload="metadata" src={item.url} className="max-h-64 w-full" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload & Optional Recording Toolbar */}
      <div className="flex flex-col gap-3 border-[3px] border-ink bg-cream p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,audio/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
            id={`file-input-${role}`}
            disabled={uploading || isRecording}
          />

          <Button
            type="button"
            variant="alt"
            disabled={uploading || isRecording}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading
              ? uploadProgressText || "Uploading..."
              : mediaList.length > 0
              ? "+ Attach more files"
              : "Choose file(s)"}
          </Button>

          {/* Optional Mic Recording */}
          {!isRecording && !recordedBlob && (
            <Button
              type="button"
              variant="alt"
              disabled={uploading}
              onClick={startRecording}
              className="flex items-center gap-2 text-xs"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-crimson inline-block" />
              Record voice clue (optional)
            </Button>
          )}

          {/* Active Recording Controller */}
          {isRecording && (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 font-mono text-xs font-bold text-crimson animate-pulse">
                <span className="h-3 w-3 rounded-full bg-crimson inline-block" />
                Recording: {recordingSeconds}s
              </span>
              <Button type="button" variant="primary" onClick={stopRecording}>
                Stop
              </Button>
              <Button type="button" variant="underline" onClick={cancelRecording}>
                Cancel
              </Button>
            </div>
          )}
        </div>

        {/* Audio recording preview prior to upload */}
        {recordedBlob && recordedAudioUrl && !uploading && (
          <div className="mt-2 flex flex-col gap-2 border-[2px] border-ink bg-white p-3">
            <span className="font-body text-xs font-bold uppercase tracking-wide text-ink">
              Mic Recording Preview ({recordingSeconds}s)
            </span>
            <audio controls src={recordedAudioUrl} className="w-full" />
            <div className="flex items-center gap-3 mt-1">
              <Button
                type="button"
                variant="primary"
                onClick={uploadRecording}
                className="inline-flex items-center gap-1.5"
              >
                Attach voice recording <CheckIcon size={14} />
              </Button>
              <Button
                type="button"
                variant="underline"
                onClick={cancelRecording}
              >
                Discard
              </Button>
            </div>
          </div>
        )}

        <p className="font-body text-[11px] text-ink opacity-60">
          Supports multiple files: Images (≤10MB), Audio & Video (≤50MB). Voice recording is optional (handy for audio-round clues).
        </p>

        {error && (
          <p className="font-body text-xs font-bold text-orange">
            {error}
          </p>
        )}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {activeModalMedia && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 sm:p-8 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setActiveModalMedia(null)}
        >
          <div
            className="relative flex max-h-[92vh] max-w-[92vw] flex-col gap-3 border-[4px] border-ink bg-cream p-4 shadow-[8px_8px_0_var(--ink)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-[2px] border-ink pb-2">
              <div className="flex items-center gap-2">
                <Tag tone={activeModalMedia.type === "IMAGE" ? "pink" : activeModalMedia.type === "AUDIO" ? "mint" : "lavender"}>
                  {activeModalMedia.type}
                </Tag>
                <span className="font-body text-xs font-bold uppercase tracking-wider text-ink">
                  {activeModalMedia.fileName}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={activeModalMedia.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-body text-xs font-bold text-ink underline hover:text-orange"
                >
                  Open original <ExternalLinkIcon size={12} />
                </a>
                <button
                  type="button"
                  onClick={() => setActiveModalMedia(null)}
                  className="inline-flex items-center gap-1 border-[2px] border-ink bg-white px-2.5 py-0.5 text-xs font-black text-ink shadow-[2px_2px_0_var(--ink)] hover:bg-pink active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
                >
                  Close <XIcon size={12} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex flex-1 items-center justify-center max-h-[78vh] overflow-auto">
              {activeModalMedia.type === "IMAGE" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeModalMedia.url}
                  alt={activeModalMedia.fileName}
                  className="max-h-[76vh] max-w-full object-contain border-[2px] border-ink bg-white"
                />
              )}

              {activeModalMedia.type === "VIDEO" && (
                <video
                  controls
                  autoPlay
                  playsInline
                  src={activeModalMedia.url}
                  className="max-h-[76vh] max-w-full border-[2px] border-ink bg-ink"
                />
              )}

              {activeModalMedia.type === "AUDIO" && (
                <div className="w-full min-w-[300px] sm:min-w-[450px] border-[3px] border-ink bg-white p-6 shadow-[4px_4px_0_var(--ink)] flex flex-col gap-3">
                  <span className="font-body text-xs font-bold uppercase tracking-wider text-ink">
                    Audio Player (Timeline scrub, volume, mute, speed)
                  </span>
                  <audio controls autoPlay src={activeModalMedia.url} className="w-full" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
