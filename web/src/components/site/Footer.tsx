import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Logo } from "./Logo";
import type { Category, Store } from "@/lib/types";
import { AdSlot } from "@/components/ads/AdSlot";

/** Brand marks, drawn inline so the footer costs no extra requests. */
const SOCIALS = [
  {
    label: "Facebook",
    href: "https://facebook.com",
    path: "M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h3l1-3h-4v-2c0-.6.4-1 1-1Z",
  },
  {
    label: "X",
    href: "https://x.com",
    path: "M17.5 3h3l-6.6 7.5L21.8 21h-6l-4.7-6.1L5.7 21h-3l7-8L2.5 3h6.2l4.2 5.6L17.5 3Zm-1 16h1.6L7.6 4.7H5.9L16.5 19Z",
  },
  {
    label: "Instagram",
    href: "https://instagram.com",
    path: "M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.3 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c0 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2 0-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2-.1-1.3-.1-1.7-.1-4.9s0-3.6.1-4.9c0-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4 1.3-.1 1.7-.1 4.9-.1Zm0 3.3a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm0 10.7a4.2 4.2 0 1 1 0-8.4 4.2 4.2 0 0 1 0 8.4Zm6.8-10.9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z",
  },
];

const COLUMNS = [
  {
    title: "Shop",
    links: [
      { href: "/coupons", label: "All offers" },
      { href: "/coupons?withCode=true", label: "Promo codes" },
      { href: "/coupons?withCode=false", label: "Deals" },
      { href: "/coupons?type=freeshipping", label: "Free shipping" },
      { href: "/coupons?expiringSoon=true", label: "Ending soon" },
    ],
  },
  {
    title: "Browse",
    links: [
      { href: "/stores", label: "All stores A–Z" },
      { href: "/categories", label: "Categories" },
      { href: "/coupons?sort=newest", label: "Newest offers" },
      { href: "/coupons?exclusive=true", label: "Exclusives" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/contact", label: "Contact us" },
      { href: "/contact?topic=submit-coupon", label: "Submit a coupon" },
      { href: "/contact?topic=broken-coupon", label: "Report a code" },
      { href: "/contact?topic=advertise", label: "Advertise with us" },
    ],
  },
];

export function Footer({
  categories,
  stores,
}: {
  categories: Category[];
  stores: Store[];
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-16 overflow-hidden border-t-2 border-brand-500/60 bg-gradient-to-b from-brand-900 via-brand-950 to-[#04140c] text-white">
      <span
        aria-hidden
        className="pointer-events-none absolute -left-24 top-24 size-96 rounded-full bg-brand-500/25 blur-3xl"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-20 bottom-10 size-96 rounded-full bg-accent-400/15 blur-3xl"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle,rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:linear-gradient(180deg,#000,transparent_70%)]"
      />

      <div className="shell relative pb-8 pt-12">
        <AdSlot position="footer" className="mb-10" />

        <div className="grid gap-10 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <Logo height={42} showTagline onDark />

            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
              Hand-checked coupon codes and deals from the brands you already
              shop with. No sign-up needed, no fake countdowns.
            </p>

            <div className="mt-5 flex gap-2">
              {SOCIALS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  aria-label={social.label}
                  className="flex size-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/70 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-500 hover:text-white"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
                    <path d={social.path} />
                  </svg>
                </a>
              ))}
            </div>

            <Link
              href="/coupons"
              className="group mt-6 inline-flex items-center gap-2 rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-glow)] transition-all hover:-translate-y-0.5 hover:brightness-110"
            >
              Browse every offer
              <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.14em] text-brand-200">
                <span className="h-px w-5 bg-brand-400" />
                {column.title}
              </h3>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center gap-1.5 text-sm text-white/70 transition-all hover:translate-x-0.5 hover:text-white"
                    >
                      <span className="size-1 rounded-full bg-brand-400/0 transition-all group-hover:bg-brand-300" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {categories.length ? (
          <div className="mt-12 border-t border-white/10 pt-6">
            <h3 className="mb-3 text-sm font-extrabold uppercase tracking-[0.14em] text-brand-200">Popular categories</h3>
            <div className="flex flex-wrap gap-2">
              {categories.slice(0, 18).map((category) => (
                <Link
                  key={category._id}
                  href={`/category/${category.slug}`}
                  className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-white/75 transition-all hover:-translate-y-0.5 hover:border-brand-300/60 hover:bg-brand-500/25 hover:text-white"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {stores.length ? (
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-extrabold uppercase tracking-[0.14em] text-brand-200">Popular stores</h3>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {stores.slice(0, 24).map((store) => (
                <Link
                  key={store._id}
                  href={`/store/${store.slug}`}
                  className="text-sm text-white/65 transition hover:text-white hover:underline hover:decoration-brand-300 hover:underline-offset-4"
                >
                  {store.name}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} WorldwideCoupons. All rights reserved.</p>

          <p className="max-w-xl sm:text-right">
            {/* Required disclosure — the outbound links on this site are paid. */}
            We may earn a commission when you use one of our links. It never
            changes what you pay, and it never changes which offers we list.
          </p>
        </div>
      </div>
    </footer>
  );
}
