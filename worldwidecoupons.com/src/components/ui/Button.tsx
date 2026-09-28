import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { classNames } from "@/lib/format";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "success";
type Size = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap transition-all duration-200 " +
  "disabled:opacity-50 disabled:pointer-events-none select-none";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand-gradient text-white shadow-[var(--shadow-glow)] hover:brightness-110 hover:-translate-y-px active:translate-y-0",
  secondary:
    "surface border border-[var(--border-subtle)] text-[var(--text-primary)] shadow-[var(--shadow-card)] hover:border-brand-300 hover:text-brand-700",
  ghost: "text-[var(--text-secondary)] hover:surface-sunken hover:text-[var(--text-primary)]",
  outline:
    "border-2 border-brand-600 text-brand-600 hover:bg-brand-600 hover:text-white",
  danger: "bg-danger-600 text-white hover:bg-danger-500",
  success: "bg-success-600 text-white hover:bg-success-500",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px] rounded-lg",
  md: "h-11 px-5 text-sm rounded-xl",
  lg: "h-13 px-7 text-base rounded-xl",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  loading?: boolean;
  children?: ReactNode;
  className?: string;
}

const styles = ({ variant = "primary", size = "md", full, className }: CommonProps) =>
  classNames(BASE, VARIANTS[variant], SIZES[size], full && "w-full", className);

function Spinner() {
  return (
    <span
      aria-hidden
      className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

export function Button({
  variant,
  size,
  full,
  loading,
  children,
  className,
  disabled,
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={styles({ variant, size, full, className })}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

/** Same look as `Button`, but renders a real link so it is crawlable. */
export function ButtonLink({
  href,
  variant,
  size,
  full,
  children,
  className,
  external,
  ...rest
}: CommonProps & { href: string; external?: boolean } & Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    "href"
  >) {
  const classes = styles({ variant, size, full, className });

  if (external) {
    return (
      <a
        {...rest}
        href={href}
        target="_blank"
        // Outbound offer links are monetised, so they are sponsored, and
        // `noopener` stops the merchant page reaching back into ours.
        rel="nofollow sponsored noopener noreferrer"
        className={classes}
      >
        {children}
      </a>
    );
  }

  return (
    <Link {...rest} href={href} className={classes}>
      {children}
    </Link>
  );
}
