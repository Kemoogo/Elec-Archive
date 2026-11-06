# خريطة الربط التفاعلية بين الواجهة الأمامية والخلفية {#fe-be-map}

يرتبط تطبيق الأرشيف الإلكتروني عبر مسارات Next.js 16 حيث تتولى مكونات الخادم جلب البيانات وتستدعي مكونات العميل واجهات REST API مع تدقيق أمني شامل.

- تعتمد واجهات العرض على مكونات الخادم React Server Components لتقديم أداء سريع وأمان كامل بالشبكة المحلية.
- تتولى مكونات العميل التفاعلية مثل النماذج والمودالات إرسال طلبات الإضافة والتعديل عبر استدعاءات `fetch` المباشرة.
- تخضع كافة مسارات الـ API لخط حماية صارم يبدأ بالمصادقة وفحص الصلاحيات والتحقق عبر Zod وينتهي بالتسجيل في MongoDB.
- توثق جميع العمليات تلقائياً داخل سجل التدقيق `AuditLog` مع ربط المعرفات بصيغة `ObjectId` لضمان التتبع المحكم.

@answer scope="Next.js 16 · App Router · Mongoose 9 · REST API"
@meta locale=ar style=product

## البنية المعمارية لتدفق البيانات بين الطبقات {#arch-layers}

@architecture id=system-layers title="طبقات الربط المعماري بين الواجهة والخلفية"
| ui | واجهات العميل | frontend |
| router | موجه Next.js | backend |
| guard | الحماية وRBAC | security |
| api | مسارات REST | backend |
| db | قاعدة MongoDB | database |
| audit | سجل التدقيق | database |
| ui > router | طلبات النماذج |
| router > guard | فحص الكوكيز | security |
| guard > api | تفويض معتمد |
| api > db | استعلام وحفظ | emphasis |
| api > audit | توثيق الحدث | dashed |

@facts id=arch-metrics
| إجمالي مسارات واجهات API | 70 مساراً برمجياً موثقاً |
| إجمالي صفحات الواجهة الأمامية | 24 صفحة بموجه Next.js App Router |
| نماذج بيانات Mongoose | 18 نموذجاً رئيسياً ومشاركاً |
| زمن استجابة الشبكة المحلية | أقل من 30 مللي ثانية داخل الشبكة الداخلية |

## دورة حياة طلب البيانات والتعديل القياسية {#api-lifecycle}

@sequence id=req-cycle title="تسلسل تنفيذ الطلب من المتصفح إلى قاعدة البيانات"
| actor user | المتصفح ومكونات العميل | frontend |
| actor guard | المصادقة وفحص الصلاحيات | security |
| actor route | معالج مسار API في Next.js | backend |
| actor db | قاعدة البيانات MongoDB | database |
| actor log | محرك سجل التدقيق AuditLog | database |
| user | guard | إرسال طلب التعديل مع كوكيز HttpOnly |
| guard | route | مستخدم موثق مع صلاحيات الدور |
| route | db | تنفيذ أمر Mongoose للبيانات |
| db | route | إرجاع وثيقة البيانات المحدثة | return |
| route | log | تسجيل تفاصيل العملية في التدقيق |
| route | user | استجابة JSON برمز 200 وعرض إشعار Toast | return |

@steps id=cycle-steps
| s1 | الإرسال والمصادقة | إرسال الطلب تلقائياً مع كوكيز الجلسة وفحص الصلاحيات | req-cycle | guard |
| s2 | التحقق والمعالجة | فحص المدخلات بمخطط Zod وتنفيذ التعديل في Mongoose | req-cycle | route |
| s3 | التوثيق والاستجابة | تسجيل الحدث في سجل التدقيق وإعادة JSON للواجهة | req-cycle | log |

## وحدة شئون الضباط وإدارة الخدمة {#officers-module}

تربط وحدة شئون الضباط بين السجلات التفصيلية وملفات الخدمة ومحركات استخراج بيانات وثائق 121 الرسمية مع واجهات الـ API المعنية.

| اسم الوظيفة أو الإجراء | مسار الصفحة Frontend | المكون العميل الرئيسي | مسار واجهة الـ API | الطريقة | نموذج البيانات Mongoose | الإجراء والهدف |
| --- | --- | --- | --- | --- | --- | --- |
| سجل الضباط العام | `/officers` | `OfficersTable` | `/api/officers` | `GET` | `Officer` | جلب قائمة الضباط مع التصفية والبحث {good:RSC} |
| تسجيل ضابط جديد | `/officers` | `OfficerForm` | `/api/officers` | `POST` | `Officer` | تسجيل ضابط جديد بالاستخراج الآلي من 121 |
| فحص الأقدمية المسبق | `/officers` | `SeniorityChecker` | `/api/officers/check-seniority` | `POST` | `Officer` | التحقق الفوري من عدم تكرار رقم الأقدمية |
| الملف التفصيلي للضابط | `/officers/[id]` | `OfficerProfileClient` | `/api/officers/[id]` | `GET` | `Officer` | عرض السجل الشامل لملف الضابط {good:RSC} |
| تعديل البيانات العسكرية | `/officers/[id]` | `OfficerEditModal` | `/api/officers/[id]` | `PUT` | `Officer` | تحديث البيانات الأساسية والعسكرية للضابط |
| تحديث ملف 121 الرسمي | `/officers/[id]` | `OfficerDocuments` | `/api/officers/[id]/file121` | `POST` | `Officer` | استبدال أو رفع وثيقة 121 وتحديث تاريخها |
| تحديث الصورة الشخصية | `/officers/[id]` | `PhotoUploader` | `/api/officers/[id]/photo` | `POST` | `Officer` | رفع وتحديث الصورة العسكرية الشخصية |
| استعراض التمام اليومي | `/officers/rollcall` | `RollcallTable` | `/api/officers/rollcall` | `GET` | `DailyRollcall` | استعراض تمام اليوم واسترجاع التخزين المحلي |
| اعتماد التمام وإغلاقه | `/officers/rollcall` | `RollcallSubmitModal` | `/api/officers/rollcall` | `POST` | `DailyRollcall` | اعتماد تمام الضباط وإغلاق القوة اليومية |
| سجل الإجازات العام | `/officers/leaves` | `LeavesTable` | `/api/officers/leaves` | `GET` | `Leave` | استعراض سجل إجازات الضباط الحالية والسابقة |
| تسجيل إجازة جديدة | `/officers/leaves` | `LeaveAddModal` | `/api/officers/leaves` | `POST` | `Leave` | تسجيل إجازة جديدة مع منع تضارب الفترات |
| إلغاء أو حذف إجازة | `/officers/leaves` | `LeaveDeleteModal` | `/api/officers/leaves/[id]` | `DELETE` | `Leave` | إلغاء أو حذف الإجازة مع تدقيق العملية |

## وحدة العمليات وهيئة أركان الحرب {#arkan-harb-module}

تتولى هذه الوحدة إدارة التعيينات الوظيفية والبدلاء والمأموريات ومتابعة دورة حياة قرارات الإجازات للضباط الفعليين بالوحدة فقط.

| اسم الوظيفة أو الإجراء | مسار الصفحة Frontend | المكون العميل الرئيسي | مسار واجهة الـ API | الطريقة | نموذج البيانات Mongoose | الإجراء والهدف |
| --- | --- | --- | --- | --- | --- | --- |
| لوحة قيادة العمليات | `/arkan-harb` | `ArkanHarbDashboard` | `/api/dashboard` | `GET` | `DailyRollcall, Leave` | لوحة المؤشرات العملياتية وقوة الحضور {good:RSC} |
| عرض تمام ضباط أركان حرب | `/arkan-harb` | `RollcallSection` | `/api/arkan-harb/rollcall` | `GET` | `DailyRollcall` | قراءة تمام ضباط أركان حرب اليومي |
| إعادة فتح التمام المعتمد | `/arkan-harb` | `ReopenRollcallModal` | `/api/arkan-harb/rollcall/reopen` | `POST` | `DailyRollcall` | إعادة فتح التمام بعد اعتماده بتصريح القائد |
| جدول المأموريات والتكليفات | `/arkan-harb` | `MissionsTable` | `/api/arkan-harb/missions` | `GET` | `Mission` | استعراض مأموريات الضباط والتكليفات الخارجية |
| إصدار تكليف مأمورية جديد | `/arkan-harb` | `MissionFormModal` | `/api/arkan-harb/missions` | `POST` | `Mission` | إنشاء تكليف مأمورية جديد وتحديد القائم بالعمل |
| تعديل أو إنهاء المأمورية | `/arkan-harb` | `MissionEditModal` | `/api/arkan-harb/missions/[id]` | `PUT` | `Mission` | تعديل بيانات المأمورية أو إنهاؤها |
| هيكل الوظائف والبدلاء | `/arkan-harb` | `PositionsView` | `/api/arkan-harb/positions` | `GET` | `PositionAssignment` | شجرة الوظائف والضباط المسكنين والبدلاء |
| تسكين ضابط في وظيفة | `/arkan-harb` | `PositionModal` | `/api/arkan-harb/positions` | `POST` | `PositionAssignment` | تسكين ضابط في وظيفة عسكرية شاغرة |
| اعتماد قرار الإجازة | `/arkan-harb` | `CommanderDecision` | `/api/arkan-harb/leaves/commander-decision` | `PUT` | `Leave` | اعتماد أو رفض طلب الإجازة بقرار القائد |
| تأكيد عودة الضابط من الإجازة | `/arkan-harb` | `ConfirmReturnModal` | `/api/arkan-harb/leaves/confirm-return` | `PUT` | `Leave` | تأكيد عودة الضابط من الإجازة وتسجيل التوقيت |
| مد فترة إجازة معتمدة | `/arkan-harb` | `ExtendLeaveModal` | `/api/arkan-harb/leaves/extend` | `POST` | `Leave` | مد فترة الإجازة الرسمية مع التحقق من الرصيد |

## وحدة النقطة الطبية والصيدلية {#medical-module}

تتكامل صفحات النقطة الطبية لربط الكشف اليومي وصرف الأدوية من المخزون مع السجل الطبي التراكمي الشامل للمريض.

| اسم الوظيفة أو الإجراء | مسار الصفحة Frontend | المكون العميل الرئيسي | مسار واجهة الـ API | الطريقة | نموذج البيانات Mongoose | الإجراء والهدف |
| --- | --- | --- | --- | --- | --- | --- |
| لوحة متابعة النقطة الطبية | `/medical` | `MedicalDashboard` | `/api/medical/dashboard` | `GET` | `MedicalVisit, Medicine` | مؤشرات التردد اليومي والمخزون المنخفض {good:RSC} |
| سجل الكشوفات اليومية | `/medical` | `VisitsTable` | `/api/medical` | `GET` | `MedicalVisit` | استعراض زيارات العيادة الخارجية وتصفيتها |
| تسجيل كشف وصرف علاج | `/medical` | `NewVisitModal` | `/api/medical` | `POST` | `MedicalVisit, Medicine` | تسجيل كشف طبي وصرف العلاج وتحديث المخزون |
| عرض السجل الطبي للمريض | `/medical/patients/[id]` | `PatientProfilePageClient` | `/api/medical/patients/[patientId]/record` | `GET` | `PatientMedicalRecord` | جلب السجل الطبي للحساسيات والأمراض المزمنة |
| حفظ الحساسية والأمراض المزمنة | `/medical/patients/[id]` | `RecordTab` | `/api/medical/patients/[patientId]/record` | `PUT` | `PatientMedicalRecord` | حفظ وتعديل بيانات الحساسية والتشخيص التراكمي |
| البحث التلقائي عن المريض | `/medical/patients/[id]` | `PatientSearch` | `/api/medical/patients/search` | `GET` | `MedicalPatient` | البحث التلقائي عن المريض بالرقم العسكري |
| جرد صيدلية النقطة الطبية | `/medical` | `MedicineInventory` | `/api/medical/medicines` | `GET` | `Medicine` | استعراض أرصدة الأدوية وتواريخ الصلاحية |
| إضافة صنف دواء جديد | `/medical` | `MedicineForm` | `/api/medical/medicines` | `POST` | `Medicine` | إضافة صنف دوائي جديد إلى صيدلية النقطة |
| توريد رصيد دوائي للمخزن | `/medical` | `RestockModal` | `/api/medical/medicines/restock` | `POST` | `Medicine, InventoryLedger` | توريد كميات إضافية وتسجيل حركة دفتر المخزن |
| إعدام الأدوية منتهية الصلاحية | `/medical` | `DestroyExpiredModal` | `/api/medical/medicines/[id]/destroy-expired` | `POST` | `Medicine, InventoryLedger` | إعدام التشغيلات المنتهية وتصفير أرصدتها |

## وحدتا شئون الطلبة وجناح التعليم {#students-education-module}

تدير هاتان الوحدتان سجلات الدارسين والطلاب والبرامج التدريبية والدورات مع التحقق الصارم من عدم ازدواجية التسجيل.

| اسم الوظيفة أو الإجراء | مسار الصفحة Frontend | المكون العميل الرئيسي | مسار واجهة الـ API | الطريقة | نموذج البيانات Mongoose | الإجراء والهدف |
| --- | --- | --- | --- | --- | --- | --- |
| فهرس بيانات الطلبة | `/students` | `StudentTable` | `/api/students` | `GET` | `Student` | استعراض قائمة الطلاب بالدفعات والسرايا {good:RSC} |
| قيد طالب جديد بالسجلات | `/students` | `StudentFormModal` | `/api/students` | `POST` | `Student` | قيد طالب جديد مع فحص الرقم القومي والعسكري |
| الملف الشخصي والانضباطي للطالب | `/students/[id]` | `StudentProfile` | `/api/students/[id]` | `GET` | `Student` | عرض ملف الطالب والبيانات الانضباطية {good:RSC} |
| رفع المستندات والوثائق للطلبة | `/students/[id]` | `DocumentUpload` | `/api/students/[id]/documents` | `POST` | `Student` | رفع مستندات ورقية مع فحص الحجم المسموح |
| دليل الدورات التدريبية المتاحة | `/education` | `CourseCatalog` | `/api/education` | `GET` | `Course` | استعراض بطاقات الدورات التدريبية المفتوحة {good:RSC} |
| إنشاء دورة تدريبية جديدة | `/education` | `CourseCreateModal` | `/api/education` | `POST` | `Course` | إنشاء دورة تدريبية جديدة وتحديد أجنحتها |
| تفاصيل ومنهج الدورة | `/education/[id]` | `CourseDetail` | `/api/education/[id]` | `GET` | `Course` | تفاصيل الدورة والمنهج وقائمة المشاركين {good:RSC} |
| إلحاق مشارك بالدورة التدريبية | `/education/[id]` | `EnrollmentModal` | `/api/education/[id]/participants` | `POST` | `Course` | إلحاق ضابط أو طالب بالدورة ومنع التكرار |
| رفع المناهج والملفات التعليمية | `/education/[id]` | `CourseDocsTab` | `/api/education/[id]/documents` | `POST` | `Course` | رفع المذكرات والمناهج التعليمية للدورة |

## وحدة أرشيف المكاتبات والفاكسات {#faxes-module}

تتولى وحدة الفاكسات أرشفة البريد العسكري الوارد والصادر وتتبع القرارات والتأشيرات وربط المكاتبات المتبادلة.

| اسم الوظيفة أو الإجراء | مسار الصفحة Frontend | المكون العميل الرئيسي | مسار واجهة الـ API | الطريقة | نموذج البيانات Mongoose | الإجراء والهدف |
| --- | --- | --- | --- | --- | --- | --- |
| سجل الفاكسات والمكاتبات العام | `/fax` | `FaxTable` | `/api/fax` | `GET` | `Fax` | فهرس المكاتبات الواردة والصادرة والبحث {good:RSC} |
| تسجيل مكاتبة عسكرية جديدة | `/fax/new` | `FaxFormClient` | `/api/fax` | `POST` | `Fax` | تسجيل مكاتبة جديدة وتوليد رقم قيد الأرشيف |
| استعراض تفاصيل المكاتبة والمرفقات | `/fax/[id]` | `FaxDetailClient` | `/api/fax/[id]` | `GET` | `Fax` | عرض المكاتبة والمرفقات وسجل التأشيرات {good:RSC} |
| إضافة تأشيرة وتوجيه القائد | `/fax/[id]` | `DecisionModal` | `/api/fax/[id]/decision` | `POST` | `Fax` | إضافة تأشيرة القائد وتحديد جهات المتابعة |
| ربط المكاتبة بإشارة أو فاكس سابق | `/fax/[id]` | `LinkFaxModal` | `/api/fax/[id]/link` | `POST` | `Fax` | ربط المكاتبة الحالية بمكاتبة أخرى سابقة |
| إغلاق المكاتبة وحفظها بالأرشيف | `/fax/[id]` | `CloseFaxModal` | `/api/fax/[id]/close` | `POST` | `Fax` | حفظ المكاتبة في الأرشيف النهائي وإغلاقها |

## لوحة الإدارة والأمان وسجل التدقيق {#admin-security-module}

تضمن طبقة الإدارة التحكم المركزي في الحسابات والأدوار والهيكل التنظيمي ومراقبة كافة العمليات بالنظام.

| اسم الوظيفة أو الإجراء | مسار الصفحة Frontend | المكون العميل الرئيسي | مسار واجهة الـ API | الطريقة | نموذج البيانات Mongoose | الإجراء والهدف |
| --- | --- | --- | --- | --- | --- | --- |
| تسجيل دخول المستخدم للنظام | `/login` | `LoginForm` | `/api/auth/login` | `POST` | `User, AuditLog` | تسجيل الدخول وتوليد كوكي الجلسة HttpOnly |
| تعديل كلمة مرور الحساب | `/profile` | `ChangePasswordModal` | `/api/auth/change-password` | `POST` | `User` | تغيير كلمة مرور المستخدم الحالي بتشفير قوي |
| دليل مستخدمي النظام والصلاحيات | `/admin/users` | `UsersTable` | `/api/auth/users` | `GET` | `User` | استعراض حسابات مستخدمي النظام وأدوارهم |
| إنشاء حساب مستخدم جديد | `/admin/users` | `UserCreateModal` | `/api/auth/users` | `POST` | `User, AuditLog` | إنشاء حساب مستخدم جديد بدون تسجيل ذاتي |
| تعديل الصلاحيات والأدوار للمستخدم | `/admin/users` | `UserRoleModal` | `/api/auth/users/[id]` | `PUT` | `User` | تعديل صلاحيات المستخدم وتعيين أدواره |
| إدارة الأقسام والهيكل التنظيمي | `/admin/departments` | `DepartmentsTree` | `/api/departments` | `GET, POST` | `Department` | إدارة الأقسام الرئيسية وإعادة ترتيبها |
| إدارة الفروع والشعب الداخلية | `/admin/departments` | `BranchModal` | `/api/branches` | `GET, POST` | `Branch` | إدارة الفروع الداخلية التابعة للأقسام |
| سجل التدقيق والمراقبة الشامل | `/audit-log` | `AuditLogTable` | `/api/audit` | `GET` | `AuditLog` | سجل الرقابة والتتبع الكامل لعمليات النظام |
| تسجيل الخروج الآمن وإنهاء الجلسة | Global Topbar | `NavbarActions` | `/api/auth/logout` | `POST` | `AuditLog` | إنهاء الجلسة ومسح الكوكيز وتسجيل الخروج |

## معايير الجودة والحوكمة التقنية للربط {#governance-checklist}

تلتزم جميع عمليات الربط بين الواجهة الأمامية والخلفية بدستور المشروع وقواعد الأمان المشددة:

- [x] عزل تام للضباط المنقولين وخارج الوحدة وعدم ظهورهم في أي مسارات تشغيلية بالواجهة أو الخلفية
- [x] استخدام كوكيز HttpOnly المحمية لمنع تسريب رموز JWT عبر ثغرات XSS
- [x] التحقق المزدوج من الصلاحيات والأدوار على مستوى خادم Next.js ومسارات واجهات REST API
- [x] الاعتماد التام على التحقق من صحة المدخلات عبر Zod في جهة الخادم وحظر النوع any نهائياً
- [x] تسجيل كل عمليات التعديل والإنشاء والحذف في سجل التدقيق AuditLog مع تمرير ObjectId صحيح
- [x] التشغيل المستقل التام على الشبكة المحلية Intranet بدون أي اعتماد على الإنترنت أو خوادم خارجية
- [x] الالتزام الصارم بنظام التصميم Sapphire Archive واستخدام مكونات UI الموحدة ومكتبة Modals المركزية
