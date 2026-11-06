/**
 * Milestone 4 Verification Suite: Edge Cases, Defensive Error Handling & Data Integrity (R3)
 *
 * Verifies:
 * 1. CRIT-02 / R3-01: Position restructure vacates primaryOfficerId and substituteOfficerIds
 * 2. HIGH-05 / R3-03: Daily rollcall date normalization to UTC boundaries & audit targetId
 * 3. HIGH-06 / R3-04: Negative date interval handling in calculateDiffDays & Zod endDate >= startDate
 * 4. HIGH-08 / R3-06: Null populate reference safeguards in Fax and Education detail pages
 * 5. MED-09 / R3-07: Preservation of all 6 fields in POST /api/officers
 * 6. MED-10 / R3-08: auditQuerySchema includes arkan_harb and app_ideas module enums
 * 7. CastError: handleApiError transforms CastError into HTTP 400 "معرف غير صالح"
 */

import { calculateDiffDays, calculateTotalDays } from "@/lib/utils/date";
import { createLeaveSchema, patchLeaveSchema } from "@/lib/validations/officers";
import { auditQuerySchema } from "@/lib/validations/dashboard-notifications";
import { auditQuerySchema as auditQueryDirect } from "@/lib/validations/audit";
import { getUtcDayRange } from "@/lib/arkan-harb/rollcall-engine";
import { handleApiError } from "@/lib/utils/api-error";
import mongoose from "mongoose";
import * as fs from "fs";
import * as path from "path";

async function runMilestone4Verification() {
  console.log("=================================================");
  console.log("  Milestone 4 Integrity Verification Suite (R3)  ");
  console.log("=================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      throw new Error(`Assertion failed: ${testName}`);
    }
  }

  // ----------------------------------------------------
  // Test 1: CRIT-02 / R3-01 Position Restructure
  // ----------------------------------------------------
  console.log("--- Test 1: Position Restructure Mongoose Fields ---");
  const restructureRoutePath = path.resolve(__dirname, "../app/api/arkan-harb/positions/restructure/route.ts");
  const restructureContent = fs.readFileSync(restructureRoutePath, "utf-8");
  assert(
    !restructureContent.includes("officerId: null"),
    "Phantom field 'officerId: null' must be removed from restructure route"
  );
  assert(
    restructureContent.includes("primaryOfficerId: null") &&
    restructureContent.includes("substituteOfficerIds: []"),
    "Position restructure must clear primaryOfficerId and substituteOfficerIds"
  );

  // ----------------------------------------------------
  // Test 2: HIGH-05 / R3-03 Rollcall UTC Normalization & Audit targetId
  // ----------------------------------------------------
  console.log("\n--- Test 2: Daily Rollcall UTC Normalization & Audit Logging ---");
  const utcRange = getUtcDayRange("2026-05-12");
  assert(
    utcRange.startOfDay.toISOString() === "2026-05-12T00:00:00.000Z",
    "getUtcDayRange startOfDay must be UTC 00:00:00.000Z"
  );
  assert(
    utcRange.endOfDay.toISOString() === "2026-05-12T23:59:59.999Z",
    "getUtcDayRange endOfDay must be UTC 23:59:59.999Z"
  );
  assert(
    utcRange.nextDay.toISOString() === "2026-05-13T00:00:00.000Z",
    "getUtcDayRange nextDay must be next UTC day 00:00:00.000Z"
  );

  const rollcallRoutePath = path.resolve(__dirname, "../app/api/officers/rollcall/route.ts");
  const rollcallRouteContent = fs.readFileSync(rollcallRoutePath, "utf-8");
  assert(
    !rollcallRouteContent.includes("queryDate.setHours(0, 0, 0, 0)"),
    "Rollcall route must not mix local setHours(0,0,0,0) with UTC strings"
  );
  assert(
    rollcallRouteContent.includes("getUtcDayRange"),
    "Rollcall route must use getUtcDayRange for UTC normalization"
  );
  assert(
    rollcallRouteContent.includes("targetId: rollcallDoc?._id ? rollcallDoc._id.toString() : undefined"),
    "Rollcall route must pass valid targetId to logAuditEvent"
  );

  // ----------------------------------------------------
  // Test 3: HIGH-06 / R3-04 Negative Date Interval & Zod Refinement
  // ----------------------------------------------------
  console.log("\n--- Test 3: Negative Date Interval & Schema Refinement ---");
  assert(
    calculateDiffDays("2026-06-01", "2026-06-05") === 5,
    "calculateDiffDays returns 5 for 5-day interval"
  );
  assert(
    calculateDiffDays("2026-06-01", "2026-06-01") === 1,
    "calculateDiffDays returns 1 for same-day interval"
  );
  assert(
    calculateDiffDays("2026-06-15", "2026-06-01") === 0,
    "calculateDiffDays does NOT mask negative differences (returns 0)"
  );
  assert(
    calculateTotalDays("2026-06-15", "2026-06-01") === 0,
    "calculateTotalDays returns 0 for inverted dates"
  );

  const validLeave = createLeaveSchema.safeParse({
    officerId: "60d5ecb8b392d7001f8e8e8e",
    category: "leave",
    type: "annual",
    startDate: "2026-06-01",
    endDate: "2026-06-05",
  });
  assert(validLeave.success, "createLeaveSchema accepts valid date range");

  const invertedLeave = createLeaveSchema.safeParse({
    officerId: "60d5ecb8b392d7001f8e8e8e",
    category: "leave",
    type: "annual",
    startDate: "2026-06-15",
    endDate: "2026-06-01",
  });
  assert(!invertedLeave.success, "createLeaveSchema rejects inverted dates (endDate < startDate)");

  const invertedPatch = patchLeaveSchema.safeParse({
    startDate: "2026-06-15",
    endDate: "2026-06-01",
  });
  assert(!invertedPatch.success, "patchLeaveSchema rejects inverted dates (endDate < startDate)");

  const validPatch = patchLeaveSchema.safeParse({
    startDate: "2026-06-01",
    endDate: "2026-06-15",
  });
  assert(validPatch.success, "patchLeaveSchema accepts valid date range");

  const reasonOnlyPatch = patchLeaveSchema.safeParse({
    reason: "تعديل لظروف طارئة",
  });
  assert(reasonOnlyPatch.success, "patchLeaveSchema accepts update without dates");

  // ----------------------------------------------------
  // Test 4: HIGH-08 / R3-06 Null Populate Reference Safeguards
  // ----------------------------------------------------
  console.log("\n--- Test 4: Null Populate Reference Safeguards in Pages ---");
  const faxPagePath = path.resolve(__dirname, "../app/(dashboard)/fax/[id]/page.tsx");
  const faxPageContent = fs.readFileSync(faxPagePath, "utf-8");
  assert(
    faxPageContent.includes("populatedUploadedBy?.fullName ?? \"غير معروف\""),
    "fax/[id]/page.tsx safely accesses uploadedBy with optional chaining and fallback"
  );

  const educationPagePath = path.resolve(__dirname, "../app/(dashboard)/education/[id]/page.tsx");
  const educationPageContent = fs.readFileSync(educationPagePath, "utf-8");
  assert(
    educationPageContent.includes("filter((p): p is Record<string, unknown> => p != null"),
    "education/[id]/page.tsx filters null/dangling course participant populate references"
  );

  // ----------------------------------------------------
  // Test 5: MED-09 / R3-07 Officer Creation Field Preservation
  // ----------------------------------------------------
  console.log("\n--- Test 5: Field Preservation on Officer Creation ---");
  const officerRoutePath = path.resolve(__dirname, "../app/api/officers/route.ts");
  const officerRouteContent = fs.readFileSync(officerRoutePath, "utf-8");
  const requiredOfficerFields = [
    "graduationDate",
    "bloodType",
    "religion",
    "maritalStatus",
    "faculty",
    "file121IssueDate",
  ];
  for (const field of requiredOfficerFields) {
    assert(
      officerRouteContent.includes(`${field}: data.${field}`),
      `api/officers/route.ts must preserve field '${field}' on creation`
    );
  }

  // ----------------------------------------------------
  // Test 6: MED-10 / R3-08 Audit Query Schema Enums
  // ----------------------------------------------------
  console.log("\n--- Test 6: Audit Query Schema Module Enums ---");
  const arkanQuery = auditQuerySchema.safeParse({ module: "arkan_harb" });
  assert(arkanQuery.success, "auditQuerySchema accepts 'arkan_harb' module enum");

  const appIdeasQuery = auditQuerySchema.safeParse({ module: "app_ideas" });
  assert(appIdeasQuery.success, "auditQuerySchema accepts 'app_ideas' module enum");

  const directArkanQuery = auditQueryDirect.safeParse({ module: "arkan_harb" });
  assert(directArkanQuery.success, "@/lib/validations/audit re-exports working schema");

  // ----------------------------------------------------
  // Test 7: CastError Handler
  // ----------------------------------------------------
  console.log("\n--- Test 7: Mongoose CastError Handling ---");
  const castError = new mongoose.Error.CastError("ObjectId", "invalid_hex", "_id");
  const errorResponse = handleApiError(castError);
  assert(errorResponse.status === 400, "handleApiError returns HTTP 400 on Mongoose CastError");
  const responseBody = await errorResponse.json();
  assert(
    responseBody.error === "معرف غير صالح",
    "handleApiError returns Arabic 'معرف غير صالح' on CastError"
  );

  console.log("\n=================================================");
  console.log(`  Summary: All ${passed}/${total} assertions PASSED!  `);
  console.log("=================================================");
}

runMilestone4Verification().catch((err) => {
  console.error("Verification suite failed:", err);
  process.exit(1);
});
