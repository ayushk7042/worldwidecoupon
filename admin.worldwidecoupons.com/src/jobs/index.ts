import { expireDueCoupons, refreshCategoryCounts } from "../services/counters.service.js";

/**
 * Two housekeeping jobs, run on plain timers.
 *
 * `node-cron` would be a dependency for a schedule this simple, and an
 * interval that drifts by a few seconds is irrelevant when the work is
 * "notice that yesterday's coupons expired".
 */
const HOUR = 60 * 60 * 1000;

let timers: NodeJS.Timeout[] = [];

async function runExpirySweep(): Promise<void> {
  try {
    const expired = await expireDueCoupons();
    if (expired) console.log(`⏰ Expired ${expired} coupons`);
  } catch (error) {
    console.error("⏰ Expiry sweep failed:", error);
  }
}

async function runCounterRefresh(): Promise<void> {
  try {
    await refreshCategoryCounts();
  } catch (error) {
    console.error("🔢 Counter refresh failed:", error);
  }
}

export function startJobs(): void {
  // Run once at boot: the process may have been down when offers lapsed.
  void runExpirySweep();

  timers.push(setInterval(runExpirySweep, HOUR));
  timers.push(setInterval(runCounterRefresh, 6 * HOUR));

  // Without this, an idle server is held open purely by the timers.
  timers.forEach((timer) => timer.unref());

  console.log("⏰ Background jobs started");
}

export function stopJobs(): void {
  timers.forEach((timer) => clearInterval(timer));
  timers = [];
}
