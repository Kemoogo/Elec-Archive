"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ModalActions } from "@/components/ui/modal-actions";
import { ModalShell } from "@/components/ui/modal-shell";
import { LoadingState } from "@/components/ui/loading-state";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";
import { FormField, FormInput } from "@/components/ui/form-fields";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import { UserCog, KeyRound, Shield, Plus, Trash2, AlertCircle } from "lucide-react";
import {
  MODULES,
  MODULE_CONFIG,
  ROLE_LABELS,
  ROLES,
  type ModuleKey,
  type PermissionLevel,
  type PermissionRow,
} from "./create-user-modal";

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

export function EditUserModal({ user, onClose, onSaved }: EditUserModalProps) {
  const { showToast } = useToast();
  const formId = `edit-user-form-${user.id}`;
  const [fullName, setFullName] = useState(user.fullName);
  const [role, setRole] = useState(user.role);
  const [department, setDepartment] = useState(user.department);
  const [dynamicBranches, setDynamicBranches] = useState<DynamicBranch[]>([]);
  const [dynamicDeps, setDynamicDeps] = useState<DynamicDep[]>([]);
  const [permissionRows, setPermissionRows] = useState<PermissionRow[]>([]);
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
          const currentRole = dataUser.user.role || user.role;
          setRole(currentRole);
          setDepartment(dataUser.user.department || "");
          if (dataUser.user.permissions) {
            const initialRows: PermissionRow[] = [];
            for (const mod of MODULES) {
              const val = (dataUser.user.permissions[mod] as PermissionLevel | undefined) ?? "none";
              if (val !== "none") {
                initialRows.push({
                  module: mod,
                  level: currentRole === "viewer" && val === "edit" ? "view" : val,
                });
              }
            }
            setPermissionRows(initialRows);
          }
        }
      } catch {
        showToast("فشل في تحميل بيانات المستخدم والفروع", "error");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user.id, user.role, showToast]);

  // When role changes to viewer, downgrade any "edit" permissions to "view"
  function handleRoleChange(newRole: string) {
    setRole(newRole);
    if (newRole === "viewer") {
      setPermissionRows((prev) =>
        prev.map((r) => (r.level === "edit" ? { ...r, level: "view" } : r))
      );
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (changePassword) {
      if (password.length < 8) {
        showToast("كلمة المرور يجب أن تكون ٨ أحرف على الأقل", "error");
        return;
      }
      if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
        showToast("كلمة المرور يجب أن تحتوي على حرف واحد ورقم واحد على الأقل", "error");
        return;
      }
      if (password !== confirmPassword) {
        showToast("كلمتا المرور غير متطابقتين", "error");
        return;
      }
    }

    // Construct permissions object. Non-added modules are "none"
    const builtPermissions: Record<string, string> = Object.fromEntries(
      MODULES.map((m) => [m, "none"])
    );
    for (const rowItem of permissionRows) {
      builtPermissions[rowItem.module] =
        role === "viewer" && rowItem.level === "edit" ? "view" : rowItem.level;
    }

    setSaving(true);

    try {
      const body: Record<string, unknown> = {
        fullName,
        role,
        department,
        permissions: builtPermissions,
      };
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
        <LoadingState message="جاري تحميل بيانات المستخدم..." variant="inline" />
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

            <CustomSelect
              id="edit-user-role"
              label="الدور الوظيفي"
              value={role}
              onChange={handleRoleChange}
              options={roleOptions}
              required
            />

            <CustomSelect
              id="edit-user-department"
              label="الفرع / القسم التكتيكي"
              value={department}
              onChange={setDepartment}
              options={departmentOptions}
              placeholder="اختر الفرع أو القسم التكتيكي..."
              required
            />
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
              <div className="space-y-2 pt-2 border-t border-(--app-border)">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <p className="text-[11px] font-bold text-(--app-muted-foreground) pr-1">
                  * كلمة المرور يجب أن تكون ٨ أحرف على الأقل وتحتوي على حرف واحد ورقم واحد على الأقل.
                </p>
              </div>
            )}
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
      )}
    </ModalShell>
  );
}
