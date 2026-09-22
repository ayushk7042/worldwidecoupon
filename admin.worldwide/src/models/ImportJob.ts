import mongoose, { Schema, type HydratedDocument, type Model, type Types } from "mongoose";

export const IMPORT_STATUSES = [
  "validated",
  "importing",
  "completed",
  "failed",
  "rolled_back",
] as const;
export type ImportStatus = (typeof IMPORT_STATUSES)[number];

export interface ImportIssue {
  row: number;
  field?: string;
  message: string;
  value?: string;
}

/**
 * One row per bulk import run.
 *
 * `createdCouponIds` and `createdStoreIds` are what make a rollback possible:
 * without them a bad import can only be undone by hand.
 */
export interface ImportJob {
  batchId: string;

  fileName?: string;
  fileType: "csv" | "xlsx" | "json";
  source: "wordpress" | "generic";

  mode: "create" | "upsert" | "replace";
  status: ImportStatus;

  totalRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;

  storesCreated: number;
  categoriesCreated: number;

  issues: ImportIssue[];

  createdCouponIds: Types.ObjectId[];
  createdStoreIds: Types.ObjectId[];
  createdCategoryIds: Types.ObjectId[];

  startedAt?: Date | null;
  finishedAt?: Date | null;
  rolledBackAt?: Date | null;

  createdByAdmin?: Types.ObjectId | null;

  createdAt: Date;
  updatedAt: Date;
}

export type ImportJobDocument = HydratedDocument<ImportJob>;

const issueSchema = new Schema<ImportIssue>(
  {
    row: Number,
    field: String,
    message: String,
    value: String,
  },
  { _id: false }
);

const importJobSchema = new Schema<ImportJob>(
  {
    batchId: { type: String, required: true, unique: true, index: true },

    fileName: String,
    fileType: { type: String, enum: ["csv", "xlsx", "json"], default: "csv" },
    source: { type: String, enum: ["wordpress", "generic"], default: "wordpress" },

    mode: { type: String, enum: ["create", "upsert", "replace"], default: "upsert" },
    status: { type: String, enum: IMPORT_STATUSES, default: "validated", index: true },

    totalRows: { type: Number, default: 0 },
    createdCount: { type: Number, default: 0 },
    updatedCount: { type: Number, default: 0 },
    skippedCount: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },

    storesCreated: { type: Number, default: 0 },
    categoriesCreated: { type: Number, default: 0 },

    issues: { type: [issueSchema], default: [] },

    createdCouponIds: [{ type: Schema.Types.ObjectId, ref: "Coupon" }],
    createdStoreIds: [{ type: Schema.Types.ObjectId, ref: "Store" }],
    createdCategoryIds: [{ type: Schema.Types.ObjectId, ref: "Category" }],

    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
    rolledBackAt: { type: Date, default: null },

    createdByAdmin: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
  },
  { timestamps: true }
);

importJobSchema.index({ createdAt: -1 });

export const ImportJobModel: Model<ImportJob> =
  (mongoose.models.ImportJob as Model<ImportJob>) ??
  mongoose.model<ImportJob>("ImportJob", importJobSchema);
