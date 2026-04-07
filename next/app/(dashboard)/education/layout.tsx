import { redirect } from "next/navigation";
import { authenticate } from "@/lib/auth/middleware";

export default async function EducationLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const result = await authenticate();
  if (!result.success) {
    redirect("/login");
  }

  const user = result.user!;
  if (user.role !== "admin" && user.permissions.education === "none") {
    redirect("/");
  }

  return <>{children}</>;
}
