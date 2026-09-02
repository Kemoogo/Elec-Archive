export const OFFICER_RANKS = [
  "second_lieutenant",
  "first_lieutenant",
  "captain",
  "major",
  "lieutenant_colonel",
  "colonel",
  "brigadier",
  "major_general",
] as const;

export type OfficerRank = (typeof OFFICER_RANKS)[number];

export const EMPLOYMENT_STATUSES = ["active", "inactive", "retired"] as const;
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];

export const OFFICER_TYPES = ["worker", "reserve", "university", "honorary", "technical", "engineer"] as const;
export type OfficerType = (typeof OFFICER_TYPES)[number];

export const OFFICER_WEAPONS = ["signals", "vehicles", "armored", "admin_affairs", "infantry"] as const;
export type OfficerWeapon = (typeof OFFICER_WEAPONS)[number];

export const RANK_LABELS: Record<OfficerRank, string> = {
  second_lieutenant: "ملازم",
  first_lieutenant: "ملازم أول",
  captain: "نقيب",
  major: "رائد",
  lieutenant_colonel: "مقدم",
  colonel: "عقيد",
  brigadier: "عميد",
  major_general: "لواء",
};

export const RANK_WEIGHTS: Record<string, number> = {
  major_general: 1,
  brigadier: 2,
  colonel: 3,
  lieutenant_colonel: 4,
  major: 5,
  captain: 6,
  first_lieutenant: 7,
  second_lieutenant: 8,
};
