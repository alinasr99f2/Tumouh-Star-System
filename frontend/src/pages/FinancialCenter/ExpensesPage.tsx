import { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Trash2, Search, FileSpreadsheet, FileText, Printer, Download, CalendarDays, Paperclip } from "lucide-react";
import { supabase } from "../../utils/supabase";
import { projects } from "../../data/projects";
type Expense = {
  id: string | number;
  entryDate?: string | null;
  expenseDate?: string | null;
  projectId?: string | number | null;
  accountId?: string | number | null;
  accountName?: string | null;
  categoryId?: string | number | null;
  itemId?: string | number | null;
  itemName?: string | null;
  supplier?: string | null;
  supplierName?: string | null;
  voucherNo?: string | null;
  invoiceNo?: string | null;
  paymentMethod?: string | null;
  stageId?: string | number | null;
  stageName?: string | null;
  amount?: number | string | null;
  tax?: number | string | null;
  total?: number | string | null;
  description?: string | null;
  attachmentUrl?: string | null;
  attachmentPath?: string | null;
  attachmentName?: string | null;
};
type Account = {
  id: number;
  name: string;
  type: string;
  currentBalance: number;
  totalFunding: number;
  totalExpenses: number;
  operationsCount: number;
};
type Category = {
  id: number;
  name: string;
};
type ExpenseItem = {
  id: number;
  name: string;
  category_id: number;
};
type ExpensesPageProps = {
  expenses: Expense[];
  accounts: Account[];
  onAddExpense?: () => void;
  onViewExpense?: (expense: Expense) => void;
  onEditExpense?: (expense: Expense) => void;
  onDeleteExpense?: (expense: Expense) => void | Promise<void>;
  refreshKey?: number;
};
type RawExpense = Expense & {
  entry_date?: string | null;
  expense_date?: string | null;
  date?: string | null;
  project_id?: string | number | null;
  account_id?: string | number | null;
  category_id?: string | number | null;
  item_id?: string | number | null;
  voucher_no?: string | null;
  voucher_number?: string | null;
  invoiceNo?: string | null;
  invoice_no?: string | null;
  invoice_number?: string | null;
  supplierName?: string | null;
  supplier_name?: string | null;
  payment_method?: string | null;
  amount_before_tax?: number | string | null;
  before_tax?: number | string | null;
  subtotal?: number | string | null;
  net_amount?: number | string | null;
  tax_amount?: number | string | null;
  vat?: number | string | null;
  total_amount?: number | string | null;
  grand_total?: number | string | null;
  stage_id?: string | number | null;
  stage_name?: string | null;
  phase_id?: string | number | null;
  phase_name?: string | null;
  stage?: string | null;
  phase?: string | null;
  account_name?: string | null;
  accountName?: string | null;
  item_name?: string | null;
  itemName?: string | null;
  created_at?: string | null;
  attachment?: string | null;
  attachment_url?: string | null;
  attachment_path?: string | null;
  attachment_name?: string | null;
};
const normalizeExpense = (
  expense: RawExpense
): Expense => {
  const taxValue =
    expense.tax ??
    expense.tax_amount ??
    expense.vat ??
    0;
  const rawTotalValue =
    expense.total ??
    expense.total_amount ??
    expense.grand_total ??
    null;
  const explicitAmount =
    expense.amount ??
    expense.amount_before_tax ??
    expense.before_tax ??
    expense.subtotal ??
    expense.net_amount ??
    null;
  // بعض السجلات القديمة عندنا فيها amount = 0 بينما الإجمالي
  // والضريبة محفوظان بشكل صحيح. في هذه الحالة نحسب قبل الضريبة
  // من الإجمالي - الضريبة بدل عرض 0.
  const amountNumber = Number(explicitAmount ?? 0);
  const taxNumber = Number(taxValue ?? 0);
  const totalNumber =
    rawTotalValue === null || rawTotalValue === undefined || rawTotalValue === ""
      ? amountNumber + taxNumber
      : Number(rawTotalValue);
  // لو amount القديم محفوظ بصفر/فارغ، احسب قبل الضريبة فعليًا من الإجمالي - الضريبة.
  // ولو الضريبة = 0، فقبل الضريبة يساوي الإجمالي.
  const amountValue =
    amountNumber === 0 && totalNumber > 0
      ? Math.max(totalNumber - taxNumber, 0)
      : amountNumber;
  const totalValue = totalNumber;
  return {
    ...expense,
    id: expense.id,
    entryDate:
      expense.entryDate ??
      expense.entry_date ??
      expense.created_at ??
      null,
    expenseDate:
      expense.expenseDate ??
      expense.expense_date ??
      expense.date ??
      null,
    projectId:
      expense.projectId ??
      expense.project_id ??
      null,
    accountId:
      expense.accountId ??
      expense.account_id ??
      null,
    accountName:
      expense.accountName ??
      expense.account_name ??
      null,
    categoryId:
      expense.categoryId ??
      expense.category_id ??
      null,
    itemId:
      expense.itemId ??
      expense.item_id ??
      null,
    itemName:
      expense.itemName ??
      expense.item_name ??
      null,
    supplier:
      expense.supplier ??
      expense.supplierName ??
      expense.supplier_name ??
      null,
    supplierName:
      expense.supplierName ??
      expense.supplier_name ??
      expense.supplier ??
      null,
    voucherNo:
      expense.voucherNo ??
      expense.voucher_no ??
      expense.voucher_number ??
      expense.invoiceNo ??
      expense.invoice_no ??
      expense.invoice_number ??
      null,
    invoiceNo:
      expense.invoiceNo ??
      expense.invoice_no ??
      expense.invoice_number ??
      expense.voucherNo ??
      expense.voucher_no ??
      expense.voucher_number ??
      null,
    stageId:
      expense.stageId ??
      expense.stage_id ??
      expense.phase_id ??
      null,
    stageName:
      expense.stageName ??
      expense.stage_name ??
      expense.phase_name ??
      (typeof expense.stage === "string" ? expense.stage : null) ??
      (typeof expense.phase === "string" ? expense.phase : null) ??
      null,
    paymentMethod:
      expense.paymentMethod ??
      expense.payment_method ??
      null,
    amount: amountValue,
    tax: taxValue,
    total: totalValue,
    description: expense.description ?? null,
    attachmentUrl:
      expense.attachmentUrl ??
      expense.attachment_url ??
      (typeof expense.attachment === "string" && expense.attachment.startsWith("http") ? expense.attachment : null),
    attachmentPath:
      expense.attachmentPath ??
      expense.attachment_path ??
      (typeof expense.attachment === "string" && !expense.attachment.startsWith("http") ? expense.attachment : null),
    attachmentName:
      expense.attachmentName ??
      expense.attachment_name ??
      null,
  };
};
const ViewBox = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => {
  return (
    <div
      className="
        rounded-2xl
        border
        border-white/10
        bg-[#073529]
        p-4
      "
    >
      <p className="mb-2 text-xs text-[#9CBAB0]">
        {label}
      </p>
      <p className="font-bold text-white">
        {value || "-"}
      </p>
    </div>
  );
};
export default function ExpensesPage({
  expenses,
  accounts,
  onAddExpense,
  onViewExpense,
  onEditExpense,
  onDeleteExpense,
  refreshKey = 0,
}: ExpensesPageProps) {
  // =====================================================
  // المصروفات
  //
  // الصفحة كانت تعتمد فقط على expenses القادمة من Dashboard.
  // لو Dashboard لم يحمّل البيانات القديمة، كانت الصفحة تظهر
  // "لا توجد بيانات حتى الآن" رغم أن البيانات موجودة في Supabase.
  // لذلك نحمّل المصروفات مباشرة من جدول expenses هنا أيضًا.
  // =====================================================
  const [loadedExpenses, setLoadedExpenses] = useState<Expense[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [expensesError, setExpensesError] = useState<string | null>(null);
  const loadExpenses = async () => {
    setExpensesLoading(true);
    setExpensesError(null);
    const { data, error } = await supabase
      .from("expenses")
      .select("*");
    if (error) {
      console.error("خطأ في تحميل المصروفات:", error);
      setExpensesError(error.message);
      setLoadedExpenses([]);
      setExpensesLoading(false);
      return;
    }
    const rows = ((data ?? []) as RawExpense[])
      .map(normalizeExpense)
      .sort((a, b) => {
        const dateA = String(a.expenseDate ?? a.entryDate ?? "");
        const dateB = String(b.expenseDate ?? b.entryDate ?? "");
        return dateB.localeCompare(dateA);
      });
    setLoadedExpenses(rows);
    setExpensesLoading(false);
  };
  useEffect(() => {
    loadExpenses();
  }, [refreshKey]);
  // نستخدم البيانات التي تم تحميلها مباشرة من Supabase عندما تكون موجودة،
  // وإلا نرجع للبيانات القادمة من Dashboard.
  const sourceExpenses = useMemo(() => {
    return loadedExpenses.length > 0 ? loadedExpenses : expenses;
  }, [loadedExpenses, expenses]);
  const normalizedExpenses = useMemo(() => {
    return sourceExpenses.map(normalizeExpense);
  }, [sourceExpenses]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);
  const [categoryStageMap, setCategoryStageMap] = useState<Record<string, string>>({});
  const todayStringSafe = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const currentMonthString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const currentYearString = () => String(new Date().getFullYear());
  const [search, setSearch] = useState("");
  // فلاتر الفترات التي تتحكم في كروت اليوم/الأسبوع/الشهر/السنة
  const [selectedDay, setSelectedDay] = useState(todayStringSafe());
  const [weekFrom, setWeekFrom] = useState("");
  const [weekTo, setWeekTo] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [exportMenu, setExportMenu] = useState<string | null>(null);
  // =========================================
  // تحميل التصنيفات والبنود من Supabase
  // =========================================
  useEffect(() => {
    const loadCategoriesAndItems = async () => {
      const [
        { data: categoriesData, error: categoriesError },
        { data: itemsData, error: itemsError },
      ] = await Promise.all([
        supabase
          .from("categories")
          .select("id, name")
          .order("id", { ascending: true }),
        supabase
          .from("expense_items")
          .select("id, name, category_id")
          .order("id", { ascending: true }),
      ]);
      if (categoriesError) {
        console.error(
          "خطأ في تحميل التصنيفات:",
          categoriesError
        );
      } else {
        setCategories(categoriesData ?? []);
      }
      if (itemsError) {
        console.error(
          "خطأ في تحميل البنود:",
          itemsError
        );
      } else {
        setExpenseItems(itemsData ?? []);
      }
    };
    loadCategoriesAndItems();
    try {
      const saved = localStorage.getItem("tumouh-category-stage-map");
      setCategoryStageMap(saved ? JSON.parse(saved) : {});
    } catch {
      setCategoryStageMap({});
    }
  }, []);
  // =========================================
  // أسماء المشروع والعهدة والتصنيف والبند
  // =========================================
  const getProjectName = (
    id?: string | number | null
  ) => {
    if (id === null || id === undefined || id === "") {
      return "-";
    }
    return (
      projects.find(
        (project) =>
          String(project.id) === String(id)
      )?.name ?? "-"
    );
  };
  const getAccountName = (
    id?: string | number | null
  ) => {
    if (id === null || id === undefined || id === "") {
      return "-";
    }
    return (
      accounts.find(
        (account) =>
          String(account.id) === String(id)
      )?.name ?? "-"
    );
  };
  const getCategoryName = (
    id?: string | number | null
  ) => {
    if (id === null || id === undefined || id === "") {
      return "-";
    }
    return (
      categories.find(
        (category) =>
          String(category.id) === String(id)
      )?.name ?? "-"
    );
  };
  const getItemName = (
    id?: string | number | null
  ) => {
    if (id === null || id === undefined || id === "") {
      return "-";
    }
    return (
      expenseItems.find(
        (item) =>
          String(item.id) === String(id)
      )?.name ?? "-"
    );
  };
  const getStageName = (expense: Expense) => {
  if (expense.stageName) return expense.stageName;
  // استرجاع اسم المرحلة المحفوظ مع المصروف
  try {
    const savedStageMap = JSON.parse(
      localStorage.getItem("tumouh-expense-stage-map") || "{}"
    );
    const savedStage = savedStageMap[String(expense.id)];
    if (savedStage?.name) {
      return savedStage.name;
    }
  } catch {
    // تجاهل خطأ localStorage
  }
  const id = String(expense.stageId ?? "").trim().toLowerCase();
  const knownStages: Record<string, string> = {
    preliminary: "تمهيدي",
    structural: "إنشائي",
    finishing: "تشطيبي",
    decorations: "ديكورات",
  };
  const mappedStage = categoryStageMap[String(expense.categoryId ?? "")];
  if (mappedStage && knownStages[mappedStage]) {
    return knownStages[mappedStage];
  }
  return (
    knownStages[id] ??
    (expense.stageId &&
    !/^\d+$/.test(String(expense.stageId))
      ? String(expense.stageId)
      : "غير محدد")
  );
};
  // =========================================
  // التاريخ بدون مشاكل timezone
  // =========================================
  const getDateString = (
    value?: string | null
  ) => {
    if (!value) return "";
    return String(value).split("T")[0];
  };
  const formatDate = (
    value?: string | null
  ) => {
    const date = getDateString(value);
    if (!date) return "-";
    const parts = date.split("-");
    if (parts.length !== 3) {
      return date;
    }
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };
  // =========================================
  // تاريخ اليوم
  // =========================================
  const today = new Date();
  const todayString =
    `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-${String(
      today.getDate()
    ).padStart(2, "0")}`;
  // =========================================
  // بداية الفترة الأسبوعية: اليوم + 6 أيام قبله
  // =========================================
  const getRolling7DayStart = () => {
    const date = new Date(today);
    date.setDate(date.getDate() - 6);
    return `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")}`;
  };
  const weekStartString = getRolling7DayStart();
  // القيم الافتراضية للفلاتر الزمنية
  useEffect(() => {
    setSelectedDay(todayString);
    setWeekFrom(weekStartString);
    setWeekTo(todayString);
    setSelectedMonth(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`);
    setSelectedYear(String(today.getFullYear()));
  }, [todayString, weekStartString]);
  // =========================================
  // المبلغ الفعلي للمصروف
  // =========================================
  const getExpenseTotal = (expense: any) => {
    const directTotal = Number(
      expense?.total ??
      expense?.grand_total ??
      expense?.total_amount ??
      expense?.totalAmount ??
      0
    );
    if (directTotal > 0) {
      return directTotal;
    }
    return (
      Number(
        expense?.amount ??
        expense?.subtotal ??
        expense?.before_tax ??
        expense?.totalBeforeTax ??
        0
      ) +
      Number(expense?.tax ?? expense?.tax_amount ?? 0)
    );
  };
  // =========================================
  // حساب الإجماليات حسب الفترة المختارة
  // =========================================
  const todayExpenses = useMemo(() => {
    return normalizedExpenses
      .filter((expense) => getDateString(expense.expenseDate) === selectedDay)
      .reduce((sum, expense) => sum + getExpenseTotal(expense), 0);
  }, [normalizedExpenses, selectedDay]);
  const weekExpenses = useMemo(() => {
    if (!weekFrom || !weekTo) return 0;
    const from = weekFrom <= weekTo ? weekFrom : weekTo;
    const to = weekFrom <= weekTo ? weekTo : weekFrom;
    return normalizedExpenses
      .filter((expense) => {
        const date = getDateString(expense.expenseDate);
        return Boolean(date) && date >= from && date <= to;
      })
      .reduce((sum, expense) => sum + getExpenseTotal(expense), 0);
  }, [normalizedExpenses, weekFrom, weekTo]);
  const monthExpenses = useMemo(() => {
    if (!selectedMonth) return 0;
    return normalizedExpenses
      .filter((expense) => getDateString(expense.expenseDate).startsWith(selectedMonth))
      .reduce((sum, expense) => sum + getExpenseTotal(expense), 0);
  }, [normalizedExpenses, selectedMonth]);
  const yearExpenses = useMemo(() => {
    if (!selectedYear) return 0;
    return normalizedExpenses
      .filter((expense) => getDateString(expense.expenseDate).startsWith(selectedYear))
      .reduce((sum, expense) => sum + getExpenseTotal(expense), 0);
  }, [normalizedExpenses, selectedYear]);
  // =========================================
  // البحث
  // =========================================
  const filteredExpenses = useMemo(() => {
    const text = search.trim().toLowerCase();
    if (!text) {
      return normalizedExpenses;
    }
    return normalizedExpenses.filter((expense) => {
      const project = getProjectName(String(expense.projectId ?? "")).toLowerCase();
      const account = getAccountName(String(expense.accountId ?? "")).toLowerCase();
      const category = getCategoryName(String(expense.categoryId ?? "")).toLowerCase();
      const item = getItemName(String(expense.itemId ?? "")).toLowerCase();
      const supplier = String(expense.supplier ?? expense.supplierName ?? "").toLowerCase();
      const voucher = String(expense.voucherNo ?? expense.invoiceNo ?? "").toLowerCase();
      const payment = getPaymentMethod(expense.paymentMethod).toLowerCase();
      const stage = getStageName(expense).toLowerCase();
      const dateText = `${getDateString(expense.entryDate)} ${getDateString(expense.expenseDate)}`.toLowerCase();
      const amountText = `${expense.amount ?? ""} ${expense.tax ?? ""} ${expense.total ?? ""}`.toLowerCase();
      const description = String(expense.description ?? "").toLowerCase();
      const allRawFields = JSON.stringify(expense).toLowerCase();
      return (
        project.includes(text) ||
        account.includes(text) ||
        category.includes(text) ||
        item.includes(text) ||
        supplier.includes(text) ||
        voucher.includes(text) ||
        payment.includes(text) ||
        stage.includes(text) ||
        dateText.includes(text) ||
        amountText.includes(text) ||
        description.includes(text) ||
        allRawFields.includes(text)
      );
    });
  }, [
    normalizedExpenses,
    accounts,
    categories,
    expenseItems,
    search,
  ]);
  // =========================================
  // طريقة الدفع
  // =========================================
  const getPaymentMethod = (
    value?: string | null
  ) => {
    switch (
      String(value ?? "")
        .trim()
        .toLowerCase()
    ) {
      case "cash":
      case "نقد":
      case "نقدًا":
      case "نقدا":
        return "💵 نقدًا";
      case "bank":
      case "bank transfer":
      case "bank_transfer":
      case "transfer":
      case "تحويل":
      case "تحويل بنكي":
        return "🏦 تحويل بنكي";
      case "card":
      case "credit card":
      case "debit card":
      case "بطاقة":
        return "💳 بطاقة";
      case "cheque":
      case "check":
      case "شيك":
        return "🧾 شيك";
      case "other":
      case "أخرى":
      case "اخرى":
        return "💰 أخرى";
      default:
        return value ? String(value) : "-";
    }
  };
  // =========================================
  // عرض
  // =========================================
  const [selectedExpense, setSelectedExpense] =
  useState<Expense | null>(null);
  const handleView = (expense: Expense) => {
    setSelectedExpense(expense);
  };
  // =========================================
  // تعديل
  // =========================================
  const handleEdit = async (
    expense: Expense
  ) => {
    if (onEditExpense) {
      await onEditExpense(expense);
      await loadExpenses();
      return;
    }
    alert(
      "زر التعديل جاهز، وسنربطه الآن بنافذة تعديل المصروف."
    );
  };
  // =========================================
  // حذف
  // =========================================
  const handleDelete = async (
    expense: Expense
  ) => {
    const confirmed =
      window.confirm(
        "هل أنت متأكد من حذف هذا المصروف؟\n\n" +
          `الإجمالي: ${Number(
            expense.total ?? 0
          ).toLocaleString()} ريال`
      );
    if (!confirmed) return;
    if (onDeleteExpense) {
      await onDeleteExpense(expense);
      await loadExpenses();
      return;
    }
    const { error } =
      await supabase
        .from("expenses")
        .delete()
        .eq("id", expense.id);
    if (error) {
      console.error(
        "خطأ في حذف المصروف:",
        error
      );
      alert(
        `تعذر حذف المصروف:\n${error.message}`
      );
      return;
    }
    alert("تم حذف المصروف بنجاح.");
    // تحديث الجدول مباشرة بعد الحذف بدون إعادة تحميل الموقع بالكامل.
    await loadExpenses();
  };
  // =========================================
  // التصدير والطباعة
  // =========================================
  const exportRows = (rows: Expense[]) => rows.map((expense) => ({
    "تاريخ الإدخال": formatDate(expense.entryDate),
    "تاريخ المصروف": formatDate(expense.expenseDate),
    "رقم الفاتورة": expense.voucherNo || "-",
    "المشروع": getProjectName(expense.projectId),
    "المرحلة": getStageName(expense),
    "العهدة": expense.accountName ?? getAccountName(expense.accountId),
    "التصنيف": getCategoryName(expense.categoryId),
    "البند": expense.itemName ?? getItemName(expense.itemId),
    "المورد": expense.supplier || "-",
    "طريقة الدفع": getPaymentMethod(expense.paymentMethod),
    "قبل الضريبة": Number(expense.amount ?? 0),
    "الضريبة": Number(expense.tax ?? 0),
    "الإجمالي": Number(expense.total ?? 0),
    "الوصف": expense.description || "-",
  }));
  const downloadExcel = (title: string, rows: Expense[]) => {
    const data = exportRows(rows);
    const headers = Object.keys(data[0] ?? {
      "تاريخ المصروف": "",
      "المشروع": "",
      "الإجمالي": "",
    });
    const table = `\ufeff<table border="1" dir="rtl"><caption><b>${title}</b></caption><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${data.map((row) => `<tr>${headers.map((h) => `<td>${escapeHtml(String((row as any)[h] ?? ""))}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    const blob = new Blob([table], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^\u0600-\u06FF\w\\-]+/g, "-")}.xls`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  const escapeHtml = (value: string) => value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
  const printRows = (title: string, rows: Expense[]) => {
    const data = exportRows(rows);
    const headers = Object.keys(data[0] ?? { "تاريخ المصروف": "", "الإجمالي": "" });
    const win = window.open("", "_blank", "noopener,noreferrer,width=1200,height=800");
    if (!win) {
      alert("المتصفح منع نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم حاول مرة أخرى.");
      return;
    }
    win.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{font-size:22px;margin-bottom:18px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #aaa;padding:7px;text-align:center}th{background:#eee;font-weight:700}@media print{body{padding:8px}}</style></head><body><h1>${escapeHtml(title)}</h1><table><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${data.map((row) => `<tr>${headers.map((h) => `<td>${escapeHtml(String((row as any)[h] ?? ""))}</td>`).join("")}</tr>`).join("")}</tbody></table><script>window.onload=function(){window.print();}</script></body></html>`);
    win.document.close();
  };
  const getPeriodRows = (type: "day" | "week" | "month" | "year") => {
    return normalizedExpenses.filter((expense) => {
      const date = getDateString(expense.expenseDate);
      if (!date) return false;
      if (type === "day") return date === selectedDay;
      if (type === "month") return date.startsWith(selectedMonth);
      if (type === "year") return date.startsWith(selectedYear);
      const from = weekFrom <= weekTo ? weekFrom : weekTo;
      const to = weekFrom <= weekTo ? weekTo : weekFrom;
      return Boolean(from && to) && date >= from && date <= to;
    });
  };
  const exportAllExpenses = (mode: "excel" | "print") => {
    const title = "تقرير جميع حركات المصروفات";
    const rows = normalizedExpenses;
    if (mode === "excel") downloadExcel(title, rows);
    else printRows(title, rows);
    setExportMenu(null);
  };
  const exportPeriod = (type: "day" | "week" | "month", mode: "excel" | "print") => {
    const labels = { day: "مصروفات اليوم المحدد", week: "مصروفات الفترة المحددة", month: "مصروفات الشهر المحدد" };
    const rows = getPeriodRows(type);
    const title = labels[type];
    if (mode === "excel") downloadExcel(title, rows);
    else printRows(title, rows);
    setExportMenu(null);
  };
  // =========================================
  // الواجهة
  // =========================================
  return (
    <div
      dir="rtl"
      className="space-y-6"
    >
      {/* ===================================== */}
      {/* الإحصائيات */}
      {/* ===================================== */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {/* اليوم */}
        <div className="rounded-[24px] border border-[#C49A3A]/25 bg-gradient-to-br from-[#0B4537] via-[#073529] to-[#05261F] p-4 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-[#9CBAB0]">مصروفات اليوم</p>
              <h2 className="mt-2 text-3xl font-extrabold text-[#F6D878]">{todayExpenses.toLocaleString()}</h2>
              <span className="text-xs text-[#77998D]">ريال</span>
            </div>
            <CalendarDays size={28} className="text-[#F6D878]/60" />
          </div>
          <input type="date" value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} className="mt-4 w-full rounded-xl border border-white/10 bg-[#073529] px-3 py-2 text-sm text-white outline-none focus:border-[#D4AD4D]" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => exportPeriod("day", "excel")} className="flex items-center justify-center gap-1 rounded-lg bg-emerald-500/15 px-2 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25"><FileSpreadsheet size={15} /> Excel</button>
            <button type="button" onClick={() => exportPeriod("day", "print")} className="flex items-center justify-center gap-1 rounded-lg bg-[#0E5141]/15 px-2 py-2 text-xs font-bold text-[#D4E8DF] hover:bg-[#0E5141]/25"><Printer size={15} /> PDF / طباعة</button>
          </div>
        </div>
        {/* الأسبوع */}
        <div className="rounded-[24px] border border-[#C49A3A]/25 bg-gradient-to-br from-[#0B4537] via-[#073529] to-[#05261F] p-4 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-[#9CBAB0]">مصروفات الفترة</p>
              <h2 className="mt-2 text-3xl font-extrabold text-[#D4AD4D]">{weekExpenses.toLocaleString()}</h2>
              <span className="text-xs text-[#77998D]">ريال</span>
            </div>
            <CalendarDays size={28} className="text-[#D4AD4D]/60" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <input type="date" value={weekFrom} onChange={(e) => setWeekFrom(e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#073529] px-2 py-2 text-xs text-white outline-none focus:border-[#D4AD4D]" />
            <input type="date" value={weekTo} onChange={(e) => setWeekTo(e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#073529] px-2 py-2 text-xs text-white outline-none focus:border-[#D4AD4D]" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => exportPeriod("week", "excel")} className="flex items-center justify-center gap-1 rounded-lg bg-emerald-500/15 px-2 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25"><FileSpreadsheet size={15} /> Excel</button>
            <button type="button" onClick={() => exportPeriod("week", "print")} className="flex items-center justify-center gap-1 rounded-lg bg-[#0E5141]/15 px-2 py-2 text-xs font-bold text-[#D4E8DF] hover:bg-[#0E5141]/25"><Printer size={15} /> PDF / طباعة</button>
          </div>
        </div>
        {/* الشهر */}
        <div className="rounded-[24px] border border-emerald-400/25 bg-gradient-to-br from-[#0B4537] via-[#073529] to-[#05261F] p-4 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-[#9CBAB0]">مصروفات الشهر</p>
              <h2 className="mt-2 text-3xl font-extrabold text-emerald-300">{monthExpenses.toLocaleString()}</h2>
              <span className="text-xs text-[#77998D]">ريال</span>
            </div>
            <CalendarDays size={28} className="text-emerald-300/60" />
          </div>
          <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="mt-4 w-full rounded-xl border border-white/10 bg-[#073529] px-3 py-2 text-sm text-white outline-none focus:border-emerald-300" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => exportPeriod("month", "excel")} className="flex items-center justify-center gap-1 rounded-lg bg-emerald-500/15 px-2 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25"><FileSpreadsheet size={15} /> Excel</button>
            <button type="button" onClick={() => exportPeriod("month", "print")} className="flex items-center justify-center gap-1 rounded-lg bg-[#0E5141]/15 px-2 py-2 text-xs font-bold text-[#D4E8DF] hover:bg-[#0E5141]/25"><Printer size={15} /> PDF / طباعة</button>
          </div>
        </div>
        {/* السنة */}
        <div className="rounded-[24px] border border-[#C49A3A]/30 bg-gradient-to-br from-[#0B4537] via-[#073529] to-[#05261F] p-4 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-[#9CBAB0]">إجمالي السنة</p>
              <h2 className="mt-2 text-3xl font-extrabold text-[#F6D878]">{yearExpenses.toLocaleString()}</h2>
              <span className="text-xs text-[#77998D]">ريال</span>
            </div>
            <CalendarDays size={28} className="text-[#F6D878]/60" />
          </div>
          <input type="number" min="2000" max="2100" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="mt-4 w-full rounded-xl border border-white/10 bg-[#073529] px-3 py-2 text-sm text-white outline-none focus:border-[#D4AD4D]" placeholder="السنة" />
          <div className="mt-3 rounded-lg bg-[#C49A3A]/10 px-2 py-2 text-center text-xs font-bold text-[#F6D878]">حدد السنة لعرض إجماليها</div>
        </div>
      </div>
      {/* ===================================== */}
      {/* شريط الأدوات */}
      {/* ===================================== */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#0B4537] via-[#073529] to-[#05261F] p-4">
        <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={onAddExpense} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#C49A3A] to-[#F6D878] px-5 py-3 font-bold text-[#16352B] transition hover:from-[#D4AD4D] hover:to-[#F6D878]">
              + إضافة مصروف
            </button>
            <div className="relative">
              <button type="button" onClick={() => setExportMenu(exportMenu === "all" ? null : "all")} className="flex items-center gap-2 rounded-xl border border-[#C49A3A]/30 bg-[#C49A3A]/10 px-5 py-3 font-bold text-[#D4E8DF] transition hover:bg-[#C49A3A]/20">
                <Download size={18} /> تصدير
              </button>
              {exportMenu === "all" && (
                <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-white/10 bg-[#073529] p-2 shadow-2xl">
                  <button type="button" onClick={() => exportAllExpenses("excel")} className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-sm font-bold text-emerald-300 hover:bg-white/5"><FileSpreadsheet size={17} /> Excel</button>
                  <button type="button" onClick={() => exportAllExpenses("print")} className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-sm font-bold text-[#D4E8DF] hover:bg-white/5"><FileText size={17} /> PDF</button>
                  <button type="button" onClick={() => exportAllExpenses("print")} className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-sm font-bold text-gray-200 hover:bg-white/5"><Printer size={17} /> طباعة</button>
                </div>
              )}
            </div>
          </div>
          <div className="relative w-full min-w-0 flex-1 sm:max-w-xl">
            <Search size={19} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#77998D]" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث في أي خانة من خانات المصروف..." className="w-full rounded-xl border border-white/10 bg-[#073529] py-3 pr-11 pl-4 text-white outline-none placeholder:text-[#77998D] focus:border-[#D4AD4D]" />
            {search && <button type="button" onClick={() => setSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-md px-2 text-[#9CBAB0] hover:bg-white/5 hover:text-white">×</button>}
          </div>
        </div>
      </div>
      {/* ===================================== */}
      {/* الجدول */}
      {/* ===================================== */}
      {expensesError && (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-right text-sm text-red-300">
          <div className="font-bold">تعذر تحميل المصروفات من قاعدة البيانات</div>
          <div className="mt-1 text-xs opacity-80">{expensesError}</div>
          <button
            type="button"
            onClick={loadExpenses}
            className="mt-3 rounded-lg bg-red-500 px-4 py-2 font-bold text-white hover:bg-red-600"
          >
            إعادة المحاولة
          </button>
        </div>
      )}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0B4537] via-[#073529] to-[#05261F]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1500px]">
            <thead className="bg-[#073529]">
              <tr>
                <th className="p-4 text-center text-sm text-white">
                  تاريخ الإدخال
                </th>
                <th className="p-4 text-center text-sm text-white">
                  تاريخ المصروف
                </th>
                <th className="p-4 text-center text-sm text-white">
                  رقم الفاتورة
                </th>
                <th className="p-4 text-center text-sm text-white">
                  المشروع
                </th>
                <th className="p-4 text-center text-sm text-white">
                  المرحلة
                </th>
                <th className="p-4 text-center text-sm text-white">
  المرفقات
</th>
                <th className="p-4 text-center text-sm text-white">
                  العهدة
                </th>
                <th className="p-4 text-center text-sm text-white">
                  التصنيف
                </th>
                <th className="p-4 text-center text-sm text-white">
                  البند
                </th>
                <th className="p-4 text-center text-sm text-white">
                  المورد
                </th>
                <th className="p-4 text-center text-sm text-white">
                  طريقة الدفع
                </th>
                <th className="p-4 text-center text-sm text-white">
                  قبل الضريبة
                </th>
                <th className="p-4 text-center text-sm text-white">
                  الضريبة
                </th>
                <th className="p-4 text-center text-sm text-white">
                  الإجمالي
                </th>
                <th className="p-4 text-center text-sm text-white">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody>
              {expensesLoading ? (
                <tr>
                  <td
                    colSpan={14}
                    className="p-12 text-center text-[#9CBAB0]"
                  >
                    جاري تحميل المصروفات...
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td
                    colSpan={14}
                    className="p-12 text-center text-[#77998D]"
                  >
                    لا توجد بيانات حتى الآن
                  </td>
                </tr>
              ) : (
                filteredExpenses.map(
                  (expense) => (
                    <tr
                      key={expense.id}
                      className="border-t border-white/10 transition hover:bg-[#073529]"
                    >
                      {/* تاريخ الإدخال */}
                      <td className="p-3 text-center text-gray-300">
                        {formatDate(
                          expense.entryDate
                        )}
                      </td>
                      {/* تاريخ المصروف */}
                      <td className="p-3 text-center text-gray-300">
                        {formatDate(
                          expense.expenseDate
                        )}
                      </td>
                      {/* رقم الفاتورة */}
                      <td className="p-3 text-center">
                        {expense.voucherNo || "-"}
                      </td>
                      {/* المشروع */}
                      <td className="p-3 text-center">
                        {getProjectName(
                          expense.projectId
                        )}
                      </td>
                      {/* المرحلة */}
                      <td className="p-3 text-center">
                        <span
                          className="inline-flex items-center gap-2 rounded-lg border border-[#C49A3A]/30 bg-[#C49A3A]/10 px-3 py-1 text-xs font-bold text-[#F6D878]"
                          title="مرحلة المشروع"
                        >
                          <span aria-hidden="true">🏗️</span>
                          <span>{getStageName(expense)}</span>
                        </span>
                      </td>
                      {/* المرفقات */}
<td className="p-3 text-center">
  {expense.attachmentUrl || expense.attachmentPath ? (
    <button
      type="button"
      onClick={() => {
        const url =
          expense.attachmentUrl || expense.attachmentPath;
        if (url) {
          window.open(url, "_blank");
        }
      }}
      title="عرض المرفق"
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#0E5141] text-white shadow-lg transition hover:scale-105 hover:bg-[#12634F]"
    >
      <Paperclip size={20} strokeWidth={2.4} />
    </button>
  ) : (
    <span className="text-[#77998D]">—</span>
  )}
</td>
                      {/* العهدة */}
                      <td className="p-3 text-center">
                        {expense.accountName ?? getAccountName(expense.accountId)}
                      </td>
                      {/* التصنيف */}
                      <td className="p-3 text-center">
                        {getCategoryName(
                          expense.categoryId
                        )}
                      </td>
                      {/* البند */}
                      <td className="p-3 text-center">
                        {expense.itemName ?? getItemName(expense.itemId)}
                      </td>
                      {/* المورد */}
                      <td className="p-3 text-center">
                        {expense.supplier || "-"}
                      </td>
                      {/* طريقة الدفع */}
                      <td className="p-3 text-center">
                        {getPaymentMethod(
                          expense.paymentMethod
                        )}
                      </td>
                      {/* قبل الضريبة */}
                      <td className="p-3 text-center font-semibold">
  {Number(
    expense.amount ?? 0
  ).toLocaleString()}
</td>
                      {/* الضريبة */}
                      <td className="p-3 text-center">
                        {Number(
                          expense.tax ?? 0
                        ).toLocaleString()}
                      </td>
                      {/* الإجمالي */}
                      <td className="p-3 text-center font-bold text-[#F6D878]">
                        {Number(
                          expense.total ?? 0
                        ).toLocaleString()}
                      </td>
                      {/* الإجراءات */}
                      <td className="p-3">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button type="button" onClick={() => handleView(expense)} title="عرض المصروف" className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0E5141] text-white shadow-lg transition hover:scale-105 hover:bg-[#12634F]">
                            <Eye size={21} strokeWidth={2.4} />
                          </button>
                          <button type="button" onClick={() => handleEdit(expense)} title="تعديل المصروف" className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-[#C49A3A] to-[#F6D878] text-[#16352B] shadow-lg transition hover:scale-105 hover:from-[#D4AD4D] hover:to-[#F6D878]">
                            <Pencil size={21} strokeWidth={2.4} />
                          </button>
                          <button type="button" onClick={() => handleDelete(expense)} title="حذف المصروف" className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500 text-white shadow-lg transition hover:scale-105 hover:bg-red-600">
                            <Trash2 size={21} strokeWidth={2.4} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
{selectedExpense && (
  <div
    className="fixed inset-0 z-[300] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
    onClick={() => setSelectedExpense(null)}
  >
    <div
      dir="rtl"
      className="w-full max-w-5xl max-h-[92vh] overflow-y-auto overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-br from-[#0B4537] via-[#073529] to-[#05261F] shadow-[0_30px_100px_rgba(0,0,0,.55)]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#073529] px-4 py-4 sm:px-7 sm:py-5">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C49A3A]/10 text-[#F6D878]">
              <FileText size={25} />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-white">تفاصيل المصروف</h2>
              <p className="mt-1 text-sm text-[#9CBAB0]">عرض كامل لبيانات وحركة المصروف</p>
            </div>
          </div>
        </div>
        <button type="button" onClick={() => setSelectedExpense(null)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xl text-[#9CBAB0] transition hover:bg-red-500/15 hover:text-red-400">×</button>
      </div>
      <div className="p-4 sm:p-7">
        <div className="mb-6 rounded-3xl border border-[#C49A3A]/30 bg-gradient-to-l from-[#C49A3A]/10 to-white/[0.02] p-6">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-sm text-[#9CBAB0]">إجمالي المصروف</p>
              <p className="mt-1 text-4xl font-extrabold text-[#F6D878]">{Number(selectedExpense.total ?? 0).toLocaleString()} <span className="text-sm text-[#77998D]">ريال</span></p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs text-[#77998D]">رقم العملية</p>
              <p className="mt-1 font-bold text-white">#{selectedExpense.id}</p>
            </div>
          </div>
        </div>
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ViewBox label="تاريخ الإدخال" value={formatDate(selectedExpense.entryDate)} />
          <ViewBox label="تاريخ المصروف" value={formatDate(selectedExpense.expenseDate)} />
          <ViewBox label="رقم الفاتورة" value={selectedExpense.voucherNo || "-"} />
          <ViewBox label="المشروع" value={getProjectName(selectedExpense.projectId)} />
          <ViewBox label="المرحلة" value={`🏗️ ${getStageName(selectedExpense)}`} />
          <ViewBox label="العهدة" value={selectedExpense.accountName ?? getAccountName(selectedExpense.accountId)} />
          <ViewBox label="التصنيف" value={getCategoryName(selectedExpense.categoryId)} />
          <ViewBox label="البند" value={selectedExpense.itemName ?? getItemName(selectedExpense.itemId)} />
          <ViewBox label="المورد" value={selectedExpense.supplier || "-"} />
          <ViewBox label="طريقة الدفع" value={getPaymentMethod(selectedExpense.paymentMethod)} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-2xl border border-white/10 bg-[#073529] p-5 text-center">
            <p className="text-sm text-[#9CBAB0]">قبل الضريبة</p>
            <p className="mt-2 text-2xl font-extrabold text-white">{Number(selectedExpense.amount ?? 0).toLocaleString()} <span className="text-xs text-[#77998D]">ريال</span></p>
          </div>
          <div className="rounded-2xl border border-[#C49A3A]/25 bg-[#C49A3A]/10 p-5 text-center">
            <p className="text-sm text-[#9CBAB0]">الضريبة</p>
            <p className="mt-2 text-2xl font-extrabold text-[#F6D878]">{Number(selectedExpense.tax ?? 0).toLocaleString()} <span className="text-xs text-[#77998D]">ريال</span></p>
          </div>
          <div className="rounded-2xl border border-[#C49A3A]/30 bg-[#C49A3A]/10 p-5 text-center">
            <p className="text-sm text-[#9CBAB0]">الإجمالي</p>
            <p className="mt-2 text-2xl font-extrabold text-[#F6D878]">{Number(selectedExpense.total ?? 0).toLocaleString()} <span className="text-xs text-[#77998D]">ريال</span></p>
          </div>
        </div>
        {selectedExpense.description && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-[#073529] p-5">
            <p className="mb-2 text-sm font-bold text-[#9CBAB0]">الوصف</p>
            <p className="leading-8 text-white">{selectedExpense.description}</p>
          </div>
        )}
        {(selectedExpense as any).attachmentUrl || (selectedExpense as any).attachment_url || (selectedExpense as any).attachmentPath ? (
          <div className="mt-6 flex items-center justify-between rounded-2xl border border-[#C49A3A]/25 bg-[#C49A3A]/10 p-5">
            <div>
              <p className="text-sm font-bold text-[#D4E8DF]">مرفق المصروف</p>
              <p className="mt-1 text-xs text-[#9CBAB0]">يوجد مستند مرفق بهذا المصروف</p>
            </div>
            <button type="button" onClick={() => { const url = (selectedExpense as any).attachmentUrl || (selectedExpense as any).attachment_url || (selectedExpense as any).attachmentPath; if (String(url).startsWith("http")) window.open(url, "_blank", "noopener,noreferrer"); else alert("لا يمكن فتح المرفق لأن الرابط غير متاح بشكل مباشر."); }} className="rounded-xl bg-[#0E5141] px-5 py-3 font-bold text-white hover:bg-[#12634F]">عرض المرفق</button>
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-[#073529] px-7 py-4">
        <button type="button" onClick={() => { setSelectedExpense(null); handleEdit(selectedExpense); }} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#C49A3A] to-[#F6D878] px-6 py-3 font-bold text-[#16352B] hover:from-[#D4AD4D] hover:to-[#F6D878]"><Pencil size={18} /> تعديل المصروف</button>
        <button type="button" onClick={() => setSelectedExpense(null)} className="rounded-xl border border-white/10 bg-white/5 px-7 py-3 font-bold text-gray-300 hover:bg-white/10 hover:text-white">إغلاق</button>
      </div>
    </div>
  </div>
)}    </div>
  );
}
