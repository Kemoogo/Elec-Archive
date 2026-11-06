# Data Model Specification: ترقية فرع العمليات وأركان حرب والتكامل الشامل

**Feature**: `010-arkan-harb-upgrade`
**Date**: 2026-10-19

## 1. Mongoose Models Overview

```
┌────────────────────┐       ┌────────────────────┐
│      Mission       ├──────►│        Fax         │
└─────────┬──────────┘       └────────────────────┘
          │ (ref: officerId)
          ▼
┌────────────────────┐       ┌────────────────────┐
│      Officer       │◄──────┤     DutyRoster     │
└─────────▲──────────┘       └────────────────────┘
          │ (read-only sync)
          │
┌─────────┴──────────┐       ┌────────────────────┐
│ PositionAssignment │       │    IncidentLog     │
└────────────────────┘       └────────────────────┘
          ▲
          │ (auto-sync to rollcall)
┌─────────┴──────────┐
│    MedicalVisit    │
└────────────────────┘
```

---

## 2. Updated Model: `Mission`
* **File**: `next/lib/db/models/Mission.ts`
* **Shared Types**: `next/lib/db/models/Mission.shared.ts`

```typescript
export interface IMissionClearanceDoc {
  name: string;
  fileUrl: string;
  uploadedAt: Date;
}

export interface IMission {
  _id: Types.ObjectId;
  officerId: Types.ObjectId;                  // ref: Officer
  additionalOfficerIds?: Types.ObjectId[];    // ref: Officer
  missionType: "internal_daily" | "external_multiday";
  title: string;
  description?: string;
  destination?: string;
  linkedFax?: Types.ObjectId;                 // ref: Fax (Real DB reference)
  referenceLetterNumber?: string;             // Text fallback for offline/manual faxes
  startDate: Date;
  endDate?: Date | null;
  status: "scheduled" | "active" | "completed" | "cancelled" | "postponed";
  statusReason?: string;
  resultSummary?: string;
  
  // New Travel Order Fields
  travelOrderNumber?: string;                 // Official dispatch order number
  transportationMean?: string;                // e.g. "قطار حربي", "سيارة قيادة", "طيران"
  authorizedWeapons?: string;                 // e.g. "طبنجة حلوان 9 مم رقم 12345 وعدد 16 طلقة"
  
  // New Clearance & Completion Documents
  clearanceDocuments?: IMissionClearanceDoc[]; // PDF or image attachments
  
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 3. New Model: `DutyRoster` (سجل النوبتجيات والخدمات)
* **File**: `next/lib/db/models/DutyRoster.ts`
* **Shared Types**: `next/lib/db/models/DutyRoster.shared.ts`

```typescript
export type DutyType = 
  | "unit_duty"          // نوبتجي الوحدة
  | "guard_commander"    // قائد الحرس
  | "camp_officer"       // ضابط خفر
  | "store_guard"        // نوبتجي مستودعات
  | "security_duty"      // ضابط أمن الوحدة
  | "assistant_duty"     // مساعد نوبتجي
  | "custom";            // خدمة مخصصة

export interface IDutyRosterEntry {
  date: Date;                                 // تاريخ الخدمة
  dutyType: DutyType;
  dutyTitle: string;                          // مسمى الخدمة بالعربية
  assignedOfficerId: Types.ObjectId;          // الضابط المكلف الأصيل (ref: Officer)
  substituteOfficerId?: Types.ObjectId;       // الضابط البديل (ref: Officer)
  notes?: string;
  isHoliday: boolean;                         // عطلة رسمية أو يوم جمعة
}

export interface IDutyRoster {
  _id: Types.ObjectId;
  month: number;                              // 1 - 12
  year: number;                               // e.g. 2026
  status: "draft" | "submitted" | "approved";
  entries: IDutyRosterEntry[];
  approvedByCommander?: boolean;
  commanderDecisionDate?: Date;
  commanderNotes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 4. New Model: `IncidentLog` (يومية الحوادث والبلاغات)
* **File**: `next/lib/db/models/IncidentLog.ts`
* **Shared Types**: `next/lib/db/models/IncidentLog.shared.ts`

```typescript
export type IncidentPriority = "normal" | "urgent" | "top_secret_urgent";

export interface IIncidentLog {
  _id: Types.ObjectId;
  timestamp: Date;                            // توقيت البلاغ أو الإشارة بالدقيقة
  reportingEntity: string;                    // الجهة المُبلِغة
  subject: string;                            // موضوع البلاغ أو الإشارة
  details: string;                            // التفاصيل الدقيقة للواقعة
  priority: IncidentPriority;                 // درجة الأهمية
  actionTaken: string;                        // الإجراء الفوري المتخذ
  isCommanderNotified: boolean;               // هل تم إخطار القائد
  commanderInstructions?: string;             // تعليمات وقرار القائد
  recordedBy: Types.ObjectId;                 // ref: User
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 5. Rollcall Engine Integration Logic
* **File**: `next/lib/arkan-harb/rollcall-engine.ts`

تعديل دالة `calculateDailyRollcallEntries(targetDate)`:
1. استعلام `MedicalVisit` حيث `visitDate <= targetDate` وتاريخ انتهاء الراحة `>= targetDate`.
2. إذا كانت الراحة سارية -> تحديد حالة الضابط كـ `clinic` أو `rest` مع `isLocked: true`.
3. إذا وجد تحويل لمستشفى عسكري -> تحديد حالة الضابط كـ `hospital` وتخزين اسم المستشفى.
4. استعلام `DutyRoster` المعتمد لنفس التاريخ -> إذا كان الضابط مكلفاً كـ `unit_duty`، وسم الخانة بصفة "نوبتجي الوحدة".
