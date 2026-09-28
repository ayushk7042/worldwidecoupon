const News = require("../models/News");
const slugify = require("slugify");

exports.createNews = async (req, res) => {
  try {
    const slug = slugify(req.body.title, { lower: true });

    const news = await News.create({
      ...req.body,
      slug,
      createdBy: "admin"
    });

    res.status(201).json(news);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getNews = async (req, res) => {
  const news = await News.find()
    .populate("category")
    .sort({ createdAt: -1 });

  res.json(news);
};

exports.getNewsBySlug = async (req, res) => {
  const news = await News.findOne({ slug: req.params.slug })
    .populate("category internalLinks.news relatedNews");

  if (!news) return res.status(404).json({ message: "Not found" });

  news.views += 1;
  await news.save();

  res.json(news);
};

// exports.updateNews = async (req, res) => {
//   if (req.body.title) {
//     req.body.slug = slugify(req.body.title, { lower: true });
//   }

//   const news = await News.findByIdAndUpdate(
//     req.params.id,         
//     req.body,                       
//     { new: true }
//   );                               

//   res.json(news);
// };

exports.updateNews = async (req, res) => {
  try {
    if (req.body.title) {
      req.body.slug = slugify(req.body.title, { lower: true });
    }

    const news = await News.findOneAndUpdate(
      { slug: req.params.slug },
      req.body,
      { new: true }
    );

    if (!news) {
      return res.status(404).json({ message: "News not found" });
    }

    res.json(news);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.deleteNews = async (req, res) => {
  await News.findByIdAndDelete(req.params.id);
  res.json({ message: "News deleted" });
};

