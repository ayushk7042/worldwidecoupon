"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useShopper } from "@/components/site/ShopperProvider";
import { Button } from "@/components/ui/Button";
import { FormError, Input } from "@/components/ui/form";
import { Card } from "@/components/ui/primitives";

function LoginForm() {
  const { login } = useShopper();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/account";

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const form = new FormData(event.currentTarget);

    try {
      await login(String(form.get("email")), String(form.get("password")));
      router.push(next);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign you in");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormError message={error} />
      <Input label="Email" name="email" type="email" required autoComplete="email" />
      <Input label="Password" name="password" type="password" required autoComplete="current-password" />
      <Button type="submit" full size="lg" loading={busy}>
        Sign in
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-extrabold">Welcome back</h1>
        <p className="mt-1 text-sm text-body">
          Sign in to save offers and follow your favourite stores.
        </p>
      </div>

      <Card>
        <Suspense fallback={<div className="skeleton h-48" />}>
          <LoginForm />
        </Suspense>
      </Card>

      <p className="mt-5 text-center text-sm text-body">
        No account?{" "}
        <Link href="/account/register" className="font-semibold text-brand-600 hover:underline">
          Create one — it takes a minute
        </Link>
      </p>

      <p className="mt-6 text-center text-xs text-faint">
        You never need an account to use a code. Signing in only saves them.
      </p>
    </div>
  );
}
