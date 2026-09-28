"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useShopper } from "@/components/site/ShopperProvider";
import { Button } from "@/components/ui/Button";
import { Checkbox, FormError, Input } from "@/components/ui/form";
import { Card } from "@/components/ui/primitives";

export default function RegisterPage() {
  const { register } = useShopper();
  const router = useRouter();

  const [newsletter, setNewsletter] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const form = new FormData(event.currentTarget);

    try {
      await register(
        String(form.get("name")),
        String(form.get("email")),
        String(form.get("password")),
        newsletter
      );
      router.push("/account");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create that account");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-extrabold">Create an account</h1>
        <p className="mt-1 text-sm text-body">
          Save offers, follow stores, and get told when a new code lands.
        </p>
      </div>

      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
          <FormError message={error} />
          <Input label="Your name" name="name" required autoComplete="name" />
          <Input label="Email" name="email" type="email" required autoComplete="email" />
          <Input
            label="Password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            hint="At least 8 characters."
          />
          <Checkbox
            checked={newsletter}
            onChange={setNewsletter}
            label="Email me the best offers each week"
          />
          <Button type="submit" full size="lg" loading={busy}>
            Create account
          </Button>
        </form>
      </Card>

      <p className="mt-5 text-center text-sm text-body">
        Already have one?{" "}
        <Link href="/account/login" className="font-semibold text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
