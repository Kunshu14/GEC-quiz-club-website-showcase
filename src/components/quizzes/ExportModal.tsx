"use client";

import { useState, useRef, ChangeEvent } from "react";
import {
  Button,
  CardShell,
  DownloadIcon,
  PresentationIcon,
  SpreadsheetIcon,
  LightbulbIcon,
  ImageIcon,
  CheckIcon,
  XIcon,
} from "@/components/ui";

interface ExportModalProps {
  quizId: string;
  quizTitle: string;
  questionCount: number;
}

export function ExportModal({ quizId, quizTitle, questionCount }: ExportModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [format, setFormat] = useState<"pptx" | "canva">("pptx");
  const [includeSafetySlide, setIncludeSafetySlide] = useState(true);
  const [safetyImageUrl, setSafetyImageUrl] = useState<string>("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeRoundTransitions, setIncludeRoundTransitions] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("role", "QUESTION"); // storage folder bucket

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload image");
      }

      setSafetyImageUrl(data.url);
    } catch (err: unknown) {
      setUploadError((err as Error)?.message || "Upload failed");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadError(null);

    try {
      const endpoint =
        format === "pptx"
          ? `/api/quizzes/${quizId}/export/pptx`
          : `/api/quizzes/${quizId}/export/canva-csv`;

      const payload = {
        includeSafetySlide,
        safetyImageUrl: safetyImageUrl.trim() || null,
        includeNotes,
        includeRoundTransitions,
      };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Export failed");
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition");
      let filename =
        format === "pptx"
          ? `${quizTitle.replace(/[^a-zA-Z0-9_-]/g, "_")}.pptx`
          : `${quizTitle.replace(/[^a-zA-Z0-9_-]/g, "_")}_canva.csv`;

      if (contentDisposition && contentDisposition.includes("filename=")) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match?.[1]) filename = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setIsOpen(false);
    } catch (err: unknown) {
      setDownloadError((err as Error)?.message || "Download failed");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => setIsOpen(true)}
        variant="alt"
        className="cursor-pointer font-bold inline-flex items-center gap-1.5"
      >
        <DownloadIcon size={14} /> Export Presentation
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg animate-in fade-in zoom-in-95 duration-150">
            <CardShell
              tone="cream"
              className="border-[3px] border-ink p-6 shadow-[6px_6px_0_var(--ink)]"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b-2 border-ink pb-3">
                <div>
                  <h2 className="font-display text-xl">Export Presentation</h2>
                  <p className="font-body text-xs text-ink/70">
                    {quizTitle} ({questionCount} questions in running order)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex h-7 w-7 items-center justify-center border-2 border-ink bg-white font-bold text-xs hover:bg-pink transition-colors cursor-pointer"
                >
                  <XIcon size={14} />
                </button>
              </div>

              {/* Format Selection Tabs */}
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormat("pptx")}
                  className={`flex-1 border-2 border-ink py-2 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    format === "pptx"
                      ? "bg-yellow text-ink shadow-[2px_2px_0_var(--ink)]"
                      : "bg-white text-ink/70 hover:bg-cream"
                  }`}
                >
                  <PresentationIcon size={14} /> PowerPoint (.pptx)
                  <span className="text-[10px] font-normal text-ink/70">(Recommended)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat("canva")}
                  className={`flex-1 border-2 border-ink py-2 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    format === "canva"
                      ? "bg-lavender text-ink shadow-[2px_2px_0_var(--ink)]"
                      : "bg-white text-ink/70 hover:bg-cream"
                  }`}
                >
                  <SpreadsheetIcon size={14} /> Canva CSV
                  <span className="ml-1 rounded-xs border border-ink bg-pink px-1 py-0.5 text-[9px] font-black uppercase text-white shadow-[1px_1px_0_var(--ink)]">
                    Pro Req.
                  </span>
                </button>
              </div>

              {/* Format Explanatory Callout */}
              <div className="mt-3 border border-ink bg-white p-3 font-body text-xs text-ink/80 shadow-[1px_1px_0_var(--ink)]">
                {format === "pptx" ? (
                  <div>
                    <p className="font-bold text-ink">
                      Clean 16:9 PowerPoint Presentation:
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink/80 leading-relaxed">
                      Unformatted black text on clean white slides with shrink-to-fit auto-scaling.
                      Ready to present directly, apply your college theme, or <strong>import for free into Canva</strong>.
                    </p>
                    <div className="mt-2 border-t border-dashed border-ink/30 pt-1.5 text-[11px] text-ink/70 flex items-start gap-1.5">
                      <LightbulbIcon size={13} className="text-yellow shrink-0 mt-0.5" />
                      <span><em>Using Canva Free?</em> Download this <strong>.pptx</strong> and upload it directly into Canva (*Create a design &gt; Import file*) to edit slides with your Canva templates without needing Pro!</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-ink">Canva Bulk Create CSV:</span>
                      <span className="rounded-xs border border-ink bg-pink px-1.5 py-0.2 text-[9px] font-black uppercase text-white">
                        Requires Canva Pro
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-ink/80 leading-relaxed">
                      Exports an RFC 4180 CSV structured for Canva&apos;s <strong>Bulk Create</strong> app.
                      <strong className="text-pink"> Note:</strong> Canva restricts the Bulk Create feature to paid <strong>Canva Pro / Teams / Education</strong> accounts.
                    </p>
                    <div className="mt-2.5 border border-dashed border-ink/40 bg-yellow/20 p-2 text-[11px] text-ink/90 flex items-start gap-1.5">
                      <LightbulbIcon size={13} className="text-yellow shrink-0 mt-0.5" />
                      <span><strong>Canva Free alternative:</strong> Switch to <strong>PowerPoint (.pptx)</strong> above! Canva Free allows you to import <code>.pptx</code> presentations directly into your design workspace with zero paid subscriptions.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Configuration Controls */}
              <div className="mt-4 flex flex-col gap-3 font-body text-xs">
                {/* Safety Buffer Slide Toggle */}
                <div className="border border-ink bg-cream/50 p-3 shadow-[1px_1px_0_var(--ink)]">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeSafetySlide}
                      onChange={(e) => setIncludeSafetySlide(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded-none border-2 border-ink accent-yellow"
                    />
                    <div>
                      <span className="font-bold text-ink">
                        Include Safety Buffer Slides (Fail-safe)
                      </span>
                      <p className="mt-0.5 text-[11px] text-ink/70 leading-relaxed">
                        Inserts a buffer slide between every question and answer to prevent an
                        accidental double-click from spoiling the answer on stage.
                      </p>
                    </div>
                  </label>

                  {/* Custom Safety Slide Image (Meme / Graphic) */}
                  {includeSafetySlide && (
                    <div className="mt-3 border-t border-dashed border-ink/30 pt-2.5 pl-6.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-ink/80">
                        Custom Safety Slide Image (Optional):
                      </span>
                      <p className="text-[11px] text-ink/60">
                        Upload your club meme or graphic. No extra text will be added. Leave
                        blank for a clean empty buffer slide.
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleImageUpload}
                          accept="image/*"
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingImage}
                          className="border border-ink bg-white px-2.5 py-1 text-xs font-bold hover:bg-cream transition-colors shadow-[1px_1px_0_var(--ink)] inline-flex items-center gap-1.5"
                        >
                          <ImageIcon size={13} />
                          {isUploadingImage
                            ? "Uploading..."
                            : safetyImageUrl
                              ? "Replace Image"
                              : "Upload Meme / Image"}
                        </button>

                        {safetyImageUrl && (
                          <button
                            type="button"
                            onClick={() => setSafetyImageUrl("")}
                            className="border border-dashed border-ink px-2 py-1 text-xs font-bold text-pink hover:bg-pink/20"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      {uploadError && (
                        <p className="mt-1 text-[11px] font-bold text-pink flex items-center gap-1">
                          <XIcon size={12} /> {uploadError}
                        </p>
                      )}

                      {safetyImageUrl && (
                        <div className="mt-2 flex items-center gap-2 border border-ink bg-white p-1.5 max-w-sm">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={safetyImageUrl}
                            alt="Safety slide preview"
                            className="h-12 w-20 object-contain border border-ink/40 bg-cream/20"
                          />
                          <span className="text-[10px] font-medium text-ink/70 truncate flex items-center gap-1">
                            <CheckIcon size={12} className="text-forest" /> Custom safety image attached
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* PPTX Specific Toggles */}
                {format === "pptx" && (
                  <div className="flex flex-col gap-2 pl-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeRoundTransitions}
                        onChange={(e) => setIncludeRoundTransitions(e.target.checked)}
                        className="h-4 w-4 rounded-none border-2 border-ink accent-yellow"
                      />
                      <span className="font-bold text-ink">
                        Include Round Title transition slides
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeNotes}
                        onChange={(e) => setIncludeNotes(e.target.checked)}
                        className="h-4 w-4 rounded-none border-2 border-ink accent-yellow"
                      />
                      <span className="font-bold text-ink">
                        Include Notes / Explanations on Answer slides
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {downloadError && (
                <div className="mt-3 border border-ink bg-pink p-2 text-xs font-bold text-ink flex items-center gap-1.5">
                  <XIcon size={13} /> {downloadError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 flex items-center justify-end gap-3 border-t-2 border-ink pt-4">
                <Button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isDownloading}
                  variant="underline"
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloading || questionCount === 0}
                  variant="primary"
                  className="text-xs font-bold inline-flex items-center gap-1.5"
                >
                  {isDownloading ? (
                    "Generating..."
                  ) : format === "pptx" ? (
                    <>
                      <DownloadIcon size={14} />
                      Download .pptx
                    </>
                  ) : (
                    <>
                      <DownloadIcon size={14} />
                      Download Canva .csv (Pro Required)
                    </>
                  )}
                </Button>
              </div>
            </CardShell>
          </div>
        </div>
      )}
    </>
  );
}
