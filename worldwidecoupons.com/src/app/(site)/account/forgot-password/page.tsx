"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useShopper } from "@/components/site/ShopperProvider";
import { account } from "@/lib/endpoints";
import { Button } from "@/components/ui/Button";
import { FormError, FormSuccess, Input } from "@/components/ui/form";
import { Card } from "@/components/ui/primitives";

/**
 * Two steps, one page: ask for the email, then — once a code has actually
 * been requested — the code and a new password. Resetting signs the shopper
 * straight in, so this is also the last step they need after a real reset.
 */
export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-extrabold">
          {step === "email" ? "Reset your password" : "Check your email"}
        </h1>
        <p className="mt-1 text-sm text-body">
          {step === "email"
            ? "Tell us the email on your account and we will send a 6-digit code."
            : `Enter the code we sent to ${email}, and pick a new password.`}
        </p>
      </div>

      <Card>
        {step === "email" ? (
          <RequestCodeForm
            onSent={(sentEmail) => {
              setEmail(sentEmail);
              setStep("reset");
            }}
          />
        ) : (
          <ResetForm email={email} onChangeEmail={() => setStep("email")} />
        )}
      </Card>

      <p className="mt-5 text-center text-sm text-body">
        Remembered it?{" "}
        <Link href="/account/login" className="font-semibold text-brand-600 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

function RequestCodeForm({ onSent }: { onSent: (email: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const email = String(new FormData(event.currentTarget).get("email"));

    try {
      await account.forgotPassword(email);
      onSent(email);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send that code");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormError message={error} />
      <Input label="Email" name="email" type="email" required autoComplete="email" autoFocus />
      <Button type="submit" full size="lg" loading={busy}>
        Send code
      </Button>
    </form>
  );
}

function ResetForm({ email, onChangeEmail }: { email: string; onChangeEmail: () => void }) {
  const { resetPassword } = useShopper();
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const otp = String(form.get("otp")).trim();
    const newPassword = String(form.get("newPassword"));
    const confirmPassword = String(form.get("confirmPassword"));

    if (newPassword !== confirmPassword) {
      setError("Those two passwords don't match");
      setBusy(false);
      return;
    }

    try {
      await resetPassword(email, otp, newPassword);
      router.push("/account");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not reset your password");
    } finally {
      setBusy(false);
    }
  };

  const onResend = async () => {
    setResending(true);
    setError(null);
    try {
      await account.forgotPassword(email);
      setResent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not resend that code");
    } finally {
      setResending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormError message={error} />
      <FormSuccess message={resent ? "Sent — check your email for the new code" : null} />

      <Input
        label="6-digit code"
        name="otp"
        inputMode="numeric"
        pattern="[0-9]{6}"
        maxLength={6}
        placeholder="000000"
        required
        autoFocus
        className="text-center text-lg font-bold tracking-[0.5em]"
      />
      <Input
        label="New password"
        name="newPassword"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        hint="At least 8 characters"
      />
      <Input
        label="Confirm new password"
        name="confirmPassword"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
      />

      <Button type="submit" full size="lg" loading={busy}>
        Reset password &amp; sign in
      </Button>

      <div className="flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={onChangeEmail}
          className="font-semibold text-brand-600 hover:underline"
        >
          Wrong email?
        </button>
        <button
          type="button"
          onClick={onResend}
          disabled={resending}
          className="font-semibold text-brand-600 hover:underline disabled:opacity-60"
        >
          {resending ? "Sending…" : "Resend code"}
        </button>
      </div>
    </form>
  );
}
