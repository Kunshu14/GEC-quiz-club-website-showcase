"use client";

import { useEffect, useState } from "react";
import { CardShell } from "./CardShell";

interface DismissibleNoticeProps {
  children: React.ReactNode;
  tone?: "cream" | "pink" | "yellow" | "mint" | "lavender" | "orange";
  paramToClear?: string;
  storageKey?: string;
  className?: string;
}

export function DismissibleNotice({
  children,
  tone = "orange",
  paramToClear,
  storageKey,
  className = "",
}: DismissibleNoticeProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (storageKey && localStorage.getItem(storageKey)) {
        setDismissed(true);
      }
      if (paramToClear) {
        const url = new URL(window.location.href);
        if (url.searchParams.has(paramToClear)) {
          url.searchParams.delete(paramToClear);
          const cleanUrl = url.pathname + (url.search ? url.search : "") + url.hash;
          window.history.replaceState({}, "", cleanUrl);
        }
      }
    }
  }, [paramToClear, storageKey]);

  if (dismissed) return null;

  return (
    <CardShell tone={tone} className={`relative flex items-center justify-between gap-4 ${className}`}>
      <div className="font-body text-sm font-bold text-ink">{children}</div>
      <button
        type="button"
        onClick={() => {
          if (typeof window !== "undefined" && storageKey) {
            localStorage.setItem(storageKey, "true");
          }
          setDismissed(true);
        }}
        aria-label="Dismiss notice"
        className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center p-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
      >
        <span className="flex h-6 w-6 items-center justify-center border-2 border-ink bg-ink text-pink font-body text-xs font-bold transition-colors duration-150 hover:bg-pink hover:text-cream">
          ✕
        </span>
      </button>
    </CardShell>
  );
}
