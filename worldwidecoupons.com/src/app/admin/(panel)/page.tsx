"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/admin/AdminShell";
import { useAdminData } from "@/components/admin/hooks";
import { StatusPill } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/form";
import { Card, EmptyState, Skeleton, Stat } from "@/components/ui/primitives";
import { dashboard } from "@/lib/endpoints";
import { classNames, formatCount, formatDate, timeAgo } from "@/lib/format";
import type { AttentionList } from "@/lib/types";

export default function AdminDashboardPage() {
  const [days, setDays] = useState(30);

  const stats = useAdminData((token) => dashboard.stats(token));
  const top = useAdminData((token) => dashboard.top(days, token), [days]);
  const attention = useAdminData((token) => dashboard.attention(token));

  const s = stats.data;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Everything that needs your eyes today."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void stats.reload()}>
              Refresh
            </Button>
            <Link href="/admin/coupons/new">
              <Button>New offer</Button>
            </Link>
          </div>
        }
      />

      {stats.loading || !s ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Live offers" value={formatCount(s.coupons.live)} hint={`${formatCount(s.coupons.total)} in total`} />
          <Stat label="Codes" value={formatCount(s.coupons.codes)} hint={`${formatCount(s.coupons.deals)} deals`} />
          <Stat
            label="Expiring in 7 days"
            value={formatCount(s.coupons.expiringSoon)}
            hint={s.coupons.expiringSoon ? "Check these before they die" : "Nothing urgent"}
            tone={s.coupons.expiringSoon ? "danger" : "neutral"}
          />
          <Stat label="Added this week" value={formatCount(s.coupons.addedThisWeek)} />
          <Stat label="Stores" value={formatCount(s.stores.total)} hint={`${formatCount(s.stores.withoutOffers)} with no offers`} />
          <Stat label="Categories" value={formatCount(s.categories)} />
          <Stat label="Shoppers" value={formatCount(s.shoppers)} />
          <Stat
            label="Clicks this week"
            value={formatCount(s.clicksThisWeek)}
            hint={s.unreadMessages ? `${s.unreadMessages} unread messages` : undefined}
            tone={s.unreadMessages ? "danger" : "neutral"}
          />
        </div>
      )}

      {s && (s.coupons.drafts > 0 || s.unreadMessages > 0 || s.coupons.expired > 0) ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {s.coupons.drafts > 0 ? (
            <QuickLink href="/admin/coupons?status=draft" label={`${s.coupons.drafts} drafts waiting`} />
          ) : null}
          {s.coupons.expired > 0 ? (
            <QuickLink href="/admin/coupons?status=expired" label={`${s.coupons.expired} expired offers`} />
          ) : null}
          {s.unreadMessages > 0 ? (
            <QuickLink href="/admin/messages?status=new" label={`${s.unreadMessages} new messages`} />
          ) : null}
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-bold">Top performers</h2>
            <Select
              value={String(days)}
              onChange={(event) => setDays(Number(event.target.value))}
              className="h-9 w-32 py-0 text-xs"
              options={[
                { value: "7", label: "Last 7 days" },
                { value: "30", label: "Last 30 days" },
                { value: "90", label: "Last 90 days" },
              ]}
            />
          </div>

          {top.loading ? (
            <Skeleton className="h-52" />
          ) : top.data ? (
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-faint">Stores</p>
                <ol className="space-y-1.5">
                  {top.data.topStores.length ? (
                    top.data.topStores.slice(0, 8).map((store, index) => (
                      <li key={store._id} className="flex items-center gap-2 text-sm">
                        <span className="w-4 text-faint tabular-nums">{index + 1}</span>
                        <Link href={`/admin/stores/${store._id}`} className="truncate font-medium hover:text-brand-600">
                          {store.name}
                        </Link>
                        <span className="ml-auto tabular-nums text-faint">{formatCount(store.clicks)}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-faint">No clicks recorded yet.</li>
                  )}
                </ol>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-faint">Offers</p>
                <ol className="space-y-1.5">
                  {top.data.topCoupons.length ? (
                    top.data.topCoupons.slice(0, 8).map((coupon, index) => (
                      <li key={coupon._id} className="flex items-center gap-2 text-sm">
                        <span className="w-4 text-faint tabular-nums">{index + 1}</span>
                        <Link href={`/admin/coupons/${coupon._id}`} className="truncate font-medium hover:text-brand-600">
                          {coupon.title}
                        </Link>
                        <span className="ml-auto tabular-nums text-faint">{formatCount(coupon.clicks)}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-faint">No clicks recorded yet.</li>
                  )}
                </ol>
              </div>
            </div>
          ) : null}

          {top.data && Object.keys(top.data.byKind).length ? (
            <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--border-subtle)] pt-4">
              {Object.entries(top.data.byKind).map(([kind, count]) => (
                <span
                  key={kind}
                  className="rounded-lg surface-sunken px-2.5 py-1 text-xs font-semibold text-body"
                >
                  {kind}: <span className="tabular-nums">{formatCount(count)}</span>
                </span>
              ))}
            </div>
          ) : null}
        </Card>

        <AttentionCard data={attention.data} loading={attention.loading} />
      </div>
    </>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-warn-500/40 bg-warn-50 px-3.5 py-2 text-sm font-semibold text-warn-600 transition hover:brightness-95 dark:bg-warn-500/10"
    >
      {label} →
    </Link>
  );
}

const ATTENTION_TABS = [
  { id: "expiringSoon", label: "Expiring" },
  { id: "unverified", label: "Unverified" },
  { id: "neverChecked", label: "Never checked" },
  { id: "emptyStores", label: "Empty stores" },
] as const;

function AttentionCard({ data, loading }: { data: AttentionList | null; loading: boolean }) {
  const [tab, setTab] = useState<(typeof ATTENTION_TABS)[number]["id"]>("expiringSoon");

  return (
    <Card>
      <h2 className="mb-3 text-base font-bold">Needs attention</h2>

      <div className="mb-4 flex gap-1 overflow-x-auto no-scrollbar">
        {ATTENTION_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={classNames(
              "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
              tab === item.id ? "bg-brand-600 text-white" : "surface-sunken text-body"
            )}
          >
            {item.label}
            {data ? <span className="ml-1.5 tabular-nums opacity-70">{data[item.id].length}</span> : null}
          </button>
        ))}
      </div>

      {loading ? (
        <Skeleton className="h-52" />
      ) : !data ? null : tab === "emptyStores" ? (
        data.emptyStores.length ? (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {data.emptyStores.map((store) => (
              <li key={store._id} className="flex items-center gap-3 py-2.5 text-sm">
                <Link href={`/admin/stores/${store._id}`} className="truncate font-medium hover:text-brand-600">
                  {store.name}
                </Link>
                <span className="ml-auto shrink-0 text-xs text-faint">{formatCount(store.views)} views</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon="✓" title="Every store has offers" body="Nothing to fill in here." />
        )
      ) : data[tab].length ? (
        <ul className="divide-y divide-[var(--border-subtle)]">
          {data[tab].map((row) => (
            <li key={row._id} className="flex items-center gap-3 py-2.5 text-sm">
              <div className="min-w-0">
                <Link href={`/admin/coupons/${row._id}`} className="block truncate font-medium hover:text-brand-600">
                  {row.title}
                </Link>
                {row.store ? <span className="text-xs text-faint">{row.store.name}</span> : null}
              </div>

              <span className="ml-auto shrink-0 text-xs text-faint">
                {"expiresAt" in row && row.expiresAt
                  ? formatDate(row.expiresAt)
                  : "lastCheckedAt" in row
                    ? row.lastCheckedAt
                      ? timeAgo(row.lastCheckedAt)
                      : "never"
                    : "createdAt" in row && row.createdAt
                      ? timeAgo(row.createdAt)
                      : null}
              </span>

              {"type" in row && row.type ? <StatusPill status={row.type} /> : null}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon="✓" title="All clear" body="Nothing in this list right now." />
      )}
    </Card>
  );
}
