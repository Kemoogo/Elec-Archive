import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { errors } from "@/lib/auth/errors";
import { Fax } from "@/lib/db/models/Fax";
import { searchQuerySchema } from "@/lib/validations/fax";
import { checkApiRateLimit, rateLimitErrorResponse } from "@/lib/security/rate-limit";
import type { Types } from "mongoose";

export async function GET(request: Request) {
  const auth = await authenticate();
  if (!auth.success) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }

  const faxPermission = auth.user!.permissions.fax;
  if (faxPermission === "none") {
    return NextResponse.json(
      { success: false, error: errors.insufficientPermissions },
      { status: 403 },
    );
  }

  const ip = request.headers.get("x-forwarded-for") ?? "";
  const rl = checkApiRateLimit(auth.user!.id, ip, "read");
  if (!rl.allowed) {
    return NextResponse.json(rateLimitErrorResponse(rl.resetAt), { status: 429 });
  }

  await connectToDatabase();

  const { searchParams } = new URL(request.url);
  const params = Object.fromEntries(searchParams.entries());

  const parsed = searchQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: errors.validationFailed },
      { status: 400 },
    );
  }

  const { q, exclude, limit } = parsed.data;

  const searchRegex = { $regex: q, $options: "i" };
  const query: Record<string, unknown> = {
    $or: [{ faxNumber: searchRegex }, { subject: searchRegex }],
  };

  if (exclude) {
    query._id = { $ne: exclude };
  }

  const faxes = await Fax.find(query)
    .select("faxNumber date subject status")
    .sort({ date: -1 })
    .limit(limit)
    .lean();

  const results = faxes.map((fax) => ({
    _id: (fax._id as Types.ObjectId).toString(),
    faxNumber: fax.faxNumber,
    date: (fax.date as Date).toISOString(),
    subject: fax.subject,
    status: fax.status,
  }));

  return NextResponse.json({ success: true, data: results });
}
