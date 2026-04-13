/**
 * migrate-assignments.ts
 *
 * Migrates legacy `Assignment` documents to three dedicated models:
 *   - type "assignment" → PositionAssignment
 *   - type "mission"    → Mission
 *   - type "promotion"  → Promotion  (best-effort; skipped when ranks cannot be inferred)
 *
 * This script is NON-DESTRUCTIVE — it never deletes or modifies the original
 * `assignments` collection.
 *
 * Usage:
 *   # Preview only (no writes):
 *   MONGODB_URI=mongodb://localhost:27017/elec-archive npx tsx scripts/migrate-assignments.ts --dry-run
 *
 *   # Live run:
 *   MONGODB_URI=mongodb://localhost:27017/elec-archive npx tsx scripts/migrate-assignments.ts
 */

import mongoose, { Schema, model, models, type Document, type Types } from "mongoose";

// ---------------------------------------------------------------------------
// 1. Rank constants & Arabic label map (mirrors Officer.ts — standalone copy)
// ---------------------------------------------------------------------------

const OFFICER_RANKS = [
  "second_lieutenant",
  "first_lieutenant",
  "captain",
  "major",
  "lieutenant_colonel",
  "colonel",
  "brigadier",
  "major_general",
] as const;

type OfficerRank = (typeof OFFICER_RANKS)[number];

/** Arabic label → internal rank value.  Used to parse promotion descriptions. */
const ARABIC_LABEL_TO_RANK: Record<string, OfficerRank> = {
  ملازم: "second_lieutenant",
  "ملازم ثاني": "second_lieutenant",
  "ملازم أول": "first_lieutenant",
  نقيب: "captain",
  رائد: "major",
  مقدم: "lieutenant_colonel",
  عقيد: "colonel",
  عميد: "brigadier",
  لواء: "major_general",
};

// ---------------------------------------------------------------------------
// 2. Inline schema definitions (standalone — avoids Next.js module resolution)
// ---------------------------------------------------------------------------

// ── Assignment (source) ───────────────────────────────────────────────────

const ASSIGNMENT_TYPES = ["assignment", "promotion", "mission"] as const;
type AssignmentType = (typeof ASSIGNMENT_TYPES)[number];

const ASSIGNMENT_STATUSES = ["scheduled", "active", "completed", "cancelled"] as const;
type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

interface IAssignment extends Document {
  officerId: Types.ObjectId;
  type: AssignmentType;
  title: string;
  description?: string;
  effectiveDate: Date;
  endDate?: Date;
  status: AssignmentStatus;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
}

const AssignmentSchema = new Schema<IAssignment>(
  {
    officerId: { type: Schema.Types.ObjectId, ref: "Officer", required: true },
    type: { type: String, required: true, enum: ASSIGNMENT_TYPES },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    effectiveDate: { type: Date, required: true },
    endDate: { type: Date },
    status: { type: String, required: true, enum: ASSIGNMENT_STATUSES, default: "scheduled" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

const Assignment =
  models.Assignment ?? model<IAssignment>("Assignment", AssignmentSchema);

// ── PositionAssignment (target) ───────────────────────────────────────────

const POSITION_STATUSES = ["active", "ended"] as const;
type PositionStatus = (typeof POSITION_STATUSES)[number];

interface IPositionAssignment extends Document {
  officerId: Types.ObjectId;
  positionTitle: string;
  positionType: "primary" | "substitute";
  substituteForOfficerId?: Types.ObjectId;
  startDate: Date;
  endDate?: Date;
  orderNumber?: string;
  notes?: string;
  status: PositionStatus;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
}

const PositionAssignmentSchema = new Schema<IPositionAssignment>(
  {
    officerId: { type: Schema.Types.ObjectId, ref: "Officer", required: true },
    positionTitle: { type: String, required: true, trim: true },
    positionType: { type: String, required: true, enum: ["primary", "substitute"] },
    substituteForOfficerId: { type: Schema.Types.ObjectId, ref: "Officer" },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    orderNumber: { type: String, trim: true },
    notes: { type: String, trim: true },
    status: { type: String, required: true, enum: POSITION_STATUSES, default: "active" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

const PositionAssignment =
  models.PositionAssignment ??
  model<IPositionAssignment>("PositionAssignment", PositionAssignmentSchema);

// ── Mission (target) ──────────────────────────────────────────────────────

const MISSION_STATUSES = ["scheduled", "active", "completed", "cancelled"] as const;
type MissionStatus = (typeof MISSION_STATUSES)[number];

interface IMission extends Document {
  officerId: Types.ObjectId;
  title: string;
  description?: string;
  destination?: string;
  startDate: Date;
  endDate?: Date;
  status: MissionStatus;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
}

const MissionSchema = new Schema<IMission>(
  {
    officerId: { type: Schema.Types.ObjectId, ref: "Officer", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    destination: { type: String, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    status: { type: String, required: true, enum: MISSION_STATUSES, default: "scheduled" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

const Mission = models.Mission ?? model<IMission>("Mission", MissionSchema);

// ── Promotion (target) ────────────────────────────────────────────────────

interface IPromotion extends Document {
  officerId: Types.ObjectId;
  fromRank: OfficerRank;
  toRank: OfficerRank;
  effectiveDate: Date;
  orderNumber?: string;
  notes?: string;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
}

const PromotionSchema = new Schema<IPromotion>(
  {
    officerId: { type: Schema.Types.ObjectId, ref: "Officer", required: true },
    fromRank: { type: String, required: true, enum: OFFICER_RANKS },
    toRank: { type: String, required: true, enum: OFFICER_RANKS },
    effectiveDate: { type: Date, required: true },
    orderNumber: { type: String, trim: true },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

const Promotion = models.Promotion ?? model<IPromotion>("Promotion", PromotionSchema);

// ---------------------------------------------------------------------------
// 3. Helper utilities
// ---------------------------------------------------------------------------

/** Map legacy Assignment status values to PositionAssignment-compatible ones. */
function toPositionStatus(status: AssignmentStatus): PositionStatus {
  switch (status) {
    case "active":
      return "active";
    case "scheduled":
      return "active"; // closest equivalent — no "scheduled" in PositionAssignment
    case "completed":
    case "cancelled":
      return "ended";
  }
}

/**
 * Attempt to parse `fromRank` / `toRank` from a promotion description.
 *
 * Typical formats in legacy data:
 *   "ملازم → نقيب"
 *   "نقيب الى مقدم"
 *   "ترقية من رائد إلى عقيد"
 *
 * Returns `null` when parsing fails — the caller must then skip the record.
 */
function parsePromotionRanks(
  description: string | undefined,
): { fromRank: OfficerRank; toRank: OfficerRank } | null {
  if (!description) return null;

  // Build a regex that matches any known Arabic label
  const labels = Object.keys(ARABIC_LABEL_TO_RANK)
    .sort((a, b) => b.length - a.length) // longer labels first to avoid partial matches
    .map((l) => l.replace(/\s+/g, "\\s+"))
    .join("|");

  const pattern = new RegExp(`(${labels})(?:\\s*(?:→|->|إلى|الى|الي)\\s*)(${labels})`, "u");
  const match = description.match(pattern);
  if (!match) return null;

  const fromRank = ARABIC_LABEL_TO_RANK[match[1]];
  const toRank = ARABIC_LABEL_TO_RANK[match[2]];

  if (!fromRank || !toRank || fromRank === toRank) return null;
  return { fromRank, toRank };
}

// ---------------------------------------------------------------------------
// 4. Per-type counters
// ---------------------------------------------------------------------------

interface Counter {
  success: number;
  skipped: number;
  error: number;
}

function emptyCounter(): Counter {
  return { success: 0, skipped: 0, error: 0 };
}

// ---------------------------------------------------------------------------
// 5. Main runner
// ---------------------------------------------------------------------------

async function migrateAssignments(): Promise<void> {
  const MONGODB_URI = process.env.MONGODB_URI;
  const isDryRun = process.argv.includes("--dry-run");

  if (!MONGODB_URI) {
    console.error("❌  MONGODB_URI is not defined.");
    console.error("Usage: MONGODB_URI=<uri> npx tsx scripts/migrate-assignments.ts [--dry-run]");
    process.exit(1);
  }

  console.log(`\n🔌  Connecting to MongoDB...`);
  await mongoose.connect(MONGODB_URI);
  console.log(`✅  Connected.\n`);

  if (isDryRun) {
    console.log("⚠️   DRY-RUN mode — no writes will be made to the database.\n");
  }

  // Load all Assignments
  const assignments = await Assignment.find({}).lean();
  console.log(`📋  Found ${assignments.length} assignment(s) to process.\n`);

  const counters: Record<AssignmentType, Counter> = {
    assignment: emptyCounter(),
    mission: emptyCounter(),
    promotion: emptyCounter(),
  };

  for (const src of assignments) {
    try {
      if (src.type === "assignment") {
        // ── Convert to PositionAssignment ─────────────────────────────────
        const posStatus = toPositionStatus(src.status as AssignmentStatus);

        const posData = {
          officerId: src.officerId,
          positionTitle: src.title,
          positionType: "primary" as const,
          startDate: src.effectiveDate,
          endDate: src.endDate,
          notes: src.description,
          status: posStatus,
          createdBy: src.createdBy,
          updatedBy: src.updatedBy ?? src.createdBy,
        };

        if (isDryRun) {
          console.log(
            `  [DRY-RUN] Would create PositionAssignment for officer ${String(src.officerId)}: "${src.title}" (${posStatus})`,
          );
        } else {
          const doc = new PositionAssignment(posData);
          await doc.save();
        }
        counters.assignment.success++;
      } else if (src.type === "mission") {
        // ── Convert to Mission ────────────────────────────────────────────
        const missionData = {
          officerId: src.officerId,
          title: src.title,
          description: src.description,
          startDate: src.effectiveDate,
          endDate: src.endDate,
          status: src.status as MissionStatus,
          createdBy: src.createdBy,
          updatedBy: src.updatedBy ?? src.createdBy,
        };

        if (isDryRun) {
          console.log(
            `  [DRY-RUN] Would create Mission for officer ${String(src.officerId)}: "${src.title}" (${src.status})`,
          );
        } else {
          const doc = new Mission(missionData);
          await doc.save();
        }
        counters.mission.success++;
      } else if (src.type === "promotion") {
        // ── Convert to Promotion (best-effort) ────────────────────────────
        const parsed = parsePromotionRanks(src.description);

        if (!parsed) {
          console.warn(
            `  ⚠️  SKIP promotion _id=${String(src._id)}: could not infer fromRank/toRank` +
              ` from description "${src.description ?? "(empty)"}". Manual entry required.`,
          );
          counters.promotion.skipped++;
          continue;
        }

        const promotionData = {
          officerId: src.officerId,
          fromRank: parsed.fromRank,
          toRank: parsed.toRank,
          effectiveDate: src.effectiveDate,
          notes: src.title !== "ترقية" ? src.title : src.description,
          createdBy: src.createdBy,
          updatedBy: src.updatedBy ?? src.createdBy,
        };

        if (isDryRun) {
          console.log(
            `  [DRY-RUN] Would create Promotion for officer ${String(src.officerId)}: ${parsed.fromRank} → ${parsed.toRank}`,
          );
        } else {
          const doc = new Promotion(promotionData);
          await doc.save();
        }
        counters.promotion.success++;
      }
    } catch (err: unknown) {
      const type = src.type as AssignmentType;
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `  ❌  ERROR processing ${type} _id=${String(src._id)}: ${message}`,
      );
      counters[type].error++;
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Final report
  // ---------------------------------------------------------------------------

  const totalSuccess =
    counters.assignment.success + counters.mission.success + counters.promotion.success;
  const totalSkipped =
    counters.assignment.skipped + counters.mission.skipped + counters.promotion.skipped;
  const totalError =
    counters.assignment.error + counters.mission.error + counters.promotion.error;

  console.log(`
============ تقرير الترحيل ============
وضع: ${isDryRun ? "DRY-RUN  (لم تُكتَب أي بيانات)" : "LIVE"}
---------------------------------------
Assignments مُقرَوءة: ${assignments.length}
---------------------------------------
PositionAssignments مُنشأة: ${counters.assignment.success} (تجاوز: ${counters.assignment.skipped}، خطأ: ${counters.assignment.error})
Missions      مُنشأة: ${counters.mission.success} (تجاوز: ${counters.mission.skipped}، خطأ: ${counters.mission.error})
Promotions    مُنشأة: ${counters.promotion.success} (تجاوز: ${counters.promotion.skipped}، خطأ: ${counters.promotion.error})
---------------------------------------
إجمالي ناجح: ${totalSuccess}  |  تجاوز: ${totalSkipped}  |  خطأ: ${totalError}
---------------------------------------
⚠️  لم يُحذف أي سجل من مجموعة assignments الأصلية
===========================================
`);

  await mongoose.disconnect();
  console.log("🔌  Disconnected from MongoDB.\n");

  if (totalError > 0) {
    process.exit(1);
  }
}

migrateAssignments().catch((err: unknown) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
