import bcrypt from "bcryptjs";
import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

export const ADMIN_ROLES = ["superadmin", "editor", "viewer"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_PERMISSIONS = [
  "canPublish",
  "canDelete",
  "canManageStores",
  "canManageUsers",
  "canImport",
] as const;
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export interface Admin {
  name: string;
  email: string;
  password: string;
  role: AdminRole;
  permissions: Record<AdminPermission, boolean>;
  status: "active" | "suspended";
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminMethods {
  matchesPassword(plain: string): Promise<boolean>;
  can(permission: AdminPermission): boolean;
}

export type AdminDocument = HydratedDocument<Admin, AdminMethods>;
export type AdminModelType = Model<Admin, {}, AdminMethods>;

const permissionDefaults = (value: boolean) =>
  Object.fromEntries(
    ADMIN_PERMISSIONS.map((permission) => [
      permission,
      { type: Boolean, default: value },
    ])
  );

const adminSchema = new Schema<Admin, AdminModelType, AdminMethods>(
  {
    name: { type: String, trim: true, default: "Administrator" },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    // Never returned by default — a controller must ask for it explicitly.
    password: { type: String, required: true, select: false },

    role: { type: String, enum: ADMIN_ROLES, default: "editor" },

    permissions: {
      type: new Schema(permissionDefaults(true), { _id: false }),
      default: () =>
        Object.fromEntries(ADMIN_PERMISSIONS.map((p) => [p, true])) as Record<
          AdminPermission,
          boolean
        >,
    },

    status: { type: String, enum: ["active", "suspended"], default: "active" },

    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

adminSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

adminSchema.method("matchesPassword", function matchesPassword(
  this: AdminDocument,
  plain: string
) {
  return bcrypt.compare(plain, this.password);
});

adminSchema.method("can", function can(
  this: AdminDocument,
  permission: AdminPermission
) {
  if (this.status !== "active") return false;
  if (this.role === "superadmin") return true;
  if (this.role === "viewer") return false;
  return Boolean(this.permissions?.[permission]);
});

export const AdminModel: AdminModelType =
  (mongoose.models.Admin as AdminModelType) ??
  mongoose.model<Admin, AdminModelType>("Admin", adminSchema);
