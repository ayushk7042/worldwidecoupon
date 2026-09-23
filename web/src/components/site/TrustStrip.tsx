import { Globe2, Headphones, Percent, ShieldCheck, Zap } from "lucide-react";

/** The same five promises, wherever a page needs to earn a little trust. */
const TRUST_POINTS = [
  {
    icon: <Percent aria-hidden className="size-5" />,
    title: "Verified coupons",
    body: "100% working deals",
    circle: "bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-300",
  },
  {
    icon: <Globe2 aria-hidden className="size-5" />,
    title: "Global brands",
    body: "Top stores worldwide",
    circle: "bg-accent-100 text-accent-600 dark:bg-accent-600/15 dark:text-accent-400",
  },
  {
    icon: <Zap aria-hidden className="size-5" />,
    title: "Save big",
    body: "Up to 80% off",
    circle: "bg-warn-50 text-warn-600 dark:bg-warn-500/10 dark:text-warn-500",
  },
  {
    icon: <ShieldCheck aria-hidden className="size-5" />,
    title: "Safe & secure",
    body: "Trusted by millions",
    circle: "bg-success-50 text-success-600 dark:bg-success-700/15 dark:text-success-500",
  },
  {
    icon: <Headphones aria-hidden className="size-5" />,
    title: "24/7 support",
    body: "We're here to help",
    circle: "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300",
  },
];

export function TrustStrip({ className }: { className?: string }) {
  return (
    <div
      className={
        "grid grid-cols-2 gap-x-4 gap-y-4 rounded-2xl border border-[var(--border-subtle)] surface p-4 sm:grid-cols-3 lg:grid-cols-5 lg:p-5" +
        (className ? ` ${className}` : "")
      }
    >
      {TRUST_POINTS.map((point) => (
        <div key={point.title} className="flex items-center gap-3">
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${point.circle}`}>
            {point.icon}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold">{point.title}</span>
            <span className="block truncate text-xs text-faint">{point.body}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
