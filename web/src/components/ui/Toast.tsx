"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { classNames } from "@/lib/format";

type ToastTone = "success" | "error" | "info";

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TONES: Record<ToastTone, { icon: string; classes: string }> = {
  success: { icon: "✓", classes: "border-success-500/30 bg-success-600 text-white" },
  error: { icon: "⚠", classes: "border-danger-500/30 bg-danger-600 text-white" },
  info: { icon: "ℹ", classes: "border-brand-500/30 bg-ink-900 text-white" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-3), { id, tone, message }]);

      // Errors stay longer — they usually need reading, not just noticing.
      const ttl = tone === "error" ? 6000 : 3500;
      timers.current.set(id, setTimeout(() => dismiss(id), ttl));
    },
    [dismiss]
  );

  // A pending timer firing after unmount would set state on a dead tree.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
      info: (message) => push("info", message),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-5 left-1/2 z-[100] flex w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-2 sm:bottom-6 sm:left-auto sm:right-6 sm:translate-x-0"
      >
        {toasts.map((toast) => (
          <button
            key={toast.id}
            type="button"
            onClick={() => dismiss(toast.id)}
            className={classNames(
              "pointer-events-auto flex animate-[rise_0.25s_ease-out] items-start gap-2.5 rounded-xl border px-4 py-3 text-left text-sm font-medium shadow-[var(--shadow-lift)]",
              TONES[toast.tone].classes
            )}
          >
            <span aria-hidden className="mt-px">
              {TONES[toast.tone].icon}
            </span>
            <span className="flex-1">{toast.message}</span>
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Returns a no-op API when no provider is mounted, so a component can call
 * `toast.success()` without caring whether it is inside the admin shell.
 */
export function useToast(): ToastApi {
  const context = useContext(ToastContext);

  return (
    context ?? {
      success: () => undefined,
      error: () => undefined,
      info: () => undefined,
    }
  );
}
