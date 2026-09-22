import type { Metadata } from "next";
import { AdSlot } from "@/components/ads/AdSlot";
import { CategoryTile } from "@/components/site/StoreCard";
import { Breadcrumbs, EmptyState, SectionHeading } from "@/components/ui/primitives";
import { apiSafe } from "@/lib/api";
import { formatCount } from "@/lib/format";
import type { Category } from "@/lib/types";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Browse every category",
  description:
    "Fashion, travel, electronics, food and more — pick a category to see the live coupon codes and deals inside it.",
  alternates: { canonical: "/categories" },
};

export default async function CategoriesPage() {
  const categories = await apiSafe<Category[]>("/categories", [], {
    query: { shape: "tree", limit: 200 },
    revalidate: 3600,
  });

  const total = categories.reduce((sum, item) => sum + item.activeCouponCount, 0);

  return (
    <div className="shell py-8">
      <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "Categories" }]} />

      <SectionHeading
        eyebrow="Browse"
        title="Every category"
        subtitle={`${formatCount(total)} live offers, sorted into ${categories.length} categories.`}
      />

      <AdSlot position="category-top" className="mb-6" />

      {categories.length ? (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {categories.map((category) => (
              <CategoryTile
                key={category._id}
                name={category.name}
                slug={category.slug}
                icon={category.icon}
                count={category.activeCouponCount}
              />
            ))}
          </div>

          {categories
            .filter((category) => category.children?.length)
            .map((parent) => (
              <section key={`children-${parent._id}`}>
                <h2 className="mb-3 text-lg font-bold">
                  {parent.icon ? `${parent.icon} ` : ""}
                  {parent.name}
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {parent.children?.map((child) => (
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
            ))}
        </div>
      ) : (
        <EmptyState title="No categories yet" body="Once coupons are imported, categories appear here." />
      )}
    </div>
  );
}
