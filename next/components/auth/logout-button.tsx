"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-(--app-accent) text-(--app-accent-foreground) font-bold text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 hover:bg-(--app-accent)/90 transition-all active:scale-95 disabled:opacity-50"
    >
      <LogOut className="w-4 h-4" />
      <span>{loading ? "جاري الخروج..." : "تسجيل الخروج"}</span>
    </button>
  );
}
