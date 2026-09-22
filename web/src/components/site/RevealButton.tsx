"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiBase } from "@/lib/api";
import { coupons } from "@/lib/endpoints";
import { classNames } from "@/lib/format";
import type { CouponView, RevealResponse } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

/**
 * The button the whole site exists for.
 *
 * A **deal** just goes: the redirect endpoint records the click and bounces
 * the shopper to the merchant.
 *
 * A **code** has to do two things at once — put the code on screen and open
 * the merchant — so it opens the tab *first*, synchronously inside the click
 * handler, then fills it in once the reveal call returns. Opening it after
 * the `await` would be a popup the browser blocks.
 */
export function RevealButton({
  coupon,
  size = "md",
  full,
  label,
}: {
  coupon: Pick<CouponView, "_id" | "type" | "hasCode" | "isExpired" | "status">;
  size?: "sm" | "md" | "lg";
  full?: boolean;
  label?: string;
}) {
  const toast = useToast();
  const [revealed, setRevealed] = useState<RevealResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const pendingTab = useRef<Window | null>(null);

  const isCode = coupon.hasCode && (coupon.type === "code" || coupon.type === "printable");
  const dead = coupon.isExpired || coupon.status !== "active";

  const copy = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // Clipboard access is denied in some embedded browsers; the code is on
      // screen either way, so this is a nicety and not a failure.
      setCopied(false);
    }
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const onClick = async () => {
    if (dead) return;

    if (!isCode) {
      window.open(coupons.goUrl(coupon._id, apiBase()), "_blank", "noopener,noreferrer");
      return;
    }

    // Claim the tab now, while we are still inside the user gesture.
    pendingTab.current = window.open("", "_blank", "noopener,noreferrer");
    setLoading(true);

    try {
      const result = await coupons.reveal(coupon._id);
      setRevealed(result);

      if (result.code) void copy(result.code);

      if (pendingTab.current && result.url) {
        pendingTab.current.location.href = result.url;
      } else if (result.url) {
        window.open(result.url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      pendingTab.current?.close();
      toast.error(error instanceof Error ? error.message : "Could not load that code");
    } finally {
      pendingTab.current = null;
      setLoading(false);
    }
  };

  const text = label ?? (isCode ? "Get code" : "Get deal");

  return (
    <>
      <Button
        onClick={onClick}
        loading={loading}
        disabled={dead}
        size={size}
        full={full}
        variant={dead ? "secondary" : "primary"}
        className={classNames(
          !dead && isCode &&
            // The dashed right edge reads as a torn-off voucher stub.
            "relative before:absolute before:inset-y-1 before:right-8 before:w-px before:border-l-2 before:border-dashed before:border-white/30"
        )}
      >
        {dead ? "Expired" : text}
        {!dead ? <span aria-hidden>→</span> : null}
      </Button>

      <Modal
        open={Boolean(revealed)}
        onClose={() => setRevealed(null)}
        title={revealed?.code ? "Here is your code" : "You are on your way"}
        description={
          revealed?.code
            ? `Paste it at the ${revealed.storeName} checkout. We opened the store in a new tab.`
            : `We opened ${revealed?.storeName} in a new tab — the discount is already applied.`
        }
      >
        {revealed?.code ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => revealed.code && copy(revealed.code)}
              className="group flex w-full items-center justify-between gap-3 rounded-xl border-2 border-dashed border-brand-400 bg-brand-50 px-4 py-4 transition hover:border-brand-500 dark:bg-brand-950/40"
            >
              <span className="select-all font-mono text-xl font-bold tracking-wider text-brand-700 dark:text-brand-300">
                {revealed.code}
              </span>
              <span
                className={classNames(
                  "shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition",
                  copied ? "bg-success-600 text-white" : "bg-brand-600 text-white group-hover:bg-brand-700"
                )}
              >
                {copied ? "Copied" : "Copy"}
              </span>
            </button>

            <p className="text-center text-xs text-faint">
              Used {revealed.uses.toLocaleString()} times
            </p>

            {revealed.url ? (
              <Button
                variant="secondary"
                full
                onClick={() => window.open(revealed.url, "_blank", "noopener,noreferrer")}
              >
                Store did not open? Click here
              </Button>
            ) : null}
          </div>
        ) : (
          <Button
            variant="secondary"
            full
            onClick={() => revealed?.url && window.open(revealed.url, "_blank", "noopener,noreferrer")}
          >
            Open {revealed?.storeName}
          </Button>
        )}
      </Modal>
    </>
  );
}

/** Thumbs up / down under an offer, so shoppers keep the data honest. */
export function VoteWidget({
  couponId,
  successRate,
}: {
  couponId: string;
  successRate: number | null;
}) {
  const [rate, setRate] = useState(successRate);
  const [voted, setVoted] = useState<null | boolean>(null);
  const toast = useToast();

  const vote = async (worked: boolean) => {
    if (voted !== null) return;
    setVoted(worked);

    try {
      const result = await coupons.vote(couponId, worked);
      setRate(result.successRate);
    } catch {
      toast.error("Could not record your vote");
      setVoted(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      {rate !== null ? (
        <span className="font-semibold text-success-600">{rate}% worked</span>
      ) : null}

      {voted === null ? (
        <span className="flex items-center gap-2 text-faint">
          <span>Did it work?</span>
          <button
            type="button"
            onClick={() => vote(true)}
            className="rounded-lg border border-[var(--border-subtle)] px-2.5 py-1 font-semibold transition hover:border-success-500 hover:text-success-600"
          >
            <ThumbsUp aria-hidden className="size-4" />
            Yes
          </button>
          <button
            type="button"
            onClick={() => vote(false)}
            className="rounded-lg border border-[var(--border-subtle)] px-2.5 py-1 font-semibold transition hover:border-danger-500 hover:text-danger-600"
          >
            <ThumbsDown aria-hidden className="size-4" />
            No
          </button>
        </span>
      ) : (
        <span className="text-faint">Thanks for the feedback</span>
      )}
    </div>
  );
}
