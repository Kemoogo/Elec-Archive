import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { Officer } from "@/lib/db/models/Officer";
import { RANK_LABELS, type OfficerRank } from "@/lib/db/models/Officer.shared";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await authenticate();
    if (!auth.success || !auth.user) {
      return NextResponse.json({ isLoggedIn: false });
    }

    await connectToDatabase();
    const officer = await Officer.findOne({
      $or: [{ seniorityNumber: "42627" }, { militaryId: "42627" }],
    })
      .select("rank fullName isArkanHarb")
      .lean();

    let rankLabel = "مقدم";
    let developerName = "كريم احمد مصطفى";

    if (officer) {
      if (officer.rank) {
        const baseRank = RANK_LABELS[officer.rank as OfficerRank] || officer.rank;
        const arkan = officer.isArkanHarb ? " أ ح" : "";
        rankLabel = `${baseRank}${arkan}`;
      }
      if (officer.fullName) {
        developerName =
          officer.fullName
            .replace(
              /^(ملازم أول|ملازم|نقيب|رائد|مقدم|عقيد|عميد|لواء)(\s+أ\s*ح)?\s*(\/|-)?\s*/i,
              ""
            )
            .trim() || officer.fullName;
      }
    }

    return NextResponse.json({
      isLoggedIn: true,
      rankLabel,
      developerName,
    });
  } catch {
    return NextResponse.json({
      isLoggedIn: false,
      rankLabel: "مقدم",
      developerName: "كريم احمد مصطفى",
    });
  }
}
