"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui";
import { Combobox } from "@/components/ui/Combobox";
import { MediaUploader, getFriendlyFileName, type AttachedMedia } from "@/components/ui/MediaUploader";
import { updateQuestion, type UpdateQuestionResult } from "../../actions";

interface Category {
  id: string;
  name: string;
}

interface QuestionCategory {
  categoryId: string;
  subGenre: string | null;
  category: { name: string };
}

interface MediaItem {
  id: string;
  role: "QUESTION" | "ANSWER";
  type: "IMAGE" | "AUDIO" | "VIDEO";
  url: string;
}

interface Question {
  id: string;
  text: string;
  answerText: string;
  difficulty: string;
  notes: string | null;
  status: string;
  createdAt: Date;
}

const DIFFICULTIES = [
  { value: "EASY", label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
] as const;

const STATUSES = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "FLAGGED", label: "Flagged" },
] as const;

export function QuestionEditForm({
  question,
  questionCategories,
  allCategories,
  subGenresByCategory = {},
  media = [],
  canManage = false,
}: {
  question: Question;
  questionCategories: QuestionCategory[];
  allCategories: Category[];
  subGenresByCategory?: Record<string, string[]>;
  media?: MediaItem[];
  canManage?: boolean;
}) {
  const [state, formAction, pending] = useActionState<UpdateQuestionResult | null, FormData>(
    updateQuestion,
    null,
  );

  const selectedCatIds = new Set(questionCategories.map((qc) => qc.categoryId));
  const initialSubGenres: Record<string, string> = {};
  for (const qc of questionCategories) {
    initialSubGenres[qc.categoryId] = qc.subGenre ?? "";
  }

  const initialQuestionMedia: AttachedMedia[] = media
    .filter((m) => m.role === "QUESTION")
    .map((m, idx) => ({
      url: m.url,
      role: "QUESTION",
      type: m.type,
      fileName: getFriendlyFileName(m.url, m.type, idx),
    }));

  const initialAnswerMedia: AttachedMedia[] = media
    .filter((m) => m.role === "ANSWER")
    .map((m, idx) => ({
      url: m.url,
      role: "ANSWER",
      type: m.type,
      fileName: getFriendlyFileName(m.url, m.type, idx),
    }));

  // Controlled state — preserves values across re-renders on validation error
  const [questionText, setQuestionText] = useState(question.text);
  const [answerText, setAnswerText] = useState(question.answerText);
  const [notes, setNotes] = useState(question.notes ?? "");
  const [difficulty, setDifficulty] = useState(question.difficulty);
  const [status, setStatus] = useState(question.status);
  const [subGenres, setSubGenres] = useState<Record<string, string>>(initialSubGenres);
  const [, setQuestionMedia] = useState<AttachedMedia[]>(initialQuestionMedia);
  const [, setAnswerMedia] = useState<AttachedMedia[]>(initialAnswerMedia);

  // Track checked categories
  const [checkedCats, setCheckedCats] = useState<Set<string>>(selectedCatIds);

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
      <p className="font-body text-sm font-bold text-mint">
        Question updated successfully.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="questionId" value={question.id} />

      {/* Categories */}
      <fieldset className="flex flex-col gap-3">
        <legend className="font-body text-sm font-bold uppercase tracking-wide">
          Categories
        </legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {allCategories.map((cat) => {
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

      {/* Status (admin / manager only) */}
      {canManage ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="font-body text-sm font-bold uppercase tracking-wide">
            Status
          </legend>
          <div className="flex gap-3">
            {STATUSES.map((s) => (
              <label
                key={s.value}
                className={`flex items-center gap-2 border-[3px] border-ink px-4 py-2 font-body text-sm font-bold uppercase cursor-pointer transition-colors ${
                  status === s.value ? "bg-ink text-cream" : "bg-cream text-ink"
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value={s.value}
                  checked={status === s.value}
                  onChange={() => setStatus(s.value)}
                  className="accent-ink"
                />
                {s.label}
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <div className="flex flex-col gap-1">
          <span className="font-body text-sm font-bold uppercase tracking-wide">
            Status
          </span>
          <div>
            <span className="inline-block border-2 border-ink px-3 py-1 font-body text-xs font-bold uppercase tracking-wider bg-cream text-ink">
              {question.status}
            </span>
          </div>
        </div>
      )}

      {/* Question text */}
      <label className="flex flex-col gap-1 font-body text-sm">
        <span className="font-bold uppercase tracking-wide">Question</span>
        <textarea
          name="text"
          rows={3}
          required
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          className="border-[3px] border-ink bg-cream p-3 font-body text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-ink"
        />
      </label>

      {/* Question Media slot */}
      <MediaUploader
        role="QUESTION"
        label="Question Media (optional)"
        description="Attach a clue image, voice/audio recording, or video clip for the question."
        initialMedia={initialQuestionMedia}
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
          className="border-[3px] border-ink bg-cream p-3 font-body text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-ink"
        />
      </label>

      {/* Answer Media slot */}
      <MediaUploader
        role="ANSWER"
        label="Answer Media (optional)"
        description="Attach an answer illustration, explanation diagram, audio clip, or video."
        initialMedia={initialAnswerMedia}
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
          className="border-[3px] border-ink bg-cream p-3 font-body text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-ink"
        />
      </label>

      {state && "error" in state && (
        <p className="font-body text-sm font-bold text-orange">{state.error}</p>
      )}

      <Button type="submit" variant="primary" disabled={pending} className="self-start">
        {pending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}