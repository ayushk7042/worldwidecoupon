import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { connectDB, disconnectDB } from "../config/db.js";
import { CategoryModel } from "../models/Category.js";
import { CouponModel } from "../models/Coupon.js";
import { StoreModel } from "../models/Store.js";
import { importWordpressCsv } from "../services/import/importer.js";

/**
 * Loads the WordPress coupon export into the database.
 *
 *   npm run seed            — upsert by legacy WordPress id
 *   npm run seed:wipe       — drop coupons/stores/categories first
 *   npm run seed -- ./x.csv — a different file
 */

const DEFAULT_LOCATIONS = [
  "./data/coupons-export.csv",
  "./Coupons-Export-2026-September-21-0900.csv",
  resolve(homedir(), "Downloads/Coupons-Export-2026-September-21-0900.csv"),
];

function resolveCsvPath(args: string[]): string {
  const explicit = args.find((arg) => arg.toLowerCase().endsWith(".csv"));

  if (explicit) {
    const path = resolve(explicit);
    if (!existsSync(path)) {
      throw new Error(`No CSV at ${path}`);
    }
    return path;
  }

  for (const candidate of DEFAULT_LOCATIONS) {
    const path = resolve(candidate);
    if (existsSync(path)) return path;
  }

  throw new Error(
    `Could not find the export. Pass a path:\n  npm run seed -- ./path/to/export.csv\n\nLooked in:\n${DEFAULT_LOCATIONS.map((p) => `  ${resolve(p)}`).join("\n")}`
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const wipe = args.includes("--wipe") || args.includes("--replace");

  const csvPath = resolveCsvPath(args);

  console.log(`\n📄 Reading ${csvPath}`);
  const csv = readFileSync(csvPath, "utf8");

  await connectDB();

  if (wipe) {
    console.log("🗑️  Wiping coupons, stores and categories…");
  }

  let lastLogged = 0;

  const result = await importWordpressCsv(csv, {
    mode: wipe ? "replace" : "upsert",
    fileName: csvPath.split("/").pop(),
    onProgress: (done, total) => {
      // One line every 100 rows — enough to see it working, quiet enough to read.
      if (done - lastLogged >= 100 || done === total) {
        lastLogged = done;
        process.stdout.write(`\r   ${done}/${total} rows…`);
      }
    },
  });

  process.stdout.write("\n");

  const [categories, stores, coupons, live, codes] = await Promise.all([
    CategoryModel.countDocuments(),
    StoreModel.countDocuments(),
    CouponModel.countDocuments(),
    CouponModel.countDocuments({ status: "active" }),
    CouponModel.countDocuments({ status: "active", code: { $ne: null } }),
  ]);

  console.log(`
✅ Import finished in ${(result.durationMs / 1000).toFixed(1)}s

   rows read        ${result.totalRows}
   coupons created  ${result.created}
   coupons updated  ${result.updated}
   rows skipped     ${result.skipped}
   stores created   ${result.storesCreated}
   categories made  ${result.categoriesCreated}
   notes            ${result.issues.length}

   ── in the database ──
   categories       ${categories}
   stores           ${stores}
   coupons          ${coupons}  (${live} live, ${codes} with a code)
`);

  if (result.issues.length) {
    console.log("   First few notes:");
    result.issues.slice(0, 10).forEach((issue) => {
      console.log(`     row ${issue.row}: ${issue.message}`);
    });
    if (result.issues.length > 10) {
      console.log(`     …and ${result.issues.length - 10} more`);
    }
  }

  await disconnectDB();
}

main().catch(async (error) => {
  console.error("\n❌ Seed failed:", error instanceof Error ? error.message : error);
  await disconnectDB().catch(() => undefined);
  process.exit(1);
});
