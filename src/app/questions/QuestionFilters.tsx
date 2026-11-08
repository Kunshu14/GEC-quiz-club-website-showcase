"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { Combobox } from "@/components/ui/Combobox";

interface Category {
  id: string;
  name: string;
  subGenres: string[];
}

interface QuestionFiltersProps {
  categories: Category[];
  canViewFullPool: boolean;
  currentParams: {
    q: string;
    category: string;
    subgenre: string;
    difficulty: string;
    status: string;
    sort: string;
  };
}

const DIFFICULTIES = [
  { value: "", label: "All difficulties" },
  { value: "EASY", label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
];

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "FLAGGED", label: "Flagged" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

const SORTS = [
  { value: "", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "difficulty", label: "Difficulty" },
  { value: "status", label: "Status" },
];

export function QuestionFilters({
  categories,
  canViewFullPool,
  currentParams,
}: QuestionFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [searchValue, setSearchValue] = useState(currentParams.q);

  useEffect(() => {
    setSearchValue(currentParams.q);
  }, [currentParams.q]);

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Clear subgenre when category changes
      if (key === "category") {
        params.delete("subgenre");
      }
      startTransition(() => {
        router.push(`?${params.toString()}`, { scroll: false });
      });
    },
    [router, searchParams, startTransition],
  );

  const clearAll = useCallback(() => {
    setSearchValue("");
    startTransition(() => {
      router.push("?", { scroll: false });
    });
  }, [router, startTransition]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam("q", searchValue.trim());
  };

  // Build sub-genre options based on selected category
  const selectedCategory = currentParams.category;
  const subGenreOptions: { label: string; value: string }[] = [];

  if (selectedCategory) {
    // Show only sub-genres for the selected category
    const cat = categories.find((c) => c.id === selectedCategory);
    if (cat) {
      for (const sg of cat.subGenres) {
        subGenreOptions.push({ label: sg, value: sg });
      }
    }
  } else {
    // Show all distinct sub-genres, grouping parent categories if shared between multiple
    const catsBySubgenre: Record<string, string[]> = {};
    for (const cat of categories) {
      for (const sg of cat.subGenres) {
        if (!catsBySubgenre[sg]) {
          catsBySubgenre[sg] = [];
        }
        if (!catsBySubgenre[sg].includes(cat.name)) {
          catsBySubgenre[sg].push(cat.name);
        }
      }
    }

    const sortedSubgenres = Object.keys(catsBySubgenre).sort((a, b) =>
      a.localeCompare(b),
    );

    for (const sg of sortedSubgenres) {
      const catNames = catsBySubgenre[sg];
      const label =
        catNames.length > 1
          ? `${sg} (${catNames.join(", ")})`
          : `${sg} (${catNames[0]})`;
      subGenreOptions.push({ label, value: sg });
    }
  }

  const hasActiveFilters = Boolean(
    currentParams.q ||
    currentParams.category ||
    currentParams.subgenre ||
    currentParams.difficulty ||
    currentParams.status ||
    currentParams.sort
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Search + Filters bar */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-1 font-body text-sm">
          <span className="font-bold uppercase tracking-wide">Search</span>
          <input
            type="text"
            placeholder="Search questions or answers..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onBlur={() => {
              if (searchValue.trim() !== currentParams.q) {
                updateParam("q", searchValue.trim());
              }
            }}
            className="border-[3px] border-ink bg-cream px-3 py-2 font-body text-sm text-ink placeholder:text-ink/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-ink min-w-[220px]"
          />
        </form>

        {/* Category */}
        <label className="flex flex-col gap-1 font-body text-sm">
          <span className="font-bold uppercase tracking-wide">Category</span>
          <select
            value={currentParams.category}
            onChange={(e) => updateParam("category", e.target.value)}
            className="border-[3px] border-ink bg-cream px-3 py-2 font-body text-sm text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-ink"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        {/* Sub-genre */}
        {subGenreOptions.length > 0 && (
          <label className="flex flex-col gap-1 font-body text-sm">
            <span className="font-bold uppercase tracking-wide">Sub-genre</span>
            <Combobox
              allowFreeText={false}
              value={currentParams.subgenre}
              onChange={(v) => updateParam("subgenre", v)}
              options={[{ value: "", label: "All sub-genres" }, ...subGenreOptions]}
              placeholder="All sub-genres"
              ariaLabel="Sub-genre filter"
              className="min-w-[200px]"
            />
          </label>
        )}

        {/* Difficulty */}
        <label className="flex flex-col gap-1 font-body text-sm">
          <span className="font-bold uppercase tracking-wide">Difficulty</span>
          <select
            value={currentParams.difficulty}
            onChange={(e) => updateParam("difficulty", e.target.value)}
            className="border-[3px] border-ink bg-cream px-3 py-2 font-body text-sm text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-ink"
          >
            {DIFFICULTIES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </label>

        {/* Status (full pool viewers only) */}
        {canViewFullPool && (
          <label className="flex flex-col gap-1 font-body text-sm">
            <span className="font-bold uppercase tracking-wide">Status</span>
            <select
              value={currentParams.status}
              onChange={(e) => updateParam("status", e.target.value)}
              className="border-[3px] border-ink bg-cream px-3 py-2 font-body text-sm text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-ink"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        )}

        {/* Sort */}
        <label className="flex flex-col gap-1 font-body text-sm">
          <span className="font-bold uppercase tracking-wide">Sort</span>
          <select
            value={currentParams.sort}
            onChange={(e) => updateParam("sort", e.target.value)}
            className="border-[3px] border-ink bg-cream px-3 py-2 font-body text-sm text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-ink"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        {/* Clear filters button */}
        {hasActiveFilters && (
          <Button
            type="button"
            variant="underline"
            onClick={clearAll}
            className="self-end pb-2.5 text-xs font-bold uppercase tracking-wider text-orange hover:text-ink cursor-pointer"
          >
            Clear filters ✕
          </Button>
        )}
      </div>
    </div>
  );
}
