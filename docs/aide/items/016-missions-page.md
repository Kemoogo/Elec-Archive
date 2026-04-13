# العمل على عنصر 016: صفحة المأموريات للمستخدم (Missions Page)

## الوصف (Description)
بناء الواجهة الأمامية لوحدة المأموريات الخاصة بفرع أركان الحرب. سيتم إنشاء الصفحة الرئيسية للمأموريات بالإضافة إلى مكونات الجدول والنموذج لإتاحة القدرة على استعراض وإنشاء وتعديل المأموريات للضباط. تتضمن الواجهة عرضاً لجدول المأموريات مع إمكانيات البحث والفلترة، بالإضافة إلى تمييز كل حالة للمأمورية بلون محدد (مجدولة=أزرق، نشطة=أخضر، مكتملة=رمادي، ملغاة=أحمر).

## معايير القبول (Acceptance Criteria)
- [ ] إنشاء الصفحة `next/app/(dashboard)/arkan-harb/missions/page.tsx`.
- [ ] إنشاء مكون `MissionsTable.tsx` في `components/arkan-harb/` ليعرض بيانات المأموريات (الضابط، المهمة، تاريخ البداية والنهاية، الجهة، الحالة).
- [ ] دعم البحث والفلترة في `MissionsTable` (حسب الضابط، الوحدة، الحالة، المدة).
- [ ] إنشاء مكون `MissionForm.tsx` (نموذج الإضافة/التعديل) داخل نافذة منبثقة (Modal).
- [ ] تمييز الحالات الخاصة بالمأموريات بالألوان (مجدولة: أزرق، نشطة: أخضر، مكتملة: رمادي، ملغاة: أحمر).
- [ ] دعم واجهة باللغة العربية (RTL) واتباع نظام التصميم (Design System) الخاص بالمشروع بناءً على مكتبة shadcn/ui.
- [ ] اجتياز بنية الواجهة كـ Server-Component قدر الإمكان وتحديد `'use client'` حصراً للمكونات التفاعلية (مثل Modal والجدول التفاعلي).

## خطوات التنفيذ (Implementation Steps)
1. العمل على إعداد `next/components/arkan-harb/MissionsTable.tsx` بناءً على مكتبة Table الخاصة بـ shadcn/ui.
2. إضافة Badge component للتمييز اللوني المتعلق بالـ status.
3. العمل على مكون نموذج `next/components/arkan-harb/MissionForm.tsx` بالاعتماد على Zod لـ validation الخاص به و `react-hook-form`.
4. بناء صفحة الـ Page `next/app/(dashboard)/arkan-harb/missions/page.tsx` وجلب البيانات من مسار الـ API `/api/arkan-harb/missions`.
5. دمج الـ Modal لفتح مكون المأموريات في حال أردنا التعديل أو إضافة مأمورية جديدة.

## استراتيجية الاختبار (Testing Strategy)
- التأكد من إظهار بيانات المأمورية بشكل سليم بناءً على القواعد والألوان المحددة.
- التأكد من إمكانية تغيير حالة المأمورية وحفظها بنجاح عبر الواجهة دون أية أخطاء.
- التحقق من الفلترة داخل الجدول، ومن عمل نماذج البحث والتصفية.

## المتطلبات المسبقة للاختبار (Testing Prerequisites)

**الخدمات المطلوبة (Required Services)**
- MongoDB 7 (Docker: `docker-compose up -d mongo`, Port: 27017)

**إعداد البيئة (Environment Configuration)**
- وجود ملف `.env.local` يحتوي على `MONGODB_URI` و `JWT_SECRET`.

**قائمة التحقق للمصادقة اليدوية (Manual Validation Checklist)**
- [ ] **Services started**: `docker-compose up -d mongo`
- [ ] **Application runs**: `cd next && npm run dev`
- [ ] **Feature verified**: تم التحقق من عمل صفحات Missions بشكل كامل ورؤية مكون المأموريات.
- [ ] **Data verified**: تم التأكد من جلب بيانات المأموريات وإنشاء مأمورية بشكل ناجح.

## الاعتماديات (Dependencies)
- العنصر الحالي يعتمد على إنجاز [009-api-missions.md](./009-api-missions.md) المرتبط بإنشاء الـ API. (اكتمل بالفعل). 

## سجل القرارات (Decision Log / Decisions & Trade-offs)
- **فصل المكونات (Component Splitting)**: تم فصل الصفحة إلى Server Component (`page.tsx`) لتحسين الأداء والأمان، و Client Component (`MissionsClient.tsx`) للتعامل مع الحالة التفاعلية (Modals, Filtering).
- **إدارة الحالة (State Management)**: بدلاً من الاعتماد على `react-hook-form` (الذي تبين عدم وجوده في المشروع)، تم استخدام `useState` اليدوي مع مكونات `ModalShell` و `ModalActions` لضمان التوافق الكامل مع نمط التصميم المتبع في `OfficerForm.tsx`.
- **جلب البيانات (Data Fetching)**: تم استخدام `populate` في الـ Server Component لجلب أسماء الضباط مباشرة، مما يقلل من عدد الطلبات من الواجهة الأمامية.
- **تحديث البيانات (Data Refresh)**: تم استخدام `router.refresh()` بعد حفظ المأمورية لضمان مزامنة البيانات مع السيرفر دون الحاجة لإعادة تحميل الصفحة بالكامل.
- **تحسين البحث**: تم استخدام `isLoading` لإعطاء تغذية راجعة للمستخدم عند تغيير الفلاتر أو التنقل بين الصفحات.

## تذكير (Completion Reminder)
يرجى تحديث حالة العنصر في `docs/aide/progress.md` من (📋 → 🚧 → ✅) بمجرد الانتهاء من التنفيذ.

### Validation Results (Template)
- [ ] Service started: MongoDB
- [ ] Application started successfully
- [ ] API endpoints verified: `GET/POST /api/arkan-harb/missions` functioning correctly.
- [ ] UI rendered properly without errors.
