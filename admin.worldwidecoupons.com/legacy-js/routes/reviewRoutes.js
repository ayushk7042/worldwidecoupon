// // routes/reviewRoutes.js
// import express from "express";
// import { getReviews, addReview } from "../controllers/reviewController.js";
// import { protect } from "../middleware/authMiddleware.js";
// import { getReviewsByCard, addReview } from "../controllers/reviewController.js";

// const router = express.Router();

// // Get reviews for a card
// router.get("/:cardId", getReviewsByCard);

// // Add review for a card (protected)
// router.post("/:cardId",  addReview);

// export default router;
import express from "express";
import { getReviewsByCard, addReview } from "../controllers/reviewController.js";

const router = express.Router();

// Get all reviews for a specific card
router.get("/:cardId", getReviewsByCard);

// Add a new review to a card
router.post("/:cardId", addReview);

export default router;
