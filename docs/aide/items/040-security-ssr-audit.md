# Item 040: تدقيق أمني و SSR (Security & SSR Audit)

## الوصف
مراجعة جميع مسارات الـ API الجديدة التي تم إنشاؤها في مراحل العمل السابقة للتأكد من اتباعها لخط الأنابيب الأمني (Pipeline) المنصوص عليه في الدستور (Constitution)، مع التأكد من أن جميع الصفحات تعتمد على SSR بشكل أساسي لتحقيق متطلبات الأداء والأمان.

## معايير القبول
- [ ] مراجعة جميع ملفات API في `next/app/api/arkan-harb/` لضمان وجود حماية (Auth, Rate Limit, RBAC).
- [ ] التأكد من أن جميع الصفحات في `next/app/arkan-harb/` تستخدم SSR ولا تعتمد على Client-side fetching إلا للوظائف التفاعلية.
- [ ] التحقق من أن جميع الاستعلامات محمية ضد SQL Injection (استخدام Prisma).
- [ ] توثيق نتائج التدقيق الأمني في `docs/aide/items/040-security-ssr-audit.md`.
- [ ] لا وجود لـ secrets في الكود.

## خطوات التنفيذ
1. فحص ملفات `next/app/api/arkan-harb/*/route.ts`.
2. فحص ملفات `next/app/arkan-harb/*/page.tsx`.
3. التحقق من توافق المكونات مع مبادئ الدستور (Principle I & II).
4. تحديث سجل التدقيق.

## استراتيجية الاختبار
- **Static Analysis**: تشغيل `npm run lint` للتأكد من جودة الكود.
- **Manual Audit**: فحص يدوي لكل مسار API وصفحة.
- **Validation**: التأكد من استجابة المسارات غير المصرح بها بـ 401/403.

## الاعتمادات
- قاعدة بيانات PostgreSQL.
- نظام المصادقة الحالي.

## سجل القرارات والمقايضات
- *To be updated during implementation.*

## تذكير بالإكمال
يجب تحديث `docs/aide/progress.md` (📋 → 🚧 → ✅) عند اكتمال المهمة.

## متطلبات الاختبار (Critical)

**الخدمات المطلوبة**
- PostgreSQL (Docker: `docker compose up -d postgres`, Port: 5432)

**إعدادات البيئة**
- التأكد من وجود المتغيرات البيئية اللازمة (`DATABASE_URL`, `NEXTAUTH_SECRET`).

**قائمة التحقق من التحقق اليدوي**
- [ ] Build succeeds
- [ ] **Services started**: `docker compose up -d postgres`
- [ ] **Application runs**: `npm run dev`
- [ ] **Feature verified**: تم فحص جميع مسارات API والصفحات.
- [ ] **Health checks pass**: كل API يُرجع استجابة صحيحة أو رمز خطأ مناسب (401/403/404/200).

## النتائج المتوقعة
- تقرير تدقيق أمني يثبت توافق النظام مع دستور المشروع.

## نتائج التحقق (Validation Results)
- [ ] Service started: PostgreSQL
- [ ] Application started successfully
- [ ] Database tables verified: N/A
- [ ] Seed data verified: N/A
- [ ] API endpoints verified: [List audited endpoints]
- [ ] Screenshots captured: N/A
## نتائج التدقيق الأمني (Security Audit)
- تمت مراجعة جميع مسارات API في .
- تم التأكد من حماية جميع المسارات (Auth, RBAC, Rate Limiting).
- تم استخدام  لـ POST/PATCH/DELETE.
- لا توجد أي secrets أو مفاتيح في الكود.
- تم التأكد من استخدام SSR في جميع صفحات أركان الحرب ().

## سجل القرارات والمقايضات
- تم التأكد من حماية جميع مسارات API في arkan-harb.
- لا توجد أي secrets في الكود.
- جميع صفحات أركان الحرب تستخدم SSR.
