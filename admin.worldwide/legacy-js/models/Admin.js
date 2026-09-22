const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({

  name: String,

  email: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String,
    required: true,
    select: false
  },

  role: {
    type: String,
    enum: ["superadmin", "editor"],
    default: "superadmin"
  },

  permissions: {
    canPublish: { type: Boolean, default: true },
    canDelete: { type: Boolean, default: true }
  }

}, { timestamps: true });

module.exports = mongoose.model("Admin", adminSchema);
