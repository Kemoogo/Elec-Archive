import { Schema, model, models, type Document, type Types } from "mongoose";

export const OFFICER_RANKS = [
  "second_lieutenant",
  "first_lieutenant",
  "captain",
  "major",
  "lieutenant_colonel",
  "colonel",
  "brigadier",
  "major_general",
] as const;

export type OfficerRank = (typeof OFFICER_RANKS)[number];

export const EMPLOYMENT_STATUSES = ["active", "inactive", "retired"] as const;
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];

export const OFFICER_TYPES = ["worker", "reserve", "university", "honorary", "technical", "engineer"] as const;
export type OfficerType = (typeof OFFICER_TYPES)[number];

export const OFFICER_WEAPONS = ["signals", "vehicles", "armored", "admin_affairs", "infantry"] as const;
export type OfficerWeapon = (typeof OFFICER_WEAPONS)[number];

export const RANK_LABELS: Record<OfficerRank, string> = {
  second_lieutenant: "ملازم",
  first_lieutenant: "ملازم أول",
  captain: "نقيب",
  major: "رائد",
  lieutenant_colonel: "مقدم",
  colonel: "عقيد",
  brigadier: "عميد",
  major_general: "لواء",
};

export const EMPLOYMENT_LABELS: Record<EmploymentStatus, string> = {
  active: "نشط",
  inactive: "غير نشط",
  retired: "متقاعد",
};

export const OFFICER_TYPE_LABELS: Record<OfficerType, string> = {
  worker: "عامل",
  reserve: "احتياط",
  university: "جامعي",
  honorary: "شرف",
  technical: "فني",
  engineer: "مهندس",
};

export const OFFICER_WEAPON_LABELS: Record<OfficerWeapon, string> = {
  signals: "إشارة",
  vehicles: "مركبات",
  armored: "مدرعات",
  admin_affairs: "شئون ادارية",
  infantry: "مشاه",
};

export interface IOfficerDocument {
  _id: Types.ObjectId;
  originalName: string;
  storedPath: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: Date;
  uploadedBy: Types.ObjectId;
}

export interface IOfficer extends Document {
  militaryId: string;
  seniorityNumber: string;
  fullName: string;
  rank: OfficerRank;
  unit: string;
  position: string;
  batch?: string;
  type?: OfficerType;
  weapon?: OfficerWeapon;
  phone?: string;
  nationalId?: string;
  employmentStatus: EmploymentStatus;
  joinDate: Date;
  birthDate?: Date;
  file121Url?: string;
  documents: IOfficerDocument[];
  createdAt: Date;
  updatedAt: Date;
}

const OfficerDocumentSchema = new Schema<IOfficerDocument>(
  {
    originalName: { type: String, required: true },
    storedPath: { type: String, required: true },
    mimeType: { type: String, required: true, default: "application/pdf" },
    sizeBytes: { type: Number, required: true, min: 1, max: 5 * 1024 * 1024 },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: true },
);

const OfficerSchema = new Schema<IOfficer>(
  {
    militaryId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^\d{5,7}$/, "الرقم العسكري يجب أن يكون بين 5 إلى 7 أرقام."],
    },
    seniorityNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^\d+(?:[A-Za-z\u0600-\u06FF]+\d*)?$/, "رقم الأقدمية غير صالح. يجب أن يبدأ برقم، ويمكن أن يحتوي على حروف، ولا يمكن إضافة لاحقة رقمية إلا بعد حرف."],
    },
    fullName: { type: String, required: true, trim: true },
    rank: {
      type: String,
      required: true,
      enum: OFFICER_RANKS,
    },
    unit: { type: String, trim: true },
    position: { type: String, trim: true },
    batch: { type: String, trim: true },
    type: { type: String, enum: OFFICER_TYPES },
    weapon: { type: String, enum: OFFICER_WEAPONS },
    phone: { type: String, trim: true },
    nationalId: { type: String, trim: true, sparse: true, unique: true },
    employmentStatus: {
      type: String,
      required: true,
      enum: EMPLOYMENT_STATUSES,
      default: "active",
    },
    joinDate: { type: Date, required: true },
    birthDate: { type: Date },
    file121Url: { type: String, trim: true },
    documents: {
      type: [OfficerDocumentSchema],
      validate: {
        validator: (docs: IOfficerDocument[]) => docs.length <= 20,
        message: "لا يمكن إرفاق أكثر من 20 مستندًا لكل ضابط",
      },
    },
  },
  { timestamps: true },
);

OfficerSchema.index({ fullName: 1 });
OfficerSchema.index({ seniorityNumber: 1 });
OfficerSchema.index({ employmentStatus: 1, fullName: 1 });
OfficerSchema.index({ createdAt: -1 });

OfficerSchema.pre("validate", function () {
  if (this.birthDate && this.joinDate && this.birthDate >= this.joinDate) {
    this.invalidate("birthDate", "تاريخ الميلاد يجب أن يكون قبل تاريخ الانضمام");
  }
  if (!this.seniorityNumber && this.militaryId) {
    this.seniorityNumber = this.militaryId;
  }
});

export const Officer = models.Officer ?? model<IOfficer>("Officer", OfficerSchema);
