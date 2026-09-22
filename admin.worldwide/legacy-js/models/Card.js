import mongoose from "mongoose";

const cardSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    image: { type: String },
    bank: { type: String },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    fees: { type: String },
    
    applyLink: { type: String },
    description: { type: String },

    rewards: [{ type: String }],
  benefits: [{ type: String }],
  offers: [{ type: String }],
  interestRate: { type: String },
  },
  { timestamps: true }
);

const Card = mongoose.model("Card", cardSchema);
export default Card;
