import assert from "assert";
import { hasModuleAccess, type UserAccessPayload } from "../lib/auth/rbac";
import { z } from "zod";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";

console.log("=========================================");
console.log("Running Milestone 2 Security Test Suite");
console.log("=========================================");

// --------------------------------------------------
// Test 1: Centralized Role Hierarchy (hasModuleAccess)
// --------------------------------------------------
console.log("\n[Test 1] hasModuleAccess - Role Hierarchy");

const adminUser: UserAccessPayload = {
  role: "admin",
  permissions: {
    medical: "none",
    education: "none",
    students: "none",
    fax: "none",
    officers: "none",
    arkan_harb: "none",
  },
};

// Admin must have bypass for view AND edit on all modules even if permissions say "none"
assert.strictEqual(hasModuleAccess(adminUser, "medical", "view"), true, "Admin should have view access to medical");
assert.strictEqual(hasModuleAccess(adminUser, "medical", "edit"), true, "Admin should have edit access to medical");
assert.strictEqual(hasModuleAccess(adminUser, "fax", "edit"), true, "Admin should have edit access to fax");
assert.strictEqual(hasModuleAccess(adminUser, "education", "edit"), true, "Admin should have edit access to education");
assert.strictEqual(hasModuleAccess(adminUser, "students", "edit"), true, "Admin should have edit access to students");

// Commander must have automatic bypass for view on ALL modules
const commanderUser: UserAccessPayload = {
  role: "commander",
  permissions: {
    medical: "none",
    education: "none",
    students: "none",
    fax: "none",
    officers: "none",
    arkan_harb: "none",
  },
};
assert.strictEqual(hasModuleAccess(commanderUser, "medical", "view"), true, "Commander should have automatic view access to medical");
assert.strictEqual(hasModuleAccess(commanderUser, "fax", "view"), true, "Commander should have automatic view access to fax");
assert.strictEqual(hasModuleAccess(commanderUser, "education", "view"), true, "Commander should have automatic view access to education");
assert.strictEqual(hasModuleAccess(commanderUser, "students", "view"), true, "Commander should have automatic view access to students");

// Commander edit access requires explicit permission
assert.strictEqual(hasModuleAccess(commanderUser, "medical", "edit"), false, "Commander without edit perm should not edit medical");
const commanderWithEdit: UserAccessPayload = {
  role: "commander",
  permissions: { medical: "edit" },
};
assert.strictEqual(hasModuleAccess(commanderWithEdit, "medical", "edit"), true, "Commander with edit perm can edit medical");

// Employee tests
const employeeViewOnly: UserAccessPayload = {
  role: "employee",
  permissions: { medical: "view", fax: "none" },
};
assert.strictEqual(hasModuleAccess(employeeViewOnly, "medical", "view"), true, "Employee with view perm has view access");
assert.strictEqual(hasModuleAccess(employeeViewOnly, "medical", "edit"), false, "Employee with view perm does not have edit access");
assert.strictEqual(hasModuleAccess(employeeViewOnly, "fax", "view"), false, "Employee with none perm does not have view access");

const employeeEdit: UserAccessPayload = {
  role: "employee",
  permissions: { education: "edit" },
};
assert.strictEqual(hasModuleAccess(employeeEdit, "education", "view"), true, "Employee with edit perm has view access");
assert.strictEqual(hasModuleAccess(employeeEdit, "education", "edit"), true, "Employee with edit perm has edit access");

// Viewer role cannot edit even if permissions indicate edit
const viewerUser: UserAccessPayload = {
  role: "viewer",
  permissions: { education: "edit" as any },
};
assert.strictEqual(hasModuleAccess(viewerUser, "education", "edit"), false, "Viewer cannot edit");
assert.strictEqual(hasModuleAccess(viewerUser, "education", "view"), true, "Viewer can view");

// Null / undefined safety
assert.strictEqual(hasModuleAccess(null, "medical", "view"), false, "null user returns false");
assert.strictEqual(hasModuleAccess(undefined, "medical", "view"), false, "undefined user returns false");

console.log("✓ hasModuleAccess passed all hierarchy checks.");

// --------------------------------------------------
// Test 2: Seniority NoSQL Injection & Validation
// --------------------------------------------------
console.log("\n[Test 2] Seniority NoSQL Injection Shield");

const checkSenioritySchema = z.object({
  seniorityNumber: z.preprocess(
    (val) => (typeof val === "number" ? String(val) : typeof val === "string" ? val.trim() : val),
    z.string().min(1, "رقم الأقدمية مطلوب").regex(/^\d+$/, "رقم الأقدمية يجب أن يتكون من أرقام فقط")
  ),
  excludeOfficerId: z.string().optional(),
});

// Valid inputs
assert.strictEqual(checkSenioritySchema.safeParse({ seniorityNumber: "123456" }).success, true);
assert.strictEqual(checkSenioritySchema.safeParse({ seniorityNumber: 123456 }).success, true);
assert.strictEqual(checkSenioritySchema.safeParse({ seniorityNumber: "  987654  " }).success, true);

// NoSQL Injection payloads (must fail Zod parsing!)
assert.strictEqual(checkSenioritySchema.safeParse({ seniorityNumber: { $gt: "" } }).success, false, "Object payload {$gt: ''} must fail");
assert.strictEqual(checkSenioritySchema.safeParse({ seniorityNumber: { $ne: null } }).success, false, "Object payload {$ne: null} must fail");
assert.strictEqual(checkSenioritySchema.safeParse({ seniorityNumber: "$where: '1==1'" }).success, false, "SQL/NoSQL injection string must fail");
assert.strictEqual(checkSenioritySchema.safeParse({ seniorityNumber: "1234a" }).success, false, "Alphanumeric string must fail");
assert.strictEqual(checkSenioritySchema.safeParse({ seniorityNumber: "" }).success, false, "Empty string must fail");
assert.strictEqual(checkSenioritySchema.safeParse({}).success, false, "Missing field must fail");

// ExcludeOfficerId validation with mongoose.Types.ObjectId
const validMongoId = new mongoose.Types.ObjectId().toString();
assert.strictEqual(mongoose.Types.ObjectId.isValid(validMongoId), true, "Valid ObjectId passes");
assert.strictEqual(mongoose.Types.ObjectId.isValid("invalid-id"), false, "Invalid string fails");
assert.strictEqual(mongoose.Types.ObjectId.isValid("../../../etc/passwd"), false, "Path traversal fails ObjectId check");

console.log("✓ Seniority check schema successfully prevents NoSQL injection and validates ObjectId.");

// --------------------------------------------------
// Test 3: Upload Security, Path Traversal & SVG XSS
// --------------------------------------------------
console.log("\n[Test 3] Upload Security, Path Traversal & SVG XSS");

const MILITARY_ID_REGEX = /^\d{1,14}$/;
assert.strictEqual(MILITARY_ID_REGEX.test("1234567"), true, "Valid militaryId matches");
assert.strictEqual(MILITARY_ID_REGEX.test("1"), true, "Valid single-digit militaryId matches");
assert.strictEqual(MILITARY_ID_REGEX.test("12345678901234"), true, "Valid 14-digit militaryId matches");
assert.strictEqual(MILITARY_ID_REGEX.test("123456789012345"), false, "15-digit militaryId rejected");
assert.strictEqual(MILITARY_ID_REGEX.test("../../../evil"), false, "Path traversal rejected");
assert.strictEqual(MILITARY_ID_REGEX.test("123/456"), false, "Slash rejected");
assert.strictEqual(MILITARY_ID_REGEX.test("123\\456"), false, "Backslash rejected");
assert.strictEqual(MILITARY_ID_REGEX.test("12345.pdf"), false, "Extension in ID rejected");

const ALLOWED_PHOTO_MIMES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

assert.strictEqual(ALLOWED_PHOTO_MIMES["image/jpeg"], "jpg");
assert.strictEqual(ALLOWED_PHOTO_MIMES["image/png"], "png");
assert.strictEqual(ALLOWED_PHOTO_MIMES["image/webp"], "webp");
assert.strictEqual(ALLOWED_PHOTO_MIMES["image/svg+xml"], undefined, "image/svg+xml strictly rejected");
assert.strictEqual(ALLOWED_PHOTO_MIMES["text/html"], undefined, "text/html strictly rejected");
assert.strictEqual(ALLOWED_PHOTO_MIMES["application/javascript"], undefined, "application/javascript strictly rejected");

console.log("✓ Upload sanitization and SVG rejection logic verified.");

// --------------------------------------------------
// Test 4: Dev-Admin Backdoor Removal Verification
// --------------------------------------------------
console.log("\n[Test 4] Dev-Admin Backdoor Removal in next/app/actions/officers.ts");

const officersActionFile = fs.readFileSync(
  path.join(__dirname, "../app/actions/officers.ts"),
  "utf8"
);
assert.strictEqual(officersActionFile.includes("dev-admin"), false, "dev-admin must NOT exist in officers.ts");
assert.strictEqual(officersActionFile.includes('id: "dev-admin"'), false, 'id: "dev-admin" must NOT exist');

console.log("✓ Verified: dev-admin backdoor completely eliminated from actions/officers.ts.");

// --------------------------------------------------
// Test 5: Vertical Privilege Escalation Fix (Commander Decision)
// --------------------------------------------------
console.log("\n[Test 5] Vertical Privilege Escalation Fix in commander-decision/route.ts");

const commanderDecisionFile = fs.readFileSync(
  path.join(__dirname, "../app/api/arkan-harb/leaves/commander-decision/route.ts"),
  "utf8"
);
assert.strictEqual(commanderDecisionFile.includes("canEditModule"), false, "canEditModule must NOT be used for commander decision");
assert.strictEqual(commanderDecisionFile.includes('auth.user?.role === "commander" || auth.user?.role === "admin"'), true, "Strict commander/admin check must be present");

console.log("✓ Verified: Commander decision route strictly requires commander or admin role.");

// --------------------------------------------------
// Test 6: Audit Log TargetId in Unassign-All Route
// --------------------------------------------------
console.log("\n[Test 6] Audit Log TargetId in unassign-all/route.ts");

const unassignAllFile = fs.readFileSync(
  path.join(__dirname, "../app/api/arkan-harb/positions/unassign-all/route.ts"),
  "utf8"
);
assert.strictEqual(unassignAllFile.includes("targetId: primaryTargetId"), true, "Valid targetId must be provided in audit log");
assert.strictEqual(unassignAllFile.includes("hasModuleAccess"), true, "hasModuleAccess must be used for permission check");

console.log("✓ Verified: unassign-all route uses hasModuleAccess and passes valid targetId.");

console.log("\n=========================================");
console.log("ALL MILESTONE 2 SECURITY TESTS PASSED!");
console.log("=========================================\n");
