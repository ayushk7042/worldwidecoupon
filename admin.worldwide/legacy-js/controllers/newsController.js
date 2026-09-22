
import News from "../models/News.js";

// 📰 Get all news
export const getNews = async (req, res) => {
  try {
    const news = await News.find().sort({ createdAt: -1 });
    //res.json(news);
    res.json({ success: true, news });
  } catch (error) {
    console.error("❌ Get News Error:", error);
    res.status(500).json({ message: "Failed to fetch news", error: error.message });
  }
};

// 📰 Get a single news item
export const getNewsById = async (req, res) => {
  try {
    const newsItem = await News.findById(req.params.id);
    if (!newsItem) return res.status(404).json({ message: "News not found" });
    res.json(newsItem);
  } catch (error) {
    console.error("❌ Get News by ID Error:", error);
    res.status(500).json({ message: "Failed to fetch news", error: error.message });
  }
};

export const createNews = async (req, res) => {
  try {
    console.log("REQ.BODY:", req.body);
    console.log("REQ.FILE:", req.file);

    const { title, summary, content, category, author } = req.body;

    if (!title || !summary) {
      return res.status(400).json({ message: "Title and summary are required." });
    }

    // ✅ Cloudinary returns a public URL in req.file.path
    const image = req.file ? req.file.path : null;

    const news = new News({
      title,
      summary,
      content,
      category,
      author,
      image, // save Cloudinary URL (NOT /uploads/)
    });

    await news.save();

    res.status(201).json({
      success: true,
      message: "✅ News created successfully",
      news,
    });
  } catch (error) {
    console.error("❌ CREATE NEWS ERROR:", error);
    res.status(500).json({ message: "Failed to create news", error: error.message });
  }
};

// 📰 Update news (✅ FIXED for Cloudinary)
export const updateNews = async (req, res) => {
  try {
    const { title, summary, content, category, author } = req.body;
    const newsItem = await News.findById(req.params.id);

    if (!newsItem) return res.status(404).json({ message: "News not found" });

    if (req.file) {
      newsItem.image = req.file.path; // ✅ Cloudinary URL
    }

    newsItem.title = title || newsItem.title;
    newsItem.summary = summary || newsItem.summary;
    newsItem.content = content || newsItem.content;
    newsItem.category = category || newsItem.category;
    newsItem.author = author || newsItem.author;

    await newsItem.save();

    res.json({ message: "✅ News updated successfully", newsItem });
  } catch (error) {
    console.error("❌ Update News Error:", error);
    res.status(500).json({ message: "Failed to update news", error: error.message });
  }
};

// export const createNews = async (req, res) => {
//   try {
//     console.log("REQ.BODY:", req.body);
//     console.log("REQ.FILE:", req.file);

//     const { title, summary, content, category, author } = req.body;
//     const image = req.file ? `/uploads/${req.file.filename}` : null;

//     if (!title || !summary) {
//       return res.status(400).json({ message: "Title and summary are required." });
//     }

//     const news = new News({ title, summary, content, category, author, image });
//     await news.save();

//     res.status(201).json({
//       success: true,
//       message: "✅ News created successfully",
//       news,
//     });
//   } catch (error) {
//     console.error("❌ CREATE NEWS ERROR:", error);
//     res.status(500).json({ message: "Failed to create news", error: error.message });
//   }
// };

// // 📰 Update news
// export const updateNews = async (req, res) => {
//   try {
//     const { title, summary, content, category, author } = req.body;
//     const newsItem = await News.findById(req.params.id);

//     if (!newsItem) return res.status(404).json({ message: "News not found" });

//     if (req.file) {
//       newsItem.image = req.file?.path || req.file?.url;
//     }

//     newsItem.title = title || newsItem.title;
//     newsItem.summary = summary || newsItem.summary;
//     newsItem.content = content || newsItem.content;
//     newsItem.category = category || newsItem.category;
//     newsItem.author = author || newsItem.author;

//     await newsItem.save();
//     res.json({ message: "✅ News updated successfully", newsItem });
//   } catch (error) {
//     console.error("❌ Update News Error:", error);
//     res.status(500).json({ message: "Failed to update news", error: error.message });
//   }
// };

// 📰 Delete news
export const deleteNews = async (req, res) => {
  try {
    const newsItem = await News.findById(req.params.id);
    if (!newsItem) return res.status(404).json({ message: "News not found" });

    await newsItem.deleteOne();
    res.json({ message: "🗑️ News deleted successfully" });
  } catch (error) {
    console.error("❌ Delete News Error:", error);
    res.status(500).json({ message: "Failed to delete news", error: error.message });
  }
};
