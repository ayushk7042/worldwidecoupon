const cron = require("node-cron");
const News = require("../models/News");

/**
 * Flips scheduled articles to published once their time arrives.
 * Runs every minute; a no-op update when nothing is due.
 */
const publishScheduledJob = () => {
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();

      const result = await News.updateMany(
        {
          status: "scheduled",
          scheduledAt: { $ne: null, $lte: now },
          deletedAt: null,
        },
        [
          {
            $set: {
              status: "published",
              publishedDate: { $ifNull: ["$scheduledAt", now] },
              scheduledAt: null,
            },
          },
        ]
      );

      if (result.modifiedCount) {
        console.log(`🗓️  Published ${result.modifiedCount} scheduled article(s)`);
      }
    } catch (err) {
      console.error("publishScheduledJob error:", err.message);
    }
  });

  console.log("🗓️  Scheduled-publish job registered (every minute)");
};

module.exports = publishScheduledJob;
