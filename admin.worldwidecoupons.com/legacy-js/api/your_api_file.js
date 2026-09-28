const { GoogleGenerativeAI } = require("@google/generative-ai");

/* -------------------------------------------------
   Function to List Available Models
------------------------------------------------- */
const listAvailableModels = async () => {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const models = await genAI.listModels();
    console.log("Available Models:", models);
  } catch (error) {
    console.error("Error fetching models:", error.message);
  }
};

// Call the function to list models
listAvailableModels();