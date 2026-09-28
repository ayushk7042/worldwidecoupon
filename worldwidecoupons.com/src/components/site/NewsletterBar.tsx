"use client";

import { Gift, Mail, Send } from "lucide-react";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { contact } from "@/lib/endpoints";

/**
 * There is no standalone subscriber list yet, so a signup drops into the
 * same inbox as every other contact message — an editor sees it and can
 * wire up real mailing-list delivery later. Better than a form that goes
 * nowhere.
 */
export function NewsletterBar() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state === "sending" || state === "done") return;

    setState("sending");
    try {
      await contact.submit({
        name: "Newsletter signup",
        email,
        topic: "general",
        subject: "Newsletter subscription",
        message: `Please add ${email} to the deals newsletter.`,
      });
      setState("done");
    } catch (caught) {
      setState("error");
      void (caught instanceof ApiError ? caught.message : undefined);
    }
  };

  return (
    <section className="shell py-10">
      <div className="relative overflow-hidden rounded-3xl bg-brand-gradient px-6 py-8 text-white shadow-[var(--shadow-glow)] sm:px-10">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full bg-white/10 blur-3xl"
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl">
              🌍
            </span>
            <div>
              <p className="text-base font-extrabold sm:text-lg">Get exclusive deals in your inbox</p>
              <p className="text-sm text-white/80">
                Be the first to know about the latest coupons, offers and discounts.
              </p>
            </div>
          </div>

          {state === "done" ? (
            <p className="rounded-2xl bg-white/15 px-5 py-3 text-sm font-semibold">
              Thanks — we&#39;ll be in touch.
            </p>
          ) : (
            <form onSubmit={onSubmit} className="flex w-full max-w-md flex-col gap-2 sm:flex-row">
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email address"
                className="h-12 min-w-0 flex-1 rounded-2xl border-0 bg-white/95 px-4 text-sm font-medium text-ink-900 placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-white"
              />
              <button
                type="submit"
                disabled={state === "sending"}
                className="inline-flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-ink-950 px-6 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-60"
              >
                {state === "sending" ? "Sending…" : "Subscribe"}
                <Send aria-hidden className="size-4" />
              </button>
            </form>
          )}
        </div>
        {state === "error" ? (
          <p className="relative mt-3 text-sm font-semibold text-white/90">
            Could not save that right now — try again in a moment.
          </p>
        ) : null}
      </div>
    </section>
  );
}

/** The slim "Never miss a deal!" strip under a store's offers. */
export function StoreSignup({ storeName, compact = false }: { storeName: string; compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state === "sending" || state === "done") return;

    setState("sending");
    try {
      await contact.submit({
        name: "Newsletter signup",
        email,
        topic: "general",
        subject: `Newsletter subscription — ${storeName}`,
        message: `Please add ${email} to the deals newsletter (from the ${storeName} page).`,
      });
      setState("done");
    } catch {
      setState("error");
    }
  };

  return (
    <div className={compact ? "flex flex-col gap-3 rounded-2xl border border-brand-200/60 bg-gradient-to-br from-brand-50 to-brand-100/70 p-4 dark:border-brand-700/40 dark:from-brand-900/45 dark:to-brand-900/30" : "mt-4 flex flex-col gap-4 rounded-2xl border border-brand-200/60 bg-gradient-to-r from-brand-50 via-brand-50 to-brand-100/70 p-4 sm:flex-row sm:items-center dark:border-brand-700/40 dark:from-brand-900/45 dark:via-brand-950/60 dark:to-brand-900/30 sm:flex-row sm:items-center"}>
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-warn-500 text-white shadow-[var(--shadow-card)]">
        <Gift aria-hidden className="size-6" />
      </span>
      <div className={compact ? "min-w-0" : "min-w-0 sm:w-64"}>
        <p className="font-display text-lg font-extrabold">Never miss a deal!</p>
        <p className="text-xs text-body">Get the latest {storeName} coupons and offers straight to your inbox.</p>
      </div>

      {state === "done" ? (
        <p className="rounded-xl bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-brand-700 sm:ml-auto dark:text-brand-300">
          Thanks — we&#39;ll be in touch.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-1 flex-wrap items-center gap-2">
          <label className="relative min-w-52 flex-1">
            <Mail aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email address"
              className="h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={state === "sending"}
            className="h-11 rounded-xl bg-brand-gradient px-6 text-sm font-bold text-white shadow-[var(--shadow-glow)] transition hover:brightness-110 disabled:opacity-60"
          >
            {state === "sending" ? "Sending…" : "Subscribe"}
          </button>
          {state === "error" ? <span className="text-xs text-danger-600">Could not subscribe — try again.</span> : null}
        </form>
      )}
    </div>
  );
}
