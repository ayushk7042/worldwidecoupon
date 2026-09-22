// dotenv must run before anything that reads process.env at require time
// (Cloudinary is configured the moment its module is loaded).
require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

const dailyAutoUpdateJob = require("./jobs/dailyAutoUpdate.job");
const publishScheduledJob = require("./jobs/publishScheduled.job");

const PORT = process.env.PORT;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    // Start cron jobs only after DB is connected
    dailyAutoUpdateJob();
    publishScheduledJob();
  })
  .catch((err) => {
    console.error("❌ Could not connect to MongoDB, exiting:", err);
    process.exit(1);
  });
