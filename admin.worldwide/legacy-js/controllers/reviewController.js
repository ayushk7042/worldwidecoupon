// // // controllers/reviewController.js
// // import Review from "../models/Review.js";

// // export const getReviews = async (req, res) => {
// //   try {
// //     const reviews = await Review.find({ card: req.params.cardId }).sort({ createdAt: -1 });
// //     res.json(reviews);
// //   } catch (err) {
// //     res.status(500).json({ message: "Failed to fetch reviews" });
// //   }
// // };

// // export const addReview = async (req, res) => {
// //   try {
// //     const { rating, comment } = req.body;
// //     if (!rating || !comment) return res.status(400).json({ message: "Rating and comment required" });

// //     const review = new Review({
// //       card: req.params.cardId,
// //       userName: req.user.name, // from auth middleware
// //       rating,
// //       comment,
// //     });

// //     await review.save();
// //     res.status(201).json(review);
// //   } catch (err) {
// //     res.status(500).json({ message: "Failed to add review" });
// //   }
// // };
// import Review from "../models/Review.js";

// export const addReview = async (req, res) => {
//   try {
//     const { user, comment, rating } = req.body;
//     const cardId = req.params.cardId;

//     if (!user || !comment || !rating) {
//       return res.status(400).json({ message: "All fields are required" });
//     }

//     const review = new Review({ card: cardId, user, comment, rating });
//     await review.save();

//     res.status(201).json(review);
//   } catch (err) {
//     console.error("Failed to add review:", err);
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// };

// export const getReviewsByCard = async (req, res) => {
//   try {
//     const reviews = await Review.find({ card: req.params.cardId }).sort({ createdAt: -1 });
//     res.json(reviews);
//   } catch (err) {
//     console.error("Failed to fetch reviews:", err);
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// };
import Review from "../models/Review.js";
import Card from "../models/Card.js";

// GET all reviews for a card
export const getReviewsByCard = async (req, res) => {
  try {
    const { cardId } = req.params;
    const reviews = await Review.find({ card: cardId }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    console.error("Failed to fetch reviews:", err);
    res.status(500).json({ message: "Server error fetching reviews" });
  }
};

// POST a new review
// export const addReview = async (req, res) => {
//   try {
//     const { cardId } = req.params;
//     const { username, rating, comment } = req.body;

//     if (!username || !rating || !comment) {
//       return res.status(400).json({ message: "All fields are required" });
//     }

//     // Check if card exists
//     const card = await Card.findById(cardId);
//     if (!card) {
//       return res.status(404).json({ message: "Card not found" });
//     }

//     const review = new Review({
//       card: cardId,
//       username,
//       rating,
//       comment,
//     });

//     await review.save();

//     res.status(201).json(review);
//   } catch (err) {
//     console.error("Failed to add review:", err);
//     res.status(500).json({ message: "Server error adding review" });
//   }
// };
export const addReview = async (req, res) => {
  try {
    const { cardId } = req.params;
    const { username, rating, comment } = req.body;

    // Validation
    if (!cardId) {
      return res.status(400).json({ message: "Card ID missing" });
    }

    if (!username || !comment || !rating) {
      return res.status(400).json({ message: "All fields (username, rating, comment) are required" });
    }

    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }

    const review = new Review({
      card: cardId,
      username,
      rating,
      comment,
    });

    const savedReview = await review.save();
    return res.status(201).json(savedReview);
  } catch (error) {
    console.error("Error adding review:", error);
    return res.status(500).json({ message: "Server error while adding review" });
  }
};