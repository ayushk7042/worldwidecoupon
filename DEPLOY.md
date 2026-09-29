# Deploying worldwidecoupons.com

The server (`72.61.238.124`) runs **CloudPanel**, a hosting control panel
that already manages several other client sites. Each site there — ours
included — is its own Linux user with its own home directory, its own pm2
daemon, and its own nginx vhost that CloudPanel generated. That isolation is
exactly what keeps a deploy of this project from ever being able to touch
anyone else's site on the box.

| App | Site user | Path | Port | pm2 process |
|---|---|---|---|---|
| API (Express) | `worldwidecoupons-admin` | `/home/worldwidecoupons-admin/htdocs/admin.worldwidecoupons.com` | `3002` | `admin-worldwidecoupons` |
| Site (Next.js) | `worldwidecoupons` | `/home/worldwidecoupons/htdocs/worldwidecoupons.com` | `3001` | `worldwidecoupons-web` |

Both sites, their nginx vhosts, and their pm2 process managers already exist
on the server — this was done once, by hand, following the steps below.
GitHub Actions (`.github/workflows/deploy.yml`) builds and typechecks both
apps on every push/PR, and on a push to `main` also SSHes in and rolls the
new build out to both.

## Before the public domains work

**DNS isn't pointed at this server yet.** At your domain's DNS, add/update:

```
A   worldwidecoupons.com          72.61.238.124
A   www.worldwidecoupons.com      72.61.238.124
A   admin.worldwidecoupons.com    72.61.238.124
```

Until DNS resolves here, the sites are only reachable by IP with a `Host`
header override (see *Checking it worked* below) — and Let's Encrypt SSL
(next section) will fail until DNS is live.

## 1. One-time server setup (already done — kept here for reference)

Each site was created with CloudPanel's own CLI, not by hand-writing nginx —
that's what keeps it from being able to collide with any other site:

```bash
clpctl site:add:nodejs --domainName=worldwidecoupons.com --nodejsVersion=22 --appPort=3001 \
  --siteUser=worldwidecoupons --siteUserPassword='<generated>'

clpctl site:add:nodejs --domainName=admin.worldwidecoupons.com --nodejsVersion=22 --appPort=3002 \
  --siteUser=worldwidecoupons-admin --siteUserPassword='<generated>'
```

This creates the Linux user, the `htdocs` folder, a self-signed cert (so
nginx has something to serve until Let's Encrypt runs), and an nginx vhost
that reverse-proxies to `127.0.0.1:<appPort>`.

Each site user's shell needed the usual nvm init lines appended to
`~/.bashrc` (freshly created users didn't have them yet, even though Node
was already installed via nvm for that user):

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && . "$NVM_DIR/bash_completion"
```

Then, as each site user, pm2 was installed into *that user's own* nvm Node —
this gives each app its own pm2 daemon, isolated from every other site's:

```bash
su - worldwidecoupons -c 'npm install -g pm2'
su - worldwidecoupons-admin -c 'npm install -g pm2'
```

## 2. Getting the code onto the server

A single clone acts as the source the two site folders are copied from —
this is what `git pull` on the server, and the CI pipeline, both refresh:

```bash
git clone https://github.com/ayushk7042/worldwidecoupon.git /root/wwc-src

rsync -a --exclude='.git' /root/wwc-src/worldwidecoupons.com/ \
  /home/worldwidecoupons/htdocs/worldwidecoupons.com/
rsync -a --exclude='.git' /root/wwc-src/admin.worldwidecoupons.com/ \
  /home/worldwidecoupons-admin/htdocs/admin.worldwidecoupons.com/

chown -R worldwidecoupons:worldwidecoupons /home/worldwidecoupons/htdocs/worldwidecoupons.com
chown -R worldwidecoupons-admin:worldwidecoupons-admin /home/worldwidecoupons-admin/htdocs/admin.worldwidecoupons.com
```

## 3. The real secrets

Neither `.env` is in git. These were written directly onto the server (not
committed anywhere) as the respective site user's `.env`:

`/home/worldwidecoupons-admin/htdocs/admin.worldwidecoupons.com/.env`:
- `PORT=3002`
- `NODE_ENV=production`
- `MONGO_URI=`, `JWT_SECRET=`, `CLOUDINARY_*` — the real values
- `SITE_URL=https://worldwidecoupons.com`
- `CORS_ORIGINS=https://worldwidecoupons.com,https://www.worldwidecoupons.com,https://admin.worldwidecoupons.com`
- `TRUST_PROXY=true` — the app sits behind nginx now

`/home/worldwidecoupons/htdocs/worldwidecoupons.com/.env.local`:
- `PORT=3001`
- `API_URL=https://admin.worldwidecoupons.com/api`
- `NEXT_PUBLIC_API_URL=https://admin.worldwidecoupons.com/api`
- `NEXT_PUBLIC_SITE_URL=https://worldwidecoupons.com`

## 4. First build and start

```bash
su - worldwidecoupons-admin -c 'cd htdocs/admin.worldwidecoupons.com && npm ci && npm run build'
su - worldwidecoupons-admin -c 'cd htdocs/admin.worldwidecoupons.com && pm2 start dist/server.js --name admin-worldwidecoupons'
su - worldwidecoupons-admin -c 'pm2 save'

su - worldwidecoupons -c 'cd htdocs/worldwidecoupons.com && npm ci && npm run build'
su - worldwidecoupons -c 'cd htdocs/worldwidecoupons.com && pm2 start node_modules/.bin/next --name worldwidecoupons-web -- start -p 3001'
su - worldwidecoupons -c 'pm2 save'
```

Then, **as root**, register each user's pm2 as a systemd service so it
survives a reboot (pm2 prints the exact command to run — it differs per
user because it embeds that user's own Node path):

```bash
su - worldwidecoupons-admin -c 'pm2 startup systemd -u worldwidecoupons-admin --hp /home/worldwidecoupons-admin'
# copy the "sudo env PATH=... pm2 startup ..." line it prints, run it as root

su - worldwidecoupons -c 'pm2 startup systemd -u worldwidecoupons --hp /home/worldwidecoupons'
# same — copy and run the line it prints, as root
```

## 5. SSL — only once DNS has propagated (step 0 above)

```bash
clpctl lets-encrypt:install:certificate --domainName=worldwidecoupons.com --subjectAlternativeName=www.worldwidecoupons.com
clpctl lets-encrypt:install:certificate --domainName=admin.worldwidecoupons.com
```

Both sites are now live. Everything after this point is handled by the
GitHub Actions pipeline.

## 6. GitHub Secrets — what the pipeline needs from you

A dedicated `github-actions-deploy-wwc` SSH key was generated and its public
half installed in the server's `~/.ssh/authorized_keys` for `root`. `deploy.yml`
is wired to use this key.

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|---|---|
| `SSH_HOST` | `72.61.238.124` |
| `SSH_USER` | `root` |
| `SSH_KEY` | the private half of the deploy key (given to you separately — starts with `-----BEGIN OPENSSH PRIVATE KEY-----`) |

That's it — three secrets. Push to `main` and the `deploy` job in
`.github/workflows/deploy.yml` SSHes in as root, refreshes `/root/wwc-src`,
copies each app's files into its own site user's folder (never touching
`.env`), then asks that user's own pm2 to rebuild and reload — never
touching any other site's user, folder, or pm2 daemon.

**Worth doing at some point:** the root password was pasted into a chat
earlier in this project, so treat it as no longer secret — change it
(`passwd`, while SSH'd in with the key above) whenever convenient. The
deploy key keeps working either way.

## Redeploying after this

Nothing manual — just `git push origin main`. To trigger a deploy without a
new commit, use the **Run workflow** button on the *CI & Deploy* workflow in
the Actions tab (it's wired to `workflow_dispatch`).

## Checking it worked

Before DNS is live, hit it by IP with a `Host` header:

```bash
curl -sk https://admin.worldwidecoupons.com/api/health --resolve admin.worldwidecoupons.com:443:72.61.238.124
curl -Isk https://worldwidecoupons.com --resolve worldwidecoupons.com:443:72.61.238.124
```

After DNS is live:

```bash
curl https://admin.worldwidecoupons.com/api/health
curl -I https://worldwidecoupons.com
```

Process status, either way:

```bash
su - worldwidecoupons-admin -c 'pm2 status'
su - worldwidecoupons -c 'pm2 status'
su - worldwidecoupons-admin -c 'pm2 logs admin-worldwidecoupons --lines 50 --nostream'
su - worldwidecoupons -c 'pm2 logs worldwidecoupons-web --lines 50 --nostream'
```
