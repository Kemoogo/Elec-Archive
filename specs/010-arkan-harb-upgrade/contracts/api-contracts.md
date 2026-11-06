# API Contracts: ترقية فرع العمليات وأركان حرب والتكامل الشامل

**Feature**: `010-arkan-harb-upgrade`
**Date**: 2026-10-19

## 1. Fax-to-Mission Conversion
* **Endpoint**: `POST /api/fax/[id]/convert-to-mission`
* **RBAC**: `fax: edit` AND `arkan_harb: edit`

### Request Body:
```json
{
  "officerId": "6645a1b2c3d4e5f6a7b8c9d0",
  "missionType": "external_multiday",
  "startDate": "2026-10-25",
  "endDate": "2026-10-28",
  "destination": "قيادة الجيش الثاني الميداني",
  "description": "بناءً على الفاكس الوارد رقم 102/أ",
  "transportationMean": "قطار حربي",
  "authorizedWeapons": "طبنجة حلوان 9 مم"
}
```

### Response (201 Created):
```json
{
  "success": true,
  "data": {
    "missionId": "6645f9e8d7c6b5a4f3e2d1c0",
    "linkedFaxId": "6645a1b2c3d4e5f6a7b8c9d1",
    "message": "تم تحويل الفاكس وتسجيل المأمورية بنجاح"
  }
}
```

---

## 2. Proactive Conflict Validation
* **Endpoint**: `POST /api/arkan-harb/missions/check-conflict`
* **RBAC**: `arkan_harb: view`

### Request Body:
```json
{
  "officerId": "6645a1b2c3d4e5f6a7b8c9d0",
  "startDate": "2026-10-25",
  "endDate": "2026-10-28"
}
```

### Response (200 OK):
```json
{
  "hasConflict": true,
  "conflicts": [
    {
      "type": "leave_overlap",
      "severity": "blocking",
      "message": "الضابط مسجل في إجازة رسمية حتى 26-10-2026"
    },
    {
      "type": "mandatory_position_vacant",
      "severity": "warning",
      "message": "الضابط يشغل وظيفة أصيلة (رئيس قسم العمليات) ولا يوجد له بديل مسجل"
    }
  ]
}
```

---

## 3. Mission Travel Order Dispatch
* **Endpoint**: `GET /api/arkan-harb/missions/[id]/travel-order`
* **RBAC**: `arkan_harb: view`

### Response (200 OK):
```json
{
  "success": true,
  "data": {
    "orderNumber": "ت ح / 2026 / 84",
    "orderDate": "2026-10-19",
    "unitName": "مركز القيادة والسيطرة الرئيسي",
    "officer": {
      "rank": "مقدم أ ح",
      "fullName": "طارق محمود عبد الرحمن",
      "militaryId": "123456789",
      "seniorityNumber": "98745"
    },
    "mission": {
      "title": "مأمورية تفتيش مفاجئ",
      "destination": "الكتيبة 42 مدفعية",
      "startDate": "2026-10-25",
      "endDate": "2026-10-28",
      "transportationMean": "سيارة قيادة تابعة للوحدة",
      "authorizedWeapons": "طبنجة حلوان عيار 9 مم رقم 45892 مع 16 طلقة"
    },
    "linkedFaxNumber": "104/أ"
  }
}
```

---

## 4. Duty Roster Management
* **Endpoint**: `GET /api/arkan-harb/roster?month=11&year=2026`
* **RBAC**: `arkan_harb: view`

### Response (200 OK):
```json
{
  "success": true,
  "data": {
    "month": 11,
    "year": 2026,
    "status": "draft",
    "entries": [
      {
        "date": "2026-11-01",
        "dutyType": "unit_duty",
        "dutyTitle": "نوبتجي الوحدة",
        "assignedOfficerId": "6645a1b2c3d4e5f6a7b8c9d0",
        "assignedOfficerName": "رائد / كريم محمد",
        "isHoliday": false
      }
    ],
    "equityStats": [
      {
        "officerId": "6645a1b2c3d4e5f6a7b8c9d0",
        "officerName": "رائد / كريم محمد",
        "totalDuties": 2,
        "weekendDuties": 1
      }
    ]
  }
}
```

* **Endpoint**: `PUT /api/arkan-harb/roster`
* **RBAC**: `arkan_harb: edit`

### Request Body:
```json
{
  "month": 11,
  "year": 2026,
  "entries": [
    {
      "date": "2026-11-01",
      "dutyType": "unit_duty",
      "dutyTitle": "نوبتجي الوحدة",
      "assignedOfficerId": "6645a1b2c3d4e5f6a7b8c9d0",
      "isHoliday": false
    }
  ]
}
```

---

## 5. Daily Incidents & Operations Log
* **Endpoint**: `GET /api/arkan-harb/incidents?page=1&limit=20&priority=urgent`
* **RBAC**: `arkan_harb: view`

* **Endpoint**: `POST /api/arkan-harb/incidents`
* **RBAC**: `arkan_harb: edit`

### Request Body:
```json
{
  "timestamp": "2026-10-19T09:30:00.000Z",
  "reportingEntity": "الشرطة العسكرية - كمين الكيلو 4.5",
  "subject": "إشارة هاتفية بشأن تصريح مرور",
  "details": "تم توقيف سيارة نقل تابعة للوحدة للاستعلام عن تصريح المرور وتم تأكيد صحة أمر التحرك رقم 84",
  "priority": "normal",
  "actionTaken": "تم التواصل هاتفياً مع قائد الكمين والتأكيد والسماح بمرور السيارة",
  "isCommanderNotified": true,
  "commanderInstructions": "مراجعة جميع تصاريح سيارات النقل قبل مغادرة الوحدة"
}
```
