export interface IBatchClassification {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
}

export const DEFAULT_BATCH_CLASSIFICATIONS: IBatchClassification[] = [
  { id: "sig-nco", name: "صف إشارة", description: "صف ضباط إشارة", isDefault: true },
  { id: "voc-train", name: "تد مهني", description: "تدريب مهني", isDefault: true },
  { id: "sig-qj", name: "إشارة ق. ج", description: "إشارة قطاع / ق.ج", isDefault: true },
  { id: "sig-voc-qj", name: "إشارة تد مهني ق. ج", description: "إشارة تدريب مهني ق.ج", isDefault: true },
];

export function formatBatchName(mrhla: string): string {
  if (!mrhla) return "";
  const cleaned = mrhla.trim();
  if (cleaned.length === 5) {
    const year = cleaned.slice(0, 4);
    const cycle = cleaned.slice(4);
    return `مرحلة ${year}/${cycle}`;
  }
  return `مرحلة ${cleaned}`;
}
