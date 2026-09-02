"use client";

import { useState, useEffect, Fragment } from "react";
import { ModalActions } from "@/components/ui/modal-actions";
import { ModalShell } from "@/components/ui/modal-shell";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";
import { FormField, FormInput, FormSelect, FormLabel } from "@/components/ui/form-fields";
import { UserCog, KeyRound, Shield } from "lucide-react";

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

interface DynamicBranch {
  _id: string;
  name: string;
  order?: number;
}

interface DynamicDep {
  _id: string;
  name: string;
  code?: string;
  branchId: { _id: string; name: string } | string;
}

const MODULES = ["fax", "officers", "arkan_harb", "medical", "students", "education"] as const;
const PERMISSION_LEVELS = ["none", "view", "edit"] as const;
const ROLES = ["admin", "commander", "employee", "viewer"] as const;

const MODULE_CONFIG: Record<string, { label: string }> = {
  fax: { label: "الفاكس والأرشيف" },
  officers: { label: "شئون الضباط" },
  arkan_harb: { label: "أركان الحرب" },
  medical: { label: "الخدمات الطبية" },
  students: { label: "شئون الطلبة" },
  education: { label: "التعليم والتدريب" },
};

const PERMISSION_LEVEL_LABELS: Record<string, string> = {
  none: "بدون صلاحية (محظور)",
  view: "صلاحية قراءة (عرض فقط)",
  edit: "كامل الصلاحيات (عرض وتعديل)",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "مسؤول النظام",
  commander: "قائد",
  employee: "موظف",
  viewer: "مستعرض (عرض فقط)",
};

export function EditUserModal({ user, onClose, onSaved }: EditUserModalProps) {
  const { showToast } = useToast();
  const formId = `edit-user-form-${user.id}`;
  const [fullName, setFullName] = useState(user.fullName);
  const [role, setRole] = useState(user.role);
  const [department, setDepartment] = useState(user.department);
  const [dynamicBranches, setDynamicBranches] = useState<DynamicBranch[]>([]);
  const [dynamicDeps, setDynamicDeps] = useState<DynamicDep[]>([]);
  const [permissions, setPermissions] = useState<Record<string, string>>({
    fax: "none",
    officers: "none",
    arkan_harb: "none",
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
    async function loadData() {
      try {
        const [resUser, resBranches, resDeps] = await Promise.all([
          fetch(`/api/auth/users/${user.id}`),
          fetch("/api/branches"),
          fetch("/api/departments"),
        ]);
        const dataUser = await resUser.json();
        const dataBranches = await resBranches.json();
        const dataDeps = await resDeps.json();

        if (dataBranches.success && Array.isArray(dataBranches.branches)) {
          setDynamicBranches(dataBranches.branches);
        }

        if (dataDeps.success && Array.isArray(dataDeps.departments)) {
          setDynamicDeps(dataDeps.departments);
        }

        if (dataUser.success && dataUser.user) {
          setFullName(dataUser.user.fullName);
          setRole(dataUser.user.role);
          setDepartment(dataUser.user.department || "");
          if (dataUser.user.permissions) {
            setPermissions(dataUser.user.permissions);
          }
        }
      } catch {
        showToast("فشل في تحميل بيانات المستخدم والفروع", "error");
      } finally {
        setLoading(false);
      }
    }
    loadData();
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

      showToast("تم حفظ التغييرات بنجاح", "success");
      onSaved();
    } catch {
      showToast("حدث خطأ في الاتصال", "error");
    } finally {
      setSaving(false);
    }
  }

  const orphanDeps = dynamicDeps.filter((d) => {
    const bId = typeof d.branchId === "object" ? d.branchId?._id : d.branchId;
    return !dynamicBranches.some((b) => b._id === bId);
  });

  return (
    <ModalShell
      title={`تعديل بيانات المستخدم: ${user.username}`}
      icon={<UserCog className="w-4 h-4" />}
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-h-[85vh] max-w-xl border-(--app-border) shadow-depth-xl"
      bodyClassName="p-6 no-scrollbar"
      footer={
        <ModalActions
          form={formId}
          submitText="حفظ التغييرات"
          submitLoading={saving}
          onCancel={onClose}
        />
      }
    >
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-(--color-primary)/20 border-t-(--color-primary) rounded-full animate-spin" />
          <span className="text-xs font-bold text-(--app-muted-foreground)">جاري تحميل بيانات المستخدم...</span>
        </div>
      ) : (
        <form id={formId} onSubmit={handleSave} className="space-y-4" dir="rtl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="col-span-1 sm:col-span-2">
              <FormField label="الاسم الكامل" required>
                <FormInput
                  type="text"
                  required
                  placeholder="الاسم الكامل للمستخدم..."
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  dir="rtl"
                />
              </FormField>
            </div>

            <FormField label="الدور الوظيفي" required>
              <FormSelect value={role} onChange={(e) => setRole(e.target.value)}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r] || r}
                  </option>
                ))}
              </FormSelect>
            </FormField>

            <FormField label="الفرع / القسم التكتيكي" required>
              <FormSelect value={department} onChange={(e) => setDepartment(e.target.value)}>
                {dynamicBranches.length > 0 ? (
                  <>
                    {dynamicBranches.map((branch) => {
                      const branchDeps = dynamicDeps.filter((d) => {
                        const bId = typeof d.branchId === "object" ? d.branchId?._id : d.branchId;
                        return bId === branch._id;
                      });

                      return (
                        <Fragment key={branch._id}>
                          {/* Option for the parent branch itself */}
                          <option value={branch.name}>
                            {branch.name}
                          </option>
                          {/* Options for child departments under this branch */}
                          {branchDeps.map((d) => {
                            const val = d.code || d.name;
                            return (
                              <option key={d._id} value={val}>
                                {branch.name} / {d.name}
                              </option>
                            );
                          })}
                        </Fragment>
                      );
                    })}

                    {orphanDeps.length > 0 &&
                      orphanDeps.map((d) => {
                        const val = d.code || d.name;
                        return (
                          <option key={d._id} value={val}>
                            {d.name}
                          </option>
                        );
                      })}
                  </>
                ) : (
                  <>
                    <option value="fax">الفاكس والأرشيف</option>
                    <option value="officers">شئون الضباط</option>
                    <option value="arkan_harb">أركان الحرب</option>
                    <option value="medical">الخدمات الطبية</option>
                    <option value="students">شئون الطلبة</option>
                    <option value="education">التعليم والتدريب</option>
                  </>
                )}
              </FormSelect>
            </FormField>
          </div>

          {/* Change Password Card */}
          <div className="rounded-xl border border-(--app-border) bg-(--app-surface-container) p-3.5 space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
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
                className="h-4 w-4 rounded border-(--app-border) text-(--color-primary) focus:ring-blue-500/20 cursor-pointer"
              />
              <div className="flex items-center gap-2 text-xs font-black text-(--app-foreground)">
                <KeyRound className="w-3.5 h-3.5 text-(--color-primary)" />
                <span>تغيير كلمة المرور للمستخدم</span>
              </div>
            </label>

            {changePassword && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-(--app-border)">
                <FormField label="كلمة المرور الجديدة" required>
                  <FormInput
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    dir="ltr"
                    className="text-left font-mono"
                    autoComplete="new-password"
                  />
                </FormField>
                <FormField label="تأكيد كلمة المرور" required>
                  <FormInput
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    dir="ltr"
                    className="text-left font-mono"
                    autoComplete="new-password"
                  />
                </FormField>
              </div>
            )}
          </div>

          {/* Permissions Grid */}
          <div className="space-y-2.5 pt-3 border-t border-(--app-border)">
            <div className="flex items-center justify-between">
              <FormLabel className="text-xs font-black text-(--color-primary) flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                صلاحيات المنظومات
              </FormLabel>
              <span className="text-[10px] font-bold text-(--app-muted-foreground)">
                حدد مستوى وصول المستخدم لكل منظومة
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {MODULES.map((mod) => (
                <div
                  key={mod}
                  className="p-2.5 bg-(--app-surface-container) border border-(--app-border) rounded-xl space-y-1.5 transition-all hover:border-(--color-primary)/30"
                >
                  <label className="block text-xs font-black text-(--app-foreground)">
                    {MODULE_CONFIG[mod]?.label || mod}
                  </label>
                  <FormSelect
                    value={permissions[mod] || "none"}
                    onChange={(e) =>
                      setPermissions({ ...permissions, [mod]: e.target.value })
                    }
                    selectSize="sm"
                    className="text-xs font-bold"
                  >
                    {PERMISSION_LEVELS.map((p) => (
                      <option key={p} value={p}>
                        {PERMISSION_LEVEL_LABELS[p] || p}
                      </option>
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
