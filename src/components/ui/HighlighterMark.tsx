import { HTMLAttributes } from "react";
import clsx from "clsx";

type Tone = "pink" | "yellow" | "mint" | "lavender" | "orange";

interface HighlighterMarkProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const tones: Record<Tone, string> = {
  pink: "bg-pink",
  yellow: "bg-yellow",
  mint: "bg-mint",
  lavender: "bg-lavender",
  orange: "bg-orange",
};

/**
 * HighlighterMark — Section 3.4. Inline solid-accent block behind one word,
 * its own hard shadow and a slight counter-rotation.
 *
 * Rule (Section 3.2/3.8): at most one word per heading gets this treatment.
 * Usage: <h1>Submit a <HighlighterMark>question</HighlighterMark></h1>
 */
export function HighlighterMark({
  tone = "yellow",
  className,
  children,
  ...rest
}: HighlighterMarkProps) {
  return (
    <mark
      className={clsx(
        "inline-block border-[3px] border-ink px-2 py-0.5 text-ink shadow-sm -rotate-2",
        tones[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </mark>
  );
}
