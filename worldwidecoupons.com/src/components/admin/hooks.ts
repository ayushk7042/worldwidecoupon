"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { useAdmin } from "./AdminProvider";

/**
 * The admin panel reads live data on every visit — nothing here is cacheable,
 * and a stale coupon list is worse than a spinner.
 */
export function useAdminData<T>(
  loader: (token: string | null) => Promise<T>,
  deps: unknown[] = []
) {
  const { token, loading: authLoading } = useAdmin();
  const toast = useToast();

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  // Keeps a slow first request from overwriting a faster second one.
  const run = useRef(0);

  const reload = useCallback(async () => {
    if (authLoading) return;
    const ticket = ++run.current;
    setLoading(true);

    try {
      const result = await loader(token);
      if (ticket === run.current) setData(result);
    } catch (error) {
      if (ticket === run.current) {
        toast.error(error instanceof Error ? error.message : "Could not load this");
      }
    } finally {
      if (ticket === run.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, authLoading, ...deps]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, reload, setData };
}

/** Wraps a mutation with a busy flag and toast handling. */
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async <T,>(
      task: () => Promise<T>,
      options: { success?: string; onDone?: (result: T) => void | Promise<void> } = {}
    ): Promise<T | null> => {
      setBusy(true);
      try {
        const result = await task();
        if (options.success) toast.success(options.success);
        await options.onDone?.(result);
        return result;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Something went wrong");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [toast]
  );

  return { busy, run };
}

/** Debounces a search box so every keystroke is not a request. */
export function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
