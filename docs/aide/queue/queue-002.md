# قائمة العمل — الدفعة 002

**التاريخ**: 2026-04-10  
**المصدر**: `docs/aide/roadmap.md` (بقية المرحلة 2 + المرحلة 3 بالكامل)  
**النطاق**: بقية مسارات API أركان الحرب + بناء وتجهيز صفحات واجهة المستخدم لأركان الحرب  
**الحجم المُقدَّر**: ~أسبوع واحد

---

## العناصر

### Item 011: API Routes — التعيينات الوظيفية (Positions)
إنشاء API routes تحت `next/app/api/arkan-harb/positions/`:
- `route.ts`: `GET` (قائمة + فلترة بـ `officerId`/`status`) + `POST` (إنشاء)
- `[id]/route.ts`: `PATCH` (تحديث) + `DELETE` (حذف)
كل route يتبع pipeline: `auth → rate-limit → RBAC (arkan_harb: edit) → Zod → DB → audit → response`. يجب إضافة تحقق (Validation) لمنع إنشاء تعيين أساسي إذا كان يوجد تعيين أساسي نشط على نفس `positionTitle` لضابط آخر (يعرض تحذيراً).

### Item 012: API Routes — إعادة توجيه التمام والإجازات (Backwards Compatibility)
إنشاء وتحديث API routes للعمل كروابط متوافقة مع الأنظمة القديمة أو لتعمل كروابط مشتركة:
- `next/app/api/arkan-harb/rollcall/route.ts`: إعادة توجيه (Redirect) أو مشاركة المنطق مع `/api/officers/rollcall`.
- `next/app/api/arkan-harb/leaves/route.ts` و `[id]/route.ts`: إعادة توجيه أو مشاركة المنطق مع مسارات الإجازات في `officers`.
التأكد من أن جميع الاستدعاءات تعمل بسلاسة للمحافظة على التوافقية (Backwards Compatibility) مع الواجهات الحالية.

### Item 013: نقل التمام اليومي (Rollcall Page)
إنشاء صفحة `next/app/(dashboard)/arkan-harb/rollcall/page.tsx` للتمام اليومي. نقل مكون التمام للعمل داخل واجهة أركان الحرب، واستخدام `RollcallSheet.tsx` و `RollcallSummary.tsx`. التأكد من أن مسودة الحفظ المحلي (Local Storage Recovery) تعمل بشكل صحيح للتمام كما كانت.

### Item 014: نقل سجل الإجازات (Leaves Page)
إنشاء صفحة `next/app/(dashboard)/arkan-harb/leaves/page.tsx` لسجل الإجازات الخاص بأركان الحرب. استخدام مكون `LeaveRegister.tsx` و `LeaveAddModal.tsx` ليعملا تحت مسار أركان الحرب بشكل كامل. يشمل ذلك الفلترة بالضابط والنوع والحالة، وتأكيد صلاحيات العرض والإضافة.

### Item 015: التحويل من المسارات القديمة للواجهة (UI Redirects)
تحديث مسارات الواجهة الأمامية القديمة لإعادة توجيه المستخدم تلقائياً على مستوى الخادم (server-side redirect باستخدام `redirect` من `next/navigation`):
- `next/app/(dashboard)/officers/rollcall/page.tsx` → يُعيد التوجيه إلى `/arkan-harb/rollcall`
- `next/app/(dashboard)/officers/leaves/page.tsx` → يُعيد التوجيه إلى `/arkan-harb/leaves`

### Item 016: صفحة المأموريات للمستخدم (Missions Page)
بناء صفحة `next/app/(dashboard)/arkan-harb/missions/page.tsx` لعرض وحدة المأموريات.
إنشاء المكونات المطلوبة: `components/arkan-harb/MissionsTable.tsx` لجدول العرض مع البحث والفلترة، و `components/arkan-harb/MissionForm.tsx` كنموذج إضافة/تعديل (ضمن Modal). يجب تمييز حالات المأمورية بالألوان (مجدولة=أزرق، نشطة=أخضر، مكتملة=رمادي، ملغاة=أحمر).

### Item 017: صفحة التعيينات الوظيفية للمستخدم (Position Assignments Page)
بناء صفحة `next/app/(dashboard)/arkan-harb/positions/page.tsx`.
إنشاء المكونات المطلوبة: `components/arkan-harb/PositionAssignmentTable.tsx` كجدول للتعيينات مع فلترة واضحة، و `components/arkan-harb/PositionAssignmentForm.tsx` نموذج إضافة/تعديل (ضمن Modal). تمييز الوظيفة الأساسية من البديلة مع عرض اسم الضابط المُبدَل.

### Item 018: تحديث نموذج ترقية الضابط (OfficerPromoteModal)
تحديث مكون `OfficerPromoteModal.tsx` ليتعامل مع موديل `Promotion` الجديد بدلاً من موديل `Assignment` القديم. تحديث الـ API Calls لترسل بيانات الترقية (POST request) إلى المسار الجديد `/api/arkan-harb/promotions` متضمناً `fromRank` و `toRank`.

### Item 019: مراجعة الجودة وبناء المرحلة 2 و 3
إجراء اختبارات البناء `npm run build` والفحص `npm run lint` للتأكد من عدم وجود أخطاء بعد دمج صفحات ومسارات المرحلتين الثانية والثالثة. التحقق من تطبيق التصميم العربي (RTL) بشكل متسق، وأن جميع مكونات الواجهة تتوافق مع نظام التصميم المعتمد (Design System) وتعتمد على Server-Side Rendering قدر الإمكان.

---

## الخطوة التالية

اختر عنصراً من القائمة وابدأ **جلسة جديدة**. شغّل `/speckit.aide.create-item` مع وصف العنصر لإنشاء مواصفات تفصيلية للمهمة.
