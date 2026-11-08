"use client";

import { useState, useTransition } from "react";
import { Button, LightbulbIcon, PencilIcon, CheckIcon } from "@/components/ui";
import { updateLessonsLearned } from "../actions";

interface LessonsLearnedEditorProps {
  quizId: string;
  initialLessonsLearned: string | null;
  canEdit: boolean;
}

export function LessonsLearnedEditor({
  quizId,
  initialLessonsLearned,
  canEdit,
}: LessonsLearnedEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(initialLessonsLearned || "");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  const handleSave = () => {
    startTransition(async () => {
      const res = await updateLessonsLearned(quizId, content);
      if (res.ok) {
        setStatus("saved");
        setIsEditing(false);
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        setStatus("error");
      }
    });
  };

  return (
    <div className="flex flex-col gap-3 font-body">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg flex items-center gap-2">
          <LightbulbIcon size={18} className="text-yellow" />
          <span>Lessons Learned & Retrospective</span>
        </h3>
        {canEdit && !isEditing && (
          <Button
            type="button"
            onClick={() => setIsEditing(true)}
            variant="underline"
            className="text-xs inline-flex items-center gap-1"
          >
            <PencilIcon size={12} /> Edit notes
          </Button>
        )}
      </div>

      {status === "saved" && (
        <div className="border border-ink bg-mint px-3 py-1 text-xs font-bold text-ink flex items-center gap-1.5">
          <CheckIcon size={14} className="text-forest" /> Lessons learned successfully updated!
        </div>
      )}

      {isEditing ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            placeholder="Record post-quiz takeaways: timing bottlenecks, questions that played especially well, technical glitches, or venue tips for future QMs..."
            className="border-3 border-ink bg-white p-3 text-sm shadow-[3px_3px_0_var(--ink)] focus:outline-none"
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              onClick={() => {
                setContent(initialLessonsLearned || "");
                setIsEditing(false);
              }}
              variant="alt"
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              variant="primary"
              className="text-xs"
            >
              {isPending ? "Saving..." : "Save Retrospective"}
            </Button>
          </div>
        </div>
      ) : content ? (
        <div className="border-l-4 border-yellow bg-white p-4 text-sm leading-relaxed text-ink shadow-[2px_2px_0_var(--ink)] whitespace-pre-wrap">
          {content}
        </div>
      ) : (
        <div className="border-2 border-dashed border-ink/40 p-6 text-center text-xs text-ink opacity-60">
          No lessons learned recorded yet for this quiz event.
          {canEdit && (
            <div className="mt-2">
              <Button
                type="button"
                onClick={() => setIsEditing(true)}
                variant="primary"
                className="text-xs py-1"
              >
                + Add Lessons Learned
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
