


// import Card from "../models/Card.js";

// // Get all cards
// export const getCards = async (req, res) => {
//   try {
//     const cards = await Card.find().populate("category");
//     res.json(cards);
//   } catch (error) {
//     res.status(500).json({ message: "Failed to fetch cards", error: error.message });
//   }
// };

// // Get single card by ID
// export const getCardById = async (req, res) => {
//   try {
//     const card = await Card.findById(req.params.id).populate("category");
//     if (!card) return res.status(404).json({ message: "Card not found" });
//     res.json(card);
//   } catch (error) {
//     res.status(500).json({ message: "Server Error", error: error.message });
//   }
// };

// // Create card
// // export const createCard = async (req, res) => {
// //   try {
// //     const { 
// //       title, 
// //       bank, 
// //       category, 
// //       description, 
// //       applyLink, 
// //       rewards, 
// //       benefits, 
// //       offers, 
// //       interestRate 
// //     } = req.body;

// //     if (!title || !bank || !category) {
// //       return res.status(400).json({ message: "Title, bank, and category are required." });
// //     }

// //     const image = req.file?.path || null;

// //     const card = new Card({
// //       title,
// //       bank,
// //       category,
// //       description,
// //       applyLink,
// //       rewards: rewards ? rewards.split(",").map(r => r.trim()) : [],
// //       benefits: benefits ? benefits.split(",").map(b => b.trim()) : [],
// //       offers: offers ? offers.split(",").map(o => o.trim()) : [],
// //       interestRate,
// //       image,
// //     });

// //     await card.save();
// //     res.status(201).json(card);

// //   } catch (error) {
// //     res.status(500).json({ message: "Failed to create card", error: error.message });
// //   }
// // };

// // // Update card
// // export const updateCard = async (req, res) => {
// //   try {
// //     const card = await Card.findById(req.params.id);
// //     if (!card) return res.status(404).json({ message: "Card not found" });

// //     const { 
// //       title, 
// //       bank, 
// //       category, 
// //       description, 
// //       applyLink, 
// //       rewards, 
// //       benefits, 
// //       offers, 
// //       interestRate 
// //     } = req.body;

// //     card.title = title || card.title;
// //     card.bank = bank || card.bank;
// //     card.category = category || card.category;
// //     card.description = description || card.description;
// //     card.applyLink = applyLink || card.applyLink;
// //     card.rewards = rewards ? rewards.split(",").map(r => r.trim()) : card.rewards;
// //     card.benefits = benefits ? benefits.split(",").map(b => b.trim()) : card.benefits;
// //     card.offers = offers ? offers.split(",").map(o => o.trim()) : card.offers;
// //     card.interestRate = interestRate || card.interestRate;
// //     card.image = req.file?.path || card.image;

// //     await card.save();
// //     res.json(card);

// //   } catch (error) {
// //     res.status(500).json({ message: "Failed to update card", error: error.message });
// //   }
// // };

// // Create card
// export const createCard = async (req, res) => {
//   try {
//     const { 
//       title, 
//       bank, 
//       category, 
//       description, 
//       applyLink, 
//       rewards, 
//       benefits, 
//       offers, 
//       interestRate 
//     } = req.body;

//     if (!title || !bank || !category) {
//       return res.status(400).json({ message: "Title, bank, and category are required." });
//     }

//     const image = req.file?.path || null;

//     const card = new Card({
//       title,
//       bank,
//       category,
//       description,
//       applyLink,
//       rewards: Array.isArray(rewards) ? rewards : rewards?.split(",").map(r => r.trim()),
//       benefits: Array.isArray(benefits) ? benefits : benefits?.split(",").map(b => b.trim()),
//       offers: Array.isArray(offers) ? offers : offers?.split(",").map(o => o.trim()),
//       interestRate,
//       image,
//     });

//     await card.save();
//     res.status(201).json(card);

//   } catch (error) {
//     res.status(500).json({ message: "Failed to create card", error: error.message });
//   }
// };

// // Update card
// export const updateCard = async (req, res) => {
//   try {
//     const card = await Card.findById(req.params.id);
//     if (!card) return res.status(404).json({ message: "Card not found" });

//     const { 
//       title, 
//       bank, 
//       category, 
//       description, 
//       applyLink, 
//       rewards, 
//       benefits, 
//       offers, 
//       interestRate 
//     } = req.body;

//     card.title = title || card.title;
//     card.bank = bank || card.bank;
//     card.category = category || card.category;
//     card.description = description || card.description;
//     card.applyLink = applyLink || card.applyLink;
//     card.rewards = Array.isArray(rewards) ? rewards : rewards?.split(",").map(r => r.trim());
//     card.benefits = Array.isArray(benefits) ? benefits : benefits?.split(",").map(b => b.trim());
//     card.offers = Array.isArray(offers) ? offers : offers?.split(",").map(o => o.trim());
//     card.interestRate = interestRate || card.interestRate;
//     card.image = req.file?.path || card.image;

//     await card.save();
//     res.json(card);

//   } catch (error) {
//     res.status(500).json({ message: "Failed to update card", error: error.message });
//   }
// };


// // Delete card
// export const deleteCard = async (req, res) => {
//   try {
//     const card = await Card.findById(req.params.id);
//     if (!card) return res.status(404).json({ message: "Card not found" });

//     await card.remove();
//     res.json({ message: "Card deleted successfully" });

//   } catch (error) {
//     res.status(500).json({ message: "Failed to delete card", error: error.message });
//   }
// };

import Card from "../models/Card.js";

// ✅ Get all cards
export const getCards = async (req, res) => {
  try {
    const cards = await Card.find().populate("category");
    res.json(cards);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch cards", error: error.message });
  }
};

// ✅ Get single card by ID
export const getCardById = async (req, res) => {
  try {
    const card = await Card.findById(req.params.id).populate("category");
    if (!card) return res.status(404).json({ message: "Card not found" });
    res.json(card);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ✅ Create new card
export const createCard = async (req, res) => {
  try {
    const { 
      title, 
      bank, 
      category, 
      description, 
      applyLink, 
      rewards, 
      benefits, 
      offers, 
      interestRate, 
      fees 
    } = req.body;

    if (!title || !bank || !category) {
      return res.status(400).json({ message: "Title, bank, and category are required." });
    }

    // 🧩 Handle array fields safely (string or JSON)
    const parseField = (field) => {
      if (!field) return [];
      if (Array.isArray(field)) return field;
      try {
        const parsed = JSON.parse(field);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return field.split(",").map((f) => f.trim());
      }
    };

    const image = req.file?.path || null;

    const card = new Card({
      title,
      bank,
      category,
      description,
      applyLink,
      fees,
      rewards: parseField(rewards),
      benefits: parseField(benefits),
      offers: parseField(offers),
      interestRate,
      image,
    });

    await card.save();
    res.status(201).json({ message: "Card created successfully ✅", card });

  } catch (error) {
    console.error("❌ Error creating card:", error);
    res.status(500).json({ message: "Failed to create card", error: error.message });
  }
};

// ✅ Update existing card
export const updateCard = async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) return res.status(404).json({ message: "Card not found" });

    const { 
      title, 
      bank, 
      category, 
      description, 
      applyLink, 
      rewards, 
      benefits, 
      offers, 
      interestRate, 
      fees 
    } = req.body;

    const parseField = (field) => {
      if (!field) return [];
      if (Array.isArray(field)) return field;
      try {
        const parsed = JSON.parse(field);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return field.split(",").map((f) => f.trim());
      }
    };

    card.title = title || card.title;
    card.bank = bank || card.bank;
    card.category = category || card.category;
    card.description = description || card.description;
    card.applyLink = applyLink || card.applyLink;
    card.fees = fees || card.fees;
    card.rewards = rewards ? parseField(rewards) : card.rewards;
    card.benefits = benefits ? parseField(benefits) : card.benefits;
    card.offers = offers ? parseField(offers) : card.offers;
    card.interestRate = interestRate || card.interestRate;
    card.image = req.file?.path || card.image;

    await card.save();
    res.json({ message: "Card updated successfully ✅", card });

  } catch (error) {
    console.error("❌ Error updating card:", error);
    res.status(500).json({ message: "Failed to update card", error: error.message });
  }
};

// ✅ Delete card
export const deleteCard = async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) return res.status(404).json({ message: "Card not found" });

    await card.deleteOne();
    res.json({ message: "Card deleted successfully ✅" });

  } catch (error) {
    res.status(500).json({ message: "Failed to delete card", error: error.message });
  }
};
