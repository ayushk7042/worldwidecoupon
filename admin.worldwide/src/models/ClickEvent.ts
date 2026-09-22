import mongoose, { Schema, type HydratedDocument, type Model, type Types } from "mongoose";

/**
 * One outbound click on a deal link or a revealed code.
 *
 * This is the row that reconciles against affiliate-network reports, so it
 * keeps the exact URL the shopper was sent to rather than recomputing it
 * later from a store record that may since have changed.
 */
export const CLICK_KINDS = ["reveal", "deal", "store"] as const;
export type ClickKind = (typeof CLICK_KINDS)[number];

export interface ClickEvent {
  kind: ClickKind;
  coupon?: Types.ObjectId | null;
  store: Types.ObjectId;
  shopper?: Types.ObjectId | null;

  destinationUrl: string;
  referrer?: string;
  userAgent?: string;
  /** Truncated to /24 — enough to spot abuse, not enough to identify a person. */
  ipPrefix?: string;

  createdAt: Date;
}

export type ClickEventDocument = HydratedDocument<ClickEvent>;

const clickEventSchema = new Schema<ClickEvent>(
  {
    kind: { type: String, enum: CLICK_KINDS, required: true, index: true },

    coupon: { type: Schema.Types.ObjectId, ref: "Coupon", default: null, index: true },
    store: { type: Schema.Types.ObjectId, ref: "Store", required: true, index: true },
    shopper: { type: Schema.Types.ObjectId, ref: "SiteUser", default: null },

    destinationUrl: { type: String, required: true },
    referrer: String,
    userAgent: String,
    ipPrefix: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

clickEventSchema.index({ createdAt: -1 });
clickEventSchema.index({ store: 1, createdAt: -1 });
// Raw clicks are only useful while they are fresh; counters keep the totals.
clickEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

export const ClickEventModel: Model<ClickEvent> =
  (mongoose.models.ClickEvent as Model<ClickEvent>) ??
  mongoose.model<ClickEvent>("ClickEvent", clickEventSchema);
