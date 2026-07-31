export const errors = {
  invalidCredentials: "اسم المستخدم أو كلمة المرور غير صحيحة",
  accountDeactivated: "الحساب معطل",
  accountLocked: "الحساب مقفل. تواصل مع المسؤول.",
  notAuthenticated: "غير مصرح لك بالدخول",
  insufficientPermissions: "صلاحيات غير كافية",
  validationFailed: "خطأ في البيانات المدخلة",
  usernameExists: "اسم المستخدم موجود مسبقاً",
  userNotFound: "المستخدم غير موجود",
  cannotDeactivateSelf: "لا يمكنك تعطيل حسابك (أنت المسؤول الوحيد النشط)",
  cannotLockSelf: "لا يمكنك قفل حسابك",
  internalError: "حدث خطأ في الخادم",
  dbConnectionError: "انقطع الاتصال بقاعدة البيانات، يرجى المحاولة لاحقاً",
} as const;
