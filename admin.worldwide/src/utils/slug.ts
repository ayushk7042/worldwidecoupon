import type { Model } from "mongoose";
import { slugify } from "./text.js";

/**
 * Produces a slug that is free in `model`, keeping the current document's own
 * slug when it is only being re-saved.
 *
 * Collisions get `-2`, `-3`, … rather than a timestamp so URLs stay readable
 * and, more importantly, stable across a re-import of the same data.
 */
export async function uniqueSlug(
  model: Model<any>,
  source: string,
  excludeId?: string | null
): Promise<string> {
  const base = slugify(source);

  for (let attempt = 0; attempt < 200; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;

    const query: Record<string, unknown> = { slug: candidate };
    if (excludeId) query._id = { $ne: excludeId };

    const clash = await model.exists(query);
    if (!clash) return candidate;
  }

  return `${base}-${Date.now().toString(36)}`;
}

/** In-memory variant for bulk imports, where a DB round trip per row is too slow. */
export function uniqueSlugInSet(source: string, taken: Set<string>): string {
  const base = slugify(source);

  let candidate = base;
  let attempt = 1;

  while (taken.has(candidate)) {
    attempt += 1;
    candidate = `${base}-${attempt}`;
  }

  taken.add(candidate);
  return candidate;
}
