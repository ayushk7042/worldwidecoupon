import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../config/db.js";

/** Quick "what is actually in the database" check, for support and debugging. */
async function main(): Promise<void> {
  await connectDB();

  const db = mongoose.connection.db;
  if (!db) throw new Error("No database handle");

  const names = (await db.listCollections().toArray()).map((c) => c.name).sort();

  console.log(`\n📦 ${mongoose.connection.name}`);
  if (!names.length) console.log("   (empty)");

  for (const name of names) {
    const count = await db.collection(name).countDocuments();
    console.log(`   ${name.padEnd(20)} ${count}`);
  }

  console.log("");
  await disconnectDB();
}

main().catch(async (error) => {
  console.error("❌", error instanceof Error ? error.message : error);
  await disconnectDB().catch(() => undefined);
  process.exit(1);
});
