import { connectDB, disconnectDB } from "../config/db.js";
import { CategoryModel } from "../models/Category.js";
import { CouponModel } from "../models/Coupon.js";
import { StoreModel } from "../models/Store.js";

/** A quick sanity report over the imported data. */
async function main(): Promise<void> {
  await connectDB();

  const stores = await StoreModel.find()
    .sort({ activeCouponCount: -1 })
    .select("name slug domain activeCouponCount codeCount dealCount affiliateUrl")
    .lean();

  console.log(`\n🏬 ${stores.length} stores`);
  console.log("   top 10:");
  stores.slice(0, 10).forEach((s) =>
    console.log(`     ${String(s.activeCouponCount).padStart(3)}  ${s.name}  (${s.domain ?? "no domain"})`)
  );

  const noDomain = stores.filter((s) => !s.domain);
  console.log(`   without a domain: ${noDomain.length}`);
  noDomain.slice(0, 10).forEach((s) => console.log(`     ${s.name}`));

  const noOffers = stores.filter((s) => !s.activeCouponCount);
  console.log(`   without live offers: ${noOffers.length}`);
  noOffers.slice(0, 10).forEach((s) => console.log(`     ${s.name}`));

  console.log("\n🗂  categories");
  const categories = await CategoryModel.find()
    .sort({ activeCouponCount: -1 })
    .select("name slug icon activeCouponCount storeCount")
    .lean();
  categories.forEach((c) =>
    console.log(`     ${String(c.activeCouponCount).padStart(4)}  ${c.icon ?? "  "} ${c.name} (${c.storeCount} stores)`)
  );

  console.log("\n🎟  coupons by type");
  const byType = await CouponModel.aggregate([
    { $group: { _id: "$type", n: { $sum: 1 } } },
    { $sort: { n: -1 } },
  ]);
  byType.forEach((r) => console.log(`     ${String(r.n).padStart(5)}  ${r._id}`));

  console.log("\n💰 coupons by discount type");
  const byDiscount = await CouponModel.aggregate([
    { $group: { _id: "$discountType", n: { $sum: 1 } } },
    { $sort: { n: -1 } },
  ]);
  byDiscount.forEach((r) => console.log(`     ${String(r.n).padStart(5)}  ${r._id}`));

  const noLink = await CouponModel.countDocuments({
    $or: [{ destinationUrl: null }, { destinationUrl: "" }],
  });
  console.log(`\n🔗 coupons without a deal link: ${noLink}`);

  console.log("\n📋 sample coupons");
  const sample = await CouponModel.find()
    .limit(5)
    .populate("store", "name")
    .select("title slug type code discountType discountValue destinationUrl store createdAt")
    .lean();

  sample.forEach((c) =>
    console.log(
      `     [${c.type}]${c.code ? " " + c.code : ""} ${c.discountValue ?? ""}${c.discountType === "percent" ? "%" : ""} — ${c.title.slice(0, 55)}\n        store=${(c.store as { name?: string })?.name} slug=${c.slug}\n        → ${String(c.destinationUrl).slice(0, 70)}`
    )
  );

  console.log("");
  await disconnectDB();
}

main().catch(async (e) => {
  console.error(e);
  await disconnectDB().catch(() => undefined);
  process.exit(1);
});
