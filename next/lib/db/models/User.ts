import { Schema, model, models, type Document } from "mongoose";
import { hash, compare } from "bcryptjs";

export type UserRole = "admin" | "commander" | "employee" | "viewer";
export type ModulePermission = "none" | "view" | "edit";

export interface IUser extends Document {
  username: string;
  password: string;
  fullName: string;
  role: UserRole;
  department?: string;
  permissions: {
    fax: ModulePermission;
    officers: ModulePermission;
    medical: ModulePermission;
    students: ModulePermission;
    education: ModulePermission;
    arkan_harb: ModulePermission;
  };
  isActive: boolean;
  isLocked: boolean;
  failedLoginAttempts: number;
  createdAt: Date;
  updatedAt: Date;
  tokenVersion: number;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      minlength: 3,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      enum: ["admin", "commander", "employee", "viewer"],
    },
    department: {
      type: String,
      trim: true,
    },
    permissions: {
      fax: { type: String, enum: ["none", "view", "edit"], default: "none" },
      officers: { type: String, enum: ["none", "view", "edit"], default: "none" },
      medical: { type: String, enum: ["none", "view", "edit"], default: "none" },
      students: { type: String, enum: ["none", "view", "edit"], default: "none" },
      education: { type: String, enum: ["none", "view", "edit"], default: "none" },
      arkan_harb: { type: String, enum: ["none", "view", "edit"], default: "none" },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  if (!this.password) {
    throw new Error("Password is required");
  }
  this.password = await hash(this.password, 12);
});

UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return compare(candidate, this.password);
};

UserSchema.index({ role: 1, isActive: 1 });

export const User = models.User ?? model<IUser>("User", UserSchema);
