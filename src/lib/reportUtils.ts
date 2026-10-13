import type { MenteeReport } from "../types";
import { format } from "date-fns";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

export function getReportCreatedAtMs(report: MenteeReport): number {
  if (!report) return 0;
  const ca = (report as any).createdAt;
  if (ca) {
    if (typeof ca.toMillis === "function") {
      return ca.toMillis();
    }
    if (typeof ca.toDate === "function") {
      return ca.toDate().getTime();
    }
    if (typeof ca.seconds === "number") {
      return ca.seconds * 1000;
    }
    if (typeof ca === "string" || typeof ca === "number") {
      const parsed = new Date(ca).getTime();
      if (!isNaN(parsed)) return parsed;
    }
  }

  // Fallback: if reportDate is today, estimate from start of today or not available
  const today = format(new Date(), "yyyy-MM-dd");
  if (report.reportDate === today) {
    // If today but no timestamp, we give benefit of doubt or fallback
    return 0;
  }
  return 0;
}

export function isReportEditable(report: MenteeReport): boolean {
  if (!report) return false;
  const today = format(new Date(), "yyyy-MM-dd");
  // Past dates can never be edited
  if (report.reportDate !== today) return false;

  const createdMs = getReportCreatedAtMs(report);
  if (!createdMs) {
    // If no created timestamp recorded, allow only if today
    return true;
  }

  return Date.now() - createdMs <= FIFTEEN_MINUTES_MS;
}

export function getRemainingEditMinutes(report: MenteeReport): number {
  const createdMs = getReportCreatedAtMs(report);
  if (!createdMs) return 0;
  const remainingMs = FIFTEEN_MINUTES_MS - (Date.now() - createdMs);
  return Math.max(0, Math.ceil(remainingMs / 60000));
}
