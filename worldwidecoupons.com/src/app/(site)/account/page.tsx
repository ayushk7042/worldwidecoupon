"use client";

import {
  ArrowRight,
  Bell,
  BellRing,
  Compass,
  Heart,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  Sparkles,
  Store as StoreIcon,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useShopper } from "@/components/site/ShopperProvider";
import { StoreOfferRow } from "@/components/site/StoreOfferRow";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Checkbox, Input } from "@/components/ui/form";
import { CouponCardSkeleton, EmptyState, StoreLogo } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { apiBase } from "@/lib/api";
import { account } from "@/lib/endpoints";
import { classNames, formatCount, splitBadge, storeOf } from "@/lib/format";
import { readToken } from "@/lib/session";
import type { CouponView, Store } from "@/lib/types";

type Tab = "overview" | "saved" | "stores" | "feed" | "settings";

const NAV: { id: Tab; label: string; Icon: typeof Heart }[] = [
  { id: "overview", label: "Overview", Icon: LayoutDashboard },
  { id: "saved", label: "Saved offers", Icon: Heart },
  { id: "stores", label: "Stores you follow", Icon: StoreIcon },
  { id: "feed", label: "Your feed", Icon: BellRing },
  { id: "settings", label: "Settings", Icon: Settings },
];

const greeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
};

export default function AccountPage() {
  const { shopper, loading, logout, refresh, savedIds, favouriteIds, toggleFavourite } = useShopper();
  const router = useRouter();
  const toast = useToast();

  const [tab, setTab] = useState<Tab>("overview");
  const [feed, setFeed] = useState<CouponView[] | null>(null);
  const [saved, setSaved] = useState<CouponView[] | null>(null);
  const [stores, setStores] = useState<Store[] | null>(null);
  const [suggested, setSuggested] = useState<Store[]>([]);

  useEffect(() => {
    if (!loading && !shopper) router.replace("/account/login?next=/account");
  }, [loading, shopper, router]);

  /* Which tab is open survives a refresh, and can be linked to (#saved). */
  useEffect(() => {
    const hash = window.location.hash.replace("#", "") as Tab;
    if (NAV.some((item) => item.id === hash)) setTab(hash);
  }, []);

  const open = (next: Tab) => {
    setTab(next);
    window.history.replaceState(null, "", `#${next}`);
  };

  const load = useCallback(async () => {
    if (!shopper) return;
    const token = readToken("shopper");

    const [feedResult, savedResult, storesResult] = await Promise.allSettled([
      account.feed(token),
      account.saved(token),
      account.favourites(token),
    ]);

    if (feedResult.status === "fulfilled") setFeed(feedResult.value);
    if (savedResult.status === "fulfilled") setSaved(savedResult.value);
    if (storesResult.status === "fulfilled") setStores(storesResult.value);
  }, [shopper]);

  useEffect(() => {
    void load();
  }, [load]);

  /* Stores worth following — the busiest ones, minus those already followed. */
  useEffect(() => {
    void fetch(`${apiBase()}/stores?limit=12&sort=offers&withOffers=true`)
      .then((response) => response.json())
      .then((body: { data?: Store[] }) => setSuggested(body.data ?? []))
      .catch(() => undefined);
  }, []);

  /* The lists follow the live heart / follow state, so un-saving a card
     removes it at once instead of leaving a ghost behind. */
  const liveSaved = useMemo(() => (saved ?? []).filter((item) => savedIds.has(item._id)), [saved, savedIds]);
  const liveStores = useMemo(() => (stores ?? []).filter((item) => favouriteIds.has(item._id)), [stores, favouriteIds]);
  const toFollow = useMemo(
    () => suggested.filter((item) => !favouriteIds.has(item._id)).slice(0, 4),
    [suggested, favouriteIds]
  );

  if (loading || !shopper) {
    return (
      <div className="shell space-y-3 py-10">
        <div className="skeleton h-40 rounded-3xl" />
        <CouponCardSkeleton />
        <CouponCardSkeleton />
      </div>
    );
  }

  const first = shopper.name.split(" ")[0];
  const counts: Record<Tab, number | null> = {
    overview: null,
    saved: liveSaved.length,
    stores: liveStores.length,
    feed: feed?.length ?? 0,
    settings: null,
  };

  const stats = [
    { id: "saved" as const, label: "Saved offers", value: liveSaved.length, Icon: Heart, tint: "#ec4899" },
    { id: "stores" as const, label: "Stores followed", value: liveStores.length, Icon: StoreIcon, tint: "#2f7dd8" },
    { id: "feed" as const, label: "New for you", value: feed?.length ?? 0, Icon: BellRing, tint: "#e8a010" },
  ];

  return (
    <div className="pb-6">
      {/* ================= hero ================= */}
      <section className="shell pt-6">
        <div className="relative overflow-hidden rounded-3xl border border-brand-200/60 bg-gradient-to-r from-brand-50 via-brand-50 to-brand-100/70 p-5 sm:p-7 dark:border-brand-700/40 dark:from-brand-900/45 dark:via-brand-950/60 dark:to-brand-900/30">
          <span aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-brand-300/40 blur-3xl dark:bg-brand-600/20" />
          <span aria-hidden className="pointer-events-none absolute -bottom-24 left-1/3 size-72 rounded-full bg-accent-300/30 blur-3xl dark:bg-accent-600/10" />

          <div className="relative flex flex-wrap items-center gap-5">
            <span className="relative flex size-20 shrink-0 items-center justify-center rounded-3xl bg-brand-gradient font-display text-3xl font-extrabold text-white shadow-[var(--shadow-glow)]">
              {shopper.name.charAt(0).toUpperCase()}
              <span className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border-2 border-white bg-warn-500 text-white dark:border-[var(--surface)]">
                <Sparkles aria-hidden className="size-3.5" />
              </span>
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-body">{greeting()},</p>
              <h1 className="font-display text-3xl font-extrabold leading-tight">
                {first} <span className="text-brand-600">👋</span>
              </h1>
              <p className="mt-0.5 truncate text-sm text-faint">{shopper.email}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <ButtonLink href="/coupons" size="lg" className="!rounded-full">
                <Compass aria-hidden className="size-4" />
                Find offers
              </ButtonLink>
              <Button
                variant="secondary"
                size="lg"
                className="!rounded-full"
                onClick={async () => {
                  await logout();
                  router.push("/");
                }}
              >
                <LogOut aria-hidden className="size-4" />
                Sign out
              </Button>
            </div>
          </div>

          <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
            {stats.map((stat) => (
              <button
                key={stat.id}
                type="button"
                onClick={() => open(stat.id)}
                className="group flex items-center gap-3.5 rounded-2xl border border-white/70 bg-white/75 p-3.5 text-left shadow-[var(--shadow-card)] backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] dark:border-white/10 dark:bg-white/5"
              >
                <span
                  className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_10px_20px_-8px_var(--tint)]"
                  style={{ backgroundColor: stat.tint, ["--tint" as string]: stat.tint }}
                >
                  <stat.Icon aria-hidden className="size-6" />
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-3xl font-extrabold leading-none" style={{ color: stat.tint }}>
                    {formatCount(stat.value)}
                  </span>
                  <span className="mt-1 block text-xs font-semibold text-body">{stat.label}</span>
                </span>
                <ArrowRight aria-hidden className="ml-auto size-4 text-faint transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ================= body ================= */}
      <div className="shell mt-5 grid gap-5 lg:grid-cols-[15.5rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <nav className="surface flex gap-1 overflow-x-auto rounded-2xl border border-[var(--border-subtle)] p-2 shadow-[var(--shadow-card)] no-scrollbar lg:flex-col lg:overflow-visible">
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => open(item.id)}
                aria-current={tab === item.id}
                className={classNames(
                  "flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-bold transition",
                  tab === item.id
                    ? "bg-brand-600 text-white shadow-[var(--shadow-glow)]"
                    : "text-body hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/50"
                )}
              >
                <item.Icon aria-hidden className="size-[18px]" />
                {item.label}
                {counts[item.id] ? (
                  <span
                    className={classNames(
                      "ml-auto rounded-full px-2 py-0.5 text-[10px] font-extrabold",
                      tab === item.id ? "bg-white/25" : "bg-[var(--surface-sunken)] text-faint"
                    )}
                  >
                    {counts[item.id]}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>

          <div className="mt-4 hidden rounded-2xl border border-brand-200/60 bg-gradient-to-br from-brand-50 to-brand-100/70 p-4 dark:border-brand-700/40 dark:from-brand-900/45 dark:to-brand-900/30 lg:block">
            <p className="flex items-center gap-2 text-sm font-extrabold">
              <Sparkles aria-hidden className="size-4 text-brand-600" />
              Tip
            </p>
            <p className="mt-1 text-xs leading-relaxed text-body">
              Tap the heart on any offer to keep it here, and follow a store to get its newest codes in your feed first.
            </p>
          </div>
        </aside>

        <div className="min-w-0">
          {tab === "overview" ? (
            <div className="space-y-5">
              <Panel
                title="New from the stores you follow"
                Icon={BellRing}
                action={feed?.length ? { label: "See all", onClick: () => open("feed") } : undefined}
              >
                {feed === null ? (
                  <CouponCardSkeleton />
                ) : feed.length ? (
                  <div className="space-y-3">
                    {feed.slice(0, 3).map((coupon) => (
                      <StoreOfferRow key={coupon._id} coupon={coupon} showStore />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl bg-[var(--surface-sunken)] px-4 py-5 text-sm text-body">
                    Nothing new yet. Follow a few stores below and their new offers will land here first.
                  </p>
                )}
              </Panel>

              {toFollow.length ? (
                <Panel title="Stores worth following" Icon={StoreIcon} action={{ label: "All stores", href: "/stores" }}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {toFollow.map((store) => (
                      <StoreTile key={store._id} store={store} following={false} onToggle={toggleFavourite} />
                    ))}
                  </div>
                </Panel>
              ) : null}

              {liveSaved.length ? (
                <Panel title="Recently saved" Icon={Heart} action={{ label: "See all", onClick: () => open("saved") }}>
                  <div className="space-y-3">
                    {liveSaved.slice(0, 2).map((coupon) => (
                      <StoreOfferRow key={coupon._id} coupon={coupon} showStore />
                    ))}
                  </div>
                </Panel>
              ) : null}
            </div>
          ) : null}

          {tab === "saved" ? <SavedPanel items={liveSaved} loading={saved === null} /> : null}

          {tab === "stores" ? (
            <Panel title="Stores you follow" Icon={StoreIcon} action={{ label: "Browse stores", href: "/stores" }}>
              {stores === null ? (
                <div className="skeleton h-32" />
              ) : liveStores.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {liveStores.map((store) => (
                    <StoreTile key={store._id} store={store} following onToggle={toggleFavourite} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<StoreIcon aria-hidden className="size-7" strokeWidth={1.7} />}
                  title="Not following anyone"
                  body="Follow a store to get its new codes in your feed."
                  action={<ButtonLink href="/stores">Browse stores</ButtonLink>}
                />
              )}
            </Panel>
          ) : null}

          {tab === "feed" ? (
            <Panel title="Your feed" Icon={BellRing}>
              <p className="-mt-1 mb-4 text-sm text-body">Follow a store and its newest offers land here first.</p>
              {feed === null ? (
                <CouponCardSkeleton />
              ) : feed.length ? (
                <div className="space-y-3">
                  {feed.map((coupon) => (
                    <StoreOfferRow key={coupon._id} coupon={coupon} showStore />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<Bell aria-hidden className="size-7" strokeWidth={1.7} />}
                  title="Your feed is empty"
                  body="Follow a few stores and their new offers will show up here."
                  action={<ButtonLink href="/stores">Browse stores</ButtonLink>}
                />
              )}
            </Panel>
          ) : null}

          {tab === "settings" ? (
            <SettingsPanel
              shopper={shopper}
              onSaved={async () => {
                await refresh();
                toast.success("Profile updated");
              }}
            />
          ) : null}

          <p className="mt-8 text-center text-xs text-faint">
            Questions about your data?{" "}
            <Link href="/contact?topic=privacy" className="font-semibold text-brand-600 hover:underline">
              Get in touch
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  Icon,
  action,
  children,
}: {
  title: string;
  Icon: typeof Heart;
  action?: { label: string; href?: string; onClick?: () => void };
  children: React.ReactNode;
}) {
  return (
    <section className="surface rounded-3xl border border-[var(--border-subtle)] p-4 shadow-[var(--shadow-card)] sm:p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-950/70 dark:text-brand-300">
          <Icon aria-hidden className="size-[18px]" />
        </span>
        <h2 className="font-display text-lg font-extrabold">{title}</h2>
        {action ? (
          action.href ? (
            <Link href={action.href} className="ml-auto inline-flex items-center gap-1 text-[13px] font-bold text-brand-600 hover:underline">
              {action.label}
              <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className="ml-auto inline-flex items-center gap-1 text-[13px] font-bold text-brand-600 hover:underline"
            >
              {action.label}
              <ArrowRight aria-hidden className="size-3.5" />
            </button>
          )
        ) : null}
      </div>
      {children}
    </section>
  );
}

function SavedPanel({ items, loading }: { items: CouponView[]; loading: boolean }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"recent" | "discount" | "alpha">("recent");

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = items.filter(
      (item) =>
        !needle ||
        item.title.toLowerCase().includes(needle) ||
        (storeOf(item)?.name ?? "").toLowerCase().includes(needle)
    );
    if (sort === "discount") return [...list].sort((a, b) => (b.discountValue ?? 0) - (a.discountValue ?? 0));
    if (sort === "alpha") return [...list].sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [items, query, sort]);

  return (
    <Panel title="Saved offers" Icon={Heart}>
      {loading ? (
        <CouponCardSkeleton />
      ) : items.length ? (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <label className="relative min-w-52 flex-1">
              <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search your saved offers"
                className="h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none"
              />
            </label>
            <div className="flex gap-1.5">
              {(
                [
                  { id: "recent", label: "Recent" },
                  { id: "discount", label: "Biggest saving" },
                  { id: "alpha", label: "A–Z" },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSort(option.id)}
                  className={classNames(
                    "rounded-full border px-3.5 py-2 text-xs font-semibold transition",
                    sort === option.id
                      ? "border-brand-600 bg-brand-600 text-white shadow-[var(--shadow-glow)]"
                      : "border-[var(--border-subtle)] text-body hover:border-brand-300 hover:text-brand-600"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {shown.length ? (
            <div className="space-y-3">
              {shown.map((coupon) => (
                <StoreOfferRow key={coupon._id} coupon={coupon} showStore />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-[var(--surface-sunken)] px-4 py-5 text-sm text-body">
              No saved offer matches “{query}”.
            </p>
          )}
        </>
      ) : (
        <EmptyState
          icon={<Heart aria-hidden className="size-7" strokeWidth={1.7} />}
          title="Nothing saved yet"
          body="Tap the heart on any offer to keep it here for later."
          action={<ButtonLink href="/coupons">Find offers</ButtonLink>}
        />
      )}
    </Panel>
  );
}

function StoreTile({
  store,
  following,
  onToggle,
}: {
  store: Store;
  following: boolean;
  onToggle: (storeId: string) => Promise<boolean>;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const click = async () => {
    setBusy(true);
    try {
      const next = await onToggle(store._id);
      toast.success(next ? `Following ${store.name}` : `Unfollowed ${store.name}`);
    } catch {
      toast.error("Could not update that right now");
    } finally {
      setBusy(false);
    }
  };

  const best = store.bestOffer ? splitBadge(store.bestOffer) : null;

  return (
    <div className="group flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[var(--shadow-card)]">
      <Link
        href={`/store/${store.slug}`}
        className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-white p-1"
      >
        <StoreLogo name={store.name} logo={store.logo} size={48} rounded="rounded-lg" className="border-0" />
      </Link>

      <Link href={`/store/${store.slug}`} className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold group-hover:text-brand-700 dark:group-hover:text-brand-300">
          {store.name}
        </span>
        <span className="block text-xs text-faint">{formatCount(store.activeCouponCount)} offers</span>
        {best ? <span className="block truncate text-xs font-extrabold text-brand-600">Best: {store.bestOffer}</span> : null}
      </Link>

      <button
        type="button"
        onClick={click}
        disabled={busy}
        className={classNames(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition disabled:opacity-60",
          following
            ? "border border-[var(--border-subtle)] text-body hover:border-danger-500 hover:text-danger-600"
            : "bg-brand-600 text-white shadow-[var(--shadow-glow)] hover:brightness-110"
        )}
      >
        {following ? <Trash2 aria-hidden className="size-3.5" /> : <Bell aria-hidden className="size-3.5" />}
        {following ? "Unfollow" : "Follow"}
      </button>
    </div>
  );
}

function SettingsPanel({
  shopper,
  onSaved,
}: {
  shopper: { name: string; email: string; newsletter: boolean };
  onSaved: () => Promise<void>;
}) {
  const toast = useToast();
  const [name, setName] = useState(shopper.name);
  const [newsletter, setNewsletter] = useState(shopper.newsletter);
  const [busy, setBusy] = useState(false);

  const dirty = name.trim() !== shopper.name || newsletter !== shopper.newsletter;

  const save = async () => {
    setBusy(true);
    try {
      await account.updateProfile({ name: name.trim(), newsletter }, readToken("shopper"));
      await onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <Panel title="Your details" Icon={Settings}>
        <div className="max-w-lg space-y-4">
          <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} />
          <Input label="Email" value={shopper.email} disabled hint="Contact us to change this." />

          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)]/60 p-4">
            <Checkbox
              checked={newsletter}
              onChange={setNewsletter}
              label="Email me the best offers each week"
            />
            <p className="mt-1.5 pl-7 text-xs text-faint">One short email, the strongest deals only. Unsubscribe any time.</p>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={save} loading={busy} disabled={!dirty || !name.trim()} className="!rounded-full">
              Save changes
            </Button>
            {dirty ? (
              <button
                type="button"
                onClick={() => {
                  setName(shopper.name);
                  setNewsletter(shopper.newsletter);
                }}
                className="text-sm font-semibold text-faint hover:text-[var(--text-primary)]"
              >
                Reset
              </button>
            ) : (
              <span className="text-xs text-faint">Everything is up to date.</span>
            )}
          </div>
        </div>
      </Panel>

      <div className="space-y-4">
        <section className="surface rounded-3xl border border-[var(--border-subtle)] p-4 shadow-[var(--shadow-card)]">
          <h3 className="mb-2 text-sm font-extrabold">Privacy</h3>
          <p className="text-xs leading-relaxed text-body">
            You never need an account to use a code. We only store what you save and follow here, so we can show it back to you.
          </p>
          <Link href="/contact?topic=privacy" className="mt-3 inline-flex items-center gap-1 text-[13px] font-bold text-brand-600 hover:underline">
            Ask about your data
            <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        </section>
      </div>
    </div>
  );
}
