"use client";

import { useState } from "react";
import { ModalActions } from "@/components/ui/modal-actions";
import { ModalShell } from "@/components/ui/modal-shell";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";
import { FormField, FormInput, FormSelect, FormLabel } from "@/components/ui/form-fields";

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
  const formId = "create-user-form";
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
        const errorMsg = extractApiError(data, "فشل في إنشاء المستخدم");
        showToast(errorMsg, "error");
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
    <ModalShell
      title="إضافة مستخدم جديد"
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
            {saving ? "جاري الإنشاء..." : "إنشاء المستخدم"}
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
        <form id={formId} onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="اسم المستخدم" required>
              <FormInput type="text" required value={username} onChange={(e) => setUsername(e.target.value)} dir="rtl" />
            </FormField>
            <FormField label="كلمة المرور" required>
              <FormInput type="password" required value={password} onChange={(e) => setPassword(e.target.value)} dir="rtl" />
            </FormField>
            <FormField label="الاسم الكامل" required>
              <FormInput type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} dir="rtl" />
            </FormField>
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
    </ModalShell>
  );
}
