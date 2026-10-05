import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

/** Called by the admin panel after a post is saved, published or deleted,
 *  so the public blog shows it now instead of when the cache next expires. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}) as { slug?: string });

  revalidatePath("/blog");
  if (body.slug) revalidatePath(`/blog/${body.slug}`, "page");

  return NextResponse.json({ ok: true });
}
