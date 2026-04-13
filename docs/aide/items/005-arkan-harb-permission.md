# عنصر العمل 005: تسجيل صلاحية arkan_harb في نظام المصادقة

**المصدر**: `docs/aide/queue/queue-001.md` — Item 005  
**المرحلة**: المرحلة 1 — الأساسات والصلاحيات  
**التاريخ**: 2026-04-10  
**الحالة**: ✅ مكتمل

---

## الوصف

تحديث ملفات النظام المتعلقة بالمصادقة (Authentication) والصلاحيات لتسجيل صلاحية `arkan_harb` الجديدة. هذه الصلاحية ستسمح للمستخدمين بالوصول إلى نظام إدارة التمام والمأموريات والترقيات والتعيينات، وستتيح للمديرين إعطاء هذه الصلاحية للمستخدمين عبر واجهة إدارة المستخدمين.

يُعد هذا التحديث حيوياً لضمان التوافق مع بنية الصلاحيات الحالية القائمة على (ModulePermissions) ولحماية نظام أركان الحرب قبل تطوير الشاشات الخاصة به.

---

## خطوات التنفيذ (Implementation Steps)

### الخطوة 1: تحديث نوع الصلاحيات (Types)
1. افتح ملف `next/lib/auth/types.ts`.
2. ابدأ بتحديث تعريف `ModulePermissions` (أو الواجهة المماثلة) لإضافة حقل `arkan_harb?: ModulePermission;`.
3. تحقق من أي Enums أو Types إضافية قد تتطلب تضمين اسم الصلاحية الجديدة.

### الخطوة 2: تحديث Schema قاعدة البيانات (User Model)
1. افتح ملف `next/lib/db/models/User.ts`.
2. انتقل إلى تعريف كائن `permissions` داخل `UserSchema`.
3. أضف الكائن `arkan_harb` بنفس النمط المستخدم لباقي الوحدات (مثلاً `officers`, `users`, `medical`, etc). عادة ما يكون بالشكل:
   ```typescript
   arkan_harb: {
     view: { type: Boolean, default: false },
     create: { type: Boolean, default: false },
     edit: { type: Boolean, default: false },
     delete: { type: Boolean, default: false },
     manage: { type: Boolean, default: false },
   }
   ```

### الخطوة 3: تحديث التحقق من البيانات (Zod Validations)
1. افتح ملف `next/lib/validations/auth.ts` (أو ملف الـ schemas الخاص بالمستخدمين وصلاحياتهم إذا كان في مكان آخر، مثل `next/lib/validations/user.ts` أو `next/lib/types/user.ts`).
2. ابحث عن Schema الصلاحيات (e.g., `permissionsSchema` أو `userSchema` المشتمل على permissions).
3. أضف `arkan_harb` كحقل اختياري يستدعي الـ Schema الفرعي الخاص بصلاحيات الوحدة (`modulePermissionSchema`).

### الخطوة 4: التحقق الآلي واليدوي
1. تأكد من أن الـ `authorization.ts` (نظام المصادقة) يستطيع معالجة الصلاحية الجديدة دون كسر في المنطق.
2. شغل Build و Lint لضمان خلو العمل من الأخطاء النحوية وأخطاء القواعدية الخاصة بـ TypeScript.

---

## معايير القبول (Acceptance Criteria)

- [ ] تم إضافة `arkan_harb` كحقل معتمد في `next/lib/auth/types.ts`.
- [ ] تم إضافة `arkan_harb` بخصائصه إلى `permissions` داخل `UserSchema` في `next/lib/db/models/User.ts`.
- [ ] تمت إضافة الـ Zod validation الصحيح لـ `arkan_harb` في ملف التحقق المقابل.
- [ ] الكود يبنى بدون أخطاء (`npm run build`).
- [ ] فحص الجودة يمر بدون أخطاء أو تحذيرات جديدة (`npm run lint`).
- [ ] الصلاحية تظهر ويمكن إدارتها في لوحة تحكم إدارة المستخدمين الحالية (User Management UI) تلقائياً، أو تتطلب الحد الأدنى من الإضافات إذا كانت الواجهة تعتمد على خيارات ثابتة.
- [ ] لا كسر في أي جزء آخر من نظام تسجيل الدخول أو توزيع الصلاحيات الحالي.

---

## استراتيجية الاختبار (Testing Strategy)

### اختبار هيكلي (Structural)
- التحقق من عدم وجود أخطاء TypeScript.
- التأكد من خلو ملفات `User.ts` و `types.ts` من الشوائب ومطابقتها للمواصفات والقواعد.

### اختبار وظيفي (Functional)
- تشغيل التطبيق محلياً وتسجيل الدخول بصفة مدير (`admin` أو شخص ذو صلاحية الإدارة للـ `users`).
- الانتقال لصفحة إضافة مستخدم جديد وتعديل مستخدم حالي، والتأكد من ظهور صلاحية "أركان الحرب" وفاعليتها في حفظ التغييرات واسترجاعها من قاعدة البيانات بنجاح (End-to-End Test for the specific addition).

---

## الاعتمادات (Dependencies)
- Item 004: Export New Models (مكتمل)

---

## متطلبات الاختبار (Testing Prerequisites)

### الخدمات المطلوبة
- **MongoDB**: قاعدة डेटाبز (Docker: `docker-compose up -d mongo`, Port: 27017).

### إعدادات البيئة
- `.env.local` يحتوى على إعدادات MongoDB ومزودي المصادقة العادية.

### قائمة التحقق اليدوي (Manual Validation Checklist)
- [ ] **البناء ينجح**: `cd next && npm run build`
- [ ] **الفحص ينجح**: `cd next && npm run lint`
- [ ] **الخدمات تعمل**: `docker-compose up -d mongo`
- [ ] **التطبيق يعمل**: `cd next && npm run dev`
- [ ] **مراجعة الواجهة (UI)**: انتقل إلى صفحة المستخدمين > تعديل مستخدم > تأكد من ظهور `arkan_harb` وامكانية تحديد الخيارات وحفظها بنجاح.
- [ ] **Data verified**: التأكد في المانجو DB مباشرة أن حقل `permissions.arkan_harb` يُخزَّن بالشكل الصحيح.

---

## توثيق التحقق (Validation Documentation Template)

```markdown
## نتائج التحقق — عنصر 005
- [ ] تم إضافة الصلاحيات في ملفات النوع (`types.ts`).
- [ ] تم تحديث نموذج المستخدم (`User.ts`) والصلاحيات المسموحة.
- [ ] تم تحديث ملف الـ Zod Validate الخاص بالمستخدمين.
- [ ] `npm run build` اجتاز بنجاح.
- [ ] `npm run lint` اجتاز بنجاح.
- [ ] واجهة المستخدم تعرض الصلاحية ويمكن حفظها في الـ Database.
```

---

## القرارات والمفاضلات (Decisions & Trade-offs)
- تم إضافة صلاحية `arkan_harb` لنظام المصادقة بنجاح باتباع الخطوات المحددة في العنصر.
- تم إضافة الحقل `arkan_harb: PermissionLevel;` إلى واجهة `ModulePermissions` في `next/lib/auth/types.ts`.
- تم إضافة الحقل `arkan_harb` بنفس نمط الوحدات الأخرى في `next/lib/db/models/User.ts` مع الخصائص `view`, `create`, `edit`, `delete`, `manage`.
- تم إضافة Validation لـ `arkan_harb` في `next/validations/auth.ts` باستخدام `permissionLevelSchema`.
- تم الاستعانة بـ TypeScript Strict Type Checks للرجوع إلى `AuthenticatedNavbar.tsx` وتصحيح الخطأ أثناء البناء حيث تم إضافة التسمية العربية `أركان حرب` لـ `moduleLabels`.
- تم إصلاح أخطاء كودية عشوائية حول النوع `unknown` في `OfficerPromoteModal.tsx` و `OfficerTransferModal.tsx` التي ظهرت عند إجراء Build.

---

## تذكير الإكمال ⚠️

عند إكمال هذا العنصر، يجب تحديث `docs/aide/progress.md`:
- تغيير حالة المخرج ذات الصلة (1.5) من 📋 Planned إلى 🚧 In Progress، وثم إلى ✅ Complete.

---

## الخطوة التالية

ابدأ **جلسة جديدة** لتشغيل `/speckit.aide.create-item` للعنصر التالي في الطابور.
