"use client";

import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { useState } from "react";
import { classNames } from "@/lib/format";
import { useToast } from "@/components/ui/Toast";
import { useShopper } from "./ShopperProvider";

/** Heart on a coupon card. Sends a signed-out shopper to sign in first. */
export function SaveButton({ couponId, label }: { couponId: string; label?: boolean }) {
  const { shopper, savedIds, toggleSaved } = useShopper();
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const saved = savedIds.has(couponId);

  const onClick = async () => {
    if (!shopper) {
      router.push(`/account/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setBusy(true);
    try {
      const next = await toggleSaved(couponId);
      toast.success(next ? "Saved to your list" : "Removed from your list");
    } catch {
      toast.error("Could not save that right now");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save this offer"}
      className={classNames(
        "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold transition disabled:opacity-50",
        saved ? "text-danger-500" : "text-faint hover:text-danger-500"
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.7 1.1-1a5.5 5.5 0 0 0 0-7.8z" />
      </svg>
      {label ? (saved ? "Saved" : "Save") : null}
    </button>
  );
}

/** "Follow" on a store page — drives the personalised feed and alerts. */
export function FollowStoreButton({ storeId, storeName }: { storeId: string; storeName: string }) {
  const { shopper, favouriteIds, toggleFavourite } = useShopper();
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const following = favouriteIds.has(storeId);

  const onClick = async () => {
    if (!shopper) {
      router.push(`/account/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setBusy(true);
    try {
      const next = await toggleFavourite(storeId);
      toast.success(next ? `Following ${storeName}` : `Unfollowed ${storeName}`);
    } catch {
      toast.error("Could not update that right now");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-pressed={following}
      className={classNames(
        "inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition disabled:opacity-50",
        following
          ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300"
          : "border-[var(--border-subtle)] surface hover:border-brand-300 hover:text-brand-700"
      )}
    >
      {following ? (
        <Star aria-hidden className="size-4 fill-current" />
      ) : (
        <Star aria-hidden className="size-4" />
      )}
      {following ? "Following" : "Follow store"}
    </button>
  );
}
