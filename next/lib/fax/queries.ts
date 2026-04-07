import type { Types } from "mongoose";
import type { IFax } from "@/lib/db/models/Fax";

export interface SerializedFaxListItem {
  _id: string;
  faxNumber: string;
  date: string;
  fromEntity: string;
  subject: string;
  status: string;
  uploadedBy: { _id: string; fullName: string };
  createdAt: string;
}

export interface SerializedFaxDetail {
  _id: string;
  faxNumber: string;
  date: string;
  fromEntity: string;
  toEntity: string;
  subject: string;
  fileUrl: string;
  fileType: string;
  status: string;
  commanderDecision: string | null;
  commanderDecisionAt: string | null;
  forwardedToType: string | null;
  forwardedToId: { _id: string; fullName: string } | null;
  forwardedToDepartment: string | null;
  closedBy: { _id: string; fullName: string } | null;
  closedAt: string | null;
  relatedFaxes: Array<{
    _id: string;
    faxNumber: string;
    date: string;
    subject: string;
    status: string;
  }>;
  uploadedBy: { _id: string; fullName: string };
  createdAt: string;
  updatedAt: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function buildFaxListSort(
  sortParam: string,
): Record<string, 1 | -1> {
  const desc = sortParam.startsWith("-");
  const field = desc ? sortParam.slice(1) : sortParam;

  const allowedFields = ["date", "faxNumber", "status", "createdAt"];
  const sortField = allowedFields.includes(field) ? field : "date";

  return { [sortField]: desc ? -1 : 1 };
}

export function serializeFaxListItem(fax: IFax & { _id: Types.ObjectId; uploadedBy: { _id: Types.ObjectId; fullName: string } }): SerializedFaxListItem {
  return {
    _id: fax._id.toString(),
    faxNumber: fax.faxNumber,
    date: fax.date ? fax.date.toISOString() : new Date().toISOString(),
    fromEntity: fax.fromEntity,
    subject: fax.subject,
    status: fax.status,
    uploadedBy: {
      _id: fax.uploadedBy._id.toString(),
      fullName: fax.uploadedBy.fullName,
    },
    createdAt: (fax.createdAt || new Date()).toISOString(),
  };
}
