const mongoose = require("mongoose");

/**
 * One document per bulk import run. Keeps the full error report and the list of
 * touched article ids so an import can be rolled back.
 */
const importJobSchema = new mongoose.Schema(
  {
    batchId: { type: String, required: true, unique: true, index: true },

    fileName: String,
    fileType: { type: String, enum: ["xlsx", "csv"], default: "xlsx" },

    mode: {
      type: String,
      enum: ["create", "upsert"], // upsert = update existing by slug
      default: "upsert",
    },

    status: {
      type: String,
      enum: ["validated", "importing", "completed", "failed", "rolled_back"],
      default: "validated",
      index: true,
    },

    totalRows: { type: Number, default: 0 },
    createdCount: { type: Number, default: 0 },
    updatedCount: { type: Number, default: 0 },
    skippedCount: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },

    issues: [
      {
        row: Number,
        field: String,
        message: String,
        value: String,
      },
    ],

    // ids created by this batch — required for rollback
    createdIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "News" }],

    // snapshots of documents updated by this batch, for rollback
    updatedSnapshots: [
      {
        newsId: { type: mongoose.Schema.Types.ObjectId, ref: "News" },
        before: mongoose.Schema.Types.Mixed,
      },
    ],

    startedAt: Date,
    finishedAt: Date,
    rolledBackAt: Date,

    createdByAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

importJobSchema.index({ createdAt: -1 });

module.exports =
  mongoose.models.ImportJob || mongoose.model("ImportJob", importJobSchema);
