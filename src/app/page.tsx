"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import { useTheme } from "next-themes";
import {
  Building2, AlertCircle, CheckCircle2, Search, Loader2, MapPin,
  AlertTriangle, ShieldCheck, LayoutList, Kanban, Table2, ChevronLeft,
  ChevronRight, X, Filter, RefreshCw, SunMedium, TrendingUp, Moon, Network
} from "lucide-react";
import { SystemFlowDiagram } from "@/components/SystemFlowDiagram";

interface SheetRow {
  "S. No.": string;
  District: string;
  "KGBV Name": string;
  ADDRESS: string;
  "PIN CODE": string;
  "NAME OF THE PRINCIPAL": string;
  "CONTACT NUMBER": string;
  "No OF Systems ": string;
  "Phase -1 -200 Nos ": string;
  Tanks: string;
  "Collectors ": string;
  "MMS ": string;
  "Plumbing ": string;
  "System Installation Status": string;
  "Commissioning Status": string;
  Status: string;
  "Remarks ": string;
  "Installation Report URL": string;
  "Installatiion Pics URl": string;
}

type ViewMode = "table" | "list" | "kanban";
type StatusFilter = "all" | "installed" | "installation_pending" | "material_pending" | "unknown";

// ─── Constants ────────────────────────────────────────────────────────────────
const API_URL = "https://sheetdb.io/api/v1/67vmb2l27no38";
const PAGE_SIZE = 10;
const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  installed: { label: "Installed", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  installation_pending: { label: "Installation Pending", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  material_pending: { label: "Material Pending", bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-400" },
  unknown: { label: "Unknown", bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getStatusKey(status: string): string {
  const s = (status || "").trim().toLowerCase();
  if (s.includes("system installed") || s.includes("installed")) return "installed";
  if (s.includes("installation pending")) return "installation_pending";
  if (s.includes("material pending")) return "material_pending";
  return "unknown";
}

function getMissingMaterials(row: SheetRow): string[] {
  const missing: string[] = [];
  if (!row.Tanks?.trim()) missing.push("Tanks");
  if (!row["Collectors "]?.trim()) missing.push("Collectors");
  if (!row["MMS "]?.trim()) missing.push("MMS");
  if (!row["Plumbing "]?.trim()) missing.push("Plumbing");
  return missing;
}

function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ statusKey }: { statusKey: string }) {
  const cfg = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.unknown;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold", cfg.bg, cfg.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function MaterialsTag({ row }: { row: SheetRow }) {
  const missing = getMissingMaterials(row);
  if (missing.length === 0)
    return <span className="text-emerald-600 text-xs flex items-center gap-1 font-medium"><CheckCircle2 className="w-3.5 h-3.5" />All Delivered</span>;
  if (missing.length === 4)
    return <span className="text-rose-500 text-xs flex items-center gap-1 font-medium"><AlertCircle className="w-3.5 h-3.5" />None Delivered</span>;
  return (
    <div>
      <span className="text-amber-600 text-xs font-medium">Partial: </span>
      <span className="text-slate-400 text-xs">missing {missing.join(", ")}</span>
    </div>
  );
}

function KpiCard({ title, value, icon, sub, color }: {
  title: string; value: number | string; icon: React.ReactNode; sub: string; color: string;
}) {
  return (
    <div className={cn("rounded-2xl p-5 border shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3 dark:bg-opacity-10 dark:border-opacity-20", color)}>
      <div className="flex items-start justify-between">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</p>
        <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-white/80 dark:border-slate-700">{icon}</div>
      </div>
      <h3 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">{value}</h3>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 border-t border-slate-200/50 dark:border-slate-700/50 pt-3">{sub}</p>
    </div>
  );
}

function Pagination({ page, total, pageSize, onChange }: {
  page: number; total: number; pageSize: number; onChange: (p: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/50">
      <p className="text-xs text-slate-500">
        Showing <span className="font-semibold text-slate-700">{Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)}</span> of <span className="font-semibold text-slate-700">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)} disabled={page === 1}
          className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {pages.map((p, i) =>
          p === "…"
            ? <span key={`ellipsis-${i}`} className="px-2 text-slate-400 text-sm">…</span>
            : <button
              key={p}
              onClick={() => onChange(p as number)}
              className={cn(
                "w-8 h-8 rounded-lg text-sm font-medium transition-colors",
                page === p ? "bg-primary text-white shadow-sm" : "hover:bg-slate-200 text-slate-600"
              )}
            >{p}</button>
        )}
        <button
          onClick={() => onChange(page + 1)} disabled={page === totalPages}
          className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Table View ───────────────────────────────────────────────────────────────
function TableView({ rows, page, pageSize, onPageChange }: {
  rows: SheetRow[]; page: number; pageSize: number; onPageChange: (p: number) => void;
}) {
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
            <tr>
              {["S.No", "District", "School Name", "Principal", "Contact", "Status", "Materials", "Remarks"].map(h => (
                <th key={h} className="px-5 py-3.5 border-b border-slate-200">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageRows.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50/70 transition-colors group">
                <td className="px-5 py-3.5 font-bold text-slate-400 text-xs">{row["S. No."]}</td>
                <td className="px-5 py-3.5">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    <MapPin className="w-3 h-3" />{row.District}
                  </span>
                </td>
                <td className="px-5 py-3.5 max-w-[200px]">
                  <p className="font-semibold text-slate-800 truncate">{row["KGBV Name"]}</p>
                  <p className="text-xs text-slate-400 truncate">{row.ADDRESS}</p>
                </td>
                <td className="px-5 py-3.5 text-slate-600 text-xs max-w-[140px] truncate">{row["NAME OF THE PRINCIPAL"] || "—"}</td>
                <td className="px-5 py-3.5 text-slate-600 text-xs">{row["CONTACT NUMBER"] || "—"}</td>
                <td className="px-5 py-3.5"><StatusBadge statusKey={getStatusKey(row.Status)} /></td>
                <td className="px-5 py-3.5"><MaterialsTag row={row} /></td>
                <td className="px-5 py-3.5 text-xs text-slate-500 max-w-[200px] truncate" title={row["Remarks "] || ""}>{row["Remarks "] || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {pageRows.length === 0 && <EmptyState />}
      </div>
      <Pagination page={page} total={rows.length} pageSize={pageSize} onChange={onPageChange} />
    </div>
  );
}

// ─── List View ────────────────────────────────────────────────────────────────
function ListView({ rows, page, pageSize, onPageChange }: {
  rows: SheetRow[]; page: number; pageSize: number; onPageChange: (p: number) => void;
}) {
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  return (
    <div>
      <div className="divide-y divide-slate-100">
        {pageRows.map((row, idx) => {
          const missing = getMissingMaterials(row);
          const sk = getStatusKey(row.Status);
          return (
            <div key={idx} className="px-6 py-5 hover:bg-slate-50/70 transition-colors flex gap-4 items-start">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-400">
                {row["S. No."]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="font-bold text-slate-900 text-sm">{row["KGBV Name"]}</h3>
                  <StatusBadge statusKey={sk} />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-blue-400" />{row.District}</span>
                  {row.ADDRESS && <span className="truncate max-w-[260px]">{row.ADDRESS}</span>}
                  {row["PIN CODE"] && <span>PIN: {row["PIN CODE"]}</span>}
                </div>
                {row["Commissioning Status"] && row["Commissioning Status"].toLowerCase() !== "not commisioned" && (
                  <p className="mt-1 text-xs text-emerald-600 font-medium">Commissioning Status: {row["Commissioning Status"]}</p>
                )}
                {row["Remarks "] && (
                  <p className="mt-1.5 text-xs text-slate-400 italic truncate max-w-lg">"{row["Remarks "]}"</p>
                )}
              </div>
              <div className="flex-shrink-0 flex flex-col items-end gap-2 text-right">
                {row["No OF Systems "] && (
                  <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
                    {row["No OF Systems "]}
                  </span>
                )}
                <MaterialsTag row={row} />
              </div>
            </div>
          );
        })}
        {pageRows.length === 0 && <div className="p-6"><EmptyState /></div>}
      </div>
      <Pagination page={page} total={rows.length} pageSize={pageSize} onChange={onPageChange} />
    </div>
  );
}

// ─── Kanban View ──────────────────────────────────────────────────────────────
function KanbanView({ rows }: { rows: SheetRow[] }) {
  const columns: { key: string; title: string; icon: React.ReactNode; accent: string }[] = [
    { key: "installed", title: "Installed", icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />, accent: "border-emerald-400 bg-emerald-50/60" },
    { key: "installation_pending", title: "Installation Pending", icon: <AlertTriangle className="w-4 h-4 text-amber-500" />, accent: "border-amber-400 bg-amber-50/60" },
    { key: "material_pending", title: "Material Pending", icon: <AlertCircle className="w-4 h-4 text-rose-500" />, accent: "border-rose-400 bg-rose-50/60" },
    { key: "unknown", title: "Unknown / Other", icon: <Building2 className="w-4 h-4 text-slate-400" />, accent: "border-slate-300 bg-slate-50" },
  ];

  const grouped = useMemo(() => {
    const map: Record<string, SheetRow[]> = { installed: [], installation_pending: [], material_pending: [], unknown: [] };
    rows.forEach(r => { const k = getStatusKey(r.Status); map[k].push(r); });
    return map;
  }, [rows]);

  return (
    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {columns.map(col => {
        const cards = grouped[col.key] || [];
        return (
          <div key={col.key} className={cn("rounded-xl border-t-4 bg-white border border-slate-200", col.accent.split(" ")[0])}>
            <div className={cn("px-3 py-2.5 rounded-t-lg border-b border-slate-200 flex items-center justify-between", col.accent.split(" ")[1])}>
              <div className="flex items-center gap-2">
                {col.icon}
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{col.title}</span>
              </div>
              <span className="text-xs font-bold bg-white rounded-full px-2 py-0.5 shadow-sm border border-slate-200 text-slate-700">
                {cards.length}
              </span>
            </div>
            <div className="p-2 flex flex-col gap-2 max-h-[520px] overflow-y-auto">
              {cards.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-6">No entries</p>
              )}
              {cards.map((row, i) => {
                const missing = getMissingMaterials(row);
                return (
                  <div key={i} className="bg-white border border-slate-200 rounded-lg p-3 hover:shadow-md hover:border-slate-300 transition-all">
                    <div className="flex items-start justify-between gap-1 mb-1.5">
                      <p className="font-semibold text-slate-800 text-xs leading-snug line-clamp-2">{row["KGBV Name"]}</p>
                      <span className="flex-shrink-0 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">#{row["S. No."]}</span>
                    </div>
                    <p className="text-[11px] text-blue-600 font-semibold flex items-center gap-1 mb-1.5">
                      <MapPin className="w-3 h-3" />{row.District}
                    </p>
                    {row["No OF Systems "] && (
                      <p className="text-[11px] text-slate-500 mb-1.5 flex items-center gap-1">
                        <SunMedium className="w-3 h-3 text-amber-400" />{row["No OF Systems "]}
                      </p>
                    )}
                    <div className="border-t border-slate-100 pt-1.5 mt-1.5">
                      {missing.length === 0
                        ? <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />All materials delivered</span>
                        : missing.length === 4
                          ? <span className="text-[10px] text-rose-500 font-semibold">No materials delivered</span>
                          : <span className="text-[10px] text-amber-600">Missing: {missing.join(", ")}</span>
                      }
                    </div>
                    {row["Remarks "] && (
                      <p className="mt-1.5 text-[10px] text-slate-400 italic line-clamp-1" title={row["Remarks "]}>
                        {row["Remarks "]}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="p-16 flex flex-col items-center text-slate-400">
      <Search className="w-12 h-12 text-slate-300 mb-3" />
      <p className="font-semibold text-slate-500">No results match your filters</p>
      <p className="text-sm mt-1">Try clearing filters or searching differently</p>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [rawData, setRawData] = useState<SheetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(false);
    fetch(API_URL)
      .then(r => r.json())
      .then((json: any[]) => {
        const valid = json.filter(row => {
          const sNo = (row["S. No."] || "").toString().trim();
          return /^\d+$/.test(sNo) && parseInt(sNo) > 0;
        });
        setRawData(valid);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // District options
  const districts = useMemo(() => {
    const set = new Set(rawData.map(r => (r.District || "Unknown").trim().toUpperCase()));
    return ["all", ...Array.from(set).sort()];
  }, [rawData]);

  // Stats for charts/KPIs
  const stats = useMemo(() => {
    if (!rawData.length) return null;
    let installed = 0, installation_pending = 0, material_pending = 0, unknown = 0;
    let totalSystems = 0;
    const districtCounts: Record<string, number> = {};
    rawData.forEach(row => {
      // First try to parse the Phase column, if invalid, fallback to checking the "No OF Systems" string for "2"
      let sysCount = parseInt(row["Phase -1 -200 Nos "]);
      if (isNaN(sysCount) || sysCount < 1) {
        sysCount = row["No OF Systems "]?.includes("2 Nos") ? 2 : 1;
      }

      totalSystems += sysCount;

      const sk = getStatusKey(row.Status);
      if (sk === "installed") installed += sysCount;
      else if (sk === "installation_pending") installation_pending += sysCount;
      else if (sk === "material_pending") material_pending += sysCount;
      else unknown += sysCount;

      const d = (row.District || "Unknown").trim().toUpperCase();
      districtCounts[d] = (districtCounts[d] || 0) + sysCount;
    });
    const districtData = Object.entries(districtCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    const statusData = [
      { name: "Installed", value: installed, color: "#10b981" },
      { name: "Installation Pending", value: installation_pending, color: "#f59e0b" },
      { name: "Material Pending", value: material_pending, color: "#ef4444" },
      ...(unknown > 0 ? [{ name: "Unknown", value: unknown, color: "#94a3b8" }] : []),
    ].filter(s => s.value > 0);
    const completionRate = totalSystems > 0 ? ((installed / totalSystems) * 100).toFixed(1) : "0";
    return { totalSites: rawData.length, totalSystems, installed, installation_pending, material_pending, districtData, statusData, completionRate };
  }, [rawData]);

  // Filtered + searched data
  const filteredData = useMemo(() => {
    let d = rawData;
    if (districtFilter !== "all") {
      d = d.filter(r => (r.District || "").trim().toUpperCase() === districtFilter);
    }
    if (statusFilter !== "all") {
      d = d.filter(r => getStatusKey(r.Status) === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      d = d.filter(r =>
        (r["KGBV Name"] || "").toLowerCase().includes(q) ||
        (r.District || "").toLowerCase().includes(q) ||
        (r.ADDRESS || "").toLowerCase().includes(q) ||
        (r["NAME OF THE PRINCIPAL"] || "").toLowerCase().includes(q) ||
        (r["CONTACT NUMBER"] || "").toLowerCase().includes(q) ||
        (r["Remarks "] || "").toLowerCase().includes(q)
      );
    }
    return d;
  }, [rawData, districtFilter, statusFilter, searchQuery]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [searchQuery, districtFilter, statusFilter, viewMode]);

  const hasActiveFilters = searchQuery || districtFilter !== "all" || statusFilter !== "all";

  const clearFilters = () => {
    setSearchQuery(""); setDistrictFilter("all"); setStatusFilter("all");
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="flex flex-col items-center gap-4 text-slate-500">
        <div className="relative">
          <SunMedium className="w-14 h-14 text-amber-400 animate-spin" style={{ animationDuration: "3s" }} />
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin absolute -bottom-1 -right-1" />
        </div>
        <p className="text-lg font-bold text-slate-600 animate-pulse">Loading Solar Dashboard…</p>
      </div>
    </div>
  );

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <p className="font-bold text-slate-700 text-lg mb-1">Failed to load data</p>
        <p className="text-slate-500 text-sm mb-4">Could not connect to the data source</p>
        <button onClick={fetchData} className="flex items-center gap-2 mx-auto px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    </div>
  );

  if (!stats) return null;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen text-slate-900 font-sans pb-16 bg-cover bg-center bg-no-repeat bg-fixed dark:text-slate-100 transition-colors duration-300"
      style={{ backgroundImage: theme === 'dark' ? "linear-gradient(to bottom right, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9)), url('/92981804_32.svg')" : "linear-gradient(to bottom right, rgba(248, 250, 252, 0.9), rgba(239, 246, 255, 0.7)), url('/92981804_32.svg')" }}
    >

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 shadow-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex-shrink-0">
                <SunMedium className="w-6 h-6 text-amber-500" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white truncate">
                  KGBV Solar Installation Hub
                </h1>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Live field monitoring dashboard</p>
              </div>
            </div>

            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Toggle Theme"
              >
                {theme === 'dark' ? <SunMedium className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── KPI Cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Total Systems"
            value={stats.totalSystems}
            icon={<SunMedium className="w-5 h-5 text-blue-600" />}
            sub={`Across ${stats.totalSites} physical sites`}
            color="bg-blue-50 border-blue-100"
          />
          <KpiCard
            title="Installed"
            value={stats.installed}
            icon={<ShieldCheck className="w-5 h-5 text-emerald-600" />}
            sub={`${stats.completionRate}% completion rate`}
            color="bg-emerald-50 border-emerald-100"
          />
          <KpiCard
            title="Install Pending"
            value={stats.installation_pending}
            icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
            sub="Materials delivered, awaiting setup"
            color="bg-amber-50 border-amber-100"
          />
          <KpiCard
            title="Material Pending"
            value={stats.material_pending}
            icon={<AlertCircle className="w-5 h-5 text-rose-500" />}
            sub="Awaiting material shipments"
            color="bg-rose-50 border-rose-100"
          />
        </div>

        {/* ── Charts ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-5 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-400" /> District Distribution
            </h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.districtData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip
                    cursor={{ fill: "#f8fafc" }}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,.08)", fontSize: 13 }}
                  />
                  <Bar dataKey="count" radius={[5, 5, 0, 0]} barSize={28}>
                    {stats.districtData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-5 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-slate-400" /> Status Breakdown
            </h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.statusData} cx="50%" cy="45%"
                    innerRadius={65} outerRadius={95}
                    paddingAngle={3} dataKey="value" stroke="none"
                  >
                    {stats.statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13 }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── System Flow Diagram ────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-5 flex items-center gap-2">
            <Network className="w-4 h-4 text-slate-400" /> System Architecture Flow
          </h2>
          {/* <div className="h-96 w-full rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800">
            <SystemFlowDiagram />
          </div> */}
        </div>

        {/* ── Controls & Filters ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          {/* Search */}
          <div className="relative w-full sm:w-72 group flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search schools, districts, addresses…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-100 dark:bg-slate-800 dark:text-slate-100 border border-transparent focus:bg-white dark:focus:bg-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl text-sm transition-all outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(f => !f)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-all",
              showFilters || hasActiveFilters
                ? "bg-primary text-white border-primary shadow-md"
                : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
            )}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-amber-300" />}
          </button>

          {/* View toggle */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-0.5 flex-shrink-0">
            {([
              { mode: "table", icon: <Table2 className="w-4 h-4" />, label: "Table" },
              { mode: "list", icon: <LayoutList className="w-4 h-4" />, label: "List" },
              { mode: "kanban", icon: <Kanban className="w-4 h-4" />, label: "Kanban" },
            ] as const).map(v => (
              <button
                key={v.mode}
                title={v.label}
                onClick={() => setViewMode(v.mode)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  viewMode === v.mode
                    ? "bg-white shadow-sm text-primary border border-slate-200"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                {v.icon}
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filter drawer */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">District</label>
              <select
                value={districtFilter}
                onChange={e => setDistrictFilter(e.target.value)}
                className="text-sm bg-white dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all max-w-[200px]"
              >
                {districts.map(d => (
                  <option key={d} value={d}>{d === "all" ? "All Districts" : d}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Status</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                className="text-sm bg-white dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                <option value="all">All Statuses</option>
                <option value="installed">Installed</option>
                <option value="installation_pending">Installation Pending</option>
                <option value="material_pending">Material Pending</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold hover:text-rose-800 transition-colors">
                <X className="w-3.5 h-3.5" /> Clear all
              </button>
            )}
            <span className="ml-auto text-xs text-slate-400 font-medium">
              {filteredData.length} of {rawData.length} results
            </span>
          </div>
        )}

        {/* ── Data Panel ─────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-extrabold text-slate-800 dark:text-white text-base flex items-center gap-2">
              {viewMode === "table" && <Table2 className="w-5 h-5 text-slate-400" />}
              {viewMode === "list" && <LayoutList className="w-5 h-5 text-slate-400" />}
              {viewMode === "kanban" && <Kanban className="w-5 h-5 text-slate-400" />}
              Installation Directory
            </h2>
            <div className="flex items-center gap-3">
              {hasActiveFilters && (
                <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-rose-500 font-semibold hover:text-rose-700">
                  <X className="w-3 h-3" /> Clear filters
                </button>
              )}
              <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                {filteredData.length} results
              </span>
            </div>
          </div>

          {viewMode === "table" && (
            <TableView rows={filteredData} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
          )}
          {viewMode === "list" && (
            <ListView rows={filteredData} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
          )}
          {viewMode === "kanban" && (
            <KanbanView rows={filteredData} />
          )}
        </div>
      </main>
    </div>
  );
}