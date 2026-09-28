import mongoose from "mongoose";
import { env, isProduction } from "./env.js";

mongoose.set("strictQuery", true);

let connecting: Promise<typeof mongoose> | null = null;

/**
 * Connects once and reuses the handle. Scripts (seed, create-admin) call this
 * too, so it must be safe to invoke from anywhere rather than only at boot.
 */
export async function connectDB(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) return mongoose;
  if (connecting) return connecting;

  connecting = mongoose
    .connect(env.MONGO_URI, {
      // Index builds are convenient in development and a foot-gun on a large
      // production collection, so they are opt-out there.
      autoIndex: !isProduction,
      serverSelectionTimeoutMS: 15_000,
      maxPoolSize: 20,
    })
    .then((handle) => {
      console.log(`✅ MongoDB connected — ${handle.connection.name}`);
      return handle;
    })
    .catch((error) => {
      connecting = null;
      throw error;
    });

  return connecting;
}

export async function disconnectDB(): Promise<void> {
  connecting = null;
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}

mongoose.connection.on("error", (error) => {
  console.error("❌ MongoDB error:", error);
});

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️  MongoDB disconnected");
});
