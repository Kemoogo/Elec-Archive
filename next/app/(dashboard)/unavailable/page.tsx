import Link from "next/link";

export default function UnavailablePage() {
  return (
      <div className="flex min-h-screen items-center justify-center bg-(--app-accent-foreground)" dir="rtl">
      <div className="max-w-md text-center">
        <div className="mb-6 text-6xl">⚠️</div>
        <h1 className="mb-4 text-2xl font-bold text-(--app-white)">النظام غير متاح</h1>
        <p className="mb-6 text-(--app-muted-foreground)">
          لا يمكن الاتصال بقاعدة البيانات. يرجى المحاولة مرة أخرى لاحقاً أو الاتصال بمسؤول النظام.
        </p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-(--app-accent) px-6 py-3 text-(--app-accent-foreground) font-medium transition hover:bg-(--app-accent)/90"
        >
          إعادة المحاولة
        </Link>
      </div>
    </div>
  );
}
