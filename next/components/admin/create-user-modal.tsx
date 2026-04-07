"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";

interface CreateUserModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const MODULES = ["fax", "officers", "medical", "students", "education"] as const;
const PERMISSION_LEVELS = ["none", "view", "edit"] as const;
const ROLES = ["admin", "commander", "employee", "viewer"] as const;
const DEPARTMENTS = ["fax", "officers", "medical", "students", "education"] as const;

function emptyPermissions(): Record<string, string> {
  return Object.fromEntries(MODULES.map((m) => [m, "none"]));
}

export function CreateUserModal({ onClose, onCreated }: CreateUserModalProps) {
  const { showToast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("viewer");
  const [department, setDepartment] = useState("fax");
  const [permissions, setPermissions] = useState<Record<string, string>>(emptyPermissions());
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, fullName, role, department, permissions }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error ?? "فشل في إنشاء المستخدم", "error");
        return;
      }

      onCreated();
    } catch {
      showToast("حدث خطأ في الاتصال", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-lg bg-(--app-surface) p-6 shadow-xl"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-bold text-(--app-white)">إضافة مستخدم جديد</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-foreground">اسم المستخدم</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full rounded-md border border-(--app-border) bg-(--app-surface) px-3 py-2 text-(--app-white)"
                dir="rtl"
              />
            </div>
            <div>
              <label className="block text-sm text-foreground">كلمة المرور</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-(--app-border) bg-(--app-surface) px-3 py-2 text-(--app-white)"
                dir="rtl"
              />
            </div>
            <div>
              <label className="block text-sm text-foreground">الاسم الكامل</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full rounded-md border border-(--app-border) bg-(--app-surface) px-3 py-2 text-(--app-white)"
                dir="rtl"
              />
            </div>
            <div>
              <label className="block text-sm text-foreground">الدور</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1 w-full rounded-md border border-(--app-border) bg-(--app-surface) px-3 py-2 text-(--app-white)"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-foreground">القسم</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="mt-1 w-full rounded-md border border-(--app-border) bg-(--app-surface) px-3 py-2 text-(--app-white)"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-foreground">الصلاحيات</label>
            <div className="grid grid-cols-5 gap-2">
              {MODULES.map((mod) => (
                <div key={mod}>
                  <label className="block text-xs text-(--app-muted-foreground)">{mod}</label>
                  <select
                    value={permissions[mod]}
                    onChange={(e) =>
                      setPermissions({ ...permissions, [mod]: e.target.value })
                    }
                    className="mt-1 w-full rounded-md border border-(--app-border) bg-(--app-surface) px-2 py-1 text-sm text-(--app-white)"
                  >
                    {PERMISSION_LEVELS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-(--app-accent) px-4 py-2 text-sm text-(--app-accent-foreground) font-medium hover:bg-(--app-accent)/90 disabled:opacity-50"
            >
              {saving ? "جاري الإنشاء..." : "إنشاء المستخدم"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-(--app-border) px-4 py-2 text-sm text-foreground hover:bg-white/10"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
