import { ReactNode } from "react";
import clsx from "clsx";

interface ComparisonColumn {
  heading: string;
  items: ReactNode[];
}

interface ComparisonBlockProps {
  left: ComparisonColumn;
  right: ComparisonColumn;
  className?: string;
}

/**
 * Comparison/checklist block — Section 3.4. Two bordered columns, plain
 * list, no internal grid lines. Reuse anywhere showing "before/after" or
 * "what changed" — e.g. the duplicate-question review screen (Section 7.2).
 */
export function ComparisonBlock({ left, right, className }: ComparisonBlockProps) {
  const column = (col: ComparisonColumn) => (
    <div className="flex-1 border-[3px] border-ink bg-cream p-5 shadow-md">
      <h4 className="mb-3 font-display text-lg text-ink">{col.heading}</h4>
      <ul className="flex flex-col gap-2">
        {col.items.map((item, i) => (
          <li key={i} className="font-body text-sm text-ink">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className={clsx("flex flex-col gap-6 md:flex-row", className)}>
      {column(left)}
      {column(right)}
    </div>
  );
}
