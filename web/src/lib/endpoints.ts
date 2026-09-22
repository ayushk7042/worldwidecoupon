import { api, apiPaged, apiRaw, type Paged, type RequestOptions } from "./api";
import type {
  AdminUser,
  Advertisement,
  AttentionList,
  Category,
  CategoryDetail,
  CategoryQuery,
  ContactMessage,
  Coupon,
  CouponFeed,
  CouponQuery,
  CouponView,
  DashboardStats,
  HomepageConfig,
  HomepagePayload,
  ImportJob,
  ImportResult,
  Media,
  RevealResponse,
  SearchResults,
  Shopper,
  Store,
  StoreDetail,
  StoreQuery,
  Suggestion,
  Tag,
  TagDetail,
  TopPerformers,
} from "./types";

/**
 * Every backend endpoint, in one place.
 *
 * Grouped to mirror `admin.worldwide/src/routes/`, so a route added there has
 * an obvious home here and nothing silently goes unused.
 */

type Opts = Pick<RequestOptions, "token" | "revalidate" | "tags" | "signal">;

/* =========================================================
   COUPONS
========================================================= */

export const coupons = {
  list: (query: CouponQuery = {}, options: Opts = {}): Promise<Paged<CouponView>> =>
    apiPaged<CouponView>("/coupons", { query: query as Record<string, unknown>, ...options }),

  feed: (options: Opts = {}): Promise<CouponFeed> =>
    api<CouponFeed>("/coupons/feed", options),

  get: (idOrSlug: string, options: Opts = {}): Promise<CouponView> =>
    api<CouponView>(`/coupons/${encodeURIComponent(idOrSlug)}`, options),

  related: (idOrSlug: string, options: Opts = {}): Promise<CouponView[]> =>
    api<CouponView[]>(`/coupons/${encodeURIComponent(idOrSlug)}/related`, options),

  /** Counts a use and hands back the code plus the outbound link. */
  reveal: (id: string): Promise<RevealResponse> =>
    api<RevealResponse>(`/coupons/${id}/reveal`, { method: "POST" }),

  /** The redirect URL for a deal with no code — follow it, do not fetch it. */
  goUrl: (id: string, base: string): string => `${base}/coupons/${id}/go`,

  vote: (id: string, worked: boolean) =>
    api<{ successVotes: number; failVotes: number; successRate: number | null }>(
      `/coupons/${id}/vote`,
      { method: "POST", body: { worked } }
    ),

  /* ---- admin ---- */

  create: (body: Partial<Coupon> & Record<string, unknown>, token?: string | null) =>
    api<Coupon>("/coupons", { method: "POST", body, token }),

  update: (id: string, body: Record<string, unknown>, token?: string | null) =>
    api<Coupon>(`/coupons/${id}`, { method: "PUT", body, token }),

  remove: (id: string, token?: string | null) =>
    api<{ id: string }>(`/coupons/${id}`, { method: "DELETE", token }),

  setStatus: (id: string, status: string, token?: string | null) =>
    api<Coupon>(`/coupons/${id}/status`, { method: "PATCH", body: { status }, token }),

  verify: (id: string, token?: string | null) =>
    api<Coupon>(`/coupons/${id}/verify`, { method: "POST", token }),

  bulkStatus: (ids: string[], status: string, token?: string | null) =>
    api<{ updated: number }>("/coupons/bulk/status", {
      method: "POST",
      body: { ids, status },
      token,
    }),

  bulkDelete: (ids: string[], token?: string | null) =>
    api<{ deleted: number }>("/coupons/bulk/delete", {
      method: "POST",
      body: { ids },
      token,
    }),
};

/* =========================================================
   STORES
========================================================= */

export const stores = {
  list: (query: StoreQuery = {}, options: Opts = {}): Promise<Paged<Store>> =>
    apiPaged<Store>("/stores", { query: query as Record<string, unknown>, ...options }),

  letters: (options: Opts = {}): Promise<Record<string, number>> =>
    api<Record<string, number>>("/stores/letters", options),

  directory: (options: Opts = {}): Promise<Record<string, Store[]>> =>
    api<Record<string, Store[]>>("/stores/directory", options),

  get: (idOrSlug: string, options: Opts = {}): Promise<StoreDetail> =>
    api<StoreDetail>(`/stores/${encodeURIComponent(idOrSlug)}`, options),

  goUrl: (id: string, base: string): string => `${base}/stores/${id}/go`,

  trackClick: (id: string) =>
    api<{ url: string; storeName: string }>(`/stores/${id}/click`, { method: "POST" }),

  /* ---- admin ---- */

  create: (body: Record<string, unknown>, token?: string | null) =>
    api<Store>("/stores", { method: "POST", body, token }),

  update: (id: string, body: Record<string, unknown>, token?: string | null) =>
    api<Store>(`/stores/${id}`, { method: "PUT", body, token }),

  remove: (id: string, token?: string | null) =>
    api<{ id: string; couponsDeleted: number }>(`/stores/${id}`, {
      method: "DELETE",
      token,
    }),

  refresh: (id: string, token?: string | null) =>
    api<Partial<Store>>(`/stores/${id}/refresh`, { method: "POST", token }),

  bulkStatus: (ids: string[], status: string, token?: string | null) =>
    api<{ updated: number }>("/stores/bulk/status", {
      method: "POST",
      body: { ids, status },
      token,
    }),
};

/* =========================================================
   CATEGORIES
========================================================= */

export const categories = {
  list: (query: CategoryQuery = {}, options: Opts = {}): Promise<Category[]> =>
    api<Category[]>("/categories", { query: query as Record<string, unknown>, ...options }),

  listWithMeta: (query: CategoryQuery = {}, options: Opts = {}) =>
    apiRaw<Category[]>("/categories", {
      query: query as Record<string, unknown>,
      ...options,
    }),

  menu: (options: Opts = {}): Promise<Category[]> =>
    api<Category[]>("/categories/menu", options),

  get: (idOrSlug: string, options: Opts = {}): Promise<CategoryDetail> =>
    api<CategoryDetail>(`/categories/${encodeURIComponent(idOrSlug)}`, options),

  /* ---- admin ---- */

  create: (body: Record<string, unknown>, token?: string | null) =>
    api<Category>("/categories", { method: "POST", body, token }),

  update: (id: string, body: Record<string, unknown>, token?: string | null) =>
    api<Category>(`/categories/${id}`, { method: "PUT", body, token }),

  remove: (id: string, token?: string | null) =>
    api<{ id: string }>(`/categories/${id}`, { method: "DELETE", token }),

  reorder: (items: { id: string; order: number }[], token?: string | null) =>
    api<{ updated: number }>("/categories/reorder", {
      method: "POST",
      body: { items },
      token,
    }),

  refreshCounts: (token?: string | null) =>
    api<{ ok: boolean }>("/categories/refresh-counts", { method: "POST", token }),
};

/* =========================================================
   TAGS
========================================================= */

export const tags = {
  list: (
    query: { page?: number; limit?: number; search?: string; featured?: boolean } = {},
    options: Opts = {}
  ): Promise<Paged<Tag>> =>
    apiPaged<Tag>("/tags", { query: query as Record<string, unknown>, ...options }),

  get: (idOrSlug: string, options: Opts = {}): Promise<TagDetail> =>
    api<TagDetail>(`/tags/${encodeURIComponent(idOrSlug)}`, options),

  create: (body: Record<string, unknown>, token?: string | null) =>
    api<Tag>("/tags", { method: "POST", body, token }),

  update: (id: string, body: Record<string, unknown>, token?: string | null) =>
    api<Tag>(`/tags/${id}`, { method: "PUT", body, token }),

  remove: (id: string, token?: string | null) =>
    api<{ id: string }>(`/tags/${id}`, { method: "DELETE", token }),

  refreshCounts: (token?: string | null) =>
    api<{ updated: number }>("/tags/refresh-counts", { method: "POST", token }),
};

/* =========================================================
   SEARCH & HOMEPAGE
========================================================= */

export const search = {
  all: (q: string, limit = 8, options: Opts = {}): Promise<SearchResults> =>
    api<SearchResults>("/search", { query: { q, limit }, ...options }),

  suggest: (q: string, options: Opts = {}): Promise<Suggestion[]> =>
    api<Suggestion[]>("/search/suggest", { query: { q }, ...options }),
};

export const homepage = {
  get: (options: Opts = {}): Promise<HomepagePayload> =>
    api<HomepagePayload>("/homepage", options),

  getConfig: (token?: string | null): Promise<HomepageConfig> =>
    api<HomepageConfig>("/homepage/config", { token }),

  updateConfig: (body: Partial<HomepageConfig>, token?: string | null) =>
    api<HomepageConfig>("/homepage/config", { method: "PUT", body, token }),
};

/* =========================================================
   ADVERTISEMENTS
========================================================= */

export const ads = {
  serve: (
    params: { position: string; device?: string; category?: string; store?: string },
    options: Opts = {}
  ): Promise<Advertisement | null> =>
    api<Advertisement | null>("/ads/serve", { query: params, ...options }),

  trackClick: (id: string) =>
    api<{ url: string | null }>(`/ads/${id}/click`, { method: "POST" }),

  /* ---- admin ---- */

  list: (
    query: { position?: string; status?: string } = {},
    token?: string | null
  ): Promise<Advertisement[]> => api<Advertisement[]>("/ads", { query, token }),

  create: (body: Record<string, unknown>, token?: string | null) =>
    api<Advertisement>("/ads", { method: "POST", body, token }),

  update: (id: string, body: Record<string, unknown>, token?: string | null) =>
    api<Advertisement>(`/ads/${id}`, { method: "PUT", body, token }),

  remove: (id: string, token?: string | null) =>
    api<{ id: string }>(`/ads/${id}`, { method: "DELETE", token }),
};

/* =========================================================
   ADMIN AUTH
========================================================= */

export const auth = {
  login: (email: string, password: string) =>
    api<{ token: string; admin: AdminUser }>("/auth/login", {
      method: "POST",
      body: { email, password },
    }),

  logout: () => api<{ ok: boolean }>("/auth/logout", { method: "POST" }),

  me: (token?: string | null): Promise<AdminUser> => api<AdminUser>("/auth/me", { token }),

  changePassword: (currentPassword: string, newPassword: string, token?: string | null) =>
    api<{ ok: boolean }>("/auth/change-password", {
      method: "POST",
      body: { currentPassword, newPassword },
      token,
    }),

  listAdmins: (token?: string | null): Promise<AdminUser[]> =>
    api<AdminUser[]>("/auth/admins", { token }),

  createAdmin: (body: Record<string, unknown>, token?: string | null) =>
    api<AdminUser>("/auth/admins", { method: "POST", body, token }),

  updateAdmin: (id: string, body: Record<string, unknown>, token?: string | null) =>
    api<AdminUser>(`/auth/admins/${id}`, { method: "PUT", body, token }),

  removeAdmin: (id: string, token?: string | null) =>
    api<{ id: string }>(`/auth/admins/${id}`, { method: "DELETE", token }),
};

/* =========================================================
   SHOPPER ACCOUNTS
========================================================= */

export const account = {
  register: (body: { name: string; email: string; password: string; newsletter?: boolean }) =>
    api<{ token: string; user: Shopper }>("/account/register", { method: "POST", body }),

  login: (email: string, password: string) =>
    api<{ token: string; user: Shopper }>("/account/login", {
      method: "POST",
      body: { email, password },
    }),

  logout: () => api<{ ok: boolean }>("/account/logout", { method: "POST" }),

  me: (token?: string | null): Promise<Shopper> => api<Shopper>("/account/me", { token }),

  updateProfile: (body: Record<string, unknown>, token?: string | null) =>
    api<Shopper>("/account/me", { method: "PATCH", body, token }),

  saved: (token?: string | null): Promise<CouponView[]> =>
    api<CouponView[]>("/account/saved", { token }),

  toggleSaved: (id: string, token?: string | null) =>
    api<{ saved: boolean }>(`/account/saved/${id}`, { method: "POST", token }),

  favourites: (token?: string | null): Promise<Store[]> =>
    api<Store[]>("/account/favourites", { token }),

  toggleFavourite: (id: string, token?: string | null) =>
    api<{ following: boolean }>(`/account/favourites/${id}`, { method: "POST", token }),

  feed: (token?: string | null): Promise<CouponView[]> =>
    api<CouponView[]>("/account/feed", { token }),
};

/* =========================================================
   CONTACT
========================================================= */

export const contact = {
  submit: (body: Record<string, unknown>) =>
    api<{ id: string }>("/contact", { method: "POST", body }),

  list: (
    query: { page?: number; limit?: number; status?: string; topic?: string } = {},
    token?: string | null
  ): Promise<Paged<ContactMessage>> => apiPaged<ContactMessage>("/contact", { query, token }),

  get: (id: string, token?: string | null): Promise<ContactMessage> =>
    api<ContactMessage>(`/contact/${id}`, { token }),

  reply: (id: string, message: string, token?: string | null) =>
    api<{ saved: boolean; emailed: boolean }>(`/contact/${id}/reply`, {
      method: "POST",
      body: { message },
      token,
    }),

  setStatus: (id: string, status: string, token?: string | null) =>
    api<ContactMessage>(`/contact/${id}/status`, {
      method: "PATCH",
      body: { status },
      token,
    }),

  remove: (id: string, token?: string | null) =>
    api<{ id: string }>(`/contact/${id}`, { method: "DELETE", token }),
};

/* =========================================================
   DASHBOARD
========================================================= */

export const dashboard = {
  stats: (token?: string | null): Promise<DashboardStats> =>
    api<DashboardStats>("/dashboard", { token }),

  top: (days = 30, token?: string | null): Promise<TopPerformers> =>
    api<TopPerformers>("/dashboard/top", { query: { days }, token }),

  attention: (token?: string | null): Promise<AttentionList> =>
    api<AttentionList>("/dashboard/attention", { token }),
};

/* =========================================================
   MEDIA
========================================================= */

export const media = {
  list: (
    query: { page?: number; limit?: number; folder?: string; type?: string; search?: string } = {},
    token?: string | null
  ): Promise<Paged<Media>> => apiPaged<Media>("/media", { query, token }),

  upload: (files: FileList | File[], folder: string, token?: string | null) => {
    const form = new FormData();
    Array.from(files).forEach((file) => form.append("files", file));
    form.append("folder", folder);
    return api<Media[]>("/media/upload", { method: "POST", body: form, token });
  },

  register: (body: Record<string, unknown>, token?: string | null) =>
    api<Media>("/media/register", { method: "POST", body, token }),

  update: (id: string, body: Record<string, unknown>, token?: string | null) =>
    api<Media>(`/media/${id}`, { method: "PATCH", body, token }),

  remove: (id: string, token?: string | null) =>
    api<{ id: string }>(`/media/${id}`, { method: "DELETE", token }),
};

/* =========================================================
   IMPORT
========================================================= */

export const importer = {
  /** Dry run — parses and reports without writing a thing. */
  preview: (file: File, token?: string | null) => {
    const form = new FormData();
    form.append("file", file);
    return api<ImportResult>("/import/preview", { method: "POST", body: form, token });
  },

  run: (file: File, mode: "upsert" | "replace", token?: string | null) => {
    const form = new FormData();
    form.append("file", file);
    return api<ImportResult>("/import/wordpress", {
      method: "POST",
      body: form,
      query: { mode },
      token,
    });
  },

  jobs: (query: { page?: number; limit?: number } = {}, token?: string | null) =>
    apiPaged<ImportJob>("/import/jobs", { query, token }),

  job: (id: string, token?: string | null): Promise<ImportJob> =>
    api<ImportJob>(`/import/jobs/${id}`, { token }),

  rollback: (id: string, token?: string | null) =>
    api<{ couponsDeleted: number; storesDeleted: number; categoriesDeleted: number }>(
      `/import/jobs/${id}/rollback`,
      { method: "POST", token }
    ),
};

export const health = () =>
  api<{ status: string; uptime: number; database: string }>("/health");
