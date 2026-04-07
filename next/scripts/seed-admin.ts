import mongoose from "mongoose";
import { models, model, Schema, type Document } from "mongoose";
import { hash, compare } from "bcryptjs";

interface IUser extends Document {
  username: string;
  password: string;
  fullName: string;
  role: "admin" | "commander" | "employee" | "viewer";
  department?: string;
  permissions: {
    fax: "none" | "view" | "edit";
    officers: "none" | "view" | "edit";
    medical: "none" | "view" | "edit";
    students: "none" | "view" | "edit";
    education: "none" | "view" | "edit";
  };
  isActive: boolean;
  isLocked: boolean;
  failedLoginAttempts: number;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    fullName: { type: String, required: true, trim: true },
    role: {
      type: String,
      required: true,
      enum: ["admin", "commander", "employee", "viewer"],
    },
    department: { type: String, trim: true },
    permissions: {
      fax: { type: String, enum: ["none", "view", "edit"], default: "none" },
      officers: { type: String, enum: ["none", "view", "edit"], default: "none" },
      medical: { type: String, enum: ["none", "view", "edit"], default: "none" },
      students: { type: String, enum: ["none", "view", "edit"], default: "none" },
      education: { type: String, enum: ["none", "view", "edit"], default: "none" },
    },
    isActive: { type: Boolean, default: true },
    isLocked: { type: Boolean, default: false },
    failedLoginAttempts: { type: Number, default: 0, min: 0, max: 5 },
  },
  { timestamps: true }
);

UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  if (!this.password) throw new Error("Password is required");
  this.password = await hash(this.password, 12);
});

UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return compare(candidate, this.password);
};

const User = models.User ?? model<IUser>("User", UserSchema);

async function seedAdmin() {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    console.error("MONGODB_URI is not defined in environment variables");
    console.error("Usage: npx tsx scripts/seed-admin.ts");
    process.exit(1);
  }

  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    const existingAdmin = await User.findOne({ username: "admin" });
    if (existingAdmin) {
      console.log("Admin user already exists");
      await mongoose.disconnect();
      return;
    }

    const admin = new User({
      username: "admin",
      password: "admin123",
      fullName: "مدير النظام",
      role: "admin",
      department: "إدارة",
      permissions: {
        fax: "edit",
        officers: "edit",
        medical: "edit",
        students: "edit",
        education: "edit",
      },
      isActive: true,
      isLocked: false,
      failedLoginAttempts: 0,
    });

    await admin.save();

    console.log("Admin user created successfully:");
    console.log(`  Username: admin`);
    console.log(`  Full Name: مدير النظام`);
    console.log(`  Password: admin123`);
    console.log("  ⚠️  Please change the default password after first login!");

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Error seeding admin:", error);
    process.exit(1);
  }
}

seedAdmin();
