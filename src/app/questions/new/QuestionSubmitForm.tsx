"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui";
import { Combobox } from "@/components/ui/Combobox";
import { MediaUploader, type AttachedMedia } from "@/components/ui/MediaUploader";
import { submitQuestion, type SubmitQuestionResult } from "./actions";

interface Category {
  id: string;
  name: string;
}

const DIFFICULTIES = [
  { value: "EASY", label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
] as const;

export function QuestionSubmitForm({
  categories,
  subGenresByCategory = {},
}: {
  categories: Category[];
  subGenresByCategory?: Record<string, string[]>;
}) {
  const [state, formAction, pending] = useActionState<SubmitQuestionResult | null, FormData>(
    submitQuestion,
    null,
  );

  // Controlled state — preserves values across re-renders on validation error
  const [questionText, setQuestionText] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [notes, setNotes] = useState("");
  const [difficulty, setDifficulty] = useState<string>("");
  const [, setQuestionMedia] = useState<AttachedMedia[]>([]);
  const [, setAnswerMedia] = useState<AttachedMedia[]>([]);

  // Track which categories are checked (for sub-genre enable/disable)
  const [checkedCats, setCheckedCats] = useState<Set<string>>(new Set());

  // Controlled sub-genre values per category
  const [subGenres, setSubGenres] = useState<Record<string, string>>({});

  const toggleCat = (catId: string) => {
    setCheckedCats((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  };

  if (state && "ok" in state) {
    return (
      <div className="flex flex-col gap-3 border-[3px] border-ink bg-cream p-6 shadow-[4px_4px_0_var(--ink)]">
        <p className="font-body text-sm font-bold text-mint">
          {state.flagged ? "Question submitted and flagged for review" : "Question submitted for review!"}
        </p>
        <p className="font-body text-sm text-ink">
          {state.flagged
            ? "Your question was flagged for council review. An admin will verify the submission before approving it into the question pool."
            : "An admin will review your submission. You can track its status in \"My Submissions\" on the questions pool page."}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {/* Categories multi-select */}
      <fieldset className="flex flex-col gap-3">
        <legend className="font-body text-sm font-bold uppercase tracking-wide">
          Categories
        </legend>
        <p className="font-body text-xs text-ink opacity-70">
          Select one or more categories. Optionally add a sub-genre for each.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {categories.map((cat) => {
            const isChecked = checkedCats.has(cat.id);
            return (
              <div
                key={cat.id}
                className={`flex flex-col justify-between gap-2 border-[3px] border-ink p-3 font-body text-sm transition-colors ${
                  isChecked ? "bg-cream text-ink shadow-[3px_3px_0_var(--ink)]" : "bg-cream/40 text-ink/70"
                }`}
              >
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="categoryId"
                    value={cat.id}
                    checked={isChecked}
                    onChange={() => toggleCat(cat.id)}
                    className="h-4 w-4 accent-ink cursor-pointer"
                  />
                  <span className={`font-bold ${isChecked ? "text-ink" : "text-ink/80"}`}>{cat.name}</span>
                </label>
                {isChecked && (
                  <div className="mt-1">
                    <Combobox
                      value={subGenres[cat.id] ?? ""}
                      onChange={(v) => setSubGenres((prev) => ({ ...prev, [cat.id]: v }))}
                      options={(subGenresByCategory[cat.id] ?? []).map((s) => ({ value: s, label: s }))}
                      placeholder="Sub-genre (optional)"
                      allowFreeText
                      name={`subGenre_${cat.id}`}
                      ariaLabel={`Sub-genre for ${cat.name}`}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </fieldset>

      {/* Difficulty */}
      <fieldset className="flex flex-col gap-3">
        <legend className="font-body text-sm font-bold uppercase tracking-wide">
          Difficulty
        </legend>
        <div className="flex gap-3">
          {DIFFICULTIES.map((d) => (
            <label
              key={d.value}
              className={`flex items-center gap-2 border-[3px] border-ink px-4 py-2 font-body text-sm font-bold uppercase cursor-pointer transition-colors ${
                difficulty === d.value ? "bg-ink text-cream" : "bg-cream text-ink"
              }`}
            >
              <input
                type="radio"
                name="difficulty"
                value={d.value}
                checked={difficulty === d.value}
                onChange={() => setDifficulty(d.value)}
                className="accent-ink"
              />
              {d.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Question text */}
      <label className="flex flex-col gap-1 font-body text-sm">
        <span className="font-bold uppercase tracking-wide">Question</span>
        <textarea
          name="text"
          rows={3}
          required
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          placeholder="e.g. What year did the French Revolution begin?"
          className="border-[3px] border-ink bg-cream p-3 font-body text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-ink"
        />
      </label>

      {/* Question Media slot */}
      <MediaUploader
        role="QUESTION"
        label="Question Media (optional)"
        description="Attach a clue image, voice/audio recording, or video clip for the question."
        onMediaChange={setQuestionMedia}
      />

      {/* Answer text */}
      <label className="flex flex-col gap-1 font-body text-sm">
        <span className="font-bold uppercase tracking-wide">Answer</span>
        <textarea
          name="answerText"
          rows={2}
          required
          value={answerText}
          onChange={(e) => setAnswerText(e.target.value)}
          placeholder="e.g. 1789"
          className="border-[3px] border-ink bg-cream p-3 font-body text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-ink"
        />
      </label>

      {/* Answer Media slot */}
      <MediaUploader
        role="ANSWER"
        label="Answer Media (optional)"
        description="Attach an answer illustration, explanation diagram, audio clip, or video."
        onMediaChange={setAnswerMedia}
      />

      {/* Notes */}
      <label className="flex flex-col gap-1 font-body text-sm">
        <span className="font-bold uppercase tracking-wide">Notes / Source (optional)</span>
        <textarea
          name="notes"
          rows={2}
          maxLength={500}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Source: NCERT History Class 9, Chapter 1"
          className="border-[3px] border-ink bg-cream p-3 font-body text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-ink"
        />
      </label>

      {state && "error" in state && (
        <p className="font-body text-sm font-bold text-orange">{state.error}</p>
      )}

      <Button type="submit" variant="primary" disabled={pending} className="self-start">
        {pending ? "Submitting..." : "Submit question"}
      </Button>
    </form>
  );
}