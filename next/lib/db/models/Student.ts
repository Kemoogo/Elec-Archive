import { Schema, model, models, type Document, type Types } from "mongoose";
import type {
  StudentStatus,
  QualificationType,
  DistributionStatus,
  StudentLocationStatus,
  IRelocationDetails,
  IUnitPersonnelDetails,
  IDisciplinaryRecord,
  IShatbHistory,
} from "./Student.shared";

export * from "./Student.shared";

export interface IStudentDocument {
  name: string;
  fileUrl: string;
  uploadedAt: Date;
}

export interface IStudent extends Document {
  studentId: string;
  militaryNo: string;
  fullName: string;
  mrhla: string;
  mrhlaName?: string;
  nationalNo?: string;
  solasyNo?: string;
  birthDate?: Date;
  tagneedDate?: Date;
  tasrehDate?: Date;
  qualification?: QualificationType;
  qualificationName?: string;
  classificationId?: string;
  classificationName?: string;
  locationStatus: StudentLocationStatus;
  relocationDetails?: IRelocationDetails;
  unitPersonnelDetails?: IUnitPersonnelDetails;
  governorate?: string;
  governorateCode?: number;
  recruitmentArea?: string;
  address?: string;
  bloodType?: string;
  bloodTypeCode?: number;
  enrollDate: Date;
  status: StudentStatus;
  distributionStatus: DistributionStatus;
  distributionSetAt?: Date;
  distributionSetBy?: Types.ObjectId;
  isStriken: boolean;
  shatbDate?: Date;
  shatbOrderNo?: string;
  shatbReason?: string;
  shatbHistory: IShatbHistory[];
  disciplinaryRecords: IDisciplinaryRecord[];
  guardianName?: string;
  guardianRelation?: string;
  guardianPhone?: string;
  documents: IStudentDocument[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DisciplinaryRecordSchema = new Schema<IDisciplinaryRecord>(
  {
    type: { type: String, enum: ["absence", "detention"], required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    totalDays: { type: Number },
    source: { type: String, enum: ["mdb_import", "manual"], default: "mdb_import" },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const ShatbHistorySchema = new Schema<IShatbHistory>(
  {
    shatbDate: { type: Date, required: true },
    shatbOrderNo: { type: String, required: true, trim: true },
    shatbReason: { type: String, required: true, trim: true },
    strickenBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    strickenAt: { type: Date, default: Date.now },
    reversalReason: { type: String, trim: true },
    reversedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reversedAt: { type: Date },
  },
  { _id: true }
);

const RelocationDetailsSchema = new Schema<IRelocationDetails>(
  {
    destination: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    orderNo: { type: String, required: true, trim: true },
    reason: { type: String, trim: true },
    relocatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    relocatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const UnitPersonnelDetailsSchema = new Schema<IUnitPersonnelDetails>(
  {
    transferDate: { type: Date, required: true },
    orderNo: { type: String, required: true, trim: true },
    assignedRole: { type: String, trim: true },
    transferredBy: { type: Schema.Types.ObjectId, ref: "User" },
    transferredAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const StudentSchema = new Schema<IStudent>(
  {
    studentId: { type: String, required: true, unique: true, trim: true },
    militaryNo: { type: String, required: true, unique: true, trim: true, index: true },
    fullName: { type: String, required: true, trim: true },
    mrhla: { type: String, required: true, trim: true, index: true },
    mrhlaName: { type: String, trim: true },
    nationalNo: { type: String, trim: true },
    solasyNo: { type: String, trim: true },
    birthDate: { type: Date },
    tagneedDate: { type: Date },
    tasrehDate: { type: Date, index: true },
    qualification: {
      type: String,
      enum: ["high", "above_avg", "average", "normal"],
      default: "normal",
    },
    qualificationName: { type: String, trim: true },
    classificationId: { type: String, trim: true, index: true },
    classificationName: { type: String, trim: true, index: true },
    locationStatus: {
      type: String,
      enum: ["in_unit", "relocated", "transferred_to_unit_personnel"],
      default: "in_unit",
      index: true,
    },
    relocationDetails: { type: RelocationDetailsSchema },
    unitPersonnelDetails: { type: UnitPersonnelDetailsSchema },
    governorate: { type: String, trim: true, index: true },
    governorateCode: { type: Number, index: true },
    recruitmentArea: { type: String, trim: true },
    address: { type: String, trim: true },
    bloodType: { type: String, trim: true },
    bloodTypeCode: { type: Number },
    enrollDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["active", "graduated", "inactive", "withdrawn", "transferred_personnel"],
      default: "active",
      index: true,
    },
    distributionStatus: {
      type: String,
      enum: [
        "distributed_to_unit",
        "halt_transfer",
        "without_distribution",
        "stage_remnants",
        "unspecified",
      ],
      default: "unspecified",
      index: true,
    },
    distributionSetAt: { type: Date },
    distributionSetBy: { type: Schema.Types.ObjectId, ref: "User" },
    isStriken: { type: Boolean, default: false, index: true },
    shatbDate: { type: Date },
    shatbOrderNo: { type: String, trim: true },
    shatbReason: { type: String, trim: true },
    shatbHistory: [ShatbHistorySchema],
    disciplinaryRecords: [DisciplinaryRecordSchema],
    guardianName: { type: String, trim: true },
    guardianRelation: { type: String, trim: true },
    guardianPhone: { type: String, trim: true },
    documents: [
      {
        name: { type: String, required: true },
        fileUrl: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

StudentSchema.index({ fullName: 1 });
StudentSchema.index({ mrhla: 1, status: 1 });
StudentSchema.index({ mrhla: 1, locationStatus: 1 });
StudentSchema.index({ mrhla: 1, classificationId: 1 });
StudentSchema.index({ mrhla: 1, isStriken: 1 });

export const Student = models.Student ?? model<IStudent>("Student", StudentSchema);
