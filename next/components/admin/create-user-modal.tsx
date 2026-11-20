"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ModalActions } from "@/components/ui/modal-actions";
import { ModalShell } from "@/components/ui/modal-shell";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";
import { FormField, FormInput } from "@/components/ui/form-fields";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import { UserPlus, Shield, Plus, Trash2, AlertCircle } from "lucide-react";

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

export const MODULES = ["fax", "officers", "arkan_harb", "medical", "students", "education", "historical_record"] as const;
export type ModuleKey = (typeof MODULES)[number];
export const PERMISSION_LEVELS = ["none", "view", "edit"] as const;
export type PermissionLevel = (typeof PERMISSION_LEVELS)[number];
export const ROLES = ["admin", "commander", "employee", "viewer"] as const;

export const MODULE_CONFIG: Record<ModuleKey, { label: string }> = {
  fax: { label: "الفاكس والأرشيف" },
  officers: { label: "شئون الضباط" },
  arkan_harb: { label: "أركان الحرب" },
  medical: { label: "الخدمات الطبية" },
  students: { label: "شئون الطلبة" },
  education: { label: "التعليم والتدريب" },
  historical_record: { label: "السجل التاريخي" },
};

export const ROLE_LABELS: Record<string, string> = {
  admin: "مسؤول النظام",
  commander: "قائد",
  employee: "موظف",
  viewer: "مستعرض (عرض فقط)",
};

export interface PermissionRow {
  module: ModuleKey;
  level: PermissionLevel;
}

/**
 * Detect matching system module from department/branch name
 */
export function detectModuleFromDepartment(deptName: string): ModuleKey | null {
  const norm = deptName.toLowerCase().trim();
  if (norm.includes("ضابط") || norm.includes("ضباط") || norm.includes("officer")) return "officers";
  if (norm.includes("أركان") || norm.includes("اركان") || norm.includes("عمليات") || norm.includes("arkan")) return "arkan_harb";
  if (norm.includes("طب") || norm.includes("علاج") || norm.includes("صحي") || norm.includes("medical")) return "medical";
  if (norm.includes("طلب") || norm.includes("دارس") || norm.includes("student")) return "students";
  if (norm.includes("عليم") || norm.includes("دريب") || norm.includes("مناهج") || norm.includes("education")) return "education";
  if (norm.includes("تاريخ") || norm.includes("سجل") || norm.includes("historical")) return "historical_record";
  if (norm.includes("فاكس") || norm.includes("أرشيف") || norm.includes("ارشيف") || norm.includes("سري") || norm.includes("fax")) return "fax";
  return null;
}

export function CreateUserModal({ onClose, onCreated }: CreateUserModalProps) {
  const { showToast } = useToast();
  const formId = "create-user-form";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("employee");
  const [department, setDepartment] = useState("");
  const [dynamicBranches, setDynamicBranches] = useState<DynamicBranch[]>([]);
  const [dynamicDeps, setDynamicDeps] = useState<DynamicDep[]>([]);
  const [permissionRows, setPermissionRows] = useState<PermissionRow[]>([]);
  const [saving, setSaving] = useState(false);

  // Sync default permission when department or role changes
  useEffect(() => {
    if (!department) return;
    const detected = detectModuleFromDepartment(department);
    if (detected) {
      setPermissionRows((prev) => {
        const exists = prev.some((r) => r.module === detected);
        if (exists) {
          if (role === "viewer") {
            return prev.map((r) => (r.module === detected ? { ...r, level: "view" } : r));
          }
          return prev;
        }
        const defaultLevel: PermissionLevel = role === "viewer" ? "view" : "edit";
        return [{ module: detected, level: defaultLevel }, ...prev];
      });
    }
  }, [department, role]);

  // Load branches & departments
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

        let initialDept = "";
        if (fetchedBranches.length > 0) {
          initialDept = fetchedBranches[0].name;
        } else if (fetchedDeps.length > 0) {
          initialDept = fetchedDeps[0].code || fetchedDeps[0].name;
        } else {
          initialDept = "شئون الضباط";
        }
        setDepartment(initialDept);
      } catch {
        setDepartment("شئون الضباط");
      }
    }
    loadBranchesAndDepartments();
  }, []);

  // When role changes, enforce viewer restriction or commander/admin historical_record default
  function handleRoleChange(newRole: string) {
    setRole(newRole);
    if (newRole === "viewer") {
      setPermissionRows((prev) =>
        prev.map((r) => (r.level === "edit" ? { ...r, level: "view" } : r))
      );
      return;
    }
    if (newRole === "commander" || newRole === "admin") {
      setPermissionRows((prev) => {
        const hasHistorical = prev.some((r) => r.module === "historical_record");
        if (hasHistorical) {
          return prev.map((r) =>
            r.module === "historical_record" ? { ...r, level: "edit" } : r
          );
        }
        return [...prev, { module: "historical_record", level: "edit" }];
      });
    }
  }

  function handleAddPermission() {
    const usedModules = new Set(permissionRows.map((r) => r.module));
    const availableModule = MODULES.find((m) => !usedModules.has(m));
    if (!availableModule) {
      showToast("تمت إضافة جميع المنظومات بالفعل", "info");
      return;
    }
    const defaultLevel: PermissionLevel = role === "viewer" ? "view" : "edit";
    setPermissionRows((prev) => [...prev, { module: availableModule, level: defaultLevel }]);
  }

  function handleUpdateModule(index: number, newMod: ModuleKey) {
    setPermissionRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], module: newMod };
      return next;
    });
  }

  function handleUpdateLevel(index: number, newLevel: PermissionLevel) {
    if (role === "viewer" && newLevel === "edit") {
      showToast("المستعرض (Viewer) لا يمكن أن يحصل على صلاحية تعديل", "error");
      return;
    }
    setPermissionRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], level: newLevel };
      return next;
    });
  }

  function handleRemovePermission(index: number) {
    setPermissionRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const builtPermissions: Record<string, string> = Object.fromEntries(
      MODULES.map((m) => [m, "none"])
    );
    for (const rowItem of permissionRows) {
      builtPermissions[rowItem.module] =
        role === "viewer" && rowItem.level === "edit" ? "view" : rowItem.level;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          fullName,
          role,
          department,
          permissions: builtPermissions,
        }),
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

  const roleOptions: CustomSelectOption[] = useMemo(
    () =>
      ROLES.map((r) => ({
        value: r,
        label: ROLE_LABELS[r] || r,
      })),
    []
  );

  const departmentOptions: CustomSelectOption[] = useMemo(() => {
    if (dynamicBranches.length > 0) {
      const list: CustomSelectOption[] = [];
      dynamicBranches.forEach((branch) => {
        list.push({ value: branch.name, label: branch.name });
        const branchDeps = dynamicDeps.filter((d) => {
          const bId = typeof d.branchId === "object" ? d.branchId?._id : d.branchId;
          return bId === branch._id;
        });
        branchDeps.forEach((d) => {
          list.push({
            value: d.code || d.name,
            label: `${branch.name} / ${d.name}`,
          });
        });
      });

      orphanDeps.forEach((d) => {
        list.push({
          value: d.code || d.name,
          label: d.name,
        });
      });
      return list;
    }

    return [
      { value: "شئون الضباط", label: "شئون الضباط" },
      { value: "الفاكس والأرشيف", label: "الفاكس والأرشيف" },
      { value: "أركان الحرب", label: "أركان الحرب" },
      { value: "الخدمات الطبية", label: "الخدمات الطبية" },
      { value: "شئون الطلبة", label: "شئون الطلبة" },
      { value: "التعليم والتدريب", label: "التعليم والتدريب" },
    ];
  }, [dynamicBranches, dynamicDeps, orphanDeps]);

  const levelOptions: CustomSelectOption[] = useMemo(
    () => [
      { value: "none", label: "محظور (none)" },
      { value: "view", label: "عرض فقط (view)" },
      ...(role !== "viewer" ? [{ value: "edit", label: "عرض وتعديل (edit)" }] : []),
    ],
    [role]
  );

  const getModuleOptions = (currentIdx: number): CustomSelectOption[] => {
    return MODULES.map((m) => ({
      value: m,
      label: MODULE_CONFIG[m]?.label || m,
      disabled: permissionRows.some((r, i) => i !== currentIdx && r.module === m),
    }));
  };

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

          <CustomSelect
            id="create-user-role"
            label="الدور الوظيفي"
            value={role}
            onChange={handleRoleChange}
            options={roleOptions}
            required
          />

          <div className="col-span-1 sm:col-span-2">
            <CustomSelect
              id="create-user-department"
              label="الفرع / القسم التكتيكي"
              value={department}
              onChange={setDepartment}
              options={departmentOptions}
              placeholder="اختر الفرع أو القسم التكتيكي..."
              required
            />
          </div>
        </div>

        {/* Dynamic Permissions Section (Modeled after PositionPlacementModal) */}
        <div className="p-3.5 bg-(--app-surface-container)/30 rounded-2xl border border-(--app-border) space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-(--app-muted-foreground) flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-(--color-primary)" />
              <span>صلاحيات المنظومات</span>
            </label>
            <button
              type="button"
              onClick={handleAddPermission}
              disabled={permissionRows.length >= MODULES.length}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-(--color-primary)/10 text-(--color-primary) border border-(--color-primary)/20 hover:bg-(--color-primary)/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة صلاحية</span>
            </button>
          </div>

          {role === "viewer" && (
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>المستخدم بدور مستعرض (Viewer) يقتصر فقط على صلاحيات القراءة (عرض فقط) ولا يمكنه التعديل.</span>
            </div>
          )}

          {permissionRows.length === 0 ? (
            <p className="text-xs font-bold text-(--app-muted-foreground) py-2 text-center">
              لا توجد صلاحيات مخصصة (سيكون المستخدم محظوراً من كافة المنظومات).
            </p>
          ) : (
            <div className="space-y-2">
              {permissionRows.map((rowItem, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {/* Select Module */}
                  <div className="flex-1">
                    <CustomSelect
                      value={rowItem.module}
                      onChange={(val) => handleUpdateModule(idx, val as ModuleKey)}
                      options={getModuleOptions(idx)}
                      placeholder="اختر المنظومة..."
                    />
                  </div>

                  {/* Select Permission Level */}
                  <div className="w-44 sm:w-48">
                    <CustomSelect
                      value={rowItem.level}
                      onChange={(val) => handleUpdateLevel(idx, val as PermissionLevel)}
                      options={levelOptions}
                      placeholder="اختر الصلاحية..."
                    />
                  </div>

                  {/* Delete Permission Row */}
                  <button
                    type="button"
                    onClick={() => handleRemovePermission(idx)}
                    className="p-2 rounded-xl text-slate-500 hover:text-(--color-primary) hover:bg-(--color-primary)/10 border border-transparent hover:border-(--app-border) transition-all cursor-pointer shrink-0"
                    title="حذف هذه الصلاحية"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>
    </ModalShell>
  );
}
