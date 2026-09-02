import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { canEditModule } from "@/lib/auth/authorization";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { PositionAssignment } from "@/lib/db/models/PositionAssignment";
import { handleApiError } from "@/lib/utils/api-error";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { updatePositionAssignmentSchema } from "@/lib/validations/arkan-harb";
import { mergeHistoryIntervals } from "@/lib/utils/history-merge";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // 1. Auth
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  // 2. RBAC
  if (!canEditModule(auth.user!, "arkan_harb") && !canEditModule(auth.user!, "officers")) {
    return NextResponse.json({ success: false, error: errors.insufficientPermissions }, { status: 403 });
  }

  // 3. Rate limit
  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "write");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  await connectToDatabase();

  try {
    const position = await PositionAssignment.findById(id);
    if (!position) {
      return NextResponse.json({ success: false, error: "الوظيفة غير موجودة" }, { status: 404 });
    }

    const body: unknown = await request.json();
    const parsed = updatePositionAssignmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: errors.validationFailed, details: parsed.error.issues },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const now = new Date();

    if (data.positionTitle !== undefined) position.positionTitle = data.positionTitle;
    if (data.department !== undefined) position.department = data.department;
    if (data.orderNumber !== undefined) position.orderNumber = data.orderNumber;
    if (data.notes !== undefined) position.notes = data.notes;

    if (data.hasNoSubstitute !== undefined) {
      position.set("hasNoSubstitute", Boolean(data.hasNoSubstitute));
      position.markModified("hasNoSubstitute");
      if (position.hasNoSubstitute) {
        // If position is marked as having no substitute, close any open substitute history
        const currentSubIds = (position.substituteOfficerIds || []).map((s: { toString(): string }) => s.toString());
        currentSubIds.forEach((currId: string) => {
          const openSubEntry = position.assignmentHistory.find(
            (h: { role: string; officerId: { toString(): string }; endDate?: Date | null }) =>
              h.role === "substitute" && h.officerId.toString() === currId && !h.endDate
          );
          if (openSubEntry) {
            openSubEntry.endDate = now;
          }
        });
        position.substituteOfficerIds = [];
      }
    }

    // Handle Primary Officer changes & Continuous History
    if (data.primaryOfficerId !== undefined) {
      const currentPrimaryStr = position.primaryOfficerId ? position.primaryOfficerId.toString() : "";
      const newPrimaryStr = data.primaryOfficerId && data.primaryOfficerId.trim() !== "" ? data.primaryOfficerId.trim() : "";

      if (currentPrimaryStr !== newPrimaryStr) {
        // If old primary exists, close history entry
        if (currentPrimaryStr) {
          const openPrimaryEntry = position.assignmentHistory.find(
            (h: { role: string; officerId: { toString(): string }; endDate?: Date | null }) =>
              h.role === "primary" && h.officerId.toString() === currentPrimaryStr && !h.endDate
          );
          if (openPrimaryEntry) {
            openPrimaryEntry.endDate = now;
          }
        }

        // If new primary set, add history entry if not already open
        if (newPrimaryStr) {
          const existingOpenEntry = position.assignmentHistory.find(
            (h: { role: string; officerId: { toString(): string }; endDate?: Date | null }) =>
              h.role === "primary" && h.officerId.toString() === newPrimaryStr && !h.endDate
          );
          if (!existingOpenEntry) {
            position.assignmentHistory.push({
              officerId: newPrimaryStr,
              role: "primary",
              startDate: now,
              endDate: null,
            });
          }
          position.primaryOfficerId = newPrimaryStr;
          position.primaryStartDate = now;
        } else {
          position.primaryOfficerId = null;
          position.primaryStartDate = null;
        }
      }
    }

    // Handle Substitute Officers changes & Continuous History
    if (!position.hasNoSubstitute && data.substituteOfficerIds !== undefined) {
      const newSubIds = (data.substituteOfficerIds || []).filter((s) => s && s.trim() !== "");
      const currentSubIds = (position.substituteOfficerIds || []).map((s: { toString(): string }) => s.toString());

      // Find removed substitutes -> close their history
      currentSubIds.forEach((currId: string) => {
        if (!newSubIds.includes(currId)) {
          const openSubEntry = position.assignmentHistory.find(
            (h: { role: string; officerId: { toString(): string }; endDate?: Date | null }) =>
              h.role === "substitute" && h.officerId.toString() === currId && !h.endDate
          );
          if (openSubEntry) {
            openSubEntry.endDate = now;
          }
        }
      });

      // Find added substitutes -> add open history
      newSubIds.forEach((newId) => {
        if (!currentSubIds.includes(newId)) {
          const existingOpenEntry = position.assignmentHistory.find(
            (h: { role: string; officerId: { toString(): string }; endDate?: Date | null }) =>
              h.role === "substitute" && h.officerId.toString() === newId && !h.endDate
          );
          if (!existingOpenEntry) {
            position.assignmentHistory.push({
              officerId: newId,
              role: "substitute",
              startDate: now,
              endDate: null,
            });
          }
        }
      });

      position.substituteOfficerIds = newSubIds;
    }

    // Merge overlapping or contiguous history intervals for the same officer and role
    if (position.assignmentHistory && position.assignmentHistory.length > 1) {
      const rawEntries = position.assignmentHistory.map((h: { _id?: unknown; officerId: unknown; role: "primary" | "substitute"; startDate: Date; endDate?: Date | null; notes?: string }) => ({
        _id: h._id,
        officerId: h.officerId,
        role: h.role,
        startDate: h.startDate,
        endDate: h.endDate,
        notes: h.notes,
      }));
      const mergedEntries = mergeHistoryIntervals(rawEntries);
      position.assignmentHistory = mergedEntries as unknown as typeof position.assignmentHistory;
    }

    position.updatedBy = auth.user!.id;
    await position.save();

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "UPDATE",
      module: "arkan_harb",
      targetId: id,
      description: `تم تحديث بيانات وتسكين وظيفة: ${position.positionTitle}`,
      ipAddress: ip,
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء تحديث الوظيفة");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // 1. Auth
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  // 2. RBAC
  if (!canEditModule(auth.user!, "arkan_harb") && !canEditModule(auth.user!, "officers")) {
    return NextResponse.json({ success: false, error: errors.insufficientPermissions }, { status: 403 });
  }

  // 3. Rate limit
  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "write");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  await connectToDatabase();

  try {
    const position = await PositionAssignment.findById(id);
    if (!position) {
      return NextResponse.json({ success: false, error: "الوظيفة غير موجودة" }, { status: 404 });
    }

    await PositionAssignment.findByIdAndDelete(id);

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "DELETE",
      module: "arkan_harb",
      targetId: id,
      description: `تم حذف وظيفة: ${position.positionTitle} من الهيكل`,
      ipAddress: ip,
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء حذف الوظيفة");
  }
}