import { createInterface } from "node:readline/promises";
import { connectDB, disconnectDB } from "../config/db.js";
import { AdminModel } from "../models/Admin.js";

/**
 * Creates or resets the first admin account.
 *
 *   npm run create:admin
 *   npm run create:admin -- --email=a@b.com --password=secret123 --name=Ravi
 */
function readFlags(): Record<string, string> {
  return Object.fromEntries(
    process.argv
      .slice(2)
      .filter((arg) => arg.startsWith("--"))
      .map((arg) => {
        const [key, ...rest] = arg.slice(2).split("=");
        return [key ?? "", rest.join("=")];
      })
  );
}

async function main(): Promise<void> {
  const flags = readFlags();
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  const email = (flags.email || (await rl.question("Email: "))).trim().toLowerCase();
  const password = flags.password || (await rl.question("Password (min 8 chars): "));
  const name = flags.name || (await rl.question("Name [Administrator]: ")) || "Administrator";

  rl.close();

  if (!email.includes("@")) throw new Error("That is not an email address");
  if (password.length < 8) throw new Error("Use at least 8 characters");

  await connectDB();

  const existing = await AdminModel.findOne({ email });

  if (existing) {
    // Re-running this is the documented way to recover a lost password.
    existing.password = password;
    existing.role = "superadmin";
    existing.status = "active";
    await existing.save();

    console.log(`\n✅ Password reset for ${email} (superadmin)\n`);
  } else {
    await AdminModel.create({ name, email, password, role: "superadmin" });
    console.log(`\n✅ Superadmin created: ${email}\n`);
  }

  await disconnectDB();
}

main().catch(async (error) => {
  console.error("\n❌", error instanceof Error ? error.message : error);
  await disconnectDB().catch(() => undefined);
  process.exit(1);
});
