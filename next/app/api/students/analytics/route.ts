import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { hasModuleAccess } from "@/lib/auth/rbac";
import { errors } from "@/lib/auth/errors";
import { getStudentsAnalytics } from "@/lib/students/analytics";

export async function GET(request: Request) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  if (!hasModuleAccess(auth.user, "students", "view")) {
    return NextResponse.json(
      { success: false, error: errors.insufficientPermissions },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const mrhla = searchParams.get("mrhla") || undefined;

    const data = await getStudentsAnalytics(mrhla);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching students analytics:", error);
    return NextResponse.json(
      { success: false, error: "فشل استرجاع تحليلات ومؤشرات الطلبة" },
      { status: 500 }
    );
  }
}
