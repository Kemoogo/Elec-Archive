# Data Model & Schema Specifications: شئون الطلاب وترقية ملفات MDB
## دورة حياة الدفعة، مصفوفة التصنيفات، ومحرك الترحيل والنقل

**Feature**: `011-students-mdb-upgrade`  
**Date**: 2026-11-05 (Updated for Classification, Batch Workflow & Relocation Engine)

---

## 1. نموذج الدفعة والمرحلة التجنيدية `StudentBatch` (جديد)

**المسار:** `next/lib/db/models/StudentBatch.ts` و `next/lib/db/models/StudentBatch.shared.ts`

### الواجهات والأنواع المركزية (Batch Types)

```typescript
export interface IBatchClassification {
  id: string;                  // معرف التصنيف الفريد (slug أو uuid)
  name: string;                // مسمى التصنيف بالعربية (صف إشارة، تد مهني، إشارة ق. ج، ...)
  description?: string;        // وصف التصنيف ومجال الخدمة
  isDefault?: boolean;         // هل هو من التصنيفات الأساسية
}

export interface IStudentBatch extends Document {
  mrhla: string;               // رمز المرحلة التجنيدية (e.g. "20241")
  name: string;                // المسمى المقروء (e.g. "مرحلة 2024/1")
  targetCount: number;         // المقرر وصوله من مناطق التجنيد
  arrivedCount: number;        // ما تم وصوله فعلياً بالوحدة
  remainingCount: number;      // المتبقي للوصول (محسوب: المقرر - الواصل)
  isActiveStage: boolean;      // هل هي المرحلة الحالية المختارة
  classifications: IBatchClassification[]; // بنك التصنيفات التخصصية المعتمدة للدفعة
  startDate?: Date;            // تاريخ بدء تدريب الدفعة
  endDate?: Date;              // تاريخ انتهاء التدريب والتسريح
  createdAt: Date;
  updatedAt: Date;
}
```

### بنية الحقول (StudentBatch Schema Fields)

| الحقل | النوع | القيود والفهارس | الوصف |
| :--- | :--- | :--- | :--- |
| `mrhla` | `String` | فريد، إلزامي، مفهرس | رمز الدفعة التجنيدية (مثل `20241`) |
| `name` | `String` | إلزامي | اسم الدفعة بالعربية (مثل "مرحلة 2024/1") |
| `targetCount` | `Number` | افتراضي 0 | القوة المقرر وصولها للدفعة |
| `arrivedCount` | `Number` | افتراضي 0 | القوة التي وصلت واستلمتها الوحدة فعلياً |
| `remainingCount` | `Number` | افتراضي 0 | المتبقي للوصول (المقرر - الواصل) |
| `isActiveStage` | `Boolean` | افتراضي `false`، مفهرس | هل هي المرحلة الحالية المختارة |
| `classifications` | `[IBatchClassification]` | مصفوفة كائنات | التصنيفات المعتمدة القابلة للتخصيص |
| `startDate` | `Date` | اختياري | تاريخ استقبال الدفعة وبدء الدورة |
| `endDate` | `Date` | اختياري | تاريخ التخرج والتسريح المخطط |

---

## 2. نموذج بيانات الطالب `Student` المطور

**المسار:** `next/lib/db/models/Student.ts` و `next/lib/db/models/Student.shared.ts`

### الواجهات والأنواع المركزية (Centralized Types)

```typescript
export type StudentStatus = 
  | "active"                  // نشط في التدريب
  | "graduated"               // متخرج / مسرح بالموعد
  | "inactive"                // غير نشط
  | "withdrawn";              // منسحب

export type QualificationType = 
  | "high"          // مؤهل عالٍ (عليا)
  | "above_avg"      // مؤهل فوق متوسط
  | "average"        // مؤهل متوسط
  | "normal";        // عادة / بدون مؤهل

export type StudentLocationStatus = 
  | "in_unit"                         // لا زال بالوحدة (ضمن قوة التدريب ويدخل بالتمام)
  | "relocated"                       // تم ترحيله لخارج الوحدة (مرحل جهة وتصديق)
  | "transferred_to_unit_personnel";  // انتقل لقوة الأفراد في الوحدة

export interface IRelocationDetails {
  destination: string;        // جهة الترحيل / الوحدة المنقول إليها
  date: Date;                 // تاريخ الترحيل الفعلي
  orderNo: string;            // رقم وتاريخ أمر وتصديق الترحيل
  reason?: string;            // سبب الترحيل
  relocatedBy?: Types.ObjectId; // المستخدم الذي نفذ الترحيل
  relocatedAt?: Date;
}

export interface IUnitPersonnelDetails {
  transferDate: Date;         // تاريخ النقل لقوة الأفراد
  orderNo: string;            // رقم أمر التسكين والتصديق
  assignedRole?: string;      // الوظيفة المسندة بالوحدة
  transferredBy?: Types.ObjectId;
  transferredAt?: Date;
}

export interface IDisciplinaryRecord {
  type: "absence" | "detention";
  startDate: Date;
  endDate?: Date;
  totalDays?: number;
  source: "mdb_import" | "manual";
  notes?: string;
}
```

### بنية الحقول (Student Schema Fields)

| الحقل | النوع | القيود والفهارس | الوصف |
| :--- | :--- | :--- | :--- |
| `militaryNo` | `String` | فريد، إلزامي، مفهرس | الرقم العسكري (المفتاح الأساسي) |
| `studentId` | `String` | فريد، اختياري للتوافق | متطابق مع الرقم العسكري |
| `fullName` | `String` | إلزامي، مفهرس نصي | الاسم الرباعي للطالب/الجندي |
| `mrhla` | `String` | إلزامي، مفهرس | رمز المرحلة/الدفعة (مثل `20241`) - دائم لا يتغير |
| `mrhlaName` | `String` | اختياري | المسمى المقروء (مثل "مرحلة 2024/1") |
| `nationalNo` | `String` | اختياري | الرقم القومي (14 رقم) |
| `solasyNo` | `String` | اختياري | الرقم الثلاثي التجنيدي |
| `birthDate` | `Date` | اختياري | تاريخ الميلاد |
| `tagneedDate` | `Date` | اختياري | تاريخ التجنيد |
| `tasrehDate` | `Date` | اختياري، مفهرس | تاريخ التسريح المخطط |
| `classificationId` | `String` | اختياري، مفهرس | معرف التصنيف التخصصي |
| `classificationName`| `String` | اختياري، مفهرس | مسمى التصنيف (صف إشارة، تد مهني، إشارة ق. ج...) |
| `qualification` | `String` | `high` / `above_avg` / `average` / `normal` | نوع المؤهل |
| `qualificationName`| `String` | اختياري | مسمى المؤهل بالعربية |
| `locationStatus` | `String` | افتراضي `in_unit`، مفهرس | حالة وموقع الجندي (لا زال بالوحدة، مرحل، أفراد) |
| `relocationDetails`| `IRelocationDetails`| كائن اختياري | بيانات الترحيل في حال الترحيل لخارج الوحدة |
| `unitPersonnelDetails`| `IUnitPersonnelDetails`| كائن اختياري | بيانات التسكين في حال النقل لقوة أفراد الوحدة |
| `governorate` | `String` | اختياري، مفهرس | المحافظة التجنيدية |
| `address` | `String` | اختياري | العنوان التفصيلي |
| `bloodType` | `String` | اختياري | فصيلة الدم (A+, B+, O+...) |
| `status` | `String` | افتراضي `active`، مفهرس | حالة الطالب العامة |
| `dischargeStatus` | `String` | اختياري | حالة التسريح (مسرح بالموعد، متبقي، مشطوب) |
| `disciplinaryRecords` | `[IDisciplinaryRecord]` | مصفوفة | وقائع الغياب والحبس المستوردة من MDB |
| `guardianName` | `String` | اختياري | اسم ولي الأمر/الطوارئ |
| `guardianPhone` | `String` | اختياري | هاتف الطوارئ |
| `guardianRelation` | `String` | اختياري | درجة القرابة |

---

## 3. نموذج بيانات التمام اليومي للطلبة `StudentRollcall`

**المسار:** `next/lib/db/models/StudentRollcall.ts` و `next/lib/db/models/StudentRollcall.shared.ts`

### قاعدة الحصر الصارمة للتمام:
> **قاعدة:** يقتصر التمام اليومي للطلبة على الجنود الذين حالتهم **`locationStatus === "in_unit"` فقط**. أي جندي تم ترحيله أو انتقل لقوة أفراد الوحدة يُستبعد تلقائياً من كشف التمام اليومي لحساب القوة الفعلية بدقة، مع بقائه مسجلاً في إحصائيات الدفعة.

### حالات التمام المعتمدة (Rollcall Statuses)

```typescript
export type StudentAttendanceStatus = 
  // الموجود (داخل الوحدة)
  | "present"                // حاضر (طابور / تدريب)
  | "duty_service"           // خدمة داخلية / نوبتجية
  | "clinic"                 // عيادة الوحدة للكشف
  // خوارج رسمية وطبية واختبارات
  | "leave"                  // إجازة دورية / ميدانية
  | "sick_leave"             // إجازة مرضي مصدق بها
  | "rest"                   // راحة طبية
  | "hospital"               // حجز مستشفى عسكري
  | "police_academy_exam"    // اختبار كلية شرطة
  | "military_academy_exam"  // اختبار الأكاديمية العسكرية
  | "mission"                // مأمورية خارجية
  // خوارج انضباطية وقضائية
  | "absent"                 // غياب بدون إذن
  | "prison"                 // حبس انضباطي / سجن حربي
  | "court";                 // محكمة / نيابة عسكرية
```

### بنية الحقول (StudentRollcall Schema)

| الحقل | النوع | القيود | الوصف |
| :--- | :--- | :--- | :--- |
| `date` | `Date` | إلزامي، مفهرس | تاريخ التمام المستهدف |
| `mrhla` | `String` | إلزامي، مفهرس | رمز المرحلة التجنيدية المستهدفة |
| `status` | `String` | `draft` / `approved` / `closed` | حالة اعتماد التمام |
| `inUnitTotalStrength` | `Number` | إلزامي | إجمالي القوة المتواجدة بالوحدة فقط (`locationStatus: "in_unit"`) |
| `presentCount` | `Number` | إلزامي | عدد الحاضرين في الطابور والخدمات والعيادة |
| `outOfficialCount` | `Number` | إلزامي | عدد الخوارج الرسمية والطبية والاختبارات |
| `outDisciplinaryCount` | `Number` | إلزامي | عدد الخوارج الانضباطية (غياب وحبس) |
| `entries` | `[IStudentRollcallEntry]` | مصفوفة | تفاصيل حالة كل طالب متواجد بالوحدة |
| `preparedBy` | `ObjectId` | مرجع `User` | من قام بإعداد وحفظ المسودة |
| `approvedBy` | `ObjectId` | مرجع `User` | من قام باعتماد التمام |
| `approvedAt` | `Date` | اختياري | توقيت اعتماد التمام |
| `closedAt` | `Date` | اختياري | توقيت الإغلاق النهائي |

**مركب فريد (Compound Unique Index):**
`{ date: 1, mrhla: 1 }` يضمن عدم إنشاء أكثر من سجل تمام واحد لنفس التاريخ ونفس الدفعة.
