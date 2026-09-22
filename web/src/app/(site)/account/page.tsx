"use client";

import { Bell, Heart, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CouponCard } from "@/components/site/CouponCard";
import { useShopper } from "@/components/site/ShopperProvider";
import { StoreCard } from "@/components/site/StoreCard";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Checkbox, Input } from "@/components/ui/form";
import { Card, CouponCardSkeleton, EmptyState, SectionHeading } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { account } from "@/lib/endpoints";
import { classNames } from "@/lib/format";
import { readToken } from "@/lib/session";
import type { CouponView, Store } from "@/lib/types";

type Tab = "feed" | "saved" | "stores" | "settings";

const TABS: { id: Tab; label: string }[] = [
  { id: "feed", label: "Your feed" },
  { id: "saved", label: "Saved offers" },
  { id: "stores", label: "Stores you follow" },
  { id: "settings", label: "Settings" },
];

export default function AccountPage() {
  const { shopper, loading, logout, refresh } = useShopper();
  const router = useRouter();
  const toast = useToast();

  const [tab, setTab] = useState<Tab>("feed");
  const [feed, setFeed] = useState<CouponView[] | null>(null);
  const [saved, setSaved] = useState<CouponView[] | null>(null);
  const [stores, setStores] = useState<Store[] | null>(null);

  useEffect(() => {
    if (!loading && !shopper) router.replace("/account/login?next=/account");
  }, [loading, shopper, router]);

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

  if (loading || !shopper) {
    return (
      <div className="mx-auto max-w-5xl space-y-3 px-4 py-10">
        <CouponCardSkeleton />
        <CouponCardSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-gradient text-xl font-bold text-white">
            {shopper.name.charAt(0).toUpperCase()}
          </span>
          <div>
            <h1 className="text-xl font-extrabold">{shopper.name}</h1>
            <p className="text-sm text-faint">{shopper.email}</p>
          </div>
        </div>

        <Button
          variant="secondary"
          onClick={async () => {
            await logout();
            router.push("/");
          }}
        >
          Sign out
        </Button>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-[var(--border-subtle)] no-scrollbar">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={classNames(
              "-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-semibold transition",
              tab === item.id
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-body hover:text-[var(--text-primary)]"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "feed" ? (
        <section>
          <SectionHeading
            title="New from the stores you follow"
            subtitle="Follow a store and its newest offers land here first."
          />
          {feed === null ? (
            <CouponCardSkeleton />
          ) : feed.length ? (
            <div className="space-y-3">
              {feed.map((coupon) => (
                <CouponCard key={coupon._id} coupon={coupon} />
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
        </section>
      ) : null}

      {tab === "saved" ? (
        <section>
          <SectionHeading title="Saved offers" />
          {saved === null ? (
            <CouponCardSkeleton />
          ) : saved.length ? (
            <div className="space-y-3">
              {saved.map((coupon) => (
                <CouponCard key={coupon._id} coupon={coupon} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Heart aria-hidden className="size-7" strokeWidth={1.7} />}
              title="Nothing saved yet"
              body="Tap the heart on any offer to keep it here for later."
              action={<ButtonLink href="/coupons">Find offers</ButtonLink>}
            />
          )}
        </section>
      ) : null}

      {tab === "stores" ? (
        <section>
          <SectionHeading title="Stores you follow" />
          {stores === null ? (
            <div className="skeleton h-32" />
          ) : stores.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {stores.map((store) => (
                <StoreCard key={store._id} store={store} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Star aria-hidden className="size-7" strokeWidth={1.7} />}
              title="Not following anyone"
              body="Follow a store to get its new codes in your feed."
              action={<ButtonLink href="/stores">Browse stores</ButtonLink>}
            />
          )}
        </section>
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

      <p className="mt-10 text-center text-xs text-faint">
        Questions about your data?{" "}
        <Link href="/contact?topic=privacy" className="font-semibold text-brand-600 hover:underline">
          Get in touch
        </Link>
      </p>
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

  const save = async () => {
    setBusy(true);
    try {
      await account.updateProfile({ name, newsletter }, readToken("shopper"));
      await onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="max-w-lg space-y-4">
      <h2 className="text-lg font-bold">Your details</h2>

      <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} />

      <Input label="Email" value={shopper.email} disabled hint="Contact us to change this." />

      <Checkbox
        checked={newsletter}
        onChange={setNewsletter}
        label="Email me the best offers each week"
      />

      <Button onClick={save} loading={busy}>
        Save changes
      </Button>
    </Card>
  );
}
