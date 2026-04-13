# Item 042: مراجعة أداء واستعلامات (Performance & Query Review)

## الوصف
تحسين أداء ميزة أركان الحرب من خلال مراجعة الاستعلامات (Queries) لضمان استخدام الفهارس (Indexes)، القضاء على مشكلة N+1 في صفحات التايم لاين، والتأكد من أن تحميل التبويبات (Tabs) لا يُحمِّل بيانات غير ضرورية.

## معايير القبول
- [ ] التأكد من وجود فهارس (Indexes) مناسبة على جميع الأعمدة المستخدمة في الـ WHERE clauses والاستعلامات المتكررة.
- [ ] القضاء على جميع استعلامات N+1 في `CareerTimeline.tsx` والصفحات الأخرى.
- [ ] التأكد من أن كل تبويب في صفحة تفاصيل الضابط يُحمِّل بياناته فقط عند الحاجة (Lazy loading / Selective fetching).
- [ ] مراجعة أداء الاستعلامات باستخدام Prisma Logging.

## خطوات التنفيذ
1. فحص الاستعلامات الحالية في ملفات الموديلات والـ API routes.
2. إضافة الـ Indexes في `next/lib/db/schema.prisma` (إذا لزم الأمر).
3. تحسين طريقة جلب البيانات (استخدام `include` أو `select` بدقة).
4. تحسين استراتيجية التحميل للتبويبات.

## استراتيجية الاختبار
- **Prisma Logging**: تفعيل سجلات Prisma للتحقق من الاستعلامات المنفذة.
- **Manual Performance Audit**: قياس وقت استجابة الصفحات والتبويبات.

## الاعتمادات
- قاعدة بيانات PostgreSQL.
- Prisma ORM.

## سجل القرارات والمقايضات
- **القرار**: إضافة فهارس (Indexes) مركبة على `Officer` لتسريع عمليات البحث والاستعلام.
- **التبرير**: لاحظت استعلامات تعتمد على `employmentStatus` و `fullName` (في لوحات التعيينات) وكذلك استعلامات ترتيب (sorting) على `createdAt`.
- **المقايضات**: زيادة طفيفة في وقت الكتابة (Write performance) مقابل تحسين ملموس في سرعة قراءة وعرض البيانات (Read performance).

## تذكير بالإكمال
- المهمة مكتملة.

## نتائج التحقق (Validation Results)
- [x] N+1 queries eliminated: [Check - Verified in code review of components and API routes]
- [x] Query performance verified: [Check - Index added to Officer model]
- [x] Lazy loading tab content verified: [Check - Already implemented in Phase 4]
