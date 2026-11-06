/**
 * Seed Script: Officers & Leaves (Egyptian Armed Forces)
 *
 * Generates realistic Egyptian dummy data for Officers, Service History movements, and Leave records.
 *
 * Requirements:
 *   - Egyptian names (quadruple/triple Arabic Egyptian names).
 *   - Egyptian Armed Forces ranks, weapons, and positions.
 *   - Compatible with existing database records:
 *       * Total in-unit officers: 25 (the 4 existing officers + 21 newly seeded in-unit officers).
 *       * Former officers: 80 officers with various exit forms:
 *           - Transfer from unit (نقل من الوحدة)
 *           - Retirement / End of service (تقاعد / إنهاء خدمة)
 *           - Termination (رفد / إنهاء خدمة)
 *           - Associated ServiceHistory movement records for every departure.
 *
 * Usage:
 *   npx tsx scripts/seed-officers-leaves.ts          # Seed matching the exact targets
 *   npx tsx scripts/seed-officers-leaves.ts --clear   # Clear seeded extra data and reseed
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
import { ServiceHistory } from "../lib/db/models/ServiceHistory";
import { User } from "../lib/db/models";

// ── Authentic Egyptian First, Middle & Family Names ──
const FIRST_NAMES = [
  "أحمد", "محمد", "محمود", "علي", "عمر", "خالد", "عمرو", "طارق",
  "حسام", "إسلام", "إبراهيم", "كريم", "مصطفى", "شريف", "يوسف", "تامر",
  "هاني", "سامح", "ماجد", "وائل", "ياسر", "أشرف", "أيمن", "عادل",
  "هشام", "مدحت", "زياد", "رامي", "وليد", "معتز", "عصام",
  "علاء", "بهاء", "ضياء", "صلاح", "نبيل", "سمير", "كمال", "سعيد",
];

const MIDDLE_NAMES = [
  "عبد الرحمن", "عبد العزيز", "عبد الله", "عبد المنعم", "عبد الفتاح", "عبد الحميد",
  "محمد", "أحمد", "محمود", "إبراهيم", "علي", "حسن", "حسين", "مصطفى",
  "فاروق", "عثمان", "توفيق", "صلاح", "فتحي", "رفعت", "شوقي", "فؤاد",
  "عزت", "ممدوح", "رشاد", "أنور", "جلال", "رشدي", "سامي", "سليمان",
];

const FAMILY_NAMES = [
  "الشاذلي", "الطنطاوي", "السيسي", "المنشاوي", "درويش", "الجرف", "أبو قريش",
  "الصاوي", "البدري", "المهدي", "العوضي", "الخولي", "الشرقاوي", "البحيري",
  "الصعيدي", "الديب", "النجار", "الحداد", "الشناوي", "القاضي", "الفقي",
  "العسال", "الغمري", "الفيومي", "الدسوقي", "السنوسي", "المصري", "شاهين",
  "زايد", "بركات", "منصور", "علام", "غنيم", "عمران", "زهران", "عفيفي",
  "سليمان", "خليل", "حجازي", "الرافعي", "مهران", "زكي", "يونس", "شعلان",
];

const FACULTIES = [
  "الكلية الحربية",
  "الكلية الفنية العسكرية",
  "كلية الدفاع الجوي",
  "المعهد الفني للقوات المسلحة",
  "كلية الهندسة جامعة القاهرة",
  "كلية الهندسة جامعة عين شمس",
  "كلية التجارة جامعة الإسكندرية",
  "كلية الحقوق جامعة المنصورة",
];

// Egyptian Armed Forces Units
const EGYPTIAN_UNITS = [
  "إدارة الإشارة",
  "إدارة المركبات",
  "إدارة المدرعات",
  "سلاح المشاة",
  "الفرقة السادسة المدرعة",
  "الفرقة التاسعة المدرعة",
  "الفرقة الثامنة عشر مشاة ميكانيكي",
  "لواء الإشارة الميداني",
  "فوج اللاسلكي التكتيكي",
  "مركز العمليات الرئيسي",
  "منطقة القناة العسكرية",
  "المنطقة المركزية العسكرية",
  "المنطقة الشمالية العسكرية",
  "المنطقة الغربية العسكرية",
  "المنطقة الجنوبية العسكرية",
  "مركز تدريب المشتركة",
];

// Egyptian Military Positions
const EGYPTIAN_POSITIONS = [
  "قائد الوحدة",
  "رئيس أركان الوحدة",
  "نائب قائد الوحدة",
  "رئيس فرع العمليات",
  "رئيس فرع التدريب",
  "رئيس فرع الإمداد والتموين",
  "رئيس فرع شئون الضباط",
  "قائد كتيبة إشارة",
  "قائد كتيبة مشاة",
  "قائد سرية قيادة",
  "ضابط أمن الوحدة",
  "ضابط إشارة الوحدة",
  "ضابط إمداد ونقل",
  "ضابط عمليات واستطلاع",
  "ضابط نظم ومعلومات",
  "رئيس قسم الميزانية",
  "ضابط نوبتجي الوحدة",
];

// ── Helpers ──

function randomRank(): OfficerRank {
  const r = Math.random();
  if (r < 0.15) return "second_lieutenant";
  if (r < 0.30) return "first_lieutenant";
  if (r < 0.50) return "captain";
  if (r < 0.68) return "major";
  if (r < 0.82) return "lieutenant_colonel";
  if (r < 0.92) return "colonel";
  if (r < 0.97) return "brigadier";
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
const shouldClear = process.argv.includes("--clear");

async function seed() {
  console.log("🚀 Starting Egyptian Armed Forces officers & leaves seeding...");
  await connectToDatabase();

  // ── Find admin user ──
  const admin = await User.findOne({ role: "admin" }).lean();
  if (!admin) {
    console.error("❌ No admin user found. Run seed-admin.ts first.");
    process.exit(1);
  }
  const adminId = admin._id as Types.ObjectId;
  console.log(`👤 Using admin: ${admin.fullName} (${admin._id})`);

  // Detect existing officers
  const existingOfficers = await Officer.find().lean();
  console.log(`📋 Found ${existingOfficers.length} existing officers in database.`);

  const usedMilitaryIds = new Set<string>();
  const usedSeniorityNumbers = new Set<string>();
  const usedNationalIds = new Set<string>();

  for (const o of existingOfficers) {
    usedMilitaryIds.add(o.militaryId);
    usedSeniorityNumbers.add(o.seniorityNumber);
    if (o.nationalId) usedNationalIds.add(o.nationalId);
  }

  // Count how many are currently in unit
  const existingInUnit = existingOfficers.filter((o) => o.isInUnit);
  const existingOutUnit = existingOfficers.filter((o) => !o.isInUnit);
  console.log(`   - Existing In Unit: ${existingInUnit.length}`);
  console.log(`   - Existing Outside Unit: ${existingOutUnit.length}`);

  // Target:
  // In-Unit Total: 25 (the 4 existing officers + 21 newly seeded in-unit officers)
  // Out-Unit / Former Total: 80 (80 former officers with various departure types)
  const targetInUnitTotal = 25;
  const targetOutUnitTotal = 80;

  // If --clear was passed, remove only officers that are NOT part of the original 4 protected officers
  if (shouldClear) {
    console.log("⚠️ --clear flag detected: Removing seeded officers while keeping original base officers...");
    const originalMilitaryIds = ["159709", "132488", "100300", "101300"];
    const deletedOfficers = await Officer.deleteMany({ militaryId: { $nin: originalMilitaryIds } });
    console.log(`   Deleted ${deletedOfficers.deletedCount} non-original officers.`);

    // Also remove leaves of non-original officers
    const remainingOfficers = await Officer.find().lean();
    const remainingOfficerIds = remainingOfficers.map((o) => o._id);
    await Leave.deleteMany({ officerId: { $nin: remainingOfficerIds } });
    await ServiceHistory.deleteMany({ officerId: { $nin: remainingOfficerIds } });

    // Refresh sets
    usedMilitaryIds.clear();
    usedSeniorityNumbers.clear();
    usedNationalIds.clear();

    for (const o of remainingOfficers) {
      usedMilitaryIds.add(o.militaryId);
      usedSeniorityNumbers.add(o.seniorityNumber);
      if (o.nationalId) usedNationalIds.add(o.nationalId);
    }
  }

  // Recalculate remaining to generate
  const currentInUnitCount = (await Officer.countDocuments({ isInUnit: true })) || 0;
  const currentOutUnitCount = (await Officer.countDocuments({ isInUnit: false })) || 0;

  const neededInUnit = Math.max(0, targetInUnitTotal - currentInUnitCount);
  const neededOutUnit = Math.max(0, targetOutUnitTotal - currentOutUnitCount);

  console.log(`\n🎯 Targets configured:`);
  console.log(`   - Target In-Unit: ${targetInUnitTotal} (Current: ${currentInUnitCount}, Needed: ${neededInUnit})`);
  console.log(`   - Target Former/Out: ${targetOutUnitTotal} (Current: ${currentOutUnitCount}, Needed: ${neededOutUnit})`);

  if (neededInUnit === 0 && neededOutUnit === 0) {
    console.log("✅ Targets already satisfied! Nothing to generate. Pass --clear to recreate seeded data.");
    process.exit(0);
  }

  // ── Rank Configuration & Military Seniority Mapping ──
  // In the Egyptian Armed Forces:
  // - Higher Rank (الأعلى رتبة) = Older / Earlier Batch (دفعة أصغر، مثلاً 85 أقدم من 118)
  // - Smaller Seniority Number = More senior (أقدمية أصغر مثل 30000 أقدم من 90000)
  // - Smaller Military ID = Joined earlier (رقم عسكري أصغر مثل 100000 أقدم من 200000)
  // - Older Joining / Graduation / Birth years.
  interface RankMetadata {
    rank: OfficerRank;
    batchMin: number;
    batchMax: number;
    seniorityMin: number;
    seniorityMax: number;
    militaryIdMin: number;
    militaryIdMax: number;
    joinYearMin: number;
    joinYearMax: number;
    birthAgeAtJoin: [number, number];
  }

  const RANK_TIERS: Record<OfficerRank, RankMetadata> = {
    major_general: {
      rank: "major_general",
      batchMin: 78,
      batchMax: 84,
      seniorityMin: 28000,
      seniorityMax: 32500,
      militaryIdMin: 100000,
      militaryIdMax: 105000,
      joinYearMin: 1985,
      joinYearMax: 1991,
      birthAgeAtJoin: [21, 23],
    },
    brigadier: {
      rank: "brigadier",
      batchMin: 85,
      batchMax: 90,
      seniorityMin: 32600,
      seniorityMax: 36000,
      militaryIdMin: 105100,
      militaryIdMax: 115000,
      joinYearMin: 1992,
      joinYearMax: 1997,
      birthAgeAtJoin: [21, 23],
    },
    colonel: {
      rank: "colonel",
      batchMin: 91,
      batchMax: 96,
      seniorityMin: 36100,
      seniorityMax: 41000,
      militaryIdMin: 115100,
      militaryIdMax: 125000,
      joinYearMin: 1998,
      joinYearMax: 2003,
      birthAgeAtJoin: [21, 23],
    },
    lieutenant_colonel: {
      rank: "lieutenant_colonel",
      batchMin: 97,
      batchMax: 102,
      seniorityMin: 41100,
      seniorityMax: 46000,
      militaryIdMin: 125100,
      militaryIdMax: 139000,
      joinYearMin: 2004,
      joinYearMax: 2009,
      birthAgeAtJoin: [21, 23],
    },
    major: {
      rank: "major",
      batchMin: 103,
      batchMax: 107,
      seniorityMin: 46100,
      seniorityMax: 50000,
      militaryIdMin: 140000,
      militaryIdMax: 154000,
      joinYearMin: 2010,
      joinYearMax: 2014,
      birthAgeAtJoin: [21, 23],
    },
    captain: {
      rank: "captain",
      batchMin: 108,
      batchMax: 112,
      seniorityMin: 50100,
      seniorityMax: 55000,
      militaryIdMin: 155000,
      militaryIdMax: 169000,
      joinYearMin: 2015,
      joinYearMax: 2019,
      birthAgeAtJoin: [21, 23],
    },
    first_lieutenant: {
      rank: "first_lieutenant",
      batchMin: 113,
      batchMax: 116,
      seniorityMin: 55100,
      seniorityMax: 61000,
      militaryIdMin: 170000,
      militaryIdMax: 185000,
      joinYearMin: 2020,
      joinYearMax: 2023,
      birthAgeAtJoin: [21, 23],
    },
    second_lieutenant: {
      rank: "second_lieutenant",
      batchMin: 117,
      batchMax: 120,
      seniorityMin: 61100,
      seniorityMax: 68000,
      militaryIdMin: 186000,
      militaryIdMax: 205000,
      joinYearMin: 2024,
      joinYearMax: 2025,
      birthAgeAtJoin: [21, 23],
    },
  };

  // Helper generator for unique Egyptian officer attributes
  function generateEgyptianOfficerData(isInUnit: boolean, formerReason?: "transfer" | "retirement" | "termination", forcedRank?: OfficerRank) {
    const fName = pick(FIRST_NAMES);
    const mName = pick(MIDDLE_NAMES);
    const mName2 = pick(MIDDLE_NAMES);
    const lName = pick(FAMILY_NAMES);
    const fullName = `${fName} ${mName} ${mName2} ${lName}`;

    // Select rank (if former officer with retirement, prioritize older senior ranks)
    let rank: OfficerRank;
    if (forcedRank) {
      rank = forcedRank;
    } else if (!isInUnit && formerReason === "retirement") {
      rank = pick(["colonel", "brigadier", "major_general"]);
    } else {
      rank = randomRank();
    }

    const tier = RANK_TIERS[rank];
    const type = randomEnum(OFFICER_TYPES);
    const weapon = randomEnum(OFFICER_WEAPONS);
    const isArkanHarb = ["major", "lieutenant_colonel", "colonel", "brigadier", "major_general"].includes(rank)
      ? Math.random() < 0.35
      : false;

    // Military ID: strictly correlated to the rank tier (smaller = senior)
    let militaryId: string;
    let attempts = 0;
    do {
      militaryId = String(randomInt(tier.militaryIdMin, tier.militaryIdMax));
      attempts++;
      if (attempts > 500) {
        militaryId = String(randomInt(100000, 999999));
      }
    } while (usedMilitaryIds.has(militaryId));
    usedMilitaryIds.add(militaryId);

    // Seniority number: strictly correlated to the rank tier (smaller = senior)
    let seniorityNumber: string;
    attempts = 0;
    do {
      seniorityNumber = String(randomInt(tier.seniorityMin, tier.seniorityMax));
      attempts++;
      if (attempts > 500) {
        seniorityNumber = String(randomInt(25000, 99000));
      }
    } while (usedSeniorityNumbers.has(seniorityNumber));
    usedSeniorityNumbers.add(seniorityNumber);

    // Military batch: strictly correlated to the rank tier (smaller = older batch)
    const batch = String(randomInt(tier.batchMin, tier.batchMax));

    // Service Join Date correlated with the batch & rank tier
    const joinYear = randomInt(tier.joinYearMin, tier.joinYearMax);
    const joinMonth = randomInt(5, 7); // Usually July/June graduation & commission in Egypt
    const joinDay = randomInt(1, 25);
    const joinDate = new Date(joinYear, joinMonth, joinDay);

    // Birth Date correlated with join year (~21-23 years old at commission)
    const birthYear = joinYear - randomInt(tier.birthAgeAtJoin[0], tier.birthAgeAtJoin[1]);
    const birthMonth = randomInt(0, 11);
    const birthDay = randomInt(1, 28);
    const birthDate = new Date(birthYear, birthMonth, birthDay);

    // Egyptian National ID: 14 digits
    // Century: '2' for 1900-1999, '3' for 2000+
    let nationalId: string;
    attempts = 0;
    do {
      const century = birthYear < 2000 ? "2" : "3";
      const yy = String(birthYear % 100).padStart(2, "0");
      const mm = String(birthMonth + 1).padStart(2, "0");
      const dd = String(birthDay).padStart(2, "0");
      const govCode = String(randomInt(1, 28)).padStart(2, "0");
      const seq = String(randomInt(1000, 9999));
      nationalId = `${century}${yy}${mm}${dd}${govCode}${seq}`;
      attempts++;
    } while (usedNationalIds.has(nationalId) && attempts < 100);
    usedNationalIds.add(nationalId);

    // Egyptian Mobile Phone: 010, 011, 012, 015 + 8 digits
    const prefix = pick(["010", "011", "012", "015"]);
    const phone = `${prefix}${String(randomInt(10000000, 99999999))}`;

    const graduationDate = new Date(joinDate);

    // Default leave system
    const defaultLeaveSystem = pick(["field", "weekly_rest", "daily_sleep"]);

    // Employment status based on formerReason
    let employmentStatus: "active" | "inactive" | "retired" = "active";
    if (!isInUnit) {
      if (formerReason === "transfer") {
        employmentStatus = "active"; // active in Egyptian Armed Forces, but transferred outside our unit
      } else if (formerReason === "retirement") {
        employmentStatus = "retired";
      } else {
        employmentStatus = "inactive"; // terminated / other
      }
    }

    return {
      militaryId,
      seniorityNumber,
      fullName,
      rank,
      batch,
      type,
      weapon,
      phone,
      nationalId,
      unit: isInUnit ? "الوحدة الحالية" : pick(EGYPTIAN_UNITS),
      position: pick(EGYPTIAN_POSITIONS),
      employmentStatus,
      isInUnit,
      joinDate,
      birthDate,
      graduationDate,
      bloodType: pick(["A+", "B+", "O+", "AB+", "O-", "A-"]),
      religion: Math.random() < 0.94 ? "مسلم" : "مسيحي",
      maritalStatus: pick(["أعزب", "متزوج", "يعول"]),
      faculty: pick(FACULTIES),
      isArkanHarb,
      defaultLeaveSystem,
      formerReason,
    };
  }

  // 1. Generate new In-Unit Officers (Target: exactly 25 in unit with the 4 existing)
  const newInUnitDocs: Array<ReturnType<typeof generateEgyptianOfficerData>> = [];
  for (let i = 0; i < neededInUnit; i++) {
    newInUnitDocs.push(generateEgyptianOfficerData(true));
  }

  // 2. Generate new Former / Out-of-Unit Officers (Target: exactly 80 with various departure types)
  // Distribution among the 80:
  // - 50 Transfers (نقل من الوحدة)
  // - 22 Retirements / Normal End of Service (تقاعد / إنهاء خدمة)
  // - 8 Terminations / Resignations (رفد / إنهاء خدمة)
  const newOutUnitDocs: Array<ReturnType<typeof generateEgyptianOfficerData>> = [];
  for (let i = 0; i < neededOutUnit; i++) {
    let reason: "transfer" | "retirement" | "termination";
    if (i < 50) {
      reason = "transfer";
    } else if (i < 72) {
      reason = "retirement";
    } else {
      reason = "termination";
    }
    newOutUnitDocs.push(generateEgyptianOfficerData(false, reason));
  }

  // Insert In-Unit Officers
  if (newInUnitDocs.length > 0) {
    const insertedInUnit = await Officer.insertMany(newInUnitDocs);
    console.log(`✅ Inserted ${insertedInUnit.length} in-unit officers.`);

    // Create ServiceHistory 'join' record for new in-unit officers
    const serviceHistoriesInUnit = insertedInUnit.map((off) => ({
      officerId: off._id,
      type: "join" as const,
      action: "join" as const,
      date: off.joinDate,
      notes: "انضمام للوحدة والخدمة العسكرية",
      createdBy: adminId,
      updatedBy: adminId,
    }));
    await ServiceHistory.insertMany(serviceHistoriesInUnit);
  }

  // Insert Out-Unit Officers and create their Service History
  if (newOutUnitDocs.length > 0) {
    const insertedOutUnit = await Officer.insertMany(newOutUnitDocs);
    console.log(`✅ Inserted ${insertedOutUnit.length} former / out-of-unit officers.`);

    // Create initial join + subsequent departure service history
    const serviceHistoriesOutUnit: Array<{
      officerId: Types.ObjectId;
      type: "join" | "leave" | "return";
      action: "join" | "transfer" | "retirement" | "termination";
      date: Date;
      notes: string;
      createdBy: Types.ObjectId;
      updatedBy: Types.ObjectId;
    }> = [];

    insertedOutUnit.forEach((off, idx) => {
      const data = newOutUnitDocs[idx];
      const leaveDate = new Date(off.joinDate);
      leaveDate.setFullYear(leaveDate.getFullYear() + randomInt(2, 8));
      if (leaveDate > new Date()) {
        leaveDate.setFullYear(new Date().getFullYear() - 1);
      }

      // Initial Join
      serviceHistoriesOutUnit.push({
        officerId: off._id as Types.ObjectId,
        type: "join",
        action: "join",
        date: off.joinDate,
        notes: "انضمام سابق للوحدة",
        createdBy: adminId,
        updatedBy: adminId,
      });

      // Departure
      const actionType = data.formerReason || "transfer";
      const notes =
        actionType === "transfer"
          ? `نقل من الوحدة إلى ${off.unit}`
          : actionType === "retirement"
          ? "بلوغ السن القانوني للتقاعد وإنهاء الخدمة العسكرية بالوحدة"
          : "إنهاء خدمة / شطب من سجلات الوحدة";

      serviceHistoriesOutUnit.push({
        officerId: off._id as Types.ObjectId,
        type: "leave",
        action: actionType,
        date: leaveDate,
        notes,
        createdBy: adminId,
        updatedBy: adminId,
      });
    });

    await ServiceHistory.insertMany(serviceHistoriesOutUnit);
  }

  // ── Step 3: Seed Leaves for In-Unit Officers ──
  console.log(`\n📋 Seeding realistic Egyptian Armed Forces leaves for active in-unit officers...`);

  const currentInUnitOfficers = await Officer.find({ isInUnit: true }).lean();

  const LEAVE_REASONS: Record<LeaveType, string[]> = {
    annual: ["إجازة سنوية اعتيادية", "إجازة دورية", "إجازة سنوية عن العام الحالي"],
    field: ["إجازة ميدانية نظامية", "ميداني دوري بعد انتهاء المشروع", "إجازة ميدانية"],
    weekly_rest: ["راحة أسبوعية", "راحة مجمعة عن تدريب الأسبوع", "راحة نظامية"],
    daily_sleep: ["مبيت عائلي مصدق", "مبيت يومي حسب النوبتجية", "مبيت معتاد"],
    medical: ["وعكة صحية وعيادة خارجية", "كشف طبي بمستشفى القوات المسلحة", "إجراء فحوصات طبية"],
    casual: ["ظرف عائلي طارئ", "إجازة عارضة طارئة", "إذن خروج طارئ"],
    permission: ["إذن خروج رسمي لقضاء مصلحة", "إذن لقضاء مهمة خاصة", "إذن تصديق قائد"],
    rest: ["بدل راحة نظير نوبتجية", "بدل راحة عن خدمة إضافية", "بدل راحة مصدق"],
  };

  const LEAVE_DURATIONS: Record<LeaveType, [number, number]> = {
    annual: [3, 14],
    field: [3, 7],
    weekly_rest: [2, 4],
    daily_sleep: [1, 1],
    medical: [2, 10],
    casual: [1, 2],
    permission: [1, 1],
    rest: [1, 2],
  };

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
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);

  for (const officer of currentInUnitOfficers) {
    const numLeaves = randomInt(2, 4);
    const officerId = officer._id as Types.ObjectId;

    for (let l = 0; l < numLeaves; l++) {
      const type = pick(["annual", "field", "weekly_rest", "casual", "medical"] as LeaveType[]);
      const [minDur, maxDur] = LEAVE_DURATIONS[type];
      const durationDays = randomInt(minDur, maxDur);
      const startDate = randomDate(oneYearAgo, now);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + durationDays);

      leavesToInsert.push({
        officerId,
        category: "leave",
        type,
        startDate,
        endDate,
        reason: pick(LEAVE_REASONS[type]),
        status: pick(["approved", "closed", "closed", "approved"]),
        createdBy: adminId,
        updatedBy: adminId,
      });
    }
  }

  for (let i = 0; i < leavesToInsert.length; i += BATCH_SIZE) {
    const batch = leavesToInsert.slice(i, i + BATCH_SIZE);
    await Leave.insertMany(batch);
  }

  console.log(`✅ Inserted ${leavesToInsert.length} leaves for in-unit officers.`);

  // ── Final Audit & Verification ──
  const finalInUnit = await Officer.countDocuments({ isInUnit: true });
  const finalOutUnit = await Officer.countDocuments({ isInUnit: false });
  const finalTotal = await Officer.countDocuments();
  const finalHistoryCount = await ServiceHistory.countDocuments();
  const finalLeavesCount = await Leave.countDocuments();

  console.log(`\n==============================================`);
  console.log(`🏁 SEEDING SUMMARY (EGYPTIAN ARMED FORCES):`);
  console.log(`   - In-Unit Officers: ${finalInUnit} (Target: 25)`);
  console.log(`   - Former / Out-of-Unit Officers: ${finalOutUnit} (Target: 80)`);
  console.log(`   - Total Officers: ${finalTotal}`);
  console.log(`   - Total Service History Movements: ${finalHistoryCount}`);
  console.log(`   - Total Leaves: ${finalLeavesCount}`);
  console.log(`==============================================\n`);

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
