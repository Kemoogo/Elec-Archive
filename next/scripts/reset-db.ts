import mongoose from "mongoose";
import { connectToDatabase } from "../lib/db/connect";
import { User } from "../lib/db/models";

async function resetDatabase() {
  console.log("⚠️  Starting database destruction and reset process...");
  
  try {
    await connectToDatabase();
    console.log("Connected to MongoDB.");

    if (!mongoose.connection.db) {
      throw new Error("Failed to access database connection object.");
    }

    const dbName = mongoose.connection.db.databaseName;
    console.log(`🔥 Dropping database: '${dbName}'...`);
    await mongoose.connection.db.dropDatabase();
    console.log(`✅ Database '${dbName}' successfully dropped!`);

    console.log("🚀 Creating fresh admin account...");
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
        arkan_harb: "edit",
      },
      isActive: true,
      isLocked: false,
      failedLoginAttempts: 0,
    });

    await admin.save();

    console.log("✅ Admin user created successfully:");
    console.log("   Username: admin");
    console.log("   Password: admin123");
    console.log("   Role: admin (Full Permissions)");

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
    console.log("🎉 Database reset completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Reset failed:", error);
    process.exit(1);
  }
}

resetDatabase();
