const mongoose = require("mongoose");

const homepageSchema = new mongoose.Schema({

  mainTrending: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "News"
  },

  subTrending: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "News"
    }
  ], // max 5 (controller me enforce hoga)

  categorySections: [
    {
      category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category"
      },

      trending: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "News"
      },

      subTrending: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "News"
        }
      ] // max 5
    }
  ],

  customHomeBlocks: [
    {
      title: String,
      link: String,
      image: String,
      order: Number
    }
  ]

}, { timestamps: true });

module.exports = mongoose.model("Homepage", homepageSchema);
