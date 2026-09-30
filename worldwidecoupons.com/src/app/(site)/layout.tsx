import type { Metadata } from "next";
import Script from "next/script";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { ShopperProvider } from "@/components/site/ShopperProvider";
import { StickyMobileAd } from "@/components/ads/AdSlot";
import { apiSafe } from "@/lib/api";
import type { Category, Store } from "@/lib/types";

const GA_MEASUREMENT_ID = "G-HGX7J0GNSC";

// Google Search Console ownership check — renders as the <meta
// name="google-site-verification"> tag on every public page.
export const metadata: Metadata = {
  verification: { google: "luRTHr8g95DiYxvSEIOJXQ_qxPs8YVc6U4u1bDpfU7E" },
};

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
      {/* Public site only — kept out of the root layout so the admin panel
          never reports its own traffic into the same analytics property. */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>

      <div className="flex min-h-dvh flex-col">
        <Header categories={categories} />
        <main className="flex-1">{children}</main>
        <Footer categories={categories} stores={popularStores} />
        <StickyMobileAd />
      </div>
    </ShopperProvider>
  );
}
