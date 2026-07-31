"use client";

import { useState, useEffect } from "react";
import { ModalActions } from "@/components/ui/modal-actions";
import { ModalShell } from "@/components/ui/modal-shell";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";
import { FormField, FormInput, FormSelect, FormLabel } from "@/components/ui/form-fields";

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
        const errorMsg = extractApiError(data, "فشل في تحديث المستخدم");
        showToast(errorMsg, "error");
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
          <FormField label="الاسم الكامل" required>
            <FormInput type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} dir="rtl" />
          </FormField>

          <div className="mb-4 rounded-xl border border-(--app-border) bg-(--app-surface) p-3">
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
                className="h-4 w-4 rounded border-(--app-border) bg-(--app-border) text-(--app-info) focus:ring-(--app-info)"
              />
              <label htmlFor="change-password" className="text-sm font-medium text-foreground">
                تغيير كلمة المرور
              </label>
            </div>

            {changePassword && (
              <div className="grid grid-cols-2 gap-3">
                <FormField label="كلمة المرور الجديدة">
                  <FormInput
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    dir="rtl"
                    autoComplete="new-password"
                  />
                </FormField>
                <FormField label="تأكيد كلمة المرور">
                  <FormInput
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    dir="rtl"
                    autoComplete="new-password"
                  />
                </FormField>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="الدور" required>
              <FormSelect value={role} onChange={(e) => setRole(e.target.value)}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </FormSelect>
            </FormField>
            <FormField label="القسم" required>
              <FormSelect value={department} onChange={(e) => setDepartment(e.target.value)}>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </FormSelect>
            </FormField>
          </div>

          <div>
            <FormLabel className="mb-2 block">الصلاحيات</FormLabel>
            <div className="grid grid-cols-5 gap-2">
              {MODULES.map((mod) => (
                <div key={mod}>
                  <label className="block text-xs text-(--app-muted-foreground)">{mod}</label>
                  <FormSelect
                    value={permissions[mod]}
                    onChange={(e) =>
                      setPermissions({ ...permissions, [mod]: e.target.value })
                    }
                    selectSize="sm"
                  >
                    {PERMISSION_LEVELS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </FormSelect>
                </div>
              ))}
            </div>
          </div>

        </form>
      )}
    </ModalShell>
  );
}
