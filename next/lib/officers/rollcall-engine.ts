import { connectToDatabase } from "@/lib/db/connect";
import { 
  Officer, 
  Leave, 
  Mission, 
  MedicalVisit, 
  MedicalPatient, 
  Course 
} from "@/lib/db/models";
import type { RollcallStatus } from "@/lib/db/models/DailyRollcall";

export interface SuggestedRollcallEntry {
  officerId: string;
  militaryId: string;
  fullName: string;
  rank: string;
  suggestedStatus: RollcallStatus;
  reason: string;
  relatedId?: string;
}

/**
 * The "Digital Monolith" Suggestion Engine.
 * Cross-references all operational modules to determine an officer's daily status.
 */
export async function getSuggestedRollcall(date: Date): Promise<SuggestedRollcallEntry[]> {
  await connectToDatabase();

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // 1. Fetch all active officers in the unit
  const activeOfficers = await Officer.find({
    employmentStatus: "active",
    isInUnit: true
  }).sort({ rank: 1, seniorityNumber: 1 }).lean();

  if (activeOfficers.length === 0) return [];

  const officerIds = activeOfficers.map(o => o._id);
  const militaryIds = activeOfficers.map(o => o.militaryId);

  // 2. Fetch all relevant records for these officers on this date
  const [
    activeLeaves,
    activeMissions,
    activeCourses,
    activeMedicalVisits
  ] = await Promise.all([
    // Leaves: approved and date falls within range
    Leave.find({
      officerId: { $in: officerIds },
      status: "approved",
      startDate: { $lte: endOfDay },
      endDate: { $gte: startOfDay }
    }).lean(),

    // Missions: active and date falls within range
    Mission.find({
      officerId: { $in: officerIds },
      status: "active",
      startDate: { $lte: endOfDay },
      $or: [
        { endDate: { $exists: false } },
        { endDate: { $gte: startOfDay } }
      ]
    }).lean(),

    // Courses: ongoing and officer is a participant
    Course.find({
      participantModel: "Officer",
      participants: { $in: officerIds },
      status: "ongoing",
      startDate: { $lte: endOfDay },
      endDate: { $gte: startOfDay }
    }).lean(),

    // Medical: Find visits for these officers (via MedicalPatient/MilitaryId)
    // This is a two-step lookup since MedicalPatient uses patientId (MilitaryId)
    MedicalPatient.find({ patientId: { $in: militaryIds } }).lean().then(async (patients) => {
        if (patients.length === 0) return [];
        const patientIds = patients.map(p => p._id);
        const patientToMilitaryId = new Map(patients.map(p => [p._id.toString(), p.patientId]));
        
        const visits = await MedicalVisit.find({
            patientId: { $in: patientIds },
            visitDate: { $lte: endOfDay }
        }).sort({ visitDate: -1 }).lean();

        // Filter visits where rest is still active
        return visits.filter(v => {
            const restDays = v.restDays || 0;
            if (v.restType === "none" || restDays === 0) return false;
            
            const restEndDate = new Date(v.visitDate);
            restEndDate.setDate(restEndDate.getDate() + restDays);
            return restEndDate >= startOfDay;
        }).map(v => ({ ...v, militaryId: patientToMilitaryId.get(v.patientId.toString()) }));
    })
  ]);

  // 3. Map suggestions
  const leaveMap = new Map(activeLeaves.map(l => [l.officerId.toString(), l]));
  const missionMap = new Map(activeMissions.map(m => [m.officerId.toString(), m]));
  const courseMap = new Map();
  activeCourses.forEach(c => {
    c.participants.forEach((pId: { toString(): string }) => {
        courseMap.set(pId.toString(), c);
    });
  });
  const medicalMap = new Map(activeMedicalVisits.map(v => [v.militaryId, v]));

  return activeOfficers.map(officer => {
    const oId = officer._id.toString();
    const mId = officer.militaryId;

    let suggestedStatus: RollcallStatus = "present";
    let reason = "حاضر بالوحدة";
    let relatedId: string | undefined = undefined;

    // Precedence Logic:
    // 1. Leave (Strongest)
    // 2. Mission
    // 3. Course
    // 4. Medical

    const leave = leaveMap.get(oId);
    if (leave) {
      suggestedStatus = "leave";
      reason = `إجازة (${leave.type})`;
      relatedId = leave._id.toString();
    } else {
      const mission = missionMap.get(oId);
      if (mission) {
        suggestedStatus = "mission";
        reason = `مأمورية: ${mission.title}`;
        relatedId = mission._id.toString();
      } else {
        const course = courseMap.get(oId);
        if (course) {
          suggestedStatus = "course";
          reason = `فرقة: ${course.title}`;
          relatedId = course._id.toString();
        } else {
          const med = medicalMap.get(mId);
          if (med) {
            suggestedStatus = "medical";
            reason = `راحة طبية (${med.restType})`;
            relatedId = med._id.toString();
          }
        }
      }
    }

    return {
      officerId: oId,
      militaryId: mId,
      fullName: officer.fullName,
      rank: officer.rank,
      suggestedStatus,
      reason,
      relatedId
    };
  });
}
