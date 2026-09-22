import Image from "next/image";
import Link from "next/link";
import { classNames } from "@/lib/format";

/** Natural size of the exported artwork, used to keep the aspect ratio exact. */
const LOGO = { width: 1100, height: 198 };

/**
 * The globe-and-tag mark on its own — headers that are too tight for the
 * wordmark, avatars, and the admin sidebar.
 */
export function LogoMark({
  size = 40,
  className,
  title = "WorldwideCoupons",
  priority,
}: {
  size?: number;
  className?: string;
  /** Empty string marks it decorative, for when a wordmark sits beside it. */
  title?: string;
  priority?: boolean;
}) {
  // The tag in the mark is near-black, so the dark theme gets the variant
  // with a light tag and a green glyph.
  return (
    <>
      <Image
        src="/brand/mark.png"
        alt={title}
        width={size}
        height={size}
        priority={priority}
        className={classNames("shrink-0 object-contain dark:hidden", className)}
        aria-hidden={title ? undefined : true}
      />
      <Image
        src="/brand/mark-dark.png"
        alt=""
        aria-hidden
        width={size}
        height={size}
        priority={priority}
        className={classNames("hidden shrink-0 object-contain dark:block", className)}
      />
    </>
  );
}

/**
 * The full lock-up.
 *
 * Two files rather than one: the wordmark is near-black, so the dark theme
 * gets a variant with it lifted to the light ink colour. Both are static, so
 * swapping them with `dark:` costs nothing at runtime.
 */
export function Logo({
  href = "/",
  height = 38,
  className,
  priority,
  showTagline = false,
}: {
  href?: string | null;
  height?: number;
  className?: string;
  priority?: boolean;
  showTagline?: boolean;
}) {
  const width = Math.round((height * LOGO.width) / LOGO.height);

  const content = (
    <span className={classNames("flex flex-col gap-1", className)}>
      <span className="relative block" style={{ width, height }}>
        <Image
          src="/brand/logo.png"
          alt="WorldwideCoupons"
          width={width}
          height={height}
          priority={priority}
          className="block h-full w-auto object-contain dark:hidden"
        />
        <Image
          src="/brand/logo-dark.png"
          alt=""
          aria-hidden
          width={width}
          height={height}
          priority={priority}
          className="hidden h-full w-auto object-contain dark:block"
        />
      </span>

      {showTagline ? (
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-faint">
          Better deals. Bigger savings. Worldwide.
        </span>
      ) : null}
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} aria-label="WorldwideCoupons home" className="shrink-0">
      {content}
    </Link>
  );
}
