"use client";

import { Mail, Send } from "lucide-react";
import { useState } from "react";
import { contact } from "@/lib/endpoints";

/**
 * Sidebar signup. Same no-standalone-mailing-list caveat as the homepage
 * bar (`NewsletterBar`) — it lands in the inbox as a contact message — this
 * is just the compact, vertical shape that fits a 320px sidebar column.
 */
export function BlogNewsletter() {
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
        message: `Please add ${email} to the deals & blog newsletter.`,
      });
      setState("done");
    } catch {
      setState("error");
    }
  };

  return (
    <section className="relative overflow-hidden rounded-2xl bg-brand-gradient p-5 text-white shadow-[var(--shadow-glow)]">
      <span
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-10 size-32 rounded-full bg-white/10 blur-2xl"
      />
      <div className="relative flex items-center gap-2">
        <Mail aria-hidden className="size-5" />
        <h2 className="font-display text-base font-extrabold">Stay Updated!</h2>
      </div>
      <p className="relative mt-1.5 text-[13px] leading-relaxed text-white/85">
        Get the latest deals, tips and blog updates delivered to your inbox.
      </p>

      {state === "done" ? (
        <p className="relative mt-3 rounded-xl bg-white/15 px-3.5 py-2.5 text-sm font-semibold">
          Thanks — you&#39;re on the list.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="relative mt-3 flex items-center gap-1.5">
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email address"
            className="h-10 min-w-0 flex-1 rounded-xl border-0 bg-white/95 px-3 text-[13px] font-medium text-ink-900 placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-white"
          />
          <button
            type="submit"
            disabled={state === "sending"}
            aria-label="Subscribe"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-ink-950 px-3.5 text-white transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            <Send aria-hidden className="size-4" />
          </button>
        </form>
      )}
    </section>
  );
}
