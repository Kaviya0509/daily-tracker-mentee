import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
  limit,
  startAfter,
  type DocumentSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import type { MenteeReport } from "../types";
import type { ReportFormData } from "../schemas/reportSchema";

const COLLECTION = "menteeReports";

// Deterministic document ID: {menteeUid}_{YYYY-MM-DD}
const getReportId = (menteeUid: string, reportDate: string) =>
  `${menteeUid}_${reportDate}`;

const SYNC_API = "http://localhost:5050/api/reports";

async function syncToBridge(method: string, url: string, payload?: any) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: payload ? JSON.stringify(payload) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timer);
  } catch {
    // Bridge sync is best-effort fallback
  }
}

export const checkReportExists = async (
  menteeUid: string,
  reportDate: string
): Promise<MenteeReport | null> => {
  try {
    const reportId = getReportId(menteeUid, reportDate);
    const docRef = doc(db, COLLECTION, reportId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { ...docSnap.data(), reportId } as MenteeReport;
    }
  } catch {
    // Fall back to checking bridge
  }

  try {
    const res = await fetch(SYNC_API);
    if (res.ok) {
      const reports = (await res.json()) as MenteeReport[];
      const found = reports.find(
        (r) => r.menteeUid === menteeUid && r.reportDate === reportDate
      );
      if (found) return found;
    }
  } catch {
    // ignore
  }

  return null;
};

export const createReport = async (
  menteeUid: string,
  menteeName: string,
  data: ReportFormData
): Promise<string> => {
  const reportId = getReportId(menteeUid, data.reportDate);
  const docRef = doc(db, COLLECTION, reportId);

  const reportPayload = {
    reportId,
    menteeUid,
    menteeName,
    reportDate: data.reportDate,
    currentTask: data.currentTask,
    status: data.status,
    shortDescription: data.shortDescription,
    managerLead: data.managerLead,
    blockerDependency: data.blockerDependency || "",
    idleReasonWorkNeeded: data.idleReasonWorkNeeded || "",
    expectedCompletion: data.expectedCompletion || null,
    notes: data.notes || "",
  };

  // 1. Save to Cloud Firestore
  try {
    await setDoc(docRef, {
      ...reportPayload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Firestore write warning:", err);
  }

  // 2. Sync to live bridge for immediate reflection across portals
  await syncToBridge("POST", SYNC_API, {
    ...reportPayload,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return reportId;
};

export const updateReport = async (
  reportId: string,
  data: Partial<ReportFormData>
): Promise<void> => {
  const docRef = doc(db, COLLECTION, reportId);

  try {
    await updateDoc(docRef, {
      ...data,
      expectedCompletion: data.expectedCompletion || null,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Firestore update warning:", err);
  }

  // Sync update to bridge
  await syncToBridge(
    "PUT",
    `${SYNC_API}/${encodeURIComponent(reportId)}`,
    data
  );
};

export const getMyReports = async (
  menteeUid: string,
  pageSize: number = 10,
  lastDoc?: DocumentSnapshot
): Promise<{ reports: MenteeReport[]; lastVisible: DocumentSnapshot | null }> => {
  let firestoreReports: MenteeReport[] = [];
  let lastVisible: DocumentSnapshot | null = null;

  try {
    let q = query(
      collection(db, COLLECTION),
      where("menteeUid", "==", menteeUid),
      orderBy("reportDate", "desc"),
      limit(pageSize)
    );

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const snapshot = await getDocs(q);
    firestoreReports = snapshot.docs.map(
      (d) => ({ ...d.data(), reportId: d.id } as MenteeReport)
    );
    lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;
  } catch {
    // Firestore might be restricted or offline
  }

  // Also query sync bridge
  let bridgeReports: MenteeReport[] = [];
  try {
    const res = await fetch(SYNC_API);
    if (res.ok) {
      const all = (await res.json()) as MenteeReport[];
      bridgeReports = all.filter((r) => r.menteeUid === menteeUid);
    }
  } catch {
    // ignore
  }

  // Merge reports without duplicates
  const seen = new Set<string>();
  const combined: MenteeReport[] = [];

  for (const r of [...firestoreReports, ...bridgeReports]) {
    if (!seen.has(r.reportId)) {
      seen.add(r.reportId);
      combined.push(r);
    }
  }

  combined.sort((a, b) => b.reportDate.localeCompare(a.reportDate));

  return { reports: combined.slice(0, pageSize), lastVisible };
};

export const getReportById = async (
  reportId: string
): Promise<MenteeReport | null> => {
  try {
    const docRef = doc(db, COLLECTION, reportId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { ...docSnap.data(), reportId: docSnap.id } as MenteeReport;
    }
  } catch {
    // ignore
  }

  try {
    const res = await fetch(SYNC_API);
    if (res.ok) {
      const all = (await res.json()) as MenteeReport[];
      const found = all.find((r) => r.reportId === reportId);
      if (found) return found;
    }
  } catch {
    // ignore
  }

  return null;
};
