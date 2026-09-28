// const Homepage = require("../models/Homepage");

// exports.getHomepage = async (req, res) => {
//   const homepage = await Homepage.findOne()
//     .populate("mainTrending subTrending categorySections.category categorySections.trending categorySections.subTrending");

//   res.json(homepage);
// };

// exports.updateHomepage = async (req, res) => {
//   let homepage = await Homepage.findOne();

//   if (!homepage) {
//     homepage = await Homepage.create(req.body);
//   } else {
//     Object.assign(homepage, req.body);
//     await homepage.save();
//   }

//   res.json(homepage);
// };



const Homepage = require("../models/Homepage");
const mongoose = require("mongoose");

// exports.getHomepage = async (req, res) => {
//   try {
//     const homepage = await Homepage.findOne()
//       .populate(
//         "mainTrending subTrending categorySections.category categorySections.trending categorySections.subTrending"
//       );

//     // 👇 IMPORTANT: empty object return karo
//     res.json(homepage || {});
//   } catch (err) {
//     console.error("Get homepage error:", err);
//     res.status(500).json({ message: err.message });
//   }
// };


// exports.getHomepage = async (req, res) => {
//   try {
//     const homepage = await Homepage.findOne()
//       .populate(
//         "mainTrending subTrending categorySections.category categorySections.trending categorySections.subTrending"
//       );

//     const response = homepage || {};

//     res.json({
//       breaking: response.subTrending || [],
//       mainTrending: response.mainTrending || null,
//       categorySections: response.categorySections || [],
//       customHomeBlocks: response.customHomeBlocks || []
//     });

//   } catch (err) {
//     console.error("Get homepage error:", err);
//     res.status(500).json({ message: err.message });
//   }
// };



exports.getHomepage = async (req, res) => {
  try {
    const homepage = await Homepage.findOne().populate(
      "mainTrending subTrending categorySections.category categorySections.trending categorySections.subTrending"
    );

    const response = homepage || {};

    res.json({
      mainTrending: response.mainTrending || null,

      // 🔥 IMPORTANT FIXES
      subTrending: response.subTrending || [],
      editorPicks: response.subTrending || [], // temporary reuse
      trendingTopics: [], // optional

      breaking: response.subTrending || [],

      categorySections: response.categorySections || [],
      customHomeBlocks: response.customHomeBlocks || []
    });

  } catch (err) {
    console.error("Get homepage error:", err);
    res.status(500).json({ message: err.message });
  }
};




exports.updateHomepage = async (req, res) => {
  try {
    const data = req.body;

    // 🔒 SAFETY: Clean and validate data before saving
    if (data.mainTrending && data.mainTrending.length === 0) {
      delete data.mainTrending;
    }

    if (data.subTrending?.length > 5) {
      data.subTrending = data.subTrending.slice(0, 5);
    }

    if (Array.isArray(data.categorySections)) {
      data.categorySections = data.categorySections
        .filter(sec => sec && sec.category) // Remove invalid sections
        .map(sec => {
          const cleaned = {
            category: sec.category,
            trending: sec.trending || null,
            subTrending: Array.isArray(sec.subTrending) 
              ? sec.subTrending.slice(0, 5) 
              : []
          };
          return cleaned;
        });
    }

    let homepage = await Homepage.findOne();

    if (!homepage) {
      homepage = await Homepage.create(data);
    } else {
      // Clear old data and set new
      homepage.mainTrending = data.mainTrending || null;
      homepage.subTrending = data.subTrending || [];
      homepage.categorySections = data.categorySections || [];
      homepage.customHomeBlocks = data.customHomeBlocks || [];
      
      await homepage.save();
    }

    // Populate before responding
    await homepage.populate(
      "mainTrending subTrending categorySections.category categorySections.trending categorySections.subTrending"
    );

    res.json(homepage);
  } catch (err) {
    console.error("Update homepage error:", err);
    res.status(500).json({ message: err.message, error: err.toString() });
  }
};
