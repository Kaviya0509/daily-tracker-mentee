import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import type { DocumentSnapshot } from "firebase/firestore";
import { toast } from "sonner";
import {
  LogOut,
  Pencil,
  Loader2,
  FileText,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Activity,
  ArrowRight,
  Copy,
  Check,
  AlertCircle,
  PlayCircle,
  Home,
  Bell,
  RotateCcw,
  MinusCircle,
  PauseCircle,
  User,
  Eye,
  X,
  Send,
  Lock,
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import { signOut } from "../services/authService";
import {
  checkReportExists,
  createReport,
  updateReport,
  getMyReports,
} from "../services/reportService";
import { reportSchema, type ReportFormData } from "../schemas/reportSchema";
import type { MenteeReport, ReportStatus } from "../types";
import { isReportEditable } from "../lib/reportUtils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";

const STATUS_OPTIONS: {
  value: ReportStatus;
  label: string;
  subtitle: string;
  icon: React.ElementType;
  activeColor: string;
  hoverColor: string;
  iconColor: string;
}[] = [
    {
      value: "Not Started",
      label: "Not Started",
      subtitle: "Yet to begin this task",
      icon: MinusCircle,
      activeColor: "bg-slate-800 text-white border-slate-800 shadow-md",
      hoverColor: "hover:bg-slate-100 text-slate-700 hover:border-slate-300",
      iconColor: "text-slate-400",
    },
    {
      value: "In Progress",
      label: "In Progress",
      subtitle: "Currently working on it",
      icon: PlayCircle,
      activeColor: "bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-500/25 ring-2 ring-sky-500/20",
      hoverColor: "hover:bg-sky-50 text-slate-700 hover:text-sky-700 hover:border-sky-200",
      iconColor: "text-sky-500",
    },
    {
      value: "Blocked",
      label: "Blocked",
      subtitle: "Facing blockers or issues",
      icon: AlertTriangle,
      activeColor: "bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/25 ring-2 ring-rose-500/20",
      hoverColor: "hover:bg-rose-50 text-slate-700 hover:text-rose-700 hover:border-rose-200",
      iconColor: "text-rose-500",
    },
    {
      value: "Completed",
      label: "Completed",
      subtitle: "Task completed",
      icon: CheckCircle2,
      activeColor: "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/25 ring-2 ring-emerald-500/20",
      hoverColor: "hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 hover:border-emerald-200",
      iconColor: "text-emerald-500",
    },
    {
      value: "On Hold",
      label: "On Hold",
      subtitle: "Paused temporarily",
      icon: PauseCircle,
      activeColor: "bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-500/25 ring-2 ring-sky-500/20",
      hoverColor: "hover:bg-sky-50 text-slate-700 hover:text-sky-700 hover:border-sky-200",
      iconColor: "text-sky-500",
    },
  ];

function renderStatusBadge(status: ReportStatus) {
  switch (status) {
    case "Completed":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
          Completed
        </span>
      );
    case "In Progress":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200/80 shadow-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-500 shrink-0" />
          In Progress
        </span>
      );
    case "Blocked":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-xs animate-pulse">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
          Blocked
        </span>
      );
    case "On Hold":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200/80 shadow-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-500 shrink-0" />
          On Hold
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 shadow-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
          {status}
        </span>
      );
  }
}

const NAV_ITEMS = [
  { label: "Daily Status", subtitle: "Submit today's update", icon: Home, path: "/form" },
  { label: "My Reports", subtitle: "View & edit past reports", icon: Calendar, path: "/my-reports" },
  // { label: "My Progress", subtitle: "Track your journey", icon: BarChart3, path: "/progress" },
  // { label: "Settings", subtitle: "Profile & preferences", icon: Settings, path: "/settings" },
];

export default function DailyStatusFormPage() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [editingReport, setEditingReport] = useState<MenteeReport | null>(null);
  const [duplicateReport, setDuplicateReport] = useState<MenteeReport | null>(null);
  const [previewReport, setPreviewReport] = useState<MenteeReport | null>(null);
  const [reports, setReports] = useState<MenteeReport[]>([]);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);

  const menteeName =
    profile?.displayName || user?.displayName || "Mentee";

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema) as any,
    defaultValues: {
      reportDate: format(new Date(), "yyyy-MM-dd"),
      currentTask: "",
      status: undefined as unknown as ReportFormData["status"],
      shortDescription: "",
      managerLead: "",
      blockerDependency: "",
      idleReasonWorkNeeded: "",
      expectedCompletion: "",
      notes: "",
    },
  });

  const reportDate = watch("reportDate");
  const selectedStatus = watch("status");
  const currentTaskVal = watch("currentTask");
  const shortDescriptionVal = watch("shortDescription");

  useEffect(() => {
    const state = location.state as { editReport?: MenteeReport } | null;
    if (state?.editReport) {
      handleEdit(state.editReport);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!reportDate || !user?.uid || editingReport) return;

    let cancelled = false;
    const check = async () => {
      try {
        const existing = await checkReportExists(user.uid, reportDate);
        if (!cancelled) {
          setDuplicateReport(existing);
        }
      } catch {
        // ignore
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [reportDate, user?.uid, editingReport]);

  const loadReports = useCallback(
    async (initial = false) => {
      if (!user?.uid) return;
      setLoadingReports(true);
      try {
        const result = await getMyReports(
          user.uid,
          10,
          initial ? undefined : lastDoc ?? undefined
        );
        if (initial) {
          setReports(result.reports);
        } else {
          setReports((prev) => [...prev, ...result.reports]);
        }
        setLastDoc(result.lastVisible);
        setHasMore(result.reports.length === 10);
      } catch {
        toast.error("Failed to load reports");
      } finally {
        setLoadingReports(false);
      }
    },
    [user?.uid, lastDoc]
  );

  useEffect(() => {
    loadReports(true);
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (data: ReportFormData) => {
    if (!user?.uid) return;
    const today = format(new Date(), "yyyy-MM-dd");
    if (!editingReport && data.reportDate !== today) {
      toast.error("Daily status reports can only be submitted for today's date.");
      return;
    }
    if (data.expectedCompletion && data.expectedCompletion < today) {
      toast.error("Expected completion date must be today or a future date.");
      return;
    }
    setSubmitting(true);
    try {
      if (editingReport) {
        await updateReport(editingReport.reportId, data);
        toast.success("Report updated successfully!");
        setEditingReport(null);
      } else {
        await createReport(user.uid, menteeName, data);
        toast.success("Daily report submitted successfully!");
      }
      reset({
        reportDate: format(new Date(), "yyyy-MM-dd"),
        currentTask: "",
        status: undefined as unknown as ReportFormData["status"],
        shortDescription: "",
        managerLead: data.managerLead || "",
        blockerDependency: "",
        idleReasonWorkNeeded: "",
        expectedCompletion: "",
        notes: "",
      });
      setDuplicateReport(null);
      loadReports(true);
    } catch (err: unknown) {
      console.error("Report submit error:", err);
      if (err instanceof Error && err.message === "DUPLICATE_REPORT") {
        toast.error("A report already exists for this date.");
        const existing = await checkReportExists(user.uid, data.reportDate);
        setDuplicateReport(existing);
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(`Failed to save report: ${msg}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (report: MenteeReport) => {
    if (!isReportEditable(report)) {
      toast.error("Editing window has expired. Submissions can only be edited within 15 minutes of submission.");
      return;
    }
    setEditingReport(report);
    setDuplicateReport(null);
    setValue("reportDate", report.reportDate);
    setValue("currentTask", report.currentTask);
    setValue("status", report.status);
    setValue("shortDescription", report.shortDescription);
    setValue("managerLead", report.managerLead);
    setValue("blockerDependency", report.blockerDependency || "");
    setValue("idleReasonWorkNeeded", report.idleReasonWorkNeeded || "");
    setValue("expectedCompletion", report.expectedCompletion || "");
    setValue("notes", report.notes || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingReport(null);
    reset({
      reportDate: format(new Date(), "yyyy-MM-dd"),
      currentTask: "",
      status: undefined,
      shortDescription: "",
      managerLead: "",
      blockerDependency: "",
      idleReasonWorkNeeded: "",
      expectedCompletion: "",
      notes: "",
    });
  };

  const handleEditDuplicate = () => {
    if (duplicateReport) {
      handleEdit(duplicateReport);
    }
  };

  const handleReset = () => {
    reset({
      reportDate: format(new Date(), "yyyy-MM-dd"),
      currentTask: "",
      status: undefined as unknown as ReportFormData["status"],
      shortDescription: "",
      managerLead: "",
      blockerDependency: "",
      idleReasonWorkNeeded: "",
      expectedCompletion: "",
      notes: "",
    });
    setEditingReport(null);
    setDuplicateReport(null);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      toast.error("Failed to sign out");
    }
  };

  const latestReport = reports[0];

  const handleCopyYesterday = () => {
    if (latestReport) {
      setValue("currentTask", latestReport.currentTask);
      if (latestReport.managerLead) {
        setValue("managerLead", latestReport.managerLead);
      }
      toast.info("Copied previous task and manager into today's form.");
    }
  };

  const initials = menteeName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#F5FAFE] text-[#25344A] font-sans antialiased flex flex-col lg:flex-row">
      {/* Left Sidebar */}
      <aside className="hidden lg:flex w-60 bg-[#E6F1FA] border-r border-[#D5E5F2] flex-col min-h-screen sticky top-0 shrink-0">
        {/* Brand / Logo */}
        <div className="px-6 py-5 border-b border-[#D5E5F2]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-linear-to-br from-[#0284C7] to-[#0369A1] flex items-center justify-center shadow-sm shrink-0">
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="2.5" fill="currentColor" />
                <circle cx="6" cy="12" r="2.5" fill="currentColor" />
                <circle cx="18" cy="19" r="2.5" fill="currentColor" />
                <line x1="8.5" y1="10.8" x2="15.5" y2="6.2" strokeWidth="2.2" />
                <line x1="8.5" y1="13.2" x2="15.5" y2="17.8" strokeWidth="2.2" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-[#25344A] tracking-tight">Mentee</span>
                <span className="text-[10px] font-bold text-[#0284C7] border border-[#0284C7] px-2 py-0.5 rounded-full tracking-wider uppercase">
                  TRACKER
                </span>
              </div>
              <p className="text-[11px] text-[#66758A] font-medium">Daily Status & Standup</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-5 space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => {
                  if (item.path === "/progress" || item.path === "/settings") {
                    toast.info(`${item.label} section coming soon!`);
                  } else {
                    navigate(item.path);
                  }
                }}
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-left transition-all cursor-pointer ${isActive
                    ? "bg-[#FFFFFF] border border-[#D5E5F2] text-[#0284C7] shadow-xs"
                    : "text-[#25344A] hover:bg-[#EEF6FC] hover:text-[#25344A] border border-transparent"
                  }`}
              >
                <item.icon
                  className={`h-5 w-5 shrink-0 ${isActive ? "text-[#0284C7]" : "text-[#66758A]"
                    }`}
                />
                <div className="min-w-0">
                  <p
                    className={`text-xs font-bold leading-tight ${isActive ? "text-[#0284C7]" : "text-[#25344A]"
                      }`}
                  >
                    {item.label}
                  </p>
                  <p className="text-[11px] text-[#66758A] mt-0.5 truncate">
                    {item.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Bottom Tip Card */}
        <div className="p-4">
          <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#D5E5F2] shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-[#EEF6FC] flex items-center justify-center shrink-0">
                <Lightbulb className="h-3.5 w-3.5 text-[#0284C7]" />
              </div>
              <span className="text-xs font-bold text-[#25344A]">Stay consistent!</span>
            </div>
            <p className="text-[11px] text-[#66758A] leading-relaxed font-normal">
              Daily updates help your mentors track your growth and unblock issues faster.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 min-h-screen flex flex-col">
        {/* Top Header Bar */}
        <header className="bg-transparent border-b border-[#D5E5F2] sticky top-0 z-30 backdrop-blur-xs">
          <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
            {/* Mobile logo */}
            <div className="flex lg:hidden items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-linear-to-tr from-[#0284C7] to-[#0369A1] p-0.5 shadow-md shadow-sky-500/20 flex items-center justify-center">
                <div className="h-full w-full bg-slate-900/10 backdrop-blur-xs rounded-[9px] flex items-center justify-center">
                  <Activity className="h-4 w-4 text-white" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-[#25344A]">Mentee</span>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[#0284C7] bg-[#FFFFFF] px-1.5 py-0.5 rounded border border-[#D5E5F2]">
                    Tracker
                  </span>
                </div>
              </div>
            </div>

            <div className="hidden lg:block" />

            <div className="flex items-center gap-4">
              {/* Notification Bell */}
              <button
                onClick={() => toast.info("No unread mentor announcements.")}
                className="relative p-2 rounded-xl text-[#25344A] hover:text-[#25344A] hover:bg-black/5 transition-colors cursor-pointer"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-[#C84B50] text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                  1
                </span>
              </button>

              {/* User Profile Pill */}
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-[#0284C7] text-white font-bold text-sm flex items-center justify-center shadow-xs">
                  {initials}
                </div>
                <span className="font-semibold text-xs sm:text-sm text-[#25344A] hidden sm:inline">
                  {menteeName}
                </span>
                <button
                  onClick={handleSignOut}
                  title="Sign out"
                  className="p-1.5 text-[#66758A] hover:text-[#C84B50] hover:bg-rose-50 rounded-lg transition-colors ml-1 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Nav */}
        <div className="lg:hidden flex items-center gap-1 px-4 py-2 bg-[#E6F1FA] border-b border-[#D5E5F2] overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${isActive
                  ? "bg-[#FFFFFF] text-[#0284C7] border border-[#D5E5F2]"
                  : "text-[#25344A] hover:text-[#25344A] hover:bg-[#EEF6FC] border border-transparent"
                  }`}
              >
                <item.icon className={`h-3.5 w-3.5 ${isActive ? "text-[#0284C7]" : "text-[#66758A]"}`} />
                {item.label}
              </button>
            );
          })}
        </div>

        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 sm:py-8 space-y-6 w-full">
          {/* Welcome Hero Banner - Soft brand orange gradient */}
          <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-[#0284C7] via-[#0391D6] to-[#0369A1] text-white p-6 sm:p-7 shadow-lg">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none opacity-20">
              <svg viewBox="0 0 200 200" className="w-full h-full">
                <circle cx="160" cy="40" r="30" fill="white" opacity="0.3" />
                <circle cx="130" cy="80" r="15" fill="white" opacity="0.2" />
                <circle cx="180" cy="90" r="10" fill="white" opacity="0.25" />
                <path d="M120 20 L140 50 L160 30 Z" fill="white" opacity="0.15" />
                <path d="M150 60 Q170 40 190 70 Q170 90 150 60" fill="white" opacity="0.2" />
                <circle cx="140" cy="120" r="8" fill="white" opacity="0.15" />
                <path d="M100 50 L110 70 L130 60 Z" fill="white" opacity="0.1" />
              </svg>
            </div>
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute top-4 right-8 w-2 h-2 bg-white/40 rounded-full pointer-events-none" />
            <div className="absolute top-12 right-24 w-1.5 h-1.5 bg-white/30 rounded-full pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/20 text-white text-xs font-medium">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{format(new Date(), "EEEE, MMMM d, yyyy")}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {editingReport
                    ? `Editing Report for ${editingReport.reportDate}`
                    : <>Good day, <span className="text-sky-100">{menteeName}</span></>}
                </h2>
                <p className="text-xs sm:text-sm text-sky-100 max-w-lg leading-relaxed">
                  {editingReport
                    ? "Make updates to your deliverables, blockers, or timeline below."
                    : "Keep your mentors and leads updated with your daily progress, accomplishments, and roadblocks."}
                </p>
              </div>

              {!editingReport && latestReport && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyYesterday}
                  className="self-start sm:self-center bg-white/15 border-white/30 text-white hover:text-white hover:bg-white/25 text-xs rounded-xl shrink-0 cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Copy Yesterday's Task
                </Button>
              )}
            </div>
          </div>

          {/* Duplicate report warning notice */}
          {duplicateReport && !editingReport && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#FFFFFF] border border-[#D5E5F2] text-[#25344A] shadow-xs">
              <AlertCircle className="h-5 w-5 text-[#0284C7] shrink-0 mt-0.5" />
              <div className="text-xs space-y-1 flex-1">
                <p className="font-bold text-[#25344A]">
                  A daily status report has already been logged for {duplicateReport.reportDate}
                </p>
                <p className="text-[#66758A]">
                  Task recorded: <span className="font-semibold text-[#25344A]">"{duplicateReport.currentTask}"</span>.
                  Would you like to modify this existing entry?
                </p>
              </div>
              {isReportEditable(duplicateReport) ? (
                <Button
                  size="sm"
                  onClick={handleEditDuplicate}
                  className="bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-semibold rounded-xl shrink-0 cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  Edit Today's Entry
                </Button>
              ) : (
                <span className="text-xs font-semibold text-[#66758A] bg-[#EEF6FC] px-3 py-1.5 rounded-xl border border-[#D5E5F2] shrink-0 inline-flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-[#66758A]" />
                  Edit window expired (15m limit)
                </span>
              )}
            </div>
          )}

          {/* Main Status Submission Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Section 1: Work Deliverables */}
            <Card className="border border-[#D5E5F2] rounded-2xl shadow-xs bg-[#FFFFFF] overflow-hidden">
              <CardHeader className="bg-[#FFFFFF] border-b border-[#D5E5F2] pb-3.5">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-[#0284C7] text-white font-bold text-sm flex items-center justify-center shadow-sm">
                    1
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-[#25344A]">
                      Deliverables & Task Overview
                    </CardTitle>
                    <CardDescription className="text-xs text-[#66758A]">
                      What project or user story are you focusing on today?
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Report Date */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="reportDate" className="text-xs font-semibold text-[#25344A]">
                        Report Date <span className="text-[#C84B50]">*</span>
                      </Label>
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#0284C7] font-semibold bg-[#EEF6FC] px-2 py-0.5 rounded-md border border-[#D5E5F2]">
                        <Calendar className="h-3 w-3 text-[#0284C7]" />
                        Today only
                      </span>
                    </div>
                    <DateInput
                      id="reportDate"
                      min={format(new Date(), "yyyy-MM-dd")}
                      max={format(new Date(), "yyyy-MM-dd")}
                      disabled={!!editingReport}
                      readOnly={!editingReport}
                      className="h-10 rounded-xl text-xs bg-[#EEF6FC] border-[#D5E5F2] text-[#25344A]"
                      {...register("reportDate")}
                    />
                    <p className="text-[11px] text-[#66758A]">
                      Submissions are strictly permitted for today's date only ({format(new Date(), "yyyy-MM-dd")}).
                    </p>
                    {errors.reportDate && (
                      <p className="text-xs text-[#C84B50]">{errors.reportDate.message}</p>
                    )}
                  </div>

                  {/* Mentee Name (read-only) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#25344A]">Reporting Mentee</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#66758A]" />
                      <Input
                        value={menteeName}
                        disabled
                        className="h-10 rounded-xl bg-[#EEF6FC] border-[#D5E5F2] text-[#25344A] text-xs font-medium cursor-not-allowed pl-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Current Task */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="currentTask" className="text-xs font-semibold text-[#25344A]">
                      Current Task / Ticket Title <span className="text-[#C84B50]">*</span>
                    </Label>
                    <span className="text-[10px] text-[#66758A]">
                      {currentTaskVal?.length || 0}/200
                    </span>
                  </div>
                  <Input
                    id="currentTask"
                    placeholder="e.g. Implement user authentication workflow with Firebase and tests"
                    maxLength={200}
                    className="h-10 rounded-xl text-xs font-medium border-[#D5E5F2] bg-[#EEF6FC] text-[#25344A] focus-visible:ring-[#0284C7]"
                    {...register("currentTask")}
                  />
                  {errors.currentTask && (
                    <p className="text-xs text-[#C84B50]">{errors.currentTask.message}</p>
                  )}
                </div>

                {/* Short Description */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="shortDescription" className="text-xs font-semibold text-[#25344A]">
                      Detailed Work Description <span className="text-[#C84B50]">*</span>
                    </Label>
                    <span className="text-[10px] text-[#66758A]">
                      {shortDescriptionVal?.length || 0}/2000
                    </span>
                  </div>
                  <Textarea
                    id="shortDescription"
                    placeholder="Summarize key accomplishments, code changes, PR reviews, or research conducted today..."
                    rows={4}
                    maxLength={2000}
                    className="rounded-xl text-xs border-[#D5E5F2] bg-[#EEF6FC] text-[#25344A] focus-visible:ring-[#0284C7] leading-relaxed"
                    {...register("shortDescription")}
                  />
                  {errors.shortDescription && (
                    <p className="text-xs text-[#C84B50]">{errors.shortDescription.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Progress & Blockers */}
            <Card className="border border-[#D5E5F2] rounded-2xl shadow-xs bg-[#FFFFFF] overflow-hidden">
              <CardHeader className="bg-[#FFFFFF] border-b border-[#D5E5F2] pb-3.5">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-[#0284C7] text-white font-bold text-sm flex items-center justify-center shadow-sm">
                    2
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-[#25344A]">
                      Status & Impediments
                    </CardTitle>
                    <CardDescription className="text-xs text-[#66758A]">
                      Indicate your current velocity and flag blockers immediately.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-5">
                {/* Visual Status Buttons */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-[#25344A] block">
                    Select Current Status <span className="text-[#C84B50]">*</span>
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {STATUS_OPTIONS.map((opt) => {
                      const isSelected = selectedStatus === opt.value;
                      const Icon = opt.icon;
                      return (
                        <button
                          type="button"
                          key={opt.value}
                          onClick={() => setValue("status", opt.value, { shouldValidate: true })}
                          className={`relative p-3 rounded-xl border border-[#D5E5F2] text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                            isSelected ? opt.activeColor : `${opt.hoverColor} bg-[#EEF6FC]`
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5">
                              <Check className="h-3.5 w-3.5" />
                            </div>
                          )}
                          <Icon className={`h-5 w-5 ${isSelected ? "" : opt.iconColor}`} />
                          <span className="text-[11px] font-bold">{opt.label}</span>
                          <span className={`text-[9px] font-normal ${isSelected ? "opacity-80" : "text-[#66758A]"}`}>
                            {opt.subtitle}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {errors.status && (
                    <p className="text-xs text-[#C84B50] mt-1">{errors.status.message}</p>
                  )}
                </div>

                {/* Blocker and Idle side by side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Blocker / Dependency */}
                  <div className="space-y-1.5">
                    <Label htmlFor="blockerDependency" className="text-xs font-semibold text-[#25344A]">
                      Blocker / Dependency Details{" "}
                      {selectedStatus === "Blocked" ? (
                        <span className="text-[#C84B50] font-normal">(required)</span>
                      ) : (
                        <span className="text-[#66758A] font-normal">(optional)</span>
                      )}
                    </Label>
                    <Textarea
                      id="blockerDependency"
                      placeholder="Describe any external dependencies or potential delays..."
                      rows={3}
                      maxLength={2000}
                      className={`rounded-xl text-xs ${selectedStatus === "Blocked"
                        ? "border-[#C84B50] focus-visible:ring-[#C84B50] bg-[#C84B50]/10 text-[#C84B50]"
                        : "border-[#D5E5F2] bg-[#EEF6FC] text-[#25344A]"
                        }`}
                      {...register("blockerDependency")}
                    />
                    {errors.blockerDependency && (
                      <p className="text-xs text-[#C84B50] mt-1">{errors.blockerDependency.message}</p>
                    )}
                  </div>

                  {/* Idle Reason / Work Needed */}
                  <div className="space-y-1.5">
                    <Label htmlFor="idleReasonWorkNeeded" className="text-xs font-semibold text-[#25344A]">
                      Idle Reason / Additional Work Needed{" "}
                      <span className="text-[#66758A] font-normal">(optional)</span>
                    </Label>
                    <Textarea
                      id="idleReasonWorkNeeded"
                      placeholder="Need assistance with next task assignment or waiting for code review..."
                      rows={3}
                      maxLength={2000}
                      className="rounded-xl text-xs border-[#D5E5F2] bg-[#EEF6FC] text-[#25344A]"
                      {...register("idleReasonWorkNeeded")}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 3: Collaboration & Timeline */}
            <Card className="border border-[#D5E5F2] rounded-2xl shadow-xs bg-[#FFFFFF] overflow-hidden">
              <CardHeader className="bg-[#FFFFFF] border-b border-[#D5E5F2] pb-3.5">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-[#0284C7] text-white font-bold text-sm flex items-center justify-center shadow-sm">
                    3
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-[#25344A]">
                      Stakeholders & Planning
                    </CardTitle>
                    <CardDescription className="text-xs text-[#66758A]">
                      Reporting timeline and expected target milestones.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Manager / Lead */}
                  <div className="space-y-1.5">
                    <Label htmlFor="managerLead" className="text-xs font-semibold text-[#25344A]">
                      Manager / Lead <span className="text-[#C84B50]">*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#66758A]" />
                      <Input
                        id="managerLead"
                        placeholder="e.g. John Doe (Tech Lead)"
                        maxLength={100}
                        className="h-10 rounded-xl text-xs border-[#D5E5F2] bg-[#EEF6FC] text-[#25344A] pl-9"
                        {...register("managerLead")}
                      />
                    </div>
                    {errors.managerLead && (
                      <p className="text-xs text-[#C84B50]">{errors.managerLead.message}</p>
                    )}
                  </div>

                  {/* Expected Completion Date */}
                  <div className="space-y-1.5">
                    <Label htmlFor="expectedCompletion" className="text-xs font-semibold text-[#25344A]">
                      Expected Completion Date{" "}
                      <span className="text-[#66758A] font-normal">(optional - future dates only)</span>
                    </Label>
                    <DateInput
                      id="expectedCompletion"
                      min={format(new Date(), "yyyy-MM-dd")}
                      className="h-10 rounded-xl text-xs bg-[#EEF6FC] border-[#D5E5F2] text-[#25344A]"
                      {...register("expectedCompletion")}
                    />
                    <p className="text-[11px] text-[#66758A]">
                      Choose today or any future target completion date.
                    </p>
                    {errors.expectedCompletion && (
                      <p className="text-xs text-[#C84B50]">{errors.expectedCompletion.message}</p>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-xs font-semibold text-[#25344A]">
                    Additional Notes{" "}
                    <span className="text-[#66758A] font-normal">(optional)</span>
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Any extra context or links to PRs / Jira tickets..."
                    rows={2}
                    maxLength={2000}
                    className="rounded-xl text-xs border-[#D5E5F2] bg-[#EEF6FC] text-[#25344A]"
                    {...register("notes")}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submission Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              {editingReport ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                    className="rounded-xl text-xs border-[#D5E5F2] bg-[#FFFFFF] text-[#25344A] hover:bg-[#EEF6FC]"
                  >
                    Cancel Edit
                  </Button>
                  <Button
                    type="submit"
                    className="h-11 px-6 bg-linear-to-r from-[#0284C7] to-[#0369A1] hover:from-[#0369A1] hover:to-[#075985] text-white font-semibold rounded-xl text-xs shadow-md shadow-sky-500/20 border-0 cursor-pointer"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving Updates...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        Update Report
                      </span>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    className="h-11 px-5 rounded-xl text-xs font-semibold border-[#D5E5F2] bg-[#FFFFFF] text-[#25344A] hover:bg-[#EEF6FC] cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    Reset
                  </Button>
                  <Button
                    type="submit"
                    className="h-11 px-8 bg-linear-to-r from-[#0284C7] to-[#0369A1] hover:from-[#0369A1] hover:to-[#075985] text-white font-bold rounded-xl text-xs shadow-md shadow-sky-500/20 border-0 transition-transform active:scale-95 cursor-pointer"
                    disabled={submitting || !!duplicateReport}
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting Daily Report...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        Submit Daily Status
                      </span>
                    )}
                  </Button>
                </>
              )}
            </div>
          </form>

          {/* Recent Submissions Section */}
          <div className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#25344A]">Your Recent Submissions</h3>
                <p className="text-xs text-[#66758A]">Last 10 daily entries submitted by you</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/my-reports")}
                className="text-xs rounded-xl border-[#D5E5F2] bg-[#FFFFFF] text-[#25344A] hover:bg-[#EEF6FC] cursor-pointer"
              >
                View Full History
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </div>

            {reports.length === 0 && !loadingReports ? (
              <Card className="rounded-2xl border border-[#D5E5F2] bg-[#FFFFFF]">
                <CardContent className="py-12 text-center space-y-2">
                  <div className="h-12 w-12 rounded-2xl bg-[#EEF6FC] text-[#0284C7] mx-auto flex items-center justify-center">
                    <FileText className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold text-[#25344A]">No Past Reports Yet</h4>
                  <p className="text-xs text-[#66758A] max-w-sm mx-auto">
                    Your submitted daily status updates will be logged here with timestamps and audit trail.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="bg-[#FFFFFF] rounded-2xl border border-[#D5E5F2] shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#EEF6FC] text-[#66758A] border-b border-[#D5E5F2] uppercase tracking-wider text-[11px] font-bold">
                      <tr>
                        <th className="py-3.5 px-4 whitespace-nowrap">Date</th>
                        <th className="py-3.5 px-4">Task & Description</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Status</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Lead</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Target Date</th>
                        <th className="py-3.5 px-4">Blocker</th>
                        <th className="py-3.5 px-4 text-right whitespace-nowrap">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D5E5F2]/60">
                      {reports.map((report, idx) => (
                        <tr
                          key={report.reportId}
                          className={`hover:bg-[#EEF6FC]/60 transition-colors ${idx % 2 === 0 ? "bg-[#FFFFFF]" : "bg-[#EEF6FC]/30"
                            }`}
                        >
                          <td className="py-3 px-4 font-semibold text-[#25344A] whitespace-nowrap">
                            {report.reportDate}
                          </td>
                          <td className="py-3 px-4 max-w-64">
                            <div className="font-bold text-[#25344A] truncate">
                              {report.currentTask}
                            </div>
                            {report.shortDescription && (
                              <div className="text-[11px] text-[#66758A] truncate mt-0.5">
                                {report.shortDescription}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {renderStatusBadge(report.status)}
                          </td>
                          <td className="py-3 px-4 text-[#25344A] whitespace-nowrap font-medium">
                            {report.managerLead || "—"}
                          </td>
                          <td className="py-3 px-4 text-[#25344A] whitespace-nowrap font-medium">
                            {report.expectedCompletion || "—"}
                          </td>
                          <td className="py-3 px-4 text-[#25344A] max-w-40 truncate">
                            {report.blockerDependency && report.blockerDependency !== "None" ? (
                              <span className="text-[#C84B50] font-medium">
                                {report.blockerDependency}
                              </span>
                            ) : (
                              <span className="text-[#66758A]">None</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setPreviewReport(report)}
                                className="h-7 px-2.5 text-xs text-[#25344A] hover:text-[#0284C7] hover:bg-[#EEF6FC] bg-[#FFFFFF] rounded-lg inline-flex items-center gap-1 border border-[#D5E5F2] transition-colors cursor-pointer"
                              >
                                <Eye className="h-3 w-3" />
                                View
                              </button>
                              {isReportEditable(report) ? (
                                <button
                                  type="button"
                                  onClick={() => handleEdit(report)}
                                  className="h-7 px-2.5 text-xs text-[#0284C7] hover:text-[#0369A1] hover:bg-[#EEF6FC] bg-[#FFFFFF] rounded-lg inline-flex items-center gap-1 border border-[#D5E5F2] font-semibold transition-colors cursor-pointer"
                                >
                                  <Pencil className="h-3 w-3" />
                                  Edit
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled
                                  title="Editing is locked after 15 minutes of submission"
                                  className="h-7 px-2.5 text-xs text-[#66758A]/50 bg-[#EEF6FC]/60 rounded-lg inline-flex items-center gap-1 border border-[#D5E5F2]/50 cursor-not-allowed"
                                >
                                  <Lock className="h-3 w-3" />
                                  Edit
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {hasMore && (
                  <div className="p-3 border-t border-slate-100 text-center bg-slate-50/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => loadReports(false)}
                      disabled={loadingReports}
                      className="text-xs text-sky-600 hover:text-sky-700 hover:bg-sky-50 font-semibold cursor-pointer"
                    >
                      {loadingReports ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : null}
                      Load Earlier Reports
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Detail View Modal for Recent Submissions */}
      {previewReport && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-[#FFFFFF] rounded-3xl max-w-2xl w-full border border-[#D5E5F2] shadow-2xl max-h-[92vh] overflow-y-auto animate-in zoom-in-95">
            {/* Header */}
            <div className="bg-linear-to-r from-[#0284C7] to-[#0369A1] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Daily Report Details</h3>
                  <p className="text-[11px] text-sky-100">
                    Report Date: {previewReport.reportDate}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewReport(null)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto font-sans">
              <div>
                <p className="text-[11px] font-bold text-[#66758A] uppercase tracking-wider">
                  Task / Ticket Title
                </p>
                <h4 className="text-base font-extrabold text-[#25344A] mt-1">
                  {previewReport.currentTask}
                </h4>
              </div>

              {/* Core Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-[#EEF6FC] rounded-2xl border border-[#D5E5F2] text-xs">
                <div>
                  <span className="text-[10px] font-bold text-[#66758A] uppercase tracking-wider block">
                    Status
                  </span>
                  <div className="mt-1">{renderStatusBadge(previewReport.status)}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#66758A] uppercase tracking-wider block">
                    Reporting Lead
                  </span>
                  <p className="text-xs font-semibold text-[#25344A] mt-1">
                    {previewReport.managerLead || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#66758A] uppercase tracking-wider block">
                    Report Date
                  </span>
                  <p className="text-xs font-semibold text-[#25344A] mt-1">
                    {previewReport.reportDate}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#66758A] uppercase tracking-wider block">
                    Target Completion
                  </span>
                  <p className="text-xs font-semibold text-[#25344A] mt-1">
                    {previewReport.expectedCompletion || "—"}
                  </p>
                </div>
              </div>

              {/* Detailed Work Description */}
              <div>
                <p className="text-[11px] font-bold text-[#66758A] uppercase tracking-wider">
                  Detailed Work Description
                </p>
                <p className="text-xs text-[#25344A] mt-1.5 leading-relaxed bg-[#EEF6FC] p-3.5 rounded-xl border border-[#D5E5F2] whitespace-pre-wrap">
                  {previewReport.shortDescription || "No description provided."}
                </p>
              </div>

              {/* Blockers & Dependencies */}
              <div>
                <p className="text-[11px] font-bold text-[#66758A] uppercase tracking-wider">
                  Blockers / Dependencies
                </p>
                {previewReport.blockerDependency && previewReport.blockerDependency !== "None" ? (
                  <p className="text-xs text-[#C84B50] mt-1.5 leading-relaxed bg-[#C84B50]/10 p-3.5 rounded-xl border border-[#C84B50]/30 font-medium whitespace-pre-wrap flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-[#C84B50] shrink-0 mt-0.5" />
                    <span>{previewReport.blockerDependency}</span>
                  </p>
                ) : (
                  <p className="text-xs text-[#66758A] mt-1.5 italic bg-[#EEF6FC] p-3 rounded-xl border border-[#D5E5F2]">
                    No blockers reported.
                  </p>
                )}
              </div>

              {/* Idle Reason / Support Needed */}
              <div>
                <p className="text-[11px] font-bold text-[#66758A] uppercase tracking-wider">
                  Idle Reason / Support Needed
                </p>
                {previewReport.idleReasonWorkNeeded ? (
                  <p className="text-xs text-[#25344A] mt-1.5 leading-relaxed bg-[#EEF6FC] p-3.5 rounded-xl border border-[#D5E5F2] whitespace-pre-wrap">
                    {previewReport.idleReasonWorkNeeded}
                  </p>
                ) : (
                  <p className="text-xs text-[#66758A] mt-1.5 italic bg-[#EEF6FC] p-3 rounded-xl border border-[#D5E5F2]">
                    No idle time or additional support required.
                  </p>
                )}
              </div>

              {/* Additional Notes */}
              <div>
                <p className="text-[11px] font-bold text-[#66758A] uppercase tracking-wider">
                  Additional Notes
                </p>
                {previewReport.notes ? (
                  <p className="text-xs text-[#25344A] mt-1.5 leading-relaxed bg-[#EEF6FC] p-3.5 rounded-xl border border-[#D5E5F2] whitespace-pre-wrap">
                    {previewReport.notes}
                  </p>
                ) : (
                  <p className="text-xs text-[#66758A] mt-1.5 italic bg-[#EEF6FC] p-3 rounded-xl border border-[#D5E5F2]">
                    No additional notes.
                  </p>
                )}
              </div>

              {/* Audit Metadata */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#66758A] pt-3 border-t border-[#D5E5F2]">
                <span>
                  Mentee: {previewReport.menteeName || "Mentee"} {user?.email ? `(${user.email})` : ""}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#E6F1FA] border-t border-[#D5E5F2] flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewReport(null)}
                className="rounded-xl text-xs border-[#D5E5F2] bg-[#FFFFFF] text-[#25344A] hover:bg-[#EEF6FC] cursor-pointer"
              >
                Close
              </Button>
              {isReportEditable(previewReport) ? (
                <Button
                  size="sm"
                  onClick={() => {
                    const rep = previewReport;
                    setPreviewReport(null);
                    handleEdit(rep);
                  }}
                  className="rounded-xl text-xs bg-linear-to-r from-[#0284C7] to-[#0369A1] hover:from-[#0369A1] hover:to-[#075985] text-white font-bold flex items-center gap-1.5 shadow-sm shadow-sky-500/20 cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit This Report
                </Button>
              ) : (
                <span className="text-xs text-[#66758A] bg-[#EEF6FC] px-3 py-1.5 rounded-xl border border-[#D5E5F2] inline-flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5" />
                  Edit window expired (15m limit)
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
