# API Contracts: موديول شئون الطلاب وترقية MDB
## دورة حياة الدفعة، مصفوفة التصنيفات، ومحرك الترحيل والنقل

**Feature**: `011-students-mdb-upgrade`  
**Date**: 2026-11-05 (Updated for Classification, Batch Workflow & Relocation Engine)

---

## 1. رفع وتحليل ملف Access (.mdb) والمعاينة الذكية
- **المسار:** `POST /api/students/upload-mdb`
- **الصلاحية:** `students: edit`
- **نوع الطلب:** `multipart/form-data` (ملف `.mdb` بحد أقصى 50MB)

### الاستجابة الناجحة (200 OK):
```json
{
  "success": true,
  "data": {
    "fileId": "temp-uploads/mdb-1730678901.mdb",
    "totalRecords": 320,
    "stages": [
      { "mrhla": "20241", "name": "مرحلة 2024/1", "count": 280 },
      { "mrhla": "20234", "name": "مرحلة 2023/4", "count": 40 }
    ],
    "newCount": 270,
    "updateCount": 50,
    "excludedCount": 0,
    "warningsCount": 2,
    "disciplinaryCount": 14,
    "previewRows": [
      {
        "militaryNo": "1202410001",
        "fullName": "محمد أحمد إبراهيم علي",
        "mrhla": "20241",
        "classificationName": "صف إشارة",
        "qualification": "high",
        "qualificationName": "بكالوريوس هندسة",
        "governorate": "القاهرة",
        "bloodType": "A+",
        "isNew": true
      }
    ]
  }
}
```

---

## 2. تأكيد استيراد وتحديث البيانات (Upsert Confirm)
- **المسار:** `POST /api/students/import-confirm`
- **الصلاحية:** `students: edit`
- **المدخلات (JSON):**
```json
{
  "fileId": "temp-uploads/mdb-1730678901.mdb"
}
```

### الاستجابة الناجحة (200 OK):
```json
{
  "success": true,
  "message": "تم استيراد وتحديث بيانات 320 طالباً بنجاح وتحديث إحصائيات الدفعة",
  "data": {
    "inserted": 270,
    "updated": 50,
    "disciplinaryImported": 14
  }
}
```

---

## 3. إدارة المراحل والدفعات وتدفق الوصول والتصنيفات

### أ. استعلام المراحل مع إحصائيات التدفق والتصنيفات
- **المسار:** `GET /api/students/stages`
- **الاستجابة الناجحة (200 OK):**
```json
{
  "success": true,
  "data": {
    "activeStage": "20241",
    "stages": [
      {
        "mrhla": "20241",
        "name": "مرحلة 2024/1",
        "targetCount": 300,
        "arrivedCount": 280,
        "remainingCount": 20,
        "inUnitCount": 250,
        "relocatedCount": 25,
        "transferredPersonnelCount": 5,
        "classifications": [
          { "id": "sig-nco", "name": "صف إشارة", "isDefault": true },
          { "id": "voc-train", "name": "تد مهني", "isDefault": true },
          { "id": "sig-qj", "name": "إشارة ق. ج", "isDefault": true },
          { "id": "sig-voc-qj", "name": "إشارة تد مهني ق. ج", "isDefault": true }
        ]
      }
    ]
  }
}
```

### ب. تحديث المقرر وصوله للدفعة
- **المسار:** `PATCH /api/students/stages/[id]/target`
- **الصلاحية:** `students: edit`
- **المدخلات:**
```json
{
  "targetCount": 350
}
```

### ج. تخصيص وإدارة التصنيفات التخصصية للدفعة
- **المسار:** `POST /api/students/stages/[id]/classifications`
- **الصلاحية:** `students: edit`
- **المدخلات:**
```json
{
  "name": "سائقين إشارة",
  "description": "تخصص قيادة مركبات الإشارة التكتيكية"
}
```

---

## 4. محرك التمام اليومي لطلبة المرحلة (للمتواجدين بالوحدة فقط)
- **المسار:** `GET /api/students/rollcall?date=YYYY-MM-DD&mrhla=20241`
  - يسترجع تمام اليوم المحدد إن وجد، أو يولد مسودة أولية لليوم التالي **للجنود المتواجدين بالوحدة فقط (`locationStatus === "in_unit"`)**.
- **المسار:** `POST /api/students/rollcall`
  - **الصلاحية:** `students: edit` (أو `Admin` بعد 06:00 صباحاً مع `overrideReason`)
  - **المدخلات:**
  ```json
  {
    "date": "2026-11-05",
    "mrhla": "20241",
    "action": "save_draft" | "approve" | "reopen",
    "entries": [
      {
        "studentId": "653a1b2...",
        "militaryNo": "1202410001",
        "status": "police_academy_exam",
        "destination": "كلية الشرطة بالتجمع الأول",
        "expectedReturnDate": "2026-11-08",
        "notes": "كشف طبي نهائي"
      }
    ],
    "overrideReason": "تصحيح حالة بتوجيهات القائد بعد 06:00"
  }
  ```

---

## 5. محرك الترحيل والنقل لقوة الأفراد

### أ. ترحيل لخارج الوحدة (جماعي لتصنيف كامل أو جزئي/فردي)
- **المسار:** `POST /api/students/relocate`
- **الصلاحية:** `students: edit`
- **المدخلات:**
```json
{
  "mrhla": "20241",
  "classificationId": "voc-train", // اختياري: لترحيل تصنيف كامل دفعة واحدة
  "studentIds": ["653a1b2...", "653a1b3..."], // معرفات الجنود المعنيين
  "destination": "مركز تدريب الإشارة المشتركة - الهايكستب",
  "date": "2026-11-06",
  "orderNo": "102/2026 مكاتبة هيئة التدريب",
  "reason": "استكمال الدورة التخصصية خارج الوحدة"
}
```
- **الأثر:** تحديث حالة الجنود إلى `locationStatus: "relocated"`، تسجيل بيانات الترحيل، استبعادهم فورياً من التمام اليومي مع بقائهم مسجلين في الدفعة، وتسجيل الإجراء في `AuditLog`.

### ب. نقل إلى قوة الأفراد بالوحدة
- **المسار:** `POST /api/students/transfer-personnel`
- **الصلاحية:** `students: edit`
- **المدخلات:**
```json
{
  "mrhla": "20241",
  "studentIds": ["653a1b4..."],
  "transferDate": "2026-11-06",
  "orderNo": "24/2026 أمر تسكين قائد الوحدة",
  "assignedRole": "كاتب عسكري جناح العمليات"
}
```
- **الأثر:** تحديث حالة الجنود إلى `locationStatus: "transferred_to_unit_personnel"`، استبعادهم من تمام الطلبة، وتجهيز بياناتهم للمزامنة الآلية مع قسم الأفراد لاحقاً، مع تسجيل الإجراء في `AuditLog`.

---

## 6. أرشيف المراحل السابقة وفلاتر الموقع
- **المسار:** `GET /api/students?mrhla=...&locationStatus=...`
  - دعم فلترة سريعة بالرقم العسكري أو القومي، أو التصنيف التخصصي، أو المؤهل، أو حالة الموقع (`in_unit` / `relocated` / `transferred_to_unit_personnel`).
