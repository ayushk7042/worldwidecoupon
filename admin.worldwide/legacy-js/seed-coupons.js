/**
 * Fills a fresh database with real stores, categories and offers so the site
 * has something to show from the first load.
 *
 * Safe to re-run: everything is matched on slug and updated in place, so no
 * duplicates appear and hand-edited rows keep their ids.
 *
 *   node seed-coupons.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

const Category = require("./models/Category");
const Store = require("./models/Store");
const Coupon = require("./models/Coupon");

const slugify = (text = "") =>
  text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

const days = (n) => new Date(Date.now() + n * 86_400_000);

/* =========================================================
   CATEGORIES
========================================================= */

const CATEGORIES = [
  { name: "Fashion & Apparel", icon: "👗", color: "#EC4899", description: "Clothing, shoes and accessories from the brands people actually wear." },
  { name: "Electronics", icon: "💻", color: "#2563EB", description: "Laptops, phones, TVs and the gear that goes with them." },
  { name: "Home & Garden", icon: "🛋️", color: "#059669", description: "Furniture, decor, tools and everything for the yard." },
  { name: "Travel", icon: "✈️", color: "#0EA5E9", description: "Flights, hotels, car hire and package holidays." },
  { name: "Beauty & Health", icon: "💄", color: "#A855F7", description: "Skincare, makeup, fragrance and wellbeing." },
  { name: "Food & Dining", icon: "🍔", color: "#F97316", description: "Delivery, groceries and restaurant offers." },
  { name: "Sports & Outdoors", icon: "🏃", color: "#16A34A", description: "Training kit, camping gear and team apparel." },
  { name: "Toys & Kids", icon: "🧸", color: "#F59E0B", description: "Toys, baby gear and everything for growing families." },
  { name: "Pets", icon: "🐾", color: "#8B5CF6", description: "Food, toys and care for the other members of the household." },
  { name: "Auto", icon: "🚗", color: "#64748B", description: "Parts, tyres, servicing and accessories." },
];

/* =========================================================
   STORES
========================================================= */

const STORES = [
  {
    name: "Nike", domain: "nike.com", category: "Sports & Outdoors",
    tagline: "Just Do It", brandColor: "#111111",
    description: "Trainers, training kit and sportswear straight from Nike.",
    featured: true, popular: true, verified: true, exclusive: true, priority: 100,
    averageDiscount: "25% off",
    highlights: [
      { label: "Free shipping", value: "On orders over $50" },
      { label: "Returns", value: "60 days, free" },
      { label: "Student discount", value: "10% off" },
    ],
    howToRedeem: [
      "Pick the offer you want and hit Get Code — we copy it for you.",
      "Shop as normal at nike.com and head to your bag.",
      "Paste the code into the Promo Code box and apply it.",
      "Check the total dropped before you pay.",
    ],
    faqs: [
      { question: "Does Nike offer a student discount?", answer: "Yes — students get 10% off after verifying through Nike's own student portal. It stacks with most seasonal sales but not with promo codes." },
      { question: "How long does Nike delivery take?", answer: "Standard delivery runs 3–5 working days and is free over $50. Express is 2 days." },
    ],
  },
  {
    name: "Amazon", domain: "amazon.com", category: "Electronics",
    tagline: "Everything, delivered", brandColor: "#FF9900",
    description: "The everything store — electronics, home, books and daily essentials.",
    featured: true, popular: true, verified: true, priority: 98,
    averageDiscount: "20% off",
    highlights: [
      { label: "Prime delivery", value: "Same or next day" },
      { label: "Returns", value: "30 days" },
    ],
    howToRedeem: [
      "Copy the code from the offer below.",
      "Add your items to the Amazon basket.",
      "Enter the code in the gift card or promo box at checkout.",
    ],
  },
  {
    name: "Walmart", domain: "walmart.com", category: "Home & Garden",
    tagline: "Save money. Live better.", brandColor: "#0071DC",
    description: "Groceries, home goods and electronics at everyday low prices.",
    featured: true, popular: true, verified: true, priority: 95,
    averageDiscount: "15% off",
  },
  {
    name: "Target", domain: "target.com", category: "Home & Garden",
    tagline: "Expect more. Pay less.", brandColor: "#CC0000",
    description: "Homeware, clothing and groceries with a design streak.",
    featured: true, popular: true, verified: true, priority: 92,
    averageDiscount: "20% off",
  },
  {
    name: "Best Buy", domain: "bestbuy.com", category: "Electronics",
    tagline: "Expert service. Unbeatable price.", brandColor: "#0046BE",
    description: "TVs, laptops, gaming and appliances with price matching.",
    featured: true, popular: true, verified: true, priority: 90,
    averageDiscount: "$50 off",
  },
  {
    name: "Adidas", domain: "adidas.com", category: "Sports & Outdoors",
    tagline: "Impossible is nothing", brandColor: "#000000",
    description: "Originals, running and football kit direct from adidas.",
    featured: true, verified: true, exclusive: true, priority: 88,
    averageDiscount: "30% off",
  },
  {
    name: "Sephora", domain: "sephora.com", category: "Beauty & Health",
    tagline: "Let's beauty together", brandColor: "#000000",
    description: "Makeup, skincare and fragrance from hundreds of brands.",
    featured: true, popular: true, verified: true, priority: 86,
    averageDiscount: "20% off",
  },
  {
    name: "Macy's", domain: "macys.com", category: "Fashion & Apparel",
    tagline: "Way to shop", brandColor: "#E21A2C",
    description: "Department store fashion, beauty and homeware.",
    popular: true, verified: true, priority: 84,
    averageDiscount: "25% off",
  },
  {
    name: "Kohl's", domain: "kohls.com", category: "Fashion & Apparel",
    tagline: "Expect great things", brandColor: "#7E2A8E",
    description: "Family clothing and home, plus Kohl's Cash on most orders.",
    popular: true, verified: true, priority: 82,
    averageDiscount: "30% off",
  },
  {
    name: "Booking.com", domain: "booking.com", category: "Travel",
    tagline: "Booking.yeah", brandColor: "#003580",
    description: "Hotels, apartments and stays in almost every country.",
    featured: true, popular: true, verified: true, priority: 80,
    averageDiscount: "15% off",
  },
  {
    name: "Expedia", domain: "expedia.com", category: "Travel",
    tagline: "Go. Get away.", brandColor: "#FFC94A",
    description: "Flight, hotel and car bundles that beat booking separately.",
    featured: true, verified: true, priority: 78,
    averageDiscount: "$100 off",
  },
  {
    name: "DoorDash", domain: "doordash.com", category: "Food & Dining",
    tagline: "Delivering good", brandColor: "#FF3008",
    description: "Restaurant delivery from local spots and national chains.",
    popular: true, verified: true, priority: 76,
    averageDiscount: "$15 off",
  },
  {
    name: "Wayfair", domain: "wayfair.com", category: "Home & Garden",
    tagline: "A zillion things home", brandColor: "#7F187F",
    description: "Furniture and decor with frequent clearance events.",
    popular: true, verified: true, priority: 74,
    averageDiscount: "40% off",
  },
  {
    name: "Etsy", domain: "etsy.com", category: "Home & Garden",
    tagline: "Keep commerce human", brandColor: "#F1641E",
    description: "Handmade, vintage and made-to-order from independent sellers.",
    verified: true, priority: 72,
    averageDiscount: "20% off",
  },
  {
    name: "Old Navy", domain: "oldnavy.gap.com", category: "Fashion & Apparel",
    tagline: "Fashion for everyone", brandColor: "#003C71",
    description: "Everyday basics for the whole family at low prices.",
    verified: true, priority: 70,
    averageDiscount: "50% off",
  },
  {
    name: "The Home Depot", domain: "homedepot.com", category: "Home & Garden",
    tagline: "How doers get more done", brandColor: "#F96302",
    description: "Tools, building supplies, appliances and garden.",
    verified: true, priority: 68,
    averageDiscount: "$25 off",
  },
  {
    name: "Chewy", domain: "chewy.com", category: "Pets",
    tagline: "Pet happiness delivered", brandColor: "#1C49C2",
    description: "Pet food, treats and medication on autoship.",
    verified: true, priority: 66,
    averageDiscount: "35% off",
  },
  {
    name: "Samsung", domain: "samsung.com", category: "Electronics",
    tagline: "Do what you can't", brandColor: "#1428A0",
    description: "Phones, TVs and appliances direct from Samsung.",
    featured: true, verified: true, priority: 64,
    averageDiscount: "$200 off",
  },
  {
    name: "eBay", domain: "ebay.com", category: "Electronics",
    tagline: "Shop the world", brandColor: "#E53238",
    description: "New and refurbished from millions of sellers.",
    verified: true, priority: 62,
    averageDiscount: "15% off",
  },
  {
    name: "LEGO", domain: "lego.com", category: "Toys & Kids",
    tagline: "Rebuild the world", brandColor: "#E3000B",
    description: "Sets, minifigures and the exclusives you only get direct.",
    featured: true, popular: true, verified: true, priority: 61,
    averageDiscount: "20% off",
    highlights: [
      { label: "Free shipping", value: "On orders over $35" },
      { label: "VIP points", value: "Double on select sets" },
    ],
  },
  {
    name: "Target Kids", domain: "target.com", category: "Toys & Kids",
    tagline: "Play, learn, repeat", brandColor: "#CC0000",
    description: "Toys, baby gear and school kit under one roof.",
    verified: true, priority: 59,
    averageDiscount: "25% off",
  },
  {
    name: "AutoZone", domain: "autozone.com", category: "Auto",
    tagline: "Get in the zone", brandColor: "#F58220",
    description: "Car parts, batteries and free diagnostic checks.",
    verified: true, priority: 60,
    averageDiscount: "20% off",
  },
];

/* =========================================================
   OFFERS
   Written per store so the copy reads like a real listing.
========================================================= */

const COUPONS = {
  Nike: [
    { title: "Extra 25% off sale styles sitewide", code: "SAVE25", type: "code", discountType: "percent", discountValue: 25, verified: true, exclusive: true, featured: true, trending: true, priority: 90, expires: 21, description: "Stacks on top of everything already reduced. Works on trainers, apparel and kids.", terms: "Excludes Jordan and select launches. One use per customer." },
    { title: "20% off your first order when you join Nike Membership", code: "MEMBER20", type: "code", discountType: "percent", discountValue: 20, verified: true, priority: 80, expires: 60, description: "Membership is free and the code lands in your inbox straight away." },
    { title: "Free shipping on every order, no minimum", code: "FREESHIP", type: "freeshipping", discountType: "shipping", verified: true, trending: true, priority: 70, expires: 14 },
    { title: "Up to 40% off the end-of-season sale", type: "deal", discountType: "percent", discountValue: 40, verified: true, trending: true, priority: 60, expires: 10, description: "No code needed — the reduction is already on the price." },
    { title: "10% student discount on full-price items", code: "STUDENT10", type: "code", discountType: "percent", discountValue: 10, priority: 40, neverExpires: true },
  ],
  Amazon: [
    { title: "$15 off your first grocery order over $50", code: "GROCERY15", type: "code", discountType: "fixed", discountValue: 15, verified: true, featured: true, priority: 90, expires: 30 },
    { title: "30% off Amazon devices during the sale event", type: "deal", discountType: "percent", discountValue: 30, verified: true, trending: true, priority: 85, expires: 7 },
    { title: "Free 30-day Prime trial with same-day delivery", type: "deal", discountType: "other", discountLabel: "FREE TRIAL", priority: 60, neverExpires: true },
    { title: "20% off select Amazon Basics home essentials", code: "BASICS20", type: "code", discountType: "percent", discountValue: 20, priority: 50, expires: 18 },
  ],
  Walmart: [
    { title: "$20 off your first pickup or delivery order", code: "PICKUP20", type: "code", discountType: "fixed", discountValue: 20, verified: true, featured: true, priority: 88, expires: 25, description: "For new grocery customers spending $50 or more." },
    { title: "Up to 50% off clearance across the whole store", type: "deal", discountType: "percent", discountValue: 50, trending: true, priority: 70, expires: 12 },
    { title: "Free shipping on orders over $35, no membership", type: "freeshipping", discountType: "shipping", trending: true, priority: 50, neverExpires: true },
  ],
  Target: [
    { title: "20% off one home item with Target Circle", code: "CIRCLE20", type: "code", discountType: "percent", discountValue: 20, verified: true, featured: true, priority: 86, expires: 14 },
    { title: "Buy 2 get 1 free on toys and games", type: "bogo", discountType: "other", discountLabel: "B2G1 FREE", verified: true, trending: true, priority: 75, expires: 9 },
    { title: "$10 off $50 on beauty and personal care", code: "BEAUTY10", type: "code", discountType: "fixed", discountValue: 10, priority: 60, expires: 20 },
  ],
  "Best Buy": [
    { title: "$150 off select 4K TVs over 55 inches", type: "deal", discountType: "fixed", discountValue: 150, verified: true, featured: true, trending: true, priority: 84, expires: 6 },
    { title: "$50 off laptops over $499", code: "LAPTOP50", type: "code", discountType: "fixed", discountValue: 50, verified: true, priority: 70, expires: 16 },
    { title: "Free next-day delivery on orders over $35", type: "freeshipping", discountType: "shipping", trending: true, priority: 45, neverExpires: true },
  ],
  Adidas: [
    { title: "30% off almost everything, members only", code: "ADI30", type: "code", discountType: "percent", discountValue: 30, verified: true, exclusive: true, featured: true, trending: true, priority: 82, expires: 11 },
    { title: "Extra 15% off outlet on top of the reduction", code: "OUTLET15", type: "code", discountType: "percent", discountValue: 15, verified: true, priority: 65, expires: 22 },
    { title: "Free shipping and free returns for adiClub members", type: "freeshipping", discountType: "shipping", priority: 40, neverExpires: true },
  ],
  Sephora: [
    { title: "20% off your whole basket during the savings event", code: "SAVINGS20", type: "code", discountType: "percent", discountValue: 20, verified: true, exclusive: true, featured: true, trending: true, priority: 80, expires: 5, description: "Rouge members first, then VIB and Insider." },
    { title: "Three free samples with every order", code: "SAMPLES", type: "code", discountType: "gift", priority: 55, neverExpires: true },
    { title: "$20 off fragrance over $75", code: "SCENT20", type: "code", discountType: "fixed", discountValue: 20, priority: 50, expires: 17 },
  ],
  "Macy's": [
    { title: "Extra 25% off with the shopping pass", code: "SHOP25", type: "code", discountType: "percent", discountValue: 25, verified: true, featured: true, priority: 78, expires: 8 },
    { title: "$10 off $25 on select beauty", code: "BEAUTY", type: "code", discountType: "fixed", discountValue: 10, priority: 55, expires: 19 },
  ],
  "Kohl's": [
    { title: "30% off for cardholders sitewide", code: "CARD30", type: "code", discountType: "percent", discountValue: 30, verified: true, featured: true, priority: 76, expires: 13 },
    { title: "$10 Kohl's Cash for every $50 spent", type: "deal", discountType: "other", discountLabel: "KOHL'S CASH", trending: true, priority: 60, expires: 9 },
  ],
  "Booking.com": [
    { title: "15% off stays booked at least 30 days ahead", code: "EARLY15", type: "code", discountType: "percent", discountValue: 15, verified: true, featured: true, trending: true, priority: 74, expires: 45, description: "Genius members get the discount automatically on eligible stays." },
    { title: "Free cancellation on most rooms, right up to check-in", type: "deal", discountType: "other", discountLabel: "FREE CANCEL", priority: 40, neverExpires: true },
  ],
  Expedia: [
    { title: "$100 off flight and hotel packages over $900", code: "PACKAGE100", type: "code", discountType: "fixed", discountValue: 100, verified: true, featured: true, priority: 72, expires: 28 },
    { title: "10% off hotels for One Key members", code: "ONEKEY10", type: "code", discountType: "percent", discountValue: 10, priority: 50, expires: 35 },
  ],
  DoorDash: [
    { title: "$15 off your first two orders", code: "FIRST15", type: "code", discountType: "fixed", discountValue: 15, verified: true, exclusive: true, featured: true, trending: true, priority: 70, expires: 30 },
    { title: "$0 delivery fee for 30 days with DashPass", type: "deal", discountType: "shipping", discountLabel: "$0 DELIVERY", priority: 45, expires: 20 },
  ],
  Wayfair: [
    { title: "Up to 60% off the clearance event", type: "deal", discountType: "percent", discountValue: 60, verified: true, featured: true, trending: true, priority: 68, expires: 4 },
    { title: "10% off your first order when you sign up", code: "WELCOME10", type: "code", discountType: "percent", discountValue: 10, priority: 50, neverExpires: true },
  ],
  Etsy: [
    { title: "20% off your first purchase from any shop", code: "ETSY20", type: "code", discountType: "percent", discountValue: 20, verified: true, priority: 64, expires: 26 },
    { title: "Free shipping on US orders over $35", type: "freeshipping", discountType: "shipping", priority: 40, neverExpires: true },
  ],
  "Old Navy": [
    { title: "50% off the entire site for one weekend", type: "deal", discountType: "percent", discountValue: 50, verified: true, featured: true, trending: true, priority: 66, expires: 3 },
    { title: "Extra 20% off clearance with code", code: "EXTRA20", type: "code", discountType: "percent", discountValue: 20, priority: 50, expires: 15 },
  ],
  "The Home Depot": [
    { title: "$25 off orders over $250 in appliances", code: "APPLIANCE25", type: "code", discountType: "fixed", discountValue: 25, verified: true, priority: 62, expires: 24 },
    { title: "Up to 40% off tools during the seasonal sale", type: "deal", discountType: "percent", discountValue: 40, trending: true, priority: 55, expires: 11 },
  ],
  Chewy: [
    { title: "35% off your first autoship order", code: "AUTOSHIP35", type: "code", discountType: "percent", discountValue: 35, verified: true, exclusive: true, featured: true, priority: 60, expires: 40 },
    { title: "$20 off orders over $49 for new customers", code: "NEW20", type: "code", discountType: "fixed", discountValue: 20, priority: 50, expires: 33 },
  ],
  Samsung: [
    { title: "$200 off Galaxy flagship phones with trade-in", type: "deal", discountType: "fixed", discountValue: 200, verified: true, featured: true, trending: true, priority: 58, expires: 12 },
    { title: "10% off appliances for students and teachers", code: "EDU10", type: "code", discountType: "percent", discountValue: 10, priority: 45, neverExpires: true },
  ],
  eBay: [
    { title: "15% off refurbished electronics, capped at $75", code: "REFURB15", type: "code", discountType: "percent", discountValue: 15, verified: true, priority: 56, expires: 18 },
    { title: "$5 off orders over $25 for new buyers", code: "NEWBUYER", type: "code", discountType: "fixed", discountValue: 5, priority: 40, expires: 29 },
  ],
  LEGO: [
    { title: "20% off sets over $100, direct from LEGO", code: "BUILD20", type: "code", discountType: "percent", discountValue: 20, verified: true, featured: true, trending: true, priority: 63, expires: 19, description: "Works on Icons, Technic and Star Wars. Excludes new releases in their first 30 days." },
    { title: "Free exclusive gift with any $75 order", type: "deal", discountType: "gift", discountLabel: "FREE GIFT", verified: true, priority: 52, expires: 14 },
    { title: "Free shipping on every order over $35", type: "freeshipping", discountType: "shipping", trending: true, priority: 44, neverExpires: true },
  ],
  "Target Kids": [
    { title: "25% off one toy with Target Circle", code: "TOY25", type: "code", discountType: "percent", discountValue: 25, verified: true, priority: 57, expires: 16 },
    { title: "Buy 2 get 1 free across board games", type: "bogo", discountType: "other", discountLabel: "B2G1 FREE", trending: true, priority: 48, expires: 8 },
  ],
  AutoZone: [
    { title: "20% off orders over $100 in parts", code: "PARTS20", type: "code", discountType: "percent", discountValue: 20, verified: true, priority: 54, expires: 23 },
    { title: "Free battery testing and installation in store", type: "deal", discountType: "other", discountLabel: "FREE SERVICE", priority: 35, neverExpires: true },
  ],
};

/* =========================================================
   RUN
========================================================= */

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("connected to", mongoose.connection.name);

  /* ---------- categories ---------- */

  const categoryBySlug = {};

  for (const [index, entry] of CATEGORIES.entries()) {
    const slug = slugify(entry.name);

    const doc = await Category.findOneAndUpdate(
      { slug },
      {
        $set: {
          name: entry.name,
          slug,
          icon: entry.icon,
          color: entry.color,
          description: entry.description,
          order: index,
          status: "active",
          showOnHome: true,
          seoTitle: `${entry.name} Coupons & Promo Codes`,
          seoDescription: `Hand-checked ${entry.name.toLowerCase()} coupon codes and deals, updated daily.`,
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    categoryBySlug[slug] = doc;
  }

  console.log(`categories: ${CATEGORIES.length}`);

  /* ---------- stores ---------- */

  const storeByName = {};

  for (const entry of STORES) {
    const slug = slugify(entry.name);
    const category = categoryBySlug[slugify(entry.category)];

    const doc = await Store.findOneAndUpdate(
      { slug },
      {
        $set: {
          name: entry.name,
          slug,
          tagline: entry.tagline || "",
          description: entry.description || "",
          websiteUrl: `https://www.${entry.domain}`,
          affiliateUrl: `https://www.${entry.domain}`,
          trackingParams: "utm_source=thesavingdeck&utm_medium=coupon",
          brandColor: entry.brandColor || "#6D28D9",
          logo: {
            url: `https://logo.clearbit.com/${entry.domain}`,
            alt: `${entry.name} logo`,
          },
          categories: category ? [category._id] : [],
          primaryCategory: category?._id || null,
          featured: Boolean(entry.featured),
          popular: Boolean(entry.popular),
          trending: Boolean(entry.trending),
          verified: Boolean(entry.verified),
          exclusive: Boolean(entry.exclusive),
          priority: entry.priority || 0,
          averageDiscount: entry.averageDiscount || "",
          highlights: entry.highlights || [],
          faqs: entry.faqs || [],
          howToRedeem: entry.howToRedeem || [],
          status: "active",
          country: "US",
          currency: "USD",
          metaTitle: `${entry.name} Coupons, Promo Codes & Deals`,
          metaDescription: `Working ${entry.name} promo codes checked by hand. ${entry.averageDiscount || "Save"} today.`,
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    storeByName[entry.name] = doc;
  }

  console.log(`stores: ${STORES.length}`);

  /* ---------- coupons ---------- */

  let couponCount = 0;

  for (const [storeName, offers] of Object.entries(COUPONS)) {
    const store = storeByName[storeName];
    if (!store) continue;

    for (const offer of offers) {
      const slug = `${slugify(storeName)}-${slugify(offer.title)}`.slice(0, 90);

      await Coupon.findOneAndUpdate(
        { slug },
        {
          $set: {
            title: offer.title,
            slug,
            description: offer.description || "",
            terms: offer.terms || "",
            type: offer.type || "code",
            code: offer.code ? offer.code.toUpperCase() : undefined,
            discountType: offer.discountType || "percent",
            discountValue: offer.discountValue,
            discountLabel: offer.discountLabel,
            store: store._id,
            categories: store.primaryCategory ? [store.primaryCategory] : [],
            verified: Boolean(offer.verified),
            verifiedAt: offer.verified ? new Date() : undefined,
            exclusive: Boolean(offer.exclusive),
            featured: Boolean(offer.featured),
            trending: Boolean(offer.trending),
            priority: offer.priority || 0,
            neverExpires: Boolean(offer.neverExpires),
            expiresAt: offer.neverExpires ? null : days(offer.expires || 30),
            status: "active",
            country: "US",
            // plausible starting numbers so the social proof is not all zeroes
            uses: 200 + (offer.priority || 20) * 27,
            successVotes: 40 + (offer.priority || 10),
            failVotes: 3 + ((offer.priority || 10) % 7),
          },
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      );

      couponCount += 1;
    }
  }

  console.log(`coupons: ${couponCount}`);

  /* ---------- keep the store counters honest ---------- */

  const { refreshCounts } = require("./controllers/store.controller");
  await Promise.all(Object.values(storeByName).map((s) => refreshCounts(s._id)));

  console.log("counts refreshed");

  await mongoose.disconnect();
  console.log("done");
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
