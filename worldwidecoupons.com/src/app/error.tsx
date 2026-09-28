"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <p className="text-5xl">⚠️</p>
      <h1 className="mt-3 text-2xl font-extrabold">Something broke</h1>
      <p className="mt-2 text-body">
        That is on us. Try again, and if it keeps happening let us know.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/" variant="secondary">
          Go home
        </ButtonLink>
      </div>
      {error.digest ? (
        <p className="mt-5 font-mono text-xs text-faint">Reference: {error.digest}</p>
      ) : null}
    </div>
  );
}
