export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import { ProfileClient } from "@/components/profile/ProfileClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "الملف الشخصي | الأرشيف الإلكتروني",
  description: "عرض بيانات الحساب وتحديث كلمة المرور",
};

export default async function ProfilePage() {
  const result = await authenticate();
  if (!result.success || !result.user) {
    redirect("/login");
  }

  const { id, username, fullName, role, department, permissions } = result.user;

  await connectToDatabase();
  const dbUser = await User.findById(id).select("createdAt").lean();
  const createdAt = dbUser?.createdAt
    ? new Date(dbUser.createdAt).toISOString()
    : undefined;

  return (
    <ProfileClient
      user={{
        id,
        username,
        fullName,
        role,
        department,
        permissions,
        createdAt,
      }}
    />
  );
}
