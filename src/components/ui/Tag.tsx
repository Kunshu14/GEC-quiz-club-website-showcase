import { HTMLAttributes } from "react";
import clsx from "clsx";

export type Tone = "ink" | "pink" | "yellow" | "mint" | "lavender" | "orange";
export type TagVariant = "filled" | "text-stroke" | "outline-black" | "outline-color";

interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  variant?: TagVariant;
}

const filledTones: Record<Tone, string> = {
  ink: "bg-ink text-cream border-ink",
  pink: "bg-pink text-ink border-ink",
  yellow: "bg-yellow text-ink border-ink",
  mint: "bg-mint text-ink border-ink",
  lavender: "bg-lavender text-ink border-ink",
  orange: "bg-orange text-ink border-ink",
};

const textStrokeTones: Record<Tone, string> = {
  ink: "border-ink text-ink bg-cream",
  pink: "border-pink text-pink bg-cream [text-shadow:-1px_-1px_0_var(--ink),1px_-1px_0_var(--ink),-1px_1px_0_var(--ink),1px_1px_0_var(--ink)]",
  yellow: "border-yellow text-yellow bg-cream [text-shadow:-1px_-1px_0_var(--ink),1px_-1px_0_var(--ink),-1px_1px_0_var(--ink),1px_1px_0_var(--ink)]",
  mint: "border-mint text-mint bg-cream [text-shadow:-1px_-1px_0_var(--ink),1px_-1px_0_var(--ink),-1px_1px_0_var(--ink),1px_1px_0_var(--ink)]",
  lavender: "border-lavender text-lavender bg-cream [text-shadow:-1px_-1px_0_var(--ink),1px_-1px_0_var(--ink),-1px_1px_0_var(--ink),1px_1px_0_var(--ink)]",
  orange: "border-orange text-orange bg-cream [text-shadow:-1px_-1px_0_var(--ink),1px_-1px_0_var(--ink),-1px_1px_0_var(--ink),1px_1px_0_var(--ink)]",
};

const outlineBlackTones: Record<Tone, string> = {
  ink: "border-ink text-ink bg-cream",
  pink: "border-pink text-ink bg-cream",
  yellow: "border-yellow text-ink bg-cream",
  mint: "border-mint text-ink bg-cream",
  lavender: "border-lavender text-ink bg-cream",
  orange: "border-orange text-ink bg-cream",
};

const outlineColorTones: Record<Tone, string> = {
  ink: "border-ink text-ink bg-cream",
  pink: "border-pink text-pink bg-cream",
  yellow: "border-yellow text-yellow bg-cream",
  mint: "border-mint text-mint bg-cream",
  lavender: "border-lavender text-lavender bg-cream",
  orange: "border-orange text-orange bg-cream",
};

/**
 * Tag/pill — Section 3.4. Bold uppercase micro-badge with selectable variants:
 * - 'filled' (active production): solid tone background, 2px ink border, ink text.
 * - 'text-stroke': colored box with black text stroke/shadow outline.
 * - 'outline-black': colored box with plain black text.
 * - 'outline-color': original Phase 0 colored outline and colored text.
 */
export function Tag({
  tone = "ink",
  variant = "filled",
  className,
  children,
  ...rest
}: TagProps) {
  const variantMap: Record<TagVariant, string> = {
    filled: filledTones[tone],
    "text-stroke": textStrokeTones[tone],
    "outline-black": outlineBlackTones[tone],
    "outline-color": outlineColorTones[tone],
  };

  const borderClass = variant === "filled" ? "border-2" : "border-[3px]";

  return (
    <span
      className={clsx(
        "inline-flex items-center px-2.5 py-0.5 font-body text-xs font-bold uppercase tracking-wider select-none",
        borderClass,
        variantMap[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
