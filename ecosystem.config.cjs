/**
 * pm2 process definitions for both apps on the production server.
 *
 * Each app is built first (`npm run build`), then started from its
 * production output — not `next dev` / `tsx watch` — so a crash restarts
 * cleanly and memory use stays sane under pm2's supervision.
 *
 * Usage on the server, from the repo root:
 *   pm2 start ecosystem.config.cjs        # first run
 *   pm2 reload ecosystem.config.cjs        # after a new deploy
 */
module.exports = {
  apps: [
    {
      name: "admin-worldwidecoupons",
      cwd: "./admin.worldwidecoupons.com",
      script: "dist/server.js",
      env: { NODE_ENV: "production" },
      instances: 1,
      autorestart: true,
      max_memory_restart: "400M",
    },
    {
      name: "worldwidecoupons-web",
      cwd: "./worldwidecoupons.com",
      script: "npm",
      args: "start",
      env: { NODE_ENV: "production" },
      instances: 1,
      autorestart: true,
      max_memory_restart: "600M",
    },
  ],
};
