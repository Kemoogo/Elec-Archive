import { describe, it } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import { updateBatchClassificationSchema } from "../lib/validations/student";
import {
  MAX_EXTERNAL_RESTORE_BYTES,
  RESTORE_CONFIRMATION_PHRASE,
  restoreUploadBackupSchema,
} from "../lib/validations/backup";
import { checkDiskSpaceSufficient } from "../lib/backup/disk-space";
import { checkApiRateLimit } from "../lib/security/rate-limit";

describe("FR-06.1: Batch Classification Rename Schema", () => {
  it("accepts and trims valid classification rename payloads", () => {
    const res = updateBatchClassificationSchema.safeParse({
      id: "  saf-ishara  ",
      name: "  صف إشارة مطوّر  ",
      description: "توصيف محدث",
    });
    assert.equal(res.success, true);
    if (res.success) {
      assert.equal(res.data.id, "saf-ishara");
      assert.equal(res.data.name, "صف إشارة مطوّر");
    }
  });

  it("rejects empty, whitespace-only, or overly long names and missing IDs", () => {
    assert.equal(
      updateBatchClassificationSchema.safeParse({ id: "c1", name: "" }).success,
      false
    );
    assert.equal(
      updateBatchClassificationSchema.safeParse({ id: "c1", name: "   " }).success,
      false
    );
    assert.equal(
      updateBatchClassificationSchema.safeParse({ id: "", name: "تصنيف" }).success,
      false
    );
    assert.equal(
      updateBatchClassificationSchema.safeParse({
        id: "c1",
        name: "أ".repeat(101),
      }).success,
      false
    );
  });
});

describe("FR-07.4: External Archive Upload Constraints & Dual Verification", () => {
  it("enforces exact 2 GiB maximum upload constant", () => {
    assert.equal(MAX_EXTERNAL_RESTORE_BYTES, 2 * 1024 * 1024 * 1024);
  });

  it("validates confirmation phrase (trimmed) and non-empty admin password", () => {
    const valid = restoreUploadBackupSchema.safeParse({
      adminPassword: "AdminPass#2026",
      confirmationPhrase: `  ${RESTORE_CONFIRMATION_PHRASE}  `,
    });
    assert.equal(valid.success, true);

    assert.equal(
      restoreUploadBackupSchema.safeParse({
        adminPassword: "",
        confirmationPhrase: RESTORE_CONFIRMATION_PHRASE,
      }).success,
      false
    );

    assert.equal(
      restoreUploadBackupSchema.safeParse({
        adminPassword: "AdminPass#2026",
        confirmationPhrase: "عبارة تأكيد خاطئة",
      }).success,
      false
    );
  });

  it("rejects restore when estimated size exceeds free disk space safety threshold", async () => {
    const absurdlyLargeBytes = 1024 * 1024 * 1024 * 1024 * 1024; // 1 PiB
    const result = await checkDiskSpaceSufficient(os.tmpdir(), absurdlyLargeBytes);
    assert.equal(result.sufficient, false);
    assert.ok(result.reason && result.reason.length > 0);
  });
});

describe("Security-First: API Rate Limiting Enforcement", () => {
  it("enforces upload rate limit (10 requests per window)", () => {
    const userId = `test-upload-${Date.now()}-${Math.random()}`;
    const ip = "127.0.0.10";

    for (let i = 0; i < 10; i++) {
      const rl = checkApiRateLimit(userId, ip, "upload");
      assert.equal(rl.allowed, true, `upload request #${i + 1} should be allowed`);
    }

    const blocked = checkApiRateLimit(userId, ip, "upload");
    assert.equal(blocked.allowed, false);
  });

  it("enforces write rate limit (30 requests per window)", () => {
    const userId = `test-write-${Date.now()}-${Math.random()}`;
    const ip = "127.0.0.11";

    for (let i = 0; i < 30; i++) {
      const rl = checkApiRateLimit(userId, ip, "write");
      assert.equal(rl.allowed, true, `write request #${i + 1} should be allowed`);
    }

    const blocked = checkApiRateLimit(userId, ip, "write");
    assert.equal(blocked.allowed, false);
  });
});
