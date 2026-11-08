import { HTMLAttributes } from "react";
import clsx from "clsx";

type Tone = "cream" | "pink" | "yellow" | "mint" | "lavender" | "orange" | "purple";

interface FramedPanelProps extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  /** Set false to render perfectly level — most illustrative uses want the tilt. */
  tilt?: boolean;
}

const tones: Record<Tone, string> = {
  cream: "bg-cream",
  pink: "bg-pink",
  yellow: "bg-yellow",
  mint: "bg-mint",
  lavender: "bg-lavender",
  orange: "bg-orange",
  purple: "bg-purple text-cream",
};

/**
 * FramedPanel — Section 3.4. Bordered box, hard shadow, slight rotation.
 * Used to hold the crest/logo or any illustrative graphic (empty states,
 * hero, onboarding).
 */
export function FramedPanel({
  tone = "cream",
  tilt = true,
  className,
  children,
  ...rest
}: FramedPanelProps) {
  return (
    <div
      className={clsx(
        "inline-block border-[3px] border-ink p-6 shadow-lg",
        tilt && "-rotate-3",
        tones[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
