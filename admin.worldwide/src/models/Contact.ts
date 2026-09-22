import mongoose, { Schema, type HydratedDocument, type Model, type Types } from "mongoose";

export const CONTACT_TOPICS = [
  "general",
  "broken-coupon",
  "submit-coupon",
  "advertise",
  "partnership",
  "privacy",
] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export interface Contact {
  name: string;
  email: string;
  topic: ContactTopic;
  subject?: string;
  message: string;

  /** Set when the message came from a "this code didn't work" report. */
  coupon?: Types.ObjectId | null;
  store?: Types.ObjectId | null;

  reply?: {
    message?: string;
    repliedAt?: Date;
    repliedBy?: Types.ObjectId;
  };

  status: "new" | "replied" | "closed" | "spam";

  createdAt: Date;
  updatedAt: Date;
}

export type ContactDocument = HydratedDocument<Contact>;

const contactSchema = new Schema<Contact>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },

    topic: { type: String, enum: CONTACT_TOPICS, default: "general", index: true },
    subject: { type: String, trim: true },
    message: { type: String, required: true },

    coupon: { type: Schema.Types.ObjectId, ref: "Coupon", default: null },
    store: { type: Schema.Types.ObjectId, ref: "Store", default: null },

    reply: {
      message: String,
      repliedAt: Date,
      repliedBy: { type: Schema.Types.ObjectId, ref: "Admin" },
    },

    status: {
      type: String,
      enum: ["new", "replied", "closed", "spam"],
      default: "new",
      index: true,
    },
  },
  { timestamps: true }
);

contactSchema.index({ createdAt: -1 });

export const ContactModel: Model<Contact> =
  (mongoose.models.Contact as Model<Contact>) ?? mongoose.model<Contact>("Contact", contactSchema);
