import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { authenticate } from "@/lib/auth/middleware";
import type { ModulePermissions } from "@/lib/auth/types";
import { AuthenticatedNavbar } from "@/components/layout/AuthenticatedNavbar";
import { SessionWatcher } from "@/components/auth/SessionWatcher";
import LandingPage from "@/components/landing/LandingPage";
import { checkDailyRollcallReminder } from "@/lib/arkan-harb/rollcall-reminder";

const moduleRoutes: (keyof ModulePermissions)[] = ["fax", "officers", "medical", "students", "education", "arkan_harb"];

function checkRouteAccess(pathname: string, role: string, permissions: ModulePermissions): { allowed: boolean; redirectTo?: string } {
  if (pathname.startsWith("/admin")) {
    if (role !== "admin") {
      return { allowed: false, redirectTo: "/" };
    }
    return { allowed: true };
  }

  for (const mod of moduleRoutes) {
    const route = `/${mod.replace("_", "-")}`;
    if (pathname.startsWith(route)) {
      if (role !== "admin" && role !== "commander" && permissions[mod] === "none") {
        return { allowed: false, redirectTo: "/" };
      }
      return { allowed: true };
    }
  }


  return { allowed: true };
}

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const result = await authenticate();

  if (!result.success && result.status === 503) {
    redirect("/db-error");
  }

  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "/";

  if (!result.success) {
    if (pathname === "/") {
      return <LandingPage />;
    }
    const encoded = encodeURIComponent(pathname);
    redirect(`/login?redirect=${encoded}`);
  }

  const user = result.user!;

  // Trigger daily rollcall reminder check (Sun-Thu, 09:00+) non-blockingly
  if (user.role === "admin" || (user.permissions && user.permissions.arkan_harb !== "none")) {
    void checkDailyRollcallReminder().catch((error) => {
      console.error("Failed to check daily rollcall reminder:", error);
    });
  }

  const accessCheck = checkRouteAccess(pathname, user.role, user.permissions);
  if (!accessCheck.allowed && accessCheck.redirectTo) {
    redirect(accessCheck.redirectTo);
  }

  const accessibleModules = moduleRoutes.filter(
    (module) => user.role === "admin" || user.role === "commander" || user.permissions[module] !== "none"
  );

  return (
    <div dir="rtl">
      <SessionWatcher />
      <AuthenticatedNavbar user={user} accessibleModules={accessibleModules} />

      <div className="flex flex-col min-h-[calc(100vh-64px-56px)]">          <main className="flex-1 p-3 sm:p-4 md:p-6 transition-all duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}
