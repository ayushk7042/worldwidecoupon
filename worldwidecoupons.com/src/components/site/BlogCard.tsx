import { ArrowRight, Calendar, Clock3 } from "lucide-react";
import Link from "next/link";
import { categoryColor, classNames, formatDate } from "@/lib/format";
import type { Blog, Category } from "@/lib/types";
import { CategoryIcon } from "@/components/ui/icons";

/**
 * A listing card. The image is a link to the post *unless* an editor set an
 * `imageLink` — then the picture itself leads straight to the deal it is
 * advertising, and the title underneath is the only way into the post.
 */
export function BlogCard({ post, variant = "grid" }: { post: Blog; variant?: "grid" | "row" }) {
  const href = `/blog/${post.slug}`;
  const date = post.publishedAt ?? post.createdAt;
  const category = (post.categories ?? []).find(
    (item): item is Category => typeof item === "object"
  );
  const tint = category ? categoryColor(category) : undefined;

  if (variant === "row") {
    return (
      <article className="surface group flex gap-3 rounded-2xl border border-[var(--border-subtle)] p-2.5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]">
        {post.image?.url ? (
          /* A fixed height, not a fixed square — a square box forced
             either a crop (object-cover) or blank rail either side
             (object-contain). Sized at its own aspect instead, the whole
             logo shows with nothing cut and no gap to fill. */
          <PostImageLink post={post} className="flex h-16 shrink-0 items-center overflow-hidden rounded-xl bg-[var(--surface-sunken)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.image.url}
              alt={post.image.alt ?? post.title}
              className="h-full w-auto max-w-24 object-contain"
              loading="lazy"
            />
          </PostImageLink>
        ) : null}
        <div className="min-w-0 flex-1">
          <Link href={href} className="line-clamp-2 text-[13px] font-bold leading-snug transition hover:text-brand-700 dark:hover:text-brand-300">
            {post.title}
          </Link>
          <p className="mt-1 flex items-center gap-2 text-[11px] text-faint">
            <span className="flex items-center gap-1">
              <Calendar aria-hidden className="size-3" />
              {formatDate(date)}
            </span>
            <span aria-hidden>·</span>
            <span>{post.readingTime} min read</span>
          </p>
        </div>
      </article>
    );
  }

  return (
    <article className="surface group flex flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]">
      {post.image?.url ? (
        <PostImageLink post={post} className="relative block w-full shrink-0 overflow-hidden bg-[var(--surface-sunken)]">
          {/* Editor-uploaded artwork, like every other brand asset on the
              site. Sized at its own aspect ratio (no forced box) — a fixed
              16:10 crop either sliced a differently-shaped picture or, with
              object-contain, left a band of empty background around it.
              Showing it at its own shape has neither problem. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.image.url}
            alt={post.image.alt ?? post.title}
            width={post.image.width}
            height={post.image.height}
            className="block h-auto max-h-72 w-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
            loading="lazy"
            decoding="async"
          />

          {category ? (
            <span
              className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-[var(--shadow-card)]"
              style={{ backgroundColor: tint }}
            >
              <CategoryIcon name={category.name} className="size-3" />
              {category.name}
            </span>
          ) : null}

          {post.imageLink ? (
            <span className="absolute right-3 top-3 rounded-full bg-ink-950/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
              Deal ↗
            </span>
          ) : null}
        </PostImageLink>
      ) : null}

      <div className="flex flex-1 flex-col gap-2 p-5">
        <Link href={href} className="line-clamp-2 font-display text-lg font-extrabold leading-snug transition hover:text-brand-700 dark:hover:text-brand-300">
          {post.title}
        </Link>

        {post.excerpt ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-body">{post.excerpt}</p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-3">
          <span className="flex min-w-0 items-center gap-3 text-xs text-faint">
            <span className="flex shrink-0 items-center gap-1">
              <Calendar aria-hidden className="size-3.5" />
              {formatDate(date)}
            </span>
            <span className="flex shrink-0 items-center gap-1">
              <Clock3 aria-hidden className="size-3.5" />
              {post.readingTime} min read
            </span>
          </span>

          <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-brand-600 transition hover:gap-1.5 hover:text-brand-700">
            Read more
            <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function PostImageLink({
  post,
  className,
  children,
}: {
  post: Blog;
  className?: string;
  children: React.ReactNode;
}) {
  if (post.imageLink) {
    return (
      <a
        href={post.imageLink}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className={classNames("block", className)}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={`/blog/${post.slug}`} className={classNames("block", className)}>
      {children}
    </Link>
  );
}

/** Compact strip, for a sidebar — "Recent posts" / "Read next". */
export function BlogSidebarList({ title, posts }: { title: string; posts: Blog[] }) {
  if (!posts.length) return null;

  return (
    <section className="surface rounded-2xl border border-[var(--border-subtle)] p-4 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-display text-base font-extrabold">{title}</h2>
        <Link href="/blog" className="ml-auto text-xs font-bold text-brand-600 hover:underline">
          View all
          <ArrowRight aria-hidden className="ml-0.5 inline size-3" />
        </Link>
      </div>
      <div className="space-y-2.5">
        {posts.map((post) => (
          <BlogCard key={post._id} post={post} variant="row" />
        ))}
      </div>
    </section>
  );
}
