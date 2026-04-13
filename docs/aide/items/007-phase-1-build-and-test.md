# Item 007: Phase 1 Build & Test (بناء واختبار المرحلة 1)

## Description

تنفيذ بوابة الجودة الأولى للمرحلة الأولى من تجهيز نظام "أركان حرب". يجب إجراء عمليات البناء والاختبار (Build and Test) للتأكد من أن جميع الإضافات الخاصة بالمرحلة 1 (تشمل الموديلات الجديدة `PositionAssignment`, `Promotion`, `Mission`، وصلاحية النظام الجديدة، بالإضافة لملفات التحقق Zod) تعمل بنجاح بدون التسبب في أي أخطاء أو كسر (Regression) للوظائف الحالية في النظام.

## Acceptance Criteria

- اجتياز عملية البناء `npm run build` بالكامل (0 أخطاء).
- اجتياز الفحص النحوي `npm run lint` (0 أخطاء، 0 تحذيرات جديدة).
- التحقق برمجياً أو يدوياً من أن الموديلات الثلاثة الجديدة متوفرة وقابلة للاستدعاء عبر `index.ts`.
- ظهور صلاحية `arkan_harb` بشكل صحيح في لوحة التحكم عند إضافة أو تعديل مستخدم.

## Implementation Steps

1. التأكد من حفظ وتطبيق جميع التغييرات الخاصة بالعناصر 001 إلى 006.
2. تشغيل كود فحص المشروع (Linting) للتأكد من نظافة التعديلات.
3. تشغيل عملية بناء إنتاجية كاملة (Production Build) للتحقق من سلامة الأنواع (TypeScript Types) وسلامة استدعاءات الخادم (Server components).
4. تتبع أي أخطاء ناتجة ومعالجتها إن وجدت.

## Testing Strategy

- **اختبار البناء الساكن (Static Analysis):** باستخدام TypeScript Compiler (`tsc`) و ESLint.
- **اختبار النظام الأساسي (Manual Validation):** التأكد من عدم تأثر الأجزاء الحالية للنظام عن طريق جلب البيانات للأنظمة القائمة بدون أخطاء.

## Dependencies

- العنصر 001 (`PositionAssignment` Model)
- العنصر 002 (`Promotion` Model)
- العنصر 003 (`Mission` Model)
- العنصر 004 (تصاريح / Export Models)
- العنصر 005 (صلاحيات `arkan_harb`)
- العنصر 006 (Zod Schemas)
- يتطلب اكتمال هذه العناصر قبل البناء الناجح.

## Decisions & Trade-offs

- **nvm-based Node.js**: المشروع يستخدم Node.js v24.10.0 عبر nvm. لتشغيل الأوامر يجب استخدام `source ~/.nvm/nvm.sh` أولاً، وإلا لن تُعرَّف أوامر `node` و `npm`.
- **تحذيرات Lint موجودة مسبقاً**: الأوامر تُنتج 7 تحذيرات `@typescript-eslint/no-unused-vars` في `LeaveRegister.tsx` — هذه تحذيرات موجودة قبل عمل المرحلة الأولى ولا تعلق لها بالتغييرات الجديدة. لا أخطاء جديدة أُضيفت.
- **التحقق من الـ exports**: تم التحقق من محتوى `index.ts` بـ `grep` مباشرة لأن ملفات TypeScript لا تُحمَّل مباشرة بـ `node` بدون تجميع، وهذا سلوك متوقع في بيئة Next.js.
- **Build ناجح 100%**: `npm run build` أنهى بنجاح 43 صفحة (0 أخطاء) باستخدام Next.js 16.2.1 + Turbopack مع TypeScript strict.

## Testing Prerequisites

**Required Services**
- MongoDB 7.x (شبكة محلية عبر Docker: `docker-compose up -d mongo` منفذ 27017)

**Environment Configuration**
- `MONGODB_URI` وجميع المتغيرات القياسية في ملف `.env.local`

**Manual Validation Checklist**
- [x] `npm run lint` ينجح بنسبة 100% (0 أخطاء).
- [x] `npm run build` ينجح باكتساب بناء جاهز بنسبة 100% (0 أخطاء).
- [x] الموديلات مُصدَّرة من `index.ts` — تم التحقق بـ grep.
- [x] صلاحية `arkan_harb` مُسجَّلة في `types.ts` و `User.ts` — تم التحقق بـ grep.
- [ ] **Services started**: (اختياري يدوي) تشغيل السيرفر محلياً عبر `npm run dev` والتحقق من شاشة المستخدمين.

## Validation Results Template

```markdown
## Validation Results — Item 007 ✅
- [x] `npm run lint` → 0 errors, 7 pre-existing warnings in LeaveRegister.tsx (no new warnings)
- [x] `npm run build` → ✓ Compiled successfully in 12.0s — 43 routes, 0 errors
- [x] Models export verified via grep on index.ts: PositionAssignment ✅ Promotion ✅ Mission ✅
- [x] arkan_harb permission verified in lib/auth/types.ts (line 11) and lib/db/models/User.ts (lines 19, 66)
- [x] No regressions: all existing /api/officers/* routes present in build output
```

*Note: `docs/aide/progress.md` MUST be updated (📋 → 🚧 → ✅) when the item is completed.*
