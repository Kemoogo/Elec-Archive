# Work Item 020: مكون التبويبات (OfficerDetailTabs component)

## Description
إنشاء المكون الأساسي للتبويبات في صفحة تفاصيل الضابط (`next/components/officers/OfficerDetailTabs.tsx`). هذا المكون سيعيد هيكلة عرض صفحة الضابط من القائمة الطويلة إلى تبويبات منظمة (Tabs) باستخدام نظام تصميم shadcn/ui.

## Acceptance Criteria
- [ ] إنشاء مكون `OfficerDetailTabs.tsx` باستخدام `Tabs`, `TabsList`, `TabsTrigger`, و `TabsContent` من shadcn/ui.
- [ ] المكون يجب أن يكون `'use client'`.
- [ ] دعم 4 تبويبات باللغة العربية:
    1. **البيانات الأساسية** (Basic Info)
    2. **سجل الإجازات** (Leaves)
    3. **السجل المهني** (Career Timeline)
    4. **السجل الوظيفي** (Job History)
- [ ] التصميم متوافق تماماً مع RTL (النصوص والأيقونات).
- [ ] المكون يستقبل `children` لكل تبويبة كـ props أو يتم تعريفه كمكون حاوي.
- [ ] دعم التنقل عبر لوحة المفاتيح (Keyboard accessibility).
- [ ] حالة النشاط (Active state) تظهر بوضوح بصرياً.

## Implementation Steps
1. التأكد من توفر مكونات `Tabs` الأساسية في `next/components/ui/tabs.tsx`.
2. إنشاء الملف `next/components/officers/OfficerDetailTabs.tsx`.
3. تعريف الـ Tabs triggers بالأسماء العربية المناسبة.
4. إضافة Props لاستقبال المحتوى لكل تبويبة (أو استخدام Slot pattern).
5. تنسيق المكون ليتناسب مع أبعاد صفحة الضابط الحالية.

## Testing Strategy
- **Manual Verification**:
    - التأكد من ظهور التبويبات الأربعة عند عرض المكون.
    - التحقق من إمكانية التبديل بين التبويبات وظهور المحتوى الصحيح لكل منها.
    - التحقق من استجابة المكون (Responsiveness) على الشاشات المختلفة.
- **Accessibility**:
    - استخدام المفاتيح السهمية للتنقل بين التبويبات.

## Dependencies
- `shadcn/ui` Tabs component
- المرحلة 3 مكتملة (لضمان وجود المسارات الصحيحة)

## Decisions & Trade-offs
- تم تنفيذ مكون `Tabs` يدوياً في `next/components/ui/tabs.tsx` لمحاكاة واجهة برمجة تطبيقات Radix UI/shadcn دون الحاجة لإضافة مكتبات خارجية جديدة، مع الحفاظ على التوافق مع نظام التصميم.
- تم استخدام `useSearchParams` و `useRouter` لمزامنة حالة التبويبة مع URL، مما يسمح بمشاركة الروابط لتبويبات محددة.
- تم تفعيل خاصية الـ RTL عبر تنسيقات Tailwind القياسية.

## Testing Prerequisites (CRITICAL)

**Required Services**
- MongoDB (Docker: `docker-compose up -d mongo`)
- Next.js Dev Server (`npm run dev` في مجلد `next`)

**Manual Validation Checklist**
- [ ] Build succeeds: `npm run build`
- [ ] Services started: `docker-compose up -d mongo`
- [ ] Application runs: `npm run dev`
- [ ] **Feature verified**:
    - [ ] فتح صفحة أي ضابط (بعد دمج المكون في الخطوة القادمة) أو معاينة المكون في Storybook/Isolated page.
    - [ ] التبديل بين التبويبات الأربعة يعمل.
    - [ ] النصوص تظهر باللغة العربية ومعاذاة لليمين (RTL).
- [ ] **Health checks pass**: `/officers/[id]` تفتح بدون أخطاء Console.

## Validation Documentation Template
```markdown
## Validation Results
- [ ] Service started: MongoDB
- [ ] Application started successfully: Yes
- [ ] UI components verified: OfficerDetailTabs rendered
- [ ] RTL verified: Yes
- [ ] Accessibility verified: Keyboard nav works
```

## Completion Reminder
يجب تحديث `docs/aide/progress.md` (📋 → 🚧 → ✅) عند اكتمال هذا العنصر.
