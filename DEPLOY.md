# Deploying worldwidecoupons.com

Two apps, one server (`72.60.221.29`):

| App | Folder | Domain | Port | Process manager |
|---|---|---|---|---|
| API (Express) | `admin.worldwidecoupons.com/` | `admin.worldwidecoupons.com` | `4040` | pm2 → `admin-worldwidecoupons` |
| Site (Next.js) | `worldwidecoupons.com/` | `worldwidecoupons.com` | `3000` | pm2 → `worldwidecoupons-web` |

nginx sits in front of both and terminates HTTPS. GitHub Actions (`.github/workflows/deploy.yml`)
builds and typechecks both apps on every push/PR, and on a push to `main` also
SSHes into the server and rolls the new build out.

## Before any of this works

**DNS isn't pointed at the server yet.** Right now:
- `worldwidecoupons.com` resolves to a Hostinger IP (`93.127.173.205` / `147.79.69.117`), not `72.60.221.29`.
- `admin.worldwidecoupons.com` has no DNS record at all.

At your domain's DNS (Hostinger, since that's where it's hosted now), add/update:

```
A   worldwidecoupons.com          72.60.221.29
A   www.worldwidecoupons.com      72.60.221.29
A   admin.worldwidecoupons.com    72.60.221.29
```

SSL (the `certbot` step below) will fail until these resolve to the server —
DNS changes typically take a few minutes to a few hours to propagate.

## 1. One-time server setup

SSH in as root and run this once. It installs Node 20, nginx, pm2 and
certbot, clones the repo, and gets both nginx vhosts issuing HTTPS.

```bash
ssh root@72.60.221.29

# --- system + Node 20 ---
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx git
npm install -g pm2

# --- get the code (the repo is public, no token needed) ---
mkdir -p /var/www
cd /var/www
git clone https://github.com/ayushk7042/worldwidecoupon.git
cd worldwidecoupon
```

## 2. Fill in the real secrets

Neither `.env` is in git — each app ships only an `.env.example`. Create the
real files on the server:

```bash
cp admin.worldwidecoupons.com/.env.example admin.worldwidecoupons.com/.env
nano admin.worldwidecoupons.com/.env
```

Set at least:
- `PORT=4040`
- `MONGO_URI=` your real connection string
- `JWT_SECRET=` a long random string
- `SITE_URL=https://worldwidecoupons.com`
- `CORS_ORIGINS=https://worldwidecoupons.com,https://www.worldwidecoupons.com,https://admin.worldwidecoupons.com`
- `TRUST_PROXY=true` — the app sits behind nginx now
- `CLOUDINARY_*` — for image uploads to work

```bash
cp worldwidecoupons.com/.env.example worldwidecoupons.com/.env.local
nano worldwidecoupons.com/.env.local
```

Set:
- `API_URL=https://admin.worldwidecoupons.com/api`
- `NEXT_PUBLIC_API_URL=https://admin.worldwidecoupons.com/api`
- `NEXT_PUBLIC_SITE_URL=https://worldwidecoupons.com`

## 3. First build and start

```bash
cd /var/www/worldwidecoupon

cd admin.worldwidecoupons.com && npm ci && npm run build && cd ..
cd worldwidecoupons.com && npm ci && npm run build && cd ..

pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # then run the one command it prints, so pm2 survives a reboot
```

## 4. nginx — one site block per domain

```bash
nano /etc/nginx/sites-available/worldwidecoupons.com
```

```nginx
server {
    server_name worldwidecoupons.com www.worldwidecoupons.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name worldwidecoupons.com www.worldwidecoupons.com;
    return 301 https://$host$request_uri;
}
```

```bash
nano /etc/nginx/sites-available/admin.worldwidecoupons.com
```

```nginx
server {
    server_name admin.worldwidecoupons.com;

    location / {
        proxy_pass http://127.0.0.1:4040;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name admin.worldwidecoupons.com;
    return 301 https://$host$request_uri;
}
```

```bash
ln -s /etc/nginx/sites-available/worldwidecoupons.com /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/admin.worldwidecoupons.com /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

## 5. SSL — only once DNS has propagated (step 0 above)

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d worldwidecoupons.com -d www.worldwidecoupons.com
certbot --nginx -d admin.worldwidecoupons.com
systemctl restart nginx
```

Both sites are now live. Everything after this point is handled by the
GitHub Actions pipeline.

## 6. GitHub Secrets — what the pipeline needs from you

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|---|---|
| `SSH_HOST` | `72.60.221.29` |
| `SSH_USER` | `root` |
| `SSH_PASSWORD` | the server's root password |

That's it — three secrets. Push to `main` and the `deploy` job in
`.github/workflows/deploy.yml` SSHes in, pulls, rebuilds both apps, and
reloads them with pm2 (zero-downtime).

**Recommended next step, not required to get this working today:** switch
from a password to an SSH key, since a password sitting in GitHub Secrets is
weaker than it needs to be:

```bash
# on your own machine
ssh-keygen -t ed25519 -C "github-actions-deploy" -f deploy_key -N ""
ssh-copy-id -i deploy_key.pub root@72.60.221.29
cat deploy_key   # paste this whole thing into a new secret named SSH_KEY
```

Then in `deploy.yml`, swap the `password:` line for `key: ${{ secrets.SSH_KEY }}`
and delete the `SSH_PASSWORD` secret. Also worth doing at some point since the
root password was pasted into a chat: change it (`passwd` on the server)
after the key-based switch is confirmed working.

## Redeploying after this

Nothing manual — just `git push origin main`. To trigger a deploy without a
new commit, use the **Run workflow** button on the *CI & Deploy* workflow in
the Actions tab (it's wired to `workflow_dispatch`).

## Checking it worked

```bash
curl https://admin.worldwidecoupons.com/api/health
curl -I https://worldwidecoupons.com
pm2 status
pm2 logs admin-worldwidecoupons --lines 50
pm2 logs worldwidecoupons-web --lines 50
```
