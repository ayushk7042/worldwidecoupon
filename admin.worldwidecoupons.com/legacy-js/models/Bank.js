import mongoose from "mongoose";

const bankSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  logo: { type: String },
  website: { type: String },
});

export default mongoose.model("Bank", bankSchema);
