"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  /** Committed value (what lives in the URL param / form field). */
  value: string;
  /** Called on commit with a new value. */
  onChange: (value: string) => void;
  /** Full option list — the visible list shrinks as you type. */
  options: ComboboxOption[];
  placeholder?: string;
  /** Free-text mode (true → new sub-genres allowed) vs restricted (false → must match). */
  allowFreeText?: boolean;
  disabled?: boolean;
  className?: string;
  ariaLabel: string;
  /** Optional hidden input name — when set, Combobox renders a hidden input carrying `value`. */
  name?: string;
}

function labelFor(value: string, options: ComboboxOption[], allowFreeText: boolean): string {
  if (!value) return "";
  const option = options.find((o) => o.value === value);
  if (option) return option.label;
  return allowFreeText ? value : "";
}

export function Combobox({
  value,
  onChange,
  options,
  placeholder,
  allowFreeText = false,
  disabled = false,
  className = "",
  ariaLabel,
  name,
}: ComboboxProps) {
  const [query, setQuery] = useState(labelFor(value, options, allowFreeText));
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  // Sync the visible query with the committed value whenever `value` changes externally
  useEffect(() => {
    setQuery(labelFor(value, options, allowFreeText));
    setHighlight(-1);
  }, [value, options, allowFreeText]);

  // Filtered options — shrinks live as `query` narrows
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(normalizedQuery),
  );
  const count = filtered.length;

  const commit = useCallback(
    (next: string) => {
      setQuery(labelFor(next, options, allowFreeText));
      setOpen(false);
      setHighlight(-1);
      onChange(next);
    },
    [options, allowFreeText, onChange],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) {
          setOpen(true);
          setHighlight(count > 0 ? 0 : -1);
        } else {
          setHighlight((h) => (h + 1) % Math.max(count, 1));
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!open) {
          setOpen(true);
          setHighlight(count > 0 ? count - 1 : -1);
        } else {
          setHighlight((h) => (h - 1 + Math.max(count, 1)) % Math.max(count, 1));
        }
        break;
      case "Enter":
        e.preventDefault();
        if (open && highlight >= 0 && highlight < count) {
          commit(filtered[highlight].value);
        } else if (allowFreeText && query.trim()) {
          commit(query.trim());
        } else {
          setOpen(false);
        }
        break;
      case "Escape":
        e.preventDefault();
        setQuery(labelFor(value, options, allowFreeText));
        setOpen(false);
        setHighlight(-1);
        break;
      case "Tab":
        if (open) {
          if (highlight >= 0 && highlight < count) {
            commit(filtered[highlight].value);
          } else if (allowFreeText && query.trim()) {
            commit(query.trim());
          } else {
            setOpen(false);
          }
        }
        break;
    }
  };

  // Scroll highlighted option into view
  useEffect(() => {
    const el = listRef.current?.children[highlight] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (!allowFreeText) {
          setQuery(labelFor(value, options, allowFreeText));
        }
        setOpen(false);
        setHighlight(-1);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open, allowFreeText, value, options]);

  // On blur: restricted → revert to committed label; free-text → commit typed value
  const handleBlur = () => {
    if (allowFreeText) {
      const trimmed = query.trim();
      if (trimmed !== value) {
        onChange(trimmed);
      }
    } else {
      setQuery(labelFor(value, options, false));
    }
    setOpen(false);
    setHighlight(-1);
  };

  return (
    <div ref={containerRef} className={`relative w-full min-w-0 ${className}`}>
      {name !== undefined && <input type="hidden" name={name} value={value} />}

      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          setOpen(true);
          setHighlight(-1);
          if (allowFreeText) {
            onChange(next);
          }
        }}
        onFocus={() => {
          if (disabled) return;
          setOpen(true);
          setHighlight(-1);
        }}
        onBlur={handleBlur}
        onKeyDown={onKeyDown}
        className={`w-full min-w-0 border-[3px] border-ink bg-cream px-3 py-2 pr-8 font-body text-sm text-ink placeholder:text-ink/50 focus:bg-white focus:text-ink focus:outline-none focus:ring-2 focus:ring-ink ${
          disabled ? "cursor-not-allowed opacity-40" : ""
        }`}
      />

      {/* Caret */}
      <span
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-body text-xs text-ink select-none"
      >
        {open ? "▴" : "▾"}
      </span>

      {open && count > 0 && (
        <ul
          id={listId}
          ref={listRef}
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto border-[3px] border-ink bg-white font-body text-sm text-ink shadow-[4px_4px_0_var(--ink)]"
        >
          {filtered.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={i === highlight}
              onMouseDown={(e) => {
                e.preventDefault();
                commit(o.value);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={`cursor-pointer px-3 py-2 ${
                i === highlight ? "bg-ink text-cream" : "bg-white text-ink hover:bg-cream"
              }`}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
