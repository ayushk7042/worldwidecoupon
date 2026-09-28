"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea, FormError, FormSuccess } from "@/components/ui/form";
import { ApiError } from "@/lib/api";
import { contact } from "@/lib/endpoints";
import { CONTACT_TOPICS, type ContactTopic } from "@/lib/types";

const TOPIC_LABELS: Record<ContactTopic, string> = {
  general: "General question",
  "broken-coupon": "A code did not work",
  "submit-coupon": "Submit a coupon",
  advertise: "Advertise with us",
  partnership: "Partnership",
  privacy: "Privacy request",
};

export function ContactForm({
  defaultTopic = "general",
  couponId,
  storeId,
}: {
  defaultTopic?: ContactTopic;
  couponId?: string;
  storeId?: string;
}) {
  const [topic, setTopic] = useState<ContactTopic>(defaultTopic);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setSending(true);

    const form = new FormData(event.currentTarget);

    try {
      await contact.submit({
        name: form.get("name"),
        email: form.get("email"),
        topic,
        subject: form.get("subject") || undefined,
        message: form.get("message"),
        coupon: couponId,
        store: storeId,
        // Honeypot. A person never sees this field, a bot always fills it.
        website: form.get("website") || undefined,
      });

      setSent(true);
      event.currentTarget.reset();
    } catch (caught) {
      if (caught instanceof ApiError && caught.details?.length) {
        setFieldErrors(
          Object.fromEntries(caught.details.map((issue) => [issue.field, issue.message]))
        );
      }
      setError(caught instanceof Error ? caught.message : "Could not send that");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <FormSuccess message="Thanks — we have your message and will reply by email, usually within a working day." />
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormError message={error} />

      <Select
        label="What is this about?"
        value={topic}
        onChange={(event) => setTopic(event.target.value as ContactTopic)}
        options={CONTACT_TOPICS.map((value) => ({ value, label: TOPIC_LABELS[value] }))}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Your name" name="name" required error={fieldErrors.name} autoComplete="name" />
        <Input
          label="Email"
          name="email"
          type="email"
          required
          error={fieldErrors.email}
          autoComplete="email"
          hint="So we can reply."
        />
      </div>

      <Input label="Subject" name="subject" error={fieldErrors.subject} />

      <Textarea
        label="Message"
        name="message"
        required
        rows={6}
        error={fieldErrors.message}
        placeholder={
          topic === "broken-coupon"
            ? "Which code, which store, and what the checkout said…"
            : "Tell us what you need…"
        }
      />

      {/* Off-screen rather than display:none — some bots skip hidden inputs. */}
      <div className="absolute left-[-9999px]" aria-hidden>
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <Button type="submit" loading={sending} size="lg">
        Send message
      </Button>

      <p className="text-xs text-faint">
        We only use your email to reply. No lists, no forwarding.
      </p>
    </form>
  );
}

/** Newsletter sign-up, reusing the shopper register endpoint. */
export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await contact.submit({
        name: email.split("@")[0] || "Subscriber",
        email,
        topic: "general",
        subject: "Newsletter sign-up",
        message: "Please add me to the deals newsletter.",
      });
      setDone(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign you up");
    } finally {
      setBusy(false);
    }
  };

  if (done) return <FormSuccess message="You are on the list." />;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
      <input
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        aria-label="Email address"
        className="h-11 flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
      />
      <Button type="submit" loading={busy}>
        Subscribe
      </Button>
      {error ? <p className="text-xs text-danger-600">{error}</p> : null}
    </form>
  );
}
