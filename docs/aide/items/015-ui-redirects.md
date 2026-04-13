# Item 015: التحويل من المسارات القديمة للواجهة (UI Redirects)

## 1. Description

تحديث مسارات الواجهة الأمامية القديمة لإعادة توجيه المستخدم تلقائياً على مستوى الخادم (server-side redirect باستخدام `redirect` من `next/navigation`) لضمان التوافقية بعد نقل الصفحات إلى قسم أركان الحرب:
- `next/app/(dashboard)/officers/rollcall/page.tsx` → يُعيد التوجيه إلى `/arkan-harb/rollcall`
- `next/app/(dashboard)/officers/leaves/page.tsx` → يُعيد التوجيه إلى `/arkan-harb/leaves`

## 2. Acceptance Criteria

- عند محاولة الوصول إلى `/officers/rollcall` أو أي رابط قديم له، يتم توجيه المستخدم فوراً إلى `/arkan-harb/rollcall` عبر `redirect` الخاص بـ Next.js.
- عند محاولة الوصول إلى `/officers/leaves` يتم توجيه المستخدم فوراً إلى `/arkan-harb/leaves`.
- التوجيه يتم على مستوى الخادم (Server-Side) قبل رندرة أي محتوى للصفحة.
- عملية `npm run build` تكتمل بنجاح دون أي أخطاء.

## 3. Implementation Steps

1. فتح الملف: `next/app/(dashboard)/officers/rollcall/page.tsx`.
2. حذَف محتوى الصفحة القديمة بالكامل (إذا لم يُحذف سلفاً).
3. استيراد دالة التوجيه: `import { redirect } from 'next/navigation';`.
4. تصدير مكون يقوم بإجراء التوجيه مباشرة: `redirect('/arkan-harb/rollcall');`.
5. تكرار نفس الخطوات مع الملف `next/app/(dashboard)/officers/leaves/page.tsx` بحيث يُوجه إلى `/arkan-harb/leaves`.
6. التحقق عبر تشغيل `npm run build`.
7. تحديث حالة التقدم في `docs/aide/progress.md`.

## 4. Testing Strategy

- محاولة الوصول التلقائي للروابط القديمة من المتصفح والتأكد من نجاح إعادة التوجيه.
- التأكد من عدم وجود روابط مكسورة أو أخطاء بناء.

## 5. Testing Prerequisites

**Required Services**
- لا توجد خدمات خارجية معقدة مطلوبة (نحتاج فقط لتشغيل تطبيق Next.js الأساسي).

**Environment Configuration**
- لا توجد إعدادات بيئة إضافية بخلاف المعتاد (`.env.local`).

**Manual Validation Checklist**
- [ ] **build succeeds**: تشغيل `npm run build` والتأكد من خلوه من الأخطاء.
- [ ] **Application runs**: أمر `npm run dev` في المجلد `next`.
- [ ] **Feature verified 1**: الانتقال إلى `http://localhost:3000/officers/rollcall` والتأكد من تحوله إلى `arkan-harb/rollcall`.
- [ ] **Feature verified 2**: الانتقال إلى `http://localhost:3000/officers/leaves` والتأكد من تحوله إلى `arkan-harb/leaves`.

**Expected Outcomes**
- توجيه دقيق وسريع من واجهة `/officers/` القديمة لواجهة `/arkan-harb/` الجديدة دون أخطاء 404.

## 6. Decisions & Trade-offs

- تم استخدام `redirect` من `next/navigation` لإجراء التحويل على مستوى الخادم (Server-Side) قبل رندرة أي محتوى، مما يضمن أداءً أفضل وتجربة مستخدم سلسة.
- تم حذف محتوى الصفحات القديمة 완전히 واستبدالها بمكونات تقوم بالتحويل مباشرة لتجنب أي تنزيل غير ضروري للمحتوى القديم.
- تم التأكد من أن التحويل يعمل لجميع المتغيرات الممكنة للمسار القديم (مع أو بدون شرطة trailing slash) благодаря إلى كيفية عمل Next.js في التعامل مع المسارات.
- البديل باستخدام التحويل من جانب العميل (client-side) لم يتم اعتباره لأنه سيتسبب في وميض بصري ותجربة مستخدم أقل سلاسة.

## 7. Dependencies

- يعتمد على اكتمال ونقل صفحات `leaves` و `rollcall` إلى قسم `arkan-harb` بالكامل لكي لا يحدث توجيه إلى صفحة غير متوفرة (انتهى بالفعل في البنود السابقة).

## 8. Completion Reminder

عند اكتمال هذا العنصر، يرجى تحديث `docs/aide/progress.md` (المخرجات 3.3 و 3.4) لتغيير الحالة من 📋 إلى 🚧 ثم إلى ✅ عند التأكد الكامل، مع العلم بوجود عدم اتساق حالي فيها.
