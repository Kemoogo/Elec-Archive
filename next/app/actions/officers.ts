"use server";
import { revalidatePath } from "next/cache";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { Officer } from "@/lib/db/models/Officer";
import { canEditOfficers } from "@/lib/officers/access";
import { logAuditEvent } from "@/lib/auth/audit";
import { createOfficerSchema, patchOfficerSchema } from "@/lib/validations/officers";
import { RANK_LABELS } from "@/lib/db/models/Officer";
import type { OfficerRank } from "@/lib/db/models/Officer";
import { join } from "path";
import { writeFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";

export async function checkSeniorityAction(seniorityNumber: string) {
  try {
    const auth = await authenticate();
    if (!auth.success || !canEditOfficers(auth.user!)) {
      return { success: false, error: "غير مصرح لك بإجراء هذه العملية" };
    }

    if (!seniorityNumber) {
      return { success: false, error: "رقم الأقدمية مطلوب" };
    }

    await connectToDatabase();

    const existing = await Officer.findOne({ seniorityNumber }).lean();

    if (existing) {
      return {
        success: false,
        data: {
          existingId: existing._id.toString(),
          fullName: existing.fullName,
          rank: existing.rank,
          militaryId: existing.militaryId,
          isInUnit: existing.isInUnit,
        },
        error: "رقم الأقدمية هذا مسجل مسبقاً لضابط آخر."
      };
    }

    return { success: true };
  } catch (error) {
    console.error("DEBUG: Seniority Check Error", error);
    return { success: false, error: "حدث خطأ أثناء فحص البيانات" };
  }
}

export async function uploadOfficerFile121Action(formData: FormData) {
  console.log("DEBUG: uploadOfficerFile121Action started");
  try {
    const auth = await authenticate();
    if (!auth.success || !canEditOfficers(auth.user!)) {
      console.log("DEBUG: Auth failed in uploadOfficerFile121Action");
      return { success: false, error: "غير مصرح لك" };
    }

    const id = formData.get("id") as string;
    const reqMilitaryId = formData.get("militaryId") as string;
    const file = formData.get("file") as File;
    console.log("DEBUG: File received:", file?.name, file?.size, file?.type, "id:", id, "reqMilitaryId:", reqMilitaryId);

    if (!file || (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith('.pdf'))) {
      console.log("DEBUG: File type validation failed");
      return { success: false, error: "يُرجى رفع ملف PDF فقط" };
    }

    await connectToDatabase();

    let militaryId = "";
    let officer = null;

    if (!id || id === "new") {
      if (!reqMilitaryId) {
        return { success: false, error: "الرقم العسكري مطلوب لرفع الملف للضابط الجديد" };
      }
      militaryId = reqMilitaryId;
    } else {
      officer = await Officer.findById(id);
      if (!officer) {
        return { success: false, error: "الضابط غير موجود" };
      }
      militaryId = officer.militaryId;
    }

    const targetDir = join(process.cwd(), "public", "uploads", "officers");
    if (!existsSync(targetDir)) {
      await mkdir(targetDir, { recursive: true });
    }

    // Rename to militaryId.pdf
    const fileName = `${militaryId}.pdf`;
    const filePath = join(targetDir, fileName);

    // If officer had a file with different path, remove it (cleanup)
    if (officer?.file121Url) {
       const oldPath = join(process.cwd(), "public", officer.file121Url);
       if (existsSync(oldPath)) {
         try { await unlink(oldPath); } catch (e) { console.error("Error deleting old file:", e); }
       }
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    const relativeUrl = `/uploads/officers/${fileName}`;
    if (officer) {
      await Officer.findByIdAndUpdate(id, { $set: { file121Url: relativeUrl } });
      revalidatePath("/officers");
    }

    return { success: true, data: { fileUrl: relativeUrl } };
  } catch (error) {
    console.error("Upload Error:", error);
    return { success: false, error: "حدث خطأ أثناء رفع الملف" };
  }
}

export async function deleteOfficerFile121Action(id: string) {
  try {
    const auth = await authenticate();
    if (!auth.success || !canEditOfficers(auth.user!)) {
      return { success: false, error: "غير مصرح لك" };
    }

    await connectToDatabase();

    const officer = await Officer.findById(id);
    if (!officer || !officer.file121Url) {
      return { success: false, error: "لا يوجد ملف للحذف" };
    }

    const filePath = join(process.cwd(), "public", officer.file121Url);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }

    await Officer.findByIdAndUpdate(id, { $unset: { file121Url: "" } });
    revalidatePath("/officers");

    return { success: true };
  } catch (error) {
    console.error("Delete Error:", error);
    return { success: false, error: "حدث خطأ أثناء حذف الملف" };
  }
}

export async function saveOfficerAction(id: string | null, data: Record<string, unknown>) {
  try {
    const auth = await authenticate();
    if (!auth.success || !canEditOfficers(auth.user!)) {
      return { success: false, error: "غير مصرح لك" };
    }

    await connectToDatabase();

    if (!id) {
      // CREATE
      const parsed = createOfficerSchema.safeParse(data);
      if (!parsed.success) {
        return { success: false, error: "بيانات غير صالحة" };
      }

      const body = parsed.data;
      const existing = await Officer.findOne({ seniorityNumber: body.seniorityNumber });
      
      if (existing) {
        if (existing.employmentStatus !== "active") {
          return {
            success: false,
            error: "ضابط سابق بهذا رقم الأقدمية",
            data: {
              existingId: existing._id.toString(),
              fullName: existing.fullName,
              rank: existing.rank,
              employmentStatus: existing.employmentStatus,
            },
          };
        }
        return { success: false, error: "رقم الأقدمية مسجل بالفعل لضابط بالوحدة" };
      }

      const officer = await Officer.create({
        militaryId: body.militaryId,
        seniorityNumber: body.seniorityNumber,
        fullName: body.fullName,
        rank: body.rank,
        unit: body.unit,
        position: body.position,
        batch: body.batch,
        type: body.type,
        weapon: body.weapon,
        phone: body.phone,
        nationalId: body.nationalId,
        employmentStatus: body.employmentStatus,
        isInUnit: true,
        joinDate: body.joinDate ? new Date(body.joinDate) : new Date(),
        birthDate: body.birthDate ? new Date(body.birthDate) : undefined,
        file121Url: body.file121Url,
        isArkanHarb: body.isArkanHarb,
      });

      const { ServiceHistory } = await import("@/lib/db/models/ServiceHistory");
      await ServiceHistory.create({
        officerId: officer._id,
        type: "join",
        action: "join",
        date: officer.joinDate,
        createdBy: auth.user!.id,
        updatedBy: auth.user!.id,
      });

      await logAuditEvent({
        userId: auth.user!.id,
        userName: auth.user!.fullName,
        action: "CREATE",
        module: "officers",
        targetId: officer._id.toString(),
        description: `إضافة ضابط جديد: ${RANK_LABELS[officer.rank as OfficerRank]} / ${officer.fullName}`,
        ipAddress: "Server Action",
      });

      revalidatePath("/officers");
      return { success: true };
    } else {
      // UPDATE
      const parsed = patchOfficerSchema.safeParse(data);
      if (!parsed.success) {
        return { success: false, error: "بيانات غير صالحة" };
      }

      const body = parsed.data;
      const officer = await Officer.findById(id);
      
      if (!officer) {
        return { success: false, error: "الضابط غير موجود" };
      }

      const updateData: Record<string, any> = {};
      if (body.fullName !== undefined) updateData.fullName = body.fullName;
      if (body.rank !== undefined) updateData.rank = body.rank;
      if (body.unit !== undefined) updateData.unit = body.unit;
      if (body.position !== undefined) updateData.position = body.position;
      if (body.batch !== undefined) updateData.batch = body.batch;
      if (body.type !== undefined) updateData.type = body.type;
      if (body.weapon !== undefined) updateData.weapon = body.weapon;
      if (body.phone !== undefined) updateData.phone = body.phone;
      if (body.nationalId !== undefined) updateData.nationalId = body.nationalId;
      if (body.employmentStatus !== undefined) updateData.employmentStatus = body.employmentStatus;
      
      if (body.isInUnit !== undefined) {
        updateData.isInUnit = body.isInUnit;
        const oldStatus = officer.isInUnit;
        
        if (oldStatus !== body.isInUnit && data.movement) {
          const movement = data.movement as { action?: string; date?: string; notes?: string };
          const { ServiceHistory } = await import("@/lib/db/models/ServiceHistory");
          await ServiceHistory.create({
            officerId: id,
            type: body.isInUnit ? "return" : "leave",
            action: movement.action || (body.isInUnit ? "return" : "transfer"),
            date: new Date(movement.date || Date.now()),
            notes: movement.notes,
            createdBy: auth.user!.id,
            updatedBy: auth.user!.id,
          });
        }
      }
      if (body.joinDate !== undefined) updateData.joinDate = new Date(body.joinDate);
      if (body.birthDate !== undefined) updateData.birthDate = body.birthDate ? new Date(body.birthDate) : undefined;
      if (body.file121Url !== undefined) updateData.file121Url = body.file121Url;
      if (body.isArkanHarb !== undefined) updateData.isArkanHarb = body.isArkanHarb;

      console.log("DEBUG: updateData payload for findByIdAndUpdate:", JSON.stringify(updateData));
      const updated = await Officer.findByIdAndUpdate(id, { $set: updateData }, { runValidators: true, context: 'query', new: true });
      console.log("DEBUG: Document after update:", updated?.fullName, updated?.rank);

      await logAuditEvent({
        userId: auth.user!.id,
        userName: auth.user!.fullName,
        action: "UPDATE",
        module: "officers",
        targetId: id,
        description: `تحديث بيانات الضابط: ${RANK_LABELS[officer.rank as OfficerRank]} / ${officer.fullName}`,
        ipAddress: "Server Action",
      });

      revalidatePath("/officers");
      return { success: true };
    }
  } catch (error) {
    console.error("Save Officer Error:", error);
    return { success: false, error: "حدث خطأ أثناء حفظ البيانات" };
  }
}
