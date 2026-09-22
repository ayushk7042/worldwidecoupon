import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AdSlot } from "@/components/ads/AdSlot";
import { CouponCard } from "@/components/site/CouponCard";
import { CategoryTile, StoreCard } from "@/components/site/StoreCard";
import { ButtonLink } from "@/components/ui/Button";
import {
  Breadcrumbs,
  Card,
  EmptyState,
  SectionHeading,
} from "@/components/ui/primitives";
import { api, apiSafe } from "@/lib/api";
import { formatCount } from "@/lib/format";
import { JsonLd, breadcrumbSchema, itemListSchema } from "@/lib/schema";
import type { Category, CategoryDetail } from "@/lib/types";

export const revalidate = 300;

async function loadCategory(slug: string): Promise<CategoryDetail | null> {
  try {
    return await api<CategoryDetail>(`/categories/${encodeURIComponent(slug)}`, {
      revalidate: 300,
    });
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await loadCategory(slug);

  if (!category) return { title: "Category not found" };

  const title =
    category.metaTitle || `${category.name} Coupons & Deals — ${category.activeCouponCount} live offers`;

  return {
    title,
    description:
      category.metaDescription ||
      category.description ||
      `${category.activeCouponCount} verified ${category.name.toLowerCase()} coupon codes and deals from ${category.storeCount} stores.`,
    alternates: { canonical: `/category/${category.slug}` },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await loadCategory(slug);

  if (!category) notFound();

  const siblings = await apiSafe<Category[]>("/categories/menu", [], { revalidate: 3600 });

  const trail = [
    { label: "Home", href: "/" },
    { label: "Categories", href: "/categories" },
    { label: category.name },
  ];

  return (
    <>
      <JsonLd data={[itemListSchema(category), breadcrumbSchema(trail)]} />

      <div
        className="border-b border-[var(--border-subtle)]"
        style={{
          background: category.color
            ? `linear-gradient(180deg, ${category.color}22, transparent)`
            : undefined,
        }}
      >
        <div className="shell py-8">
          <Breadcrumbs trail={trail} />

          <div className="flex items-start gap-4">
            <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-3xl dark:bg-brand-950/60">
              {category.icon ?? "🏷️"}
            </span>

            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold sm:text-3xl">
                {category.name} Coupons & Deals
              </h1>
              {category.description ? (
                <p className="mt-2 max-w-2xl text-sm text-body sm:text-base">
                  {category.description}
                </p>
              ) : null}
              <p className="mt-3 text-sm font-semibold text-brand-600">
                {formatCount(category.activeCouponCount)} live offers ·{" "}
                {formatCount(category.storeCount)} stores
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="shell py-8">
        <AdSlot position="category-top" className="mb-6" category={category._id} />

        {category.children?.length ? (
          <section className="mb-8">
            <SectionHeading title="Narrow it down" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {category.children.map((child) => (
                <CategoryTile
                  key={child._id}
                  name={child.name}
                  slug={child.slug}
                  icon={child.icon}
                  count={child.activeCouponCount}
                />
              ))}
            </div>
          </section>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-[1fr_19rem]">
          <div className="min-w-0">
            <SectionHeading
              title={`Top ${category.name.toLowerCase()} offers`}
              action={
                <Link
                  href={`/coupons?category=${category.slug}`}
                  className="text-sm font-semibold text-brand-600 hover:underline"
                >
                  See all {formatCount(category.activeCouponCount)} →
                </Link>
              }
            />

            {category.coupons.length ? (
              <div className="space-y-3">
                {category.coupons.map((coupon, index) => (
                  <div key={coupon._id}>
                    <CouponCard coupon={coupon} />
                    {index === 5 ? (
                      <AdSlot
                        position="category-infeed"
                        className="mt-3"
                        category={category._id}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={category.icon ?? "🏷️"}
                title={`No live ${category.name.toLowerCase()} offers`}
                body="Nothing here right now. Try another category or browse everything."
                action={<ButtonLink href="/coupons">All offers</ButtonLink>}
              />
            )}

            {category.coupons.length >= 24 ? (
              <div className="mt-6 text-center">
                <ButtonLink href={`/coupons?category=${category.slug}`} variant="secondary">
                  Load all {formatCount(category.activeCouponCount)} offers
                </ButtonLink>
              </div>
            ) : null}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            {category.stores.length ? (
              <Card>
                <h3 className="mb-2 text-sm font-bold">Stores in {category.name}</h3>
                <div className="-mx-2">
                  {category.stores.slice(0, 10).map((store) => (
                    <StoreCard key={store._id} store={store} variant="row" />
                  ))}
                </div>
                <Link
                  href={`/stores?category=${category.slug}`}
                  className="mt-2 block px-2 text-sm font-semibold text-brand-600 hover:underline"
                >
                  All {category.storeCount} stores →
                </Link>
              </Card>
            ) : null}

            <AdSlot position="sidebar" category={category._id} />

            {siblings.length ? (
              <Card>
                <h3 className="mb-3 text-sm font-bold">Other categories</h3>
                <div className="flex flex-wrap gap-2">
                  {siblings
                    .filter((item) => item._id !== category._id)
                    .slice(0, 14)
                    .map((item) => (
                      <Link
                        key={item._id}
                        href={`/category/${item.slug}`}
                        className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs font-semibold transition hover:border-brand-300 hover:text-brand-600"
                      >
                        {item.icon ? `${item.icon} ` : ""}
                        {item.name}
                      </Link>
                    ))}
                </div>
              </Card>
            ) : null}
          </aside>
        </div>
      </div>
    </>
  );
}
