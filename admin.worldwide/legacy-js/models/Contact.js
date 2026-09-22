const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true
  },

  subject: String,

  message: {
    type: String,
    required: true
  },

  reply: {
    message: String,
    repliedAt: Date,
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin"
    }
  },

  status: {
    type: String,
    enum: ["new", "replied", "closed"],
    default: "new"
  }

}, { timestamps: true });

module.exports = mongoose.model("Contact", contactSchema);
