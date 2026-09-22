const Category = require("../models/Category");
const News = require("../models/News");
const Contact = require("../models/Contact");

exports.getDashboardData = async (req, res) => {
  try {
    const categories = await Category.countDocuments();

    const totalNews = await News.countDocuments();

    const publishedNews = await News.countDocuments({
      status: "published"
    });

    const draftNews = await News.countDocuments({
      status: "draft"
    });

    const aiNews = await News.countDocuments({
      aiGenerated: true
    });

    const autoUpdateNews = await News.countDocuments({
      autoUpdateEnabled: true
    });

    const seoAgg = await News.aggregate([
      {
        $group: {
          _id: null,
          avgSeoScore: { $avg: "$seoScore" }
        }
      }
    ]);

    const avgSeoScore = seoAgg.length
      ? Math.round(seoAgg[0].avgSeoScore)
      : 0;

    const newContacts = await Contact.countDocuments({
      status: "new"
    });

    res.json({
      categories,
      totalNews,
      publishedNews,
      draftNews,
      aiNews,
      autoUpdateNews,
      avgSeoScore,
      newContacts
    });
  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).json({ message: "Dashboard error" });
  }
};
