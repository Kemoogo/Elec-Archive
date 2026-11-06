import { execFile } from "child_process";
import { promisify } from "util";
import type { QualificationType } from "@/lib/db/models/Student.shared";
import { mapGovernorate, mapBloodType } from "./mappings";

const execFileAsync = promisify(execFile);

export interface IRawSoldierRow {
  MILITARY_NO?: string;
  SOLDIER_NAME?: string;
  MRHLA?: string;
  national_no?: string;
  SOLASY_NO?: string;
  BIRTH_DATE?: string;
  TAGNEED_DATE?: string;
  TASREH_DATE?: string;
  MOAHEL_CODE?: string;
  MOAHEL_NAME?: string;
  GOVERNORATE_FK?: string;
  GOVERNORATE_NAME?: string;
  ADDRESS?: string;
  BLOOD_TYPE?: string;
  rel_name?: string;
  rel_tel?: string;
  rel_degree?: string;
  [key: string]: string | undefined;
}

export interface IRawDisciplinaryRow {
  MILITARY_NO?: string;
  military_no?: string;
  start_date?: string;
  end_date?: string;
  total_days?: string;
  type?: string;
  [key: string]: string | undefined;
}

export interface IParsedDisciplinaryRecord {
  militaryNo: string;
  type: "absence" | "detention";
  startDate: Date;
  endDate?: Date;
  totalDays?: number;
  source: "mdb_import";
}

export interface IParsedStudentRow {
  militaryNo: string;
  fullName: string;
  mrhla: string;
  mrhlaName: string;
  nationalNo?: string;
  solasyNo?: string;
  birthDate?: Date;
  tagneedDate?: Date;
  tasrehDate?: Date;
  qualification: QualificationType;
  qualificationName?: string;
  governorate?: string;
  governorateCode?: number;
  recruitmentArea?: string;
  address?: string;
  bloodType?: string;
  bloodTypeCode?: number;
  guardianName?: string;
  guardianPhone?: string;
  guardianRelation?: string;
}

export interface IMdbParseResult {
  soldiers: IParsedStudentRow[];
  disciplinary: IParsedDisciplinaryRecord[];
  warnings: string[];
  totalRawRows: number;
  duplicateCount: number;
}

/**
 * Executes mdb-tables to check tables in an Access .mdb file.
 */
export async function getMdbTables(filePath: string): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync("/usr/bin/mdb-tables", ["-1", filePath], {
      maxBuffer: 10 * 1024 * 1024,
    });
    return stdout
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);
  } catch (error) {
    throw new Error(`فشل فحص جداول ملف قاعدة البيانات: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Executes mdb-export to extract table content as CSV.
 */
export async function exportMdbTableToCsv(filePath: string, tableName: string): Promise<string> {
  try {
    // -R "\n" to use newline as record delimiter, UTF-8 output
    const { stdout } = await execFileAsync(
      "/usr/bin/mdb-export",
      ["-b", "raw", filePath, tableName],
      {
        maxBuffer: 50 * 1024 * 1024,
      }
    );
    return stdout;
  } catch (error) {
    throw new Error(`فشل استخراج جدول ${tableName}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Parses a CSV string into an array of objects.
 */
export function parseCsv(csvText: string): Record<string, string>[] {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Simple CSV line splitter that handles quotes
  const parseLine = (line: string): string[] => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, "").trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, "").trim());
    return values;
  };

  const headers = parseLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length === 0) continue;
    const row: Record<string, string> = {};
    for (let h = 0; h < headers.length; h++) {
      row[headers[h]] = values[h] ?? "";
    }
    rows.push(row);
  }

  return rows;
}

/**
 * Maps raw qualification code/name to enum
 */
export function mapQualification(code?: string, name?: string): QualificationType {
  const text = `${code ?? ""} ${name ?? ""}`.toLowerCase();
  if (text.includes("عليا") || text.includes("عال") || text.includes("high") || code === "1") {
    return "high";
  }
  if (text.includes("فوق") || code === "2") {
    return "above_avg";
  }
  if (text.includes("متوسط") || code === "3") {
    return "average";
  }
  return "normal";
}

/**
 * Parses date safely
 */
export function parseDateSafe(val?: string): Date | undefined {
  if (!val) return undefined;
  const d = new Date(val);
  return isNaN(d.getTime()) ? undefined : d;
}

/**
 * Main parser function for recruitment MDB files
 */
export async function parseMdbRecruitmentFile(filePath: string): Promise<IMdbParseResult> {
  const tables = await getMdbTables(filePath);

  // Check required table src_soldiers (case-insensitive check)
  const soldiersTableName = tables.find((t) => t.toLowerCase() === "src_soldiers");
  if (!soldiersTableName) {
    throw new Error("ملف قاعدة البيانات غير متوافق: لم يتم العثور على جدول الجنود (src_soldiers)");
  }

  // 1. Export and parse src_soldiers
  const soldiersCsv = await exportMdbTableToCsv(filePath, soldiersTableName);
  const rawSoldiers = parseCsv(soldiersCsv) as IRawSoldierRow[];

  const soldiersMap = new Map<string, IParsedStudentRow>();
  const warnings: string[] = [];
  let duplicateCount = 0;

  for (const raw of rawSoldiers) {
    // Find military number
    const milNo = (raw.MILITARY_NO ?? raw.military_no ?? raw.MILITARYNO ?? "").trim();
    const name = (raw.SOLDIER_NAME ?? raw.soldier_name ?? raw.NAME ?? "").trim();
    const mrhla = (raw.MRHLA ?? raw.mrhla ?? "").trim();

    if (!milNo) {
      warnings.push(`تم استبعاد سجل لعدم وجود رقم عسكري (الاسم: ${name || "غير محدد"})`);
      continue;
    }

    if (soldiersMap.has(milNo)) {
      duplicateCount++;
    }

    // Qualification
    const qualName = (raw.MOAHEL_NAME ?? raw.moahel_name ?? raw.MOAHEL ?? "").trim();
    const qualCode = (raw.MOAHEL_CODE ?? raw.moahel_code ?? "").trim();
    const qualification = mapQualification(qualCode, qualName);

    // Format mrhla name
    let mrhlaName = `مرحلة ${mrhla}`;
    if (mrhla.length >= 5) {
      mrhlaName = `مرحلة ${mrhla.substring(0, 4)}/${mrhla.substring(4)}`;
    }

    // Governorate mapping (support both numeric codes 1..35, 99 and text names)
    const rawGov =
      raw.mohafza ??
      raw.MOHAFZA ??
      raw.GOVERNORATE ??
      raw.governorate ??
      raw.GOVERNORATE_FK ??
      raw.GOVERNORATE_NAME ??
      raw.mohafza_code ??
      raw.MOHAFZA_CODE;
    const govMapped = mapGovernorate(rawGov);

    // Blood type mapping (support codes 1..4, 0 and text groups)
    const rawBlood =
      raw.blood_type ??
      raw.BLOOD_TYPE ??
      raw.bloodType ??
      raw.BLOODTYPE ??
      raw.fasila ??
      raw.FASILA ??
      raw.blood_code ??
      raw.BLOOD_CODE;
    const bloodMapped = mapBloodType(rawBlood);

    const parsed: IParsedStudentRow = {
      militaryNo: milNo,
      fullName: name || "غير مدون",
      mrhla: mrhla || "عام",
      mrhlaName,
      nationalNo: (raw.national_no ?? raw.NATIONAL_NO ?? "").trim() || undefined,
      solasyNo: (raw.SOLASY_NO ?? raw.solasy_no ?? "").trim() || undefined,
      birthDate: parseDateSafe(raw.BIRTH_DATE ?? raw.birth_date),
      tagneedDate: parseDateSafe(raw.TAGNEED_DATE ?? raw.tagneed_date),
      tasrehDate: parseDateSafe(raw.TASREH_DATE ?? raw.tasreh_date),
      qualification,
      qualificationName: qualName || undefined,
      governorate: govMapped.name,
      governorateCode: govMapped.code,
      recruitmentArea: govMapped.recruitmentArea,
      address: (raw.ADDRESS ?? raw.address ?? "").trim() || undefined,
      bloodType: bloodMapped.bloodType,
      bloodTypeCode: bloodMapped.bloodTypeCode,
      guardianName: (raw.rel_name ?? raw.REL_NAME ?? "").trim() || undefined,
      guardianPhone: (raw.rel_tel ?? raw.REL_TEL ?? "").trim() || undefined,
      guardianRelation: (raw.rel_degree ?? raw.REL_DEGREE ?? "").trim() || undefined,
    };

    soldiersMap.set(milNo, parsed);
  }

  // 2. Export and parse gyabhabs if exists
  const disciplinaryTableName = tables.find((t) => t.toLowerCase() === "gyabhabs");
  const disciplinaryRecords: IParsedDisciplinaryRecord[] = [];

  if (disciplinaryTableName) {
    try {
      const discCsv = await exportMdbTableToCsv(filePath, disciplinaryTableName);
      const rawDisc = parseCsv(discCsv) as IRawDisciplinaryRow[];

      for (const d of rawDisc) {
        const milNo = (d.MILITARY_NO ?? d.military_no ?? "").trim();
        if (!milNo) continue;

        const start = parseDateSafe(d.start_date ?? d.START_DATE);
        if (!start) continue;

        const end = parseDateSafe(d.end_date ?? d.END_DATE);
        const days = parseInt(d.total_days ?? d.TOTAL_DAYS ?? "0", 10) || undefined;
        const typeStr = (d.type ?? d.TYPE ?? "").toLowerCase();
        const type = typeStr.includes("حبس") || typeStr.includes("detention") || typeStr.includes("habs")
          ? "detention"
          : "absence";

        disciplinaryRecords.push({
          militaryNo: milNo,
          type,
          startDate: start,
          endDate: end,
          totalDays: days,
          source: "mdb_import",
        });
      }
    } catch {
      warnings.push("تعذر قراءة جدول الغياب والحبس (gyabhabs) من الملف.");
    }
  }

  return {
    soldiers: Array.from(soldiersMap.values()),
    disciplinary: disciplinaryRecords,
    warnings,
    totalRawRows: rawSoldiers.length,
    duplicateCount,
  };
}
