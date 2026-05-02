import { connectToDatabase } from "../lib/db/connect";
import { Officer } from "../lib/db/models/Officer";
import { ServiceHistory } from "../lib/db/models/ServiceHistory";
import mongoose from "mongoose";

async function migrate() {
  console.log("Starting migration...");
  await connectToDatabase();

  const officers = await Officer.find({});
  console.log(`Found ${officers.length} officers.`);

  for (const officer of officers) {
    const isInUnit = officer.employmentStatus === "active";
    
    await Officer.updateOne(
      { _id: officer._id },
      { $set: { isInUnit } }
    );

    // Create initial join record if it doesn't exist
    const joinExists = await ServiceHistory.findOne({
      officerId: officer._id,
      type: "join"
    });

    if (!joinExists) {
      await ServiceHistory.create({
        officerId: officer._id,
        type: "join",
        action: "join",
        date: officer.joinDate || officer.createdAt || new Date(),
        createdBy: new mongoose.Types.ObjectId(), // Placeholder for migration
        updatedBy: new mongoose.Types.ObjectId(),
      });
    }
    
    // If they are inactive/retired, create a legacy leave record
    if (!isInUnit) {
      const leaveExists = await ServiceHistory.findOne({
        officerId: officer._id,
        type: "leave"
      });
      
      if (!leaveExists) {
        await ServiceHistory.create({
          officerId: officer._id,
          type: "leave",
          action: "transfer",
          date: new Date(),
          notes: "Legacy status migration",
          createdBy: new mongoose.Types.ObjectId(),
          updatedBy: new mongoose.Types.ObjectId(),
        });
      }
    }
  }

  console.log("Migration completed.");
  process.exit(0);
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
