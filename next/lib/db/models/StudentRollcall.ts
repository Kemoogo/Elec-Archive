import { Schema, model, models, type Document, type Types } from "mongoose";
import type {
  RollcallStatus,
  IStudentRollcallEntry,
} from "./StudentRollcall.shared";

export * from "./StudentRollcall.shared";

export interface IStudentRollcallReopenLog {
  reopenedBy: Types.ObjectId;
  reopenedAt: Date;
  reason?: string;
}

export interface IStudentRollcallEntryDoc extends Omit<IStudentRollcallEntry, "studentId"> {
  studentId: Types.ObjectId;
}

export interface IStudentRollcall extends Document {
  date: Date;
  mrhla: string;
  status: RollcallStatus;
  totalStrength: number;
  presentCount: number;
  outOfficialCount: number;
  outDisciplinaryCount: number;
  entries: IStudentRollcallEntryDoc[];
  preparedBy: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  reopenHistory: IStudentRollcallReopenLog[];
  closedAt?: Date;
  overrideNotes?: string;
  overrideBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StudentRollcallEntrySchema = new Schema<IStudentRollcallEntryDoc>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    militaryNo: { type: String, required: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: [
        "present",
        "duty_service",
        "clinic",
        "leave",
        "sick_leave",
        "rest",
        "hospital",
        "police_academy_exam",
        "military_academy_exam",
        "mission",
        "absent",
        "prison",
        "court",
      ],
      default: "present",
      required: true,
    },
    notes: { type: String, trim: true },
    destination: { type: String, trim: true },
    expectedReturnDate: { type: Date },
    isOngoingDisciplinary: { type: Boolean, default: false },
  },
  { _id: false }
);

const StudentRollcallReopenLogSchema = new Schema<IStudentRollcallReopenLog>(
  {
    reopenedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reopenedAt: { type: Date, default: Date.now },
    reason: { type: String, trim: true },
  },
  { _id: false }
);

const StudentRollcallSchema = new Schema<IStudentRollcall>(
  {
    date: { type: Date, required: true, index: true },
    mrhla: { type: String, required: true, trim: true, index: true },
    status: {
      type: String,
      enum: ["draft", "approved", "closed"],
      default: "draft",
      required: true,
      index: true,
    },
    totalStrength: { type: Number, required: true, default: 0 },
    presentCount: { type: Number, required: true, default: 0 },
    outOfficialCount: { type: Number, required: true, default: 0 },
    outDisciplinaryCount: { type: Number, required: true, default: 0 },
    entries: [StudentRollcallEntrySchema],
    preparedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    reopenHistory: [StudentRollcallReopenLogSchema],
    closedAt: { type: Date },
    overrideNotes: { type: String, trim: true },
    overrideBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

StudentRollcallSchema.index({ date: 1, mrhla: 1 }, { unique: true });

export const StudentRollcall =
  models.StudentRollcall ?? model<IStudentRollcall>("StudentRollcall", StudentRollcallSchema);
