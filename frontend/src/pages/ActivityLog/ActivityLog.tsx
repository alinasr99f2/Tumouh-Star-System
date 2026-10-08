import { useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  ChevronDown,
  Clock3,
  Download,
  FileText,
  Layers3,
  Monitor,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  User,
  Users,
  Edit3,
  LogIn,
  Eye,
  Upload,
  ShieldCheck,
} from "lucide-react";

import "./ActivityLog.css";

type ActivityType =
  | "login"
  | "add"
  | "edit"
  | "delete"
  | "view"
  | "upload"
  | "permission";

interface ActivityItem {
  id: number;
  user: string;
  role: string;
  type: ActivityType;
  section: string;
  details: string;
  date: string;
  time: string;
  ip: string;
}

const activities: ActivityItem[] = [
  {
    id: 1,
    user: "أبو حمزة",
    role: "مشرف النظام",
    type: "login",
    section: "النظام",
    details: "تم تسجيل الدخول إلى النظام بنجاح",
    date: "02/10/2026",
    time: "02:58 ص",
    ip: "192.168.1.20",
  },
  {
    id: 2,
    user: "أبو سالم",
    role: "مستخدم",
    type: "add",
    section: "المشاريع",
    details: "تمت إضافة عقار جديد إلى النظام",
    date: "02/10/2026",
    time: "02:45 ص",
    ip: "192.168.1.35",
  },
  {
    id: 3,
    user: "أبو حمزة",
    role: "مشرف النظام",
    type: "edit",
    section: "العقار",
    details: "تم تعديل بيانات عمارة النخيل",
    date: "02/10/2026",
    time: "02:32 ص",
    ip: "192.168.1.20",
  },
  {
    id: 4,
    user: "أبو سالم",
    role: "مستخدم",
    type: "delete",
    section: "المصروفات",
    details: "تم حذف مصروف من النظام",
    date: "02/10/2026",
    time: "02:18 ص",
    ip: "192.168.1.35",
  },
  {
    id: 5,
    user: "أبو فهد",
    role: "مدير",
    type: "permission",
    section: "المستخدمين",
    details: "تم تعديل صلاحيات مستخدم",
    date: "02/10/2026",
    time: "01:55 ص",
    ip: "192.168.1.50",
  },
  {
    id: 6,
    user: "أبو حمزة",
    role: "مشرف النظام",
    type: "add",
    section: "الشقق",
    details: "تمت إضافة شقة جديدة (شقة 5 - عمارة الورود)",
    date: "02/10/2026",
    time: "01:40 ص",
    ip: "192.168.1.20",
  },
  {
    id: 7,
    user: "أبو سالم",
    role: "مستخدم",
    type: "view",
    section: "التقارير",
    details: "تم عرض تقرير المشاريع",
    date: "02/10/2026",
    time: "01:22 ص",
    ip: "192.168.1.35",
  },
  {
    id: 8,
    user: "أبو حمزة",
    role: "مشرف النظام",
    type: "upload",
    section: "المشاريع",
    details: "تم رفع ملف مخطط المشروع",
    date: "02/10/2026",
    time: "01:10 ص",
    ip: "192.168.1.20",
  },
];

const typeConfig: Record<
  ActivityType,
  {
    label: string;
    icon: typeof LogIn;
    className: string;
  }
> = {
  login: {
    label: "تسجيل دخول",
    icon: LogIn,
    className: "activity-login",
  },
  add: {
    label: "إضافة",
    icon: Plus,
    className: "activity-add",
  },
  edit: {
    label: "تعديل",
    icon: Edit3,
    className: "activity-edit",
  },
  delete: {
    label: "حذف",
    icon: Trash2,
    className: "activity-delete",
  },
  view: {
    label: "عرض",
    icon: Eye,
    className: "activity-view",
  },
  upload: {
    label: "رفع ملف",
    icon: Upload,
    className: "activity-upload",
  },
  permission: {
    label: "صلاحيات",
    icon: ShieldCheck,
    className: "activity-permission",
  },
};

function ActivityLog() {
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");

  const filteredActivities = useMemo(() => {
    return activities.filter((item) => {
      const searchMatch =
        !search ||
        item.user.includes(search) ||
        item.details.includes(search) ||
        item.section.includes(search) ||
        item.ip.includes(search);

      const sectionMatch =
        sectionFilter === "all" || item.section === sectionFilter;

      const typeMatch =
        typeFilter === "all" || item.type === typeFilter;

      const userMatch =
        userFilter === "all" || item.user === userFilter;

      return searchMatch && sectionMatch && typeMatch && userMatch;
    });
  }, [search, sectionFilter, typeFilter, userFilter]);

  const exportCSV = () => {
    const headers = [
      "#",
      "المستخدم",
      "نوع العملية",
      "القسم",
      "التفاصيل",
      "التاريخ",
      "الوقت",
      "الجهاز / IP",
    ];

    const rows = filteredActivities.map((item) => [
      item.id,
      item.user,
      typeConfig[item.type].label,
      item.section,
      item.details,
      item.date,
      item.time,
      item.ip,
    ]);

    const csv = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "activity-log.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setSearch("");
    setSectionFilter("all");
    setTypeFilter("all");
    setUserFilter("all");
  };

  return (
    <div className="activity-page" dir="rtl">

      {/* =========================================
          HEADER
      ========================================= */}
      <section className="activity-hero">

        <div className="activity-hero-overlay" />

        <div className="activity-hero-content">

          <div className="activity-hero-text">

            <div className="erp-badge">
              AQARY SMART ERP
            </div>

            <h1>
              سجل النظام
            </h1>

            <p>
              متابعة جميع العمليات والحركات التي تتم داخل النظام
            </p>

          </div>

          <div className="activity-hero-icon">
            <FileText size={42} strokeWidth={1.7} />
          </div>

        </div>

      </section>


      {/* =========================================
          STATISTICS
      ========================================= */}
      <section className="activity-stats">

        <div className="stat-card stat-total">
          <div className="stat-icon">
            <FileText />
          </div>

          <div className="stat-info">
            <span>إجمالي العمليات</span>
            <strong>1,482</strong>
          </div>
        </div>


        <div className="stat-card stat-today">
          <div className="stat-icon">
            <CalendarDays />
          </div>

          <div className="stat-info">
            <span>عمليات اليوم</span>
            <strong>86</strong>
          </div>
        </div>


        <div className="stat-card stat-users">
          <div className="stat-icon">
            <Users />
          </div>

          <div className="stat-info">
            <span>المستخدمون النشطون</span>
            <strong>6</strong>
          </div>
        </div>


        <div className="stat-card stat-last">
          <div className="stat-icon">
            <Clock3 />
          </div>

          <div className="stat-info">
            <span>آخر عملية</span>
            <strong>منذ 5 دقائق</strong>
          </div>
        </div>

      </section>


      {/* =========================================
          FILTERS
      ========================================= */}
      <section className="activity-filters">

        <div className="filter-search">

          <label>
            البحث في السجل
          </label>

          <div className="search-box">

            <Search size={18} />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم المستخدم أو التفاصيل..."
            />

          </div>

        </div>


        <div className="filter-item">

          <label>
            الفترة الزمنية
          </label>

          <div className="date-range">

            <div>
              <CalendarDays size={16} />
              02/10/2026
            </div>

            <span>إلى</span>

            <div>
              <CalendarDays size={16} />
              02/10/2026
            </div>

          </div>

        </div>


        <div className="filter-item">

          <label>
            القسم
          </label>

          <div className="select-box">

            <Layers3 size={16} />

            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
            >
              <option value="all">كل الأقسام</option>
              <option value="النظام">النظام</option>
              <option value="المشاريع">المشاريع</option>
              <option value="العقار">العقار</option>
              <option value="المصروفات">المصروفات</option>
              <option value="المستخدمين">المستخدمين</option>
              <option value="الشقق">الشقق</option>
              <option value="التقارير">التقارير</option>
            </select>

            <ChevronDown size={15} />

          </div>

        </div>


        <div className="filter-item">

          <label>
            نوع العملية
          </label>

          <div className="select-box">

            <Activity size={16} />

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">كل العمليات</option>
              <option value="login">تسجيل دخول</option>
              <option value="add">إضافة</option>
              <option value="edit">تعديل</option>
              <option value="delete">حذف</option>
              <option value="view">عرض</option>
              <option value="upload">رفع ملف</option>
              <option value="permission">صلاحيات</option>
            </select>

            <ChevronDown size={15} />

          </div>

        </div>


        <div className="filter-item">

          <label>
            المستخدم
          </label>

          <div className="select-box">

            <User size={16} />

            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
            >
              <option value="all">كل المستخدمين</option>
              <option value="أبو حمزة">أبو حمزة</option>
              <option value="أبو سالم">أبو سالم</option>
              <option value="أبو فهد">أبو فهد</option>
            </select>

            <ChevronDown size={15} />

          </div>

        </div>


        <button
          className="reset-button"
          onClick={resetFilters}
        >
          <RefreshCw size={17} />
          إعادة تعيين
        </button>

      </section>


      {/* =========================================
          ACTIVITY TABLE
      ========================================= */}
      <section className="activity-table-card">

        <div className="table-header">

          <div>

            <div className="table-title">

              <Clock3 size={22} />

              <div>
                <h2>
                  آخر الحركات المسجلة
                </h2>

                <p>
                  جميع الأنشطة والعمليات التي تمت داخل النظام
                </p>
              </div>

            </div>

          </div>


          <div className="table-actions">

            <button
              className="refresh-button"
              onClick={() => window.location.reload()}
            >
              <RefreshCw size={16} />
              تحديث
            </button>

            <button
              className="export-button"
              onClick={exportCSV}
            >
              <Download size={16} />
              تصدير CSV
            </button>

          </div>

        </div>


        <div className="activity-table-wrapper">

          <table className="activity-table">

            <thead>
              <tr>

                <th>#</th>

                <th>
                  التاريخ والوقت
                </th>

                <th>
                  المستخدم
                </th>

                <th>
                  نوع العملية
                </th>

                <th>
                  القسم
                </th>

                <th>
                  التفاصيل
                </th>

                <th>
                  الجهاز / IP
                </th>

                <th>
                  تفاصيل
                </th>

              </tr>
            </thead>


            <tbody>

              {filteredActivities.map((item) => {

                const config = typeConfig[item.type];
                const Icon = config.icon;

                return (
                  <tr key={item.id}>

                    <td className="row-number">
                      {item.id}
                    </td>


                    <td className="date-cell">

                      <strong>
                        {item.date}
                      </strong>

                      <span>
                        {item.time}
                      </span>

                    </td>


                    <td>

                      <div className="user-cell">

                        <div className="user-avatar">
                          {item.user.charAt(3)}
                        </div>

                        <div>
                          <strong>
                            {item.user}
                          </strong>

                          <span>
                            {item.role}
                          </span>
                        </div>

                      </div>

                    </td>


                    <td>

                      <span
                        className={`activity-badge ${config.className}`}
                      >
                        <Icon size={14} />
                        {config.label}
                      </span>

                    </td>


                    <td>

                      <span className="section-name">
                        {item.section}
                      </span>

                    </td>


                    <td className="details-cell">
                      {item.details}
                    </td>


                    <td>

                      <div className="ip-cell">

                        <Monitor size={15} />

                        <span>
                          {item.ip}
                        </span>

                      </div>

                    </td>


                    <td>

                      <button
                        className="more-button"
                        title="عرض التفاصيل"
                      >
                        ...
                      </button>

                    </td>

                  </tr>
                );

              })}

            </tbody>

          </table>


          {filteredActivities.length === 0 && (
            <div className="empty-activity">
              <Activity size={42} />
              <h3>لا توجد عمليات</h3>
              <p>
                لم يتم العثور على حركات مطابقة للبحث الحالي.
              </p>
            </div>
          )}

        </div>

      </section>

    </div>
  );
}

export default ActivityLog;