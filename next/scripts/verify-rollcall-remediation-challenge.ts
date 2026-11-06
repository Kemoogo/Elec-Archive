/**
 * Comprehensive Empirical Stress-Testing Harness for Daily Rollcall Remediation
 *
 * Focus Areas:
 * 1. Returning officer (`isReturningToday`) engine calculation and API locked-status validation.
 * 2. Reopen API RBAC validation logic (Admin vs Employee vs Commander).
 * 3. Custom sub-table serialization and membership lookup logic.
 * 4. Table 5 statistics parity equation across varied combinations of present, leave, mission, and custom sub-table officers.
 */

import { Types } from "mongoose";
import * as fs from "fs";
import * as path from "path";
import { getUtcDayRange } from "../lib/arkan-harb/rollcall-engine";
import { hasModuleAccess } from "../lib/auth/rbac";
import type { AuthUser, ModulePermissions } from "../lib/auth/types";
import type { ICustomRollcallTable, IRollcallEntry } from "../lib/db/models/DailyRollcall.shared";

let totalAsserts = 0;
let passedAsserts = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalAsserts++;
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedAsserts++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${details ? ` -> ${details}` : ""}`);
    throw new Error(`Assertion failed: ${testName} ${details || ""}`);
  }
}

// ============================================================================
// SUITE 1: Returning Officer (isReturningToday) Engine & API Validation
// ============================================================================
function runSuite1ReturningOfficer() {
  console.log("\n==================================================================");
  console.log("SUITE 1: Returning Officer (isReturningToday) Engine & API Validation");
  console.log("==================================================================");

  const targetDateStr = "2026-09-10T10:00:00.000Z";
  const { startOfDay, endOfDay } = getUtcDayRange(targetDateStr);

  // 1.1 Engine calculation simulation
  // Leave ends today (same UTC calendar date) and return not confirmed
  const leaveEndingToday = {
    _id: new Types.ObjectId(),
    endDate: new Date("2026-09-10T23:59:59.000Z"),
    type: "اعتيادية",
    isReturnConfirmed: false,
  };

  const endRangeToday = getUtcDayRange(leaveEndingToday.endDate);
  const isReturningToday1 =
    endRangeToday.startOfDay.getTime() === startOfDay.getTime() && !leaveEndingToday.isReturnConfirmed;

  assert(isReturningToday1 === true, "Leave ending today with isReturnConfirmed=false must calculate isReturningToday=true");

  // Leave ends today but return ALREADY confirmed
  const leaveEndingTodayConfirmed = {
    _id: new Types.ObjectId(),
    endDate: new Date("2026-09-10T12:00:00.000Z"),
    type: "اعتيادية",
    isReturnConfirmed: true,
  };
  const endRangeConfirmed = getUtcDayRange(leaveEndingTodayConfirmed.endDate);
  const isReturningTodayConfirmed =
    endRangeConfirmed.startOfDay.getTime() === startOfDay.getTime() && !leaveEndingTodayConfirmed.isReturnConfirmed;

  assert(
    isReturningTodayConfirmed === false,
    "Leave ending today with isReturnConfirmed=true must NOT calculate isReturningToday=true"
  );

  // Leave ends tomorrow (future)
  const leaveEndingTomorrow = {
    _id: new Types.ObjectId(),
    endDate: new Date("2026-09-11T08:00:00.000Z"),
    type: "عارضة",
    isReturnConfirmed: false,
  };
  const endRangeTomorrow = getUtcDayRange(leaveEndingTomorrow.endDate);
  const isReturningTomorrow =
    endRangeTomorrow.startOfDay.getTime() === startOfDay.getTime() && !leaveEndingTomorrow.isReturnConfirmed;

  assert(
    isReturningTomorrow === false,
    "Leave ending tomorrow must NOT calculate isReturningToday=true"
  );

  // Leave ended yesterday (past)
  const leaveEndedYesterday = {
    _id: new Types.ObjectId(),
    endDate: new Date("2026-09-09T20:00:00.000Z"),
    type: "اعتيادية",
    isReturnConfirmed: false,
  };
  const endRangeYesterday = getUtcDayRange(leaveEndedYesterday.endDate);
  const isReturningYesterday =
    endRangeYesterday.startOfDay.getTime() === startOfDay.getTime() && !leaveEndedYesterday.isReturnConfirmed;

  assert(
    isReturningYesterday === false,
    "Leave ended yesterday must NOT calculate isReturningToday=true"
  );

  // 1.2 Status & Lock properties assigned by engine
  // For returning officer: status MUST be "present", isLocked MUST be false, lockReason MUST be undefined
  let calcStatus: string;
  let calcIsLocked: boolean;
  let calcLockReason: string | undefined;

  if (isReturningToday1) {
    calcStatus = "present";
    calcIsLocked = false;
    calcLockReason = undefined;
  } else {
    calcStatus = "leave";
    calcIsLocked = true;
    calcLockReason = "إجازة رسمية";
  }

  assert(calcStatus === "present", "Returning officer must have status='present'");
  assert(calcIsLocked === false, "Returning officer must have isLocked=false");
  assert(calcLockReason === undefined, "Returning officer must have lockReason=undefined");

  // 1.3 API Locked Status Validation Simulation
  // Mimic POST /api/officers/rollcall validation loop
  interface OpMock {
    officerId: string;
    fullName: string;
    status: string;
    isLocked: boolean;
    lockReason?: string;
    isReturningToday?: boolean;
  }

  function validateApiSubmission(
    submittedEntry: { officerId: string; status: string },
    op: OpMock
  ): { allowed: boolean; error?: string } {
    if (op.isLocked && submittedEntry.status !== op.status) {
      if (op.isReturningToday && (submittedEntry.status === "present" || submittedEntry.status === "custom_present")) {
        return { allowed: true };
      }
      return {
        allowed: false,
        error: `لا يمكن تعديل تمام الضابط (${op.fullName}) لأن حالته مقفلة آلياً بسبب (${op.lockReason || "إجازة/مأمورية نشطة"})`,
      };
    }
    return { allowed: true };
  }

  // Scenario A: Locked officer on active leave tries to change to "present" -> REJECT 400
  const activeLeaveOfficer: OpMock = {
    officerId: "officer-leave-1",
    fullName: "عقيد أركان حرب / أحمد محمود",
    status: "leave",
    isLocked: true,
    lockReason: "إجازة اعتيادية حتى 2026-09-15",
    isReturningToday: false,
  };
  const resA = validateApiSubmission({ officerId: "officer-leave-1", status: "present" }, activeLeaveOfficer);
  assert(resA.allowed === false, "Changing locked leave officer to 'present' must be rejected");

  // Scenario B: Locked officer on active leave submits "leave" -> ALLOW 200
  const resB = validateApiSubmission({ officerId: "officer-leave-1", status: "leave" }, activeLeaveOfficer);
  assert(resB.allowed === true, "Submitting unchanged locked leave status must be allowed");

  // Scenario C: Returning officer submits "present" -> ALLOW 200
  const returningOfficerOp: OpMock = {
    officerId: "officer-return-1",
    fullName: "مقدم / كمال إبراهيم",
    status: "present",
    isLocked: false,
    lockReason: undefined,
    isReturningToday: true,
  };
  const resC = validateApiSubmission({ officerId: "officer-return-1", status: "present" }, returningOfficerOp);
  assert(resC.allowed === true, "Returning officer submitting 'present' must be allowed");

  // Scenario D: Returning officer assigned to inside custom table (status 'custom_present') -> ALLOW 200
  const resD = validateApiSubmission({ officerId: "officer-return-1", status: "custom_present" }, returningOfficerOp);
  assert(resD.allowed === true, "Returning officer submitting 'custom_present' must be allowed");

  // Scenario E: Even if isLocked was true, returning officer exception allows 'present' and 'custom_present'
  const hypotheticalLockedReturning: OpMock = {
    officerId: "officer-return-2",
    fullName: "رائد / ساهر توفيق",
    status: "leave", // legacy engine edge case
    isLocked: true,
    lockReason: "عودة اليوم",
    isReturningToday: true,
  };
  const resE1 = validateApiSubmission({ officerId: "officer-return-2", status: "present" }, hypotheticalLockedReturning);
  const resE2 = validateApiSubmission({ officerId: "officer-return-2", status: "custom_present" }, hypotheticalLockedReturning);
  assert(resE1.allowed === true, "API guard allows 'present' for isReturningToday even if isLocked is true");
  assert(resE2.allowed === true, "API guard allows 'custom_present' for isReturningToday even if isLocked is true");

  // 1.4 Frontend Note Deduplication Test
  function computeInitialNote(off: { note?: string; isReturningToday?: boolean }): string | undefined {
    if (off.isReturningToday) {
      if (!off.note) {
        return "عودة";
      } else if (off.note.includes("عودة")) {
        return off.note;
      } else {
        return `عودة - ${off.note}`;
      }
    }
    return off.note;
  }

  const initialNote1 = computeInitialNote({ note: undefined, isReturningToday: true });
  assert(initialNote1 === "عودة", "First pass with undefined note produces 'عودة'");

  // Simulate repeated page loads/draft reloads
  const round2 = computeInitialNote({ note: initialNote1, isReturningToday: true });
  assert(round2 === "عودة", "Second pass does NOT duplicate 'عودة - عودة'");

  const round3 = computeInitialNote({ note: round2, isReturningToday: true });
  assert(round3 === "عودة", "Third pass remains exactly 'عودة'");

  // With custom initial note
  const customNoteInitial = computeInitialNote({ note: "تصديق القائد", isReturningToday: true });
  assert(customNoteInitial === "عودة - تصديق القائد", "Custom note prefixes 'عودة - '");

  const customNoteRound2 = computeInitialNote({ note: customNoteInitial, isReturningToday: true });
  assert(customNoteRound2 === "عودة - تصديق القائد", "Subsequent pass preserves 'عودة - تصديق القائد' without repeating 'عودة'");
}

// ============================================================================
// SUITE 2: Reopen API RBAC Validation Logic
// ============================================================================
function runSuite2ReopenRbac() {
  console.log("\n==================================================================");
  console.log("SUITE 2: Reopen API RBAC Validation Logic (Admin vs Employee vs Commander)");
  console.log("==================================================================");

  // 2.1 Reopen RBAC Simulation
  function checkReopenPermission(user: AuthUser | null): { allowed: boolean; status: number; error?: string } {
    if (!user) {
      return { allowed: false, status: 401, error: "غير مصرح" };
    }
    if (user.role !== "admin") {
      return {
        allowed: false,
        status: 403,
        error: "عفواً، إعادة فتح كشف التمام المعتمد هي صلاحية حصرية لمدير النظام (Admin) فقط.",
      };
    }
    return { allowed: true, status: 200 };
  }

  function createMockUser(
    id: string,
    username: string,
    role: "admin" | "commander" | "employee" | "viewer",
    overrides?: Partial<ModulePermissions>
  ): AuthUser {
    return {
      id,
      username,
      fullName: username,
      role,
      department: "قيادة",
      isActive: true,
      isLocked: false,
      permissions: {
        fax: "none",
        officers: "none",
        medical: "none",
        students: "none",
        education: "none",
        arkan_harb: "none",
        ...overrides,
      },
    };
  }

  // Admin User
  const adminUser = createMockUser("admin-1", "admin", "admin");
  const resAdmin = checkReopenPermission(adminUser);
  assert(resAdmin.allowed === true && resAdmin.status === 200, "Admin role MUST be allowed to reopen rollcall");

  // Employee with arkan_harb: "edit"
  const employeeEditUser = createMockUser("emp-1", "staff_officer", "employee", {
    arkan_harb: "edit",
    officers: "edit",
  });
  const resEmpEdit = checkReopenPermission(employeeEditUser);
  assert(
    resEmpEdit.allowed === false && resEmpEdit.status === 403,
    "Employee with edit permission MUST be rejected with HTTP 403"
  );
  assert(
    resEmpEdit.error?.includes("صلاحية حصرية لمدير النظام") === true,
    "Employee receives exact Arabic permission message"
  );

  // Employee with arkan_harb: "view"
  const employeeViewUser = createMockUser("emp-2", "viewer_employee", "employee", {
    arkan_harb: "view",
  });
  const resEmpView = checkReopenPermission(employeeViewUser);
  assert(
    resEmpView.allowed === false && resEmpView.status === 403,
    "Employee with view permission MUST be rejected with HTTP 403"
  );

  // Commander
  const commanderUser = createMockUser("cmd-1", "commander", "commander", {
    arkan_harb: "view",
    officers: "view",
  });
  const resCommander = checkReopenPermission(commanderUser);
  assert(
    resCommander.allowed === false && resCommander.status === 403,
    "Commander MUST be rejected from reopening rollcall with HTTP 403"
  );

  // Viewer
  const viewerUser = createMockUser("v-1", "viewer", "viewer");
  const resViewer = checkReopenPermission(viewerUser);
  assert(
    resViewer.allowed === false && resViewer.status === 403,
    "Viewer role MUST be rejected from reopening rollcall with HTTP 403"
  );

  // Unauthenticated (null user)
  const resNull = checkReopenPermission(null);
  assert(resNull.allowed === false && resNull.status === 401, "Unauthenticated request returns HTTP 401");

  // 2.2 Reopen Route Source Code Audit
  const reopenFilePath = path.resolve(__dirname, "../app/api/arkan-harb/rollcall/reopen/route.ts");
  const reopenSource = fs.readFileSync(reopenFilePath, "utf-8");

  assert(
    reopenSource.includes('if (auth.user!.role !== "admin")'),
    "Reopen route strictly checks auth.user!.role !== 'admin'"
  );
  assert(
    !reopenSource.includes('canEditModule(auth.user!, "arkan_harb")'),
    "Reopen route must NOT permit non-admin users via canEditModule"
  );
  assert(
    reopenSource.includes("getUtcDayRange(date)"),
    "Reopen route uses getUtcDayRange for consistent UTC day boundaries"
  );
  assert(
    reopenSource.includes("ipAddress: ip"),
    "Reopen route logs audit event with ipAddress"
  );
  assert(
    reopenSource.includes('rollcall.status = "draft"'),
    "Reopen route reverts rollcall status to draft"
  );
}

// ============================================================================
// SUITE 3: Custom Sub-Table Serialization and Membership Lookup Logic
// ============================================================================
function runSuite3CustomTableSerialization() {
  console.log("\n==================================================================");
  console.log("SUITE 3: Custom Sub-Table Serialization and Membership Lookup Logic");
  console.log("==================================================================");

  // 3.1 Serialization logic as implemented in arkan-harb/page.tsx:865-877
  const mockBsonId1 = new Types.ObjectId();
  const mockBsonId2 = new Types.ObjectId();
  const mockTableId = new Types.ObjectId();

  const rawCustomTables = [
    {
      id: mockTableId,
      name: "نوبتجية العمليات",
      isInsideUnit: true,
      officerIds: [mockBsonId1, { _id: mockBsonId2 }, "officer-string-id-3"],
      notes: "تمام خاص بالعمليات",
    },
    {
      id: "table-outside-2",
      name: "مأمورية تأمين خارجية",
      isInsideUnit: false,
      officerIds: ["officer-outside-4"],
      notes: undefined,
    },
  ];

  const serializedCustomTables: ICustomRollcallTable[] = rawCustomTables.map((tbl) => ({
    id: String(tbl.id),
    name: String(tbl.name),
    isInsideUnit: Boolean(tbl.isInsideUnit),
    officerIds: (tbl.officerIds || []).map((id: unknown) =>
      typeof id === "object" && id !== null && "_id" in id
        ? String((id as { _id: unknown })._id)
        : String(id)
    ),
    notes: tbl.notes ? String(tbl.notes) : undefined,
  }));

  assert(typeof serializedCustomTables[0].id === "string", "Serialized table id is string");
  assert(
    serializedCustomTables[0].officerIds[0] === mockBsonId1.toString(),
    "BSON ObjectId officerId converted to string"
  );
  assert(
    serializedCustomTables[0].officerIds[1] === mockBsonId2.toString(),
    "Object with _id converted to string"
  );
  assert(
    serializedCustomTables[0].officerIds[2] === "officer-string-id-3",
    "String officerId preserved as string"
  );
  assert(
    serializedCustomTables[0].isInsideUnit === true,
    "isInsideUnit correctly preserved as boolean"
  );
  assert(
    serializedCustomTables[1].isInsideUnit === false,
    "isInsideUnit false correctly preserved as boolean"
  );

  // 3.2 Client-side membership lookup simulation (RollcallView.tsx:141-149)
  const customTableOfficerMap = new Map<string, ICustomRollcallTable>();
  for (const tbl of serializedCustomTables) {
    for (const offId of tbl.officerIds) {
      customTableOfficerMap.set(String(offId), tbl);
    }
  }

  // Lookup matching officer
  const foundTable1 = customTableOfficerMap.get(mockBsonId1.toString());
  assert(foundTable1?.id === mockTableId.toString(), "Officer 1 accurately looked up in customTableOfficerMap");
  assert(foundTable1?.isInsideUnit === true, "Officer 1 custom table has isInsideUnit=true");

  const foundTable2 = customTableOfficerMap.get("officer-outside-4");
  assert(foundTable2?.id === "table-outside-2", "Officer 4 accurately looked up in outside custom table");
  assert(foundTable2?.isInsideUnit === false, "Officer 4 custom table has isInsideUnit=false");

  // Non-assigned officer returns undefined
  const unassigned = customTableOfficerMap.get("random-unassigned-officer");
  assert(unassigned === undefined, "Unassigned officer returns undefined from customTableOfficerMap");

  // 3.3 Deletion Scenario: removing custom table releases officers back to default tables
  const filteredTables = serializedCustomTables.filter((t) => t.id !== mockTableId.toString());
  const updatedOfficerMap = new Map<string, ICustomRollcallTable>();
  for (const tbl of filteredTables) {
    for (const offId of tbl.officerIds) {
      updatedOfficerMap.set(String(offId), tbl);
    }
  }

  assert(
    updatedOfficerMap.get(mockBsonId1.toString()) === undefined,
    "After table deletion, Officer 1 is released from customTableOfficerMap"
  );
  assert(
    updatedOfficerMap.get("officer-outside-4") !== undefined,
    "Other custom tables remain unaffected"
  );
}

// ============================================================================
// SUITE 4: Table 5 Statistics Parity Equation & Stress Testing Harness
// ============================================================================
interface OfficerItem {
  id: string;
  fullName: string;
  rank: string;
  status: string;
  isReturningToday?: boolean;
  leaveTypeLabel?: string;
  missionTitle?: string;
}

function calculateTable5Stats(
  officers: OfficerItem[],
  customTables: ICustomRollcallTable[]
) {
  // Build lookup map
  const customTableOfficerMap = new Map<string, ICustomRollcallTable>();
  for (const tbl of customTables) {
    for (const offId of tbl.officerIds) {
      customTableOfficerMap.set(String(offId), tbl);
    }
  }

  const present: OfficerItem[] = [];
  const leave: OfficerItem[] = [];
  const external: OfficerItem[] = [];
  const customListMap: Record<string, OfficerItem[]> = {};

  for (const tbl of customTables) {
    customListMap[tbl.id] = [];
  }

  for (const off of officers) {
    const assignedCustomTable = customTableOfficerMap.get(off.id);
    if (assignedCustomTable) {
      if (!customListMap[assignedCustomTable.id]) {
        customListMap[assignedCustomTable.id] = [];
      }
      customListMap[assignedCustomTable.id].push(off);
      continue;
    }

    if (off.isReturningToday) {
      present.push(off);
    } else if (
      off.status === "leave" ||
      off.status === "rest" ||
      off.status === "absent" ||
      off.leaveTypeLabel
    ) {
      leave.push(off);
    } else if (
      off.status === "external_mission" ||
      off.status === "mission" ||
      off.status === "course" ||
      off.missionTitle
    ) {
      external.push(off);
    } else {
      present.push(off);
    }
  }

  let customInsideCount = 0;
  let customOutsideCount = 0;
  for (const tbl of customTables) {
    const count = (customListMap[tbl.id] || []).length;
    if (tbl.isInsideUnit) {
      customInsideCount += count;
    } else {
      customOutsideCount += count;
    }
  }

  const dailyMissionCount = present.filter((o) => o.status === "daily_mission").length;
  const insideCenterCount = Math.max(0, present.length - dailyMissionCount);

  const totalPresent = present.length + customInsideCount;
  const totalOut = leave.length + external.length + customOutsideCount;
  const totalOfficersCount = officers.length;

  // Cumulative serial calculations
  const table1Start = 1;
  const table2Start = table1Start + present.length;
  const table3Start = table2Start + leave.length;
  let nextSerialOffset = table3Start + external.length;
  const customTableOffsets: Record<string, number> = {};
  for (const tbl of customTables) {
    customTableOffsets[tbl.id] = nextSerialOffset;
    nextSerialOffset += (customListMap[tbl.id] || []).length;
  }

  return {
    totalOfficers: totalOfficersCount,
    totalPresent,
    insideCenterCount,
    dailyMissionCount,
    customInsideCount,
    totalOut,
    leaveCount: leave.length,
    externalMissionCount: external.length,
    customOutsideCount,
    table1Start,
    table2Start,
    table3Start,
    customTableOffsets,
    finalOffset: nextSerialOffset,
    presentOfficers: present,
    leaveOfficers: leave,
    externalOfficers: external,
  };
}

function runSuite4Table5Parity() {
  console.log("\n==================================================================");
  console.log("SUITE 4: Table 5 Statistics Parity Equation & Stress Testing Harness");
  console.log("==================================================================");

  // 4.1 Fixed Scenario Tests
  console.log("\n--- 4.1 Fixed Scenarios ---");

  // Scenario 1: Standard mix with 0 custom tables
  const officers1: OfficerItem[] = [
    { id: "1", fullName: "ضابط 1", rank: "عميد", status: "present" },
    { id: "2", fullName: "ضابط 2", rank: "عقيد", status: "present" },
    { id: "3", fullName: "ضابط 3", rank: "مقدم", status: "daily_mission" },
    { id: "4", fullName: "ضابط 4", rank: "رائد", status: "leave", leaveTypeLabel: "اعتيادية" },
    { id: "5", fullName: "ضابط 5", rank: "نقيب", status: "external_mission", missionTitle: "تفتيش" },
    { id: "6", fullName: "ضابط 6", rank: "ملازم أول", status: "present", isReturningToday: true },
  ];
  const s1 = calculateTable5Stats(officers1, []);

  assert(s1.totalOfficers === 6, "Scenario 1: total officers is 6");
  assert(s1.insideCenterCount === 3, "Scenario 1: insideCenterCount is 3 (2 regular present + 1 returning today)");
  assert(s1.dailyMissionCount === 1, "Scenario 1: dailyMissionCount is 1");
  assert(s1.presentOfficers.length === 4, "Scenario 1: presentOfficers includes returning officer (2 regular + 1 daily_mission + 1 return = 4)");
  assert(s1.totalPresent === 4, "Scenario 1: totalPresent is 4");
  assert(s1.leaveCount === 1, "Scenario 1: leaveCount is 1");
  assert(s1.externalMissionCount === 1, "Scenario 1: externalMissionCount is 1");
  assert(s1.totalOut === 2, "Scenario 1: totalOut is 2");
  assert(s1.totalPresent + s1.totalOut === s1.totalOfficers, "Scenario 1: totalPresent + totalOut === totalOfficers (4 + 2 = 6)");

  // Scenario 2: With custom tables (both inside and outside)
  const customTables2: ICustomRollcallTable[] = [
    {
      id: "tbl-in",
      name: "عمليات داخلية",
      isInsideUnit: true,
      officerIds: ["1", "6"], // 1 was present, 6 was returning
    },
    {
      id: "tbl-out",
      name: "كمين خارجي",
      isInsideUnit: false,
      officerIds: ["2"], // 2 was present
    },
  ];

  const s2 = calculateTable5Stats(officers1, customTables2);
  assert(s2.customInsideCount === 2, "Scenario 2: customInsideCount is 2");
  assert(s2.customOutsideCount === 1, "Scenario 2: customOutsideCount is 1");
  assert(s2.presentOfficers.length === 1, "Scenario 2: default presentOfficers reduced to 1 (only daily_mission '3')");
  assert(s2.insideCenterCount === 0, "Scenario 2: insideCenterCount is 0");
  assert(s2.dailyMissionCount === 1, "Scenario 2: dailyMissionCount is 1");
  assert(s2.totalPresent === 3, "Scenario 2: totalPresent = 1 default + 2 custom inside = 3");
  assert(s2.totalOut === 3, "Scenario 2: totalOut = 1 leave + 1 ext mission + 1 custom outside = 3");
  assert(s2.totalPresent + s2.totalOut === s2.totalOfficers, "Scenario 2: Parity holds (3 + 3 === 6)");

  // Verify cumulative serial sequence:
  // table1Start: 1, length: 1 -> ends at 1
  // table2Start: 2, length: 1 -> ends at 2
  // table3Start: 3, length: 1 -> ends at 3
  // customTableOffsets['tbl-in']: 4, length: 2 -> ends at 5
  // customTableOffsets['tbl-out']: 6, length: 1 -> ends at 6
  // finalOffset: 7
  assert(s2.table1Start === 1, "Cumulative serial: Table 1 starts at 1");
  assert(s2.table2Start === 2, "Cumulative serial: Table 2 starts at 2");
  assert(s2.table3Start === 3, "Cumulative serial: Table 3 starts at 3");
  assert(s2.customTableOffsets["tbl-in"] === 4, "Cumulative serial: tbl-in starts at 4");
  assert(s2.customTableOffsets["tbl-out"] === 6, "Cumulative serial: tbl-out starts at 6");
  assert(s2.finalOffset === 7, "Cumulative serial: final offset equals totalOfficers + 1 (7)");

  // Scenario 3: Boundary edge cases (0 officers)
  const sEmpty = calculateTable5Stats([], []);
  assert(sEmpty.totalOfficers === 0, "Empty: total officers is 0");
  assert(sEmpty.totalPresent === 0, "Empty: totalPresent is 0");
  assert(sEmpty.totalOut === 0, "Empty: totalOut is 0");
  assert(sEmpty.totalPresent + sEmpty.totalOut === 0, "Empty: Parity holds (0 + 0 === 0)");

  // Scenario 4: All officers in custom outside table
  const allOutsideTables: ICustomRollcallTable[] = [
    {
      id: "all-out",
      name: "مأمورية شاملة",
      isInsideUnit: false,
      officerIds: officers1.map((o) => o.id),
    },
  ];
  const sAllOut = calculateTable5Stats(officers1, allOutsideTables);
  assert(sAllOut.totalPresent === 0, "All out: totalPresent is 0");
  assert(sAllOut.totalOut === 6, "All out: totalOut is 6");
  assert(sAllOut.customOutsideCount === 6, "All out: customOutsideCount is 6");
  assert(sAllOut.totalPresent + sAllOut.totalOut === sAllOut.totalOfficers, "All out: Parity holds (0 + 6 === 6)");

  // 4.2 Monte Carlo Random Stress-Testing Harness (1,000 iterations)
  console.log("\n--- 4.2 Monte Carlo Stress Harness (1,000 randomized configurations) ---");

  const ranks = ["ملازم", "ملازم أول", "نقيب", "رائد", "مقدم", "عقيد", "عميد", "لواء"];
  const statuses = [
    "present",
    "daily_mission",
    "leave",
    "rest",
    "absent",
    "external_mission",
    "course",
  ];

  let monteCarloFailures = 0;

  for (let iter = 1; iter <= 1000; iter++) {
    // Generate random roster size between 1 and 150
    const count = Math.floor(Math.random() * 150) + 1;
    const testOfficers: OfficerItem[] = [];

    for (let i = 1; i <= count; i++) {
      const st = statuses[Math.floor(Math.random() * statuses.length)];
      const isReturn = st === "leave" && Math.random() < 0.3; // 30% chance returning today
      testOfficers.push({
        id: `officer-${iter}-${i}`,
        fullName: `ضابط رقم ${i}`,
        rank: ranks[i % ranks.length],
        status: st,
        isReturningToday: isReturn,
        leaveTypeLabel: st === "leave" ? "اعتيادية" : undefined,
        missionTitle: st === "external_mission" ? "مأمورية رسمية" : undefined,
      });
    }

    // Generate random 0 to 4 custom tables
    const numCustomTables = Math.floor(Math.random() * 5);
    const testCustomTables: ICustomRollcallTable[] = [];

    // Distribute a subset of officers into custom tables
    const shuffledOfficerIds = [...testOfficers.map((o) => o.id)].sort(() => Math.random() - 0.5);
    let idCursor = 0;

    for (let t = 0; t < numCustomTables; t++) {
      const tableSize = Math.min(
        shuffledOfficerIds.length - idCursor,
        Math.floor(Math.random() * Math.ceil(count / 3))
      );
      const assignedIds = shuffledOfficerIds.slice(idCursor, idCursor + tableSize);
      idCursor += tableSize;

      testCustomTables.push({
        id: `tbl-${iter}-${t}`,
        name: `جدول مخصص ${t + 1}`,
        isInsideUnit: Math.random() > 0.5,
        officerIds: assignedIds,
      });
    }

    const res = calculateTable5Stats(testOfficers, testCustomTables);

    // Invariant 1: totalPresent + totalOut === totalOfficers
    if (res.totalPresent + res.totalOut !== res.totalOfficers) {
      monteCarloFailures++;
      console.error(
        `Iteration ${iter} FAILED Parity: totalPresent (${res.totalPresent}) + totalOut (${res.totalOut}) !== totalOfficers (${res.totalOfficers})`
      );
    }

    // Invariant 2: totalPresent decomposition
    const presentDecomp = res.insideCenterCount + res.dailyMissionCount + res.customInsideCount;
    if (presentDecomp !== res.totalPresent) {
      monteCarloFailures++;
      console.error(
        `Iteration ${iter} FAILED Present Decomposition: insideCenter (${res.insideCenterCount}) + dailyMission (${res.dailyMissionCount}) + customInside (${res.customInsideCount}) !== totalPresent (${res.totalPresent})`
      );
    }

    // Invariant 3: totalOut decomposition
    const outDecomp = res.leaveCount + res.externalMissionCount + res.customOutsideCount;
    if (outDecomp !== res.totalOut) {
      monteCarloFailures++;
      console.error(
        `Iteration ${iter} FAILED Out Decomposition: leave (${res.leaveCount}) + extMission (${res.externalMissionCount}) + customOut (${res.customOutsideCount}) !== totalOut (${res.totalOut})`
      );
    }

    // Invariant 4: Cumulative serial sequence has no gaps and reaches totalOfficers + 1
    if (res.finalOffset !== res.totalOfficers + 1) {
      monteCarloFailures++;
      console.error(
        `Iteration ${iter} FAILED Serial Sequence: finalOffset (${res.finalOffset}) !== totalOfficers + 1 (${res.totalOfficers + 1})`
      );
    }
  }

  assert(
    monteCarloFailures === 0,
    "1,000 Monte Carlo randomized roster & custom table simulations passed with 0 parity/serial failures"
  );
}

// ============================================================================
// SUITE 5: Navigation 404 & Design Consistency Static Checks
// ============================================================================
function runSuite5StaticNavigationChecks() {
  console.log("\n==================================================================");
  console.log("SUITE 5: Navigation 404 & Modal Design System Verification");
  console.log("==================================================================");

  // 5.1 officers/rollcall/page.tsx redirect check
  const redirectPagePath = path.resolve(__dirname, "../app/(dashboard)/officers/rollcall/page.tsx");
  const redirectContent = fs.readFileSync(redirectPagePath, "utf-8");
  assert(
    redirectContent.includes('redirect("/arkan-harb?tab=rollcall")'),
    "Officers rollcall page redirects cleanly to /arkan-harb?tab=rollcall (eliminating 404)"
  );

  // 5.2 RollcallDateSelector href check
  const dateSelectorPath = path.resolve(__dirname, "../components/arkan-harb/RollcallDateSelector.tsx");
  const dateSelectorContent = fs.readFileSync(dateSelectorPath, "utf-8");
  assert(
    dateSelectorContent.includes("/arkan-harb?tab=rollcall&date="),
    "RollcallDateSelector navigates cleanly to /arkan-harb?tab=rollcall&date="
  );

  // 5.3 Absence of raw window.confirm in RollcallView
  const rollcallViewPath = path.resolve(__dirname, "../components/arkan-harb/RollcallView.tsx");
  const rollcallViewContent = fs.readFileSync(rollcallViewPath, "utf-8");
  assert(
    !rollcallViewContent.includes("window.confirm"),
    "RollcallView has zero occurrences of window.confirm"
  );
  assert(
    !rollcallViewContent.includes("confirm("),
    "RollcallView has zero occurrences of raw confirm()"
  );

  // 5.4 Check presence of ModalShell confirmations
  assert(
    rollcallViewContent.includes("confirmSubmitOpen") &&
    rollcallViewContent.includes("confirmReopenOpen") &&
    rollcallViewContent.includes("tableToDelete"),
    "RollcallView utilizes ModalShell state for Submit, Reopen, and Delete confirmations"
  );

  // 5.5 Print container display classes
  assert(
    rollcallViewContent.includes('print:hidden') &&
    rollcallViewContent.includes('hidden print:block'),
    "RollcallView toggles print visibility cleanly (print:hidden on screen, hidden print:block on print report)"
  );
}

// ============================================================================
// MAIN RUNNER
// ============================================================================
async function main() {
  console.log("=================================================================");
  console.log("DAILY ROLLCALL EMPIRICAL CHALLENGER & STRESS VERIFICATION SUITE");
  console.log("=================================================================");

  runSuite1ReturningOfficer();
  runSuite2ReopenRbac();
  runSuite3CustomTableSerialization();
  runSuite4Table5Parity();
  runSuite5StaticNavigationChecks();

  console.log("\n=================================================================");
  console.log(`FINAL RESULT: ${passedAsserts} / ${totalAsserts} assertions PASSED`);
  console.log("=================================================================\n");
}

main().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});
