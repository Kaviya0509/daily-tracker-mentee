import type { Timestamp } from "firebase/firestore";

export interface MenteeReport {
  reportId: string;
  menteeUid: string;
  menteeName: string;
  reportDate: string; // YYYY-MM-DD
  currentTask: string;
  status: ReportStatus;
  shortDescription: string;
  managerLead: string;
  blockerDependency: string;
  idleReasonWorkNeeded: string;
  expectedCompletion: string | null; // YYYY-MM-DD or null
  notes: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ReportStatus = "Not Started" | "In Progress" | "Blocked" | "Completed" | "On Hold";

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: "mentee" | "admin";
  active: boolean;
  createdAt: Timestamp;
}
