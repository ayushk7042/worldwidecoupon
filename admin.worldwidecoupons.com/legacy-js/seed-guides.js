/**
 * Savings guides — the blog that sits alongside the coupon listings.
 *
 * Re-runnable: matched on slug and updated in place.
 *
 *   node seed-guides.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

const Category = require("./models/Category");
const News = require("./models/News");

const slugify = (text = "") =>
  text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

const daysAgo = (n) => new Date(Date.now() - n * 86_400_000);

const p = (...paragraphs) => paragraphs.map((line) => `<p>${line}</p>`).join("");

const GUIDES = [
  {
    title: "The best day of the week to buy almost anything",
    category: "Electronics",
    author: "Priya Raman",
    image: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1200&q=80",
    readTime: 6,
    featured: true,
    trending: true,
    days: 1,
    short:
      "Retail pricing runs on a schedule. Learn it, and the same basket costs less without a single code.",
    body:
      p(
        "Prices are not fixed. Most large retailers re-price on a weekly cycle, and once you know where a category sits in that cycle you stop paying the peak.",
        "<strong>Electronics</strong> reset on Thursday night, ahead of the weekend traffic. Buy Friday morning and you catch the new price before stock thins out."
      ) +
      "<h2>The weekly map</h2>" +
      p(
        "<strong>Monday</strong> — airlines publish fare sales overnight on Monday, so Tuesday morning is the cheapest window for flights.",
        "<strong>Wednesday</strong> — groceries. New circulars go live, and the previous week's markdowns are still on the shelf.",
        "<strong>Thursday</strong> — clothing. Weekend promotions load early, and the sizes have not been picked over yet.",
        "<strong>Sunday</strong> — furniture and appliances. Showrooms clear the floor before the new week's delivery."
      ) +
      "<h2>What this is worth</h2>" +
      p(
        "On a $900 basket, timing alone tends to be worth 8–12%. Stack a code on top and you are into real money without changing what you bought."
      ),
  },
  {
    title: "How to stack a coupon code with a sale (and when you can't)",
    category: "Fashion & Apparel",
    author: "Marcus Bell",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80",
    readTime: 5,
    featured: true,
    days: 3,
    short:
      "Stacking is the difference between a good discount and a great one. Here is what actually combines.",
    body:
      p(
        "Every checkout applies discounts in an order, and that order decides whether your code survives. Get it wrong and the site quietly tells you the code is invalid when the real problem is sequencing."
      ) +
      "<h2>What usually stacks</h2>" +
      p(
        "Percentage-off codes almost always work on top of an already-reduced price, because the reduction is baked into the item price rather than applied at the basket.",
        "Free shipping stacks with nearly everything — it is calculated separately from the merchandise total.",
        "Cashback through a browser extension stacks with a code, because it settles after the order completes."
      ) +
      "<h2>What almost never stacks</h2>" +
      p(
        "Two basket-level codes. Checkouts hold one promo field for a reason.",
        "A code plus a loyalty-points redemption, at most department stores.",
        "Anything on a doorbuster. Those exclusions are written specifically to stop this."
      ) +
      "<h2>The order to try</h2>" +
      p(
        "Add everything to the basket, apply the code first, then the gift card, then the points. If the code fails, remove sale items one at a time — an exclusion on a single line often blocks the whole basket."
      ),
  },
  {
    title: "Nine store policies that quietly give you money back",
    category: "Home & Garden",
    author: "Dana Whitfield",
    image: "https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=1200&q=80",
    readTime: 7,
    trending: true,
    days: 5,
    short:
      "Price adjustments, extended returns, and the guarantee almost nobody claims.",
    body:
      p(
        "The best discount is often one you claim after you have already paid. These policies exist, are published, and go almost entirely unused."
      ) +
      "<h2>Price adjustment</h2>" +
      p(
        "If an item drops within 14 days of purchase, most large retailers will refund the difference. You keep the item; they send the money back to your card. One email with the order number is usually enough."
      ) +
      "<h2>Price matching</h2>" +
      p(
        "Many chains match a competitor's advertised price, including that competitor's own online price. Screenshot it before you go to the counter."
      ) +
      "<h2>Extended holiday returns</h2>" +
      p(
        "Anything bought from early November usually runs until late January. That is a longer window to decide than the standard 30 days."
      ) +
      "<h2>Shipping guarantees</h2>" +
      p(
        "Paid for express and it arrived late? The shipping fee is refundable at almost every retailer, but only if you ask."
      ),
  },
  {
    title: "Travel booking: the 60-day rule that beats every flash sale",
    category: "Travel",
    author: "Priya Raman",
    image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&q=80",
    readTime: 6,
    days: 8,
    short:
      "Airlines and hotels price on demand curves, and there is a window where both bottom out.",
    body:
      p(
        "Flash sales are marketing. The reliable saving comes from booking inside the window where the airline still wants to fill seats but has stopped discounting aggressively."
      ) +
      "<h2>Flights</h2>" +
      p(
        "For domestic routes that window is roughly 30 to 60 days out. Earlier and you pay the advance premium; later and you pay the scarcity premium.",
        "International runs longer — 60 to 120 days, and further for peak season."
      ) +
      "<h2>Hotels</h2>" +
      p(
        "The opposite. Book refundable early, then re-check about a week out. Unsold rooms get repriced, and a refundable booking lets you take the lower rate for free."
      ) +
      "<h2>Where a code fits</h2>" +
      p(
        "Package codes are worth more than hotel-only codes, because the discount applies to the combined total. On a $1,400 trip a $100 package code beats 10% off the hotel alone."
      ),
  },
  {
    title: "Why your coupon code was rejected — and how to fix it",
    category: "Beauty & Health",
    author: "Marcus Bell",
    image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200&q=80",
    readTime: 4,
    days: 12,
    short:
      "Six reasons a working code still fails at checkout, in the order worth checking.",
    body:
      p(
        "A rejected code usually is not a dead code. Work down this list before you give up on it."
      ) +
      "<h2>1. A basket exclusion</h2>" +
      p(
        "One excluded brand in the basket can block the entire order. Remove items one at a time to find it."
      ) +
      "<h2>2. The minimum spend</h2>" +
      p(
        "Checked before shipping and tax. A $50 minimum means $50 of merchandise."
      ) +
      "<h2>3. New customers only</h2>" +
      p(
        "Tied to the email, not the card. A different address on the account is the usual fix."
      ) +
      "<h2>4. Region locked</h2>" +
      p("US codes routinely fail on the UK or Canadian storefront of the same brand.") +
      "<h2>5. Already used</h2>" +
      p("Single-use codes are consumed the moment they are applied, even on an abandoned basket.") +
      "<h2>6. It genuinely expired</h2>" +
      p(
        "If you got the code from us, tell us — the thumbs-down on the code panel pulls it for re-checking the same day."
      ),
  },
  {
    title: "Grocery delivery is cheaper than you think, if you set it up once",
    category: "Food & Dining",
    author: "Dana Whitfield",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=80",
    readTime: 5,
    days: 16,
    short:
      "Fees vanish above a threshold most households already cross. The setup takes ten minutes.",
    body:
      p(
        "Delivery looks expensive because the fees are visible and the savings are not. Run the comparison properly and the gap closes fast."
      ) +
      "<h2>The threshold</h2>" +
      p(
        "Nearly every service drops the delivery fee above $35. A weekly shop for two clears it comfortably, which makes the annual membership the only real cost."
      ) +
      "<h2>What you stop spending</h2>" +
      p(
        "Impulse buying falls sharply when you shop from a list on a screen. Household studies put it at 15–20% of a typical basket.",
        "You also stop the second trip, which is where most of the unplanned spend happens."
      ) +
      "<h2>Set it up once</h2>" +
      p(
        "Build a repeating order for the things you always buy, then edit it weekly. Ten minutes now, two minutes a week after."
      ),
  },
];

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("connected to", mongoose.connection.name);

  const categories = await Category.find().lean();
  const byName = Object.fromEntries(categories.map((c) => [c.name, c]));

  let count = 0;

  for (const guide of GUIDES) {
    const slug = slugify(guide.title);
    const category = byName[guide.category] || categories[0];

    await News.findOneAndUpdate(
      { slug },
      {
        $set: {
          title: guide.title,
          slug,
          category: category?._id,
          description: guide.short,
          shortDescription: guide.short,
          excerpt: guide.short,
          content: guide.body,
          contentBlocks: [{ type: "text", value: guide.body, meta: { html: true } }],
          featuredImage: { url: guide.image, alt: guide.title },
          author: { name: guide.author, designation: "Savings editor" },
          readTime: guide.readTime,
          featured: Boolean(guide.featured),
          trending: Boolean(guide.trending),
          editorsPick: Boolean(guide.featured),
          status: "published",
          publishedDate: daysAgo(guide.days),
          language: "en",
          country: "US",
          views: 400 + guide.readTime * 137,
          metaTitle: guide.title,
          metaDescription: guide.short,
          seoTitle: guide.title,
          seoDescription: guide.short,
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    count += 1;
  }

  console.log(`guides: ${count}`);

  await mongoose.disconnect();
  console.log("done");
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
