import { redirect } from "next/navigation";
import { authenticate } from "@/lib/auth/middleware";

export default async function StudentsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const result = await authenticate();
  if (!result.success) {
    redirect("/login");
  }

  const user = result.user!;
  if (user.role !== "admin" && user.permissions.students === "none") {
    redirect("/");
  }

  return <>{children}</>;
}
