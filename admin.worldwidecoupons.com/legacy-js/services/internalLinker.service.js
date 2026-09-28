const News = require("../models/News");

exports.autoInternalLinking = async (news) => {
  const relatedNews = await News.find({
    _id: { $ne: news._id },
    category: news.category,
    status: "published"
  }).limit(5);

  //relatedNews.forEach((item) => {
//     news.internalLinks.push({
//       news: item._id,
//       anchorText: item.title,
//       isAutoLinked: true
//     });
//   });


news.internalLinks = news.internalLinks || [];

const existingIds = news.internalLinks.map(l => l.news.toString());

relatedNews.forEach(item => {
  if (!existingIds.includes(item._id.toString())) {
    news.internalLinks.push({
      news: item._id,
      anchorText: item.title,
      isAutoLinked: true
    });
  }
});

  news.relatedNews = relatedNews.map((n) => n._id);

  //await news.save();
  return news;
};
