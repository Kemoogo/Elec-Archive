import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { logAuditEvent } from "@/lib/auth/audit";
import { errors } from "@/lib/auth/errors";
import { MedicalPatient } from "@/lib/db/models/MedicalPatient";
import { MedicalVisit } from "@/lib/db/models/MedicalVisit";
import { Medicine } from "@/lib/db/models/Medicine";
import { PatientMedicalRecord } from "@/lib/db/models/PatientMedicalRecord";
import { patientMedicalRecordSchema } from "@/lib/validations/medical-record";
import { handleApiError } from "@/lib/utils/api-error";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import { aggregatePatientMedications } from "@/lib/medical/queries";
import type { Types } from "mongoose";
import type { PopulatedVisit } from "@/lib/medical/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  const medicalPermission = auth.user!.permissions.medical;
  if (medicalPermission === "none") {
    return NextResponse.json(
      { success: false, error: errors.insufficientPermissions },
      { status: 403 }
    );
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "read");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  try {
    await connectToDatabase();

    const { patientId } = await params;

    const patient = await MedicalPatient.findOne({ patientId: patientId.trim() }).lean();
    if (!patient) {
      return NextResponse.json(
        { success: false, error: "لم يتم العثور على المريض" },
        { status: 404 }
      );
    }

    const record = await PatientMedicalRecord.findOne({ patientId: patientId.trim() }).lean();

    const visits = await MedicalVisit.find({ patientId: (patient as { _id: Types.ObjectId })._id })
      .sort({ visitDate: -1 })
      .populate("patientId", "patientId patientName")
      .lean();

    const medications = await aggregatePatientMedications((patient as { _id: Types.ObjectId })._id);

    // Extract unique medicine IDs for visits pre-fetching
    const visitMedicineIds = new Set<string>();
    for (const visit of visits) {
      const dispensed = visit.dispensedMedicines || [];
      for (const d of dispensed) {
        if (d.medicineId) {
          visitMedicineIds.add(d.medicineId.toString());
        }
      }
    }

    // Pre-fetch all unique medicines in a single database query
    const routeMedicines = await Medicine.find({ _id: { $in: Array.from(visitMedicineIds) } })
      .select("name concentration unit")
      .lean();

    const routeMedicinesMap = new Map<string, string>();
    for (const m of routeMedicines) {
      const fullName = `${m.name} ${m.concentration || ""} ${m.unit || ""}`.trim();
      routeMedicinesMap.set((m._id as Types.ObjectId).toString(), fullName);
    }

    const visitsWithMeds = (visits as unknown as PopulatedVisit[]).map((visit) => {
      const dispensedMedicines = (visit.dispensedMedicines || []).map((d) => {
        const medId = (d.medicineId as Types.ObjectId).toString();
        const medicineName = routeMedicinesMap.get(medId) || "دواء غير معروف";
        return {
          medicineName,
          quantity: d.quantity as number,
        };
      });
      return {
        _id: (visit._id as Types.ObjectId).toString(),
        visitDate: (visit.visitDate as Date).toISOString(),
        diagnosis: visit.diagnosis as string,
        treatment: visit.treatment as string,
        dispensedMedicines,
        restType: visit.restType || "none",
        restDays: visit.restDays || 0,
        fitnessCategory: visit.fitnessCategory || "fit",
      };
    });

    await logAuditEvent({
      userId: auth.user!.id,
      userName: auth.user!.fullName,
      action: "VIEW",
      module: "medical",
      targetId: (patient as { _id: Types.ObjectId })._id.toString(),
      description: `عرض الملف الطبي للمريض ${patient.patientName} (${patient.patientId})`,
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      data: {
        patientName: patient.patientName,
        record: record
          ? {
            patientId: record.patientId,
            patientName: record.patientName,
            allergies: record.allergies,
            chronicConditions: record.chronicConditions,
            bloodType: record.bloodType,
            medicalNotes: record.medicalNotes,
            severityNotes: record.severityNotes,
            version: record.version,
          }
          : null,
        visits: visitsWithMeds,
        medications,
      },
    });
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء تحميل الملف الطبي");
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  if (auth.user!.permissions.medical !== "edit") {
    return NextResponse.json(
      { success: false, error: errors.insufficientPermissions },
      { status: 403 }
    );
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "write");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  try {
    await connectToDatabase();

    const { patientId } = await params;

    const patient = await MedicalPatient.findOne({ patientId: patientId.trim() });
    if (!patient) {
      return NextResponse.json(
        { success: false, error: "لم يتم العثور على المريض" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = patientMedicalRecordSchema.safeParse({
      ...body,
      patientId: body.patientId || patientId.trim(),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "بيانات غير صالحة", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { patientName, allergies, chronicConditions, bloodType, medicalNotes, severityNotes, version } = parsed.data;

    const existingRecord = await PatientMedicalRecord.findOne({ patientId: patientId.trim() });

    if (existingRecord) {
      if (existingRecord.version !== version) {
        return NextResponse.json(
          {
            success: false,
            error: "تم تعديل هذه البيانات بواسطة مستخدم آخر، يرجى المراجعة والمحاولة مرة أخرى",
            latestData: {
              patientId: existingRecord.patientId,
              patientName: existingRecord.patientName,
              allergies: existingRecord.allergies,
              chronicConditions: existingRecord.chronicConditions,
              bloodType: existingRecord.bloodType,
              medicalNotes: existingRecord.medicalNotes,
              severityNotes: existingRecord.severityNotes,
              version: existingRecord.version,
            },
          },
          { status: 409 }
        );
      }

      existingRecord.patientName = patientName;
      existingRecord.allergies = allergies;
      existingRecord.chronicConditions = chronicConditions;
      existingRecord.bloodType = bloodType;
      existingRecord.medicalNotes = medicalNotes;
      existingRecord.severityNotes = severityNotes;
      existingRecord.version = version + 1;

      await existingRecord.save();

      await logAuditEvent({
        userId: auth.user!.id,
        userName: auth.user!.fullName,
        action: "UPDATE",
        module: "medical",
        targetId: patient._id.toString(),
        description: `تحديث الملف الطبي للمريض ${patient.patientName} (${patient.patientId})`,
        ipAddress: ip,
      });

      return NextResponse.json({
        success: true,
        data: {
          record: {
            patientId: existingRecord.patientId,
            patientName: existingRecord.patientName,
            allergies: existingRecord.allergies,
            chronicConditions: existingRecord.chronicConditions,
            bloodType: existingRecord.bloodType,
            medicalNotes: existingRecord.medicalNotes,
            severityNotes: existingRecord.severityNotes,
            version: existingRecord.version,
          },
          action: "updated",
        },
      });
    } else {
      const newRecord = await PatientMedicalRecord.create({
        patientId: patientId.trim(),
        patientName,
        allergies,
        chronicConditions,
        bloodType,
        medicalNotes,
        severityNotes,
        version: version + 1,
      });

      await logAuditEvent({
        userId: auth.user!.id,
        userName: auth.user!.fullName,
        action: "CREATE",
        module: "medical",
        targetId: patient._id.toString(),
        description: `إنشاء الملف الطبي للمريض ${patient.patientName} (${patient.patientId})`,
        ipAddress: ip,
      });

      return NextResponse.json({
        success: true,
        data: {
          record: {
            patientId: newRecord.patientId,
            patientName: newRecord.patientName,
            allergies: newRecord.allergies,
            chronicConditions: newRecord.chronicConditions,
            bloodType: newRecord.bloodType,
            medicalNotes: newRecord.medicalNotes,
            severityNotes: newRecord.severityNotes,
            version: newRecord.version,
          },
          action: "created",
        },
      });
    }
  } catch (error) {
    return handleApiError(error, "حدث خطأ أثناء تحديث الملف الطبي");
  }
}
