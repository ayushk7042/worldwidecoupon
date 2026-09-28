# WorldwideCoupons API

TypeScript backend for worldwidecoupons.com — stores, categories, coupon codes,
deals and the outbound deal links that pay for the site.

Express 5 · Mongoose 8 · Zod · Node 20+

---

## Getting started

```bash
npm install
cp .env.example .env        # fill in MONGO_URI and JWT_SECRET
npm run seed:wipe           # load the WordPress export (wipes first)
npm run create:admin        # make a superadmin
npm run dev                 # http://localhost:4000
```

| Script                | What it does                                              |
| --------------------- | --------------------------------------------------------- |
| `npm run dev`          | Watch mode via `tsx`                                       |
| `npm run build`        | Compile to `dist/`                                         |
| `npm start`            | Run the compiled build                                     |
| `npm run typecheck`    | `tsc --noEmit`                                             |
| `npm run seed`         | Import the export, upserting by WordPress id               |
| `npm run seed:wipe`    | Drop coupons/stores/categories, then import                |
| `npm run create:admin` | Create — or reset the password of — a superadmin           |

`npm run seed` looks for `data/coupons-export.csv`, then
`~/Downloads/Coupons-Export-*.csv`. Pass a path to override:

```bash
npm run seed -- ./some/other/export.csv --wipe
```

---

## The domain

**Store** — a retailer. Holds `affiliateUrl` (monetised) and `websiteUrl`
(plain). `outboundUrl()` picks the right one and attaches tracking.

**Category** — a browse facet. Self-referencing via `parent`, so the tree is
one collection.

**Coupon** — one offer at one store. `type` decides how the card behaves:

| type           | behaviour                                              |
| -------------- | ------------------------------------------------------ |
| `code`         | Shopper reveals a code, we copy it and open the store   |
| `deal`         | No code — the link is the discount, so it just redirects |
| `freeshipping` | A deal, labelled and filterable as free delivery        |
| `bogo`         | Buy-one-get-one                                        |
| `cashback`     | Rebate rather than a discount                          |
| `giftcard`     | Gift-card or voucher offer                             |
| `printable`    | Code-bearing, but redeemed in store                    |

`discountType` + `discountValue` drive the badge (`40% OFF`, `$15 OFF`,
`FREE SHIPPING`). `discountLabel` overrides it when an editor wants exact copy.

**ClickEvent** — one row per outbound click, kept for six months. This is what
reconciles against affiliate-network reports.

### Why codes are hidden in list responses

`GET /api/coupons` never returns `code`, only `hasCode`. The codes *are* the
product: returning them in a listing lets anyone scrape every code without ever
following a store link, which is how the site earns. The real value comes back
from `POST /api/coupons/:id/reveal`, which is rate-limited and counted.

Signed-in admins get the code in every response, because the panel needs it.

---

## API

Everything is under `/api`. Responses are
`{ success, data, message?, pagination?, meta? }` or
`{ success: false, message, details? }`.

### Public

```
GET    /health

GET    /coupons                      ?page &limit &store &category &tag &type
                                     &search &sort &featured &exclusive &verified
                                     &withCode &expiringSoon &minDiscount
GET    /coupons/feed                 every homepage rail in one call
GET    /coupons/:idOrSlug
GET    /coupons/:idOrSlug/related
POST   /coupons/:id/reveal           returns the code + deal link, counts a use
GET    /coupons/:id/go               302 to the deal link, counts a click
POST   /coupons/:id/vote             { worked: boolean }

GET    /stores                       ?page &limit &search &category &letter
                                     &status &sort &featured &withOffers
GET    /stores/letters               A–Z counts for the browse rail
GET    /stores/directory             the full A–Z index, grouped
GET    /stores/:idOrSlug             store + its live and expired offers
GET    /stores/:id/go                302 to the store's affiliate link
POST   /stores/:id/click             same, as JSON

GET    /categories                   ?status &shape=flat|tree &parent &featured
GET    /categories/menu              trimmed tree for the nav
GET    /categories/:idOrSlug         category + its stores and coupons

GET    /tags        /tags/:idOrSlug
GET    /search?q=   /search/suggest?q=
GET    /homepage                     curated, with automatic fallbacks
GET    /ads/serve?position=&device=
POST   /ads/:id/click
POST   /contact
```

### Shopper accounts

```
POST   /account/register  /account/login  /account/logout
GET    /account/me                   PATCH /account/me
GET    /account/saved                POST  /account/saved/:id        (toggle)
GET    /account/favourites           POST  /account/favourites/:id   (toggle)
GET    /account/feed                 new offers from followed stores
```

### Admin

Bearer token or the `token` cookie. Permissions: `canPublish`, `canDelete`,
`canManageStores`, `canManageUsers`, `canImport`. `superadmin` bypasses all.

```
POST   /auth/login  /auth/logout     GET /auth/me
POST   /auth/change-password
GET    /auth/admins   POST /auth/admins   PUT|DELETE /auth/admins/:id

POST   /coupons                      PUT|DELETE /coupons/:id
PATCH  /coupons/:id/status           POST /coupons/:id/verify
POST   /coupons/bulk/status          POST /coupons/bulk/delete

POST   /stores                       PUT|DELETE /stores/:id
POST   /stores/:id/refresh           recompute this store's counters
POST   /stores/bulk/status

POST   /categories                   PUT|DELETE /categories/:id
POST   /categories/reorder           POST /categories/refresh-counts

GET    /dashboard                    headline numbers
GET    /dashboard/top?days=30        what is actually earning
GET    /dashboard/attention          the editorial work queue

GET    /media       POST /media/upload (multipart)  POST /media/register
PATCH|DELETE /media/:id

GET|PUT /homepage/config

POST   /import/preview               dry run, writes nothing
POST   /import/wordpress?mode=upsert|replace
GET    /import/jobs   GET /import/jobs/:id
POST   /import/jobs/:id/rollback
```

---

## The WordPress import

`src/services/import/` turns the export CSV into this schema. The export is
messy in repeatable ways, and each quirk is handled explicitly:

- Names are double HTML-encoded (`h&amp;m`, `BJ&quot;s`) — decoded twice.
- `coupon_code` is free text an editor sometimes filled with a URL or their own
  name. Anything that is not a plausible code is dropped and reported.
- Three URL columns hold the same link: `coupon_affiliate` wins, then
  `coupon_url`, then `coupon_spec_link` as the deep link.
- The discount only exists in the title, so it is parsed out of it. Currency
  amounts are only read as a saving when the copy says "off"/"save" — a
  "price starts at $18" title is not an $18 discount.
- A published row with no store gets one derived from its link's registrable
  domain (`india.resellerclub.com` → Resellerclub, not "India").
- Drafts carry the epoch as their date, which is treated as no date.
- Nothing in the export carries an expiry, so every imported offer is
  `neverExpires`. Guessing dates would silently kill live offers.

Store logos are not in the export; they default to a domain-derived URL from
`LOGO_SERVICE` and are replaced the moment an editor uploads a real one.

Every run writes an `ImportJob` recording what it created, so
`POST /import/jobs/:id/rollback` can undo it. Rows it *updated* are not
restored — an upsert overwrites in place.

---

## Layout

```
src/
  config/        env (zod-validated), db, cloudinary, upload
  models/        Mongoose schemas + their TypeScript interfaces
  validators/    zod schemas — every request body and query is parsed
  services/      business logic: counters, clicks, coupon views, import
  controllers/   thin HTTP layer
  routes/        one file per resource, mounted in routes/index.ts
  middlewares/   auth, validation, rate limits, error handling
  jobs/          hourly expiry sweep, six-hourly counter refresh
  scripts/       seed, createAdmin, inspect, audit
  utils/         text, urls, slugs, sanitising, ids, responses
legacy-js/       the previous CommonJS backend, kept for reference
```

### Conventions

- **Validate at the edge.** Zod parses body/query/params in middleware, so
  controllers can trust their input.
- **Throw `ApiError`.** Anything else reaching the error handler is treated as
  a bug: logged in full, reported as a generic 500 in production.
- **Counters are denormalised.** `activeCouponCount` and friends are
  recomputed in `services/counters.service.ts`; every write that could change
  them calls in there.
- **Analytics never block.** Click and view writes are fire-and-forget. A lost
  click beats a slow redirect.

---

## Operations

```bash
npx tsx src/scripts/inspect.ts   # collection counts
npx tsx src/scripts/audit.ts     # data-quality report over the import
```

Background jobs run in-process (`ENABLE_CRON=true`): an hourly sweep that
expires offers past their date, and a six-hourly category counter refresh.
Turn them off on replicas so only one instance does the work.
