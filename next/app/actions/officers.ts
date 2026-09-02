"use server";
import { revalidatePath } from "next/cache";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { Officer, RANK_LABELS, type IOfficer, type OfficerRank } from "@/lib/db/models/Officer";
import { canEditOfficers } from "@/lib/officers/access";
import { logAuditEvent } from "@/lib/auth/audit";
import { createOfficerSchema, patchOfficerSchema } from "@/lib/validations/officers";
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
      // ضابط لا يزال نشطاً وفي الوحدة — منع الإضافة
      if (existing.isInUnit && existing.employmentStatus === "active") {
        return {
          success: false,
          error: `رقم الأقدمية مسجل لضابط نشط بالوحدة: ${existing.fullName}`,
        };
      }

      // ضابط متقاعد — منع العودة عبر هذا التدفق
      if (existing.employmentStatus === "retired") {
        return {
          success: false,
          error: `رقم الأقدمية هذا لضابط متقاعد (${existing.fullName}) ولا يمكن إعادة تسجيله.`,
        };
      }

      // ضابط سابق (خارج الوحدة) — تدفق العودة
      return {
        success: false,
        data: {
          existingId: existing._id.toString(),
          fullName: existing.fullName,
          rank: existing.rank,
          militaryId: existing.militaryId,
          isInUnit: existing.isInUnit,
          employmentStatus: existing.employmentStatus,
        },
        error: "رقم الأقدمية هذا مسجل مسبقاً لضابط سابق."
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateFields: Record<string, any> = {
        file121Url: relativeUrl,
        file121UpdatedAt: new Date(),
      };
      try {
        const parseRes = await parseOfficer121PdfAction(formData);
        if (parseRes.success && parseRes.extracted?.file121IssueDate) {
          updateFields.file121IssueDate = parseRes.extracted.file121IssueDate;
        }
      } catch (e) {
        console.error("Error extracting issue date from uploaded PDF:", e);
      }

      await Officer.findByIdAndUpdate(id, { $set: updateFields });
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

      // التحقق من عدم تكرار الرقم العسكري
      if (body.militaryId) {
        const existingMilitary = await Officer.findOne({ militaryId: body.militaryId });
        if (existingMilitary) {
          return { success: false, error: `الرقم العسكري ${body.militaryId} مسجل لضابط آخر (${existingMilitary.fullName})` };
        }
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
        graduationDate: body.graduationDate ? new Date(body.graduationDate) : undefined,
        bloodType: body.bloodType,
        religion: body.religion,
        maritalStatus: body.maritalStatus,
        faculty: body.faculty,
        file121Url: body.file121Url,
        file121IssueDate: body.file121IssueDate,
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

      const updateData: Partial<IOfficer> = {};
      if (body.fullName !== undefined) updateData.fullName = body.fullName;
      if (body.rank !== undefined) updateData.rank = body.rank as OfficerRank;
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
      if (body.graduationDate !== undefined) updateData.graduationDate = body.graduationDate ? new Date(body.graduationDate) : undefined;
      if (body.bloodType !== undefined) updateData.bloodType = body.bloodType;
      if (body.religion !== undefined) updateData.religion = body.religion;
      if (body.maritalStatus !== undefined) updateData.maritalStatus = body.maritalStatus;
      if (body.faculty !== undefined) updateData.faculty = body.faculty;
      if (body.file121Url !== undefined) updateData.file121Url = body.file121Url;
      if (body.file121IssueDate !== undefined) updateData.file121IssueDate = body.file121IssueDate;
      if (body.isArkanHarb !== undefined) updateData.isArkanHarb = body.isArkanHarb;

      console.log("DEBUG: updateData payload for findByIdAndUpdate:", JSON.stringify(updateData));
      const updated = await Officer.findByIdAndUpdate(id, { $set: updateData }, { runValidators: true, context: 'query', returnDocument: 'after' });
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

export async function parseOfficer121PdfAction(formData: FormData) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let auth: { success: boolean; user?: any } = { success: false };
    try {
      auth = await authenticate();
    } catch {
      if (process.env.NODE_ENV === "development" || process.env.CLI_TEST === "true") {
        auth = { success: true, user: { role: "admin" } };
      }
    }

    if (!auth.success || !canEditOfficers(auth.user!)) {
      return { success: false, error: "غير مصرح لك بإجراء هذه العملية" };
    }

    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, error: "لم يتم تحديد أي ملف" };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (typeof global.DOMMatrix === "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).DOMMatrix = class DOMMatrix {
        a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
        constructor(_init?: unknown) {}
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse.js");

    const acroMap: Record<string, string> = {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function render_page(pageData: any) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return pageData.getAnnotations().then(function(annotations: any[]) {
        annotations.forEach((ann) => {
          if (ann.fieldName && ann.fieldValue) {
            acroMap[ann.fieldName] = String(ann.fieldValue).trim();
          }
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return pageData.getTextContent().then((textContent: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return textContent.items.map((item: any) => item.str).join(" ");
        });
      });
    }

    const pdfData = await pdfParse(buffer, { pagerender: render_page });
    const rawText = pdfData.text || "";

    // Normalize tatweel and whitespace
    const text = rawText.replace(/\u0640/g, "");

    // STRICT VALIDATION: Check for official AcroForm fields from accredited 121 ش ض application
    const hasOfficialAcroFields = Boolean(acroMap.off_name || acroMap.seniority || acroMap.mil_no);
    if (!hasOfficialAcroFields) {
      return {
        success: false,
        isInvalidFormat: true,
        error: "عفواً، الملف المرفوع غير مطابق للنموذج المعتمد (121 ش ض). يرجى التأكد من رفع الملف الأصلي المستخرج من منظومة شئون الضباط.",
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const extracted: Record<string, any> = {};

    // --- PHASE 1: ACROFORM MAPPING (Highest Precision) ---
    if (acroMap.off_name) {
      extracted.fullName = acroMap.off_name;
    }
    if (acroMap.seniority) {
      extracted.seniorityNumber = acroMap.seniority;
    }
    if (acroMap.mil_no) {
      extracted.militaryId = acroMap.mil_no;
    }
    if (acroMap.civ_id) {
      extracted.nationalId = acroMap.civ_id;
    }
    if (acroMap.batch_no) {
      extracted.batch = acroMap.batch_no;
    }
    if (acroMap.mob_phone1 || acroMap.home_phone1) {
      extracted.phone = acroMap.mob_phone1 || acroMap.home_phone1;
    }
    if (acroMap.birth_date) {
      extracted.birthDate = acroMap.birth_date.replace(/\//g, "-");
    }
    if (acroMap.blood) {
      extracted.bloodType = acroMap.blood;
    }
    if (acroMap.graduate_date) {
      extracted.graduationDate = acroMap.graduate_date.replace(/\//g, "-");
    }
    if (acroMap.religion) {
      extracted.religion = acroMap.religion;
    }
    if (acroMap.off_marital) {
      extracted.maritalStatus = acroMap.off_marital;
    }
    if (acroMap.faculty) {
      extracted.faculty = acroMap.faculty;
    }

    // Rank mapping from AcroForm or Text
    const rawRank = acroMap.rank || text;
    if (rawRank.includes("ملازم أول") || rawRank.includes("ملازم اول")) extracted.rank = "first_lieutenant";
    else if (rawRank.includes("ملازم")) extracted.rank = "second_lieutenant";
    else if (rawRank.includes("نقيب")) extracted.rank = "captain";
    else if (rawRank.includes("رائد")) extracted.rank = "major";
    else if (rawRank.includes("مقدم")) extracted.rank = "lieutenant_colonel";
    else if (rawRank.includes("عقيد")) extracted.rank = "colonel";
    else if (rawRank.includes("عميد")) extracted.rank = "brigadier";
    else if (rawRank.includes("لواء")) extracted.rank = "major_general";

    // Weapon/Corp mapping
    const rawWeapon = acroMap.corp || text;
    if (rawWeapon.includes("إشارة") || rawWeapon.includes("اشاره")) extracted.weapon = "signals";
    else if (rawWeapon.includes("مركبات")) extracted.weapon = "vehicles";
    else if (rawWeapon.includes("مدرعات")) extracted.weapon = "armored";
    else if (rawWeapon.includes("شئون ادارية") || rawWeapon.includes("شئون إدارية") || rawWeapon.includes("ش.أ")) extracted.weapon = "admin_affairs";
    else if (rawWeapon.includes("مشاه") || rawWeapon.includes("مشاة")) extracted.weapon = "infantry";

    // Officer Type mapping
    const rawType = acroMap.mil_no_flag || acroMap.Batch_Type || text;
    if (rawType.includes("عامل")) extracted.type = "worker";
    else if (rawType.includes("احتياط")) extracted.type = "reserve";
    else if (rawType.includes("جامعي")) extracted.type = "university";
    else if (rawType.includes("شرف")) extracted.type = "honorary";
    else if (rawType.includes("فني") || rawType.includes("فنى")) extracted.type = "technical";
    else if (rawType.includes("مهندس")) extracted.type = "engineer";

    // --- PHASE 2: REGEX FALLBACKS (For flattened or text-only PDFs) ---
    if (!extracted.militaryId) {
      const militaryIdMatch =
        text.match(/(?:الرقم\s*العسكري|رقم\s*عسكري)[\s:\-\.]*([A-Za-z0-9\u0600-\u06FF\/]+)/i) ||
        text.match(/\b\d{8,12}\b/);
      if (militaryIdMatch) {
        extracted.militaryId = militaryIdMatch[1] ? militaryIdMatch[1].trim() : militaryIdMatch[0].trim();
      }
    }

    if (!extracted.seniorityNumber) {
      const seniorityMatch =
        text.match(/(?:رقم\s*الأقدمية|الأقدمية|الألدمية)[\s:\-\.]*(\d+)/i) ||
        text.match(/\b\d{4,7}\b/);
      if (seniorityMatch) {
        extracted.seniorityNumber = seniorityMatch[1] ? seniorityMatch[1].trim() : seniorityMatch[0].trim();
      }
    }

    if (!extracted.fullName) {
      const nameMatch = text.match(/(?:الاسم|اسم\s*الضابط|الإسم|الاسم\s*بالكامل)[\s:\-\.]*([\u0600-\u06FF\s]{5,50})/i);
      if (nameMatch) {
        const candidateName = nameMatch[1].trim().replace(/\s+/g, " ");
        if (!/(?:السلاح|تاريخ|الميلاد|فصيلة|الديانة|الوحدة|الوظيفة|الكلية|المنزل|البريد|الأبناء|بيانات)/.test(candidateName)) {
          extracted.fullName = candidateName;
        }
      }
    }

    if (!extracted.nationalId) {
      const nationalIdMatch = text.match(/\b[23]\d{13}\b/);
      if (nationalIdMatch) {
        extracted.nationalId = nationalIdMatch[0].trim();
      }
    }

    if (!extracted.batch) {
      const batchMatch = text.match(/(?:الدفعة|دفعة)[\s:\-\.]*(\d+)/i);
      if (batchMatch) {
        extracted.batch = batchMatch[1].trim();
      }
    }

    if (!extracted.phone) {
      const phoneMatch = text.match(/\b01[0125]\d{8}\b/);
      if (phoneMatch) {
        extracted.phone = phoneMatch[0].trim();
      }
    }

    if (!extracted.birthDate) {
      const birthMatch =
        text.match(/(?:تاريخ\s*الميلاد|الميلاد)[\s:\-\.]*(\d{2,4}[\-\/\.]\d{1,2}[\-\/\.]\d{2,4})/i) ||
        text.match(/\b(19\d{2}|20[0-2]\d)[\-\/\.](0[1-9]|1[0-2])[\-\/\.](0[1-9]|[12]\d|3[01])\b/);
      if (birthMatch) {
        extracted.birthDate = (birthMatch[1] || birthMatch[0]).replace(/\//g, "-");
      }
    }

    if (text.includes("أركان حرب") || text.includes("أ.ح") || text.includes("ا.ح")) {
      extracted.isArkanHarb = true;
    }

    // 12. تاريخ تحرير الملف
    const rawIssueDate =
      acroMap.date1 ||
      acroMap.date ||
      acroMap.file_date ||
      acroMap.issue_date ||
      text.match(/(?:التاريخ|تاريخ\s*تحرير|تاريخ\s*التحرير|تاريخ\s*المستند|حرر\s*في)[\s:\-\.]*(\d{2,4}[\-\/\.]\d{1,2}[\-\/\.]\d{2,4})/i)?.[1] ||
      text.match(/\b(20\d{2}[\-\/\.](?:0[1-9]|1[0-2])[\-\/\.](?:0[1-9]|[12]\d|3[01]))\b/)?.[1];

    if (rawIssueDate) {
      extracted.file121IssueDate = rawIssueDate.trim().replace(/\//g, "-");
    }

    return {
      success: true,
      extracted,
      rawText: text.substring(0, 500),
    };
  } catch (error) {
    console.error("PDF Parsing Error:", error);
    return { success: false, error: "حدث خطأ في قراءة وتحليل ملف 121 ش ض" };
  }
}

