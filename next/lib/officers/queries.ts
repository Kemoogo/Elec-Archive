import { Types } from "mongoose";
import type { IOfficer, IOfficerDocument } from "@/lib/db/models/Officer";
import { RANK_LABELS, EMPLOYMENT_LABELS, OFFICER_TYPE_LABELS, OFFICER_WEAPON_LABELS } from "@/lib/db/models/Officer";

interface OfficerListItem {
  id: string;
  militaryId: string;
  seniorityNumber: string;
  fullName: string;
  rank: string;
  rankLabel: string;
  batch: string;
  type: string;
  typeLabel: string;
  weapon: string;
  weaponLabel: string;
  phone: string;
}

interface OfficerDetailData {
  id: string;
  militaryId: string;
  seniorityNumber: string;
  fullName: string;
  rank: string;
  rankLabel: string;
  unit: string;
  position: string;
  batch: string;
  type: string;
  typeLabel: string;
  weapon: string;
  weaponLabel: string;
  phone: string;
  nationalId: string;
  employmentStatus: string;
  employmentStatusLabel: string;
  joinDate: string;
  birthDate: string;
  file121Url: string;
  documents: OfficerDocData[];
  createdAt: string;
  updatedAt: string;
}

interface OfficerDocData {
  id: string;
  originalName: string;
  storedPath: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

type OfficerLean = Omit<IOfficer, "documents"> & {
  _id: Types.ObjectId;
  documents: (IOfficerDocument & { _id: Types.ObjectId })[];
};

export function serializeOfficerListItem(officer: OfficerLean): OfficerListItem {
  return {
    id: officer._id.toString(),
    militaryId: officer.militaryId,
    seniorityNumber: officer.seniorityNumber,
    fullName: officer.fullName,
    rank: officer.rank,
    rankLabel: RANK_LABELS[officer.rank] ?? officer.rank,
    batch: officer.batch ?? "",
    type: officer.type ?? "",
    typeLabel: officer.type ? (OFFICER_TYPE_LABELS[officer.type] ?? officer.type) : "",
    weapon: officer.weapon ?? "",
    weaponLabel: officer.weapon ? (OFFICER_WEAPON_LABELS[officer.weapon] ?? officer.weapon) : "",
    phone: officer.phone ?? "",
  };
}

export function serializeOfficerDetail(officer: OfficerLean): OfficerDetailData {
  return {
    id: officer._id.toString(),
    militaryId: officer.militaryId,
    seniorityNumber: officer.seniorityNumber,
    fullName: officer.fullName,
    rank: officer.rank,
    rankLabel: RANK_LABELS[officer.rank] ?? officer.rank,
    unit: officer.unit,
    position: officer.position,
    batch: officer.batch ?? "",
    type: officer.type ?? "",
    typeLabel: officer.type ? (OFFICER_TYPE_LABELS[officer.type] ?? officer.type) : "",
    weapon: officer.weapon ?? "",
    weaponLabel: officer.weapon ? (OFFICER_WEAPON_LABELS[officer.weapon] ?? officer.weapon) : "",
    phone: officer.phone ?? "",
    nationalId: officer.nationalId ?? "",
    employmentStatus: officer.employmentStatus ?? "inactive",
    employmentStatusLabel: EMPLOYMENT_LABELS[officer.employmentStatus] ?? officer.employmentStatus ?? "غير محدد",
    joinDate: officer.joinDate ? officer.joinDate.toISOString() : new Date().toISOString(),
    birthDate: officer.birthDate ? officer.birthDate.toISOString() : "",
    file121Url: officer.file121Url ?? "",
    documents: officer.documents.map((doc) => ({
      id: doc._id.toString(),
      originalName: doc.originalName,
      storedPath: doc.storedPath,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      uploadedAt: doc.uploadedAt ? doc.uploadedAt.toISOString() : new Date().toISOString(),
    })),
    createdAt: (officer.createdAt || new Date()).toISOString(),
    updatedAt: (officer.updatedAt || new Date()).toISOString(),
  };
}
