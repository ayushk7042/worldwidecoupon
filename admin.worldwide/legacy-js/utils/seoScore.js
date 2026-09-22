const calculateSeoScore = (news) => {
  let score = 0;

  if (news.title && news.title.length >= 40) score += 20;
  if (news.seoTitle) score += 10;
  if (news.seoDescription && news.seoDescription.length >= 120) score += 20;
  if (news.internalLinks?.length >= 3) score += 20;
  if (news.contentBlocks?.length >= 3) score += 20;
  if (news.seoKeywords?.length >= 3) score += 10;

  return Math.min(score, 100);
};

module.exports = calculateSeoScore;
