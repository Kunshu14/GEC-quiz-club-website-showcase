import { HTMLAttributes } from "react";
import clsx from "clsx";

type Tone = "pink" | "yellow" | "mint" | "lavender" | "orange";

interface StickerBadgeProps extends HTMLAttributes<HTMLSpanElement> {
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
 * StickerBadge — Section 3.4. Small circular bordered callout, meant to be
 * layered on a panel/card corner via absolute positioning from the parent,
 * e.g. a "flagged" or "new" badge.
 *
 * Usage: wrap the panel in a `relative` container, then
 * `<StickerBadge className="absolute -top-3 -right-3">New</StickerBadge>`
 */
export function StickerBadge({
  tone = "pink",
  className,
  children,
  ...rest
}: StickerBadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex h-14 w-14 rotate-6 items-center justify-center rounded-full border-[3px] border-ink text-center font-body text-[10px] font-bold uppercase leading-tight text-ink shadow-sm",
        tones[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
