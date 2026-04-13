# Item 041: معايير TypeScript والبناء (Build & Types Compliance)

## الوصف
إكمال عملية تنظيف الكود لضمان عدم استخدام `any` نهائياً في ميزة أركان الحرب، وتحقيق "Build Zero Errors" و "Lint Zero Errors" لضمان جودة الكود للإنتاج وتوافقه مع معايير TypeScript الصارمة.

## معايير القبول
- [ ] إزالة كافة حالات `any` في المجلد `next/app/arkan-harb/` والمجلدات ذات الصلة (models, validations).
- [ ] تعديل `tsconfig.json` ليكون أكثر صرامة (`noImplicitAny: true`, `strict: true`).
- [ ] ضمان `npm run build` يعمل بنجاح بدون أي أخطاء (Zero Errors).
- [ ] ضمان `npm run lint` يعمل بنجاح بدون أي أخطاء (Zero Errors).
- [ ] تحديث التوثيق إذا لزم الأمر.

## خطوات التنفيذ
1. فحص ملفات المشروع باستخدام الأدوات التحليلية لتحديد أماكن `any`.
2. استبدال `any` بتعريفات Types واضحة (Interfaces/Types).
3. معالجة أي أخطاء تظهر أثناء الـ Build أو الـ Lint.
4. التأكد من صرامة إعدادات `tsconfig.json`.

## استراتيجية الاختبار
- **Static Analysis**: تشغيل `tsc --noEmit` للتحقق من النوع.
- **Build**: تشغيل `npm run build`.
- **Lint**: تشغيل `npm run lint`.

## الاعتمادات
- لا توجد اعتماديات خارجية جديدة.

## سجل القرارات والمقايضات
- *To be updated during implementation.*

## تذكير بالإكمال
يجب تحديث `docs/aide/progress.md` (📋 → 🚧 → ✅) عند اكتمال المهمة.

## متطلبات الاختبار (Critical)

**الخدمات المطلوبة**
- N/A

**إعدادات البيئة**
- بيئة Node.js (v20+)

**قائمة التحقق من التحقق اليدوي**
- [ ] Build succeeds (Zero Errors)
- [ ] Lint passes (Zero Errors)
- [ ] `tsconfig.json` set to `strict: true`

## النتائج المتوقعة
- كود TypeScript نظيف، آمن، ومطابق للمعايير الاحترافية.

## نتائج التحقق (Validation Results)
- [ ] Build output: [Check]
- [ ] Lint output: [Check]
- [ ] Strict types enforced: [Check]
