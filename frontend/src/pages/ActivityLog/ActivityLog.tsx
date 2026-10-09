import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, CalendarDays, ChevronDown, Clock3, Download, FileText, Layers3,
  Monitor, Plus, RefreshCw, Search, Trash2, User, Users, Edit3, LogIn, LogOut,
  Eye, Upload, ShieldCheck,
} from "lucide-react";
import { supabase } from "../../utils/supabase";
import "./ActivityLog.css";

type ActivityType = "login" | "logout" | "add" | "edit" | "delete" | "view" | "upload" | "permission";

interface ActivityRow {
  id: number;
  user_id: string | null;
  user_name: string;
  user_role: string;
  action_type: ActivityType;
  section: string;
  details: string;
  ip_address: string | null;
  created_at: string;
}

interface ActivityItem {
  id: number;
  userId: string | null;
  user: string;
  role: string;
  type: ActivityType;
  section: string;
  details: string;
  date: string;
  time: string;
  timestamp: number;
  ip: string;
}

const typeConfig: Record<ActivityType, { label: string; icon: typeof LogIn; className: string }> = {
  login: { label: "تسجيل دخول", icon: LogIn, className: "activity-login" },
  logout: { label: "تسجيل خروج", icon: LogOut, className: "activity-delete" },
  add: { label: "إضافة", icon: Plus, className: "activity-add" },
  edit: { label: "تعديل", icon: Edit3, className: "activity-edit" },
  delete: { label: "حذف", icon: Trash2, className: "activity-delete" },
  view: { label: "عرض", icon: Eye, className: "activity-view" },
  upload: { label: "رفع ملف", icon: Upload, className: "activity-upload" },
  permission: { label: "صلاحيات", icon: ShieldCheck, className: "activity-permission" },
};

const formatDate = (value: string) => new Date(value).toLocaleDateString("ar-SA", {
  day: "2-digit", month: "2-digit", year: "numeric",
});
const formatTime = (value: string) => new Date(value).toLocaleTimeString("ar-SA", {
  hour: "2-digit", minute: "2-digit", hour12: true,
});
const relativeTime = (value?: string) => {
  if (!value) return "لا توجد عمليات";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "الآن";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  return `منذ ${Math.floor(hours / 24)} يوم`;
};

function ActivityLog() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadActivities = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setLoadError("");
    try {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("id, user_id, user_name, user_role, action_type, section, details, ip_address, created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      const rows = (data ?? []) as ActivityRow[];
      setActivities(rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        user: row.user_name || "مستخدم",
        role: row.user_role || "موظف",
        type: row.action_type,
        section: row.section || "النظام",
        details: row.details || "",
        date: formatDate(row.created_at),
        time: formatTime(row.created_at),
        timestamp: new Date(row.created_at).getTime(),
        ip: row.ip_address || "غير متاح",
      })));
    } catch (error) {
      console.error("تعذر تحميل سجل العمليات:", error);
      const details =
        typeof error === "object" && error !== null
          ? [
              "message" in error ? String(error.message ?? "") : "",
              "code" in error ? `Code: ${String(error.code ?? "")}` : "",
              "details" in error ? String(error.details ?? "") : "",
              "hint" in error ? String(error.hint ?? "") : "",
            ].filter(Boolean).join(" — ")
          : String(error ?? "");
      setLoadError(details || "تعذر تحميل سجل العمليات. افتح Console لمعرفة تفاصيل الخطأ.");

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadActivities();
    const channel = supabase.channel("activity-logs-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_logs" }, () => void loadActivities(true))
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadActivities]);

  const sections = useMemo(
    () => [...new Set(activities.map((item) => item.section).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ar")),
    [activities],
  );
  const users = useMemo(
    () => [...new Set(activities.map((item) => item.user).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ar")),
    [activities],
  );

  const filteredActivities = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ar");
    const start = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null;
    const end = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : null;
    return activities.filter((item) => {
      const searchMatch = !query ||
        item.user.toLocaleLowerCase("ar").includes(query) ||
        item.details.toLocaleLowerCase("ar").includes(query) ||
        item.section.toLocaleLowerCase("ar").includes(query) ||
        item.ip.toLocaleLowerCase("ar").includes(query) ||
        item.role.toLocaleLowerCase("ar").includes(query);
      return searchMatch &&
        (sectionFilter === "all" || item.section === sectionFilter) &&
        (typeFilter === "all" || item.type === typeFilter) &&
        (userFilter === "all" || item.user === userFilter) &&
        (start === null || item.timestamp >= start) &&
        (end === null || item.timestamp <= end);
    });
  }, [activities, search, sectionFilter, typeFilter, userFilter, startDate, endDate]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayCount = activities.filter((item) => item.timestamp >= todayStart.getTime()).length;
  const activeUsersToday = new Set(
    activities.filter((item) => item.timestamp >= todayStart.getTime()).map((item) => item.userId || item.user),
  ).size;
  const latestActivity = activities[0];

  const exportCSV = () => {
    const headers = ["#", "المستخدم", "الدور", "نوع العملية", "القسم", "التفاصيل", "التاريخ", "الوقت", "الجهاز / IP"];
    const rows = filteredActivities.map((item) => [
      item.id, item.user, item.role, typeConfig[item.type]?.label ?? item.type,
      item.section, item.details, item.date, item.time, item.ip,
    ]);
    const csv = [headers, ...rows].map((row) =>
      row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","),
    ).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "aqary-smart-activity-log.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setSearch("");
    setSectionFilter("all");
    setTypeFilter("all");
    setUserFilter("all");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="activity-page" dir="rtl">
      <section className="activity-hero">
        <div className="activity-hero-overlay" />
        <div className="activity-hero-content">
          <div className="activity-hero-text">
            <div className="erp-badge">AQARY SMART ERP</div>
            <h1>سجل النظام</h1>
            <p>متابعة جميع العمليات والحركات التي تتم داخل النظام</p>
          </div>
          <div className="activity-hero-icon"><FileText size={42} strokeWidth={1.7} /></div>
        </div>
      </section>

      <section className="activity-stats">
        <div className="stat-card stat-total"><div className="stat-icon"><FileText /></div><div className="stat-info"><span>إجمالي العمليات المحمّلة</span><strong>{activities.length.toLocaleString("ar-SA")}</strong></div></div>
        <div className="stat-card stat-today"><div className="stat-icon"><CalendarDays /></div><div className="stat-info"><span>عمليات اليوم</span><strong>{todayCount.toLocaleString("ar-SA")}</strong></div></div>
        <div className="stat-card stat-users"><div className="stat-icon"><Users /></div><div className="stat-info"><span>مستخدمون نشطون اليوم</span><strong>{activeUsersToday.toLocaleString("ar-SA")}</strong></div></div>
        <div className="stat-card stat-last"><div className="stat-icon"><Clock3 /></div><div className="stat-info"><span>آخر عملية</span><strong>{relativeTime(latestActivity ? new Date(latestActivity.timestamp).toISOString() : undefined)}</strong></div></div>
      </section>

      <section className="activity-filters">
        <div className="filter-search"><label>البحث في السجل</label><div className="search-box"><Search size={18} /><input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث باسم المستخدم أو التفاصيل..." /></div></div>
        <div className="filter-item"><label>الفترة الزمنية</label><div className="date-range">
          <div><CalendarDays size={16} /><input aria-label="من تاريخ" type="date" value={startDate} max={endDate || undefined} onChange={(e) => setStartDate(e.target.value)} /></div>
          <span>إلى</span>
          <div><CalendarDays size={16} /><input aria-label="إلى تاريخ" type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} /></div>
        </div></div>
        <div className="filter-item"><label>القسم</label><div className="select-box"><Layers3 size={16} /><select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)}><option value="all">كل الأقسام</option>{sections.map((section) => <option key={section} value={section}>{section}</option>)}</select><ChevronDown size={15} /></div></div>
        <div className="filter-item"><label>نوع العملية</label><div className="select-box"><Activity size={16} /><select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option value="all">كل العمليات</option>{Object.entries(typeConfig).map(([value, config]) => <option key={value} value={value}>{config.label}</option>)}</select><ChevronDown size={15} /></div></div>
        <div className="filter-item"><label>المستخدم</label><div className="select-box"><User size={16} /><select value={userFilter} onChange={(e) => setUserFilter(e.target.value)}><option value="all">كل المستخدمين</option>{users.map((user) => <option key={user} value={user}>{user}</option>)}</select><ChevronDown size={15} /></div></div>
        <button className="reset-button" onClick={resetFilters}><RefreshCw size={17} />إعادة تعيين</button>
      </section>

      <section className="activity-table-card">
        <div className="table-header"><div><div className="table-title"><Clock3 size={22} /><div><h2>آخر الحركات المسجلة</h2><p>جميع الأنشطة والعمليات التي تمت داخل النظام</p></div></div></div>
          <div className="table-actions">
            <button className="refresh-button" onClick={() => void loadActivities(true)} disabled={refreshing}><RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />{refreshing ? "جارٍ التحديث..." : "تحديث"}</button>
            <button className="export-button" onClick={exportCSV} disabled={filteredActivities.length === 0}><Download size={16} />تصدير CSV</button>
          </div>
        </div>
        {loadError && <div role="alert" style={{ padding: "14px 20px", color: "#ffb4b4", background: "rgba(130, 20, 20, 0.18)" }}>تعذر تحميل سجل العمليات: {loadError}</div>}
        <div className="activity-table-wrapper">
          <table className="activity-table"><thead><tr><th>#</th><th>التاريخ والوقت</th><th>المستخدم</th><th>نوع العملية</th><th>القسم</th><th>التفاصيل</th><th>الجهاز / IP</th><th>تفاصيل</th></tr></thead>
            <tbody>{filteredActivities.map((item, index) => {
              const config = typeConfig[item.type] ?? typeConfig.view;
              const Icon = config.icon;
              return <tr key={item.id}>
                <td className="row-number">{index + 1}</td>
                <td className="date-cell"><strong>{item.date}</strong><span>{item.time}</span></td>
                <td><div className="user-cell"><div className="user-avatar">{item.user.trim().charAt(0) || "م"}</div><div><strong>{item.user}</strong><span>{item.role}</span></div></div></td>
                <td><span className={`activity-badge ${config.className}`}><Icon size={14} />{config.label}</span></td>
                <td><span className="section-name">{item.section}</span></td>
                <td className="details-cell">{item.details}</td>
                <td><div className="ip-cell"><Monitor size={15} /><span>{item.ip}</span></div></td>
                <td><button className="more-button" title={item.details} aria-label={`تفاصيل العملية: ${item.details}`} onClick={() => window.alert(item.details)}>...</button></td>
              </tr>;
            })}</tbody>
          </table>
          {!loading && filteredActivities.length === 0 && <div className="empty-activity"><Activity size={42} /><h3>{loadError ? "تعذر عرض العمليات" : "لا توجد عمليات"}</h3><p>{loadError ? "راجع إعدادات Supabase وسياسات الوصول للجدول." : "لم يتم العثور على حركات مطابقة للبحث الحالي."}</p></div>}
          {loading && <div className="empty-activity"><RefreshCw size={32} className="animate-spin" /><h3>جارٍ تحميل سجل العمليات...</h3></div>}
        </div>
      </section>
    </div>
  );
}

export default ActivityLog;
