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
    <footer className="mt-16 border-t border-[var(--border-subtle)] bg-[var(--surface)]">
      <div className="shell py-10">
        <AdSlot position="footer" className="mb-10" />

        <div className="grid gap-8 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo height={40} showTagline />

            <p className="mt-3 max-w-xs text-sm text-body">
              Hand-checked coupon codes and deals from the brands you already
              shop with. No sign-up needed, no fake countdowns.
            </p>

            <div className="mt-4 flex gap-2">
              {SOCIALS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  aria-label={social.label}
                  className="flex size-9 items-center justify-center rounded-xl border border-[var(--border-subtle)] text-[var(--text-muted)] transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-950/50"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
                    <path d={social.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="mb-3 text-sm font-bold">{column.title}</h3>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-body transition hover:text-brand-600">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {categories.length ? (
          <div className="mt-10 border-t border-[var(--border-subtle)] pt-6">
            <h3 className="mb-3 text-sm font-bold">Popular categories</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {categories.slice(0, 18).map((category) => (
                <Link
                  key={category._id}
                  href={`/category/${category.slug}`}
                  className="text-sm text-body transition hover:text-brand-600"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {stores.length ? (
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-bold">Popular stores</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {stores.slice(0, 24).map((store) => (
                <Link
                  key={store._id}
                  href={`/store/${store.slug}`}
                  className="text-sm text-body transition hover:text-brand-600"
                >
                  {store.name}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-6 text-xs text-faint sm:flex-row sm:items-center sm:justify-between">
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
