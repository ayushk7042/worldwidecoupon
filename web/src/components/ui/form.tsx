"use client";

import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { useId } from "react";
import { classNames } from "@/lib/format";

const CONTROL =
  "w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3.5 py-2.5 text-sm " +
  "text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition " +
  "focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 " +
  "disabled:opacity-60 disabled:cursor-not-allowed";

const ERROR_RING = "border-danger-500 focus:border-danger-500 focus:ring-danger-500/10";

export function Field({
  label,
  hint,
  error,
  required,
  children,
  htmlFor,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <div className={classNames("space-y-1.5", className)}>
      {label ? (
        <label htmlFor={htmlFor} className="block text-sm font-semibold">
          {label}
          {required ? <span className="ml-0.5 text-danger-500">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="text-xs font-medium text-danger-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-faint">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({
  label,
  hint,
  error,
  className,
  prefix,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  prefix?: ReactNode;
}) {
  const id = useId();
  const inputId = rest.id ?? id;

  return (
    <Field label={label} hint={hint} error={error} required={rest.required} htmlFor={inputId}>
      <div className="relative">
        {prefix ? (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-faint">
            {prefix}
          </span>
        ) : null}
        <input
          {...rest}
          id={inputId}
          aria-invalid={error ? true : undefined}
          className={classNames(CONTROL, prefix && "pl-9", error && ERROR_RING, className)}
        />
      </div>
    </Field>
  );
}

export function Textarea({
  label,
  hint,
  error,
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
  error?: string;
}) {
  const id = useId();
  const textareaId = rest.id ?? id;

  return (
    <Field label={label} hint={hint} error={error} required={rest.required} htmlFor={textareaId}>
      <textarea
        {...rest}
        id={textareaId}
        aria-invalid={error ? true : undefined}
        className={classNames(CONTROL, "min-h-24 resize-y leading-relaxed", error && ERROR_RING, className)}
      />
    </Field>
  );
}

export function Select({
  label,
  hint,
  error,
  options,
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
  error?: string;
  options?: { value: string; label: string }[];
}) {
  const id = useId();
  const selectId = rest.id ?? id;

  return (
    <Field label={label} hint={hint} error={error} required={rest.required} htmlFor={selectId}>
      <select
        {...rest}
        id={selectId}
        className={classNames(CONTROL, "cursor-pointer appearance-none bg-[length:16px] pr-9", error && ERROR_RING, className)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 0.75rem center",
        }}
      >
        {options
          ? options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          : children}
      </select>
    </Field>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={classNames(
        "flex cursor-pointer items-start gap-3",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={classNames(
          "mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors",
          checked ? "bg-brand-600" : "bg-[var(--border-strong)]"
        )}
      >
        <span
          className={classNames(
            "size-5 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-5"
          )}
        />
      </button>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        {hint ? <span className="block text-xs text-faint">{hint}</span> : null}
      </span>
    </label>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: ReactNode;
  className?: string;
}) {
  return (
    <label className={classNames("inline-flex cursor-pointer items-center gap-2", className)}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 cursor-pointer rounded border-[var(--border-strong)] text-brand-600 accent-[var(--color-brand-600)] focus:ring-brand-500"
      />
      {label ? <span className="text-sm">{label}</span> : null}
    </label>
  );
}

/** Inline error banner for a failed submit. */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-danger-500/30 bg-danger-50 px-4 py-3 text-sm font-medium text-danger-600 dark:bg-danger-500/10"
    >
      <span aria-hidden>⚠</span>
      <span>{message}</span>
    </div>
  );
}

export function FormSuccess({ message }: { message?: string | null }) {
  if (!message) return null;

  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-xl border border-success-500/30 bg-success-50 px-4 py-3 text-sm font-medium text-success-700 dark:bg-success-700/10 dark:text-success-500"
    >
      <span aria-hidden>✓</span>
      <span>{message}</span>
    </div>
  );
}
