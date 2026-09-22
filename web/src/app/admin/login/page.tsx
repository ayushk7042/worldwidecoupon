"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/AdminProvider";
import { LogoMark } from "@/components/site/Logo";
import { Button } from "@/components/ui/Button";
import { FormError, Input } from "@/components/ui/form";
import { Card } from "@/components/ui/primitives";

function LoginForm() {
  const { login, admin, loading } = useAdmin();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/admin";

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Landing here with a valid session should not force a second sign-in.
  useEffect(() => {
    if (!loading && admin) router.replace(next);
  }, [loading, admin, next, router]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const form = new FormData(event.currentTarget);

    try {
      await login(String(form.get("email")), String(form.get("password")));
      router.replace(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign you in");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormError message={error} />
      <Input label="Email" name="email" type="email" required autoComplete="email" autoFocus />
      <Input label="Password" name="password" type="password" required autoComplete="current-password" />
      <Button type="submit" full size="lg" loading={busy}>
        Sign in
      </Button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center surface-muted px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <LogoMark size={52} className="mx-auto mb-3" />
          <h1 className="text-xl font-extrabold">
            Worldwide<span className="text-brand-600">Coupons</span>
          </h1>
          <p className="mt-1 text-sm text-body">Sign in to the admin panel</p>
        </div>

        <Card>
          <Suspense fallback={<div className="skeleton h-48" />}>
            <LoginForm />
          </Suspense>
        </Card>
      </div>
    </div>
  );
}
