import Post from "../models/Post.js";

// Get All
export const getPosts = async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch posts" });
  }
};

// Create
export const createPost = async (req, res) => {
  try {
    const { title, category, description, author } = req.body;
    const image = req.file ? req.file.path : null;

    const post = new Post({ title, category, description, image, author });
    const created = await post.save();
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ message: "Failed to create post" });
  }
};

// Update
export const updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    post.title = req.body.title || post.title;
    post.category = req.body.category || post.category;
    post.description = req.body.description || post.description;
    post.author = req.body.author || post.author;
    if (req.file) post.image = req.file.path;

    const updated = await post.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Failed to update post" });
  }
};

// Delete
export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    await post.deleteOne();
    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete post" });
  }
};
