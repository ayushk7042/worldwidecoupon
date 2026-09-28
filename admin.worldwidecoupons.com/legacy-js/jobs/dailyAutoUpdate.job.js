

const cron = require("node-cron");
const News = require("../models/News");
const Category = require("../models/Category");
const axios = require("axios");
const slugify = require("slugify");

const { optimizeSEO } = require("../services/seoOptimizer.service");
const { autoInternalLinking } = require("../services/internalLinker.service");

const { generateFullArticle } = require("../services/aiArticleGenerator.service");
const { markdownToBlocks } = require("../utils/markdownToBlocks");
const { extractTags } = require("../services/tagGenerator.service");


const GNEWS_API_KEY = process.env.GNEWS_API_KEY;

/* =========================
   HELPERS
========================= */

// Unique slug generator
const generateUniqueSlug = async (title) => {
  const base = slugify(title, { lower: true, strict: true });
  let slug = base;
  let i = 1;

  while (await News.findOne({ slug })) {
    slug = `${base}-${i}`;
    i++;
  }
  return slug;
};

// Strong duplicate checker
const isDuplicateNews = async (apiNews) => {
  // 1️⃣ URL based (strongest)
  if (apiNews.url) {
    const byUrl = await News.findOne({ sourceUrl: apiNews.url });
    if (byUrl) return true;
  }

  // 2️⃣ Title similarity
  const byTitle = await News.findOne({
    title: { $regex: apiNews.title?.substring(0, 40), $options: "i" }
  });
  if (byTitle) return true;

  return false;
};

// Fetch news from GNews (BEST API)
const normalizeQuery = (q) => {
  if (!q || typeof q !== "string") return "";
  // Special characters like '&' break GNews query syntax.
  // Convert common separators and remove extras.
  return q
    .trim()
    .replace(/&/g, " and ")
    .replace(/[\/:?#\[\]@!$'()*+,;=]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const fetchTopNews = async (query) => {
  if (!GNEWS_API_KEY) {
    throw new Error("GNEWS_API_KEY is not set in environment variables");
  }

  const safeQuery = normalizeQuery(query);
  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(
    safeQuery
  )}&lang=en&country=in&max=10&apikey=${GNEWS_API_KEY}`;

  try {
    const res = await axios.get(url);
    if (!res.data || !Array.isArray(res.data.articles)) {
      console.warn("gnews: unexpected response", res.data);
      return [];
    }
    return res.data.articles;
  } catch (error) {
    console.error("gnews request failed", {
      query,
      url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    return [];
  }
};

/* =========================
   CRON JOB
========================= */

const dailyAutoUpdateJob = () => {
  const runJob = async () => {
    console.log("🕒 Auto News Job Started");

    try {
      const categories = await Category.find({
        autoUpdateEnabled: true,
        status: "active"
      });

      for (const category of categories) {
        console.log(`📌 Category: ${category.name}`);

        const apiNewsList = await fetchTopNews(category.name);
        const limit = Math.min(
          category.dailyAutoUpdateLimit,
          apiNewsList.length
        );

        // Latest admin news (affiliate + blocks)
        const latestAdminNews = await News.find({
          category: category._id,
          aiGenerated: false
        })
          .sort({ updatedAt: -1 })
          .limit(1);

        let createdCount = 0;

        for (let i = 0; i < apiNewsList.length && createdCount < limit; i++) {
          const apiNews = apiNewsList[i];

          // Skip duplicates
          const duplicate = await isDuplicateNews(apiNews);
          if (duplicate) {
            console.log("⏭ Skipped duplicate:", apiNews.title);
            continue;
          }

          const title = apiNews.title;
          const subtitle = apiNews.source?.name || "";
          const description =
            apiNews.content ||
            apiNews.description ||
            "Detailed news article coming soon.";

          const imageUrl =
            apiNews.image ||
            `https://source.unsplash.com/800x600/?${encodeURIComponent(title)}`;

          const slug = await generateUniqueSlug(title);

// ===============================
// 🤖 AI FULL ARTICLE GENERATION
// ===============================
const aiMarkdown = await generateFullArticle({
  title,
  description,
  category: category.name
});

// Convert markdown → CMS blocks (H2/H3 auto)
const contentBlocks = markdownToBlocks(aiMarkdown);

// Extract tags + trending keywords
const tags = extractTags(title, aiMarkdown);


        //   const news = new News({
        //     category: category._id,
        //     title,
        //     subtitle,
        //     slug,
        //     description,
        //     featuredImage: { url: imageUrl, public_id: "" },

        //     contentBlocks: [
        //       { type: "text", value: description },
        //       ...(latestAdminNews[0]?.contentBlocks || [])
        //     ],

        //     affiliateLinks: latestAdminNews[0]?.affiliateLinks || [],

        //     seoTitle: title,
        //     seoDescription: description.slice(0, 160),
        //     seoKeywords: title.split(" "),
        //     sourceUrl: apiNews.url,
        //     sourceName: apiNews.source?.name,
        //     publishedAt: apiNews.publishedAt,

        //     status: "published",
        //     aiGenerated: true,
        //     createdBy: "ai",
        //     autoUpdateEnabled: false
        //   });

const news = new News({
  category: category._id,
  title,
  subtitle,
  slug,
  description,

  featuredImage: {
    url: imageUrl,
    public_id: ""
  },

  // 🔥 AI GENERATED CONTENT
  contentBlocks,
  tags,

  affiliateLinks: latestAdminNews[0]?.affiliateLinks || [],

  seoTitle: title,
  seoDescription: description.slice(0, 160),
  seoKeywords: tags,

  sourceUrl: apiNews.url,
  sourceName: apiNews.source?.name,
  publishedAt: apiNews.publishedAt,

  status: "published",
  aiGenerated: true,
  createdBy: "ai",
  autoUpdateEnabled: false
});


          await news.save();
          await autoInternalLinking(news);
          await optimizeSEO(news);

          createdCount++;
          console.log("✅ News Created:", title);
        }

        console.log(`🏁 Category Done: ${category.name}`);
      }

      console.log("🏁 Auto News Job Completed");
    } catch (err) {
      console.error("❌ Auto News Job Failed:", err.message);
    }
  };

  // Manual run (for testing)
  runJob();

  // Cron run
  cron.schedule(process.env.CRON_TIME || "0 2 * * *", runJob);
};

module.exports = dailyAutoUpdateJob;
