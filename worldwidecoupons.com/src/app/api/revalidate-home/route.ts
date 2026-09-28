import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

/** Called by the admin panel after a homepage edit, so the public page
 *  shows it now instead of when the 5-minute cache next expires. */
export async function POST() {
  revalidateTag("homepage");
  revalidateTag("catalog");
  revalidatePath("/");
  revalidatePath("/coupons");
  revalidatePath("/store/[slug]", "page");
  revalidatePath("/category/[slug]", "page");
  revalidatePath("/coupon/[slug]", "page");
  return NextResponse.json({ ok: true });
}
