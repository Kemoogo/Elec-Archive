import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { acquireLock, releaseLock, isLocked } from "../lib/backup/mutex-lock";
import { getQuarterForDate } from "../lib/backup/quarterly-checker";
import {
  exportBackupSchema,
  quarterlyBackupSchema,
  restoreBackupSchema,
  RESTORE_CONFIRMATION_PHRASE,
} from "../lib/validations/backup";

describe("Backup Mutex Lock", () => {
  it("acquires and releases mutex lock cleanly", () => {
    releaseLock();
    assert.equal(isLocked(), false);

    const acquired = acquireLock("backup");
    assert.equal(acquired, true);
    assert.equal(isLocked(), true);

    // Concurrent acquisition attempt must fail
    const secondAcquire = acquireLock("restore");
    assert.equal(secondAcquire, false);

    releaseLock();
    assert.equal(isLocked(), false);
  });
});

describe("Quarterly Date & Quarter Calculation", () => {
  it("calculates quarter correctly for dates in Q1, Q2, Q3, Q4", () => {
    const d1 = new Date(2026, 0, 15); // Jan 15, 2026
    assert.equal(getQuarterForDate(d1).quarter, "Q1-2026");

    const d2 = new Date(2026, 4, 1); // May 1, 2026
    assert.equal(getQuarterForDate(d2).quarter, "Q2-2026");

    const d3 = new Date(2026, 7, 20); // Aug 20, 2026
    assert.equal(getQuarterForDate(d3).quarter, "Q3-2026");

    const d4 = new Date(2026, 10, 10); // Nov 10, 2026
    assert.equal(getQuarterForDate(d4).quarter, "Q4-2026");
  });

  it("identifies quarter-end window correctly", () => {
    const endMarch = new Date(2026, 2, 31); // March 31
    assert.equal(getQuarterForDate(endMarch).isQuarterEnd, true);

    const midMarch = new Date(2026, 2, 15); // March 15
    assert.equal(getQuarterForDate(midMarch).isQuarterEnd, false);

    const endJune = new Date(2026, 5, 30); // June 30
    assert.equal(getQuarterForDate(endJune).isQuarterEnd, true);

    const midJune = new Date(2026, 5, 29); // June 29 - should NOT be quarter-end
    assert.equal(getQuarterForDate(midJune).isQuarterEnd, false);

    const endSept = new Date(2026, 8, 30); // Sept 30
    assert.equal(getQuarterForDate(endSept).isQuarterEnd, true);

    const endDec = new Date(2026, 11, 31); // Dec 31
    assert.equal(getQuarterForDate(endDec).isQuarterEnd, true);
  });
});

describe("Backup Zod Validation Schemas", () => {
  it("validates export backup schema including incremental mode", () => {
    assert.equal(exportBackupSchema.safeParse({}).success, true);
    assert.equal(exportBackupSchema.safeParse({ notes: "نسخة قبل الصيانة" }).success, true);
    assert.equal(exportBackupSchema.safeParse({ isIncremental: true }).success, true);
    assert.equal(exportBackupSchema.safeParse({ isIncremental: false }).success, true);
  });

  it("validates quarterly backup schema format", () => {
    assert.equal(quarterlyBackupSchema.safeParse({ quarter: "Q1-2026" }).success, true);
    assert.equal(quarterlyBackupSchema.safeParse({ quarter: "invalid" }).success, false);
  });

  it("strictly validates restore confirmation phrase and password", () => {
    const validPayload = {
      backupId: "67290f1a9d123456789abcde",
      adminPassword: "SecretPassword123",
      confirmationPhrase: RESTORE_CONFIRMATION_PHRASE,
    };
    assert.equal(restoreBackupSchema.safeParse(validPayload).success, true);

    const wrongPhrase = {
      ...validPayload,
      confirmationPhrase: "استعادة خاطئة",
    };
    assert.equal(restoreBackupSchema.safeParse(wrongPhrase).success, false);

    const invalidId = {
      ...validPayload,
      backupId: "not-an-id",
    };
    assert.equal(restoreBackupSchema.safeParse(invalidId).success, false);
  });
});
