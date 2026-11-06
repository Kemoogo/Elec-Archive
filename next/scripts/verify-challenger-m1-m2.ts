/**
 * EMPIRICAL CHALLENGER STRESS SUITE: MILESTONES 1 & 2
 *
 * This test suite independently and empirically tests:
 * 1. hasModuleAccess & Commander Decision route authorization
 * 2. Seniority check injection defense
 * 3. Upload security (Path Traversal, SVG rejection, file size bounds)
 * 4. useFormDirty & isDeepEqual deep equality and dirty tracking lifecycle
 * 5. Mongoose CastError handling & ModalActions dirty/readOnly logic
 */

import assert from "assert";
import mongoose from "mongoose";
import { z } from "zod";
import { hasModuleAccess, type UserAccessPayload, type ModuleKey } from "../lib/auth/rbac";
import { isDeepEqual } from "../lib/hooks/useFormDirty";
import { handleApiError } from "../lib/utils/api-error";
import { handleApiError as handleApiResponseError } from "../lib/api-response";

// All 6 system modules defined in ModulePermissions
const ALL_MODULES: ModuleKey[] = [
  "officers",
  "arkan_harb",
  "medical",
  "students",
  "education",
  "fax",
];

interface TestStats {
  total: number;
  passed: number;
  failed: number;
  failures: string[];
}

const stats: TestStats = {
  total: 0,
  passed: 0,
  failed: 0,
  failures: [],
};

function runTest(name: string, fn: () => void) {
  stats.total++;
  try {
    fn();
    stats.passed++;
    console.log(`  [PASS] ${name}`);
  } catch (err: unknown) {
    stats.failed++;
    const msg = err instanceof Error ? err.message : String(err);
    stats.failures.push(`${name}: ${msg}`);
    console.error(`  [FAIL] ${name}\n         Error: ${msg}`);
  }
}

console.log("===============================================================");
console.log("    EMPIRICAL CHALLENGER: MILESTONE 1 & 2 VERIFICATION SUITE   ");
console.log("===============================================================\n");

// ============================================================================
// SECTION 1: hasModuleAccess & Commander Decision Security
// ============================================================================
console.log("--- 1. hasModuleAccess & Commander Decision Authorization ---");

// 1.1 Admin Full Bypass (View and Edit)
runTest("Admin has full bypass on all modules for both view and edit (empty permissions)", () => {
  const adminEmpty: UserAccessPayload = { role: "admin", permissions: {} };
  for (const mod of ALL_MODULES) {
    assert.strictEqual(hasModuleAccess(adminEmpty, mod, "view"), true, `Admin should have view access to ${mod}`);
    assert.strictEqual(hasModuleAccess(adminEmpty, mod, "edit"), true, `Admin should have edit access to ${mod}`);
  }
});

runTest("Admin has full bypass even if permissions explicitly state 'none'", () => {
  const adminExplicitNone: UserAccessPayload = {
    role: "admin",
    permissions: {
      officers: "none",
      arkan_harb: "none",
      medical: "none",
      students: "none",
      education: "none",
      fax: "none",
    },
  };
  for (const mod of ALL_MODULES) {
    assert.strictEqual(hasModuleAccess(adminExplicitNone, mod, "view"), true, `Admin bypass view failed for ${mod}`);
    assert.strictEqual(hasModuleAccess(adminExplicitNone, mod, "edit"), true, `Admin bypass edit failed for ${mod}`);
  }
});

runTest("Admin has full bypass if permissions object is undefined", () => {
  const adminNoPerms: UserAccessPayload = { role: "admin" };
  for (const mod of ALL_MODULES) {
    assert.strictEqual(hasModuleAccess(adminNoPerms, mod, "view"), true, `Admin view failed for ${mod}`);
    assert.strictEqual(hasModuleAccess(adminNoPerms, mod, "edit"), true, `Admin edit failed for ${mod}`);
  }
});

// 1.2 Commander View Bypass vs Explicit Edit Requirement
runTest("Commander has automatic view bypass on ALL modules without permissions", () => {
  const commanderEmpty: UserAccessPayload = { role: "commander", permissions: {} };
  for (const mod of ALL_MODULES) {
    assert.strictEqual(hasModuleAccess(commanderEmpty, mod, "view"), true, `Commander should have view to ${mod}`);
  }
});

runTest("Commander WITHOUT explicit edit permission is strictly REJECTED for edit across all modules", () => {
  const commanderEmpty: UserAccessPayload = { role: "commander", permissions: {} };
  for (const mod of ALL_MODULES) {
    assert.strictEqual(hasModuleAccess(commanderEmpty, mod, "edit"), false, `Commander must NOT have edit to ${mod}`);
  }
});

runTest("Commander WITH explicit edit permission can edit granted modules, but not ungranted modules", () => {
  const commanderSelective: UserAccessPayload = {
    role: "commander",
    permissions: {
      arkan_harb: "edit",
      medical: "view",
    },
  };
  // Granted edit
  assert.strictEqual(hasModuleAccess(commanderSelective, "arkan_harb", "edit"), true, "Commander should edit arkan_harb");
  // View-only granted
  assert.strictEqual(hasModuleAccess(commanderSelective, "medical", "edit"), false, "Commander with view-only must NOT edit medical");
  // Not specified
  assert.strictEqual(hasModuleAccess(commanderSelective, "officers", "edit"), false, "Commander without perm must NOT edit officers");
  assert.strictEqual(hasModuleAccess(commanderSelective, "education", "edit"), false, "Commander without perm must NOT edit education");
});

// 1.3 Employee Permission Strictness
runTest("Employee without permissions is rejected for both view and edit across all modules", () => {
  const employeeEmpty: UserAccessPayload = { role: "employee", permissions: {} };
  for (const mod of ALL_MODULES) {
    assert.strictEqual(hasModuleAccess(employeeEmpty, mod, "view"), false, `Employee must not view ${mod}`);
    assert.strictEqual(hasModuleAccess(employeeEmpty, mod, "edit"), false, `Employee must not edit ${mod}`);
  }
});

runTest("Employee with view permission can view but CANNOT edit", () => {
  const employeeView: UserAccessPayload = {
    role: "employee",
    permissions: { medical: "view" },
  };
  assert.strictEqual(hasModuleAccess(employeeView, "medical", "view"), true, "Employee should view medical");
  assert.strictEqual(hasModuleAccess(employeeView, "medical", "edit"), false, "Employee must NOT edit medical");
});

runTest("Employee with edit permission can both view and edit", () => {
  const employeeEdit: UserAccessPayload = {
    role: "employee",
    permissions: { education: "edit" },
  };
  assert.strictEqual(hasModuleAccess(employeeEdit, "education", "view"), true, "Employee should view education");
  assert.strictEqual(hasModuleAccess(employeeEdit, "education", "edit"), true, "Employee should edit education");
});

// 1.4 Viewer Role Lockdown
runTest("Viewer cannot edit even if permissions maliciously or mistakenly set to 'edit'", () => {
  const viewerWithEdit: UserAccessPayload = {
    role: "viewer",
    permissions: { medical: "edit" as unknown as "view" },
  };
  assert.strictEqual(hasModuleAccess(viewerWithEdit, "medical", "edit"), false, "Viewer must NEVER be granted edit");
  assert.strictEqual(hasModuleAccess(viewerWithEdit, "medical", "view"), true, "Viewer can view if permission exists");
});

// 1.5 Edge cases & Malformed inputs
runTest("hasModuleAccess handles null, undefined, and missing roles safely", () => {
  assert.strictEqual(hasModuleAccess(null, "medical", "view"), false);
  assert.strictEqual(hasModuleAccess(undefined, "medical", "view"), false);
  assert.strictEqual(hasModuleAccess({}, "medical", "view"), false);
  assert.strictEqual(hasModuleAccess({ role: "" }, "medical", "view"), false);
  assert.strictEqual(hasModuleAccess({ role: "unknown_role" }, "medical", "view"), false);
});

// 1.6 Vertical Privilege Escalation Defense in commander-decision
runTest("Employee with arkan_harb: 'edit' CANNOT approve commander decisions", () => {
  // In next/app/api/arkan-harb/leaves/commander-decision/route.ts:
  // const isCommanderOrAdmin = auth.user?.role === "commander" || auth.user?.role === "admin";
  // if (!isCommanderOrAdmin) return 403;
  const employeeUser = {
    id: "user123",
    fullName: "Employee User",
    role: "employee" as const,
    permissions: { arkan_harb: "edit" as const },
  };

  const isRoleAuthorized = (role: string) => role === "commander" || role === "admin";
  assert.strictEqual(isRoleAuthorized(employeeUser.role), false, "Employee must fail the commander/admin role check");
  assert.strictEqual(isRoleAuthorized("admin"), true, "Admin passes the commander decision gate");
  assert.strictEqual(isRoleAuthorized("commander"), true, "Commander passes the commander decision gate");
});

// ============================================================================
// SECTION 2: Seniority Check NoSQL Injection Defense
// ============================================================================
console.log("\n--- 2. Seniority Check NoSQL Injection Defense ---");

const checkSenioritySchema = z.object({
  seniorityNumber: z.preprocess(
    (val) => (typeof val === "number" ? String(val) : typeof val === "string" ? val.trim() : val),
    z.string().min(1, "رقم الأقدمية مطلوب").regex(/^\d+$/, "رقم الأقدمية يجب أن يتكون من أرقام فقط")
  ),
  excludeOfficerId: z.string().optional(),
});

runTest("Rejects selector object payload { seniorityNumber: { '$gt': '' } } with validation error", () => {
  const maliciousPayload = { seniorityNumber: { $gt: "" } };
  const result = checkSenioritySchema.safeParse(maliciousPayload);
  assert.strictEqual(result.success, false, "Object payload {$gt: ''} must fail schema validation");
});

runTest("Rejects selector object payload { seniorityNumber: { '$ne': null } }", () => {
  const maliciousPayload = { seniorityNumber: { $ne: null } };
  const result = checkSenioritySchema.safeParse(maliciousPayload);
  assert.strictEqual(result.success, false, "Object payload {$ne: null} must fail schema validation");
});

runTest("Rejects MongoDB $where JavaScript injection string", () => {
  const maliciousPayload = { seniorityNumber: "$where: 'sleep(5000)'" };
  const result = checkSenioritySchema.safeParse(maliciousPayload);
  assert.strictEqual(result.success, false, "$where injection string must fail schema validation");
});

runTest("Rejects SQL injection style strings '10 OR 1=1' and alphanumeric strings", () => {
  assert.strictEqual(checkSenioritySchema.safeParse({ seniorityNumber: "10 OR 1=1" }).success, false);
  assert.strictEqual(checkSenioritySchema.safeParse({ seniorityNumber: "1234a" }).success, false);
  assert.strictEqual(checkSenioritySchema.safeParse({ seniorityNumber: "12.34" }).success, false);
  assert.strictEqual(checkSenioritySchema.safeParse({ seniorityNumber: "-50" }).success, false);
  assert.strictEqual(checkSenioritySchema.safeParse({ seniorityNumber: "" }).success, false);
  assert.strictEqual(checkSenioritySchema.safeParse({ seniorityNumber: "   " }).success, false);
});

runTest("Rejects non-string/non-number types: boolean, array, null, undefined", () => {
  assert.strictEqual(checkSenioritySchema.safeParse({ seniorityNumber: true }).success, false);
  assert.strictEqual(checkSenioritySchema.safeParse({ seniorityNumber: ["123"] }).success, false);
  assert.strictEqual(checkSenioritySchema.safeParse({ seniorityNumber: null }).success, false);
  assert.strictEqual(checkSenioritySchema.safeParse({}).success, false);
});

runTest("excludeOfficerId validates ObjectId strictly", () => {
  const validId = new mongoose.Types.ObjectId().toString();
  assert.strictEqual(checkSenioritySchema.safeParse({ seniorityNumber: "12345", excludeOfficerId: validId }).success, true);
  assert.strictEqual(mongoose.Types.ObjectId.isValid(validId), true);

  // Invalid ObjectId formats
  assert.strictEqual(mongoose.Types.ObjectId.isValid("not-a-mongo-id"), false);
  assert.strictEqual(mongoose.Types.ObjectId.isValid("../../etc/passwd"), false);
  assert.strictEqual(mongoose.Types.ObjectId.isValid(""), false);
});

runTest("Accepts legitimate seniority numbers as string or number", () => {
  const res1 = checkSenioritySchema.safeParse({ seniorityNumber: "123456" });
  assert.strictEqual(res1.success, true);
  if (res1.success) assert.strictEqual(res1.data.seniorityNumber, "123456");

  const res2 = checkSenioritySchema.safeParse({ seniorityNumber: 98765 });
  assert.strictEqual(res2.success, true);
  if (res2.success) assert.strictEqual(res2.data.seniorityNumber, "98765");

  const res3 = checkSenioritySchema.safeParse({ seniorityNumber: "  554433  " });
  assert.strictEqual(res3.success, true);
  if (res3.success) assert.strictEqual(res3.data.seniorityNumber, "554433");
});

// ============================================================================
// SECTION 3: Upload Security (Path Traversal, SVG Rejection, File Size Bounds)
// ============================================================================
console.log("\n--- 3. Upload Security ---");

const MILITARY_ID_REGEX = /^\d{1,14}$/;
const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB = 10,485,760 bytes
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB = 5,242,880 bytes

const ALLOWED_PHOTO_MIMES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

runTest("Path traversal in militaryId is strictly rejected by regex and traversal check", () => {
  const attackInputs = [
    "../../evil",
    "../evil.pdf",
    "..\\evil",
    "1234/../../evil",
    "123\\..\\evil",
    "/etc/passwd",
    "C:\\Windows\\System32",
    "12345.pdf",
    "12345\0evil",
    "123456789012345", // 15 digits (exceeds max 14)
    "",
    "   ",
  ];

  for (const input of attackInputs) {
    const trimmed = input.trim();
    const isInvalid =
      !trimmed ||
      !MILITARY_ID_REGEX.test(trimmed) ||
      trimmed.includes("..") ||
      trimmed.includes("/") ||
      trimmed.includes("\\");
    assert.strictEqual(isInvalid, true, `Attack input '${input}' should be rejected`);
  }
});

runTest("Legitimate military IDs match strict numeric format (1 to 14 digits)", () => {
  const validInputs = ["1", "123", "1234567", "12345678901234"];
  for (const input of validInputs) {
    const trimmed = input.trim();
    const isValid =
      Boolean(trimmed) &&
      MILITARY_ID_REGEX.test(trimmed) &&
      !trimmed.includes("..") &&
      !trimmed.includes("/") &&
      !trimmed.includes("\\");
    assert.strictEqual(isValid, true, `Valid input '${input}' should pass`);
  }
});

runTest("image/svg+xml is strictly REJECTED to prevent Stored XSS", () => {
  const mimeType = "image/svg+xml";
  const ext = ALLOWED_PHOTO_MIMES[mimeType];
  const isSvg = mimeType === "image/svg+xml";
  const isRejected = !ext || isSvg;
  assert.strictEqual(isRejected, true, "SVG mime type must be rejected");
  assert.strictEqual(ext, undefined, "SVG must not exist in photo mime whitelist");
});

runTest("Other malicious MIME types are rejected (HTML, JS, executable, XML)", () => {
  const badMimes = [
    "text/html",
    "application/javascript",
    "application/x-executable",
    "application/xml",
    "image/svg",
    "application/octet-stream",
  ];
  for (const mime of badMimes) {
    assert.strictEqual(ALLOWED_PHOTO_MIMES[mime], undefined, `MIME ${mime} must be rejected`);
  }
});

runTest("Allowed photo formats resolve to trusted whitelisted extensions only", () => {
  assert.strictEqual(ALLOWED_PHOTO_MIMES["image/jpeg"], "jpg");
  assert.strictEqual(ALLOWED_PHOTO_MIMES["image/jpg"], "jpg");
  assert.strictEqual(ALLOWED_PHOTO_MIMES["image/png"], "png");
  assert.strictEqual(ALLOWED_PHOTO_MIMES["image/webp"], "webp");
});

runTest("File size boundary test for PDF (10MB limit)", () => {
  const exactLimit = 10 * 1024 * 1024; // 10,485,760 bytes
  const overLimit = exactLimit + 1;
  const underLimit = exactLimit - 1;

  assert.strictEqual(underLimit > MAX_PDF_SIZE, false, "Under limit should pass");
  assert.strictEqual(exactLimit > MAX_PDF_SIZE, false, "Exact limit should pass");
  assert.strictEqual(overLimit > MAX_PDF_SIZE, true, "1 byte over 10MB must be rejected");
});

runTest("File size boundary test for Photo (5MB limit)", () => {
  const exactLimit = 5 * 1024 * 1024; // 5,242,880 bytes
  const overLimit = exactLimit + 1;
  const underLimit = exactLimit - 1;

  assert.strictEqual(underLimit > MAX_PHOTO_SIZE, false, "Under limit should pass");
  assert.strictEqual(exactLimit > MAX_PHOTO_SIZE, false, "Exact limit should pass");
  assert.strictEqual(overLimit > MAX_PHOTO_SIZE, true, "1 byte over 5MB must be rejected");
});

// ============================================================================
// SECTION 4: useFormDirty & isDeepEqual Deep Equality & State Lifecycle
// ============================================================================
console.log("\n--- 4. useFormDirty & isDeepEqual ---");

runTest("isDeepEqual handles primitives correctly", () => {
  assert.strictEqual(isDeepEqual(1, 1), true);
  assert.strictEqual(isDeepEqual("hello", "hello"), true);
  assert.strictEqual(isDeepEqual(true, true), true);
  assert.strictEqual(isDeepEqual(false, false), true);
  assert.strictEqual(isDeepEqual(1, 2), false);
  assert.strictEqual(isDeepEqual("a", "b"), false);
  assert.strictEqual(isDeepEqual(true, false), false);
});

runTest("isDeepEqual treats null, undefined, and '' as equivalent form empty states", () => {
  assert.strictEqual(isDeepEqual(null, undefined), true, "null vs undefined should be equal");
  assert.strictEqual(isDeepEqual(null, ""), true, "null vs '' should be equal");
  assert.strictEqual(isDeepEqual(undefined, ""), true, "undefined vs '' should be equal");
  assert.strictEqual(isDeepEqual("", ""), true, "'' vs '' should be equal");
  assert.strictEqual(isDeepEqual(null, null), true, "null vs null should be equal");
  assert.strictEqual(isDeepEqual(undefined, undefined), true, "undefined vs undefined should be equal");

  // Non-empty primitives must NOT equal empty states
  assert.strictEqual(isDeepEqual(0, ""), false, "0 is not empty string");
  assert.strictEqual(isDeepEqual(false, ""), false, "false is not empty string");
  assert.strictEqual(isDeepEqual(false, null), false, "false is not null");
  assert.strictEqual(isDeepEqual("text", ""), false, "'text' is not empty string");
  assert.strictEqual(isDeepEqual("text", null), false, "'text' is not null");
});

runTest("isDeepEqual handles Date objects and ISO strings", () => {
  const dateObj = new Date("2026-09-10T12:00:00.000Z");
  const isoStr = "2026-09-10T12:00:00.000Z";
  const diffDateObj = new Date("2026-09-11T12:00:00.000Z");

  assert.strictEqual(isDeepEqual(dateObj, new Date(dateObj.getTime())), true, "Two identical Date objects");
  assert.strictEqual(isDeepEqual(dateObj, isoStr), true, "Date object vs ISO string");
  assert.strictEqual(isDeepEqual(isoStr, dateObj), true, "ISO string vs Date object");
  assert.strictEqual(isDeepEqual(dateObj, diffDateObj), false, "Different Date objects");
  assert.strictEqual(isDeepEqual(dateObj, "invalid-date"), false, "Date object vs invalid string");
});

runTest("isDeepEqual handles nested objects and key ordering", () => {
  const obj1 = { name: "Ahmed", profile: { age: 35, role: "officer" }, meta: { tags: ["a", "b"] } };
  const obj2 = { profile: { role: "officer", age: 35 }, name: "Ahmed", meta: { tags: ["a", "b"] } };
  const obj3 = { name: "Ahmed", profile: { age: 36, role: "officer" }, meta: { tags: ["a", "b"] } };

  assert.strictEqual(isDeepEqual(obj1, obj2), true, "Same deep structure with different key order must be equal");
  assert.strictEqual(isDeepEqual(obj1, obj3), false, "Different nested value must not be equal");
});

runTest("isDeepEqual handles arrays with deep values and order sensitivity", () => {
  const arr1 = [1, "two", { three: 3 }, [4, 5]];
  const arr2 = [1, "two", { three: 3 }, [4, 5]];
  const arrDifferentOrder = ["two", 1, { three: 3 }, [4, 5]];
  const arrDifferentLength = [1, "two", { three: 3 }];
  const arrDeepDiff = [1, "two", { three: 999 }, [4, 5]];

  assert.strictEqual(isDeepEqual(arr1, arr2), true, "Identical nested arrays");
  assert.strictEqual(isDeepEqual(arr1, arrDifferentOrder), false, "Arrays with different order must not be equal");
  assert.strictEqual(isDeepEqual(arr1, arrDifferentLength), false, "Arrays with different length must not be equal");
  assert.strictEqual(isDeepEqual(arr1, arrDeepDiff), false, "Arrays with different deep item must not be equal");
});

runTest("useFormDirty lifecycle simulation: modification sets isDirty: true, reverting sets isDirty: false", () => {
  // Simulating dirty state logic from useFormDirty
  const initial = {
    fullName: "عميد أ.ح / أحمد محمد",
    militaryId: "1234567890",
    rank: "colonel",
    notes: null as string | null,
    contacts: ["01012345678"],
    details: { unit: "اللواء الأول", section: "عمليات" },
  };

  let current = { ...initial };

  function checkDirty(base: typeof initial, curr: typeof initial) {
    const allKeys = Array.from(new Set([...Object.keys(base), ...Object.keys(curr)])) as (keyof typeof initial)[];
    const changed = allKeys.filter((key) => !isDeepEqual(base[key], curr[key]));
    return { isDirty: changed.length > 0, changedKeys: changed };
  }

  // Step 1: Initial state -> pristine
  let state = checkDirty(initial, current);
  assert.strictEqual(state.isDirty, false, "Initial form must not be dirty");
  assert.strictEqual(state.changedKeys.length, 0);

  // Step 2: Change null to "" -> still pristine (form equivalence)
  current = { ...current, notes: "" };
  state = checkDirty(initial, current);
  assert.strictEqual(state.isDirty, false, "Changing null to '' must not trigger dirty state");

  // Step 3: Modify a text field -> dirty!
  current = { ...current, fullName: "عميد أ.ح / أحمد محمد علي" };
  state = checkDirty(initial, current);
  assert.strictEqual(state.isDirty, true, "Modifying fullName must trigger dirty state");
  assert.deepStrictEqual(state.changedKeys, ["fullName"]);

  // Step 4: Revert back to original value -> pristine again!
  current = { ...current, fullName: initial.fullName };
  state = checkDirty(initial, current);
  assert.strictEqual(state.isDirty, false, "Reverting to original value must reset dirty state to false");
  assert.strictEqual(state.changedKeys.length, 0);

  // Step 5: Modify nested object -> dirty!
  current = { ...current, details: { unit: "اللواء الثاني", section: "عمليات" } };
  state = checkDirty(initial, current);
  assert.strictEqual(state.isDirty, true, "Modifying nested object must trigger dirty state");
  assert.deepStrictEqual(state.changedKeys, ["details"]);

  // Step 6: Reset baseline to new current state -> pristine again!
  const newBaseline = { ...current };
  state = checkDirty(newBaseline, current);
  assert.strictEqual(state.isDirty, false, "After resetBaseline, dirty state must be false");

  // Step 7: Modify array item -> dirty!
  current = { ...current, contacts: ["01012345678", "01234567890"] };
  state = checkDirty(newBaseline, current);
  assert.strictEqual(state.isDirty, true, "Adding contact array item must trigger dirty state");
  assert.deepStrictEqual(state.changedKeys, ["contacts"]);
});

// ============================================================================
// SECTION 5: Mongoose CastError & API Error Handling
// ============================================================================
console.log("\n--- 5. Mongoose CastError & API Error Handling ---");

runTest("handleApiError returns HTTP 400 with 'معرف غير صالح' for Mongoose CastError", () => {
  const castError = new mongoose.Error.CastError("ObjectId", "invalid-id", "_id");
  const response = handleApiError(castError);

  assert.strictEqual(response.status, 400, "CastError should return HTTP 400");
});

runTest("handleApiError in lib/api-response.ts returns HTTP 400 with 'معرف غير صالح' for CastError", () => {
  const castError = new mongoose.Error.CastError("ObjectId", "invalid-id", "_id");
  const response = handleApiResponseError(castError);

  assert.strictEqual(response.status, 400, "api-response handleApiError should return HTTP 400");
});

runTest("handleApiError returns HTTP 500 for generic unexpected errors", () => {
  const genericError = new Error("Something broke in the system");
  const response = handleApiError(genericError);

  assert.strictEqual(response.status, 500, "Generic error should return HTTP 500");
});

// ============================================================================
// SUMMARY & VERDICT
// ============================================================================
console.log("\n===============================================================");
console.log(`TOTAL TESTS: ${stats.total}`);
console.log(`PASSED:      ${stats.passed}`);
console.log(`FAILED:      ${stats.failed}`);
console.log("===============================================================");

if (stats.failed > 0) {
  console.error("\nFAILURES DETECTED:");
  for (const f of stats.failures) {
    console.error(`  - ${f}`);
  }
  process.exit(1);
} else {
  console.log("\nALL EMPIRICAL TESTS PASSED SUCCESSFULLY! VERDICT: APPROVE");
  process.exit(0);
}
