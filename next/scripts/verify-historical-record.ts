import assert from "assert";
import fs from "fs";
import path from "path";
import type { UserAccessPayload } from "../lib/auth/rbac";
import {
  canAddHistoricalRecord,
  canMutateOrDeleteHistoricalRecord,
  canViewHistoricalRecord,
  getHistoricalRecordCapabilities,
} from "../lib/historical-record/access";
import { calculateCommandDuration } from "../lib/historical-record/duration";
import { verifyMagicBytes } from "../lib/uploads";
import {
  governanceConfirmationSchema,
  historicalCommanderCreateSchema,
  historicalCommanderUpdateSchema,
  historicalVisitCreateSchema,
  historicalVisitUpdateSchema,
  unitMilestoneCreateSchema,
  unitProfileUpsertSchema,
} from "../lib/validations/historical-record";

console.log("==================================================");
console.log("Running Phase 5 Historical Record Verification");
console.log("==================================================");

// 1. RBAC Separation Tests (FR-001, FR-002, FR-003)
console.log("\n[1] Testing RBAC Separation (Add vs Admin-Only Mutate/Delete)");

const noneUser: UserAccessPayload = {
  role: "employee",
  permissions: { historical_record: "none" },
};
assert.strictEqual(canViewHistoricalRecord(noneUser), false);
assert.strictEqual(canAddHistoricalRecord(noneUser), false);
assert.strictEqual(canMutateOrDeleteHistoricalRecord(noneUser), false);

const viewUser: UserAccessPayload = {
  role: "employee",
  permissions: { historical_record: "view" },
};
assert.strictEqual(canViewHistoricalRecord(viewUser), true);
assert.strictEqual(canAddHistoricalRecord(viewUser), false);
assert.strictEqual(canMutateOrDeleteHistoricalRecord(viewUser), false);

const editEmployee: UserAccessPayload = {
  role: "employee",
  permissions: { historical_record: "edit" },
};
assert.strictEqual(canViewHistoricalRecord(editEmployee), true);
assert.strictEqual(canAddHistoricalRecord(editEmployee), true);
assert.strictEqual(canMutateOrDeleteHistoricalRecord(editEmployee), false);

const viewerWithEditPerm: UserAccessPayload = {
  role: "viewer",
  permissions: { historical_record: "edit" },
};
assert.strictEqual(canViewHistoricalRecord(viewerWithEditPerm), true);
assert.strictEqual(canAddHistoricalRecord(viewerWithEditPerm), false);
assert.strictEqual(canMutateOrDeleteHistoricalRecord(viewerWithEditPerm), false);

const commanderAuto: UserAccessPayload = {
  role: "commander",
  permissions: { historical_record: "none" },
};
assert.strictEqual(canViewHistoricalRecord(commanderAuto), true);
assert.strictEqual(canAddHistoricalRecord(commanderAuto), true);
assert.strictEqual(
  canMutateOrDeleteHistoricalRecord(commanderAuto),
  false,
  "Commander MUST NOT be allowed to edit/delete saved historical records",
);

const adminUser: UserAccessPayload = {
  role: "admin",
  permissions: { historical_record: "none" },
};
const adminCaps = getHistoricalRecordCapabilities(adminUser);
assert.deepStrictEqual(adminCaps, {
  canView: true,
  canAdd: true,
  isAdmin: true,
});

// 2. Duration Calculation Tests (FR-007, SC-005)
console.log("[2] Testing Arabic Command Duration Calculation");

assert.strictEqual(
  calculateCommandDuration("2024-06-30", "2024-06-30", false),
  "يوم واحد",
);
assert.strictEqual(
  calculateCommandDuration("2025-05-10", "2025-05-01", false),
  "—",
);
assert.strictEqual(
  calculateCommandDuration("2022-01-01", "2024-03-11", false),
  "سنتان و شهران و 10 أيام",
);
assert.ok(
  calculateCommandDuration("2020-01-01", undefined, true).length > 0,
  "isCurrent commander must compute non-empty duration",
);

// 3. Zod 4 Schema Validation & Date Guards (FR-003, FR-005, FR-007, FR-010)
console.log("[3] Testing Zod 4 Schemas & Governance Validation");

assert.strictEqual(
  historicalVisitCreateSchema.safeParse({
    title: "زيارة تفقدية",
    visitorName: "اللواء أ ح فلان",
    visitDate: "2026-02-30",
  }).success,
  false,
  "Invalid calendar date 2026-02-30 must fail",
);

assert.strictEqual(
  historicalVisitCreateSchema.safeParse({
    title: "زيارة تفقدية",
    visitorName: "اللواء أ ح فلان",
    visitDate: "2026-02-14",
    description: "تفاصيل",
  }).success,
  true,
);

assert.strictEqual(
  historicalCommanderCreateSchema.safeParse({
    officerId: "507f1f77bcf86cd799439011",
    startDate: "2024-05-10",
    isCurrent: false,
    endDate: "2024-05-01",
  }).success,
  false,
  "endDate < startDate must fail validation",
);

assert.strictEqual(
  historicalCommanderCreateSchema.safeParse({
    officerId: "507f1f77bcf86cd799439011",
    startDate: "2024-05-10",
    isCurrent: true,
    previousCommanderEndDate: "2024-05-10",
  }).success,
  true,
);

assert.strictEqual(
  historicalCommanderUpdateSchema.safeParse({
    startDate: "2024-05-10",
    isCurrent: true,
    endDate: "2024-06-01",
    reason: "اختبار رفض الجمع بين حتى الآن وتاريخ انتهاء",
    confirmed: true,
  }).success,
  false,
  "PATCH with isCurrent=true and explicit endDate must fail validation",
);

assert.strictEqual(
  governanceConfirmationSchema.safeParse({
    reason: "لا",
    confirmed: true,
  }).success,
  false,
  "Reason shorter than 3 characters must fail",
);

assert.strictEqual(
  historicalVisitUpdateSchema.safeParse({
    title: "عنوان معدل",
    reason: "تصحيح خطأ إملائي في اسم الزائر",
    confirmed: false,
  }).success,
  false,
  "confirmed !== true must fail",
);

assert.strictEqual(
  unitProfileUpsertSchema.safeParse({
    unitName: "مركز تدريب الحرب الإلكترونية",
    foundingDate: "1998-10-06",
  }).success,
  true,
);

assert.strictEqual(
  unitMilestoneCreateSchema.safeParse({
    milestoneDate: "2020-01-15",
    title: "تحديث المعامل",
    category: "upgrade",
  }).success,
  true,
);

// 4. Magic-Byte Image Verification & Non-Cascading Isolation Check (FR-008)
console.log("[4] Testing Magic-Byte Verification & Officer Non-Cascade Isolation");

assert.strictEqual(
  verifyMagicBytes(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), ".jpg"),
  true,
);
assert.strictEqual(
  verifyMagicBytes(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'>"), ".png"),
  false,
  "SVG masquerading as PNG must fail magic bytes",
);

const officersRoutePath = path.resolve(
  process.cwd(),
  "app/api/officers/[id]/route.ts",
);
const officersPhotoRoutePath = path.resolve(
  process.cwd(),
  "app/api/officers/[id]/photo/route.ts",
);
const officersRouteSrc = fs.readFileSync(officersRoutePath, "utf-8");
const officersPhotoRouteSrc = fs.readFileSync(officersPhotoRoutePath, "utf-8");

assert.strictEqual(
  officersRouteSrc.includes("HistoricalCommander") ||
    officersRouteSrc.includes("historical-record"),
  false,
  "Officers [id] route MUST NOT cascade delete/update HistoricalCommander",
);
assert.strictEqual(
  officersPhotoRouteSrc.includes("HistoricalCommander") ||
    officersPhotoRouteSrc.includes("historical-record"),
  false,
  "Officers photo route MUST NOT delete/touch HistoricalCommander photos",
);

console.log("\nALL PHASE 5 HISTORICAL RECORD VERIFICATIONS PASSED!");
