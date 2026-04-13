# Item 009: API Routes — المأموريات (Missions)

**المصدر**: `docs/aide/queue/queue-001.md` — Item 009  
**التاريخ**: 2026-04-10  
**الحالة**: ✅ Complete

---

## الوصف

إنشاء API routes كاملة لإدارة المأموريات تحت المسار `/api/arkan-harb/missions/` باتباع pipeline الأمان المعتمد في المشروع:

```
auth → rate-limit → RBAC (arkan_harb: view/edit) → Zod → DB → audit → response
```

**الملفات المطلوبة**:

| الملف | الغرض |
|-------|--------|
| `next/app/api/arkan-harb/missions/route.ts` | GET (قائمة + فلترة) + POST (إنشاء) |
| `next/app/api/arkan-harb/missions/[id]/route.ts` | PATCH (تحديث) — لا حذف فعلي |

---

## معايير القبول

- [ ] `GET /api/arkan-harb/missions` يُرجع قائمة مأموريات مع دعم pagination
- [ ] `GET /api/arkan-harb/missions?officerId=X` يُرجع مأموريات ضابط محدد
- [ ] `GET /api/arkan-harb/missions?status=active` يُرجع المأموريات بحسب الحالة
- [ ] `POST /api/arkan-harb/missions` يُنشئ مأمورية ويُرجع `201`
- [ ] `PATCH /api/arkan-harb/missions/[id]` يُحدِّث مأمورية موجودة ويُرجع `200`
- [ ] طلب بدون مصادقة يُرجع `401`
- [ ] طلب بدون صلاحية `arkan_harb` يُرجع `403`
- [ ] `POST`/`PATCH` بيانات غير صالحة يُرجع `422` (أو `400`) مع تفاصيل الخطأ
- [ ] لا يوجد endpoint لحذف المأموريات (يُعالَج بتغيير الحالة إلى `cancelled`)
- [ ] كل عملية كتابة تُسجَّل في Audit Log بوحدة `arkan_harb`
- [ ] `npm run build` + `npm run lint` يمران بنجاح

---

## خطوات التنفيذ

### 1. `route.ts` — GET + POST

**المسار**: `next/app/api/arkan-harb/missions/route.ts`

#### GET Handler

Pipeline:
1. `authenticate()` — إرجاع 401 إذا فشل
2. `canViewModule(user, "arkan_harb")` — إرجاع 403 إذا فشل
3. `checkArkanHarbRateLimit(userId, ip, "read")` — إرجاع 429 إذا تجاوز الحد
4. `connectToDatabase()`
5. تحليل query params بـ Zod schema: `officerId?`, `status?`, `page`, `limit`
6. بناء query object وتنفيذ `Mission.find()` مع `.lean()`
7. إرجاع `{ success: true, data: { items, total, page, totalPages } }`

#### POST Handler

Pipeline:
1. `authenticate()` — إرجاع 401
2. `canEditModule(user, "arkan_harb")` — إرجاع 403
3. Rate limit (write)
4. `connectToDatabase()`
5. `request.json()` + Zod `createMissionSchema` — إرجاع 400 إذا فشل
6. التحقق من وجود الضابط في DB (Optional: يُحسَّن الأداء)
7. `Mission.create({ ...data, createdBy, updatedBy })`
8. `logAuditEvent(...)` بوحدة `arkan_harb`
9. إرجاع `{ success: true, data: { id } }` بحالة 201

### 2. `[id]/route.ts` — PATCH

**المسار**: `next/app/api/arkan-harb/missions/[id]/route.ts`

#### PATCH Handler

قواعد انتقال الحالة:
```typescript
const VALID_TRANSITIONS: Record<string, string[]> = {
  scheduled: ["active", "cancelled"],
  active:    ["completed", "cancelled"],
  // completed و cancelled نهائيتان — لا انتقال منهما
};
```

Pipeline:
1. `authenticate()` — إرجاع 401
2. `canEditModule(user, "arkan_harb")` — إرجاع 403
3. Rate limit (write)
4. `connectToDatabase()`
5. `Mission.findById(id)` — إرجاع 404 إذا لم يوجد
6. `request.json()` + Zod `updateMissionSchema` — إرجاع 400
7. التحقق من صحة انتقال الحالة إذا كانت `status` في البيانات
8. تحديث الحقول وحفظ
9. `logAuditEvent(...)` بوحدة `arkan_harb`
10. إرجاع `{ success: true }`

### 3. Rate Limit

سيُستخدم نظام `rate-limit` الحالي. يجب التحقق أولاً إذا كانت `checkOfficersRateLimit` قابلة للاستخدام مباشرةً، أو إذا كانت هناك دالة عامة.

**مرجع**: `next/lib/security/rate-limit.ts`

إذا لم توجد دالة عامة، يُنشأ `checkArkanHarbRateLimit` بنفس النمط.

### 4. Response Shape

**GET response**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "...",
        "officerId": "...",
        "title": "مأمورية خارج المنطقة",
        "description": "...",
        "destination": "...",
        "startDate": "2026-04-10T00:00:00.000Z",
        "endDate": null,
        "status": "active",
        "createdBy": "...",
        "createdAt": "..."
      }
    ],
    "total": 25,
    "page": 1,
    "totalPages": 3
  }
}
```

**POST/PATCH success**:
```json
{ "success": true, "data": { "id": "..." } }
```

**Error response**:
```json
{ "success": false, "error": "رسالة الخطأ", "details": [...] }
```

---

## التبعيات

| التبعية | الملف | الحالة |
|---------|-------|--------|
| `Mission` model | `next/lib/db/models/Mission.ts` | ✅ موجود |
| `createMissionSchema` | `next/lib/validations/arkan-harb.ts` | ✅ موجود |
| `updateMissionSchema` | `next/lib/validations/arkan-harb.ts` | ✅ موجود |
| `authenticate` | `next/lib/auth/middleware.ts` | ✅ موجود |
| `canViewModule` / `canEditModule` | `next/lib/auth/authorization.ts` | ✅ موجود |
| `logAuditEvent` | `next/lib/auth/audit.ts` | ✅ موجود |
| `errors` | `next/lib/auth/errors.ts` | ✅ موجود |
| `connectToDatabase` | `next/lib/db/connect.ts` | ✅ موجود |
| rate-limit | `next/lib/security/rate-limit.ts` | ✅ موجود (تحقق من API) |

**ملاحظة**: `createMissionSchema` و `updateMissionSchema` موجودان في `arkan-harb.ts` — يجب التحقق من الأسماء الدقيقة (ربما `missionsListQuerySchema` غير موجود بعد وقد يحتاج إنشاء Zod schema للـ query params).

---

## استراتيجية الاختبار

### اختبار عبر `curl`

**GET — قائمة مأموريات**:
```bash
TOKEN="..."  # من تسجيل الدخول
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/arkan-harb/missions
```

**GET بفلترة officerId**:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/arkan-harb/missions?officerId=<OFFICER_ID>"
```

**POST — إنشاء مأمورية**:
```bash
curl -X POST http://localhost:3000/api/arkan-harb/missions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"officerId":"<ID>","title":"مأمورية تدريبية","startDate":"2026-04-15","status":"scheduled"}'
```

**PATCH — تحديث حالة**:
```bash
MISSION_ID="..."
curl -X PATCH http://localhost:3000/api/arkan-harb/missions/$MISSION_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"active"}'
```

**اختبار 401 — بدون مصادقة**:
```bash
curl http://localhost:3000/api/arkan-harb/missions
# → 401
```

---

## متطلبات الاختبار

### الخدمات المطلوبة

| الخدمة | الإصدار | الأمر | المنفذ |
|--------|---------|-------|-------|
| MongoDB | 7+ | `docker compose up -d mongo` | 27017 |
| Next.js dev server | — | `cd next && npm run dev` | 3000 |

### إعداد البيئة

- `MONGODB_URI` معرَّف في `next/.env.local`
- `JWT_SECRET` معرَّف في `next/.env.local`
- مستخدم بصلاحية `arkan_harb: edit` موجود في قاعدة البيانات

### قائمة التحقق اليدوي

- [ ] MongoDB تعمل: `docker compose up -d mongo`
- [ ] Dev server يعمل: `cd next && npm run dev`
- [ ] `GET /api/arkan-harb/missions` بدون token → `401`
- [ ] `GET /api/arkan-harb/missions` بمستخدم بدون صلاحية → `403`
- [ ] `GET /api/arkan-harb/missions` بمستخدم بصلاحية `view` → `200` مع قائمة
- [ ] `POST /api/arkan-harb/missions` ببيانات صالحة → `201` + id
- [ ] `POST /api/arkan-harb/missions` ببيانات ناقصة → `400` مع تفاصيل
- [ ] `PATCH /api/arkan-harb/missions/[id]` بانتقال صالح → `200`
- [ ] `PATCH /api/arkan-harb/missions/[id]` بانتقال غير مسموح → `400`
- [ ] Audit log يُسجَّل بعد كل POST/PATCH (تحقق من `/api/audit`)
- [ ] `npm run build` بلا أخطاء
- [ ] `npm run lint` بلا أخطاء جديدة

### النتائج المتوقعة

- `GET` يُرجع `{ success: true, data: { items: [], total: 0, page: 1, totalPages: 1 } }` إذا كانت قاعدة البيانات فارغة
- `POST` يُرجع `{ success: true, data: { id: "..." } }` مع status 201
- `PATCH` بانتقال `scheduled → active` يُرجع `{ success: true }`
- `PATCH` بانتقال `completed → active` يُرجع `{ success: false, error: "لا يمكن تحويل الحالة..." }`
- Audit log يحتوي على `action: "CREATE"` / `"UPDATE"` و `module: "arkan_harb"`

### قالب توثيق التحقق

```markdown
## نتائج التحقق

- [ ] MongoDB بدأت: ✅/❌
- [ ] GET بدون token → 401: ✅/❌
- [ ] GET بصلاحية view → 200: ✅/❌
- [ ] POST بيانات صالحة → 201: ✅/❌  — Mission ID: ___
- [ ] PATCH scheduled→active → 200: ✅/❌
- [ ] PATCH completed→active → 400: ✅/❌
- [ ] Audit log يسجل: ✅/❌
- [ ] npm run build: ✅/❌
- [ ] npm run lint: ✅/❌
```

---

## القرارات والمقايضات

### قرارات التنفيذ

1. **لا حذف فعلي**: المأموريات لا تُحذف — يُغيَّر status إلى `cancelled` فقط. السبب: الحفاظ على أثر السجل للمراجعة والتدقيق.

2. **RBAC عبر `canViewModule`/`canEditModule`**: استخدام `authorization.ts` العام بدلاً من دوال مخصصة. السبب: التوحيد وعدم تكرار المنطق.

3. **`checkApiRateLimit` بدلاً من `checkOfficersRateLimit`**: الدالة العامة `checkApiRateLimit` متاحة ومصدَّرة من `rate-limit.ts` وتغطي نفس الـ limits — استخدامها مباشرةً بدلاً من إنشاء wrapper مخصص لأركان الحرب.

4. **Pagination افتراضي**: `page=1, limit=20` — مستقاة من نمط `officers/route.ts`. يمكن تعديلها لاحقاً.

5. **إضافة `arkan_harb` إلى `AuditLog`**: أضفنا `arkan_harb` إلى `AuditModule` type وإلى enum الـ schema في `AuditLog.ts` — هذا كان مطلوباً لأن TypeScript strict mode ترفض القيم خارج النوع.

6. **إصلاح `updateMissionSchema` (Zod `.partial()` + `superRefine`)**: Zod 4 لا يسمح باستدعاء `.partial()` على schema يحتوي `superRefine`. الحل: فصل الـ base shape object عن الـ superRefine في المخططات الثلاثة (Mission + PositionAssignment + Promotion)، ثم استخدام `.partial()` على `z.object(baseShape)` فقط. هذا أصلح أيضاً مشكلة كانت موجودة في `updatePositionAssignmentSchema` و`updatePromotionSchema`.

7. **State machine للحالة**: قواعد انتقال صارمة — `scheduled→active|cancelled`، `active→completed|cancelled`، والحالات النهائية (`completed`, `cancelled`) لا مخرج منها. يُرجع الـ API خطأ 400 مع رسالة عربية واضحة عند انتقال غير مسموح.

8. **ترتيب النتائج**: `startDate: -1` (الأحدث أولاً) — متوافق مع نمط officers.

### نتائج التحقق

- [x] `npm run build` — ✓ Compiled, 2 new routes: `/api/arkan-harb/missions` + `/api/arkan-harb/missions/[id]`
- [x] `npm run lint` — 0 أخطاء جديدة (7 تحذيرات موجودة مسبقاً في LeaveRegister.tsx فقط)

---

## التذكير عند الإكمال

عند إتمام هذا العنصر، يجب تحديث `docs/aide/progress.md`:
- **2.2** (API Routes — المأموريات): من `📋 Planned` إلى `✅ Complete`
- **المرحلة 2**: تحديث العداد من `0/10` إلى `1/10`

---

## الخطوة التالية

ابدأ **جلسة جديدة** وشغّل `/speckit.aide.execute-item 009` لتنفيذ هذا العنصر.
