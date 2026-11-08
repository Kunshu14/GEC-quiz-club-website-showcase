"use client";

import { useState, useEffect } from "react";
import { Tag, PaperclipIcon, MaximizeIcon, ExternalLinkIcon, XIcon } from "@/components/ui";

export interface MediaItem {
  id: string;
  role: "QUESTION" | "ANSWER";
  type: "IMAGE" | "AUDIO" | "VIDEO";
  url: string;
}

interface MediaDisplayProps {
  media: MediaItem[];
  filterRole?: "QUESTION" | "ANSWER";
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export function MediaDisplay({
  media,
  filterRole,
  collapsible = false,
  defaultExpanded = false,
}: MediaDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded ?? !collapsible);
  const [activeModalMedia, setActiveModalMedia] = useState<MediaItem | null>(null);

  const filtered = filterRole ? media.filter((m) => m.role === filterRole) : media;

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

  if (!filtered || filtered.length === 0) return null;

  const imageCount = filtered.filter((m) => m.type === "IMAGE").length;
  const audioCount = filtered.filter((m) => m.type === "AUDIO").length;
  const videoCount = filtered.filter((m) => m.type === "VIDEO").length;

  const typeSummaryParts: string[] = [];
  if (imageCount > 0) typeSummaryParts.push(`${imageCount} image${imageCount === 1 ? "" : "s"}`);
  if (audioCount > 0) typeSummaryParts.push(`${audioCount} audio`);
  if (videoCount > 0) typeSummaryParts.push(`${videoCount} video`);
  const typeSummary = typeSummaryParts.join(", ");

  return (
    <>
      {/* Collapsible mode: render compact toggle bar when collapsed */}
      {collapsible && !isExpanded ? (
        <div className="my-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-2 border-[2px] border-ink bg-white px-2.5 py-1 text-xs font-bold text-ink shadow-[2px_2px_0_var(--ink)] hover:bg-cream active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
          >
            <span className="inline-flex items-center gap-1">
              <PaperclipIcon size={13} /> {filtered.length} attachment{filtered.length === 1 ? "" : "s"}
            </span>
            {typeSummary && <span className="opacity-60 text-[11px]">({typeSummary})</span>}
            <span className="text-ink font-black ml-1 text-[11px]">View media ▾</span>
          </button>

          {/* Compact preview thumbnails for quick glimpse without vertical waste */}
          {filtered
            .filter((m) => m.type === "IMAGE")
            .slice(0, 3)
            .map((imgItem, idx) => (
              <button
                key={imgItem.id || idx}
                type="button"
                onClick={() => setActiveModalMedia(imgItem)}
                title="Click to view fullscreen image"
                className="h-7 w-7 border-[2px] border-ink overflow-hidden bg-cream cursor-pointer hover:scale-105 transition-transform"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imgItem.url} alt="thumbnail" className="h-full w-full object-cover" />
              </button>
            ))}
        </div>
      ) : (
        <div className="my-2 flex flex-col gap-2.5">
          {collapsible && (
            <div className="flex items-center justify-between border-b-[2px] border-ink/40 pb-1">
              <span className="font-body text-xs font-bold uppercase tracking-wider text-ink opacity-80">
                Attachments ({filtered.length}) {typeSummary ? `· ${typeSummary}` : ""}
              </span>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="text-xs font-bold text-ink hover:text-orange underline cursor-pointer"
              >
                Hide media ▴
              </button>
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 border-[2px] border-ink bg-white p-2.5 shadow-[2px_2px_0_var(--ink)]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-body text-[11px] font-bold uppercase tracking-wide text-ink opacity-80">
                    {item.role === "QUESTION" ? "Question Clue" : "Answer Media"}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveModalMedia(item)}
                      title="View full screen"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-ink underline hover:text-orange cursor-pointer"
                    >
                      <MaximizeIcon size={12} /> Fullscreen
                    </button>
                    <Tag tone={item.type === "IMAGE" ? "pink" : item.type === "AUDIO" ? "mint" : "lavender"}>
                      {item.type}
                    </Tag>
                  </div>
                </div>

                {item.type === "IMAGE" && (
                  <div
                    onClick={() => setActiveModalMedia(item)}
                    className="group relative max-h-48 overflow-hidden border-[2px] border-ink bg-cream p-1 cursor-pointer"
                    title="Click to view image in full screen"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.url}
                      alt="Question media"
                      className="max-h-44 w-auto object-contain mx-auto transition-transform group-hover:scale-[1.02]"
                    />
                    <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 bg-ink text-cream text-[10px] font-bold px-1.5 py-0.5 opacity-0 group-hover:opacity-90 transition-opacity">
                      <MaximizeIcon size={10} /> Click for Fullscreen
                    </span>
                  </div>
                )}

                {item.type === "AUDIO" && (
                  <div className="p-2 border-[1px] border-ink/40 bg-cream flex flex-col gap-1">
                    <audio controls preload="metadata" src={item.url} className="w-full" />
                    <span className="font-body text-[10px] text-ink opacity-60">
                      Timeline scrub, volume, and mute controls enabled
                    </span>
                  </div>
                )}

                {item.type === "VIDEO" && (
                  <div className="relative max-h-56 overflow-hidden border-[2px] border-ink bg-ink">
                    <video
                      controls
                      playsInline
                      preload="metadata"
                      src={item.url}
                      className="max-h-52 w-full"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
                  {activeModalMedia.role === "QUESTION" ? "Question Clue" : "Answer Media"} — Full View
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
                  alt="Full view"
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
    </>
  );
}
