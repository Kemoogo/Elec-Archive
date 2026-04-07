"use client";

export default function DashboardError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" dir="rtl">
      <div className="text-center space-y-4">
        <h2 className="text-xl font-bold text-(--app-white)">حدث خطأ غير متوقع</h2>
        <p className="text-sm text-(--app-muted-foreground)">
          عذراً، حدث خطأ أثناء تحميل هذه الصفحة.
        </p>
        <button
          onClick={reset}
          className="rounded-lg bg-(--color-primary) px-6 py-2 text-sm font-medium text-(--app-white) hover:bg-(--color-primary-hover) transition"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}
