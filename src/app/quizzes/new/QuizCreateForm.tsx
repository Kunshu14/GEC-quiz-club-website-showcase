"use client";

import { useActionState, useState } from "react";
import { Button, Tag, AlertTriangleIcon, LightbulbIcon, TargetIcon } from "@/components/ui";
import { createQuiz, type CreateQuizState } from "../actions";

interface ThemeItem {
  id: string;
  name: string;
  description: string | null;
  themeCategories: {
    category: {
      id: string;
      name: string;
    };
  }[];
}

interface CouncilMemberItem {
  id: string;
  name: string | null;
  email: string;
  role: {
    name: string;
  };
}

interface QuizCreateFormProps {
  themes: ThemeItem[];
  councilMembers: CouncilMemberItem[];
  currentUserId: string;
  defaultAcademicYear: string;
}

export function QuizCreateForm({
  themes,
  councilMembers,
  currentUserId,
  defaultAcademicYear,
}: QuizCreateFormProps) {
  const [state, formAction, isPending] = useActionState<CreateQuizState | null, FormData>(
    createQuiz,
    null
  );

  const [selectedThemeId, setSelectedThemeId] = useState<string>("");
  const [mode, setMode] = useState<string>("IN_PERSON");
  const selectedTheme = themes.find((t) => t.id === selectedThemeId);

  // Today's date YYYY-MM-DD for default
  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <form action={formAction} className="flex flex-col gap-6 font-body">
      {state?.error && (
        <div className="border-3 border-ink bg-pink p-4 font-bold text-ink shadow-[4px_4px_0_var(--ink)] flex items-center gap-2">
          <AlertTriangleIcon size={16} /> {state.error}
        </div>
      )}

      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="font-bold uppercase tracking-wider text-xs text-ink">
          Quiz Title <span className="text-red-600">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          placeholder="e.g. Annual Fresher's Quiz 2026, MELA Open, Tech Trivia"
          className="border-3 border-ink bg-white px-3 py-2.5 text-base font-medium shadow-[3px_3px_0_var(--ink)] focus:outline-none"
        />
      </div>

      {/* Date & Academic Year */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="date" className="font-bold uppercase tracking-wider text-xs text-ink">
            Event Date <span className="text-red-600">*</span>
          </label>
          <input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={todayStr}
            className="border-3 border-ink bg-white px-3 py-2 text-sm shadow-[3px_3px_0_var(--ink)] focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="academicYear" className="font-bold uppercase tracking-wider text-xs text-ink">
            Academic Year <span className="text-red-600">*</span>
          </label>
          <input
            id="academicYear"
            name="academicYear"
            type="text"
            required
            defaultValue={defaultAcademicYear}
            placeholder="e.g. 2026-27"
            className="border-3 border-ink bg-white px-3 py-2 text-sm shadow-[3px_3px_0_var(--ink)] focus:outline-none"
          />
        </div>
      </div>

      {/* Mode & Format */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="mode" className="font-bold uppercase tracking-wider text-xs text-ink">
            Mode
          </label>
          <select
            id="mode"
            name="mode"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="border-3 border-ink bg-white px-3 py-2 text-sm shadow-[3px_3px_0_var(--ink)] focus:outline-none"
          >
            <option value="IN_PERSON">In-Person (On-campus / Hall)</option>
            <option value="ONLINE">Online (Google Meet / Zoom / Discord)</option>
            <option value="HYBRID">Hybrid</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="format" className="font-bold uppercase tracking-wider text-xs text-ink">
            Format
          </label>
          <input
            id="format"
            name="format"
            type="text"
            defaultValue="Written Prelims + On-Stage Finals"
            placeholder="e.g. Buzzer, Written Prelims + Finals, Pounce/Bounce"
            className="border-3 border-ink bg-white px-3 py-2 text-sm shadow-[3px_3px_0_var(--ink)] focus:outline-none"
          />
        </div>
      </div>

      {/* Venue & Timing */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="venueOrPlatform" className="font-bold uppercase tracking-wider text-xs text-ink">
            {mode === "ONLINE"
              ? "Platform / Meeting Link"
              : mode === "HYBRID"
                ? "Venue & Meeting / Stream Link"
                : "Venue"}{" "}
            <span className="text-red-600">*</span>
          </label>
          <input
            id="venueOrPlatform"
            name="venueOrPlatform"
            type="text"
            required
            placeholder={
              mode === "ONLINE"
                ? "e.g. https://meet.google.com/xyz or Discord link"
                : mode === "HYBRID"
                  ? "e.g. Seminar Hall B + https://meet.google.com/xyz"
                  : "e.g. Main Auditorium / Seminar Hall B"
            }
            className="border-3 border-ink bg-white px-3 py-2 text-sm shadow-[3px_3px_0_var(--ink)] focus:outline-none"
          />
          {mode === "ONLINE" && (
            <span className="font-mono text-[11px] text-ink/70 flex items-center gap-1 mt-1">
              <LightbulbIcon size={12} className="text-yellow shrink-0" />
              <span>For online quizzes, paste the Google Meet, Zoom, or Discord link here.</span>
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="timing" className="font-bold uppercase tracking-wider text-xs text-ink">
            Timing (Optional)
          </label>
          <input
            id="timing"
            name="timing"
            type="text"
            placeholder="e.g. 4:30 PM – 7:00 PM"
            className="border-3 border-ink bg-white px-3 py-2 text-sm shadow-[3px_3px_0_var(--ink)] focus:outline-none"
          />
        </div>
      </div>

      {/* Budget & Theme */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="budget" className="font-bold uppercase tracking-wider text-xs text-ink">
            Budget (₹) <span className="text-ink opacity-60 font-normal">(Tracked even if ₹0)</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-sm font-bold text-ink">₹</span>
            <input
              id="budget"
              name="budget"
              type="number"
              min="0"
              step="any"
              defaultValue="0"
              className="w-full border-3 border-ink bg-white py-2 pl-8 pr-3 text-sm shadow-[3px_3px_0_var(--ink)] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="themeId" className="font-bold uppercase tracking-wider text-xs text-ink">
            Quiz Theme (Optional Scope)
          </label>
          <select
            id="themeId"
            name="themeId"
            value={selectedThemeId}
            onChange={(e) => setSelectedThemeId(e.target.value)}
            className="border-3 border-ink bg-white px-3 py-2 text-sm shadow-[3px_3px_0_var(--ink)] focus:outline-none"
          >
            <option value="">General / No Theme</option>
            {themes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Theme Scope Preview Box */}
      {selectedTheme && (
        <div className="border-2 border-dashed border-ink bg-white p-3 text-xs text-ink shadow-[2px_2px_0_var(--ink)]">
          <p className="font-bold text-ink flex items-center gap-1.5">
            <TargetIcon size={14} /> Theme shortcut: {selectedTheme.name}
          </p>
          <p className="mt-1 opacity-80">
            Selecting this theme will auto-scope your question pool filter to:{" "}
            {selectedTheme.themeCategories.map((tc) => tc.category.name).join(", ")}.
          </p>
        </div>
      )}

      {/* Quizmasters (QMs) Multi-select */}
      <div className="flex flex-col gap-2">
        <label className="font-bold uppercase tracking-wider text-xs text-ink">
          Designate Quizmasters (QMs) <span className="text-ink opacity-60 font-normal">(2–3 QMs recommended)</span>
        </label>
        <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto border-3 border-ink bg-white p-3 shadow-[3px_3px_0_var(--ink)] sm:grid-cols-2">
          {councilMembers.map((member) => {
            const isSelf = member.id === currentUserId;
            return (
              <label
                key={member.id}
                className="flex cursor-pointer items-center gap-2 border border-ink/30 p-2 hover:bg-cream/40"
              >
                <input
                  type="checkbox"
                  name="qmUserIds"
                  value={member.id}
                  defaultChecked={isSelf}
                  className="h-4 w-4 border-2 border-ink accent-yellow"
                />
                <span className="flex-1 truncate text-xs font-semibold">
                  {member.name ?? member.email}
                  {isSelf && <span className="ml-1 text-ink opacity-60">(You)</span>}
                </span>
                <Tag tone="lavender" className="text-[10px]">
                  {member.role.name}
                </Tag>
              </label>
            );
          })}
        </div>
      </div>

      {/* Scorekeepers (Optional) */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="font-bold uppercase tracking-wider text-xs text-ink">
            Designate Scorekeepers (Desk & Scoring)
          </label>
          <span className="font-body text-[11px] text-ink/60 italic">Optional — can also be assigned on event day</span>
        </div>
        <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto border-3 border-ink bg-white p-3 shadow-[3px_3px_0_var(--ink)] sm:grid-cols-2">
          {councilMembers.map((member) => (
            <label
              key={member.id}
              className="flex cursor-pointer items-center gap-2 border border-ink/30 p-2 hover:bg-cream/40"
            >
              <input
                type="checkbox"
                name="scorekeeperUserIds"
                value={member.id}
                className="h-4 w-4 border-2 border-ink accent-mint"
              />
              <span className="flex-1 truncate text-xs font-semibold">
                {member.name ?? member.email}
              </span>
              <Tag tone="mint" className="text-[10px]">
                {member.role.name}
              </Tag>
            </label>
          ))}
        </div>
      </div>

      {/* Lessons Learned / Initial Goals */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="lessonsLearned" className="font-bold uppercase tracking-wider text-xs text-ink">
          Initial Notes / Retrospective Goals (Optional)
        </label>
        <textarea
          id="lessonsLearned"
          name="lessonsLearned"
          rows={3}
          placeholder="Special rules, target audience notes, or round expectations..."
          className="border-3 border-ink bg-white p-3 text-sm shadow-[3px_3px_0_var(--ink)] focus:outline-none"
        />
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
        <Button as="a" href="/quizzes" variant="alt">
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? "Creating Quiz..." : "Create Quiz & Open Question Builder →"}
        </Button>
      </div>
    </form>
  );
}
