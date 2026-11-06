# API Contracts: سياسة وحوكمة النسخ الاحتياطي الربع سنوي وتدوير النسخ

**Feature**: `012-quarterly-backup-retention`  
**Base Path**: `/api/admin/backup`  
**Authentication**: إلزامي عبر JWT في HttpOnly Cookies  
**Authorization**: يقتصر حصرياً على رتبة `Admin`  

---

## 1. استعراض قائمة النسخ الاحتياطية وحالة المساحة
`GET /api/admin/backup`

### Request
- **Headers:** `Cookie: token=...`
- **Query Params:** لا يوجد

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "backups": [
      {
        "id": "67290f1a9d123456789abcde",
        "filename": "backup-q4-2026-20261231-180000.tar.gz",
        "fileSizeBytes": 45829120,
        "backupType": "quarterly_scheduled",
        "quarter": "Q4-2026",
        "status": "completed",
        "collectionsCount": 18,
        "documentsCount": 12500,
        "createdByName": "النظام الآلي",
        "createdAt": "2026-12-31T18:00:00.000Z"
      }
    ],
    "storage": {
      "freeBytes": 48234905600,
      "totalBytes": 120587264000,
      "usedBytes": 72352358400,
      "freePercentage": 40.0,
      "isWarning": false
    },
    "retentionCap": 4
  }
}
```

---

## 2. إنشاء وتصدير نسخة احتياطية فورية (On-Demand Export)
`POST /api/admin/backup/export`

### Request
- **Body:** `{}` (أو اختياري: `{ "notes": "نسخة قبل تحديث النظام" }`)

### Response (201 Created)
```json
{
  "success": true,
  "message": "تم إنشاء النسخة الاحتياطية وتطبيق قاعدة التدوير بنجاح",
  "data": {
    "backupId": "67290f1a9d123456789abcde",
    "filename": "backup-manual-20261104-182500.tar.gz",
    "fileSizeBytes": 45829120,
    "downloadUrl": "/api/admin/backup/download/67290f1a9d123456789abcde"
  }
}
```

### Errors
- `400 Bad Request`: المساحة المتبقية على الخادم غير كافية (أقل من 20% أو أقل من ضعف الحجم المتوقع).
- `409 Conflict`: توجد عملية نسخ أو استعادة أخرى قيد التنفيذ حالياً.
- `403 Forbidden`: المستخدم ليس مدير نظام.

---

## 3. تحميل ملف النسخة الاحتياطية
`GET /api/admin/backup/download/:id`

### Request
- **Params:** `id`: المعرف الفريد للنسخة `BackupRecord._id`

### Response (200 OK)
- **Headers:**
  - `Content-Type: application/gzip`
  - `Content-Disposition: attachment; filename="backup-manual-20261104-182500.tar.gz"`
- **Body:** Stream ثنائي لملف `.tar.gz`

---

## 4. تشغيل النسخ الربع سنوي المجدول وتطبيق التدوير
`POST /api/admin/backup/quarterly`

### Request
- **Headers:** إما جلسة Admin أو مفتاح نظام `x-system-cron-key: ...`
- **Body:**
```json
{
  "quarter": "Q4-2026",
  "force": false
}
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "تمت معالجة النسخة الربع سنوية بنجاح",
  "data": {
    "backupId": "67290f1a9d123456789abcde",
    "filename": "backup-q4-2026-20261231-180000.tar.gz",
    "rotatedDeletedCount": 1
  }
}
```

---

## 5. استعادة المنظومة من نسخة احتياطية (Restore System)
`POST /api/admin/backup/restore`

### Request (Zod Validated)
```json
{
  "backupId": "67290f1a9d123456789abcde",
  "adminPassword": "CurrentAdminPassword123",
  "confirmationPhrase": "استعادة النسخة الاحتياطية"
}
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "تمت استعادة المنظومة وقاعدة البيانات والمرفقات بنجاح",
  "data": {
    "restoredCollectionsCount": 18,
    "durationSeconds": 14.5
  }
}
```

### Errors
- `400 Bad Request`: عبارة التأكيد غير صحيحة أو ملف الأرشيف تالف.
- `401 Unauthorized`: كلمة مرور مدير النظام غير صحيحة.
- `409 Conflict`: عملية نسخ أو استعادة أخرى جارية بالفعل.
- `500 Internal Server Error`: خطأ أثناء فك الضغط أو تطبيق البيانات (تراجع فوري مع توثيق الفشل).
