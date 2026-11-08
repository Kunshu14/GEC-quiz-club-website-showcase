"use client";

import { useState } from "react";
import { Button, Tag } from "@/components/ui";

export function StyleGuideInteractiveButtons() {
  const [clickLog, setClickLog] = useState<string[]>([]);
  const [lastClicked, setLastClicked] = useState<string | null>(null);

  const handleClick = (variant: string) => {
    const time = new Date().toLocaleTimeString();
    setLastClicked(variant);
    setClickLog((prev) => [`${variant} button clicked at ${time}`, ...prev.slice(0, 4)]);
  };

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Interactive test buttons */}
      <div className="flex flex-col gap-3">
        <p className="font-body text-xs font-bold uppercase tracking-wider text-ink opacity-70">
          Interactive Click Test (registers click events with live counter):
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Button
            type="button"
            variant="primary"
            onClick={() => handleClick("Primary")}
          >
            Primary button
          </Button>

          <Button
            type="button"
            variant="alt"
            onClick={() => handleClick("Alt")}
          >
            Alt button
          </Button>

          <Button
            type="button"
            variant="underline"
            onClick={() => handleClick("Underline")}
          >
            Underline button
          </Button>

          {lastClicked && (
            <Tag tone="mint">
              ✓ Registered {lastClicked} click ({clickLog.length} recorded)
            </Tag>
          )}
        </div>

        {clickLog.length > 0 && (
          <div className="mt-1 flex flex-col gap-1 border-[2px] border-ink bg-cream p-3 font-mono text-xs text-ink max-w-md">
            <span className="font-bold text-xs uppercase tracking-wide">Event Log:</span>
            {clickLog.map((log, i) => (
              <span key={i} className="opacity-80">
                • {log}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Real navigation links */}
      <div className="flex flex-col gap-3 pt-2 border-t border-ink/20">
        <p className="font-body text-xs font-bold uppercase tracking-wider text-ink opacity-70">
          Live Route Navigation (links to real application pages):
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Button as="a" href="/questions/new" variant="primary">
            Submit a question →
          </Button>
          <Button as="a" href="/questions" variant="alt">
            View question pool →
          </Button>
          <Button as="a" href="/" variant="underline">
            ← Back to homepage
          </Button>
        </div>
      </div>
    </div>
  );
}
