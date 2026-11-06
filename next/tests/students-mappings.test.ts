import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  mapGovernorate,
  mapBloodType,
  normalizeArabicText,
  formatGovernorateDisplay,
  formatBloodTypeDisplay,
  EGYPT_GOVERNORATES,
  BLOOD_TYPES_MAP,
  getAllGovernorates,
} from "../lib/students/mappings";
import {
  QUALIFICATION_LABELS,
  formatQualificationLabel,
} from "../types/student";
import { cleanupStaleTempFiles, safeMoveFile } from "../lib/students/temp-storage";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

describe("Egyptian Military Governorate Mappings", () => {
  it("resolves numeric codes correctly to official Egyptian governorates", () => {
    const cairo = mapGovernorate(1);
    assert.equal(cairo.code, 1);
    assert.equal(cairo.name, "القاهرة");
    assert.equal(cairo.recruitmentArea, "القاهرة (هـ)");
    assert.equal(cairo.phoneCode, "02");

    const alex = mapGovernorate(2);
    assert.equal(alex.code, 2);
    assert.equal(alex.name, "الإسكندرية");
    assert.equal(alex.recruitmentArea, "الإسكندرية (س)");
    assert.equal(alex.phoneCode, "03");

    const suez = mapGovernorate(4);
    assert.equal(suez.code, 4);
    assert.equal(suez.name, "السويس");
    assert.equal(suez.recruitmentArea, "الزقازيق (ز)");
    assert.equal(suez.phoneCode, "069");

    const aswan = mapGovernorate(28);
    assert.equal(aswan.code, 28);
    assert.equal(aswan.name, "أسوان");
    assert.equal(aswan.recruitmentArea, "قنا (ق)");

    const internalSpecial = mapGovernorate(99);
    assert.equal(internalSpecial.code, 99);
    assert.equal(internalSpecial.name, "متوسطة");
  });

  it("resolves Arabic names with hamza and diacritic variations", () => {
    const alex1 = mapGovernorate("الإسكندرية");
    assert.equal(alex1.code, 2);

    const alex2 = mapGovernorate("الاسكندريه");
    assert.equal(alex2.code, 2);

    const ismailia = mapGovernorate("الاسماعيلية");
    assert.equal(ismailia.code, 19);
    assert.equal(ismailia.recruitmentArea, "الزقازيق (ز)");

    const cairo = mapGovernorate("القاهره");
    assert.equal(cairo.code, 1);
  });

  it("handles unknown or empty inputs gracefully without throwing", () => {
    const unknown = mapGovernorate(999);
    assert.equal(unknown.code, undefined);
    assert.equal(unknown.name, "999");

    const empty = mapGovernorate(undefined);
    assert.equal(empty.code, undefined);
    assert.equal(empty.name, undefined);
  });

  it("formats governorate display strings accurately", () => {
    assert.equal(formatGovernorateDisplay(1), "القاهرة");
    assert.equal(formatGovernorateDisplay("الاسكندريه"), "الإسكندرية");
    assert.equal(formatGovernorateDisplay(""), "—");
    assert.equal(formatGovernorateDisplay(undefined), "—");
    assert.equal(formatGovernorateDisplay(null), "—");
  });

  it("contains all 28 registered official military governorate entries", () => {
    // 27 official administrative governorates + 1 internal classification (99)
    const validGovernorates = getAllGovernorates();
    assert.equal(validGovernorates.length, 28);
    assert.ok(EGYPT_GOVERNORATES[1]);
    assert.ok(EGYPT_GOVERNORATES[35]);
    assert.ok(EGYPT_GOVERNORATES[99]);
  });
});

describe("Egyptian Military Blood Type Mappings", () => {
  it("resolves standard numeric codes 1..4 to ABO blood groups", () => {
    assert.equal(mapBloodType(1).bloodType, "A");
    assert.equal(mapBloodType(2).bloodType, "AB");
    assert.equal(mapBloodType(3).bloodType, "B");
    assert.equal(mapBloodType(4).bloodType, "O");
  });

  it("resolves blood type strings case-insensitively and returns matching code", () => {
    assert.equal(mapBloodType("a").bloodType, "A");
    assert.equal(mapBloodType("a").bloodTypeCode, 1);
    assert.equal(mapBloodType("A").bloodType, "A");
    assert.equal(mapBloodType("ab").bloodType, "AB");
    assert.equal(mapBloodType("ab").bloodTypeCode, 2);
    assert.equal(mapBloodType("b").bloodType, "B");
    assert.equal(mapBloodType("b").bloodTypeCode, 3);
    assert.equal(mapBloodType("O").bloodType, "O");
    assert.equal(mapBloodType("O").bloodTypeCode, 4);
  });

  it("formats blood type display properly with fallback", () => {
    assert.equal(formatBloodTypeDisplay(1), "A");
    assert.equal(formatBloodTypeDisplay(2), "AB");
    assert.equal(formatBloodTypeDisplay("b"), "B");
    assert.equal(formatBloodTypeDisplay(0), "—");
    assert.equal(formatBloodTypeDisplay(undefined), "—");
    assert.equal(formatBloodTypeDisplay(null), "—");
  });

  it("has standard blood type mappings defined in BLOOD_TYPES_MAP", () => {
    assert.equal(BLOOD_TYPES_MAP[1], "A");
    assert.equal(BLOOD_TYPES_MAP[2], "AB");
    assert.equal(BLOOD_TYPES_MAP[3], "B");
    assert.equal(BLOOD_TYPES_MAP[4], "O");
  });
});

describe("Arabic Text Normalization Utility", () => {
  it("strips diacritics (tashkeel) and unifies alef and teh marbuta", () => {
    assert.equal(normalizeArabicText("الإسْكَنْدَرِيَّةُ"), "الاسكندريه");
    assert.equal(normalizeArabicText("الْقَاهِرَةُ"), "القاهره");
    assert.equal(normalizeArabicText("أَسْيُوط"), "اسيوط");
    assert.equal(normalizeArabicText("آخِر"), "اخر");
  });
});

describe("Qualification Types & Shared Labels", () => {
  it("formats qualification keys into standardized Arabic labels", () => {
    assert.equal(formatQualificationLabel("high"), "مؤهل عالٍ");
    assert.equal(formatQualificationLabel("above_avg"), "مؤهل فوق متوسط");
    assert.equal(formatQualificationLabel("average"), "مؤهل متوسط");
    assert.equal(formatQualificationLabel("normal"), "عادة");
    assert.equal(formatQualificationLabel(null, "غير محدد"), "غير محدد");
    assert.equal(formatQualificationLabel(undefined, "—"), "—");
  });

  it("preserves custom qualification strings if not a predefined key", () => {
    assert.equal(formatQualificationLabel("بكالوريوس هندسة"), "بكالوريوس هندسة");
  });

  it("has exact labels defined in QUALIFICATION_LABELS map", () => {
    assert.equal(QUALIFICATION_LABELS.high, "مؤهل عالٍ");
    assert.equal(QUALIFICATION_LABELS.normal, "عادة");
  });
});

describe("Temp Storage & MDB Lifecycle Utilities", () => {
  it("safely creates destination directory and moves file", async () => {
    const testDir = path.join(os.tmpdir(), `elec-test-${Date.now()}`);
    const srcDir = path.join(testDir, "src");
    const destDir = path.join(testDir, "dest");
    await fs.mkdir(srcDir, { recursive: true });

    const srcFile = path.join(srcDir, "test.mdb");
    await fs.writeFile(srcFile, "mock-mdb-content");

    const movedPath = await safeMoveFile(srcFile, destDir, "archived.mdb");
    assert.equal(movedPath, path.join(destDir, "archived.mdb"));

    const content = await fs.readFile(movedPath, "utf-8");
    assert.equal(content, "mock-mdb-content");

    // Clean up testDir
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("cleans up stale temp files matching mdb-* prefix older than maxAge", async () => {
    const testDir = path.join(os.tmpdir(), `elec-cleanup-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    const staleFile = path.join(testDir, "mdb-stale.mdb");
    await fs.writeFile(staleFile, "stale");

    // Manually backdate mtime to 3 hours ago
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    await fs.utimes(staleFile, threeHoursAgo, threeHoursAgo);

    const freshFile = path.join(testDir, "mdb-fresh.mdb");
    await fs.writeFile(freshFile, "fresh");

    const unrelatedFile = path.join(testDir, "other-file.txt");
    await fs.writeFile(unrelatedFile, "unrelated");
    await fs.utimes(unrelatedFile, threeHoursAgo, threeHoursAgo);

    const cleaned = await cleanupStaleTempFiles(testDir, 2);
    assert.equal(cleaned, 1);

    const remaining = await fs.readdir(testDir);
    assert.ok(remaining.includes("mdb-fresh.mdb"));
    assert.ok(remaining.includes("other-file.txt"));
    assert.ok(!remaining.includes("mdb-stale.mdb"));

    // Clean up
    await fs.rm(testDir, { recursive: true, force: true });
  });
});
