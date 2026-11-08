import { HTMLAttributes } from "react";
import clsx from "clsx";

type Tone = "cream" | "pink" | "yellow" | "mint" | "lavender" | "orange" | "purple";
type ShadowSize = "sm" | "md" | "lg";

interface CardShellProps extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  shadow?: ShadowSize;
}

const tones: Record<Tone, string> = {
  cream: "bg-cream text-ink",
  pink: "bg-pink text-ink",
  yellow: "bg-yellow text-ink",
  mint: "bg-mint text-ink",
  lavender: "bg-lavender text-ink",
  orange: "bg-orange text-ink",
  purple: "bg-purple text-cream",
};

const shadows: Record<ShadowSize, string> = {
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
};

/**
 * CardShell — Section 3.4. The one shared bordered-box-with-shadow
 * component reused for question cards, quiz cards, leaderboard rows, stat
 * tiles, alumni entries, etc. Only `tone` and the children should differ
 * per context — don't invent a second card style, extend this one.
 */
export function CardShell({
  tone = "cream",
  shadow = "md",
  className,
  children,
  ...rest
}: CardShellProps) {
  return (
    <div
      className={clsx(
        "border-[3px] border-ink p-5",
        tones[tone],
        shadows[shadow],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
