const calculateScore = (news) => {
  let score = 0;

  if (news.title && news.title.length >= 40) score += 20;
  if (news.seoTitle) score += 10;
  if (news.seoDescription && news.seoDescription.length >= 120) score += 20;
  if (news.internalLinks?.length >= 3) score += 20;
  if (news.contentBlocks?.length >= 3) score += 20;
  if (news.seoKeywords?.length >= 3) score += 10;

  return Math.min(score, 100);
};

exports.optimizeSEO = async (news) => {
  const suggestions = [];

  if (!news.seoTitle) {
    suggestions.push({
      field: "seoTitle",
      suggestion: "Add SEO optimized title"
    });
  }

  if (!news.seoDescription) {
    suggestions.push({
      field: "seoDescription",
      suggestion: "Add meta description (120–160 chars)"
    });
  }

  if (!news.internalLinks || news.internalLinks.length < 3) {
    suggestions.push({
      field: "internalLinks",
      suggestion: "Add more internal links"
    });
  }

  news.seoScore = calculateScore(news);
  news.seoSuggestions = suggestions;
  news.seoLastOptimizedAt = new Date();

  //await news.save();
  return news;
};
