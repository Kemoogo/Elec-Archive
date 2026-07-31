"use client";

import { useState, useRef } from "react";
import { UserManagement } from "@/components/admin/user-management";
import { PageContainer } from "@/components/layout/PageContainer";
import { ModernPageHeader as PageHeader } from "@/components/layout/ModernPageHeader";
import { UserPlus, ShieldCheck } from "lucide-react";

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const userManagementRef = useRef<{ openCreateModal: () => void }>(null);

  return (
    <PageContainer className="max-w-[1600px] mx-auto pb-12">
      <PageHeader 
        title="إدارة المستخدمين" 
        icon={<ShieldCheck className="w-6 h-6" />}
        showSearch 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        action={
          <button
            onClick={() => userManagementRef.current?.openCreateModal()}
            className="btn-primary"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة مستخدم</span>
          </button>
        }
      />
      <UserManagement 
        ref={userManagementRef}
        searchQuery={searchQuery} 
      />
      
      {/* 
        Ideally, the CreateUserModal should be moved here if we want full state control,
        but for now UserManagement handles it internally if we trigger it.
        Wait, I should move the modal here for consistency.
      */}
    </PageContainer>
  );
}
