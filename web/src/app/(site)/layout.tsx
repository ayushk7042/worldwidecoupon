import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { ShopperProvider } from "@/components/site/ShopperProvider";
import { StickyMobileAd } from "@/components/ads/AdSlot";
import { apiSafe } from "@/lib/api";
import type { Category, Store } from "@/lib/types";

/**
 * The public shell.
 *
 * The nav and footer data is fetched here once and cached for an hour rather
 * than in every page, and `apiSafe` means a backend blip degrades the nav
 * instead of 500-ing the whole site.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [categories, popularStores] = await Promise.all([
    apiSafe<Category[]>("/categories/menu", [], { revalidate: 3600 }),
    apiSafe<Store[]>("/stores", [], {
      query: { limit: 24, sort: "offers", withOffers: true },
      revalidate: 3600,
    }),
  ]);

  return (
    <ShopperProvider>
      <div className="flex min-h-dvh flex-col">
        <Header categories={categories} />
        <main className="flex-1">{children}</main>
        <Footer categories={categories} stores={popularStores} />
        <StickyMobileAd />
      </div>
    </ShopperProvider>
  );
}
