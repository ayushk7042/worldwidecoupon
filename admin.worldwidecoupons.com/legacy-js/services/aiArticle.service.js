const News = require("../models/News");
const Category = require("../models/Category");
const slugify = require("slugify");

/**
 * Dummy AI generator (abhi)
 * Future me OpenAI / Gemini / Claude connect hoga
 */
const generateAIContent = async (topic) => {
  return {
    title: topic,
    description: `This article explains ${topic} in detail.`,
    contentBlocks: [
      {
        type: "text",
        value: `${topic} is an important topic in today's world.`
      },
      {
        type: "text",
        value: `Experts believe ${topic} will grow significantly in coming years.`
      }
    ],
    seoKeywords: topic.split(" ")
  };
};

exports.generateAIArticle = async ({ topic, categoryId }) => {
  const category = await Category.findById(categoryId);
  if (!category) throw new Error("Category not found");

  const aiContent = await generateAIContent(topic);

  const news = await News.create({
    category: category._id,
    title: aiContent.title,
    slug: slugify(aiContent.title, { lower: true }),
    description: aiContent.description,
    contentBlocks: aiContent.contentBlocks,
    seoKeywords: aiContent.seoKeywords,
    aiGenerated: true,
    createdBy: "ai",
    status: "published",
    autoUpdateEnabled: true,
lastAutoUpdatedAt: new Date()
  });

  return news;
};
