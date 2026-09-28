"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useShopper } from "./ShopperProvider";
import { useToast } from "@/components/ui/Toast";
import { classNames } from "@/lib/format";

/** The little heart on a store tile — follows the store, or sends a guest to sign in. */
export function StoreHeart({ storeId, storeName }: { storeId: string; storeName: string }) {
  const { shopper, favouriteIds, toggleFavourite } = useShopper();
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const following = favouriteIds.has(storeId);

  const click = async () => {
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
      onClick={click}
      disabled={busy}
      aria-pressed={following}
      aria-label={following ? `Unfollow ${storeName}` : `Follow ${storeName}`}
      className={classNames(
        "absolute right-2.5 top-2.5 z-10 flex size-8 items-center justify-center rounded-full border bg-white/90 shadow-[var(--shadow-card)] transition hover:scale-110 disabled:opacity-60",
        following ? "border-danger-500/40 text-danger-500" : "border-[var(--border-subtle)] text-faint hover:text-danger-500"
      )}
    >
      <Heart aria-hidden className={classNames("size-4", following && "fill-current")} />
    </button>
  );
}
