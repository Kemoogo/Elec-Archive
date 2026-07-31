# Tech Debt Report: Patient Medical Record

**Generated**: 2026-05-25
**Feature**: specs/009-patient-medical-record
**Spec Reference**: [spec.md](file:///home/karim/projects/Elec-Archive/specs/009-patient-medical-record/spec.md)

## Executive Summary

| Severity | Count | Immediate Action Required |
|----------|-------|---------------------------|
| Critical | 0     | None                      |
| Large    | 1     | Review and prioritize     |
| Medium   | 1     | Task TD001 created in tasks.md |
| Small    | 1     | Fixed during cleanup      |

## Large Issues Requiring Analysis

### [ISSUE-001] N+1 Database Query Anti-pattern in Visits & Medication Aggregation Loops

**Category**: Performance
**Location**: [queries.ts:81](file:///home/karim/projects/Elec-Archive/next/lib/medical/queries.ts#L81) and [route.ts:71](file:///home/karim/projects/Elec-Archive/next/app/api/medical/patients/%5BpatientId%5D/record/route.ts#L71)
**Related Spec**: FR-001 (عرض سجل زيارات المريض) and FR-002 (عرض قائمة الأدوية المصروفة)
**Constitution Impact**: SSR-First / Performance Quality Gate

#### Problem Description

Currently, when retrieving a patient's medical record via the GET API, the system fetches all visits and then iterates over them to resolve the full name of each dispensed medicine. Inside this loop, it performs a separate database query to find each medicine:
```typescript
const dispensedMedicines = (visit.dispensedMedicines || []).map(async (d) => {
  const medicine = await Medicine.findById(d.medicineId).select("name concentration unit").lean();
  // ...
});
```

A near-identical pattern is implemented in `aggregatePatientMedications` within `queries.ts`, where it performs `Medicine.findById(d.medicineId)` in a nested loop for every dispensed medicine across all visits to compute total quantities and last dispense dates:
```typescript
for (const visit of visits) {
  for (const d of dispensed) {
    if (!medicineMap.has(medId)) {
      const medicine = await Medicine.findById(d.medicineId).select("name concentration unit").lean();
      // ...
    }
  }
}
```

This represents a classic **N+1 query problem** (or rather, 2 * N + 1). If a patient has 50 visits with an average of 2 medicines per visit, this results in up to 100 database queries to render a single patient profile page.

#### Impact if Not Addressed

- **Performance Degradation**: As visit history grows, the response time of the patient medical record GET route will degrade exponentially.
- **Database Overhead**: Unnecessary connections and query executions put high, redundant stress on the local MongoDB instance.
- **Latency & Resource Drain**: Blocking operations in loops block the Node.js event loop thread from handling other incoming requests efficiently.

#### Options

**Option 1: Collect unique medicine IDs and fetch in a single query (Recommended)**
- **Approach**: Parse the visits first to extract all unique `medicineId` ObjectIds. Run a single query `Medicine.find({ _id: { $in: uniqueMedicineIds } }).select("name concentration unit").lean()` to load all required medicines into a local Map. Use that Map to look up medicine details during the aggregation and serialization steps.
- **Pros**: 
  - Extremely simple to implement.
  - Eliminates the N+1 problem completely (reduces queries to exactly 2: one for visits, one for medicines).
  - High performance, minimal database roundtrips.
- **Cons**: None.
- **Effort**: S (Small - roughly 20-30 lines of refactoring).
- **Risk**: Low.

**Option 2: Aggregate via MongoDB Aggregation Pipeline**
- **Approach**: Refactor the database query to use MongoDB `$lookup` to join the `MedicalVisit` and `Medicine` collections at the database layer during aggregation.
- **Pros**:
  - Shifts all work to the MongoDB engine.
- **Cons**:
  - Complicates the aggregation codebase and increases Mongoose pipeline complexity.
- **Effort**: M (Medium).
- **Risk**: Medium (increased risk of aggregation mapping or type issues).

**Option 3: Defer**
- **Approach**: Document and revisit later when page load exceeds acceptable thresholds.
- **Pros**: No immediate effort.
- **Cons**: Performance degrades silently for high-visit patients.
- **Recommended deferral period**: Revisit in next phase or if any query exceeds 500ms.

#### Recommendation

 We highly recommend **Option 1**. It is safe, robust, eliminates the database bottleneck entirely, preserves typescript safety, and is simple to implement within 15 minutes.

---

## Cross-References

- **Specification**: [spec.md](file:///home/karim/projects/Elec-Archive/specs/009-patient-medical-record/spec.md)
- **Implementation Plan**: [plan.md](file:///home/karim/projects/Elec-Archive/specs/009-patient-medical-record/plan.md)
- **Tasks**: [tasks.md](file:///home/karim/projects/Elec-Archive/specs/009-patient-medical-record/tasks.md)
- **Constitution**: [.specify/memory/constitution.md](file:///home/karim/projects/Elec-Archive/.specify/memory/constitution.md)

## Next Steps

1. Review this report with the USER/stakeholders.
2. Approve Option 1 for addressing [ISSUE-001].
3. Create an implementation task `TD002` under the Tech Debt section of `tasks.md`.
4. Run `/speckit.implement` (or direct coding) to address the tech debt tasks.
5. Re-run `/speckit.cleanup` to verify the resolution.
