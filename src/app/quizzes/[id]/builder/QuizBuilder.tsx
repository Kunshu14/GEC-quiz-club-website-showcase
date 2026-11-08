"use client";

import { useState, useTransition, useMemo } from "react";
import {
  Button,
  CardShell,
  HighlighterMark,
  Tag,
  type Tone,
  CheckIcon,
  AlertTriangleIcon,
  SaveIcon,
  PaperclipIcon,
  SparklesIcon,
  SettingsIcon,
  XIcon,
  TargetIcon,
  ZapIcon,
} from "@/components/ui";
import { calculateDifficultyBalance } from "@/lib/quizzes";
import { saveRunningOrder } from "@/app/quizzes/actions";
import { MarkingSchemeModal } from "@/components/scoring/MarkingSchemeModal";
import {
  type RoundMarkingScheme,
  type QuizRoundSettings,
  getRoundMarkingScheme,
} from "@/lib/scoring/markingSchemes";
import { formatDisplayDate } from "@/lib/dates";

interface QuestionSummary {
  id: string;
  text: string;
  answerText: string;
  difficulty: string;
  notes: string | null;
  createdAt: string;
  categories: { id: string; name: string; subGenre: string | null }[];
  mediaCount: number;
  usageCount: number;
  lastUsedQuiz?: string;
}

interface RunningOrderItem {
  questionId: string;
  orderIndex: number;
  roundName: string;
  text: string;
  answerText: string;
  difficulty: string;
  notes: string | null;
  categories: { id: string; name: string; subGenre: string | null }[];
  mediaCount: number;
}

interface QuizBuilderProps {
  quizId: string;
  initialRunningOrder: RunningOrderItem[];
  approvedQuestions: QuestionSummary[];
  categories: { id: string; name: string }[];
  themeCategoryIds: string[];
  themeName?: string;
  recentQuestionsRecord: Record<string, { quizTitle: string; quizDate: string }>;
  initialRoundSettings?: unknown;
}

const DIFFICULTY_TONE: Record<string, Tone> = {
  EASY: "mint",
  MEDIUM: "yellow",
  HARD: "pink",
};

const DEFAULT_ROUNDS = [
  "Prelims",
  "Round 1",
  "Round 2",
  "Round 3",
  "Finals",
  "Tiebreaker",
];

function canonicalizeRoundName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^round\s*\d+$/i.test(trimmed)) {
    return `Round ${trimmed.replace(/\D/g, "")}`;
  }
  if (/^finals?$/i.test(trimmed)) return "Finals";
  if (/^prelims?$/i.test(trimmed)) return "Prelims";
  if (/^tie\s*breaker$/i.test(trimmed)) return "Tiebreaker";
  return trimmed;
}

export function QuizBuilder({
  quizId,
  initialRunningOrder,
  approvedQuestions,
  categories,
  themeCategoryIds,
  themeName,
  recentQuestionsRecord,
  initialRoundSettings,
}: QuizBuilderProps) {
  const [runningOrder, setRunningOrder] = useState<RunningOrderItem[]>(initialRunningOrder);
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [roundSettings, setRoundSettings] = useState<QuizRoundSettings | null>(
    (initialRoundSettings as QuizRoundSettings) || null
  );
  const [isMarkingModalOpen, setIsMarkingModalOpen] = useState(false);
  const [editingRoundForScheme, setEditingRoundForScheme] = useState<string>("");

  // Dynamic Rounds Management
  const initialRounds = useMemo(() => {
    const fromOrder = initialRunningOrder
      .map((r) => canonicalizeRoundName(r.roundName))
      .filter((r) => Boolean(r && r.trim().length > 1));
    return Array.from(new Set([...DEFAULT_ROUNDS, ...fromOrder]));
  }, [initialRunningOrder]);

  const [roundsList, setRoundsList] = useState<string[]>(initialRounds);
  const [customRoundInput, setCustomRoundInput] = useState("");
  const [isAddingRound, setIsAddingRound] = useState(false);

  // Auto-calculate the next Round X number (e.g. Round 4, Round 5)
  const nextRoundNumber = useMemo(() => {
    let maxNum = 0;
    for (const r of roundsList) {
      const match = r.match(/^round\s*(\d+)$/i);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    return maxNum > 0 ? maxNum + 1 : 4;
  }, [roundsList]);

  // Questions count per round
  const questionCountByRound = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of roundsList) {
      counts[r] = 0;
    }
    for (const item of runningOrder) {
      const r = canonicalizeRoundName(item.roundName || "");
      if (r) {
        counts[r] = (counts[r] || 0) + 1;
      }
    }
    return counts;
  }, [roundsList, runningOrder]);

  const handleAddRound = (roundName: string) => {
    const canonical = canonicalizeRoundName(roundName);
    if (!canonical) return;
    if (!roundsList.some((r) => r.toLowerCase() === canonical.toLowerCase())) {
      setRoundsList((prev) => [...prev, canonical]);
    }
    setCustomRoundInput("");
    setIsAddingRound(false);
  };

  const handleRemoveRound = (roundName: string) => {
    if ((questionCountByRound[roundName] || 0) > 0) return;
    setRoundsList((prev) => prev.filter((r) => r !== roundName));
  };

  const handleSaveRoundScheme = (scope: "ROUND" | "ALL", newScheme: RoundMarkingScheme) => {
    const existingSchemes = roundSettings?.markingSchemes ? { ...roundSettings.markingSchemes } : {};
    if (scope === "ALL") {
      for (const r of roundsList) {
        existingSchemes[r] = newScheme;
      }
    } else if (editingRoundForScheme) {
      existingSchemes[editingRoundForScheme] = newScheme;
    }

    const updatedSettings: QuizRoundSettings = {
      ...roundSettings,
      markingSchemes: existingSchemes,
    };

    setRoundSettings(updatedSettings);
    setIsMarkingModalOpen(false);
    setSaveStatus("idle");
  };

  // Pool Filters & Sorting State
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("");
  const [freshnessFilter, setFreshnessFilter] = useState<"all" | "unused" | "hide-recent">("all");
  const [mediaOnlyFilter, setMediaOnlyFilter] = useState<boolean>(false);
  const [hideAddedFilter, setHideAddedFilter] = useState<boolean>(false);
  const [scopeToTheme, setScopeToTheme] = useState<boolean>(themeCategoryIds.length > 0);
  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "least-used" | "most-used" | "difficulty-asc" | "difficulty-desc"
  >("newest");

  // Set of IDs in running order for O(1) lookup
  const runningOrderIds = new Set(runningOrder.map((q) => q.questionId));

  // Compute live difficulty balance
  const balance = calculateDifficultyBalance(runningOrder);

  // Check if any non-default filters are active
  const hasActiveFilters = Boolean(
    search ||
      categoryFilter ||
      difficultyFilter ||
      freshnessFilter !== "all" ||
      mediaOnlyFilter ||
      hideAddedFilter ||
      sortBy !== "newest" ||
      (themeCategoryIds.length > 0 && !scopeToTheme)
  );

  const resetFilters = () => {
    setSearch("");
    setCategoryFilter("");
    setDifficultyFilter("");
    setFreshnessFilter("all");
    setMediaOnlyFilter(false);
    setHideAddedFilter(false);
    setScopeToTheme(themeCategoryIds.length > 0);
    setSortBy("newest");
  };

  // Filter & sort approved questions pool
  const filteredPool = useMemo(() => {
    const filtered = approvedQuestions.filter((q) => {
      // 1. Hide already added
      if (hideAddedFilter && runningOrderIds.has(q.id)) {
        return false;
      }

      // 2. Theme scope
      if (scopeToTheme && themeCategoryIds.length > 0) {
        const hasThemeCat = q.categories.some((c) => themeCategoryIds.includes(c.id));
        if (!hasThemeCat) return false;
      }

      // 3. Category dropdown
      if (categoryFilter && !q.categories.some((c) => c.id === categoryFilter)) {
        return false;
      }

      // 4. Difficulty dropdown
      if (difficultyFilter && q.difficulty !== difficultyFilter) {
        return false;
      }

      // 5. Freshness filter
      if (freshnessFilter === "unused" && q.usageCount > 0) {
        return false;
      }
      if (freshnessFilter === "hide-recent" && recentQuestionsRecord[q.id]) {
        return false;
      }

      // 6. Media only filter
      if (mediaOnlyFilter && q.mediaCount === 0) {
        return false;
      }

      // 7. Search query
      if (search.trim()) {
        const term = search.toLowerCase();
        const matchText = q.text.toLowerCase().includes(term);
        const matchAns = q.answerText.toLowerCase().includes(term);
        const matchNotes = q.notes?.toLowerCase().includes(term) ?? false;
        const matchSub = q.categories.some((c) => c.subGenre?.toLowerCase().includes(term));
        if (!matchText && !matchAns && !matchNotes && !matchSub) return false;
      }

      return true;
    });

    const difficultyWeight: Record<string, number> = { EASY: 1, MEDIUM: 2, HARD: 3 };

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "least-used":
          if (a.usageCount !== b.usageCount) return a.usageCount - b.usageCount;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "most-used":
          if (a.usageCount !== b.usageCount) return b.usageCount - a.usageCount;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "difficulty-asc":
          return (difficultyWeight[a.difficulty] ?? 2) - (difficultyWeight[b.difficulty] ?? 2);
        case "difficulty-desc":
          return (difficultyWeight[b.difficulty] ?? 2) - (difficultyWeight[a.difficulty] ?? 2);
        case "newest":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [
    approvedQuestions,
    hideAddedFilter,
    runningOrderIds,
    scopeToTheme,
    themeCategoryIds,
    categoryFilter,
    difficultyFilter,
    freshnessFilter,
    recentQuestionsRecord,
    mediaOnlyFilter,
    search,
    sortBy,
  ]);

  // Reordering handlers
  const moveItem = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= runningOrder.length) return;

    const newOrder = [...runningOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    // Re-index
    const reindexed = newOrder.map((item, idx) => ({
      ...item,
      orderIndex: idx + 1,
    }));
    setRunningOrder(reindexed);
    setSaveStatus("idle");
  };

  const removeItem = (questionId: string) => {
    const newOrder = runningOrder
      .filter((item) => item.questionId !== questionId)
      .map((item, idx) => ({ ...item, orderIndex: idx + 1 }));
    setRunningOrder(newOrder);
    setSaveStatus("idle");
  };

  const addItem = (q: QuestionSummary) => {
    if (runningOrderIds.has(q.id)) return;

    const lastRound = runningOrder.length > 0 ? runningOrder[runningOrder.length - 1].roundName : "";

    const newItem: RunningOrderItem = {
      questionId: q.id,
      orderIndex: runningOrder.length + 1,
      roundName: lastRound,
      text: q.text,
      answerText: q.answerText,
      difficulty: q.difficulty,
      notes: q.notes,
      categories: q.categories,
      mediaCount: q.mediaCount,
    };

    setRunningOrder([...runningOrder, newItem]);
    setSaveStatus("idle");
  };

  const updateRoundName = (index: number, rawName: string) => {
    const newOrder = [...runningOrder];
    newOrder[index] = { ...newOrder[index], roundName: rawName };
    setRunningOrder(newOrder);
    setSaveStatus("idle");
  };

  const commitRoundName = (index: number, rawName: string, addToPresets = false) => {
    const canonical = canonicalizeRoundName(rawName);
    const newOrder = [...runningOrder];
    newOrder[index] = { ...newOrder[index], roundName: canonical };
    setRunningOrder(newOrder);
    setSaveStatus("idle");

    if (addToPresets && canonical && !roundsList.some((r) => r.toLowerCase() === canonical.toLowerCase())) {
      setRoundsList((prev) => [...prev, canonical]);
    }
  };

  const handleSave = () => {
    setSaveStatus("idle");
    setErrorMessage(null);

    startTransition(async () => {
      const payload = runningOrder.map((item, idx) => ({
        questionId: item.questionId,
        orderIndex: idx + 1,
        roundName: item.roundName,
      }));

      const res = await saveRunningOrder(quizId, payload, roundSettings);
      if (res.ok) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 4000);
      } else {
        setSaveStatus("error");
        setErrorMessage(res.error || "Failed to save running order.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Live Difficulty Balance Banner */}
      <CardShell tone="cream" className="border-3 p-4 shadow-[4px_4px_0_var(--ink)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-display text-lg">Difficulty Balance:</span>
            <Tag tone="mint">
              {balance.easy} Easy ({balance.easyPct}%)
            </Tag>
            <Tag tone="yellow">
              {balance.medium} Medium ({balance.mediumPct}%)
            </Tag>
            <Tag tone="pink">
              {balance.hard} Hard ({balance.hardPct}%)
            </Tag>
            <span className="font-bold text-xs text-ink opacity-60">
              ({balance.total} questions total)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {balance.isBalanced ? (
              <Tag tone="mint" className="inline-flex items-center gap-1">
                <CheckIcon size={12} className="text-forest" /> Balanced Mix
              </Tag>
            ) : (
              <span className="inline-flex items-center gap-1 border-2 border-ink bg-yellow px-2 py-1 text-xs font-bold text-ink shadow-[2px_2px_0_var(--ink)]">
                <AlertTriangleIcon size={12} /> {balance.warning}
              </span>
            )}
            <Button
              onClick={handleSave}
              variant="primary"
              disabled={isPending}
              className="text-xs inline-flex items-center gap-1.5"
            >
              {isPending ? (
                "Saving..."
              ) : (
                <>
                  <SaveIcon size={13} /> Save Running Order
                </>
              )}
            </Button>
          </div>
        </div>

        {saveStatus === "saved" && (
          <div className="mt-2 border border-ink bg-mint px-3 py-1 font-body text-xs font-bold text-ink flex items-center gap-1.5">
            <CheckIcon size={14} className="text-forest" /> Running order successfully saved to database!
          </div>
        )}
        {saveStatus === "error" && (
          <div className="mt-2 border border-ink bg-pink px-3 py-1 font-body text-xs font-bold text-ink">
            ✕ {errorMessage}
          </div>
        )}
      </CardShell>

      {/* Main Two-Panel Workspace */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* LEFT PANEL: Question Pool (5 columns) */}
        <div className="flex flex-col gap-4 lg:col-span-5">
          <CardShell tone="cream" className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink pb-3">
              <h2 className="font-display text-lg">Question Pool</h2>
              <div className="flex items-center gap-2">
                <span className="font-body text-xs font-bold text-ink opacity-60">
                  {filteredPool.length} of {approvedQuestions.length}
                </span>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="border border-ink bg-white px-1.5 py-0.5 text-[11px] font-bold text-pink hover:bg-pink/20 transition-colors"
                    title="Reset all filters"
                  >
                    ✕ Reset
                  </button>
                )}
              </div>
            </div>

            {/* Pool Filter Toolbar */}
            <div className="mt-3 flex flex-col gap-2 font-body text-xs">
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search clues, answers, subgenres..."
                  className="w-full border-2 border-ink bg-white px-2.5 py-1.5 pr-8 shadow-[2px_2px_0_var(--ink)] focus:outline-none"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center border border-ink bg-cream font-bold text-[11px] text-ink hover:bg-pink transition-colors shadow-[1px_1px_0_var(--ink)]"
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Row 1: Category & Difficulty */}
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="border-2 border-ink bg-white px-2 py-1 font-semibold shadow-[2px_2px_0_var(--ink)] focus:outline-none"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="border-2 border-ink bg-white px-2 py-1 font-semibold shadow-[2px_2px_0_var(--ink)] focus:outline-none"
                >
                  <option value="">All Difficulties</option>
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </div>

              {/* Row 2: Freshness / Usage & Sorting */}
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={freshnessFilter}
                  onChange={(e) =>
                    setFreshnessFilter(e.target.value as "all" | "unused" | "hide-recent")
                  }
                  className="border-2 border-ink bg-white px-2 py-1 font-semibold shadow-[2px_2px_0_var(--ink)] focus:outline-none"
                >
                  <option value="all">All Usage History</option>
                  <option value="unused">Fresh Only (0× used)</option>
                  <option value="hide-recent">Hide Recent (Last 2)</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(
                      e.target.value as
                        | "newest"
                        | "oldest"
                        | "least-used"
                        | "most-used"
                        | "difficulty-asc"
                        | "difficulty-desc",
                    )
                  }
                  className="border-2 border-ink bg-white px-2 py-1 font-semibold shadow-[2px_2px_0_var(--ink)] focus:outline-none"
                >
                  <option value="newest">Sort: Newest First</option>
                  <option value="oldest">Sort: Oldest First</option>
                  <option value="least-used">Sort: Least Used (0× first)</option>
                  <option value="most-used">Sort: Most Used</option>
                  <option value="difficulty-asc">Sort: Difficulty (Easy → Hard)</option>
                  <option value="difficulty-desc">Sort: Difficulty (Hard → Easy)</option>
                </select>
              </div>

              {/* Row 3: Quick Filter Chips (Hide added, Media only) */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => setHideAddedFilter(!hideAddedFilter)}
                  className={`border border-ink px-2 py-0.5 text-[11px] font-bold transition-all ${
                    hideAddedFilter
                      ? "bg-mint text-ink shadow-[1px_1px_0_var(--ink)]"
                      : "bg-white text-ink/70 hover:bg-cream hover:text-ink"
                  }`}
                >
                  {hideAddedFilter ? "✓ Hiding Added" : "+ Hide Added"}
                </button>

                <button
                  type="button"
                  onClick={() => setMediaOnlyFilter(!mediaOnlyFilter)}
                  className={`border border-ink px-2 py-0.5 text-[11px] font-bold transition-all ${
                    mediaOnlyFilter
                      ? "bg-lavender text-ink shadow-[1px_1px_0_var(--ink)]"
                      : "bg-white text-ink/70 hover:bg-cream hover:text-ink"
                  }`}
                >
                  {mediaOnlyFilter ? (
                    <span className="flex items-center gap-1">
                      <CheckIcon size={12} className="text-forest" />
                      <PaperclipIcon size={12} /> Media Only
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <PaperclipIcon size={12} /> Media Only
                    </span>
                  )}
                </button>
              </div>

              {themeCategoryIds.length > 0 && (
                <div className="flex items-center justify-between border border-dashed border-ink bg-cream/60 p-1.5 text-[11px]">
                  <span className="flex items-center gap-1">
                    <TargetIcon size={13} />
                    Theme: <strong>{themeName}</strong> ({themeCategoryIds.length} cats)
                  </span>
                  <button
                    type="button"
                    onClick={() => setScopeToTheme(!scopeToTheme)}
                    className="font-bold underline text-ink hover:text-black"
                  >
                    {scopeToTheme ? "Show All Pool" : "Scope to Theme"}
                  </button>
                </div>
              )}
            </div>
          </CardShell>

          {/* Question Pool Scroll List */}
          <div className="flex max-h-[650px] flex-col gap-3 overflow-y-auto pr-1">
            {filteredPool.length === 0 ? (
              <div className="border-2 border-dashed border-ink p-8 text-center font-body text-xs text-ink opacity-60">
                <p className="font-bold">No matching approved questions found.</p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-2 font-bold underline text-ink hover:text-black"
                  >
                    Clear filters to view all questions
                  </button>
                )}
              </div>
            ) : (
              filteredPool.map((q) => {
                const isAdded = runningOrderIds.has(q.id);
                const recentInfo = recentQuestionsRecord[q.id];

                return (
                  <CardShell
                    key={q.id}
                    tone="cream"
                    className={`flex flex-col gap-2 p-3 text-xs transition-opacity ${
                      isAdded ? "opacity-60 bg-white" : ""
                    }`}
                  >
                    <p className="font-body font-medium leading-relaxed">{q.text}</p>
                    <p className="font-body text-ink opacity-80">
                      <strong>Ans:</strong> {q.answerText}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 font-body text-xs text-ink/75">
                      <Tag tone={DIFFICULTY_TONE[q.difficulty] ?? "ink"} className="text-[10px]">
                        {q.difficulty}
                      </Tag>
                      {q.categories.map((c) => (
                        <span key={c.id} className="inline-flex items-center gap-1 font-semibold text-ink/80">
                          <span className="opacity-40">•</span> {c.name}
                          {c.subGenre && <span className="opacity-60">({c.subGenre})</span>}
                        </span>
                      ))}
                      {q.mediaCount > 0 && (
                        <span className="inline-flex items-center gap-1 font-bold text-ink/80">
                          <span className="opacity-40">•</span>
                          <PaperclipIcon size={12} /> {q.mediaCount} media
                        </span>
                      )}
                    </div>

                    {/* Recency Soft Warning Badge */}
                    {recentInfo && (
                      <div className="border border-ink bg-yellow p-1 font-body text-[11px] font-bold text-ink flex items-center gap-1">
                        <AlertTriangleIcon size={12} /> Used in <em>{recentInfo.quizTitle}</em> ({formatDisplayDate(recentInfo.quizDate)}) — last 2 quizzes
                      </div>
                    )}

                    {/* Usage count badge */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-body text-[10px] text-ink opacity-60">
                        {q.usageCount > 0 ? (
                          `Used ${q.usageCount}× in past quizzes`
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <SparklesIcon size={11} className="text-forest" /> Fresh clue (0 previous uses)
                          </span>
                        )}
                      </span>
                      <Button
                        type="button"
                        onClick={() => addItem(q)}
                        disabled={isAdded}
                        variant={isAdded ? "alt" : "primary"}
                        className="py-1 px-2.5 text-[11px]"
                      >
                        {isAdded ? "✓ Added" : "+ Add to Quiz"}
                      </Button>
                    </div>
                  </CardShell>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Live Running Order (7 columns) */}
        <div className="flex flex-col gap-4 lg:col-span-7">
          <CardShell tone="cream" className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink pb-3">
              <div>
                <h2 className="font-display text-lg">Running Order</h2>
                <p className="font-body text-xs text-ink opacity-70">
                  Arrange question sequence and optional round assignments.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {runningOrder.length > 0 && (
                  <Button
                    type="button"
                    onClick={() => {
                      if (confirm("Clear all questions from the running order?")) {
                        setRunningOrder([]);
                        setSaveStatus("idle");
                      }
                    }}
                    variant="underline"
                    className="text-xs text-red-600"
                  >
                    Clear All
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={handleSave}
                  variant="primary"
                  disabled={isPending}
                  className="text-xs inline-flex items-center gap-1.5"
                >
                  {isPending ? (
                    "Saving..."
                  ) : (
                    <>
                      <SaveIcon size={13} /> Save Order
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Quiz Rounds & Structure Management Toolbar */}
            <div className="mt-4 border-2 border-ink bg-cream/70 p-3 shadow-[2px_2px_0_var(--ink)] flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-display text-xs font-black uppercase tracking-wider text-ink">
                    Quiz Rounds ({roundsList.length}):
                  </span>
                  <span className="ml-2 font-body text-[11px] text-ink/70 hidden sm:inline">
                    Rounds defined here appear as 1-click buttons on every clue below
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAddRound(`Round ${nextRoundNumber}`)}
                    className="cursor-pointer border-2 border-ink bg-yellow px-2.5 py-1 text-xs font-black text-ink shadow-[2px_2px_0_var(--ink)] hover:bg-yellow/80 active:translate-x-[1px] active:translate-y-[1px] inline-flex items-center gap-1"
                    title={`Add next sequential round (Round ${nextRoundNumber})`}
                  >
                    <ZapIcon size={12} />
                    Add Round {nextRoundNumber}
                  </button>

                  {isAddingRound ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={customRoundInput}
                        onChange={(e) => setCustomRoundInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddRound(customRoundInput);
                          }
                        }}
                        placeholder="e.g. Audio Round"
                        className="border-2 border-ink bg-white px-2 py-0.5 text-xs font-bold w-36 shadow-[1px_1px_0_var(--ink)] focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleAddRound(customRoundInput)}
                        className="border border-ink bg-mint px-2 py-0.5 text-xs font-bold cursor-pointer"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingRound(false);
                          setCustomRoundInput("");
                        }}
                        className="border border-ink bg-white px-1.5 py-0.5 text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAddingRound(true)}
                      className="cursor-pointer border-2 border-dashed border-ink/60 bg-white px-2 py-1 text-xs font-bold text-ink hover:bg-cream"
                    >
                      + Custom Round
                    </button>
                  )}
                </div>
              </div>

              {/* Active Round Badges */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {roundsList.map((r) => {
                  const qCount = questionCountByRound[r] || 0;
                  const scheme = getRoundMarkingScheme(roundSettings, r);

                  return (
                    <span
                      key={r}
                      className="inline-flex items-center gap-1.5 border border-ink/40 bg-white px-2 py-0.5 text-xs font-bold text-ink shadow-[1px_1px_0_var(--ink)]"
                    >
                      <span>{r}</span>
                      <span
                        className={`text-[10px] px-1 rounded-xs font-mono font-black ${
                          qCount > 0 ? "bg-yellow text-ink" : "bg-ink/10 text-ink/60"
                        }`}
                      >
                        {qCount} Q{qCount === 1 ? "" : "s"}
                      </span>

                      {/* Marking Scheme Indicator & Editor */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRoundForScheme(r);
                          setIsMarkingModalOpen(true);
                        }}
                        className="border border-ink/40 bg-cream hover:bg-yellow hover:border-ink px-1.5 py-0.2 text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1"
                        title={`Configure marking scheme for ${r} (Current: ${scheme.chips.map((c) => (c > 0 ? `+${c}` : c)).join("/")})`}
                      >
                        <SettingsIcon size={11} />
                        <span>{scheme.chips.map((c) => (c > 0 ? `+${c}` : c)).join("/")}</span>
                      </button>

                      {qCount === 0 && roundsList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRound(r)}
                          className="text-ink/40 hover:text-pink hover:font-bold text-[11px] cursor-pointer ml-0.5 inline-flex items-center"
                          title="Remove unused round preset"
                        >
                          <XIcon size={11} />
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Running Order Item List */}
            <div className="mt-4 flex flex-col gap-3">
              {runningOrder.length === 0 ? (
                <div className="border-3 border-dashed border-ink bg-cream/30 p-12 text-center font-body text-sm text-ink opacity-60">
                  <p className="font-bold">The running order is currently empty.</p>
                  <p className="mt-1 text-xs">
                    Click <strong>&quot;+ Add to Quiz&quot;</strong> from the question pool on the left to add clues here.
                  </p>
                </div>
              ) : (
                runningOrder.map((item, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === runningOrder.length - 1;
                  const recentInfo = recentQuestionsRecord[item.questionId];

                  return (
                    <CardShell
                      key={item.questionId}
                      tone="cream"
                      className="border-3 p-3.5 shadow-[3px_3px_0_var(--ink)]"
                    >
                      <div className="flex items-start gap-3">
                        {/* Sequence Number */}
                        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center border-2 border-ink bg-yellow font-display text-sm">
                          #{idx + 1}
                        </span>

                        {/* Question Content */}
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-sm font-medium leading-snug">
                            {item.text}
                          </p>
                          <p className="mt-1 font-body text-xs text-ink opacity-80">
                            <strong>Ans:</strong> {item.answerText}
                          </p>

                          <div className="mt-2 flex flex-wrap items-center gap-2 font-body text-xs text-ink/75">
                            <Tag tone={DIFFICULTY_TONE[item.difficulty] ?? "ink"} className="text-[10px]">
                              {item.difficulty}
                            </Tag>
                            {item.categories.map((c) => (
                              <span key={c.id} className="inline-flex items-center gap-1 font-semibold text-ink/80">
                                <span className="opacity-40">•</span> {c.name}
                                {c.subGenre && <span className="opacity-60">({c.subGenre})</span>}
                              </span>
                            ))}
                            {item.mediaCount > 0 && (
                              <span className="inline-flex items-center gap-1 font-bold text-ink/80">
                                <span className="opacity-40">•</span>
                                <PaperclipIcon size={12} /> {item.mediaCount} media
                              </span>
                            )}
                          </div>

                          {recentInfo && (
                            <p className="mt-1.5 text-[11px] font-bold text-pink flex items-center gap-1">
                              <AlertTriangleIcon size={12} /> Note: Used in {recentInfo.quizTitle} (last 2 quizzes)
                            </p>
                          )}

                          {/* Round Assignment Toolbar — Distinct Interactive Control */}
                          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed border-ink/30 pt-2 font-body">
                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink/70">
                              Round:
                            </span>
                            <input
                              type="text"
                              list="round-presets"
                              value={item.roundName}
                              onChange={(e) => updateRoundName(idx, e.target.value)}
                              onBlur={(e) => commitRoundName(idx, e.target.value, false)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  commitRoundName(idx, (e.target as HTMLInputElement).value, true);
                                }
                              }}
                              placeholder="e.g. Round 1 / Prelims"
                              className="border-2 border-ink bg-white px-2 py-0.5 text-xs font-bold shadow-[2px_2px_0_var(--ink)] focus:outline-none max-w-[150px]"
                            />
                            <div className="flex flex-wrap items-center gap-1.5">
                              {roundsList.map((preset) => {
                                const isSelected = item.roundName === preset;
                                return (
                                  <button
                                    key={preset}
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => commitRoundName(idx, isSelected ? "" : preset, false)}
                                    className={`cursor-pointer rounded-sm border-2 border-ink px-2 py-0.5 text-xs font-extrabold transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
                                      isSelected
                                        ? "bg-yellow text-ink shadow-[2px_2px_0_var(--ink)] ring-1 ring-ink"
                                        : "bg-white text-ink/80 shadow-[2px_2px_0_var(--ink)] hover:bg-cream hover:text-ink"
                                    }`}
                                  >
                                    {isSelected ? `✓ ${preset}` : preset}
                                  </button>
                                );
                              })}
                              {item.roundName && !roundsList.includes(item.roundName) && (
                                <button
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => commitRoundName(idx, "", false)}
                                  className="cursor-pointer border-2 border-dashed border-ink bg-pink/20 px-2 py-0.5 text-xs font-bold text-ink shadow-[1px_1px_0_var(--ink)] hover:bg-pink/40"
                                  title="Clear custom round"
                                >
                                  ✕ Clear
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Reordering & Delete Controls */}
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => moveItem(idx, -1)}
                            disabled={isFirst}
                            aria-label="Move Up"
                            className="flex h-6 w-6 items-center justify-center border border-ink bg-white text-xs font-bold hover:bg-cream disabled:opacity-30"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => moveItem(idx, 1)}
                            disabled={isLast}
                            aria-label="Move Down"
                            className="flex h-6 w-6 items-center justify-center border border-ink bg-white text-xs font-bold hover:bg-cream disabled:opacity-30"
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItem(item.questionId)}
                            aria-label="Remove Question"
                            className="flex h-6 w-6 items-center justify-center border border-ink bg-pink text-xs font-bold hover:bg-red-300"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </CardShell>
                  );
                })
              )}
            </div>
          </CardShell>
        </div>
      </div>

      {/* Marking Scheme Configuration Modal in Builder */}
      <MarkingSchemeModal
        isOpen={isMarkingModalOpen}
        onClose={() => setIsMarkingModalOpen(false)}
        activeRound={editingRoundForScheme || roundsList[0] || "Round 1"}
        allRounds={roundsList}
        currentScheme={getRoundMarkingScheme(roundSettings, editingRoundForScheme || roundsList[0] || "Round 1")}
        onSave={handleSaveRoundScheme}
        isSaving={false}
      />

      <datalist id="round-presets">
        {Array.from(
          new Set([
            ...roundsList,
            ...runningOrder.map((r) => r.roundName).filter(Boolean),
          ]),
        ).map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>
    </div>
  );
}
