"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isDbError = error.name === "DatabaseConnectionError" || 
                    error.message.includes("Database connection lost") ||
                    error.message.includes("Failed to connect to database");

  return (
    <div className="flex min-h-[60vh] items-center justify-center" dir="rtl">
      <div className="text-center space-y-4 max-w-md px-6">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-2 ${isDbError ? 'bg-(--app-error)/20 text-(--app-error)' : 'bg-(--app-primary)/10 text-(--app-primary)'}`}>
          <h2 className="text-3xl font-bold">!</h2>
        </div>

        <h2 className="text-xl font-bold text-(--color-primary)">
          {isDbError ? "فشل الاتصال بقاعدة البيانات" : "حدث خطأ غير متوقع"}
        </h2>

        <p className="text-sm text-(--app-muted-foreground) leading-relaxed">
          {isDbError 
            ? "نواجه صعوبة في الاتصال بقاعدة البيانات حالياً. يرجى التأكد من تشغيل الخدمة والمحاولة مرة أخرى."
            : "عذراً، حدث خطأ أثناء تحميل هذه الصفحة."}
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={reset}
            className="rounded-lg bg-(--color-primary) px-6 py-2.5 text-sm font-medium text-(--app-white) hover:bg-(--color-primary-hover) transition shadow-lg shadow-(--color-primary)/20"
          >
            إعادة المحاولة
          </button>

          {isDbError && (
            <button
              onClick={() => window.location.reload()}
              className="text-xs text-(--app-muted-foreground) hover:underline"
            >
              تحديث الصفحة بالكامل
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
