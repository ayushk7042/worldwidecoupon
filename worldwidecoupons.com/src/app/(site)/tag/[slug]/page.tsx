import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AdSlot } from "@/components/ads/AdSlot";
import { CouponCard } from "@/components/site/CouponCard";
import { ButtonLink } from "@/components/ui/Button";
import { Breadcrumbs, EmptyState, SectionHeading } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { formatCount } from "@/lib/format";
import { JsonLd, breadcrumbSchema } from "@/lib/schema";
import type { TagDetail } from "@/lib/types";

export const revalidate = 600;

async function loadTag(slug: string): Promise<TagDetail | null> {
  try {
    return await api<TagDetail>(`/tags/${encodeURIComponent(slug)}`, { revalidate: 600 });
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
  const tag = await loadTag(slug);

  if (!tag) return { title: "Tag not found" };

  return {
    title: `${tag.name} offers`,
    description: tag.description || `Live coupon codes and deals tagged ${tag.name}.`,
    alternates: { canonical: `/tag/${tag.slug}` },
  };
}

export default async function TagPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tag = await loadTag(slug);

  if (!tag) notFound();

  const trail = [{ label: "Home", href: "/" }, { label: tag.name }];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <JsonLd data={breadcrumbSchema(trail)} />
      <Breadcrumbs trail={trail} />

      <SectionHeading
        eyebrow="Tag"
        title={`${tag.name} offers`}
        subtitle={tag.description || `${formatCount(tag.couponCount)} offers carry this tag.`}
      />

      <AdSlot position="category-top" className="mb-6" />

      {tag.coupons.length ? (
        <div className="space-y-3">
          {tag.coupons.map((coupon) => (
            <CouponCard key={coupon._id} coupon={coupon} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nothing live with this tag"
          body="These offers rotate. Try the full list instead."
          action={<ButtonLink href="/coupons">All offers</ButtonLink>}
        />
      )}
    </div>
  );
}
