# Work Item 037: معايير TypeScript والبناء (Build & Types Compliance)

## الوصف (Description)
هذه المهمة هي جزء من بوابة الجودة النهائية للمرحلة السادسة (Phase 6). الهدف هو التأكد من أن جميع الأكواد التي تمت إضافتها أو تعديلها في ميزة أركان الحرب (009-arkan-harb) تتوافق تماماً مع معايير المشروع الصارمة: لا استخدام لـ `any` نهائياً، التزام كامل بـ TypeScript Strict Mode، وبناء المشروع وتحليله (Build & Lint) بدون أي أخطاء أو تحذيرات.

## معايير القبول (Acceptance Criteria)
- [ ] **Zero `any` Usage**: لا يوجد أي استخدام للنوع `any` في الملفات الجديدة أو المعدلة ضمن نطاق الميزة.
- [ ] **Strict Type Safety**: جميع المتغيرات والبارامترات ومخرجات الدوال معرفة الأنواع بدقة.
- [ ] **Build Success**: تشغيل `npm run build` ينتهي بنجاح بدون أي أخطاء.
- [ ] **Lint Success**: تشغيل `npm run lint` ينتهي بنجاح بدون أي أخطاء أو تحذيرات متعلقة بميزة أركان الحرب.
- [ ] **Zod Validation Integration**: جميع البيانات القادمة من API أو النماذج يتم التحقق منها عبر Zod schemas بشكل صارم.

## خطوات التنفيذ (Implementation Steps)
1. **البحث عن `any`**:
   - استخدام `grep` للبحث عن كلمة `any` في مجلدات `next/app/arkan-harb`, `next/lib/db/models/arkan-harb` (إن وجد), و `next/lib/validations/arkan-harb.ts`.
   - استبدال أي `any` بأنواع محددة أو `unknown` مع Type Guards إذا لزم الأمر.
2. **تدقيق التحذيرات الحالية**:
   - تشغيل `npm run lint` ورصد التحذيرات المتعلقة بملفات أركان الحرب.
   - إصلاح التحذيرات (مثل unused variables, missing dependencies in useEffect, etc.).
3. **تحقق البناء (Build Check)**:
   - تشغيل `npm run build` في بيئة التطوير للتأكد من عدم وجود أخطاء في الـ Dynamic Routes أو الـ Types أثناء التجميع.
4. **تدقيق Zod Schemas**:
   - التأكد من أن جميع الـ Schemas في `arkan-harb.ts` تستخدم `.strict()` حيثما أمكن لضمان عدم وجود حقول غريبة.
   - التأكد من تطابق الـ Zod Infer Types مع واجهات (Interfaces) الموديلات في Mongoose.

## استراتيجية الاختبار (Testing Strategy)
- **اختبار آلي**: الاعتماد بشكل أساسي على `tsc --noEmit` و `next lint` و `next build`.
- **مراجعة كودية**: فحص بصري للملفات للتأكد من وضوح الأنواع وسهولة قراءتها.

## التبعيات (Dependencies)
- انتهاء المهام من 029 إلى 036 لضمان مراجعة الكود النهائي.

## قرارات ومقايضات (Decisions & Trade-offs)
- "To be updated during implementation."

## متطلبات الاختبار المسبقة (Testing Prerequisites)

**الخدمات المطلوبة**
- MongoDB 7 (Docker: `docker-compose up -d mongo`, Port: 27017)

**إعداد البيئة**
- تأكد من تثبيت كافة التبعيات: `npm install` في مجلد `next`.

**قائمة التحقق للتحقق اليدوي**
- [ ] **Build succeeds**: `cd next && npm run build` (المتوقع: 0 errors)
- [ ] **Lint succeeds**: `cd next && npm run lint` (المتوقع: 0 errors/warnings متعلقة بـ arkan-harb)
- [ ] **No `any` found**: `grep -r "any" next/app/arkan-harb` (لا توجد نتائج غير مبررة)
- [ ] **Application runs**: التطبيق يعمل بشكل طبيعي بعد البناء

## مخرجات متوقعة (Expected Outcomes)
- تقرير البناء يظهر: `✓ Compiled successfully`
- تقرير الـ Lint يظهر: `✔ No errors or warnings` (أو فقط التحذيرات القديمة المستثناة تاريخياً إن وجدت)

## نتائج التحقق (Validation Results Template)
```markdown
## نتائج التحقق
- [ ] تم تشغيل npm run build بنجاح
- [ ] تم تشغيل npm run lint بنجاح
- [ ] تم التأكد من خلو الملفات المعدلة من any
- [ ] تم التحقق من سلامة الواجهة بعد البناء
```

---
**تذكير**: يجب تحديث `docs/aide/progress.md` (📋 → 🚧 → ✅) عند الانتهاء من العمل.
