// // const OpenAI = require("openai");

// // const openai = new OpenAI({
// //   apiKey: process.env.OPENAI_API_KEY
// // });

// // const generateFullArticle = async ({ title, description, category }) => {
// //   const prompt = `
// // Write a professional news article of minimum 1000 words.

// // Title: ${title}
// // Category: ${category}

// // Instructions:
// // - Start with a strong introduction
// // - Use proper journalism tone
// // - Add multiple sections with headings
// // - Use H2 and H3 style headings
// // - Expand facts naturally
// // - End with a conclusion

// // Return result in MARKDOWN format.
// // `;

// //   const response = await openai.chat.completions.create({
// //     model: "gpt-4o-mini",
// //     messages: [{ role: "user", content: prompt }],
// //     temperature: 0.7
// //   });

// //   return response.choices[0].message.content;
// // };

// // module.exports = { generateFullArticle };



// // const OpenAI = require("openai");

// // /* -------------------------------------------------
// //    OpenAI Init (safe)
// // ------------------------------------------------- */
// // let openai = null;

// // if (process.env.OPENAI_API_KEY) {
// //   openai = new OpenAI({
// //     apiKey: process.env.OPENAI_API_KEY
// //   });
// // }

// const { GoogleGenerativeAI } = require("@google/generative-ai");

// /* -------------------------------------------------
//    Gemini Init (SAFE)
// ------------------------------------------------- */
// let gemini = null;

// if (process.env.GEMINI_API_KEY) {
//   const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
//   gemini = genAI.getGenerativeModel({
//     model: "gemini-1.5-flash"
//   });
// }


// /* -------------------------------------------------
//    FALLBACK MARKDOWN (STRING ONLY)
// ------------------------------------------------- */
// const generateFallbackArticle = ({ title, description, category }) => {
//   return `
// ${title}

// INTRODUCTION
// ${description || `This article highlights recent developments in the field of ${category}.`}

// BACKGROUND
// The ${category} industry has seen steady growth and rapid transformation in recent times. Experts believe these changes are shaping future trends.

// KEY DEVELOPMENTS
// Several important factors are contributing to this situation, including innovation, public interest, and industry participation.

// EXPERT INSIGHTS
// According to analysts, these developments may have a long-term impact on businesses, consumers, and policymakers.

// PUBLIC REACTION
// The topic has generated significant discussion across social media platforms and digital news outlets.

// WHAT HAPPENS NEXT
// Authorities and organizations are closely monitoring the situation, and further updates are expected soon.

// CONCLUSION
// ${title} marks an important moment in the ${category} sector. Readers are encouraged to stay informed as the story evolves.
// `;
// };

// /* -------------------------------------------------
//    MAIN GENERATOR
// ------------------------------------------------- */
// const generateFullArticle = async ({ title, description, category }) => {
//   // If OpenAI not available → fallback
//   if (!openai) {
//     console.warn("⚠️ OpenAI key missing, using fallback article");
//     return generateFallbackArticle({ title, description, category });
//   }

//   try {
//     const prompt = `
// Write a professional news article (minimum 700 words).

// Rules:
// - Return PLAIN TEXT (not JSON)
// - No markdown symbols like ## or ###
// - Use simple section titles in CAPS
// - Paragraph-based content

// Title: ${title}
// Category: ${category}
// `;

//     const response = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [{ role: "user", content: prompt }],
//       temperature: 0.7
//     });

//     return response.choices[0].message.content;
//   } catch (error) {
//     console.error(
//       "⚠️ OpenAI failed, switching to fallback:",
//       error.message
//     );
//     return generateFallbackArticle({ title, description, category });
//   }
// };

// module.exports = { generateFullArticle };





const { GoogleGenerativeAI } = require("@google/generative-ai");

/* -------------------------------------------------
   Gemini Init (SAFE)
------------------------------------------------- */
let gemini = null;

if (process.env.GEMINI_API_KEY) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  gemini = genAI.getGenerativeModel({
    model: "gemini-2.0-flash"
  });
}

/* -------------------------------------------------
   FALLBACK ARTICLE (NO AI)
------------------------------------------------- */
const generateFallbackArticle = ({ title, description, category }) => {
  return `
${title}

INTRODUCTION
${description || `This article highlights recent developments in ${category}.`}

BACKGROUND
The ${category} sector is evolving rapidly with new trends, technologies, and public interest.

KEY DEVELOPMENTS
Experts have observed strong momentum driven by innovation, policy changes, and market demand.

EXPERT INSIGHTS
Industry analysts believe these developments could shape future strategies and investments.

PUBLIC RESPONSE
The topic has sparked discussion across digital platforms and news channels.

WHAT COMES NEXT
Further updates are expected as organizations and authorities track the situation.

CONCLUSION
${title} is a significant development in the ${category} space and will be closely watched.
`;
};

/* -------------------------------------------------
   MAIN GENERATOR (GEMINI)
------------------------------------------------- */
const generateFullArticle = async ({ title, description, category }) => {
  if (!gemini) {
    console.warn("⚠️ Gemini key missing, using fallback");
    return generateFallbackArticle({ title, description, category });
  }

  try {
    const prompt = `
Write a professional long-form NEWS ARTICLE (minimum 700 words).

RULES:
- Plain text only (NO markdown, NO ###, NO bullets)
- Use section titles in CAPITAL LETTERS
- Paragraph based writing
- SEO friendly, informative, Indian context if possible

TITLE: ${title}
CATEGORY: ${category}
DESCRIPTION: ${description}
`;

    const result = await gemini.generateContent(prompt);
    const response = result.response.text();

    return response;
  } catch (error) {
    console.error("⚠️ Gemini failed, using fallback:", error.message);
    return generateFallbackArticle({ title, description, category });
  }
};

module.exports = { generateFullArticle };
