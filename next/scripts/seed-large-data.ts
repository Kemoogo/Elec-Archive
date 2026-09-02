import { connectToDatabase } from "../lib/db/connect";
import {
  Officer,
  OFFICER_RANKS,
  OFFICER_TYPES,
  OFFICER_WEAPONS,
} from "../lib/db/models/Officer";
import {
  User,
  Student,
  Fax,
  Course,
  Medicine,
  AuditLog,
  DailyRollcall,
} from "../lib/db/models";
import { hash } from "bcryptjs";

const COUNT_USERS = 15;
const COUNT_OFFICERS = 100;
const COUNT_STUDENTS = 80;
const COUNT_FAXES = 150;
const COUNT_COURSES = 12;
const COUNT_MEDICINES = 40;
const COUNT_AUDIT_LOGS = 300;
const COUNT_ROLLCALLS = 14;

const ARABIC_FIRST_NAMES = [
  "أحمد", "محمد", "علي", "عمر", "خالد", "محمود", "عبدالله", "ناصر",
  "فهد", "سعود", "بدر", "تركي", "فيصل", "سعد", "عبدالعزيز", "ماجد",
  "ياسر", "هاني", "وائل", "سمير", "جابر", "حسن", "حسين", "إبراهيم",
  "راشد", "سلطان", "صالح", "طلال", "عبدالرحمن", "نايف", "بندر", "مشعل",
];

const ARABIC_LAST_NAMES = [
  "السيد", "إبراهيم", "حسان", "مصطفى", "عبدالفتاح", "الشريف",
  "العوضي", "فاروق", "منصور", "المهدي", "عبدالعزيز", "الشناوي",
  "بدوي", "كامل", "توفيق", "زكي", "سلامة", "الحسيني", "سليمان",
];

const UNITS = [
  "اللواء الأول", "اللواء الثاني", "كتيبة الإشارة", "كتيبة المركبات",
  "كتيبة المشاة", "قيادة المنطقة", "مركز التدريب", "إدارة الشؤون الفنية",
];

const POSITIONS = [
  "قائد اللواء", "نائب قائد اللواء", "ركن عمليات", "ركن إمداد",
  "قائد كتيبة", "ضابط عمليات", "ضابط تدريب", "رئيس قسم",
];

const FAX_ENTITIES = [
  "قيادة الجيش الثاني", "هيئة العمليات", "إدارة السجلات العسكرية",
  "قيادة المنطقة المركزية", "إدارة التدريب", "فرع الأمانة العامة",
];

const FAX_SUBJECTS = [
  "تعليمات شأن تنظيم حركة المركبات خلال الفترة القادمة",
  "طلب كشف بأسماء الضباط المستحقين للترقية",
  "تنسيق مأمورية تدريبية لكتيبة الإشارة",
  "إفادة بشأن مستودعات الأدوية والمستلزمات الطبية",
  "تقرير متابعة الدورات التعليمية للدفعة الجديدة",
  "إحالة أوراق منقولين وتحديث بيانات الخدمة",
];

function getRandomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
  console.log("🚀 Starting large-scale Arabic data seeding...");
  await connectToDatabase();

  // 1. Seed / Ensure Admin and Users
  console.log(`- Seeding Users & Admin...`);
  const hashedPassword = await hash("password123", 12);
  const adminHashedPassword = await hash("admin123", 12);

  // Guarantee Admin User
  let adminUser = await User.findOne({ username: "admin" });
  if (!adminUser) {
    adminUser = await User.create({
      username: "admin",
      password: adminHashedPassword,
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
    });
    console.log("  ✅ Created main Admin user (admin / admin123)");
  }

  const adminId = adminUser._id;

  // Insert additional test users if needed
  const existingUserCount = await User.countDocuments();
  if (existingUserCount < COUNT_USERS) {
    const users = [];
    for (let i = 0; i < COUNT_USERS; i++) {
      const username = `user_${i + 1}`;
      const existing = await User.findOne({ username });
      if (!existing) {
        users.push({
          username,
          password: hashedPassword,
          fullName: `${getRandomItem(ARABIC_FIRST_NAMES)} ${getRandomItem(ARABIC_LAST_NAMES)}`,
          role: i % 4 === 0 ? "commander" : i % 3 === 0 ? "viewer" : "employee",
          department: ["fax", "officers", "medical", "students", "education"][i % 5],
          permissions: {
            fax: "edit",
            officers: "edit",
            medical: "edit",
            students: "edit",
            education: "edit",
            arkan_harb: "edit",
          },
          isActive: true,
        });
      }
    }
    if (users.length > 0) {
      await User.insertMany(users);
      console.log(`  ✅ Inserted ${users.length} mock users (password: password123)`);
    }
  }

  interface SeededOfficerItem {
    _id: unknown;
    militaryId: string;
    fullName: string;
    rank: string;
  }

  interface SeededStudentItem {
    _id: unknown;
  }

  // 2. Seed Officers
  console.log(`- Seeding Officers...`);
  const existingOfficersCount = await Officer.countDocuments();
  let seededOfficers: SeededOfficerItem[] = [];
  if (existingOfficersCount < COUNT_OFFICERS) {
    const officers = [];
    const usedMilitary = new Set<string>();
    const usedSeniority = new Set<string>();
    const usedNational = new Set<string>();

    const existing = await Officer.find().select("militaryId seniorityNumber nationalId").lean();
    existing.forEach(o => {
      usedMilitary.add(o.militaryId);
      usedSeniority.add(o.seniorityNumber);
      if (o.nationalId) usedNational.add(o.nationalId);
    });

    for (let i = 0; i < COUNT_OFFICERS; i++) {
      let milId: string;
      do { milId = Math.floor(1000000 + Math.random() * 9000000).toString(); } while (usedMilitary.has(milId));
      usedMilitary.add(milId);

      let senId: string;
      do { senId = Math.floor(2000000 + Math.random() * 9000000).toString(); } while (usedSeniority.has(senId));
      usedSeniority.add(senId);

      let natId: string;
      do { natId = Math.floor(10000000000000 + Math.random() * 90000000000000).toString(); } while (usedNational.has(natId));
      usedNational.add(natId);

      const fullName = `${getRandomItem(ARABIC_FIRST_NAMES)} ${getRandomItem(ARABIC_LAST_NAMES)} ${getRandomItem(ARABIC_LAST_NAMES)}`;

      officers.push({
        militaryId: milId,
        seniorityNumber: senId,
        nationalId: natId,
        fullName,
        rank: OFFICER_RANKS[i % OFFICER_RANKS.length],
        type: getRandomItem(OFFICER_TYPES),
        weapon: getRandomItem(OFFICER_WEAPONS),
        unit: getRandomItem(UNITS),
        position: getRandomItem(POSITIONS),
        employmentStatus: i % 10 === 0 ? "retired" : "active",
        isInUnit: Math.random() > 0.15,
        joinDate: new Date(2015 + (i % 9), (i % 12), 1),
        birthDate: new Date(1985 + (i % 10), (i % 12), 1),
        isArkanHarb: i % 8 === 0,
      });
    }
    seededOfficers = (await Officer.insertMany(officers)) as unknown as SeededOfficerItem[];
    console.log(`  ✅ Inserted ${officers.length} Officers`);
  } else {
    seededOfficers = (await Officer.find()) as unknown as SeededOfficerItem[];
  }

  // 3. Seed Students
  console.log(`- Seeding Students...`);
  const existingStudentsCount = await Student.countDocuments();
  let seededStudents: SeededStudentItem[] = [];
  if (existingStudentsCount < COUNT_STUDENTS) {
    const students = [];
    for (let i = 0; i < COUNT_STUDENTS; i++) {
      students.push({
        studentId: `STU${202400 + i}`,
        fullName: `طالب/ ${getRandomItem(ARABIC_FIRST_NAMES)} ${getRandomItem(ARABIC_LAST_NAMES)}`,
        enrollDate: new Date(2023, 8, 1),
        status: i % 15 === 0 ? "graduated" : "active",
      });
    }
    seededStudents = (await Student.insertMany(students)) as unknown as SeededStudentItem[];
    console.log(`  ✅ Inserted ${students.length} Students`);
  } else {
    seededStudents = (await Student.find()) as unknown as SeededStudentItem[];
  }

  // 4. Seed Faxes
  console.log(`- Seeding Faxes...`);
  const existingFaxes = await Fax.countDocuments();
  if (existingFaxes < COUNT_FAXES) {
    const faxes = [];
    for (let i = 0; i < COUNT_FAXES; i++) {
      const year = 2024;
      const faxNum = `FAX-${year}-${1000 + i}`;
      faxes.push({
        faxNumber: faxNum,
        date: new Date(2024, (i % 6), 1 + (i % 25)),
        fromEntity: getRandomItem(FAX_ENTITIES),
        toEntity: getRandomItem(FAX_ENTITIES),
        subject: getRandomItem(FAX_SUBJECTS),
        fileUrl: "/mock/sample_document.pdf",
        fileType: i % 4 === 0 ? "image" : "pdf",
        status: i % 3 === 0 ? "closed" : i % 2 === 0 ? "forwarded" : "pending",
        uploadedBy: adminId,
      });
    }
    await Fax.insertMany(faxes);
    console.log(`  ✅ Inserted ${faxes.length} Faxes`);
  }

  // 5. Seed Courses
  console.log(`- Seeding Courses...`);
  const existingCourses = await Course.countDocuments();
  if (existingCourses < COUNT_COURSES) {
    const courses = [];
    for (let i = 0; i < COUNT_COURSES; i++) {
      const isOfficerCourse = i % 2 === 0;
      courses.push({
        title: `دورة ${isOfficerCourse ? "تأهيل ضباط" : "إعداد طلبة"} رقم ${i + 1}`,
        description: `دورة تدريبية متخصصة لتطوير المهارات القيادية والفنية رقم ${i + 1}`,
        startDate: new Date(2024, 4, 1),
        endDate: new Date(2024, 6, 1),
        status: i % 3 === 0 ? "completed" : i % 2 === 0 ? "ongoing" : "upcoming",
        participantModel: isOfficerCourse ? "Officer" : "Student",
        participants: isOfficerCourse
          ? seededOfficers.slice(i * 3, (i + 1) * 3).map(o => o._id)
          : seededStudents.slice(i * 3, (i + 1) * 3).map(s => s._id),
      });
    }
    await Course.insertMany(courses);
    console.log(`  ✅ Inserted ${courses.length} Courses`);
  }

  // 6. Seed Medicines
  console.log(`- Seeding Medicines...`);
  const existingMedicines = await Medicine.countDocuments();
  if (existingMedicines < COUNT_MEDICINES) {
    const medNames = [
      "بنادول 500 ملجم", "أموكسيسيلين 500 ملجم", "بروفين 400 ملجم",
      "فيتامين سي 1000", "أوميبرازول 20 ملجم", "أنسولين ممتد المفعول",
      "سيتريزين 10 ملجم", "أملوديبين 5 ملجم", "باراسيتامول شراب",
    ];
    const medicines = [];
    for (let i = 0; i < COUNT_MEDICINES; i++) {
      medicines.push({
        name: `${medNames[i % medNames.length]} (${i + 1})`,
        unit: i % 2 === 0 ? "شريط" : "علبة",
        concentration: `${(i + 1) * 10} mg`,
        minThreshold: 15,
        totalQuantity: 150,
        batches: [{
          quantity: 150,
          expiryDate: new Date(2026, 11, 31),
          receivedAt: new Date(),
        }],
      });
    }
    await Medicine.insertMany(medicines);
    console.log(`  ✅ Inserted ${medicines.length} Medicines`);
  }

  // 7. Seed Audit Logs
  console.log(`- Seeding Audit Logs...`);
  const existingLogs = await AuditLog.countDocuments();
  if (existingLogs < COUNT_AUDIT_LOGS) {
    const auditLogs = [];
    const modules: Array<"fax" | "officers" | "medical" | "students" | "education"> = [
      "fax", "officers", "medical", "students", "education"
    ];
    const actions: Array<"CREATE" | "UPDATE" | "DELETE" | "LOGIN"> = [
      "CREATE", "UPDATE", "DELETE", "LOGIN"
    ];
    for (let i = 0; i < COUNT_AUDIT_LOGS; i++) {
      auditLogs.push({
        userId: adminId,
        userName: "مدير النظام",
        action: getRandomItem(actions),
        module: getRandomItem(modules),
        description: `قام مدير النظام بنشاط اختباري رقم ${i + 1} على المنظومة`,
        ipAddress: "127.0.0.1",
        createdAt: new Date(2024, 4, 1 + (i % 28)),
      });
    }
    await AuditLog.insertMany(auditLogs);
    console.log(`  ✅ Inserted ${auditLogs.length} Audit Logs`);
  }

  // 8. Seed Daily Rollcalls
  console.log(`- Seeding Daily Rollcalls...`);
  for (let d = 0; d < COUNT_ROLLCALLS; d++) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    date.setHours(0, 0, 0, 0);

    const entries = seededOfficers.slice(0, 30).map(officer => ({
      officerId: officer._id,
      militaryId: officer.militaryId,
      fullName: officer.fullName,
      rank: officer.rank,
      status: Math.random() > 0.85 ? "absent" : "present",
    }));

    await DailyRollcall.findOneAndUpdate(
      { date },
      {
        date,
        status: "submitted",
        targetOfficerCount: entries.length,
        entries,
        submittedBy: adminId,
        submittedAt: new Date(),
      },
      { upsert: true }
    );
  }
  console.log(`  ✅ Inserted/Updated ${COUNT_ROLLCALLS} Daily Rollcalls`);

  console.log("\n✨ All large-scale Arabic seeding completed successfully!");
  console.log("🔑 Default Login Credentials:");
  console.log("   Username: admin");
  console.log("   Password: admin123");
  process.exit(0);
}

seed().catch(err => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});

