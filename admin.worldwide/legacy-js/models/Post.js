import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String },
    author: { type: String, default: "Admin" },
  },
  { timestamps: true }
);

const Post = mongoose.model("Post", postSchema);
export default Post;
