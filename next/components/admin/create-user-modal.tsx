"use client";

import { useState, useEffect, Fragment } from "react";
import { ModalActions } from "@/components/ui/modal-actions";
import { ModalShell } from "@/components/ui/modal-shell";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";
import { FormField, FormInput, FormSelect, FormLabel } from "@/components/ui/form-fields";
import { UserPlus, Shield } from "lucide-react";

interface CreateUserModalProps {
  onClose: () => void;
  onCreated: () => void;
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
  const [department, setDepartment] = useState("");
  const [dynamicBranches, setDynamicBranches] = useState<DynamicBranch[]>([]);
  const [dynamicDeps, setDynamicDeps] = useState<DynamicDep[]>([]);
  const [permissions, setPermissions] = useState<Record<string, string>>(emptyPermissions());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadBranchesAndDepartments() {
      try {
        const [branchesRes, depsRes] = await Promise.all([
          fetch("/api/branches"),
          fetch("/api/departments"),
        ]);
        const branchesData = await branchesRes.json();
        const depsData = await depsRes.json();

        const fetchedBranches =
          branchesData.success && Array.isArray(branchesData.branches) ? branchesData.branches : [];
        const fetchedDeps =
          depsData.success && Array.isArray(depsData.departments) ? depsData.departments : [];

        setDynamicBranches(fetchedBranches);
        setDynamicDeps(fetchedDeps);

        if (fetchedBranches.length > 0) {
          setDepartment(fetchedBranches[0].name);
        } else if (fetchedDeps.length > 0) {
          setDepartment(fetchedDeps[0].code || fetchedDeps[0].name);
        } else {
          setDepartment("fax");
        }
      } catch {
        setDepartment("fax");
      }
    }
    loadBranchesAndDepartments();
  }, []);

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

      showToast("تم إنشاء المستخدم بنجاح", "success");
      onCreated();
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
      title="إضافة مستخدم جديد"
      icon={<UserPlus className="w-4 h-4" />}
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-h-[85vh] max-w-xl border-(--app-border) shadow-depth-xl"
      bodyClassName="p-6 no-scrollbar"
      footer={
        <ModalActions
          form={formId}
          submitText="إنشاء المستخدم"
          submitLoading={saving}
          onCancel={onClose}
        />
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4" dir="rtl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <FormField label="اسم المستخدم" required>
            <FormInput
              type="text"
              required
              placeholder="مثال: ahmed_ali"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              dir="ltr"
              className="text-left font-mono"
            />
          </FormField>

          <FormField label="كلمة المرور" required>
            <FormInput
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              dir="ltr"
              className="text-left font-mono"
            />
          </FormField>

          <FormField label="الاسم الكامل" required>
            <FormInput
              type="text"
              required
              placeholder="الاسم الثلاثي أو الرباعي..."
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              dir="rtl"
            />
          </FormField>

          <FormField label="الدور الوظيفي" required>
            <FormSelect value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r] || r}
                </option>
              ))}
            </FormSelect>
          </FormField>

          <div className="col-span-1 sm:col-span-2">
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
                  value={permissions[mod]}
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
    </ModalShell>
  );
}
