# Implementation Plan: سياسة وحوكمة النسخ الاحتياطي الربع سنوي وتدوير النسخ (المرحلة الثانية)

**Branch**: `012-quarterly-backup-retention` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/012-quarterly-backup-retention/spec.md` (المرحلة الثانية من وثيقة PRD - البند ثانياً والميزة FEAT-SYS-01).

## Summary

تنفيذ منظومة متكاملة لإدارة وتوليد النسخ الاحتياطية وتدويرها في بيئة المنظومة المعزولة:
1. محرك نسخ واستعادة متكامل يعتمد على دفق مجموعات Mongoose وأرشفة مجلد المرفقات `public/uploads` في ملف مضغوط واحد `.tar.gz` ببصمة SHA-256 مشفرة دون الحاجة لأدوات خارجية أو صلاحيات دوكر.
2. تطبيق سياسة تدوير صارمة تدمج النسخ وتحتفظ بأحدث 4 نسخ فقط وتحذف الأقدم تلقائياً مع التوثيق في سجل التدقيق.
3. فحص استباقي للمساحة الحرة (`fs.promises.statfs`) يشترط توفر 20% مساحة فارغة وضعف الحجم التقديري قبل الشروع في النسخ.
4. واجهة استرجاع مؤمنة تطلب كلمة مرور مدير النظام وتأكيداً كتابياً صريحاً لمنع الأخطاء البشرية.
5. صفحة إدارة تفاعلية `/admin/backup` مبنية وفق نظام تصميم **Sapphire Archive** باستخدام `MainTable` و`ModalShell` ومؤشر سعة القرص.

## Technical Context

**Language/Version**: TypeScript 5.9.x (Strict mode, no `any`), Node.js 20+  
**Primary Dependencies**: Next.js 16.4.x (App Router, React 19), Mongoose 9.6.x, Zod 4, bcryptjs, date-fns, lucide-react  
**Storage**: MongoDB 7 محلي، ونظام الملفات المحلي للمرفقات `public/uploads/` ومجلد النسخ `public/uploads/backups/`  
**Testing**: فحص الأنواع الصارم `npx tsc --noEmit`، وسيناريوهات التحقق الوظيفية في `quickstart.md`  
**Target Platform**: Linux / Windows Server في بيئة محلية مغلقة بالكامل (Air-Gapped Intranet)  
**Project Type**: Web Application (Next.js SSR-First + REST API Routes)  
**Performance Goals**: تجهيز الأرشيف بالكامل في أقل من 180 ثانية، واستعادة النظام في أقل من 5 دقائق  
**Constraints**: العمل بدون إنترنت بنسبة 100%، سقف أقصى 4 نسخ على القرص، قفل تنفيذي أحادي لمنع التزامن  
**Scale/Scope**: قواعد بيانات محلية بحجم تشغيلي عسكري معتاد (عشرات الآلاف من السجلات وبضعة غيغابايت من المرفقات)  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| المبدأ الدستوري | حالة الامتثال | الملاحظات والضوابط |
| :--- | :---: | :--- |
| **I. Security-First** | **PASS** | التحقق من جلسة المدير `Admin` حصرياً، التحقق المزدوج بكلمة المرور عبر `bcryptjs` عند الاسترجاع، وتوثيق كافة العمليات (توليد، تدوير، حذف، تنزيل، استعادة) في `AuditLog`. |
| **II. SSR-First** | **PASS** | صفحة `/admin/backup` تُحمّل بالـ React Server Components مع عزل التفاعل في مكوّنات تفاعلية دقيقة، واستخدام أرقام مصفوفة `tabular-nums`. |
| **III. Offline-First** | **PASS** | المحرك يعمل بالكامل بمكتبات Node.js وMongoose الأصلية دون أي اتصال خارجي أو سحابي، وتخزين المرفقات والنسخ محلياً. |
| **IV. Type Safety** | **PASS** | حظر تام لاستخدام `any`، والتحقق الصارم من كافة المدخلات ومخرجات الـ API عبر مخططات Zod 4. |
| **V. Quality Gates & Main Protection** | **PASS** | العمل يجري بالكامل داخل الفرع المستقل `012-quarterly-backup-retention` وحظر الدمج في `main` إلا بأمر مباشر، مع إلزامية فحص `npx tsc --noEmit` بـ 0 أخطاء. |
| **VI. Design System (Sapphire Archive)** | **PASS** | استخدام `MainTable` للجدول، `ModalShell` بدون `backdrop-blur` لنوافذ الاسترجاع والتأكيد، الأزرار الموحدة (`btn-primary`, `btn-secondary`, `btn-destructive`)، والرموز اللونية القياسية. |

## Project Structure

### Documentation (this feature)

```text
specs/012-quarterly-backup-retention/
├── plan.md              # هذا الملف (خطة التنفيذ المعمارية)
├── spec.md              # مواصفة الميزة وحسم الاستيضاحات
├── research.md          # أبحاث وتوصيف القرارات التقنية
├── data-model.md        # نماذج البيانات ودورة حياة النسخ
├── quickstart.md        # دليل التحقق والتشغيل السريع
├── contracts/
│   └── backup-api.md    # عقود مسارات الـ APIs ومخططات الطلب والرد
└── checklists/
    └── requirements.md  # قائمة فحص جودة المواصفة
```

### Source Code Layout

```text
next/
├── app/
│   ├── (dashboard)/
│   │   └── admin/
│   │       └── backup/
│   │           └── page.tsx           # صفحة إدارة النسخ الاحتياطية والاسترجاع
│   └── api/
│       └── admin/
│           └── backup/
│               ├── route.ts           # استعلام القائمة وإنشاء النسخة الفورية
│               ├── [id]/
│               │   └── route.ts       # حذف نسخة أو فحص تفاصيلها
│               ├── download/
│               │   └── [id]/
│               │       └── route.ts   # تحميل ملف الأرشيف الثنائي
│               ├── quarterly/
│               │   └── route.ts       # تشغيل النسخ الربع سنوي وتطبيق التدوير
│               └── restore/
│                   └── route.ts       # محرك الاسترجاع المحمي والتحقق المزدوج
├── components/
│   └── admin/
│       ├── backup-table.tsx           # جدول النسخ الاحتياطية باستخدام MainTable
│       ├── backup-storage-meter.tsx   # شريط استهلاك سعة التخزين وتنبيه 20%
│       └── restore-confirm-modal.tsx  # نافذة تأكيد الاسترجاع المحمية بكلمة المرور
├── lib/
│   ├── backup/
│   │   ├── backup-engine.ts           # المحرك الأساسي لتفريغ البيانات والمرفقات
│   │   ├── restore-engine.ts          # محرك الاستعادة الذري وفك الضغط
│   │   ├── retention-manager.ts       # محرك تطبيق قاعدة أحدث 4 نسخ والحذف
│   │   └── disk-space.ts              # محرك فحص المساحة الحرة عبر statfs
│   └── db/
│       └── models/
│           ├── BackupRecord.ts        # نموذج سجل النسخة الاحتياطية
│           └── RestoreOperation.ts    # نموذج سجل عملية الاستعادة
└── types/
    └── backup.ts                      # الأنواع المشتركة المركزية للنسخ الاحتياطي
```

**Structure Decision**: 
تم اعتماد بنية Next.js App Router المعيارية للمشروع، مع فصل محركات التشغيل في `next/lib/backup/` والنماذج في `next/lib/db/models/` والأنواع المركزية في `next/types/backup.ts` مع التزام تام بالدستور ونظام التصميم Sapphire Archive.

## Complexity Tracking

> **لا توجد أي خروقات دستورية أو تعقيدات غير مبررة.**
