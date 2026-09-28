import { ArrowRight, CheckCircle2, Clock3, Flame } from "lucide-react";
import Link from "next/link";
import { StoreLogo } from "@/components/ui/primitives";
import { classNames, expiryLabel, formatCount, storeOf } from "@/lib/format";
import type { CouponView } from "@/lib/types";
import { RevealButton } from "./RevealButton";

/** Rank 1 and 2 earn a chip; the rest just carry their number. */
const RANK_CHIPS: Record<number, { label: string; className: string }> = {
  1: { label: "Best Deal", className: "bg-brand-600 text-white" },
  2: { label: "Most Used", className: "bg-violet-500 text-white" },
};

/**
 * "Trending right now" — a mint panel of six ranked cards. Each leads with
 * the store's own logo rather than a coupon image, so the row reads as a
 * scannable chart of who is being used most.
 */
export function TrendingNow({ coupons }: { coupons: CouponView[] }) {
  if (!coupons.length) return null;

  return (
    <section className="shell pt-14">
      <div className="rounded-3xl border border-brand-200/60 bg-gradient-to-br from-brand-50 via-brand-50 to-brand-100/70 p-5 sm:p-7 dark:border-brand-700/40 dark:from-brand-900/45 dark:via-brand-950/60 dark:to-brand-900/30">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-600 dark:bg-accent-600/15 dark:text-accent-400">
              <Flame aria-hidden className="size-4" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-body">Moving fast</p>
              <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
                Trending <span className="text-brand-600">right now</span>
              </h2>
              <p className="mt-1 text-sm text-body">
                Ranked by how many shoppers used them in the last day.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <p className="hidden -rotate-6 font-display text-lg font-bold italic leading-tight text-ink-700 sm:block dark:text-ink-200">
              Top offers
              <br />
              This week
            </p>
            <Link
              href="/coupons?sort=popular"
              className="group inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold transition-all hover:-translate-y-px hover:border-brand-300 hover:text-brand-600 hover:shadow-[var(--shadow-card)]"
            >
              See the chart
              <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {coupons.slice(0, 6).map((coupon, index) => (
            <TrendingCard key={coupon._id} coupon={coupon} rank={index + 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TrendingCard({ coupon, rank }: { coupon: CouponView; rank: number }) {
  const store = storeOf(coupon);
  const chip = RANK_CHIPS[rank];
  const expiry = expiryLabel(coupon);

  return (
    <article className="surface group relative flex gap-3 rounded-2xl border border-[var(--border-subtle)] p-4 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]">
      <span className="mt-4 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-extrabold text-white shadow-[var(--shadow-glow)]">
        {rank}
      </span>

      <span className="flex size-14 shrink-0 items-center justify-center self-start rounded-2xl border border-[var(--border-subtle)] bg-white p-1.5 shadow-[var(--shadow-card)]">
        <StoreLogo name={store?.name ?? "Store"} logo={store?.logo} size={44} rounded="rounded-xl" className="border-0" />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2 pr-24">
          <span className="truncate text-sm font-bold">{store?.name ?? "Featured"}</span>
          {chip ? (
            <span className={classNames("rounded-full px-2.5 py-0.5 text-[10px] font-extrabold", chip.className)}>
              {chip.label}
            </span>
          ) : null}
        </div>

        <Link
          href={`/coupon/${coupon.slug}`}
          className="line-clamp-2 text-[13px] font-bold leading-snug transition hover:text-brand-700 dark:hover:text-brand-300"
        >
          {coupon.title}
        </Link>

        {coupon.uses ? (
          <p className="flex items-center gap-1 text-[11px] font-semibold text-accent-600 dark:text-accent-400">
            <Flame aria-hidden className="size-3" />
            Used {formatCount(coupon.uses)} {coupon.uses === 1 ? "time" : "times"}
          </p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="flex items-center gap-2.5 whitespace-nowrap text-[11px] font-semibold text-faint">
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

          <RevealButton coupon={coupon} size="sm" pill label={coupon.hasCode ? "Copy code" : "Get deal"} />
        </div>
      </div>

      <span className="absolute right-3 top-2.5 rounded-lg bg-brand-100 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-brand-700 dark:bg-brand-950/70 dark:text-brand-300">
        {coupon.badge}
      </span>
    </article>
  );
}
