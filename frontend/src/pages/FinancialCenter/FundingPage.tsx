import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Paperclip,
  RefreshCw,
  Download,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  FileText,
} from "lucide-react";
import { supabase } from "../../utils/supabase";

type FundingPageProps = {
  onAddFunding: () => void;
};

type FundingRow = {
  id: number;
  account_id: number | null;
  amount: number | string | null;
  funding_date?: string | null;
  created_at?: string | null;

  source?: string | null;
  payment_method?: string | null;
  method?: string | null;

  description?: string | null;
  notes?: string | null;

  reference_number?: string | null;
  reference?: string | null;
  ref_number?: string | null;
  voucher_number?: string | null;

  attachment?: string | null;
  attachment_url?: string | null;
  files?: unknown;
  file_url?: string | null;
  receipt_url?: string | null;
};

type AccountRow = {
  id: number;
  name: string;
};


const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const downloadBlob = (content: BlobPart, fileName: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const exportFundingExcel = (
  rows: FundingRow[],
  accountNameMap: Map<number, string>,
  title = "تقرير التغذية المالية"
) => {
  const body = rows
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(formatDateForExport(item.created_at))}</td>
          <td>${escapeHtml(formatDateForExport(item.funding_date))}</td>
          <td>${escapeHtml(accountNameMap.get(Number(item.account_id)) ?? "-")}</td>
          <td>${escapeHtml(getReferenceNumber(item))}</td>
          <td>${Number(item.amount ?? 0)}</td>
          <td>${escapeHtml(getPaymentMethod(item))}</td>
          <td>${escapeHtml(getCleanDescription(item))}</td>
        </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><style>
    body{font-family:Arial,sans-serif;direction:rtl}h1{text-align:center}table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:8px;text-align:right}th{background:#e8eef7}
  </style></head><body><h1>${escapeHtml(title)}</h1>
  <table><thead><tr><th>تاريخ الإدخال</th><th>تاريخ التغذية</th><th>العهدة</th><th>رقم المرجع</th><th>مبلغ التغذية</th><th>طريقة الدفع</th><th>الوصف</th></tr></thead><tbody>${body}</tbody></table></body></html>`;

  downloadBlob(html, `${title}.xls`, "application/vnd.ms-excel;charset=utf-8");
};

const formatDateForExport = (value?: string | null) => {
  if (!value) return "-";
  const parsed = parseDateOnly(value);
  return parsed ? parsed.toLocaleDateString("ar-SA") : String(value);
};

const printFundingReport = (
  rows: FundingRow[],
  accountNameMap: Map<number, string>,
  title = "تقرير التغذية المالية"
) => {
  const body = rows
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(formatDateForExport(item.created_at))}</td>
          <td>${escapeHtml(formatDateForExport(item.funding_date))}</td>
          <td>${escapeHtml(accountNameMap.get(Number(item.account_id)) ?? "-")}</td>
          <td>${escapeHtml(getReferenceNumber(item))}</td>
          <td>${Number(item.amount ?? 0).toLocaleString()} ريال</td>
          <td>${escapeHtml(getPaymentMethod(item))}</td>
          <td>${escapeHtml(getCleanDescription(item))}</td>
        </tr>`
    )
    .join("");

  const win = window.open("", "_blank", "width=1200,height=800");
  if (!win) {
    alert("يرجى السماح بالنوافذ المنبثقة حتى يمكن إنشاء التقرير.");
    return;
  }
  win.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title><style>
    body{font-family:Arial,sans-serif;padding:25px;color:#111}h1{text-align:center;margin-bottom:8px}p{text-align:center;color:#555}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #aaa;padding:7px;text-align:right}th{background:#eee} @media print{button{display:none}}
  </style></head><body><h1>${escapeHtml(title)}</h1><p>تاريخ التقرير: ${escapeHtml(new Date().toLocaleString("ar-SA"))}</p><table><thead><tr><th>تاريخ الإدخال</th><th>تاريخ التغذية</th><th>العهدة</th><th>رقم المرجع</th><th>مبلغ التغذية</th><th>طريقة الدفع</th><th>الوصف</th></tr></thead><tbody>${body}</tbody></table><script>window.onload=function(){window.print();}</script></body></html>`);
  win.document.close();
};

const formatMoney = (value: number) =>
  Number(value || 0).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const parseDateOnly = (value?: string | null) => {
  if (!value) return null;

  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (!match) return null;

  const [, year, month, day] = match;

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  );
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";

  const parsed = parseDateOnly(value);

  if (parsed) {
    return parsed.toLocaleDateString("ar-SA");
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("ar-SA");
};

const getPaymentMethod = (item: FundingRow) => {
  const value =
    item.payment_method ??
    item.method ??
    item.source ??
    "";

  switch (String(value).toLowerCase()) {
    case "cash":
      return "نقدًا";

    case "bank":
      return "تحويل بنكي";

    case "card":
      return "بطاقة";

    default:
      return value || "-";
  }
};

const getReferenceNumber = (item: FundingRow) => {
  const directReference =
    item.reference_number ??
    item.reference ??
    item.ref_number ??
    item.voucher_number;

  if (directReference !== undefined && directReference !== null) {
    return String(directReference);
  }

  const description = String(item.description ?? "");

  const match = description.match(
    /رقم المرجع\s*:\s*([^-\n]+)/i
  );

  if (match?.[1]) {
    return match[1].trim();
  }

  return "-";
};

const getCleanDescription = (item: FundingRow) => {
  const raw = String(
    item.description ??
    item.notes ??
    ""
  ).trim();

  if (!raw) {
    return "-";
  }

  return raw
    .replace(/رقم المرجع\s*:\s*[^-\n]+(?:\s*-\s*)?/i, "")
    .trim() || "-";
};

const getAttachments = (item: FundingRow) => {
  const raw =
  item.attachment_url ??
  item.attachment ??
  item.files ??
  item.file_url ??
  item.receipt_url;

  if (!raw) {
    return [];
  }

  if (Array.isArray(raw)) {
    return raw.filter(Boolean);
  }

  if (typeof raw === "string") {
    return [raw];
  }

  return [];
};

const getAttachmentUrl = (attachment: unknown) => {
  if (!attachment) return "";

  let value = "";

  if (typeof attachment === "string") {
    value = attachment;
  } else if (typeof attachment === "object") {
    const item = attachment as Record<string, unknown>;

    value = String(
      item.url ??
      item.path ??
      item.file_url ??
      item.publicUrl ??
      ""
    );
  }

  if (!value) return "";

  // لو الرابط كامل بالفعل
  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  // لو المخزن مجرد path داخل Bucket
  const { data } = supabase.storage
    .from("funding-attachments")
    .getPublicUrl(value);

  return data.publicUrl;
};
// =========================================================
// تصدير بيانات التغذية إلى Excel
// =========================================================

const exportRowsExcel = (
  rows: any[],
  fileName: string
) => {
  try {
    if (!rows || rows.length === 0) {
      alert("لا توجد عمليات تغذية في الفترة المحددة للتصدير.");
      return;
    }

    const exportData = rows.map((item: any, index: number) => ({
      "م": index + 1,

      "العهدة":
        item?.account_name ??
        item?.accountName ??
        item?.account?.name ??
        "-",

      "تاريخ الإدخال":
        item?.created_at ??
        item?.createdAt ??
        "-",

      "تاريخ التغذية":
        item?.funding_date ??
                "-",

      "المبلغ":
        Number(item?.amount ?? 0),

      "رقم المرجع":
        item?.reference_number ??
        item?.referenceNumber ??
        item?.reference ??
        "-",

      "طريقة الدفع":
        item?.payment_method ??
        item?.paymentMethod ??
        "-",

      "الوصف":
        item?.description ??
        "-",

      "المرفقات":
        item?.attachment_url ??
        item?.attachmentUrl ??
        "-",
    }));

    const headers = Object.keys(exportData[0]);

    const csvRows = [
      headers.join(","),
      ...exportData.map((row) =>
        headers
          .map((header) => {
            const value =
              row[header as keyof typeof row];

            const text =
              value === null ||
              value === undefined
                ? ""
                : String(value);

            return `"${text.replace(/"/g, '""')}"`;
          })
          .join(",")
      ),
    ];

    const csvContent =
      "\uFEFF" +
      csvRows.join("\n");

    const blob = new Blob(
      [csvContent],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      `${fileName}.csv`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

  } catch (error) {
    console.error(
      "خطأ أثناء تصدير بيانات التغذية:",
      error
    );

    alert(
      "حدث خطأ أثناء تصدير بيانات التغذية."
    );
  }
};
export default function FundingPage({
  onAddFunding,
}: FundingPageProps) {
  const [funding, setFunding] = useState<FundingRow[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(getLocalDateString());
  const [selectedWeekStart, setSelectedWeekStart] = useState(getLocalDateString(new Date(Date.now() - 6 * 86400000)));
  const [selectedWeekEnd, setSelectedWeekEnd] = useState(getLocalDateString());
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [openExportMenu, setOpenExportMenu] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [
        { data: fundingData, error: fundingError },
        { data: accountsData, error: accountsError },
      ] = await Promise.all([
        supabase
          .from("funding")
          .select("*")
          .not("account_id", "is", null)
          .order("funding_date", {
            ascending: false,
          })
          .order("id", {
            ascending: false,
          }),

        supabase
          .from("accounts")
          .select("id, name")
          .order("id", {
            ascending: true,
          }),
      ]);

      if (fundingError) {
        console.error(
          "خطأ في تحميل عمليات التغذية:",
          fundingError
        );
        return;
      }

      if (accountsError) {
        console.error(
          "خطأ في تحميل العهد:",
          accountsError
        );
        return;
      }

      setFunding(
        (fundingData ?? []) as FundingRow[]
      );

      setAccounts(
        (accountsData ?? []) as AccountRow[]
      );
    } catch (error) {
      console.error(
        "خطأ غير متوقع أثناء تحميل صفحة التغذية:",
        error
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const interval = window.setInterval(() => {
      loadData();
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadData]);

  const accountNameMap = useMemo(() => {
    const map = new Map<number, string>();

    accounts.forEach((account) => {
      map.set(
        Number(account.id),
        account.name
      );
    });

    return map;
  }, [accounts]);

  const selectedDayDate = useMemo(() => {
    const d = parseDateOnly(selectedDay);
    if (d) d.setHours(0, 0, 0, 0);
    return d ?? new Date();
  }, [selectedDay]);

  const selectedWeekStartDate = useMemo(() => {
    const d = parseDateOnly(selectedWeekStart);
    if (d) d.setHours(0, 0, 0, 0);
    return d ?? selectedDayDate;
  }, [selectedWeekStart, selectedDayDate]);

  const selectedWeekEndDate = useMemo(() => {
    const d = parseDateOnly(selectedWeekEnd);
    if (d) d.setHours(0, 0, 0, 0);
    return d ?? selectedDayDate;
  }, [selectedWeekEnd, selectedDayDate]);

  const selectedMonthStart = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    return new Date(year || new Date().getFullYear(), (month || 1) - 1, 1);
  }, [selectedMonth]);

  const selectedMonthEnd = useMemo(() => {
    return new Date(
      selectedMonthStart.getFullYear(),
      selectedMonthStart.getMonth() + 1,
      0
    );
  }, [selectedMonthStart]);

  const todayString = selectedDay;

  const totalFunding = useMemo(() => {
    return funding.reduce(
      (sum, item) =>
        sum + Number(item.amount ?? 0),
      0
    );
  }, [funding]);

  const todayFunding = useMemo(() => {
    return funding.reduce((sum, item) => {
      const date = parseDateOnly(item.funding_date);
      return date && getLocalDateString(date) === selectedDay
        ? sum + Number(item.amount ?? 0)
        : sum;
    }, 0);
  }, [funding, selectedDay]);

  const weekFunding = useMemo(() => {
    return funding.reduce((sum, item) => {
      const date = parseDateOnly(item.funding_date);
      if (!date) return sum;
      date.setHours(0, 0, 0, 0);
      return date >= selectedWeekStartDate && date <= selectedWeekEndDate
        ? sum + Number(item.amount ?? 0)
        : sum;
    }, 0);
  }, [funding, selectedWeekStartDate, selectedWeekEndDate]);

  const monthFunding = useMemo(() => {
    return funding.reduce((sum, item) => {
      const date = parseDateOnly(item.funding_date);
      if (!date) return sum;
      date.setHours(0, 0, 0, 0);
      return date >= selectedMonthStart && date <= selectedMonthEnd
        ? sum + Number(item.amount ?? 0)
        : sum;
    }, 0);
  }, [funding, selectedMonthStart, selectedMonthEnd]);

  const exportAllFunding = () => {
    exportFundingExcel(funding, accountNameMap, "تقرير جميع عمليات التغذية");
    setExportOpen(false);
  };

  const exportPrint = () => {
    printFundingReport(funding, accountNameMap, "تقرير جميع عمليات التغذية");
    setExportOpen(false);
  };

  const handlePeriodExport = (
    type: "day" | "week" | "month",
    action: "excel" | "pdf" | "print"
  ) => {
    let rows: FundingRow[] = [];
    let title = "";

    if (type === "day") {
      rows = funding.filter((item) => {
        const value =
          item?.funding_date ??
                    item?.created_at;

        return (
          !!value &&
          String(value).slice(0, 10) === selectedDay
        );
      });

      title = `تقرير تغذية يوم ${selectedDay}`;
    }

    if (type === "week") {
      rows = funding.filter((item) => {
        const value =
          item?.funding_date ??
                    item?.created_at;

        if (!value) return false;

        const date = String(value).slice(0, 10);

        return (
          date >= selectedWeekStart &&
          date <= selectedWeekEnd
        );
      });

      title =
        `تقرير تغذية من ${selectedWeekStart} إلى ${selectedWeekEnd}`;
    }

    if (type === "month") {
      rows = funding.filter((item) => {
        const value =
          item?.funding_date ??
                    item?.created_at;

        return (
          !!value &&
          String(value).slice(0, 7) === selectedMonth
        );
      });

      title = `تقرير تغذية شهر ${selectedMonth}`;
    }

    if (!rows.length) {
      alert("لا توجد عمليات تغذية في الفترة المحددة للتصدير.");
      setOpenExportMenu(null);
      return;
    }

    if (action === "excel") {
      exportRowsExcel(rows, title);
    } else {
      // PDF = نافذة الطباعة، ومنها يمكن اختيار Save as PDF
      printFundingReport(rows, accountNameMap, title);
    }

    setOpenExportMenu(null);
  };

  return (
    <div
      dir="rtl"
      className="w-full min-w-0 space-y-4 sm:space-y-6"
    >

      {/* ================= Header ================= */}

      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">

        <div>

          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            التغذية المالية
          </h2>

          <p className="mt-2 text-gray-400">
            جميع عمليات تغذية الحسابات والعهد.
          </p>

        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-2xl
              border
              border-white/10
              bg-[#073529]
              text-gray-300
              transition
              hover:border-emerald-300/40
              hover:text-emerald-300
              disabled:opacity-50
            "
            title="تحديث"
          >
            <RefreshCw
              size={20}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setExportOpen((v) => !v)}
              className="flex h-12 items-center gap-2 rounded-2xl border border-emerald-400/35 bg-emerald-400/10 px-4 font-bold text-emerald-300 transition hover:border-emerald-300 hover:bg-emerald-600 hover:text-white"
              title="تصدير التقرير"
            >
              <Download size={19} />
              تصدير
              <ChevronDown size={16} />
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-12 z-50 w-[min(13rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-[#073529] p-1 shadow-2xl">
                <button onClick={exportAllFunding} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-right text-sm text-white hover:bg-white/10"><FileSpreadsheet size={18} className="text-emerald-300" /> Excel</button>
                <button onClick={exportPrint} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-right text-sm text-white hover:bg-white/10"><FileText size={18} className="text-red-400" /> PDF / حفظ PDF</button>
                <button onClick={exportPrint} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-right text-sm text-white hover:bg-white/10"><Printer size={18} className="text-[#F6D878]" /> طباعة</button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onAddFunding}
            className="
              flex
              items-center
              gap-2
              rounded-2xl
              bg-gradient-to-r
              from-[#D4AD4D]
              to-[#A9842F]
              px-7
              py-3
              font-bold
              text-[#05261F]
              shadow-lg
              shadow-emerald-500/20
              transition-all
              duration-300
              hover:-translate-y-1
              hover:shadow-xl
              hover:shadow-emerald-500/30
            "
          >
            <span className="text-xl">
              ＋
            </span>

            إضافة تغذية مالية
          </button>

        </div>

      </div>

     {/* ================= Statistics ================= */}

<div className="grid min-w-0 grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">

  {/* ================= اليوم ================= */}

  <div
    className="
      rounded-2xl
      border
      border-[#C49A3A]/25
      bg-[#05261F]
      p-6
      shadow-lg
      shadow-[#C49A3A]/5
    "
  >

    <div className="flex items-center justify-between gap-3">
      <p className="text-gray-400">
        تغذية اليوم
      </p>

      <input
        type="date"
        value={selectedDay}
        onChange={(e) => setSelectedDay(e.target.value)}
        className="
          rounded-lg
          border
          border-[#C49A3A]/25
          bg-[#073529]
          px-2
          py-1
          text-xs
          text-white
          outline-none
        "
      />
    </div>

    <h2 className="mt-2 text-2xl font-bold text-[#F6D878] sm:mt-3 sm:text-3xl">
      {formatMoney(todayFunding)} ريال
    </h2>

    <p className="mt-2 text-xs text-gray-500">
      إجمالي التغذية في اليوم المحدد:
      {" "}
      {formatDate(selectedDay)}
    </p>

    {/* تصدير الفترة */}
    <div className="relative mt-3 flex flex-wrap justify-end gap-2 sm:mt-4">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpenExportMenu(
            openExportMenu === "day"
              ? null
              : "day"
          );
        }}
        className="
          flex items-center gap-2
          rounded-xl
          border border-[#C49A3A]/35
          bg-[#C49A3A]/10
          px-4 py-2
          text-sm font-bold
          text-[#F6D878]
          transition
          hover:border-[#D4AD4D]
          hover:bg-[#C49A3A]
          hover:text-white
        "
        title="تصدير التقرير"
      >
        <Download size={16} />
        تصدير
        <ChevronDown size={15} />
      </button>

      {openExportMenu === "day" && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="
            absolute right-0 top-12 z-50
            w-48 overflow-hidden
            rounded-xl
            border border-white/10
            bg-[#073529]
            p-1
            shadow-2xl
          "
        >
          <button
            type="button"
            onClick={() => handlePeriodExport("day", "pdf")}
            className="flex min-w-0 w-full items-center gap-2 rounded-lg px-3 py-3 text-right text-sm text-white transition hover:bg-white/10"
          >
            <FileText size={17} className="text-red-400" />
            PDF / حفظ PDF
          </button>

          <button
            type="button"
            onClick={() => handlePeriodExport("day", "excel")}
            className="flex min-w-0 w-full items-center gap-2 rounded-lg px-3 py-3 text-right text-sm text-white transition hover:bg-white/10"
          >
            <FileSpreadsheet size={17} className="text-emerald-300" />
            Excel
          </button>

          <button
            type="button"
            onClick={() => handlePeriodExport("day", "print")}
            className="flex min-w-0 w-full items-center gap-2 rounded-lg px-3 py-3 text-right text-sm text-white transition hover:bg-white/10"
          >
            <Printer size={17} className="text-[#F6D878]" />
            طباعة
          </button>
        </div>
      )}
    </div>

  </div>

  {/* ================= الأسبوع ================= */}

  <div
    className="
      rounded-2xl
      border
      border-[#C49A3A]/25
      bg-[#05261F]
      p-6
      shadow-lg
      shadow-[#C49A3A]/5
    "
  >

    <p className="text-gray-400">
      تغذية الأسبوع
    </p>

    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">

      <input
        type="date"
        value={selectedWeekStart}
        onChange={(e) =>
          setSelectedWeekStart(e.target.value)
        }
        className="
          min-w-0
          rounded-lg
          border
          border-[#C49A3A]/25
          bg-[#073529]
          px-2
          py-1
          text-xs
          text-white
          outline-none
        "
      />

      <input
        type="date"
        value={selectedWeekEnd}
        onChange={(e) =>
          setSelectedWeekEnd(e.target.value)
        }
        className="
          min-w-0
          rounded-lg
          border
          border-[#C49A3A]/25
          bg-[#073529]
          px-2
          py-1
          text-xs
          text-white
          outline-none
        "
      />

    </div>

    <h2 className="mt-2 text-2xl font-bold text-[#F6D878] sm:mt-3 sm:text-3xl">
      {formatMoney(weekFunding)} ريال
    </h2>

    <p className="mt-2 text-xs text-gray-500">
      من {formatDate(selectedWeekStart)}
      {" "}
      إلى {formatDate(selectedWeekEnd)}
    </p>

    {/* تصدير الفترة */}
    <div className="relative mt-3 flex flex-wrap justify-end gap-2 sm:mt-4">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpenExportMenu(
            openExportMenu === "week"
              ? null
              : "week"
          );
        }}
        className="
          flex items-center gap-2
          rounded-xl
          border border-[#C49A3A]/35
          bg-[#C49A3A]/10
          px-4 py-2
          text-sm font-bold
          text-[#F6D878]
          transition
          hover:border-[#D4AD4D]
          hover:bg-[#C49A3A]
          hover:text-white
        "
        title="تصدير التقرير"
      >
        <Download size={16} />
        تصدير
        <ChevronDown size={15} />
      </button>

      {openExportMenu === "week" && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="
            absolute right-0 top-12 z-50
            w-48 overflow-hidden
            rounded-xl
            border border-white/10
            bg-[#073529]
            p-1
            shadow-2xl
          "
        >
          <button
            type="button"
            onClick={() => handlePeriodExport("week", "pdf")}
            className="flex min-w-0 w-full items-center gap-2 rounded-lg px-3 py-3 text-right text-sm text-white transition hover:bg-white/10"
          >
            <FileText size={17} className="text-red-400" />
            PDF / حفظ PDF
          </button>

          <button
            type="button"
            onClick={() => handlePeriodExport("week", "excel")}
            className="flex min-w-0 w-full items-center gap-2 rounded-lg px-3 py-3 text-right text-sm text-white transition hover:bg-white/10"
          >
            <FileSpreadsheet size={17} className="text-emerald-300" />
            Excel
          </button>

          <button
            type="button"
            onClick={() => handlePeriodExport("week", "print")}
            className="flex min-w-0 w-full items-center gap-2 rounded-lg px-3 py-3 text-right text-sm text-white transition hover:bg-white/10"
          >
            <Printer size={17} className="text-[#F6D878]" />
            طباعة
          </button>
        </div>
      )}
    </div>

  </div>

  {/* ================= الشهر ================= */}

  <div
    className="
      rounded-2xl
      border
      border-[#C49A3A]/25
      bg-[#05261F]
      p-6
      shadow-lg
      shadow-[#C49A3A]/5
    "
  >

    <div className="flex items-center justify-between gap-3">

      <p className="text-gray-400">
        تغذية الشهر
      </p>

      <input
        type="month"
        value={selectedMonth}
        onChange={(e) =>
          setSelectedMonth(e.target.value)
        }
        className="
          rounded-lg
          border
          border-[#C49A3A]/25
          bg-[#073529]
          px-2
          py-1
          text-xs
          text-white
          outline-none
        "
      />

    </div>

    <h2 className="mt-2 text-2xl font-bold text-[#F6D878] sm:mt-3 sm:text-3xl">
      {formatMoney(monthFunding)} ريال
    </h2>

    <p className="mt-2 text-xs text-gray-500">
      من {formatDate(getLocalDateString(selectedMonthStart))}
      {" "}
      إلى {formatDate(getLocalDateString(selectedMonthEnd))}
    </p>

    {/* تصدير الفترة */}
    <div className="relative mt-3 flex flex-wrap justify-end gap-2 sm:mt-4">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpenExportMenu(
            openExportMenu === "month"
              ? null
              : "month"
          );
        }}
        className="
          flex items-center gap-2
          rounded-xl
          border border-[#C49A3A]/35
          bg-[#C49A3A]/10
          px-4 py-2
          text-sm font-bold
          text-[#F6D878]
          transition
          hover:border-[#D4AD4D]
          hover:bg-[#C49A3A]
          hover:text-white
        "
        title="تصدير التقرير"
      >
        <Download size={16} />
        تصدير
        <ChevronDown size={15} />
      </button>

      {openExportMenu === "month" && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="
            absolute right-0 top-12 z-50
            w-48 overflow-hidden
            rounded-xl
            border border-white/10
            bg-[#073529]
            p-1
            shadow-2xl
          "
        >
          <button
            type="button"
            onClick={() => handlePeriodExport("month", "pdf")}
            className="flex min-w-0 w-full items-center gap-2 rounded-lg px-3 py-3 text-right text-sm text-white transition hover:bg-white/10"
          >
            <FileText size={17} className="text-red-400" />
            PDF / حفظ PDF
          </button>

          <button
            type="button"
            onClick={() => handlePeriodExport("month", "excel")}
            className="flex min-w-0 w-full items-center gap-2 rounded-lg px-3 py-3 text-right text-sm text-white transition hover:bg-white/10"
          >
            <FileSpreadsheet size={17} className="text-emerald-300" />
            Excel
          </button>

          <button
            type="button"
            onClick={() => handlePeriodExport("month", "print")}
            className="flex min-w-0 w-full items-center gap-2 rounded-lg px-3 py-3 text-right text-sm text-white transition hover:bg-white/10"
          >
            <Printer size={17} className="text-[#F6D878]" />
            طباعة
          </button>
        </div>
      )}
    </div>

  </div>

        {/* الإجمالي */}

        <div
          className="
            rounded-2xl
            border
            border-green-400/20
            bg-[#05261F]
            p-6
            shadow-lg
            shadow-green-500/5
          "
        >

          <p className="text-gray-400">
            إجمالي التغذية
          </p>

          <h2 className="mt-3 text-3xl font-bold text-emerald-300">
            {formatMoney(totalFunding)} ريال
          </h2>

          <p className="mt-2 text-xs text-gray-500">
            إجمالي جميع عمليات التغذية
          </p>

        </div>

      </div>

      {/* ================= Table ================= */}

      <div
        className="
          overflow-hidden
          rounded-2xl
          border
          border-white/10
          bg-[#05261F]
        "
      >

        <div
          className="
            flex
            items-center
            justify-between
            border-b
            border-white/10
            bg-[#073529]
            px-5
            py-4
          "
        >

          <div>

            <h3 className="font-bold text-white">
              سجل عمليات التغذية
            </h3>

            <p className="mt-1 text-xs text-gray-400">
              جميع حركات التغذية المرتبطة بالعهد
            </p>

          </div>

          <div
            className="
              rounded-xl
              bg-emerald-400/10
              px-3
              py-2
              text-xs
              font-bold
              text-emerald-300
            "
          >
            {funding.length} عملية
          </div>

        </div>

        <div className="overflow-x-auto">

          <table className="min-w-[1200px] w-full text-sm">

            <thead className="bg-[#073529]">

              <tr className="border-t border-white/10">

                <th className="whitespace-nowrap px-4 py-4 text-right text-gray-300">
                  تاريخ الإدخال
                </th>

                <th className="whitespace-nowrap px-4 py-4 text-right text-gray-300">
                  تاريخ التغذية
                </th>

                <th className="whitespace-nowrap px-4 py-4 text-right text-gray-300">
                  العهدة
                </th>

                <th className="whitespace-nowrap px-4 py-4 text-right text-gray-300">
                  رقم المرجع
                </th>

                <th className="whitespace-nowrap px-4 py-4 text-right text-gray-300">
                  مبلغ التغذية
                </th>

                <th className="whitespace-nowrap px-4 py-4 text-right text-gray-300">
                  طريقة الدفع
                </th>

                <th className="whitespace-nowrap px-4 py-4 text-right text-gray-300">
                  الوصف
                </th>

                <th className="whitespace-nowrap px-4 py-4 text-center text-gray-300">
                  المرفقات
                </th>

              </tr>

            </thead>

            <tbody className="divide-y divide-white/10">

              {loading ? (

                <tr>

                  <td
                    colSpan={8}
                    className="
                      py-20
                      text-center
                      text-gray-400
                    "
                  >
                    جاري تحميل عمليات التغذية...
                  </td>

                </tr>

              ) : funding.length === 0 ? (

                <tr>

                  <td
                    colSpan={8}
                    className="
                      py-20
                      text-center
                      text-gray-500
                    "
                  >
                    لا توجد عمليات تغذية حتى الآن
                  </td>

                </tr>

              ) : (

                funding.map((item) => {

                  const attachments =
                    getAttachments(item);

                  const firstAttachment =
                    attachments[0];

                  const attachmentUrl =
                    getAttachmentUrl(
                      firstAttachment
                    );

                  return (

                    <tr
                      key={item.id}
                      className="
                        bg-[#05261F]
                        transition
                        hover:bg-[#073529]/60
                      "
                    >

                      <td className="whitespace-nowrap px-4 py-4 text-gray-300">
                        {formatDate(
                          item.created_at
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 font-semibold text-white">
                        {formatDate(
                          item.funding_date
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 font-bold text-emerald-300">
                        {accountNameMap.get(
                          Number(
                            item.account_id
                          )
                        ) ?? "-"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-gray-300">
                        {getReferenceNumber(
                          item
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 font-extrabold text-emerald-300">
                        {formatMoney(
                          Number(
                            item.amount ?? 0
                          )
                        )}{" "}
                        ريال
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-gray-300">
                        {getPaymentMethod(
                          item
                        )}
                      </td>

                      <td className="max-w-[320px] px-4 py-4 text-gray-300">
                        <div className="truncate">
                          {getCleanDescription(
                            item
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-center">

                        {attachmentUrl ? (

                          <a
                            href={attachmentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="
                              inline-flex
                              items-center
                              gap-2
                              rounded-lg
                              border
                              border-[#C49A3A]/25
                              bg-[#C49A3A]/10
                              px-3
                              py-2
                              text-xs
                              font-bold
                              text-[#F6D878]
                              transition
                              hover:border-[#D4AD4D]
                              hover:bg-[#C49A3A]
                              hover:text-white
                            "
                            title="عرض المرفق"
                          >
                            <Paperclip size={15} />
                            عرض
                          </a>

                        ) : (

                          <span
                            className="
                              text-xs
                              text-gray-600
                            "
                          >
                            -
                          </span>

                        )}

                      </td>

                    </tr>

                  );
                })

              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}
