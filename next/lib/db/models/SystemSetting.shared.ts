export interface ISystemSettingDto {
  key: string;
  value: string;
  description?: string;
  updatedBy?: string;
  updatedAt?: string | Date;
}

export const DEFAULT_UNIT_NAME = "قيادة الوحدة العسكرية";
