import Link from "next/link";
import type { Category, Store } from "@/lib/types";
import { AdSlot } from "@/components/ads/AdSlot";

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
      <div className="mx-auto max-w-7xl px-4 py-10">
        <AdSlot position="footer" className="mb-10" />

        <div className="grid gap-8 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-brand-gradient text-lg font-black text-white">
                W
              </span>
              <span className="text-[17px] font-extrabold tracking-tight">
                Worldwide<span className="text-brand-gradient">Coupons</span>
              </span>
            </Link>

            <p className="mt-3 max-w-xs text-sm text-body">
              Hand-checked coupon codes and deals from the brands you already
              shop with. No sign-up needed, no fake countdowns.
            </p>

            <div className="mt-4 flex gap-2">
              {[
                { label: "Facebook", href: "https://facebook.com" },
                { label: "X", href: "https://x.com" },
                { label: "Instagram", href: "https://instagram.com" },
              ].map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  aria-label={social.label}
                  className="flex size-9 items-center justify-center rounded-lg border border-[var(--border-subtle)] text-xs font-bold text-faint transition hover:border-brand-300 hover:text-brand-600"
                >
                  {social.label.charAt(0)}
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
