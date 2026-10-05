import { ArrowLeft, ArrowRight, Calendar, Eye, Tag as TagIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AdSlot } from "@/components/ads/AdSlot";
import { BlogSidebarList } from "@/components/site/BlogCard";
import { ButtonLink } from "@/components/ui/Button";
import { Breadcrumbs, StoreLogo } from "@/components/ui/primitives";
import { api, apiBase, apiSafe } from "@/lib/api";
import { formatCount, timeAgo } from "@/lib/format";
import { JsonLd, articleSchema, breadcrumbSchema } from "@/lib/schema";
import type { Blog, BlogDetail } from "@/lib/types";

export const revalidate = 300;

async function loadPost(slug: string): Promise<BlogDetail | null> {
  try {
    return await api<BlogDetail>(`/blog/${encodeURIComponent(slug)}`, { revalidate: 300 });
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
  const post = await loadPost(slug);
  if (!post) return { title: "Post not found" };

  const title = post.metaTitle || post.title;
  const description = post.metaDescription || post.excerpt || post.title;

  return {
    title,
    description,
    alternates: { canonical: post.canonicalUrl || `/blog/${post.slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      url: `/blog/${post.slug}`,
      images: post.image?.url ? [{ url: post.image.url }] : undefined,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) notFound();

  const store = typeof post.store === "object" ? post.store : null;
  const date = post.publishedAt ?? post.createdAt;

  const recent = await apiSafe<Blog[]>("/blog", [], {
    query: { limit: 6, sort: "newest" },
    revalidate: 300,
  }).then((items) => items.filter((item) => item.slug !== post.slug).slice(0, 5));

  const trail = [{ label: "Home", href: "/" }, { label: "Blog", href: "/blog" }, { label: post.title }];

  // A standard news-article hero: full column width, capped so an
  // unusually tall source never pushes the fold too far down. On a wide
  // monitor the column gets wider than 34rem/1.9:1 lets an ordinary
  // landscape banner reach without that cap clipping its height first —
  // the box stayed wider than object-contain's fitted image, showing
  // blank rail on both sides. object-cover fills the box edge to edge
  // instead, trimming a sliver off the top and bottom to do it.
  const heroImage = post.image?.url ? (
    <div className="relative overflow-hidden rounded-3xl bg-[var(--surface-sunken)] shadow-[var(--shadow-card)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={post.image.url}
        alt={post.image.alt ?? post.title}
        width={post.image.width}
        height={post.image.height}
        className="block h-auto max-h-[34rem] w-full object-cover"
        loading="eager"
      />
      {post.imageLink ? (
        <span className="absolute right-3 top-3 rounded-full bg-ink-950/60 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
          Deal ↗
        </span>
      ) : null}
    </div>
  ) : null;

  return (
    <>
      <JsonLd data={[articleSchema(post), breadcrumbSchema(trail)]} />

      <div className="shell pt-6">
        <Breadcrumbs trail={trail} />

        <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <article className="min-w-0">
            <header className="mb-5">
              <div className="flex flex-wrap items-center gap-2">
                {(post.categories ?? []).map((category) =>
                  typeof category === "object" ? (
                    <Link
                      key={category._id}
                      href={`/blog?category=${category.slug}`}
                      className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700 transition hover:bg-brand-100 dark:bg-brand-950/70 dark:text-brand-300"
                    >
                      {category.name}
                    </Link>
                  ) : null
                )}
              </div>

              <h1 className="mt-3 font-display text-2xl font-extrabold leading-tight sm:text-3xl lg:text-4xl">
                {post.title}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-body">
                <span className="font-semibold">{post.authorName || "WorldwideCoupons Team"}</span>
                <span className="flex items-center gap-1 text-faint">
                  <Calendar aria-hidden className="size-3.5" />
                  {timeAgo(date)}
                </span>
                <span className="flex items-center gap-1 text-faint">
                  <Eye aria-hidden className="size-3.5" />
                  {formatCount(post.views)} views
                </span>
              </div>
            </header>

            {post.imageLink ? (
              <a href={post.imageLink} target="_blank" rel="noopener noreferrer sponsored" className="mb-6 block">
                {heroImage}
              </a>
            ) : (
              heroImage ? <div className="mb-6">{heroImage}</div> : null
            )}

            <div className="prose-article" dangerouslySetInnerHTML={{ __html: post.body }} />

            {post.tagNames?.length ? (
              <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-5">
                <TagIcon aria-hidden className="size-4 text-faint" />
                {post.tagNames.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[var(--surface-sunken)] px-2.5 py-1 text-xs font-semibold text-body"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}

            <AdSlot position="blog-inline" className="mt-8" />

            {post.previous || post.next ? (
              <nav className="mt-8 grid grid-cols-1 gap-3 border-t border-[var(--border-subtle)] pt-6 sm:grid-cols-2">
                {post.previous ? (
                  <Link
                    href={`/blog/${post.previous.slug}`}
                    className="group flex items-center gap-2 rounded-2xl border border-[var(--border-subtle)] p-3.5 transition hover:border-brand-300 hover:shadow-[var(--shadow-card)]"
                  >
                    <ArrowLeft aria-hidden className="size-4 shrink-0 text-faint transition group-hover:-translate-x-0.5" />
                    <span className="min-w-0">
                      <span className="block text-[11px] font-bold uppercase tracking-wide text-faint">Previous</span>
                      <span className="block truncate text-sm font-bold">{post.previous.title}</span>
                    </span>
                  </Link>
                ) : (
                  <span />
                )}
                {post.next ? (
                  <Link
                    href={`/blog/${post.next.slug}`}
                    className="group flex items-center justify-end gap-2 rounded-2xl border border-[var(--border-subtle)] p-3.5 text-right transition hover:border-brand-300 hover:shadow-[var(--shadow-card)]"
                  >
                    <span className="min-w-0">
                      <span className="block text-[11px] font-bold uppercase tracking-wide text-faint">Next</span>
                      <span className="block truncate text-sm font-bold">{post.next.title}</span>
                    </span>
                    <ArrowRight aria-hidden className="size-4 shrink-0 text-faint transition group-hover:translate-x-0.5" />
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </article>

          <aside className="space-y-4 lg:sticky lg:top-28 lg:h-fit">
            {store ? (
              <section className="surface rounded-2xl border border-[var(--border-subtle)] p-4 shadow-[var(--shadow-card)]">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-faint">This post is about</p>
                <Link href={`/store/${store.slug}`} className="flex items-center gap-3">
                  <StoreLogo name={store.name} logo={store.logo} size={44} />
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{store.name}</span>
                    <span className="block text-xs text-faint">{formatCount(store.activeCouponCount)} live offers</span>
                  </span>
                </Link>
                <ButtonLink href={`/store/${store.slug}`} full className="mt-3">
                  See {store.name} coupons
                </ButtonLink>
                {store._id ? (
                  <ButtonLink href={`${apiBase()}/stores/${store._id}/go`} external variant="secondary" full className="mt-2">
                    Visit {store.name} ↗
                  </ButtonLink>
                ) : null}
              </section>
            ) : null}

            <AdSlot position="blog-sidebar" label />
            <BlogSidebarList title="More from the blog" posts={recent} />
          </aside>
        </div>
      </div>
    </>
  );
}
