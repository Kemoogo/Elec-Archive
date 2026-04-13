# عنصر العمل 029: لوحة قيادة أركان الحرب (Arkan Harb Dashboard)

## الوصف
إنشاء الصفحة الرئيسية لفرع أركان الحرب (`/arkan-harb/page.tsx`) لتكون مركز العمليات الرئيسي للفرع. يجب أن توفر نظرة عامة فورية على حالة القوة البشرية، والمهام النشطة، والتعيينات، مع روابط سريعة للوصول إلى الأقسام الفرعية وسجل للأحداث الأخيرة.

## معايير القبول
- [ ] تعرض الصفحة 4 بطاقات إحصائية رئيسية:
    - **عدد الحاضرين اليوم**: يُجلب من التمام اليومي المعتمد أو يُحسب بناءً على القوة الفعلية.
    - **الإجازات النشطة**: عدد الضباط في إجازة معتمدة حالياً.
    - **المأموريات الحالية**: عدد المأموريات والمهام النشطة.
    - **الوظائف المشغولة**: عدد التعيينات الوظيفية النشطة (`status: active`).
- [ ] تحتوي على قسم "روابط سريعة" للتنقل السهل:
    - تسجيل التمام اليومي (`/arkan-harb/rollcall`)
    - سجل الإجازات (`/arkan-harb/leaves`)
    - المأموريات والمهام (`/arkan-harb/missions`)
    - التنظيم والوظائف (`/arkan-harb/positions`)
- [ ] تعرض قسم "أحدث الأنشطة" (أخر 5 عمليات) تم تسجيلها في `AuditLog` لفرع `arkan_harb`.
- [ ] تعتمد الصفحة بالكامل على **SSR (Server-Side Rendering)** لجلب البيانات.
- [ ] التصميم متوافق مع نظام التصميم المعتمد Projekt (RTL + Arabic + Modern UI).
- [ ] الصلاحيات: متاحة فقط للمستخدمين ذوي صلاحية `arkan_harb: view` أو `admin` أو `commander`.

## خطوات التنفيذ
1.  تحديث الملف `next/app/(dashboard)/arkan-harb/page.tsx`.
2.  تنفيذ استعلامات Mongoose لجلب الإحصائيات الأربعة:
    - `Officer.countDocuments({ employmentStatus: "active" })` كقاعدة.
    - `DailyRollcall.findOne` لتاريخ اليوم للحصول على عدد الحاضرين.
    - `Leave.countDocuments` للإجازات النشطة اليوم.
    - `Mission.countDocuments` للمأموريات النشطة.
    - `PositionAssignment.countDocuments({ status: "active" })` للوظائف.
3.  جلب أخر 5 سجلات من `AuditLog` حيث `module: "arkan_harb"`.
4.  تحسين واجهة المستخدم لتشمل "Recent Activities" بدلاً من الـ Placeholder الحالي.
5.  التأكد من معالجة حالة عدم وجود تمام لليوم (عرض "لم يتم تقديم التمام" أو 0 في خانة الحاضرين).
6.  تطبيق الـ RBAC في بداية الدالة (تم تنفيذه جزئياً، يجب التأكد من شموله للقائد).

## استراتيجية الاختبار
- **اختبار البيانات**: مقارنة الأرقام المعروضة في البطاقات مع نتائج استعلامات MongoDB المباشرة.
- **اختبار الصلاحيات**: محاولة دخول الصفحة بمستخدم "فرع طبي" (يجب أن يتم الرفض) ومستخدم "أركان حرب" (يجب أن يُسمح).
- **اختبار الروابط**: التأكد من أن جميع الروابط السريعة تؤدي للوجهات الصحيحة.
- **اختبار SSR**: التأكد من عدم وجود "Flash" للبيانات بعد تحميل الصفحة.

## التبعيات
- موديلات Mongoose: `Officer`, `Leave`, `Mission`, `PositionAssignment`, `AuditLog`, `DailyRollcall`.
- مكونات الواجهة: `DashboardCard`, `PageContainer`, `ModernPageHeader`.

## قرارات ومقايضات
*جدول زمني للقرارات التي يتم اتخاذها أثناء التنفيذ.*
- **تجنب `any`**: تم استخدام واجهات TypeScript الصريحة (`IRollcallEntry`, `IAuditLog`) لضمان مطابقة معايير الدستور.
- **حساب الحاضرين**: يتم حساب عدد الحاضرين عن طريق فلترة مصفوفة `entries` في التمام اليومي للحالة "present"، بدلاً من مجرد عرض حالة التمام.
- **صلاحية القائد**: تم السماح صراحةً للدور `commander` و `admin` بالوصول للوحة القيادة لضمان تكامل عرض القائد.
- **سجل الأنشطة**: تم إضافة رابط لسجل التدقيق الكامل لتسهيل التتبع.

## تذكير بالإكمال
يجب تحديث `docs/aide/progress.md` (المرحلة 5، البند 5.1) عند الانتهاء.

## Testing Prerequisites (CRITICAL)

**Required Services**
- MongoDB 7 (Docker: `docker-compose up -d mongo`, Port: 27017)

**Environment Configuration**
- `MONGODB_URI` set in `.env.local`
- Authorization token for a valid session.

**Manual Validation Checklist**
- [ ] Build succeeds: `cd next && npm run build`
- [ ] **Services started**: MongoDB is running and contains test data (Officers, Missions, etc.)
- [ ] **Application runs**: `npm run dev`
- [ ] **Feature verified**: Navigate to `/arkan-harb`.
- [ ] **Data verified**: Verify that "Active Missions" matches the count in `/arkan-harb/missions`.
- [ ] **Data verified**: Verify that "Recent Activities" shows the last mission created/updated.
- [ ] **Health checks pass**: `/arkan-harb` loads without errors.

**Expected Outcomes**
- Database query logs show efficient fetching of stats.
- Page displays real data instead of placeholders.
- Commander role can view the dashboard.

**Validation Documentation Template**

```markdown
## Validation Results
- [ ] Service started: MongoDB
- [ ] Application started successfully
- [ ] Database tables verified: Officers, Leaves, Missions, PositionAssignments, AuditLogs, DailyRollcalls
- [ ] Seed data verified: Data appears in dashboard cards
- [ ] API endpoints verified: SSR fetch from arkan-harb page
- [ ] Screenshots captured: Dashboard UI with stats and recent activities
```
