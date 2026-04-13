"use client";

import { useState, useEffect } from "react";
import { ModalActions } from "@/components/ui/modal-actions";
import { ModalShell } from "@/components/ui/modal-shell";
import { useToast } from "@/components/ui/toast";

interface UserSummary {
  id: string;
  username: string;
  fullName: string;
  role: string;
  department: string;
  isActive: boolean;
  isLocked: boolean;
}

interface EditUserModalProps {
  user: UserSummary;
  onClose: () => void;
  onSaved: () => void;
}

const MODULES = ["fax", "officers", "medical", "students", "education"] as const;
const PERMISSION_LEVELS = ["none", "view", "edit"] as const;
const ROLES = ["admin", "commander", "employee", "viewer"] as const;
const DEPARTMENTS = ["fax", "officers", "medical", "students", "education"] as const;

export function EditUserModal({ user, onClose, onSaved }: EditUserModalProps) {
  const { showToast } = useToast();
  const formId = `edit-user-form-${user.id}`;
  const [fullName, setFullName] = useState(user.fullName);
  const [role, setRole] = useState(user.role);
  const [department, setDepartment] = useState(user.department);
  const [permissions, setPermissions] = useState<Record<string, string>>({
    fax: "none",
    officers: "none",
    medical: "none",
    students: "none",
    education: "none",
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changePassword, setChangePassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch(`/api/auth/users/${user.id}`);
        const data = await res.json();
        if (data.success && data.user) {
          setFullName(data.user.fullName);
          setRole(data.user.role);
          setDepartment(data.user.department || "");
          if (data.user.permissions) {
            setPermissions(data.user.permissions);
          }
        }
      } catch {
        showToast("فشل في تحميل بيانات المستخدم", "error");
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [user.id, showToast]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (changePassword) {
      if (password.length < 6) {
        showToast("كلمة المرور يجب أن تكون ٦ أحرف على الأقل", "error");
        return;
      }
      if (password !== confirmPassword) {
        showToast("كلمتا المرور غير متطابقتين", "error");
        return;
      }
    }

    setSaving(true);

    try {
      const body: Record<string, unknown> = { fullName, role, department, permissions };
      if (changePassword) {
        body.password = password;
      }

      const res = await fetch(`/api/auth/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error ?? "فشل في تحديث المستخدم", "error");
        return;
      }

      onSaved();
    } catch {
      showToast("حدث خطأ في الاتصال", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      title={`تعديل المستخدم: ${user.username}`}
      onClose={onClose}
      closeOnOverlayClick
      panelClassName="max-w-lg"
      footer={
        <ModalActions>
          <button
            type="submit"
            form={formId}
            disabled={saving}
            className="rounded-md bg-(--app-accent) px-4 py-2 text-sm font-medium text-(--app-accent-foreground) hover:bg-(--app-accent)/90 disabled:opacity-50"
          >
            {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-(--app-border) px-4 py-2 text-sm text-foreground hover:bg-white/10"
          >
            إلغاء
          </button>
        </ModalActions>
      }
    >
      {loading ? (
        <div className="py-10 text-center text-(--app-muted-foreground)">جاري تحميل بيانات المستخدم...</div>
      ) : (
        <form id={formId} onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm text-foreground">الاسم الكامل</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-md border border-(--app-border) bg-(--app-surface) px-3 py-2 text-(--app-white)"
              dir="rtl"
            />
          </div>

          <div className="mb-4 rounded-md border border-(--app-border) bg-(--app-surface) p-3">
            <div className="mb-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="change-password"
                checked={changePassword}
                onChange={(e) => {
                  setChangePassword(e.target.checked);
                  if (!e.target.checked) {
                    setPassword("");
                    setConfirmPassword("");
                  }
                }}
                className="h-4 w-4 rounded border-(--app-border) bg-(--app-border) text-blue-600 focus:ring-blue-600"
              />
              <label htmlFor="change-password" className="text-sm font-medium text-foreground">
                تغيير كلمة المرور
              </label>
            </div>

            {changePassword && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-(--app-muted-foreground)">كلمة المرور الجديدة</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full rounded-md border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--app-white)"
                    dir="rtl"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="block text-xs text-(--app-muted-foreground)">تأكيد كلمة المرور</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1 w-full rounded-md border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--app-white)"
                    dir="rtl"
                    autoComplete="new-password"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
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

        </form>
      )}
    </ModalShell>
  );
}
