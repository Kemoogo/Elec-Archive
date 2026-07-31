import { connectToDatabase } from "../lib/db/connect";
import {
  User,
  Officer,
  MedicalPatient,
  MedicalVisit,
  Leave,
  Mission,
  PositionAssignment,
  Medicine,
} from "../lib/db/models";

async function seed() {
  console.log("🚀 Starting operational data seeding...");
  await connectToDatabase();

  const officers = await Officer.find().limit(50);
  const users = await User.find({ role: "employee" }).limit(5);
  const medicines = await Medicine.find().limit(10);

  if (officers.length === 0 || users.length === 0) {
    console.error("❌ Need officers and users to seed operational data. Run seed-large-data.ts first.");
    process.exit(1);
  }

  const adminId = users[0]._id;

  // 1. Seed Medical Patients & Visits
  console.log("- Seeding Medical Patients & Visits...");
  for (let i = 0; i < 30; i++) {
    const officer = officers[i % officers.length];
    const patient = await MedicalPatient.findOneAndUpdate(
      { patientId: officer.militaryId },
      {
        patientId: officer.militaryId,
        patientName: officer.fullName,
        bloodType: ["A+", "B+", "O+", "AB+"][i % 4],
      },
      { upsert: true, new: true }
    );

    await MedicalVisit.create({
      patientId: patient._id,
      visitDate: new Date(2024, 4, 1 + i),
      diagnosis: `Diagnosis for visit ${i}`,
      treatment: "Regular treatment",
      dispensedMedicines: medicines.slice(0, 2).map(m => ({
        medicineId: m._id,
        quantity: 1,
      })),
      restType: i % 5 === 0 ? "home" : "none",
      restDays: i % 5 === 0 ? 3 : 0,
      fitnessCategory: "fit",
    });
  }

  // 2. Seed Leaves
  console.log("- Seeding Leaves...");
  const leaveTypes = ["annual", "sick", "emergency", "rest", "overnight", "field", "casual"] as const;
  for (let i = 0; i < 40; i++) {
    const officer = officers[i % officers.length];
    await Leave.create({
      officerId: officer._id,
      category: i % 10 === 0 ? "absence" : "leave",
      type: leaveTypes[i % leaveTypes.length],
      startDate: new Date(2024, 3, 1 + i),
      endDate: new Date(2024, 3, 3 + i),
      reason: "Reason for leave",
      status: i % 5 === 0 ? "approved" : "closed",
      createdBy: adminId,
      updatedBy: adminId,
    });
  }

  // 3. Seed Missions
  console.log("- Seeding Missions...");
  for (let i = 0; i < 30; i++) {
    const officer = officers[i % officers.length];
    await Mission.create({
      officerId: officer._id,
      title: `Mission ${i}`,
      description: `Description for mission ${i}`,
      destination: "Location X",
      startDate: new Date(2024, 2, 1 + i),
      endDate: new Date(2024, 2, 5 + i),
      status: i % 5 === 0 ? "active" : "completed",
      createdBy: adminId,
      updatedBy: adminId,
    });
  }

  // 4. Seed Position Assignments
  console.log("- Seeding Position Assignments...");
  for (let i = 0; i < 30; i++) {
    const officer = officers[i % officers.length];
    await PositionAssignment.create({
      officerId: officer._id,
      positionTitle: `Position ${i}`,
      positionType: "primary",
      startDate: new Date(2023, 0, 1 + i),
      status: "active",
      createdBy: adminId,
      updatedBy: adminId,
    });
  }

  console.log("✅ Operational data seeding complete!");
  process.exit(0);
}

seed().catch(err => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
