/**
 * Seed Script: Officers & Leaves
 *
 * Generates realistic Arabic dummy data for Officers and Leave records.
 *
 * Usage:
 *   npx tsx scripts/seed-officers-leaves.ts          # Add to existing data
 *   npx tsx scripts/seed-officers-leaves.ts --clear   # Clear + replace all data
 *
 * Prerequisites:
 *   - Admin user must exist (run seed-admin.ts first)
 *   - MONGODB_URI env variable must be set (use --env-file=.env with tsx)
 */
import { Types } from "mongoose";
import { connectToDatabase } from "../lib/db/connect";
import {
  Officer,
  OFFICER_TYPES,
  OFFICER_WEAPONS,
  type OfficerRank,
  type OfficerType,
  type OfficerWeapon,
} from "../lib/db/models/Officer";
import {
  Leave,
  type LeaveCategory,
  type LeaveType,
  type LeaveStatus,
} from "../lib/db/models/Leave";
import { User } from "../lib/db/models";

// ── Realistic Arabic first names ──
const FIRST_NAMES = [
  "أحمد", "محمد", "علي", "عمر", "خالد", "محمود", "عبدالله", "ناصر",
  "فهد", "سعود", "بدر", "تركي", "فيصل", "سعد", "عبدالعزيز", "ماجد",
  "ياسر", "هاني", "وائل", "سمير", "جابر", "حسن", "حسين", "إبراهيم",
  "راشد", "سلطان", "صالح", "طلال", "عبدالرحمن", "نايف", "بندر", "مشعل",
  "أيمن", "تامر", "جمال", "حامد", "رامي", "زياد", "سامي", "شادي",
  "عادل", "غسان", "فارس", "قصي", "كمال", "مازن", "نضال", "هشام",
];

const LAST_NAMES = [
  "القحطاني", "العتيبي", "الزهراني", "الغامدي", "الشهري", "الدوسري",
  "المطيري", "الشمري", "العنزي", "الحربي", "الجهني", "البلوي",
  "السلمي", "الثبيتي", "القرني", "الشمراني", "الغامدي",
  "البيشي", "الصاعدي", "العمري", "الحازمي", "المالكي", "الصيعري",
  "الذيباني", "الجابري", "القثامي", "الربيعي", "الهذلي", "السبيعي",
  "العصيمي", "الشيباني", "الحجي", "البقمي", "الثقفي", "الغفيلي",
  "الزامل", "المنصور", "العبداللطيف", "الحقباني", "العريني", "الوهيبي",
];

const BATCHES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"];
const UNITS = [
  "اللواء الأول", "اللواء الثاني", "اللواء الثالث", "كتيبة الإشارة", "كتيبة المركبات",
  "كتيبة المدرعات", "كتيبة المشاه", "قاعدة الملك خالد", "قاعدة الملك فيصل", "كلية الملك عبدالعزيز الحربية",
  "إدارة شؤون الضباط", "هيئة العمليات", "هيئة الإمداد", "مركز التدريب", "قيادة المنطقة الشرقية",
  "قيادة المنطقة الغربية", "قيادة المنطقة الشمالية", "قيادة المنطقة الجنوبية",
];

const POSITIONS = [
  "قائد اللواء", "نائب قائد اللواء", "ركن عمليات", "ركن إمداد", "ركن استخبارات",
  "قائد الكتيبة", "نائب قائد الكتيبة", "قائد السرية", "ضابط عمليات", "ضابط إمداد",
  "ضابط تدريب", "ضابط شؤون ضباط", "ضابط إشارة", "ضابط مدفعية", "ضابط استخبارات",
  "مدير الإدارة", "رئيس قسم", "ضابط أركان", "مساعد قائد", "ضابط احتياط",
];

// ── Helpers ──

/** Weighted random rank distribution: more lower ranks, fewer high ranks */
function randomRank(): OfficerRank {
  const r = Math.random();
  if (r < 0.20) return "second_lieutenant";
  if (r < 0.35) return "first_lieutenant";
  if (r < 0.55) return "captain";
  if (r < 0.70) return "major";
  if (r < 0.82) return "lieutenant_colonel";
  if (r < 0.90) return "colonel";
  if (r < 0.96) return "brigadier";
  return "major_general";
}

function randomEnum<T extends string>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const BATCH_SIZE = 50;
const COUNT_OFFICERS = 30;
const shouldClear = process.argv.includes("--clear");

// ── Main ──

async function seed() {
  console.log("🚀 Starting officers & leaves seeding...");
  await connectToDatabase();

  // ── Optional: Clear existing data ──
  if (shouldClear) {
    console.log("⚠️  --clear flag detected. Deleting existing officers and leaves...");
    const deletedOfficers = await Officer.deleteMany({});
    const deletedLeaves = await Leave.deleteMany({});
    console.log(`   Deleted ${deletedOfficers.deletedCount} officers and ${deletedLeaves.deletedCount} leaves.`);
  }

  // ── Find admin user ──
  const admin = await User.findOne({ role: "admin" }).lean();
  if (!admin) {
    console.error("❌ No admin user found. Run seed-admin.ts first.");
    process.exit(1);
  }
  const adminId = admin._id as Types.ObjectId;
  console.log(`👤 Using admin: ${admin.fullName}`);

  // ── Step 1: Seed Officers ──
  const existingCount = await Officer.countDocuments();
  console.log(`\n📋 Seeding ${COUNT_OFFICERS} Officers (${existingCount} existing)...`);

  const usedMilitaryIds = new Set<string>();
  const usedSeniorityNumbers = new Set<string>();
  const usedNationalIds = new Set<string>();

  // Load existing IDs if not clearing (to avoid collisions)
  if (!shouldClear) {
    const existingOfficers = await Officer.find().select("militaryId seniorityNumber nationalId").lean();
    for (const o of existingOfficers) {
      usedMilitaryIds.add(o.militaryId);
      usedSeniorityNumbers.add(o.seniorityNumber);
      if (o.nationalId) usedNationalIds.add(o.nationalId);
    }
  }

  const officers: Array<{
    militaryId: string;
    seniorityNumber: string;
    fullName: string;
    rank: OfficerRank;
    batch: string;
    type: OfficerType;
    weapon: OfficerWeapon;
    phone: string;
    nationalId: string;
    unit: string;
    position: string;
    employmentStatus: "active" | "inactive" | "retired";
    isInUnit: boolean;
    joinDate: Date;
    birthDate: Date;
    isArkanHarb: boolean;
  }> = [];

  for (let i = 0; i < COUNT_OFFICERS; i++) {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const fullName = `${firstName} ${lastName}`;
    const rank = randomRank();
    const type = randomEnum(OFFICER_TYPES);
    const weapon = randomEnum(OFFICER_WEAPONS);
    const isArkanHarb = Math.random() < 0.12;

    // Generate unique military ID (7 digits)
    let militaryId: string;
    do {
      militaryId = String(randomInt(1000000, 9999999));
    } while (usedMilitaryIds.has(militaryId));
    usedMilitaryIds.add(militaryId);

    // Seniority number (unique)
    let seniorityNumber: string;
    do {
      seniorityNumber = String(randomInt(2000000, 9999999));
    } while (usedSeniorityNumbers.has(seniorityNumber));
    usedSeniorityNumbers.add(seniorityNumber);

    // National ID (14 digits, unique)
    let nationalId: string;
    do {
      nationalId = String(randomInt(10000000000000, 29999999999999));
    } while (usedNationalIds.has(nationalId));
    usedNationalIds.add(nationalId);

    // Join date: between 1995 and 2024
    const joinDate = randomDate(new Date(1995, 0, 1), new Date(2024, 5, 1));

    // Birth date: 20-50 years before join date
    const birthDate = new Date(joinDate);
    birthDate.setFullYear(birthDate.getFullYear() - randomInt(22, 45));

    // Employment status: 85% active, 10% retired, 5% inactive
    const statusRoll = Math.random();
    const employmentStatus = statusRoll < 0.85 ? "active" : statusRoll < 0.95 ? "retired" : "inactive";

    officers.push({
      militaryId,
      seniorityNumber,
      fullName,
      rank,
      batch: pick(BATCHES),
      type,
      weapon,
      phone: `05${String(randomInt(10000000, 59999999))}`,
      nationalId,
      unit: pick(UNITS),
      position: pick(POSITIONS),
      employmentStatus,
      isInUnit: Math.random() > 0.15,
      joinDate,
      birthDate,
      isArkanHarb,
    });
  }

  // Insert officers in batches
  for (let i = 0; i < officers.length; i += BATCH_SIZE) {
    const batch = officers.slice(i, i + BATCH_SIZE);
    await Officer.insertMany(batch);
    console.log(`   Inserted officers ${i + 1}–${Math.min(i + BATCH_SIZE, officers.length)}`);
  }

  const allOfficers = await Officer.find().lean();
  console.log(`✅ ${allOfficers.length} total officers in database.`);

  // ── Step 2: Seed Leaves ──
  console.log(`\n📋 Seeding Leaves for ${allOfficers.length} officers...`);

  const LEAVE_REASONS: Record<string, string[]> = {
    annual: ["إجازة سنوية", "إجازة دورية", "إجازة اعتيادية"],
    sick: ["وعكة صحية", "مرض", "إجراء طبي", "علاج طبيعي"],
    emergency: ["ظرف عائلي طارئ", "حالة وفاة", "حالة طارئة"],
    rest: ["إجازة راحة", "راحة بعد مأمورية", "راحة تعويضية"],
    overnight: ["مبيت خارج المعسكر", "مبيت"],
    field: ["إجازة ميدانية", "ميداني"],
    casual: ["إجازة عارضة", "إذن خروج", "إذن"],
  };

  const LEAVE_DURATIONS: Record<LeaveType, [number, number]> = {
    annual: [3, 30],
    sick: [1, 14],
    emergency: [3, 10],
    rest: [1, 5],
    overnight: [1, 2],
    field: [1, 4],
    casual: [1, 3],
  };

  // Weighted leaf type distribution
  function randomLeaveType(): LeaveType {
    const r = Math.random();
    if (r < 0.60) return "annual";
    if (r < 0.75) return "sick";
    if (r < 0.83) return "emergency";
    if (r < 0.90) return "rest";
    if (r < 0.95) return "overnight";
    if (r < 0.98) return "field";
    return "casual";
  }

  function randomLeaveStatus(): LeaveStatus {
    const r = Math.random();
    if (r < 0.15) return "draft";
    if (r < 0.55) return "approved";
    if (r < 0.90) return "closed";
    return "cancelled";
  }

  let totalLeaves = 0;
  const leavesToInsert: Array<{
    officerId: Types.ObjectId;
    category: LeaveCategory;
    type: LeaveType;
    startDate: Date;
    endDate: Date;
    reason: string;
    status: LeaveStatus;
    createdBy: Types.ObjectId;
    updatedBy: Types.ObjectId;
  }> = [];

  const now = new Date();
  const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), 1);

  for (const officer of allOfficers) {
    const numLeaves = randomInt(1, 3);
    const officerId = officer._id as Types.ObjectId;

    for (let l = 0; l < numLeaves; l++) {
      const type = randomLeaveType();
      const category: LeaveCategory = Math.random() < 0.92 ? "leave" : "absence";
      const [minDur, maxDur] = LEAVE_DURATIONS[type];
      const durationDays = randomInt(minDur, maxDur);
      const startDate = randomDate(twoYearsAgo, now);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + durationDays);

      leavesToInsert.push({
        officerId,
        category,
        type,
        startDate,
        endDate,
        reason: pick(LEAVE_REASONS[type] ?? ["إجازة"]),
        status: randomLeaveStatus(),
        createdBy: adminId,
        updatedBy: adminId,
      });

      totalLeaves++;
    }
  }

  // Insert leaves in batches
  for (let i = 0; i < leavesToInsert.length; i += BATCH_SIZE) {
    const batch = leavesToInsert.slice(i, i + BATCH_SIZE);
    await Leave.insertMany(batch);
  }

  console.log(`✅ ${totalLeaves} leaves seeded successfully.`);

  // ── Summary ──
  console.log(`\n📊 Summary:`);
  console.log(`   Officers: ${allOfficers.length}`);
  console.log(`   Leaves: ${totalLeaves}`);
  console.log(`   Avg leaves per officer: ${(totalLeaves / allOfficers.length).toFixed(1)}`);

  console.log(`\n📝 Sample Officers:`);
  const sampleOfficers = await Officer.find().sort({ createdAt: -1 }).limit(5).lean();
  for (const o of sampleOfficers) {
    console.log(`   ${o.fullName} | رتبة: ${o.rank} | عسكري: ${o.militaryId} | وحدة: ${o.unit ?? "—"}`);
  }

  console.log(`\n📝 Sample Leaves:`);
  const sampleLeaves = await Leave.find().populate("officerId", "fullName").sort({ createdAt: -1 }).limit(5).lean();
  for (const l of sampleLeaves) {
    const officerName = (l.officerId as { fullName?: string } | null)?.fullName ?? "غير معروف";
    console.log(`   ${officerName} | ${l.type} | ${l.startDate.toISOString().slice(0, 10)} → ${l.endDate.toISOString().slice(0, 10)} | ${l.status}`);
  }

  console.log(`\n✅ Seeding complete!`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
