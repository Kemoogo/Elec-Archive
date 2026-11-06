/**
 * Adversarial Challenger 2 Stress Test Suite
 * Covers Milestones 3 & 4:
 * 1. PositionAssignment.restructure query verification (primaryOfficerId, substituteOfficerIds vs officerId)
 * 2. Daily Rollcall Timezone & getUtcDayRange stress testing across UTC+2, UTC+3, UTC, etc.
 * 3. Date Calculations & Zod Validation (calculateDiffDays, createLeaveSchema, patchLeaveSchema)
 * 4. Mongoose CastError Handling (handleApiError in both utils/api-error and api-response)
 * 5. Read-only view leakage in OfficerLeaveHistoryModal and 7 inspection dialogs
 */

import * as fs from "fs";
import * as path from "path";
import mongoose from "mongoose";
import { getUtcDayRange } from "@/lib/arkan-harb/rollcall-engine";
import { calculateDiffDays, calculateTotalDays } from "@/lib/utils/date";
import { createLeaveSchema, patchLeaveSchema } from "@/lib/validations/officers";
import { handleApiError as handleApiErrorUtil } from "@/lib/utils/api-error";
import { handleApiError as handleApiErrorResp } from "@/lib/api-response";

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
  details?: unknown;
}

const results: TestResult[] = [];

function recordTest(suite: string, name: string, condition: boolean, details?: unknown) {
  if (condition) {
    results.push({ suite, name, passed: true, details });
    console.log(`  [PASS] ${name}`);
  } else {
    results.push({ suite, name, passed: false, error: "Assertion failed", details });
    console.error(`  [FAIL] ${name}`, details);
  }
}

async function runAdversarialVerification() {
  console.log("===============================================================================");
  console.log("     CHALLENGER 2: ADVERSARIAL STRESS TEST & VERIFICATION HARNESS (M3 & M4)    ");
  console.log("===============================================================================\n");

  // ==========================================================================
  // SUITE 1: PositionAssignment.restructure Query Logic
  // ==========================================================================
  console.log(">>> SUITE 1: PositionAssignment.restructure Query Logic");
  const restructureFilePath = path.resolve(__dirname, "../app/api/arkan-harb/positions/restructure/route.ts");
  const restructureCode = fs.readFileSync(restructureFilePath, "utf-8");

  // Adversarial check: Ensure phantom field 'officerId' is nowhere in the update query
  const hasPhantomOfficerIdInUpdate = /updateMany\s*\(\s*[^)]+\s*,\s*\{[\s\S]*?officerId\s*:/m.test(restructureCode);
  recordTest(
    "PositionAssignment.restructure",
    "Restructure route does NOT update phantom 'officerId' field",
    !hasPhantomOfficerIdInUpdate,
    { hasPhantomOfficerIdInUpdate }
  );

  // Verify primaryOfficerId: null is set
  const setsPrimaryNull = /primaryOfficerId\s*:\s*null/.test(restructureCode);
  recordTest(
    "PositionAssignment.restructure",
    "Restructure route explicitly sets primaryOfficerId: null",
    setsPrimaryNull
  );

  // Verify substituteOfficerIds: [] is set
  const setsSubstituteEmpty = /substituteOfficerIds\s*:\s*\[\]/.test(restructureCode);
  recordTest(
    "PositionAssignment.restructure",
    "Restructure route explicitly sets substituteOfficerIds: []",
    setsSubstituteEmpty
  );

  // Inspect Model definition for PositionAssignment
  const { PositionAssignment } = await import("@/lib/db/models/PositionAssignment");
  const schemaPaths = Object.keys(PositionAssignment.schema.paths);
  const hasPrimaryOfficerId = "primaryOfficerId" in PositionAssignment.schema.paths;
  const hasSubstituteOfficerIds = "substituteOfficerIds" in PositionAssignment.schema.paths;
  const hasRootOfficerId = "officerId" in PositionAssignment.schema.paths;

  recordTest(
    "PositionAssignment.restructure",
    "PositionAssignment Mongoose schema paths include primaryOfficerId & substituteOfficerIds",
    hasPrimaryOfficerId && hasSubstituteOfficerIds
  );

  recordTest(
    "PositionAssignment.restructure",
    "PositionAssignment Mongoose schema paths strictly do NOT include root 'officerId'",
    !hasRootOfficerId,
    { schemaPathsSample: schemaPaths.slice(0, 10) }
  );

  // ==========================================================================
  // SUITE 2: Daily Rollcall Timezone & getUtcDayRange
  // ==========================================================================
  console.log("\n>>> SUITE 2: Daily Rollcall Timezone & getUtcDayRange");

  // Test across multiple standard and boundary dates:
  const testDates = [
    "2026-01-01",
    "2026-02-28",
    "2026-03-01",
    "2024-02-29", // leap year
    "2026-05-12",
    "2026-09-10",
    "2026-12-31",
  ];

  for (const dateStr of testDates) {
    const range = getUtcDayRange(dateStr);
    const startIso = range.startOfDay.toISOString();
    const endIso = range.endOfDay.toISOString();
    const nextIso = range.nextDay.toISOString();

    const expectedStart = `${dateStr}T00:00:00.000Z`;
    const expectedEnd = `${dateStr}T23:59:59.999Z`;

    recordTest(
      "Daily Rollcall Timezone",
      `getUtcDayRange('${dateStr}') string starts strictly at UTC 00:00:00.000Z`,
      startIso === expectedStart,
      { got: startIso, expected: expectedStart }
    );

    recordTest(
      "Daily Rollcall Timezone",
      `getUtcDayRange('${dateStr}') string ends strictly at UTC 23:59:59.999Z`,
      endIso === expectedEnd,
      { got: endIso, expected: expectedEnd }
    );

    // Verify day range strictly does NOT shift backwards
    recordTest(
      "Daily Rollcall Timezone",
      `getUtcDayRange('${dateStr}') does not shift back to prior date`,
      startIso.startsWith(dateStr) && endIso.startsWith(dateStr)
    );
  }

  // Adversarial stress: Test Date objects instantiated at different UTC hours
  // Simulate an officer in Egypt (UTC+2 or UTC+3 during DST)
  // When local time is 01:00 AM in UTC+3 on 2026-09-10, the UTC time is 2026-09-09T22:00:00.000Z
  // When date is passed as ISO string:
  const egyptIsoDateString = "2026-09-10T01:00:00+03:00";
  const rangeFromIsoWithTz = getUtcDayRange(egyptIsoDateString);
  recordTest(
    "Daily Rollcall Timezone",
    "getUtcDayRange with ISO timestamp containing timezone offset extracts calendar day correctly",
    rangeFromIsoWithTz.startOfDay.toISOString() === "2026-09-10T00:00:00.000Z"
  );

  // Check rollcall route code for absence of local setHours(0,0,0,0)
  const rollcallRoutePath = path.resolve(__dirname, "../app/api/officers/rollcall/route.ts");
  const rollcallRouteCode = fs.readFileSync(rollcallRoutePath, "utf-8");
  const hasLocalSetHours = /queryDate\.setHours\s*\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/.test(rollcallRouteCode);
  recordTest(
    "Daily Rollcall Timezone",
    "Rollcall route does NOT invoke local queryDate.setHours(0,0,0,0)",
    !hasLocalSetHours
  );

  const usesGetUtcDayRange = /getUtcDayRange\(parsed\.data\.date\)/.test(rollcallRouteCode);
  recordTest(
    "Daily Rollcall Timezone",
    "Rollcall route utilizes getUtcDayRange for query normalization",
    usesGetUtcDayRange
  );

  // ==========================================================================
  // SUITE 3: Date Calculations & Zod Validation
  // ==========================================================================
  console.log("\n>>> SUITE 3: Date Calculations & Zod Validation");

  // 3.1 calculateDiffDays
  // Inverted ranges (end < start) MUST return 0 (not 1)
  const diffInverted1 = calculateDiffDays("2026-06-15", "2026-06-01");
  recordTest(
    "Date Calculations",
    "calculateDiffDays('2026-06-15', '2026-06-01') inverted returns 0",
    diffInverted1 === 0,
    { got: diffInverted1 }
  );

  const diffInverted2 = calculateDiffDays("2026-12-31", "2026-01-01");
  recordTest(
    "Date Calculations",
    "calculateDiffDays('2026-12-31', '2026-01-01') inverted year boundary returns 0",
    diffInverted2 === 0,
    { got: diffInverted2 }
  );

  // Same day MUST return 1
  const diffSameDay = calculateDiffDays("2026-06-01", "2026-06-01");
  recordTest(
    "Date Calculations",
    "calculateDiffDays('2026-06-01', '2026-06-01') same day returns 1",
    diffSameDay === 1,
    { got: diffSameDay }
  );

  // Normal range
  const diff5Days = calculateDiffDays("2026-06-01", "2026-06-05");
  recordTest(
    "Date Calculations",
    "calculateDiffDays('2026-06-01', '2026-06-05') 5 days returns 5",
    diff5Days === 5,
    { got: diff5Days }
  );

  // Month boundary
  const diffMonthCrossing = calculateDiffDays("2026-01-31", "2026-02-02");
  recordTest(
    "Date Calculations",
    "calculateDiffDays across month boundary ('2026-01-31' to '2026-02-02') returns 3",
    diffMonthCrossing === 3,
    { got: diffMonthCrossing }
  );

  // Leap year boundary (2024 is leap, Feb has 29 days)
  const diffLeapCrossing = calculateDiffDays("2024-02-28", "2024-03-01");
  recordTest(
    "Date Calculations",
    "calculateDiffDays across leap day ('2024-02-28' to '2024-03-01') returns 3",
    diffLeapCrossing === 3,
    { got: diffLeapCrossing }
  );

  // Invalid inputs
  const diffInvalid1 = calculateDiffDays("invalid-date", "2026-06-01");
  const diffInvalid2 = calculateDiffDays("2026-06-01", "invalid-date");
  const diffInvalid3 = calculateDiffDays(null, undefined);
  recordTest(
    "Date Calculations",
    "calculateDiffDays with invalid or missing dates returns 0",
    diffInvalid1 === 0 && diffInvalid2 === 0 && diffInvalid3 === 0,
    { diffInvalid1, diffInvalid2, diffInvalid3 }
  );

  // calculateTotalDays alias
  const totalDaysInverted = calculateTotalDays("2026-06-15", "2026-06-01");
  recordTest(
    "Date Calculations",
    "calculateTotalDays('2026-06-15', '2026-06-01') inverted returns 0",
    totalDaysInverted === 0,
    { got: totalDaysInverted }
  );

  // 3.2 Zod Validation: createLeaveSchema
  const validCreatePayload = {
    officerId: "65f1a2b3c4d5e6f7a8b9c0d1",
    category: "leave" as const,
    type: "annual" as const,
    startDate: "2026-06-01",
    endDate: "2026-06-10",
  };

  const parsedValidCreate = createLeaveSchema.safeParse(validCreatePayload);
  recordTest(
    "Zod Validation",
    "createLeaveSchema accepts valid dates (endDate >= startDate)",
    parsedValidCreate.success
  );

  const equalDatesCreatePayload = {
    ...validCreatePayload,
    startDate: "2026-06-05",
    endDate: "2026-06-05",
  };
  const parsedEqualCreate = createLeaveSchema.safeParse(equalDatesCreatePayload);
  recordTest(
    "Zod Validation",
    "createLeaveSchema accepts equal dates (single day leave)",
    parsedEqualCreate.success
  );

  const invertedCreatePayload = {
    ...validCreatePayload,
    startDate: "2026-06-15",
    endDate: "2026-06-01",
  };
  const parsedInvertedCreate = createLeaveSchema.safeParse(invertedCreatePayload);
  recordTest(
    "Zod Validation",
    "createLeaveSchema REJECTS inverted dates (endDate < startDate)",
    !parsedInvertedCreate.success &&
      parsedInvertedCreate.error?.issues.some((i) => i.path.includes("endDate")),
    { issues: parsedInvertedCreate.error?.issues }
  );

  // 3.3 Zod Validation: patchLeaveSchema
  const validPatchPayload = {
    startDate: "2026-07-01",
    endDate: "2026-07-05",
  };
  const parsedValidPatch = patchLeaveSchema.safeParse(validPatchPayload);
  recordTest(
    "Zod Validation",
    "patchLeaveSchema accepts valid dates",
    parsedValidPatch.success
  );

  const invertedPatchPayload = {
    startDate: "2026-07-10",
    endDate: "2026-07-01",
  };
  const parsedInvertedPatch = patchLeaveSchema.safeParse(invertedPatchPayload);
  recordTest(
    "Zod Validation",
    "patchLeaveSchema REJECTS inverted dates (endDate < startDate)",
    !parsedInvertedPatch.success &&
      parsedInvertedPatch.error?.issues.some((i) => i.path.includes("endDate")),
    { issues: parsedInvertedPatch.error?.issues }
  );

  // ==========================================================================
  // SUITE 4: Mongoose CastError Handling in handleApiError
  // ==========================================================================
  console.log("\n>>> SUITE 4: Mongoose CastError Handling in handleApiError");

  // Create real Mongoose CastError
  const realCastError = new mongoose.Error.CastError("ObjectId", "invalid-id-xyz", "officerId");

  // Test next/lib/utils/api-error.ts
  const respFromUtil = handleApiErrorUtil(realCastError);
  const statusFromUtil = respFromUtil.status;
  const jsonFromUtil = await respFromUtil.json();

  recordTest(
    "Mongoose CastError Handling",
    "handleApiError (utils/api-error) returns HTTP 400 for mongoose.Error.CastError",
    statusFromUtil === 400,
    { status: statusFromUtil }
  );

  recordTest(
    "Mongoose CastError Handling",
    "handleApiError (utils/api-error) returns message 'معرف غير صالح'",
    jsonFromUtil.error === "معرف غير صالح" && jsonFromUtil.success === false,
    { json: jsonFromUtil }
  );

  // Test duck-typed CastError in utils/api-error
  const duckCastError = { name: "CastError", message: "Cast to ObjectId failed" };
  const respDuckUtil = handleApiErrorUtil(duckCastError);
  const statusDuckUtil = respDuckUtil.status;
  const jsonDuckUtil = await respDuckUtil.json();
  recordTest(
    "Mongoose CastError Handling",
    "handleApiError (utils/api-error) handles duck-typed CastError { name: 'CastError' }",
    statusDuckUtil === 400 && jsonDuckUtil.error === "معرف غير صالح"
  );

  // Test next/lib/api-response.ts
  const respFromResp = handleApiErrorResp(realCastError);
  const statusFromResp = respFromResp.status;
  const jsonFromResp = await respFromResp.json();

  recordTest(
    "Mongoose CastError Handling",
    "handleApiError (api-response) returns HTTP 400 for mongoose.Error.CastError",
    statusFromResp === 400,
    { status: statusFromResp }
  );

  recordTest(
    "Mongoose CastError Handling",
    "handleApiError (api-response) returns message 'معرف غير صالح'",
    jsonFromResp.error === "معرف غير صالح" && jsonFromResp.success === false,
    { json: jsonFromResp }
  );

  // Verify non-CastErrors still return HTTP 500
  const genericError = new Error("Database query failed");
  const respGeneric = handleApiErrorUtil(genericError);
  recordTest(
    "Mongoose CastError Handling",
    "handleApiError returns HTTP 500 for generic unhandled errors",
    respGeneric.status === 500
  );

  // ==========================================================================
  // SUITE 5: Read-Only View Leakage & 7 Inspection Dialogs
  // ==========================================================================
  console.log("\n>>> SUITE 5: Read-Only View Leakage & 7 Inspection Dialogs");

  // 5.1 OfficerLeaveHistoryModal.tsx
  const leaveHistoryPath = path.resolve(__dirname, "../components/officers/OfficerLeaveHistoryModal.tsx");
  const leaveHistoryCode = fs.readFileSync(leaveHistoryPath, "utf-8");

  const hasReadOnlyProp = /<ModalActions[\s\S]*?readOnly=\{true\}/.test(leaveHistoryCode) ||
                          /<ModalActions[\s\S]*?hideSubmit=\{true\}/.test(leaveHistoryCode);
  recordTest(
    "Read-Only View Leakage",
    "OfficerLeaveHistoryModal.tsx passes readOnly={true} or hideSubmit={true}",
    hasReadOnlyProp
  );

  const hasCloseTextInHistory = /cancelText="إغلاق"/.test(leaveHistoryCode);
  recordTest(
    "Read-Only View Leakage",
    "OfficerLeaveHistoryModal.tsx passes cancelText='إغلاق'",
    hasCloseTextInHistory
  );

  // 5.2 Verify 7 inspection dialogs use "إغلاق"
  const inspectionDialogs = [
    {
      file: "components/medical/ViewVisitModal.tsx",
      name: "ViewVisitModal",
      matcher: (content: string) => content.includes('cancelText="إغلاق"') || content.includes("إغلاق"),
    },
    {
      file: "components/medical/MedicineDetailModal.tsx",
      name: "MedicineDetailModal",
      matcher: (content: string) => content.includes("إغلاق"),
    },
    {
      file: "components/arkan-harb/MissionDetailModal.tsx",
      name: "MissionDetailModal",
      matcher: (content: string) => content.includes("إغلاق"),
    },
    {
      file: "components/arkan-harb/PositionViewModal.tsx",
      name: "PositionViewModal",
      matcher: (content: string) => content.includes("إغلاق"),
    },
    {
      file: "components/arkan-harb/PositionsHistoryArchiveModal.tsx",
      name: "PositionsHistoryArchiveModal",
      matcher: (content: string) => content.includes('cancelText="إغلاق"') || content.includes("إغلاق"),
    },
    {
      file: "components/arkan-harb/MissionPrintModal.tsx",
      name: "MissionPrintModal",
      matcher: (content: string) => content.includes('cancelText="إغلاق"') || content.includes("إغلاق"),
    },
    {
      file: "app/(dashboard)/theme-playground/page.tsx",
      name: "theme-playground demo modal",
      matcher: (content: string) => content.includes("إغلاق"),
    },
  ];

  for (const dialog of inspectionDialogs) {
    const dialogPath = path.resolve(__dirname, "..", dialog.file);
    const content = fs.readFileSync(dialogPath, "utf-8");
    const passes = dialog.matcher(content);

    // In MedicineDetailModal, showDestroyConfirm is a separate confirmation modal where "إلغاء" is appropriate for aborting destructive destroy.
    // The main inspection dialog must use "إغلاق".
    let hasMisleadingCancel = false;
    if (dialog.file === "components/medical/MedicineDetailModal.tsx") {
      const mainFooter = content.match(/footer=\{[\s\S]*?<\/ModalActions>\s*\}/)?.[0] ?? "";
      hasMisleadingCancel = mainFooter.includes('cancelText="إلغاء"') || mainFooter.includes(">إلغاء<");
    } else {
      hasMisleadingCancel = content.includes('cancelText="إلغاء"');
    }

    recordTest(
      "Read-Only Inspection Dialogs",
      `${dialog.name} (${dialog.file}) uses 'إغلاق' and does not mislabel close as 'إلغاء'`,
      passes && !hasMisleadingCancel,
      { file: dialog.file, passes, hasMisleadingCancel }
    );
  }

  // ==========================================================================
  // SUITE SUMMARY
  // ==========================================================================
  console.log("\n===============================================================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("===============================================================================");

  if (failed > 0) {
    console.error(`\n❌ VERIFICATION FAILED: ${failed} assertion(s) did not pass.`);
    process.exit(1);
  } else {
    console.log("\n✅ ALL ADVERSARIAL STRESS TESTS PASSED SUCCESSFULLY.");
    process.exit(0);
  }
}

runAdversarialVerification().catch((err) => {
  console.error("FATAL ERROR during test execution:", err);
  process.exit(1);
});
