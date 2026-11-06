/**
 * Official Translation Mappings for Egyptian Governorates and Blood Types
 * Used in military recruit databases (src_soldiers / gyabhabs).
 */

export interface IGovernorateInfo {
  code: number;
  name: string;
  recruitmentArea?: string;
  phoneCode?: string;
  notes?: string;
}

export const EGYPT_GOVERNORATES: Record<number, IGovernorateInfo> = {
  1: { code: 1, name: "القاهرة", recruitmentArea: "القاهرة (هـ)", phoneCode: "02" },
  2: { code: 2, name: "الإسكندرية", recruitmentArea: "الإسكندرية (س)", phoneCode: "03" },
  3: { code: 3, name: "بورسعيد", recruitmentArea: "الزقازيق (ز)" },
  4: { code: 4, name: "السويس", recruitmentArea: "الزقازيق (ز)", phoneCode: "069" },
  11: { code: 11, name: "دمياط", recruitmentArea: "المنصورة (ص)" },
  12: { code: 12, name: "الدقهلية", recruitmentArea: "المنصورة (ص)", phoneCode: "055" },
  13: { code: 13, name: "الشرقية", recruitmentArea: "الزقازيق (ز)" },
  14: { code: 14, name: "القليوبية", recruitmentArea: "القاهرة (هـ)", phoneCode: "013" },
  15: { code: 15, name: "كفر الشيخ", recruitmentArea: "المنصورة (ص)" },
  16: { code: 16, name: "الغربية", recruitmentArea: "طنطا (ط)", phoneCode: "040" },
  17: { code: 17, name: "المنوفية", recruitmentArea: "طنطا (ط)", phoneCode: "048" },
  18: { code: 18, name: "البحيرة", recruitmentArea: "الإسكندرية (س)" },
  19: { code: 19, name: "الإسماعيلية", recruitmentArea: "الزقازيق (ز)" },
  21: { code: 21, name: "الجيزة", recruitmentArea: "الجيزة (ج)", phoneCode: "02" },
  22: { code: 22, name: "بني سويف", recruitmentArea: "المنيا (م)" },
  23: { code: 23, name: "الفيوم", recruitmentArea: "الجيزة (ج)" },
  24: { code: 24, name: "المنيا", recruitmentArea: "المنيا (م)" },
  25: { code: 25, name: "أسيوط", recruitmentArea: "أسيوط (ى)" },
  26: { code: 26, name: "سوهاج", recruitmentArea: "أسيوط (ى)" },
  27: { code: 27, name: "قنا", recruitmentArea: "قنا (ق)" },
  28: { code: 28, name: "أسوان", recruitmentArea: "قنا (ق)" },
  29: { code: 29, name: "الأقصر", recruitmentArea: "قنا (ق)" },
  31: { code: 31, name: "البحر الأحمر", recruitmentArea: "قنا (ق)" },
  32: { code: 32, name: "الوادي الجديد", recruitmentArea: "أسيوط (ى)" },
  33: { code: 33, name: "مطروح", recruitmentArea: "الإسكندرية (س)" },
  34: { code: 34, name: "شمال سيناء", recruitmentArea: "الزقازيق (ز)" },
  35: { code: 35, name: "جنوب سيناء", recruitmentArea: "الزقازيق (ز)" },
  99: { code: 99, name: "متوسطة", notes: "تصنيف داخلي استثنائي" },
  0: { code: 0, name: "بدون / غير محدد" },
};

export const BLOOD_TYPES_MAP: Record<number, string> = {
  1: "A",
  2: "AB",
  3: "B",
  4: "O",
  0: "غير محدد",
};

export function normalizeArabicText(text: string): string {
  return text
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

const GOVERNORATE_NAME_LOOKUP = new Map<string, IGovernorateInfo>();
for (const info of Object.values(EGYPT_GOVERNORATES)) {
  if (info.code === 0) continue;
  GOVERNORATE_NAME_LOOKUP.set(info.name, info);
  GOVERNORATE_NAME_LOOKUP.set(normalizeArabicText(info.name), info);
}

/**
 * Maps raw governorate value (numeric code or text name) to official governorate info.
 */
export function mapGovernorate(raw: string | number | null | undefined): {
  name?: string;
  code?: number;
  recruitmentArea?: string;
  phoneCode?: string;
} {
  if (raw === null || raw === undefined) {
    return {};
  }

  const str = String(raw).trim();
  if (!str) return {};

  const num = Number(str);
  if (!isNaN(num) && str !== "") {
    const found = EGYPT_GOVERNORATES[num];
    if (found) {
      if (num === 0) {
        return { code: 0 };
      }
      return {
        name: found.name,
        code: found.code,
        recruitmentArea: found.recruitmentArea,
        phoneCode: found.phoneCode,
      };
    }
  }

  // Text lookup
  const norm = normalizeArabicText(str);
  const foundByName = GOVERNORATE_NAME_LOOKUP.get(str) ?? GOVERNORATE_NAME_LOOKUP.get(norm);
  if (foundByName) {
    return {
      name: foundByName.name,
      code: foundByName.code,
      recruitmentArea: foundByName.recruitmentArea,
      phoneCode: foundByName.phoneCode,
    };
  }

  // Fallback: return raw string
  return { name: str };
}

/**
 * Maps raw blood_type value (numeric code or text) to standard blood group letter.
 */
export function mapBloodType(raw: string | number | null | undefined): {
  bloodType?: string;
  bloodTypeCode?: number;
} {
  if (raw === null || raw === undefined) {
    return {};
  }

  const str = String(raw).trim();
  if (!str) return {};

  const num = Number(str);
  if (!isNaN(num) && str !== "") {
    if (num === 0) {
      return { bloodTypeCode: 0 };
    }
    const mapped = BLOOD_TYPES_MAP[num];
    if (mapped && mapped !== "غير محدد") {
      return { bloodType: mapped, bloodTypeCode: num };
    }
    return { bloodTypeCode: num };
  }

  const upper = str.toUpperCase();
  if (["A", "AB", "B", "O", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].includes(upper)) {
    let code: number | undefined;
    if (upper.startsWith("AB")) code = 2;
    else if (upper.startsWith("A")) code = 1;
    else if (upper.startsWith("B")) code = 3;
    else if (upper.startsWith("O")) code = 4;
    return { bloodType: upper, bloodTypeCode: code };
  }

  return { bloodType: str };
}

/**
 * Retrieve governorate info by code.
 */
export function getGovernorateByCode(code: number): IGovernorateInfo | undefined {
  return EGYPT_GOVERNORATES[code];
}

/**
 * Retrieve governorate info by name.
 */
export function getGovernorateByName(name: string): IGovernorateInfo | undefined {
  const norm = normalizeArabicText(name);
  return GOVERNORATE_NAME_LOOKUP.get(name) ?? GOVERNORATE_NAME_LOOKUP.get(norm);
}

/**
 * Retrieve all registered governorates list.
 */
export function getAllGovernorates(): IGovernorateInfo[] {
  return Object.values(EGYPT_GOVERNORATES).filter((g) => g.code !== 0);
}

/**
 * Formats governorate for display in tables, cards, and tooltips.
 * If raw is numeric code (e.g. 12) or string ("12"), returns "الدقهلية".
 */
export function formatGovernorateDisplay(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return "—";
  const mapped = mapGovernorate(raw);
  return mapped.name || (raw ? String(raw) : "—");
}

/**
 * Formats blood type for display.
 * If raw is numeric code (e.g. 1..4), returns "A", "AB", "B", "O".
 */
export function formatBloodTypeDisplay(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return "—";
  const mapped = mapBloodType(raw);
  return mapped.bloodType || (raw && raw !== "0" && raw !== 0 ? String(raw) : "—");
}

/**
 * Filter dropdown options for Governorates.
 */
export const GOVERNORATE_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "جميع المحافظات" },
  ...getAllGovernorates().map((g) => ({
    value: g.name,
    label: `${g.name}${g.recruitmentArea ? ` (${g.recruitmentArea})` : ""}`,
  })),
];

/**
 * Filter dropdown options for Blood Types.
 */
export const BLOOD_TYPE_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "جميع الفصائل" },
  { value: "A", label: "فصيلة A" },
  { value: "AB", label: "فصيلة AB" },
  { value: "B", label: "فصيلة B" },
  { value: "O", label: "فصيلة O" },
];
