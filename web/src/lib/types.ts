/**
 * The shapes the API returns.
 *
 * Hand-mirrored from `admin.worldwide/src/models` rather than generated: the
 * API serialises Mongoose documents, so ids are strings and dates are ISO
 * strings here even though they are ObjectIds and Dates on the server.
 */

export interface ApiEnvelope<T> {
  success: true;
  data: T;
  message?: string;
  pagination?: Pagination;
  meta?: Record<string, unknown>;
}

export interface ApiFailure {
  success: false;
  message: string;
  details?: { field: string; message: string }[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasMore: boolean;
}

export interface ImageRef {
  public_id?: string;
  url?: string;
  thumbnailUrl?: string;
  alt?: string;
  caption?: string;
  title?: string;
  width?: number;
  height?: number;
}

/* =========================================================
   CATEGORY
========================================================= */

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  shortLabel?: string;
  color?: string;
  image?: ImageRef | null;
  banner?: ImageRef | null;
  parent?: string | null;
  order: number;
  priority: number;
  featured: boolean;
  showOnHome: boolean;
  showInMenu: boolean;
  showInFooter: boolean;
  hidden: boolean;
  status: "active" | "inactive";
  redirectUrl?: string;
  storeCount: number;
  couponCount: number;
  activeCouponCount: number;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: string;
  updatedAt: string;
  children?: Category[];
}

export interface CategoryDetail extends Category {
  stores: Store[];
  coupons: CouponView[];
}

/* =========================================================
   STORE
========================================================= */

export interface StoreHighlight {
  label: string;
  value: string;
}

export interface StoreFaq {
  question: string;
  answer: string;
}

export interface Store {
  _id: string;
  name: string;
  slug: string;
  tagline?: string;
  description?: string;
  about?: string;
  websiteUrl?: string;
  affiliateUrl?: string;
  trackingParams?: string;
  domain?: string;
  logo?: ImageRef | null;
  banner?: ImageRef | null;
  brandColor?: string;
  categories?: (Category | string)[];
  primaryCategory?: Category | string | null;
  country: string;
  currency: string;
  featured: boolean;
  popular: boolean;
  trending: boolean;
  verified: boolean;
  exclusive: boolean;
  priority: number;
  status: "active" | "inactive";
  highlights: StoreHighlight[];
  faqs: StoreFaq[];
  howToRedeem: string[];
  averageDiscount?: string;
  bestOffer?: string;
  views: number;
  clicks: number;
  couponCount: number;
  activeCouponCount: number;
  codeCount: number;
  dealCount: number;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoreDetail extends Store {
  coupons: CouponView[];
  expiredCoupons: CouponView[];
  stats: { total: number; codes: number; deals: number };
}

/* =========================================================
   COUPON
========================================================= */

export const COUPON_TYPES = [
  "code",
  "deal",
  "freeshipping",
  "bogo",
  "cashback",
  "giftcard",
  "printable",
] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

export const DISCOUNT_TYPES = [
  "percent",
  "fixed",
  "shipping",
  "gift",
  "bogo",
  "other",
] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const COUPON_STATUSES = ["active", "expired", "draft", "archived"] as const;
export type CouponStatus = (typeof COUPON_STATUSES)[number];

export interface Coupon {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  terms?: string;
  type: CouponType;
  /** Only present for admins and the reveal response — never in public lists. */
  code?: string;
  discountType: DiscountType;
  discountValue?: number;
  discountLabel?: string;
  currency: string;
  minimumSpend?: number;
  maximumDiscount?: number;
  store: Store | string;
  categories?: (Category | string)[];
  tags?: string[];
  tagNames: string[];
  country: string;
  destinationUrl?: string;
  landingUrl?: string;
  startsAt?: string | null;
  expiresAt?: string | null;
  neverExpires: boolean;
  lastCheckedAt?: string | null;
  verified: boolean;
  verifiedAt?: string | null;
  exclusive: boolean;
  successVotes: number;
  failVotes: number;
  featured: boolean;
  trending: boolean;
  editorsPick: boolean;
  staffPick: boolean;
  priority: number;
  status: CouponStatus;
  image?: ImageRef | null;
  views: number;
  clicks: number;
  uses: number;
  saves: number;
  legacyId?: number;
  source?: string;

  metaTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  canonicalUrl?: string;
  robots?: string;

  createdAt: string;
  updatedAt: string;
}

/** What the API actually sends: a coupon plus the computed card fields. */
export interface CouponView extends Coupon {
  badge: string;
  successRate: number | null;
  isExpired: boolean;
  isStarted: boolean;
  expiresIn: number | null;
  hasCode: boolean;
}

export interface RevealResponse {
  id: string;
  code: string | null;
  type: CouponType;
  url: string;
  storeName: string;
  uses: number;
  expiresAt: string | null;
}

/* =========================================================
   FEEDS
========================================================= */

export interface CouponFeed {
  hero: CouponView | null;
  featured: CouponView[];
  trending: CouponView[];
  exclusive: CouponView[];
  newest: CouponView[];
  expiring: CouponView[];
  codes: CouponView[];
  topStores: Store[];
}

export interface HomepageSection {
  heading: string;
  category: Category | null;
  coupons: CouponView[];
}

export interface HomepageBlock {
  title: string;
  subtitle?: string;
  link?: string;
  image?: ImageRef | null;
  order: number;
}

export interface HomepagePayload {
  announcement: { text?: string; link?: string; active?: boolean } | null;
  hero: {
    heading: string | null;
    subheading: string | null;
    image: ImageRef | null;
    coupon: CouponView | null;
  };
  featured: CouponView[];
  newest: CouponView[];
  expiring: CouponView[];
  stores: Store[];
  categories: Category[];
  sections: HomepageSection[];
  blocks: HomepageBlock[];
}

export interface HomepageConfig {
  _id?: string;
  singleton: "homepage";
  heroCoupon?: string | null;
  heroHeading?: string;
  heroSubheading?: string;
  heroImage?: ImageRef | null;
  featuredCoupons: string[];
  featuredStores: string[];
  featuredCategories: string[];
  categorySections: {
    category: string;
    heading?: string;
    coupons: string[];
    stores: string[];
    order: number;
  }[];
  customBlocks: HomepageBlock[];
  announcement?: { text?: string; link?: string; active?: boolean };
}

export interface SearchResults {
  query: string;
  stores: Store[];
  coupons: CouponView[];
  categories: Category[];
}

export interface Suggestion {
  label: string;
  slug: string;
  logo: string | null;
  offers: number;
}

/* =========================================================
   TAGS, ADS, MEDIA
========================================================= */

export interface Tag {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  featured: boolean;
  couponCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TagDetail extends Tag {
  coupons: CouponView[];
}

export const AD_POSITIONS = [
  "home-hero",
  "home-top",
  "home-infeed",
  "home-mid",
  "home-bottom",
  "sidebar",
  "sidebar-sticky",
  "store-top",
  "store-inline",
  "store-bottom",
  "coupon-inline",
  "category-top",
  "category-infeed",
  "footer",
  "mobile-sticky-bottom",
] as const;
export type AdPosition = (typeof AD_POSITIONS)[number];

export const AD_DEVICES = ["desktop", "tablet", "mobile"] as const;
export type AdDevice = (typeof AD_DEVICES)[number];

export interface Advertisement {
  _id: string;
  name: string;
  position: AdPosition;
  type: "image" | "script";
  image?: ImageRef | null;
  scriptCode?: string;
  targetUrl?: string;
  openInNewTab: boolean;
  categories: string[];
  stores: string[];
  devices: AdDevice[];
  priority: number;
  startsAt?: string | null;
  endsAt?: string | null;
  impressions: number;
  clicks: number;
  status: "active" | "paused";
  createdAt: string;
  updatedAt: string;
}

export interface Media {
  _id: string;
  name: string;
  originalName?: string;
  folder: string;
  public_id?: string;
  url: string;
  secureUrl?: string;
  thumbnailUrl?: string;
  resourceType: "image" | "video" | "raw";
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
  alt?: string;
  caption?: string;
  title?: string;
  credit?: string;
  tags: string[];
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

/* =========================================================
   PEOPLE
========================================================= */

export const ADMIN_PERMISSIONS = [
  "canPublish",
  "canDelete",
  "canManageStores",
  "canManageUsers",
  "canImport",
] as const;
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export interface AdminUser {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: "superadmin" | "editor" | "viewer";
  permissions: Record<AdminPermission, boolean>;
  status?: "active" | "suspended";
  lastLoginAt?: string | null;
  createdAt?: string;
}

export interface Shopper {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  newsletter: boolean;
  savedCount?: number;
  favouriteCount?: number;
  alertCount?: number;
}

export const CONTACT_TOPICS = [
  "general",
  "broken-coupon",
  "submit-coupon",
  "advertise",
  "partnership",
  "privacy",
] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  topic: ContactTopic;
  subject?: string;
  message: string;
  coupon?: { _id: string; title: string; slug: string } | null;
  store?: { _id: string; name: string; slug: string } | null;
  reply?: { message?: string; repliedAt?: string; repliedBy?: string };
  status: "new" | "replied" | "closed" | "spam";
  createdAt: string;
}

/* =========================================================
   DASHBOARD & IMPORT
========================================================= */

export interface DashboardStats {
  coupons: {
    total: number;
    live: number;
    codes: number;
    deals: number;
    expired: number;
    drafts: number;
    expiringSoon: number;
    addedThisWeek: number;
  };
  stores: { total: number; active: number; withoutOffers: number };
  categories: number;
  shoppers: number;
  unreadMessages: number;
  clicksThisWeek: number;
}

export interface TopPerformers {
  days: number;
  topStores: { _id: string; clicks: number; name: string; slug: string; logo?: ImageRef }[];
  topCoupons: { _id: string; clicks: number; title: string; slug: string; type: string }[];
  byKind: Record<string, number>;
}

export interface AttentionList {
  expiringSoon: (Pick<Coupon, "_id" | "title" | "slug" | "expiresAt" | "type"> & {
    store?: { name: string; slug: string };
  })[];
  unverified: (Pick<Coupon, "_id" | "title" | "slug" | "type" | "createdAt"> & {
    store?: { name: string; slug: string };
  })[];
  neverChecked: (Pick<Coupon, "_id" | "title" | "slug" | "lastCheckedAt"> & {
    store?: { name: string; slug: string };
  })[];
  emptyStores: { _id: string; name: string; slug: string; views: number }[];
}

export interface ImportIssue {
  row: number;
  field?: string;
  message: string;
  value?: string;
}

export interface ImportResult {
  batchId: string;
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  storesCreated: number;
  categoriesCreated: number;
  issues: ImportIssue[];
  durationMs: number;
}

export interface ImportJob {
  _id: string;
  batchId: string;
  fileName?: string;
  fileType: "csv" | "xlsx" | "json";
  source: "wordpress" | "generic";
  mode: "create" | "upsert" | "replace";
  status: "validated" | "importing" | "completed" | "failed" | "rolled_back";
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  storesCreated: number;
  categoriesCreated: number;
  issues?: ImportIssue[];
  startedAt?: string | null;
  finishedAt?: string | null;
  rolledBackAt?: string | null;
  createdByAdmin?: { name: string; email: string } | null;
  createdAt: string;
}

/* =========================================================
   QUERY SHAPES
========================================================= */

export type CouponSort =
  | "best"
  | "newest"
  | "expiring"
  | "popular"
  | "discount"
  | "alphabetical";

export interface CouponQuery {
  page?: number;
  limit?: number;
  store?: string;
  category?: string;
  tag?: string;
  type?: CouponType;
  status?: CouponStatus | "all";
  search?: string;
  sort?: CouponSort;
  featured?: boolean;
  exclusive?: boolean;
  verified?: boolean;
  trending?: boolean;
  editorsPick?: boolean;
  withCode?: boolean;
  expiringSoon?: boolean;
  country?: string;
  minDiscount?: number;
}

export type StoreSort = "popular" | "name" | "newest" | "priority" | "offers" | "clicks";

export interface StoreQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  letter?: string;
  country?: string;
  status?: "active" | "inactive" | "all";
  sort?: StoreSort;
  featured?: boolean;
  popular?: boolean;
  trending?: boolean;
  withOffers?: boolean;
}

export interface CategoryQuery {
  status?: "active" | "inactive" | "all";
  shape?: "flat" | "tree";
  parent?: string;
  featured?: boolean;
  showOnHome?: boolean;
  showInMenu?: boolean;
  includeHidden?: boolean;
  search?: string;
  limit?: number;
}
