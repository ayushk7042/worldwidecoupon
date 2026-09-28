// // models/Review.js
// import mongoose from "mongoose";

// const reviewSchema = mongoose.Schema(
//   {
//     card: { type: mongoose.Schema.Types.ObjectId, ref: "Card", required: true },
//     userName: { type: String, required: true },
//     rating: { type: Number, required: true, min: 1, max: 5 },
//     comment: { type: String, required: true },
//   },
//   { timestamps: true }
// );

// const Review = mongoose.model("Review", reviewSchema);
// export default Review;
import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  card: { type: mongoose.Schema.Types.ObjectId, ref: "Card", required: true },
  username: { type: String, required: true },
  comment: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
}, { timestamps: true });

export default mongoose.model("Review", reviewSchema);
