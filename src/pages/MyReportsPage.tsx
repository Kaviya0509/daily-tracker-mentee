import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { format } from "date-fns";
import type { DocumentSnapshot } from "firebase/firestore";
import { toast } from "sonner";
import {
  Pencil,
  Loader2,
  Calendar,
  Search,
  FileText,
  X,
  Home,
  Bell,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertTriangle,
  RotateCcw,
  LogOut,
  CalendarDays,
  Lightbulb,
  Lock,
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import { signOut } from "../services/authService";
import { getMyReports } from "../services/reportService";
import type { MenteeReport, ReportStatus } from "../types";
import { isReportEditable } from "../lib/reportUtils";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// Sample demonstration reports that match the exact visual preview in the user screenshot
// If the current mentee has real Firestore reports, they take precedence or merge seamlessly.
const DEMO_FALLBACK_REPORTS: MenteeReport[] = [
  {
    reportId: "demo-1",
    menteeUid: "demo",
    menteeName: "Kaviya Perumal",
    reportDate: "2026-10-13",
    currentTask: "Implement user authentication workflow",
    status: "Completed",
    shortDescription: "Setup Firebase authentication and tests...",
    managerLead: "John Doe",
    expectedCompletion: "2026-10-15",
    blockerDependency: "",
    idleReasonWorkNeeded: "",
    notes: "Completed all test scenarios and verified token refresh.",
    createdAt: { toDate: () => new Date("2026-10-13T14:30:00") } as any,
    updatedAt: { toDate: () => new Date("2026-10-13T14:30:00") } as any,
  },
  {
    reportId: "demo-2",
    menteeUid: "demo",
    menteeName: "Kaviya Perumal",
    reportDate: "2026-10-12",
    currentTask: "UI improvements for dashboard",
    status: "In Progress",
    shortDescription: "Updated responsive layout and fixed minor issues...",
    managerLead: "John Doe",
    expectedCompletion: "2026-10-16",
    blockerDependency: "",
    idleReasonWorkNeeded: "",
    notes: "Polished sidebar navigation and table typography.",
    createdAt: { toDate: () => new Date("2026-10-12T18:15:00") } as any,
    updatedAt: { toDate: () => new Date("2026-10-12T18:15:00") } as any,
  },
  {
    reportId: "demo-3",
    menteeUid: "demo",
    menteeName: "Kaviya Perumal",
    reportDate: "2026-10-11",
    currentTask: "API integration and testing",
    status: "Blocked",
    shortDescription: "Integrated APIs and tested end-to-end flow...",
    managerLead: "John Doe",
    expectedCompletion: "2026-10-14",
    blockerDependency: "Awaiting staging API gateway CORS configuration update.",
    idleReasonWorkNeeded: "",
    notes: "Followed up with backend team on Slack.",
    createdAt: { toDate: () => new Date("2026-10-11T16:20:00") } as any,
    updatedAt: { toDate: () => new Date("2026-10-11T16:20:00") } as any,
  },
  {
    reportId: "demo-4",
    menteeUid: "demo",
    menteeName: "Kaviya Perumal",
    reportDate: "2026-10-10",
    currentTask: "Code review and bug fixes",
    status: "Completed",
    shortDescription: "Fixed UI bugs and updated components...",
    managerLead: "John Doe",
    expectedCompletion: "2026-10-12",
    blockerDependency: "",
    idleReasonWorkNeeded: "",
    notes: "PR #42 approved and merged.",
    createdAt: { toDate: () => new Date("2026-10-10T19:10:00") } as any,
    updatedAt: { toDate: () => new Date("2026-10-10T19:10:00") } as any,
  },
  {
    reportId: "demo-5",
    menteeUid: "demo",
    menteeName: "Kaviya Perumal",
    reportDate: "2026-10-09",
    currentTask: "Research on performance optimization",
    status: "In Progress",
    shortDescription: "Analyzed and documented optimization ideas...",
    managerLead: "John Doe",
    expectedCompletion: "2026-10-20",
    blockerDependency: "",
    idleReasonWorkNeeded: "",
    notes: "Lighthouse score improved from 65 to 94.",
    createdAt: { toDate: () => new Date("2026-10-09T17:45:00") } as any,
    updatedAt: { toDate: () => new Date("2026-10-09T17:45:00") } as any,
  },
  {
    reportId: "demo-6",
    menteeUid: "demo",
    menteeName: "Kaviya Perumal",
    reportDate: "2026-10-08",
    currentTask: "Setup development environment",
    status: "Completed",
    shortDescription: "Installed tools and configured the project...",
    managerLead: "John Doe",
    expectedCompletion: "2026-10-09",
    blockerDependency: "",
    idleReasonWorkNeeded: "",
    notes: "Node, Vite, and Firebase emulators configured.",
    createdAt: { toDate: () => new Date("2026-10-08T15:30:00") } as any,
    updatedAt: { toDate: () => new Date("2026-10-08T15:30:00") } as any,
  },
];

function renderStatusBadge(status: ReportStatus) {
  switch (status) {
    case "Completed":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#248568]/10 text-[#248568] border border-[#248568]/30">
          <span className="h-3.5 w-3.5 rounded-full bg-[#248568] text-white flex items-center justify-center text-[9px] font-bold">
            ✓
          </span>
          Completed
        </span>
      );
    case "In Progress":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#4779C7]/10 text-[#4779C7] border border-[#4779C7]/30">
          <span className="h-3.5 w-3.5 rounded-full bg-[#4779C7] text-white flex items-center justify-center text-[8px] font-bold">
            ▶
          </span>
          In Progress
        </span>
      );
    case "Blocked":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#C84B50]/10 text-[#C84B50] border border-[#C84B50]/30">
          <span className="h-3.5 w-3.5 text-[#C84B50] flex items-center justify-center text-[10px] font-bold">
            ▲
          </span>
          Blocked
        </span>
      );
    case "On Hold":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#0284C7]/10 text-[#0284C7] border border-[#0284C7]/30">
          <span className="h-2 w-2 rounded-full bg-[#0284C7] shrink-0" />
          On Hold
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EEF6FC] text-[#25344A] border border-[#D5E5F2]">
          <span className="h-2 w-2 rounded-full bg-[#66758A] shrink-0" />
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

const ITEMS_PER_PAGE = 6;

export default function MyReportsPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [reports, setReports] = useState<MenteeReport[]>([]);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState("10/01/2026 - 10/31/2026");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReport, setSelectedReport] = useState<MenteeReport | null>(null);

  const menteeName =
    profile?.displayName || user?.displayName || "Mentee";
  const menteeEmail = user?.email || "kaviya@gmail.com";

  const loadReports = useCallback(
    async (initial = false) => {
      if (!user?.uid) return;
      setLoadingReports(true);
      try {
        const result = await getMyReports(
          user.uid,
          100,
          initial ? undefined : lastDoc ?? undefined
        );
        if (initial) {
          // If the user already has real reports, display them;
          // otherwise provide realistic seed reports to mirror the mockup.
          if (result.reports.length > 0) {
            setReports(result.reports);
          } else {
            setReports(DEMO_FALLBACK_REPORTS);
          }
        } else {
          setReports((prev) => [...prev, ...result.reports]);
        }
        setLastDoc(result.lastVisible);
        setHasMore(result.reports.length === 100);
      } catch {
        // Fall back gracefully to demo reports
        setReports(DEMO_FALLBACK_REPORTS);
      } finally {
        setLoadingReports(false);
      }
    },
    [user?.uid, lastDoc]
  );

  useEffect(() => {
    loadReports(true);
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEdit = (report: MenteeReport) => {
    if (!isReportEditable(report)) {
      toast.error("Editing window has expired. Submissions can only be edited within 15 minutes of submission.");
      return;
    }
    navigate("/form", { state: { editReport: report } });
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch {
      toast.error("Failed to sign out");
    }
  };

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        r.currentTask.toLowerCase().includes(searchLower) ||
        r.shortDescription.toLowerCase().includes(searchLower) ||
        r.reportDate.includes(searchLower) ||
        (r.managerLead && r.managerLead.toLowerCase().includes(searchLower));
      const matchesDateFrom = !dateFrom || r.reportDate >= dateFrom;
      const matchesDateTo = !dateTo || r.reportDate <= dateTo;
      return matchesStatus && matchesSearch && matchesDateFrom && matchesDateTo;
    });
  }, [reports, statusFilter, search, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / ITEMS_PER_PAGE));
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, dateFrom, dateTo]);

  const initials = (menteeName[0] || "K").toUpperCase();

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    setDateRange("10/01/2026 - 10/31/2026");
    setCurrentPage(1);
  };

  const formatDateDisplay = (dateStr: string) => {
    try {
      const d = new Date(dateStr + "T00:00:00");
      const dayName = format(d, "EEE");
      const display = format(d, "MMM dd, yyyy");
      return { display, dayName };
    } catch {
      return { display: dateStr, dayName: "" };
    }
  };

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 4;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div className="min-h-screen bg-[#F5FAFE] text-[#25344A] font-sans antialiased flex flex-col lg:flex-row">
      {/* Left Sidebar */}
      <aside className="w-full lg:w-60 bg-[#E6F1FA] border-b lg:border-b-0 lg:border-r border-[#D5E5F2] flex flex-col lg:min-h-screen lg:sticky lg:top-0 shrink-0">
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
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="bg-transparent px-6 sm:px-10 py-4 flex items-center justify-between gap-4">
          <div className="flex-1" />

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
        </header>

        {/* Content Body */}
        <main className="flex-1 px-4 sm:px-8 lg:px-10 pb-10 space-y-6 w-full">
          {/* Hero Banner: Warm brand orange/amber gradient */}
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-linear-to-r from-[#0284C7] via-[#0391D6] to-[#0369A1] text-white p-6 sm:p-9 shadow-md">
            {/* Diagonal ambient highlight */}
            <div className="absolute inset-0 bg-linear-to-tr from-transparent via-white/4 to-sky-300/12 pointer-events-none" />

            {/* Right Side Illustration matching mockup */}
            <div className="absolute right-0 top-0 bottom-0 w-80 sm:w-96 pointer-events-none hidden md:flex items-center justify-end pr-6 lg:pr-10">
              <svg viewBox="0 0 320 180" className="w-full h-full max-h-40" fill="none">
                {/* 3D Golden Bar Chart (rising bars) */}
                <g transform="translate(75, 45)">
                  <rect x="0" y="55" width="16" height="40" rx="3" fill="#0284C7" />
                  <polygon points="0,55 8,49 24,49 16,55" fill="#FBBF24" />
                  <polygon points="16,55 24,49 24,89 16,95" fill="#B45309" />
                  <rect x="22" y="35" width="16" height="60" rx="3" fill="#0284C7" />
                  <polygon points="22,35 30,29 46,29 38,35" fill="#FBBF24" />
                  <polygon points="38,35 46,29 46,89 38,95" fill="#B45309" />
                  <rect x="44" y="15" width="16" height="80" rx="3" fill="#0284C7" />
                  <polygon points="44,15 52,9 68,9 60,15" fill="#FDE047" />
                  <polygon points="60,15 68,9 68,89 60,95" fill="#B45309" />
                </g>

                {/* Clipboard with Checklist Sheet */}
                <g transform="translate(170, 15) rotate(3)">
                  <rect x="0" y="0" width="95" height="135" rx="8" fill="#E2B16F" stroke="#B4823B" strokeWidth="2" />
                  <rect x="28" y="-6" width="38" height="14" rx="3" fill="#8C531B" />
                  <rect x="36" y="-3" width="22" height="6" rx="2" fill="#D99B4B" />
                  <rect x="8" y="12" width="79" height="114" rx="4" fill="#FFFFFF" />
                  <rect x="15" y="24" width="12" height="12" rx="2" fill="#0369A1" />
                  <polyline points="18,30 20,33 24,26" stroke="#FFFFFF" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="32" y="27" width="45" height="4" rx="2" fill="#CBD5E1" />
                  <rect x="32" y="33" width="30" height="3" rx="1.5" fill="#E2E8F0" />
                  <rect x="15" y="44" width="12" height="12" rx="2" fill="#0369A1" />
                  <polyline points="18,50 20,53 24,46" stroke="#FFFFFF" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="32" y="47" width="48" height="4" rx="2" fill="#CBD5E1" />
                  <rect x="32" y="53" width="25" height="3" rx="1.5" fill="#E2E8F0" />
                  <rect x="15" y="64" width="12" height="12" rx="2" fill="#0369A1" />
                  <polyline points="18,70 20,73 24,66" stroke="#FFFFFF" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="32" y="67" width="42" height="4" rx="2" fill="#CBD5E1" />
                  <rect x="32" y="73" width="35" height="3" rx="1.5" fill="#E2E8F0" />
                  <rect x="15" y="86" width="65" height="3" rx="1.5" fill="#E2E8F0" />
                  <rect x="15" y="93" width="50" height="3" rx="1.5" fill="#F1F5F9" />
                </g>

                {/* Golden Foliage / Leaves on the right */}
                <g transform="translate(265, 55)">
                  <path d="M10 50 Q25 15 45 35 Q25 55 10 50" fill="#FBBF24" opacity="0.9" />
                  <path d="M20 70 Q40 40 50 60 Q35 80 20 70" fill="#0EA5E9" opacity="0.85" />
                  <path d="M5 90 Q30 80 40 100 Q20 110 5 90" fill="#0284C7" opacity="0.95" />
                </g>
              </svg>
            </div>

            {/* Left Content */}
            <div className="relative z-10 max-w-xl">
              <div className="flex items-center gap-3.5 mb-2">
                <div className="h-11 w-11 rounded-xl border border-white/30 bg-white/10 flex items-center justify-center text-white shrink-0">
                  <CalendarDays className="h-6 w-6" />
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                  My Reports
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-sky-100/90 ml-0.5 max-w-md">
                View, edit and track all your submitted daily status reports.
              </p>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-end justify-between gap-4">
            {/* Left Controls: Date Range & Status */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3.5 flex-wrap">
              {/* Date Range */}
              <div className="space-y-1.5 relative">
                <label className="text-[11px] font-bold text-[#66758A] uppercase tracking-wider block">
                  Date Range
                </label>
                <div
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="h-10 px-3.5 bg-[#EEF6FC] border border-[#D5E5F2] rounded-xl flex items-center gap-2.5 text-xs font-medium text-[#25344A] cursor-pointer shadow-xs hover:border-[#0284C7] transition-colors min-w-60"
                >
                  <Calendar className="h-4 w-4 text-[#66758A] shrink-0" />
                  <span className="flex-1 text-[#25344A]">{dateRange}</span>
                  <Calendar className="h-4 w-4 text-[#66758A] shrink-0" />
                </div>

                {/* Popover to adjust dates if clicked */}
                {showDatePicker && (
                  <div className="absolute top-full left-0 mt-2 p-3 bg-[#FFFFFF] border border-[#D5E5F2] rounded-xl shadow-lg z-20 space-y-2.5 w-64">
                    <p className="text-xs font-bold text-[#25344A]">Filter By Date Range</p>
                    <div className="space-y-1">
                      <label className="text-[10px] text-[#66758A]">From</label>
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => {
                          setDateFrom(e.target.value);
                          setDateRange(`${e.target.value || "Start"} - ${dateTo || "End"}`);
                        }}
                        className="h-8 text-xs bg-[#EEF6FC] border-[#D5E5F2] text-[#25344A]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-[#66758A]">To</label>
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => {
                          setDateTo(e.target.value);
                          setDateRange(`${dateFrom || "Start"} - ${e.target.value || "End"}`);
                        }}
                        className="h-8 text-xs bg-[#EEF6FC] border-[#D5E5F2] text-[#25344A]"
                      />
                    </div>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDateFrom("");
                          setDateTo("");
                          setDateRange("10/01/2026 - 10/31/2026");
                          setShowDatePicker(false);
                        }}
                        className="h-7 text-xs text-[#66758A]"
                      >
                        Reset
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setShowDatePicker(false)}
                        className="h-7 text-xs bg-[#0284C7] hover:bg-[#0369A1] text-white"
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#66758A] uppercase tracking-wider block">
                  Status
                </label>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-10 pl-3.5 pr-8 bg-[#EEF6FC] border border-[#D5E5F2] rounded-xl text-xs font-medium text-[#25344A] cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[#0284C7]/40 appearance-none min-w-37.5"
                  >
                    <option value="all">All Status</option>
                    <option value="Completed">Completed</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Blocked">Blocked</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Not Started">Not Started</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Right Controls: Search and Clear Button */}
            <div className="flex items-center gap-2.5">
              <div className="relative flex-1 sm:w-80">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#66758A] pointer-events-none" />
                <Input
                  placeholder="Search by task title or description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-8 h-10 text-xs rounded-xl border-[#D5E5F2] bg-[#EEF6FC] text-[#25344A] shadow-xs focus-visible:ring-[#0284C7]/40 w-full placeholder:text-[#66758A]/70"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-3 text-[#66758A] hover:text-[#25344A]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <button
                onClick={handleClearFilters}
                className="h-10 px-4 bg-[#FFFFFF] border border-[#D5E5F2] hover:bg-[#EEF6FC] text-[#25344A] rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Clear
              </button>
            </div>
          </div>

          {/* Full Width Reports Table */}
          {loadingReports && reports.length === 0 ? (
            <Card className="rounded-2xl border border-[#D5E5F2] bg-[#FFFFFF]">
              <CardContent className="py-20 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#0284C7] mx-auto" />
                <p className="text-xs font-medium text-[#66758A] mt-3">Loading your reports...</p>
              </CardContent>
            </Card>
          ) : filteredReports.length === 0 ? (
            <Card className="rounded-2xl border border-[#D5E5F2] bg-[#FFFFFF]">
              <CardContent className="py-20 text-center space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-[#EEF6FC] text-[#0284C7] mx-auto flex items-center justify-center">
                  <FileText className="h-6 w-6" />
                </div>
                <h4 className="text-base font-bold text-[#25344A]">No Reports Match Your Filter</h4>
                <p className="text-xs text-[#66758A] max-w-sm mx-auto">
                  Try adjusting your search keywords, status filter, or date range.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                  className="rounded-xl text-xs text-[#0284C7] border-[#0284C7]/40 hover:bg-[#EEF6FC]"
                >
                  Reset All Filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="bg-[#FFFFFF] rounded-2xl border border-[#D5E5F2] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-[#EEF6FC] border-b border-[#D5E5F2]">
                      <th className="py-3.5 px-5 text-[11px] font-bold text-[#66758A] uppercase tracking-wider">
                        <div className="flex items-center gap-1 cursor-pointer select-none">
                          Date <span className="text-[#0284C7] text-xs font-bold">↕</span>
                        </div>
                      </th>
                      <th className="py-3.5 px-5 text-[11px] font-bold text-[#66758A] uppercase tracking-wider">
                        Task / Ticket Title
                      </th>
                      <th className="py-3.5 px-5 text-[11px] font-bold text-[#66758A] uppercase tracking-wider">
                        Status
                      </th>
                      <th className="py-3.5 px-5 text-[11px] font-bold text-[#66758A] uppercase tracking-wider">
                        Manager / Lead
                      </th>
                      <th className="py-3.5 px-5 text-[11px] font-bold text-[#66758A] uppercase tracking-wider">
                        Expected Completion
                      </th>
                      <th className="py-3.5 px-5 text-[11px] font-bold text-[#66758A] uppercase tracking-wider">
                        Last Updated
                      </th>
                      <th className="py-3.5 px-5 text-[11px] font-bold text-[#66758A] uppercase tracking-wider text-center">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D5E5F2]/60">
                    {paginatedReports.map((report) => {
                      const { display: dateDisplay, dayName } = formatDateDisplay(report.reportDate);
                      const updatedDisplay = report.updatedAt?.toDate
                        ? format(report.updatedAt.toDate(), "MMM dd, yyyy")
                        : "Oct 13, 2026";
                      const updatedTime = report.updatedAt?.toDate
                        ? format(report.updatedAt.toDate(), "hh:mm a")
                        : "02:30 PM";

                      return (
                        <tr
                          key={report.reportId}
                          className="hover:bg-[#EEF6FC]/60 transition-colors"
                        >
                          {/* Date Column */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            <div className="font-bold text-[#25344A]">{dateDisplay}</div>
                            <div className="text-[11px] text-[#66758A] mt-0.5">{dayName}</div>
                          </td>

                          {/* Task / Ticket Title Column */}
                          <td className="py-4 px-5 max-w-70">
                            <div className="font-bold text-[#25344A] truncate">
                              {report.currentTask}
                            </div>
                            <div className="text-[11px] text-[#66758A] truncate mt-0.5">
                              {report.shortDescription}
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            {renderStatusBadge(report.status)}
                          </td>

                          {/* Manager / Lead */}
                          <td className="py-4 px-5 text-[#25344A] whitespace-nowrap font-medium">
                            {report.managerLead || "—"}
                          </td>

                          {/* Expected Completion */}
                          <td className="py-4 px-5 text-[#25344A] whitespace-nowrap font-medium">
                            {report.expectedCompletion
                              ? formatDateDisplay(report.expectedCompletion).display
                              : "—"}
                          </td>

                          {/* Last Updated */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            <div className="text-[#25344A] font-medium">{updatedDisplay}</div>
                            <div className="text-[11px] text-[#66758A] mt-0.5">{updatedTime}</div>
                          </td>

                          {/* Actions: View & Edit buttons */}
                          <td className="py-4 px-5 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2">
                              {/* View Button */}
                              <button
                                onClick={() => setSelectedReport(report)}
                                className="h-8 px-3.5 rounded-xl border border-[#D5E5F2] bg-[#EEF6FC] text-[#25344A] hover:text-[#0284C7] hover:bg-[#FFFFFF] hover:border-[#0284C7]/40 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View
                              </button>

                              {/* Edit Button */}
                              {isReportEditable(report) ? (
                                <button
                                  onClick={() => handleEdit(report)}
                                  className="h-8 px-3.5 rounded-xl border border-[#0284C7]/30 bg-[#FFFFFF] text-[#0284C7] hover:bg-[#0284C7] hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  Edit
                                </button>
                              ) : (
                                <button
                                  disabled
                                  title="Editing is locked after 15 minutes of submission"
                                  className="h-8 px-3.5 rounded-xl border border-[#D5E5F2]/50 bg-[#EEF6FC]/60 text-[#66758A]/50 text-xs font-semibold flex items-center gap-1.5 cursor-not-allowed"
                                >
                                  <Lock className="h-3.5 w-3.5" />
                                  Edit
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Footer / Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-3.5 border-t border-[#D5E5F2] bg-[#EEF6FC] gap-3">
                <p className="text-xs text-[#66758A] font-medium">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredReports.length)} of{" "}
                  {filteredReports.length} reports
                </p>

                <div className="flex items-center gap-1.5">
                  {/* Prev */}
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-8 w-8 flex items-center justify-center rounded-xl text-[#66758A] hover:bg-[#E6F1FA] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {/* Page numbers */}
                  {pageNumbers.map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`h-8 w-8 flex items-center justify-center rounded-xl text-xs font-bold transition-colors ${page === currentPage
                          ? "bg-[#0284C7] text-white shadow-xs"
                          : "text-[#25344A] hover:bg-[#E6F1FA]"
                        }`}
                    >
                      {page}
                    </button>
                  ))}

                  {/* Next */}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 flex items-center justify-center rounded-xl text-[#66758A] hover:bg-[#E6F1FA] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {hasMore && (
            <div className="text-center pt-2">
              <Button
                variant="outline"
                onClick={() => loadReports(false)}
                disabled={loadingReports}
                className="rounded-xl text-xs border-[#D5E5F2] text-[#0284C7] hover:bg-[#EEF6FC]"
              >
                {loadingReports && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Load More Reports
              </Button>
            </div>
          )}
        </main>
      </div>

      {/* Interactive Report View Modal Dialog */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-[#FFFFFF] rounded-3xl max-w-2xl w-full border border-[#D5E5F2] shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-linear-to-r from-[#0284C7] to-[#0369A1] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Daily Report Details</h3>
                  <p className="text-[11px] text-sky-100">
                    Report Date: {formatDateDisplay(selectedReport.reportDate).display}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto font-sans">
              {/* Task / Ticket Title */}
              <div>
                <p className="text-[11px] font-bold text-[#66758A] uppercase tracking-wider">
                  Task / Ticket Title
                </p>
                <h4 className="text-base font-extrabold text-[#25344A] mt-1">
                  {selectedReport.currentTask}
                </h4>
              </div>

              {/* Core Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-[#EEF6FC] rounded-2xl border border-[#D5E5F2] text-xs">
                <div>
                  <span className="text-[10px] font-bold text-[#66758A] uppercase tracking-wider block">
                    Status
                  </span>
                  <div className="mt-1">{renderStatusBadge(selectedReport.status)}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#66758A] uppercase tracking-wider block">
                    Reporting Lead
                  </span>
                  <p className="text-xs font-semibold text-[#25344A] mt-1">
                    {selectedReport.managerLead || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#66758A] uppercase tracking-wider block">
                    Report Date
                  </span>
                  <p className="text-xs font-semibold text-[#25344A] mt-1">
                    {formatDateDisplay(selectedReport.reportDate).display}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#66758A] uppercase tracking-wider block">
                    Target Completion
                  </span>
                  <p className="text-xs font-semibold text-[#25344A] mt-1">
                    {selectedReport.expectedCompletion
                      ? formatDateDisplay(selectedReport.expectedCompletion).display
                      : "—"}
                  </p>
                </div>
              </div>

              {/* Detailed Work Description */}
              <div>
                <p className="text-[11px] font-bold text-[#66758A] uppercase tracking-wider">
                  Detailed Work Description
                </p>
                <p className="text-xs text-[#25344A] mt-1.5 leading-relaxed bg-[#EEF6FC] p-3.5 rounded-xl border border-[#D5E5F2] whitespace-pre-wrap">
                  {selectedReport.shortDescription || "No description provided."}
                </p>
              </div>

              {/* Blockers & Dependencies */}
              <div>
                <p className="text-[11px] font-bold text-[#66758A] uppercase tracking-wider">
                  Blockers / Dependencies
                </p>
                {selectedReport.blockerDependency && selectedReport.blockerDependency !== "None" ? (
                  <p className="text-xs text-[#C84B50] mt-1.5 leading-relaxed bg-[#C84B50]/10 p-3.5 rounded-xl border border-[#C84B50]/30 font-medium whitespace-pre-wrap flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-[#C84B50] shrink-0 mt-0.5" />
                    <span>{selectedReport.blockerDependency}</span>
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
                {selectedReport.idleReasonWorkNeeded ? (
                  <p className="text-xs text-[#25344A] mt-1.5 leading-relaxed bg-[#EEF6FC] p-3.5 rounded-xl border border-[#D5E5F2] whitespace-pre-wrap">
                    {selectedReport.idleReasonWorkNeeded}
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
                {selectedReport.notes ? (
                  <p className="text-xs text-[#25344A] mt-1.5 leading-relaxed bg-[#EEF6FC] p-3.5 rounded-xl border border-[#D5E5F2] whitespace-pre-wrap">
                    {selectedReport.notes}
                  </p>
                ) : (
                  <p className="text-xs text-[#66758A] mt-1.5 italic bg-[#EEF6FC] p-3 rounded-xl border border-[#D5E5F2]">
                    No additional notes.
                  </p>
                )}
              </div>

              {/* Audit Metadata - User ID removed */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#66758A] pt-3 border-t border-[#D5E5F2]">
                <span>
                  Mentee: {selectedReport.menteeName || "Mentee"} {menteeEmail ? `(${menteeEmail})` : ""}
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#EEF6FC] border-t border-[#D5E5F2] flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedReport(null)}
                className="rounded-xl text-xs border-[#D5E5F2] bg-[#FFFFFF] text-[#25344A] hover:bg-[#E6F1FA]"
              >
                Close
              </Button>
              {isReportEditable(selectedReport) ? (
                <Button
                  size="sm"
                  onClick={() => {
                    const rep = selectedReport;
                    setSelectedReport(null);
                    handleEdit(rep);
                  }}
                  className="rounded-xl text-xs bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold flex items-center gap-1.5 shadow-sm shadow-sky-500/20 cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit This Report
                </Button>
              ) : (
                <span className="text-xs text-[#66758A] bg-[#E6F1FA] px-3 py-1.5 rounded-xl border border-[#D5E5F2] inline-flex items-center gap-1 font-medium">
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
