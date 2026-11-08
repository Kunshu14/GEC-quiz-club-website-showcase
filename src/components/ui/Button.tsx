import { ButtonHTMLAttributes, AnchorHTMLAttributes, ElementType } from "react";
import Link from "next/link";
import clsx from "clsx";

type Variant = "primary" | "alt" | "underline";

const base =
  "relative inline-flex items-center justify-center gap-2 font-body font-bold uppercase text-sm tracking-wide cursor-pointer select-none touch-manipulation disabled:cursor-not-allowed disabled:opacity-50 transition-[transform,box-shadow] duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2";

// Each variant fully owns its own box-model/color/shadow classes so nothing
// needs to "override" a base class — see Section 3.4/3.8 (hard offset
// shadow on every button except underline).
// When pressed, active:translate moves the button 4px down/right; active:before
// invisibly covers the vacated 6px top/left area so pointerup always registers as a click.
const variants: Record<Variant, string> = {
  primary:
    "bg-ink text-cream border-[3px] border-ink shadow-md px-6 py-3 active:translate-x-[4px] active:translate-y-[4px] active:shadow-none active:before:absolute active:before:-top-[6px] active:before:-left-[6px] active:before:right-0 active:before:bottom-0 active:before:content-['']",
  alt: "bg-cream text-ink border-[3px] border-ink shadow-md px-6 py-3 active:translate-x-[4px] active:translate-y-[4px] active:shadow-none active:before:absolute active:before:-top-[6px] active:before:-left-[6px] active:before:right-0 active:before:bottom-0 active:before:content-['']",
  underline:
    "bg-transparent text-ink underline underline-offset-4 decoration-2 px-1 py-1",
};

interface CommonProps {
  variant?: Variant;
  className?: string;
}

type ButtonProps = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { as?: "button" };

type AnchorProps = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { as: "a" };

type Props = ButtonProps | AnchorProps;

/**
 * Button — primary / alt / underline (Section 3.4).
 * Pass `as="a"` to render an anchor styled the same way.
 * Internal URLs automatically use Next.js <Link> for fast SPA navigation
 * with prefetching, avoiding full hard page reloads.
 */
export function Button({ variant = "primary", className, as, ...rest }: Props) {
  const classes = clsx(base, variants[variant], className);
  const Tag = (as ?? "button") as ElementType;

  if (Tag === "button") {
    return (
      <button className={classes} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)} />
    );
  }

  if (as === "a" && "href" in rest && typeof rest.href === "string") {
    const isInternal =
      rest.href.startsWith("/") ||
      rest.href.startsWith("#") ||
      rest.href.startsWith("?");
    if (isInternal) {
      return (
        <Link
          className={classes}
          href={rest.href}
          prefetch={true}
          {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}
        />
      );
    }
  }

  return <Tag className={classes} {...rest} />;
}
