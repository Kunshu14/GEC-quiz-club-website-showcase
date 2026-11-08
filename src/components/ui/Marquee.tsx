import { Fragment } from "react";
import clsx from "clsx";

interface MarqueeProps {
  items: string[];
  className?: string;
}

/**
 * Marquee/ticker strip — Section 3.4. Full-bleed ink bar, cream uppercase
 * text, items separated by a star. For system-wide announcements or the
 * notifications strip.
 *
 * The item list is duplicated once so the looping animation has no visible
 * seam; `aria-hidden` on the duplicate keeps screen readers from repeating it.
 */
export function Marquee({ items, className }: MarqueeProps) {
  const track = (hidden: boolean) => (
    <div
      className="flex shrink-0 items-center gap-8 pr-8"
      aria-hidden={hidden || undefined}
    >
      {items.map((item, i) => (
        <Fragment key={i}>
          <span className="whitespace-nowrap font-body text-sm font-bold uppercase tracking-wide text-cream">
            {item}
          </span>
          <span aria-hidden className="text-pink">
            ★
          </span>
        </Fragment>
      ))}
    </div>
  );

  return (
    <div
      className={clsx(
        "w-full overflow-hidden border-y-[3px] border-ink bg-ink py-3",
        className,
      )}
    >
      <div className="flex w-max animate-marquee">
        {track(false)}
        {track(true)}
      </div>
    </div>
  );
}
