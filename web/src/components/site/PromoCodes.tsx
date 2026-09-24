"use client";

import { ArrowRight, CheckCircle2, Clock3, Percent, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CategoryIcon } from "@/components/ui/icons";
import { StoreLogo } from "@/components/ui/primitives";
import { classNames, expiryLabel, storeOf } from "@/lib/format";
import type { Category, CouponView } from "@/lib/types";
import { RevealButton } from "./RevealButton";

/** A pastel per card, cycling — the product image sits on it. */
const PASTELS = [
  "from-orange-100 via-orange-50 to-white dark:border-orange-400/25 dark:from-orange-500/25 dark:via-orange-500/10 dark:to-[var(--surface)]",
  "from-pink-100 via-rose-50 to-white dark:border-pink-400/25 dark:from-pink-500/25 dark:via-pink-500/10 dark:to-[var(--surface)]",
  "from-emerald-100 via-emerald-50 to-white dark:border-emerald-400/25 dark:from-emerald-500/25 dark:via-emerald-500/10 dark:to-[var(--surface)]",
  "from-sky-100 via-sky-50 to-white dark:border-sky-400/25 dark:from-sky-500/25 dark:via-sky-500/10 dark:to-[var(--surface)]",
  "from-rose-100 via-orange-50 to-white dark:border-rose-400/25 dark:from-rose-500/25 dark:via-rose-500/10 dark:to-[var(--surface)]",
  "from-violet-100 via-violet-50 to-white dark:border-violet-400/25 dark:from-violet-500/25 dark:via-violet-500/10 dark:to-[var(--surface)]",
];

function categoriesOf(coupon: CouponView): Pick<Category, "_id" | "name">[] {
  return (coupon.categories ?? []).filter(
    (entry): entry is Category => typeof entry === "object" && entry !== null
  );
}

/**
 * "Fresh promo codes" — pastel cards, each with its product image sitting
 * on the card rather than in a box. The pills above are built from the
 * categories of whatever the editor picked.
 */
export function PromoCodes({ coupons }: { coupons: CouponView[] }) {
  const [active, setActive] = useState("all");

  const pills = useMemo(() => {
    const counts = new Map<string, number>();
    for (const coupon of coupons) {
      for (const category of categoriesOf(coupon)) {
        counts.set(category.name, (counts.get(category.name) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name]) => name);
  }, [coupons]);

  if (!coupons.length) return null;

  const visible =
    active === "all"
      ? coupons
      : coupons.filter((coupon) => categoriesOf(coupon).some((category) => category.name === active));

  return (
    <section className="shell pt-14">
      <div className="rounded-3xl border border-brand-200/60 bg-gradient-to-br from-brand-50 via-brand-50 to-brand-100/70 p-5 sm:p-7 dark:border-brand-700/40 dark:from-brand-900/45 dark:via-brand-950/60 dark:to-brand-900/30">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white">
              <Percent aria-hidden className="size-3.5" />
              Promo codes
            </span>
            <h2 className="mt-2 flex items-center gap-2 font-display text-2xl font-extrabold sm:text-3xl">
              Fresh <span className="text-brand-600">promo codes</span>
              <Sparkles aria-hidden className="size-5 text-brand-500" />
            </h2>
            <p className="mt-1 text-sm text-body">Every one of these hands you a code at checkout.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {pills.length ? (
              <div className="flex flex-wrap items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] p-1 shadow-[var(--shadow-card)]">
                {["all", ...pills].map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setActive(name)}
                    className={classNames(
                      "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition",
                      active === name
                        ? "bg-brand-600 text-white shadow-[var(--shadow-glow)]"
                        : "text-body hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/60"
                    )}
                  >
                    {name === "all" ? null : <CategoryIcon name={name} className="size-3.5" />}
                    {name === "all" ? "All" : name}
                  </button>
                ))}
              </div>
            ) : null}

            <Link
              href="/coupons?withCode=true"
              className="group inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold transition-all hover:-translate-y-px hover:border-brand-300 hover:text-brand-600 hover:shadow-[var(--shadow-card)]"
            >
              View all codes
              <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.slice(0, 6).map((coupon, index) => (
            <PromoCard key={coupon._id} coupon={coupon} tint={PASTELS[index % PASTELS.length]!} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** Melts the picture's own background into the card — see the
 *  `--feather-promo` variable in globals.css for the light/dark pair. */
const FEATHER = "var(--feather-promo)";

function PromoCard({ coupon, tint }: { coupon: CouponView; tint: string }) {
  const store = storeOf(coupon);
  const expiry = expiryLabel(coupon);

  return (
    <article
      className={classNames(
        "group relative flex min-h-[200px] flex-col overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-br p-4 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] dark:border-[var(--border-subtle)]",
        tint
      )}
    >
      {/* Product image: on the card, shown whole, bottom-right — sized by the
          card's height so a wide card keeps a wide-enough picture. */}
      <div className="pointer-events-none absolute bottom-0 right-1 h-[88%] w-[42%]">
        {coupon.image?.url ? (
          // Editor-uploaded creative — a plain img, like every other brand asset.
          // Mask and blend sit on the img itself (a masked parent would
          // isolate the blend): `multiply` drops a white background into the
          // card's pastel, the feather softens whatever box is left.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coupon.image.url}
            alt={coupon.image.alt ?? coupon.title}
            className="h-full w-full object-contain object-bottom mix-blend-multiply transition-transform duration-300 group-hover:scale-105 dark:mix-blend-normal"
            style={{
              maskImage: FEATHER,
              WebkitMaskImage: FEATHER,
              maskComposite: "intersect",
              WebkitMaskComposite: "source-in",
            }}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full w-full items-end justify-end pb-3 pr-2 opacity-90">
            <StoreLogo name={store?.name ?? coupon.title} logo={store?.logo} size={64} rounded="rounded-2xl" />
          </div>
        )}
      </div>

      <div className="relative z-10 flex items-start gap-2.5">
        <StoreLogo name={store?.name ?? coupon.title} logo={store?.logo} size={40} rounded="rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold leading-tight">{store?.name ?? "Featured"}</p>
          <span className="mt-1 inline-block rounded-md bg-white/70 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-brand-700 ring-1 ring-inset ring-brand-300/60 dark:bg-transparent dark:text-brand-300">
            {coupon.hasCode ? "Promo code" : "Deal"}
          </span>
        </div>
        <span className="shrink-0 rounded-lg bg-brand-600 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-[var(--shadow-glow)]">
          {coupon.badge}
        </span>
      </div>

      <Link
        href={`/coupon/${coupon.slug}`}
        className="relative z-10 mt-3 line-clamp-2 block w-[56%] break-words text-[13px] font-bold leading-snug transition hover:text-brand-700 dark:hover:text-brand-300"
      >
        {coupon.title}
      </Link>

      <div className="relative z-10 mt-auto flex flex-col gap-2 pt-3">
        <span className="flex items-center gap-3 whitespace-nowrap text-[11px] font-semibold text-faint">
          {coupon.verified ? (
            <span className="flex items-center gap-1 text-success-600 dark:text-success-500">
              <CheckCircle2 aria-hidden className="size-3.5" />
              Verified
            </span>
          ) : null}
          <span className="flex items-center gap-1">
            <Clock3 aria-hidden className="size-3.5" />
            {expiry ?? "No expiry"}
          </span>
        </span>

        <div className="w-fit">
          <RevealButton coupon={coupon} size="md" pill label={coupon.hasCode ? "Get code" : "Get deal"} />
        </div>
      </div>
    </article>
  );
}
