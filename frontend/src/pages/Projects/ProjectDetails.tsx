import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  WalletCards,
  Ruler,
  Calculator,
  Eye,
  Pencil,
  Home,
  X,
  FileSpreadsheet,
  FileText,
  Printer,
  Plus,
  RefreshCw,
  Download,
  ChevronDown,
  Trash2,
  BarChart3,
  Boxes,
} from "lucide-react";

import { projects } from "../../data/projects";
import { supabase } from "../../utils/supabase";
import { usePermissions } from "../../utils/permissions";
import ExpenseModal from "../../components/financial/ExpenseModal";

// إجمالي المصروفات المتوقع للمشروع، ويُستخدم كأساس لحساب النسبة المحددة للتصنيفات.
const DEFAULT_EXPECTED_PROJECT_EXPENSE_TOTAL = 7_200_000;
const expectedProjectExpenseTotal = DEFAULT_EXPECTED_PROJECT_EXPENSE_TOTAL;

type ProjectVilla = {
  id: number;
  project_id: number;
  villa_number: number;
  name: string | null;
  area: number | null;
  classification: string | null;
};

const getExpenseTotal = (expense: any) => {
  if (expense?.total !== null && expense?.total !== undefined && expense?.total !== "") {
    const total = Number(expense.total);
    if (Number.isFinite(total)) return total;
  }

  return (
    Number(expense?.amount_before_tax ?? expense?.amount ?? 0) +
    Number(expense?.tax ?? 0)
  );
};

const getExpenseAttachment = (expense: any) => {
  const attachmentUrl =
    expense?.attachmentUrl ??
    expense?.attachment_url ??
    (typeof expense?.attachment === "string" && expense.attachment.startsWith("http")
      ? expense.attachment
      : null);
  const attachmentPath =
    expense?.attachmentPath ??
    expense?.attachment_path ??
    (typeof expense?.attachment === "string" && !expense.attachment.startsWith("http")
      ? expense.attachment
      : null);
  return attachmentUrl || attachmentPath || null;
};

const getExpenseAttachmentName = (expense: any) =>
  String(expense?.attachmentName ?? expense?.attachment_name ?? "المرفق");

const localDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canEditProject = hasPermission("projects_edit");
  const canAddProject = hasPermission("projects_add");
  const canDeleteProject = hasPermission("projects_delete");
  const canExportReports = hasPermission("reports_export");
  const canPrintReports = hasPermission("reports_print");

  const project = projects.find(
    (p) => p.id === Number(id)
  );

  const [projectExpenses, setProjectExpenses] = useState<any[]>([]);
  const [projectVillas, setProjectVillas] = useState<ProjectVilla[]>([]);
  const [topCostItems, setTopCostItems] = useState<any[]>([]);
  const [showAllCostItems, setShowAllCostItems] = useState(false);
  const [showProjectExpenseOverview, setShowProjectExpenseOverview] = useState(false);
  const [showVillasOverview, setShowVillasOverview] = useState(false);
  const [editingVilla, setEditingVilla] = useState<ProjectVilla | null>(null);
  const [selectedVilla, setSelectedVilla] = useState<ProjectVilla | null>(null);
  const [loadingProjectData, setLoadingProjectData] = useState(true);
  const [projectDataError, setProjectDataError] = useState<string | null>(null);

  // Expense management state
  const [accounts, setAccounts] = useState<any[]>([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<any | null>(null);
  const [openExpenseExport, setOpenExpenseExport] = useState<string | null>(null);
  const [expenseReferenceDate, setExpenseReferenceDate] = useState(localDateString());

  // إجمالي مساحة المشروع قابل للتعديل من كارت إجمالي المساحة.
  const [projectTotalArea, setProjectTotalArea] = useState<number>(0);
  const [editingProjectArea, setEditingProjectArea] = useState(false);
  const [projectAreaInput, setProjectAreaInput] = useState("");
  const [savingProjectArea, setSavingProjectArea] = useState(false);

  // قيمة الأرض قابلة للتعديل من كارت قيمة الأرض.
  const [projectLandValue, setProjectLandValue] = useState<number>(0);
  const [editingProjectLandValue, setEditingProjectLandValue] = useState(false);
  const [projectLandValueInput, setProjectLandValueInput] = useState("");
  const [savingProjectLandValue, setSavingProjectLandValue] = useState(false);

  // إجمالي المصاريف المتوقعة للمشروع قابل للتعديل والحفظ محليًا.
  const [expectedProjectExpenseTotal, setExpectedProjectExpenseTotal] = useState<number>(DEFAULT_EXPECTED_PROJECT_EXPENSE_TOTAL);
  const [editingExpectedProjectExpense, setEditingExpectedProjectExpense] = useState(false);
  const [expectedProjectExpenseInput, setExpectedProjectExpenseInput] = useState(
    String(DEFAULT_EXPECTED_PROJECT_EXPENSE_TOTAL)
  );
  const [savingExpectedProjectExpense, setSavingExpectedProjectExpense] = useState(false);

  // Lookup data used by the project expense table.
  const [categories, setCategories] = useState<any[]>([]);
  const [expenseItems, setExpenseItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);

  const expenseRows = projectExpenses;

  const todayKey = localDateString();
  const referenceDateObject = new Date(`${expenseReferenceDate}T00:00:00`);
  const weekStartDate = new Date(referenceDateObject);
  weekStartDate.setHours(0, 0, 0, 0);
  weekStartDate.setDate(referenceDateObject.getDate() - referenceDateObject.getDay());

  const weekStartKey = localDateString(weekStartDate);
  const monthStartKey = localDateString(
    new Date(referenceDateObject.getFullYear(), referenceDateObject.getMonth(), 1)
  );

  const getExpenseDateValue = (expense: any) =>
    String(
      expense?.expenseDate ??
        expense?.date ??
        expense?.entryDate ??
        expense?.entry_date ??
        ""
    ).slice(0, 10);

  const villaNameMap = useMemo(
    () =>
      new Map<number, string>(
        projectVillas.map((villa) => [
          Number(villa.id),
          villa.name || `فيلا ${villa.villa_number}`,
        ])
      ),
    [projectVillas]
  );

  const accountNameMap = useMemo(
    () =>
      new Map<number, string>(
        accounts.map((account: any) => [
          Number(account.id),
          String(account.name ?? `عهدة ${account.id}`),
        ])
      ),
    [accounts]
  );

  const categoryNameMap = useMemo(
    () =>
      new Map<number, string>(
        categories.map((category: any) => [
          Number(category.id),
          String(category.name ?? "غير مصنف"),
        ])
      ),
    [categories]
  );

  const stageNameMap = useMemo(
    () =>
      new Map<number, string>(
        stages.map((stage: any) => [
          Number(stage.id),
          String(stage.name ?? "غير محدد"),
        ])
      ),
    [stages]
  );

  const getExpenseStageName = (expense: any) => {
    const directStageId = expense?.stageId ?? expense?.stage_id;
    const category = categories.find(
      (item: any) => Number(item.id) === Number(expense?.categoryId ?? expense?.category_id)
    );
    const stageId = directStageId ?? category?.stage_id ?? category?.stageId;
    return stageId ? stageNameMap.get(Number(stageId)) ?? "غير محدد" : "غير محدد";
  };

  const itemNameMap = useMemo(
    () =>
      new Map<number, string>(
        expenseItems.map((item: any) => [
          Number(item.id),
          String(item.name ?? "غير محدد"),
        ])
      ),
    [expenseItems]
  );

  const supplierNameMap = useMemo(
    () =>
      new Map<number, string>(
        suppliers.map((supplier: any) => [
          Number(supplier.id),
          String(supplier.name ?? ""),
        ])
      ),
    [suppliers]
  );

  const loadProjectData = async () => {
    if (!project) return;

    setLoadingProjectData(true);
    setProjectDataError(null);

    const [
      expensesResult,
      villasResult,
      topCostResult,
      accountsResult,
      categoriesResult,
      itemsResult,
      suppliersResult,
      stagesResult,
      projectMetaResult,
    ] = await Promise.all([
      supabase
        .from("expenses")
        .select("*")
        .eq("project_id", project.id)
        .order("id", { ascending: false }),

      supabase
        .from("project_villas")
        .select("id, project_id, villa_number, name, area, classification")
        .eq("project_id", project.id)
        .order("villa_number", { ascending: true }),

      supabase
        .from("expenses")
        .select("category_id, total, amount_before_tax, tax, categories(name)")
        .eq("project_id", project.id),

      supabase
        .from("accounts")
        .select("id, name, type, balance")
        .order("id", { ascending: true }),

      supabase
        .from("categories")
        .select("id, name, stage_id")
        .order("id", { ascending: true }),

      supabase
        .from("expense_items")
        .select("id, name, category_id")
        .order("id", { ascending: true }),

      supabase
        .from("suppliers")
        .select("id, name")
        .order("id", { ascending: true }),

      supabase
        .from("expense_stages")
        .select("id, name, is_active")
        .eq("is_active", true)
        .order("id", { ascending: true }),

      supabase
        .from("projects")
        .select("id, total_area, land_value")
        .eq("id", project.id)
        .maybeSingle(),
    ]);

    if (expensesResult.error) {
      console.error("خطأ في تحميل مصروفات المشروع:", expensesResult.error);
      setProjectDataError(expensesResult.error.message);
    }

    if (villasResult.error) {
      console.error("خطأ في تحميل فلل المشروع:", villasResult.error);
      setProjectDataError(villasResult.error.message);
    }
    if (topCostResult.error) {
  console.error("خطأ في تحميل بنود تكلفة المشروع:", topCostResult.error);
} else {
  const categoryTotals = new Map<number, { name: string; total: number }>();

  (topCostResult.data ?? []).forEach((row: any) => {
    const categoryId = Number(row.category_id);
    const categoryName = String(row.categories?.name ?? "غير مصنف");
    const total = Number(row.total ?? 0);

    if (!categoryTotals.has(categoryId)) {
      categoryTotals.set(categoryId, {
        name: categoryName,
        total: 0,
      });
    }

    categoryTotals.get(categoryId)!.total += total;
  });

  const allItems = Array.from(categoryTotals.values())
    .sort((a, b) => b.total - a.total);

  setTopCostItems(allItems);
}

    if (accountsResult.error) {
      console.error("خطأ في تحميل العهد:", accountsResult.error);
    } else {
      const formattedAccounts = (accountsResult.data ?? []).map((account: any) => ({
        id: Number(account.id),
        name: String(account.name ?? ""),
        type: String(account.type ?? "عهدة"),
        currentBalance: Number(account.balance ?? 0),
        totalFunding: 0,
        totalExpenses: 0,
        operationsCount: 0,
      }));

      setAccounts(formattedAccounts);
    }

    if (categoriesResult.error) {
      console.error("خطأ في تحميل التصنيفات:", categoriesResult.error);
    } else {
      setCategories(categoriesResult.data ?? []);
    }

    if (itemsResult.error) {
      console.error("خطأ في تحميل البنود:", itemsResult.error);
    } else {
      setExpenseItems(itemsResult.data ?? []);
    }

    if (suppliersResult.error) {
      // الموردين ليسوا شرطًا لعرض المصروفات، لذلك لا نفشل تحميل المشروع بسببهم.
      console.warn("تعذر تحميل أسماء الموردين:", suppliersResult.error);
      setSuppliers([]);
    } else {
      setSuppliers(suppliersResult.data ?? []);
    }

    if (stagesResult.error) {
      console.warn("تعذر تحميل مراحل المصروفات:", stagesResult.error);
      setStages([]);
    } else {
      setStages(stagesResult.data ?? []);
    }

    const fallbackArea = (villasResult.data ?? []).reduce(
      (sum: number, villa: any) => sum + Number(villa.area ?? 0),
      0
    );
    const storedArea = Number(projectMetaResult.data?.total_area ?? 0);
    const resolvedArea = storedArea > 0 ? storedArea : fallbackArea;
    setProjectTotalArea(resolvedArea);
    setProjectAreaInput(String(resolvedArea || ""));

    const landStorageKey = `tumouh_star_project_land_value_${project.id}`;
    const localLandValue = Number(localStorage.getItem(landStorageKey) ?? 0);
    const databaseLandValue = Number(projectMetaResult.data?.land_value ?? 0);
    const resolvedLandValue = databaseLandValue > 0 ? databaseLandValue : localLandValue;
    setProjectLandValue(Number.isFinite(resolvedLandValue) ? resolvedLandValue : 0);
    setProjectLandValueInput(
      resolvedLandValue > 0 ? String(resolvedLandValue) : ""
    );

    const expectedExpenseStorageKey = `tumouh_star_project_expected_expense_total_${project.id}`;
    const localExpectedExpense = Number(
      localStorage.getItem(expectedExpenseStorageKey) ?? DEFAULT_EXPECTED_PROJECT_EXPENSE_TOTAL
    );
    const resolvedExpectedExpense =
      Number.isFinite(localExpectedExpense) && localExpectedExpense >= 0
        ? localExpectedExpense
        : DEFAULT_EXPECTED_PROJECT_EXPENSE_TOTAL;
    setExpectedProjectExpenseTotal(resolvedExpectedExpense);
    setExpectedProjectExpenseInput(String(resolvedExpectedExpense));

    const normalizedExpenses = (expensesResult.data ?? []).map((row: any) => ({
      ...row,
      expenseDate: row.date ?? row.expense_date ?? row.entry_date ?? "",
      entryDate: row.entry_date ?? row.date ?? "",
      voucherNo: row.invoice_number ?? row.voucher_no ?? "",
      villaId: row.villa_id ?? null,
      accountId: row.account_id ?? null,
      categoryId: row.category_id ?? null,
      stageId: row.stage_id ?? null,
      itemId: row.item_id ?? null,
      supplier:
        row.supplier_name ??
        row.supplier?.name ??
        (row.supplier_id ? supplierNameMap.get(Number(row.supplier_id)) ?? String(row.supplier_id) : ""),
      paymentMethod: row.payment_method ?? "",
      amount: row.amount_before_tax ?? row.amount ?? 0,
      tax: row.tax ?? 0,
      total: row.total ?? null,
      description: row.description ?? "",
    }));

    setProjectExpenses(normalizedExpenses);
    setProjectVillas((villasResult.data ?? []) as ProjectVilla[]);
    setLoadingProjectData(false);
  };

  useEffect(() => {
    loadProjectData();
  }, [project?.id]);

  const totalProjectExpenses = useMemo(
    () => projectExpenses.reduce((sum, expense) => sum + getExpenseTotal(expense), 0),
    [projectExpenses]
  );

  const generalProjectExpenses = useMemo(
    () =>
      projectExpenses
        .filter((expense) => {
          const villaId = expense?.villaId ?? expense?.villa_id;
          return villaId === null || villaId === undefined || villaId === "" || villaId === "general";
        })
        .reduce((sum, expense) => sum + getExpenseTotal(expense), 0),
    [projectExpenses]
  );

  const villaCounts = useMemo(() => ({
    صغيرة: projectVillas.filter((villa) => villa.classification === "صغيرة").length,
    متوسطة: projectVillas.filter((villa) => villa.classification === "متوسطة").length,
    كبيرة: projectVillas.filter((villa) => villa.classification === "كبيرة").length,
  }), [projectVillas]);

  const totalProjectArea = projectTotalArea;

  // سعر المتر الحالي للمشروع = إجمالي المصاريف ÷ إجمالي مساحة المشروع.
  const currentProjectMeterPrice = useMemo(
    () => (totalProjectArea > 0 ? totalProjectExpenses / totalProjectArea : 0),
    [totalProjectExpenses, totalProjectArea]
  );

  // سعر المتر الخام = قيمة الأرض ÷ إجمالي مساحة المشروع.
  const rawProjectMeterPrice = useMemo(
    () => (totalProjectArea > 0 ? projectLandValue / totalProjectArea : 0),
    [projectLandValue, totalProjectArea]
  );

  const saveProjectLandValue = async () => {
    if (!canEditProject) {
      alert("ليس لديك صلاحية تعديل بيانات المشروع.");
      return;
    }
    const landValue = Number(projectLandValueInput);

    if (!Number.isFinite(landValue) || landValue < 0) {
      alert("من فضلك أدخل قيمة أرض صحيحة.");
      return;
    }

    if (!project?.id) {
      alert("المشروع غير موجود.");
      return;
    }

    setSavingProjectLandValue(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({ land_value: landValue })
        .eq("id", project.id);

      if (error) {
        alert(`تعذر حفظ قيمة الأرض:\n${error.message}`);
        return;
      }

      const landStorageKey = `tumouh_star_project_land_value_${project.id}`;
      localStorage.setItem(landStorageKey, String(landValue));

      setProjectLandValue(landValue);
      setProjectLandValueInput(landValue > 0 ? String(landValue) : "");
      setEditingProjectLandValue(false);
    } catch (error: any) {
      alert(`تعذر حفظ قيمة الأرض:\n${error?.message ?? ""}`);
    } finally {
      setSavingProjectLandValue(false);
    }
  };

  const saveExpectedProjectExpense = async () => {
    if (!canEditProject) {
      alert("ليس لديك صلاحية تعديل بيانات المشروع.");
      return;
    }
    const expectedExpense = Number(expectedProjectExpenseInput);

    if (!Number.isFinite(expectedExpense) || expectedExpense <= 0) {
      alert("من فضلك أدخل قيمة صحيحة للمصاريف المتوقعة للمشروع.");
      return;
    }

    if (!project?.id) {
      alert("المشروع غير موجود.");
      return;
    }

    setSavingExpectedProjectExpense(true);
    try {
      const storageKey = `tumouh_star_project_expected_expense_total_${project.id}`;
      localStorage.setItem(storageKey, String(expectedExpense));

      setExpectedProjectExpenseTotal(expectedExpense);
      setExpectedProjectExpenseInput(String(expectedExpense));
      setEditingExpectedProjectExpense(false);
    } catch (error: any) {
      alert(`تعذر حفظ المصاريف المتوقعة للمشروع:\n${error?.message ?? ""}`);
    } finally {
      setSavingExpectedProjectExpense(false);
    }
  };

  const saveProjectTotalArea = async () => {
    if (!canEditProject) {
      alert("ليس لديك صلاحية تعديل بيانات المشروع.");
      return;
    }
    const area = Number(projectAreaInput);

    if (!Number.isFinite(area) || area <= 0) {
      alert("من فضلك أدخل إجمالي مساحة صحيحة.");
      return;
    }

    if (!project?.id) {
      alert("المشروع غير موجود.");
      return;
    }

    setSavingProjectArea(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({ total_area: area })
        .eq("id", project.id);

      if (error) {
        alert(`تعذر حفظ إجمالي المساحة:\n${error.message}`);
        return;
      }

      setProjectTotalArea(area);
      setProjectAreaInput(String(area));
      setEditingProjectArea(false);
      alert("تم حفظ إجمالي مساحة المشروع بنجاح.");
    } catch (error: any) {
      alert(`حدث خطأ أثناء حفظ إجمالي المساحة:\n${error?.message ?? ""}`);
    } finally {
      setSavingProjectArea(false);
    }
  };

  const totalCostItems = useMemo(
    () => topCostItems.reduce((sum, item) => sum + Number(item.total ?? 0), 0),
    [topCostItems]
  );

  const formatCostItem = (item: any) => {
    const amount = Number(item.total ?? 0);
    return {
      name: String(item.name ?? "غير مصنف"),
      amount,
      // النسبة من المصروف الحالي = التصنيف ÷ إجمالي المصروف الحالي.
      percentage:
        totalCostItems > 0
          ? (amount / totalCostItems) * 100
          : 0,
      // النسبة المحددة = التصنيف ÷ إجمالي المصروفات المتوقعة للمشروع.
      expectedPercentage:
        expectedProjectExpenseTotal > 0
          ? (amount / expectedProjectExpenseTotal) * 100
          : 0,
    };
  };

  const highestCostItems = useMemo(
    () => topCostItems.slice(0, 5).map(formatCostItem),
    [topCostItems, totalCostItems]
  );

  const lowestCostItems = useMemo(
    () =>
      [...topCostItems]
        .sort((a, b) => Number(a.total ?? 0) - Number(b.total ?? 0))
        .slice(0, 3)
        .map(formatCostItem),
    [topCostItems, totalCostItems]
  );

  const getPeriodCostSummary = (period: "day" | "week" | "month" | "all") => {
    const periodRows = expenseRows.filter((expense: any) => {
      const date = getExpenseDateValue(expense);
      if (period === "all") return true;
      if (period === "day") return date === expenseReferenceDate;
      if (period === "week") return date >= weekStartKey && date <= expenseReferenceDate;
      return date >= monthStartKey && date <= expenseReferenceDate;
    });

    const totals = new Map<number, { name: string; total: number }>();
    periodRows.forEach((expense: any) => {
      const categoryId = Number(expense?.categoryId ?? expense?.category_id ?? 0);
      const categoryName = categoryNameMap.get(categoryId) ?? "غير مصنف";
      const total = getExpenseTotal(expense);
      const key = categoryId || -1;
      const current = totals.get(key);
      totals.set(key, {
        name: current?.name ?? categoryName,
        total: (current?.total ?? 0) + total,
      });
    });

    const items = Array.from(totals.values())
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total);

    const total = items.reduce((sum, item) => sum + item.total, 0);
    const format = (item: { name: string; total: number } | undefined) =>
      item
        ? {
            name: item.name,
            amount: item.total,
            percentage: total > 0 ? (item.total / total) * 100 : 0,
          }
        : null;

    return { highest: format(items[0]), lowest: format(items[items.length - 1]) };
  };

  const expensePeriodCostSummaries = useMemo(
    () => ({
      day: getPeriodCostSummary("day"),
      week: getPeriodCostSummary("week"),
      month: getPeriodCostSummary("month"),
      all: getPeriodCostSummary("all"),
    }),
    [expenseRows, expenseReferenceDate, weekStartKey, monthStartKey, categoryNameMap]
  );

  const allCostItems = useMemo(
    () => topCostItems.map(formatCostItem),
    [topCostItems, totalCostItems]
  );

  const exportCostItemsToExcel = () => {
    if (!canExportReports) { alert("ليس لديك صلاحية تصدير التقارير."); return; }
    const rows = allCostItems
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(item.name)}</td>
            <td>${item.amount}</td>
            <td>${item.percentage.toFixed(1)}%</td>
            <td>${Number(item.expectedPercentage ?? 0).toFixed(1)}%</td>
          </tr>
        `
      )
      .join("");

    const html = `
      <html dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <title>تصنيفات ${escapeHtml(project?.name ?? "المشروع")}</title>
        </head>
        <body>
          <table border="1">
            <tr>
              <th colspan="5">جميع تصنيفات ${escapeHtml(project?.name ?? "المشروع")}</th>
            </tr>
            <tr>
              <th>#</th>
              <th>اسم التصنيف</th>
              <th>إجمالي التكلفة</th>
              <th>نسبة من المصروف الحالي</th>
              <th>النسبة المحددة</th>
            </tr>
            ${rows}
            <tr>
              <th colspan="2">الإجمالي</th>
              <th>${totalCostItems}</th>
              <th>100%</th>
              <th>${((totalCostItems / expectedProjectExpenseTotal) * 100).toFixed(1)}%</th>
            </tr>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `تصنيفات_تكاليف_${project?.name ?? "المشروع"}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const printCostItems = (saveAsPdf = false) => {
    if (!canPrintReports) { alert("ليس لديك صلاحية طباعة التقارير."); return; }
    const printWindow = window.open("", "_blank", "width=1100,height=800");

    if (!printWindow) {
      alert("يرجى السماح بالنوافذ المنبثقة حتى يتم فتح صفحة الطباعة.");
      return;
    }

    const rows = allCostItems
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(item.name)}</td>
            <td>${Number(item.amount).toLocaleString("ar-SA")} ريال</td>
            <td>${item.percentage.toFixed(1)}%</td>
            <td>${Number(item.expectedPercentage ?? 0).toFixed(1)}%</td>
          </tr>
        `
      )
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <title>تصنيفات ${escapeHtml(project?.name ?? "المشروع")}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 32px;
              font-family: Arial, Tahoma, sans-serif;
              color: #111827;
              background: white;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 24px;
              padding-bottom: 16px;
              border-bottom: 2px solid #0f2d4d;
            }
            h1 { margin: 0; font-size: 26px; }
            .date { color: #6b7280; font-size: 13px; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 18px;
            }
            th, td {
              border: 1px solid #d1d5db;
              padding: 12px;
              text-align: right;
            }
            th {
              background: #0f2d4d;
              color: white;
              font-weight: 700;
            }
            td:first-child, th:first-child,
            td:nth-child(3), th:nth-child(3),
            td:nth-child(4), th:nth-child(4) {
              text-align: center;
            }
            .total td {
              font-weight: 800;
              background: #f3f4f6;
            }
            .summary {
              display: flex;
              gap: 16px;
              margin-top: 18px;
            }
            .summary-box {
              flex: 1;
              padding: 14px;
              border: 1px solid #d1d5db;
              border-radius: 10px;
            }
            .summary-label { color: #6b7280; font-size: 12px; }
            .summary-value { margin-top: 5px; font-size: 20px; font-weight: 800; }
            @media print {
              body { padding: 15px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>جميع تصنيفات ${escapeHtml(project?.name ?? "المشروع")}</h1>
            <div class="date">${new Date().toLocaleDateString("ar-SA")}</div>
          </div>

          <div class="summary">
            <div class="summary-box">
              <div class="summary-label">عدد التصنيفات</div>
              <div class="summary-value">${allCostItems.length}</div>
            </div>
            <div class="summary-box">
              <div class="summary-label">إجمالي التكلفة</div>
              <div class="summary-value">${totalCostItems.toLocaleString("ar-SA")} ريال</div>
            </div>
            <div class="summary-box">
              <div class="summary-label">المصروفات المتوقعة للمشروع</div>
              <div class="summary-value">${expectedProjectExpenseTotal.toLocaleString("ar-SA")} ريال</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>اسم التصنيف</th>
                <th>إجمالي التكلفة</th>
                <th>نسبة من المصروف الحالي</th>
                <th>النسبة المحددة</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
              <tr class="total">
                <td colspan="2">الإجمالي</td>
                <td>${totalCostItems.toLocaleString("ar-SA")} ريال</td>
                <td>100%</td>
                <td>${((totalCostItems / expectedProjectExpenseTotal) * 100).toFixed(2)}%</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      if (saveAsPdf) {
        // نفس نافذة الطباعة تسمح باختيار Microsoft Print to PDF / Save as PDF.
        printWindow.document.title = `PDF - تصنيفات تكاليف ${project?.name ?? "المشروع"}`;
      }
    }, 300);
  };

  const refreshProjectExpenses = async () => {
    await loadProjectData();
  };

  const closeExpenseModal = () => {
    setShowExpenseModal(false);
    setEditingExpense(null);
  };

  const handleEditExpense = (expense: any) => {
    if (!canEditProject) {
      alert("ليس لديك صلاحية تعديل مصروفات المشروع.");
      return;
    }
    setEditingExpense(expense);
    setShowExpenseModal(true);
  };

  const handleDeleteExpense = async (expense: any) => {
    if (!canDeleteProject) {
      alert("ليس لديك صلاحية حذف مصروفات المشروع.");
      return;
    }
    const expenseId = Number(expense?.id);
    if (!expenseId) {
      alert("رقم المصروف غير صالح");
      return;
    }

    const oldTotal = getExpenseTotal(expense);
    const oldAccountId = Number(expense?.accountId ?? expense?.account_id ?? 0);

    if (
      !window.confirm(
        `هل أنت متأكد من حذف هذا المصروف؟\n\nالإجمالي: ${oldTotal.toLocaleString("ar-SA")} ريال\n\nسيتم إعادة المبلغ إلى رصيد العهدة.`
      )
    ) {
      return;
    }

    try {
      if (oldAccountId && oldTotal > 0) {
        const { data: accountRow, error: accountReadError } = await supabase
          .from("accounts")
          .select("id, balance")
          .eq("id", oldAccountId)
          .single();

        if (accountReadError || !accountRow) {
          alert(`تعذر قراءة رصيد العهدة:\n${accountReadError?.message ?? "العهدة غير موجودة"}`);
          return;
        }

        const { error: balanceError } = await supabase
          .from("accounts")
          .update({ balance: Number(accountRow.balance ?? 0) + oldTotal })
          .eq("id", oldAccountId);

        if (balanceError) {
          alert(`تعذر إعادة المبلغ إلى العهدة:\n${balanceError.message}`);
          return;
        }
      }

      const { error: deleteError } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expenseId);

      if (deleteError) {
        if (oldAccountId && oldTotal > 0) {
          const { data: rollbackAccount } = await supabase
            .from("accounts")
            .select("balance")
            .eq("id", oldAccountId)
            .single();

          if (rollbackAccount) {
            await supabase
              .from("accounts")
              .update({
                balance: Number(rollbackAccount.balance ?? 0) - oldTotal,
              })
              .eq("id", oldAccountId);
          }
        }

        alert(`تعذر حذف المصروف:\n${deleteError.message}`);
        return;
      }

      setSelectedExpense(null);
      alert("تم حذف المصروف وإعادة المبلغ إلى العهدة بنجاح.");
      await refreshProjectExpenses();
    } catch (error: any) {
      console.error("خطأ غير متوقع أثناء حذف المصروف:", error);
      alert(`حدث خطأ غير متوقع أثناء حذف المصروف:\n${error?.message ?? ""}`);
    }
  };

  const handleSaveExpense = async (expense: any): Promise<boolean> => {
    if (!project) return false;
    const requiredPermission = editingExpense?.id ? canEditProject : canAddProject;
    if (!requiredPermission) {
      alert(editingExpense?.id ? "ليس لديك صلاحية تعديل مصروفات المشروع." : "ليس لديك صلاحية إضافة مصروفات للمشروع.");
      return false;
    }

    const accountId = Number(expense?.accountId);
    const categoryId = expense?.categoryId ? Number(expense.categoryId) : null;
    const itemId = expense?.itemId ? Number(expense.itemId) : null;
    // مشروع فلل تبوك: جميع المصروفات عامة على المشروع ولا ترتبط بفيلا.
    const villaId = null;

    const amount = Number(expense?.amount ?? 0);
    const tax = Number(expense?.tax ?? 0);
    const total = Number(expense?.total ?? amount + tax);
    const expenseDate =
      expense?.expenseDate ?? expense?.entryDate ?? localDateString();

    if (!accountId) {
      alert("من فضلك اختر العهدة التي تم دفع المصروف منها");
      return false;
    }

    if (!categoryId) {
      alert("من فضلك اختر التصنيف");
      return false;
    }

    if (!total || total <= 0) {
      alert("من فضلك أدخل مبلغ المصروف");
      return false;
    }

    try {
      if (editingExpense?.id) {
        const expenseId = Number(editingExpense.id);

        const { data: oldExpense, error: oldExpenseError } = await supabase
          .from("expenses")
          .select("id, account_id, total")
          .eq("id", expenseId)
          .single();

        if (oldExpenseError || !oldExpense) {
          alert(`تعذر قراءة المصروف القديم:\n${oldExpenseError?.message ?? "السجل غير موجود"}`);
          return false;
        }

        const oldAccountId = Number(oldExpense.account_id ?? 0);
        const oldTotal = Number(oldExpense.total ?? 0);
        const accountIds = Array.from(
          new Set([oldAccountId, accountId].filter((value) => value > 0))
        );

        const { data: accountRows, error: accountRowsError } = await supabase
          .from("accounts")
          .select("id, balance")
          .in("id", accountIds);

        if (accountRowsError) {
          alert(`تعذر قراءة أرصدة العهد:\n${accountRowsError.message}`);
          return false;
        }

        const accountMap = new Map<number, number>(
          (accountRows ?? []).map((row: any) => [
            Number(row.id),
            Number(row.balance ?? 0),
          ])
        );

        const oldBalance = accountMap.get(oldAccountId) ?? 0;
        const newBalance = accountMap.get(accountId) ?? 0;

        if (oldAccountId === accountId) {
          if (total > oldBalance + oldTotal) {
            alert(
              `رصيد العهدة غير كافٍ لتعديل المصروف.\nالرصيد المتاح: ${(oldBalance + oldTotal).toLocaleString("ar-SA")} ريال`
            );
            return false;
          }
        } else if (total > newBalance) {
          alert(
            `رصيد العهدة الجديدة غير كافٍ.\nالرصيد الحالي: ${newBalance.toLocaleString("ar-SA")} ريال`
          );
          return false;
        }

        const { error: updateError } = await supabase
          .from("expenses")
          .update({
            date: expenseDate,
            project_id: project.id,
            villa_id: villaId,
            account_id: accountId,
            category_id: categoryId,
            stage_id: expense?.stageId ? Number(expense.stageId) : Number(categories.find((c: any) => Number(c.id) === categoryId)?.stage_id ?? 0) || null,
            item_id: itemId,
            invoice_number: expense?.voucherNo || null,
            amount_before_tax: amount,
            tax,
            total,
            payment_method: expense?.paymentMethod || null,
            description: expense?.description || null,
            attachment_name: expense?.attachmentName || null,
          })
          .eq("id", expenseId);

        if (updateError) {
          alert(`تعذر تعديل المصروف:\n${updateError.message}`);
          return false;
        }

        if (oldAccountId === accountId) {
          const { error } = await supabase
            .from("accounts")
            .update({ balance: oldBalance + oldTotal - total })
            .eq("id", accountId);

          if (error) {
            alert(`تم تعديل المصروف لكن تعذر تحديث العهدة:\n${error.message}`);
            return false;
          }
        } else {
          const { error: oldError } = await supabase
            .from("accounts")
            .update({ balance: oldBalance + oldTotal })
            .eq("id", oldAccountId);

          if (oldError) {
            alert(`تعذر إعادة رصيد العهدة القديمة:\n${oldError.message}`);
            return false;
          }

          const { error: newError } = await supabase
            .from("accounts")
            .update({ balance: newBalance - total })
            .eq("id", accountId);

          if (newError) {
            alert(`تعذر خصم رصيد العهدة الجديدة:\n${newError.message}`);
            return false;
          }
        }

        alert("تم تعديل المصروف بنجاح.");
      } else {
        const { data: accountRow, error: accountError } = await supabase
          .from("accounts")
          .select("id, balance")
          .eq("id", accountId)
          .single();

        if (accountError || !accountRow) {
          alert(`تعذر قراءة العهدة:\n${accountError?.message ?? "العهدة غير موجودة"}`);
          return false;
        }

        const currentBalance = Number(accountRow.balance ?? 0);

        if (total > currentBalance) {
          alert(
            `رصيد العهدة غير كافٍ.\nالرصيد الحالي: ${currentBalance.toLocaleString("ar-SA")} ريال`
          );
          return false;
        }

        const payload: any = {
          date: expenseDate,
          project_id: project.id,
          villa_id: villaId,
          account_id: accountId,
          category_id: categoryId,
          stage_id: expense?.stageId ? Number(expense.stageId) : Number(categories.find((c: any) => Number(c.id) === categoryId)?.stage_id ?? 0) || null,
          item_id: itemId,
          invoice_number: expense?.voucherNo || null,
          amount_before_tax: amount,
          tax,
          total,
          payment_method: expense?.paymentMethod || null,
          description: expense?.description || null,
          attachment_name: expense?.attachmentName || null,
        };

        const supplierText = String(expense?.supplier ?? "").trim();
        if (/^\d+$/.test(supplierText)) {
          payload.supplier_id = Number(supplierText);
        }

        const { error: insertError } = await supabase
          .from("expenses")
          .insert(payload);

        if (insertError) {
          alert(`تعذر إضافة المصروف:\n${insertError.message}`);
          return false;
        }

        const { error: balanceError } = await supabase
          .from("accounts")
          .update({ balance: currentBalance - total })
          .eq("id", accountId);

        if (balanceError) {
          alert(`تم تسجيل المصروف لكن تعذر تحديث رصيد العهدة:\n${balanceError.message}`);
          return false;
        }

        alert("تم إضافة المصروف بنجاح.");
      }

      await refreshProjectExpenses();
      return true;
    } catch (error: any) {
      console.error("خطأ غير متوقع أثناء حفظ المصروف:", error);
      alert(`حدث خطأ غير متوقع أثناء حفظ المصروف:\n${error?.message ?? ""}`);
      return false;
    }
  };

  const getPeriodExpenses = (
    period: "day" | "week" | "month" | "all"
  ) => {
    return expenseRows.filter((expense: any) => {
      const date = getExpenseDateValue(expense);
      if (period === "all") return true;
      if (period === "day") return date === expenseReferenceDate;
      if (period === "week") return date >= weekStartKey && date <= expenseReferenceDate;
      return date >= monthStartKey && date <= expenseReferenceDate;
    });
  };

  const getExpensePeriodTotal = (
    period: "day" | "week" | "month" | "all"
  ) =>
    getPeriodExpenses(period).reduce(
      (sum, expense) => sum + getExpenseTotal(expense),
      0
    );

  const expensePeriodTotals = useMemo(
    () => ({
      day: getExpensePeriodTotal("day"),
      week: getExpensePeriodTotal("week"),
      month: getExpensePeriodTotal("month"),
      all: getExpensePeriodTotal("all"),
    }),
    [expenseRows, expenseReferenceDate, weekStartKey, monthStartKey]
  );

  const exportExpensesToExcel = (
    period: "day" | "week" | "month" | "all" = "all"
  ) => {
    if (!canExportReports) { alert("ليس لديك صلاحية تصدير التقارير."); return; }
    const rows = getPeriodExpenses(period);
    const projectName = project?.name ?? "المشروع";
    const periodLabel =
      period === "day"
        ? "مصروفات اليوم"
        : period === "week"
          ? "مصروفات الأسبوع"
          : period === "month"
            ? "مصروفات الشهر"
            : "جميع مصروفات المشروع";

    const body = rows
      .map(
        (expense: any, index: number) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(expense.expenseDate || "-")}</td>
            <td>مصروف عام على المشروع</td>
            <td>${escapeHtml(getExpenseStageName(expense))}</td>
            <td>${escapeHtml(accountNameMap.get(Number(expense.accountId)) ?? "-")}</td>
            <td>${escapeHtml(categoryNameMap.get(Number(expense.categoryId)) ?? "-")}</td>
            <td>${escapeHtml(itemNameMap.get(Number(expense.itemId)) ?? "-")}</td>
            <td>${Number(expense.amount ?? 0).toLocaleString("ar-SA")}</td>
            <td>${Number(expense.tax ?? 0).toLocaleString("ar-SA")}</td>
            <td>${getExpenseTotal(expense).toLocaleString("ar-SA")}</td>
          </tr>`
      )
      .join("");

    const html = `
      <html dir="rtl">
        <head><meta charset="UTF-8" /><title>${periodLabel} - ${escapeHtml(projectName)}</title></head>
        <body>
          <h2>${periodLabel} - ${escapeHtml(projectName)}</h2>
          <table border="1">
            <tr>
              <th>#</th><th>التاريخ</th><th>الفيلا</th><th>المرحلة</th><th>العهدة</th>
              <th>التصنيف</th><th>البند</th>
              <th>قبل الضريبة</th><th>الضريبة</th><th>الإجمالي</th>
            </tr>
            ${body}
          </table>
          <h3>الإجمالي: ${getExpensePeriodTotal(period).toLocaleString("ar-SA")} ريال</h3>
        </body>
      </html>`;

    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${periodLabel}_${projectName}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setOpenExpenseExport(null);
  };

  const printExpenses = (
    period: "day" | "week" | "month" | "all" = "all"
  ) => {
    if (!canPrintReports) { alert("ليس لديك صلاحية طباعة التقارير."); return; }
    const rows = getPeriodExpenses(period);
    const projectName = project?.name ?? "المشروع";
    const periodLabel =
      period === "day"
        ? "مصروفات اليوم"
        : period === "week"
          ? "مصروفات الأسبوع"
          : period === "month"
            ? "مصروفات الشهر"
            : "جميع مصروفات المشروع";

    const printWindow = window.open("", "_blank", "width=1300,height=850");

    if (!printWindow) {
      alert("يرجى السماح بالنوافذ المنبثقة حتى يتم فتح الطباعة.");
      return;
    }

    const body = rows
      .map(
        (expense: any, index: number) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(expense.expenseDate || "-")}</td>
            <td>مصروف عام على المشروع</td>
            <td>${escapeHtml(getExpenseStageName(expense))}</td>
            <td>${escapeHtml(accountNameMap.get(Number(expense.accountId)) ?? "-")}</td>
            <td>${escapeHtml(categoryNameMap.get(Number(expense.categoryId)) ?? "-")}</td>
            <td>${escapeHtml(itemNameMap.get(Number(expense.itemId)) ?? "-")}</td>
            <td>${Number(expense.amount ?? 0).toLocaleString("ar-SA")}</td>
            <td>${Number(expense.tax ?? 0).toLocaleString("ar-SA")}</td>
            <td>${getExpenseTotal(expense).toLocaleString("ar-SA")}</td>
          </tr>`
      )
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <title>${periodLabel} - ${escapeHtml(projectName)}</title>
          <style>
            body { margin:0; padding:24px; font-family:Arial,Tahoma,sans-serif; color:#111827; }
            h1 { margin-bottom:8px; }
            .meta { color:#6b7280; margin-bottom:18px; }
            .total { margin:16px 0; padding:12px; border:1px solid #d1d5db; border-radius:10px; font-size:20px; font-weight:800; }
            table { width:100%; border-collapse:collapse; font-size:12px; }
            th,td { border:1px solid #d1d5db; padding:8px; text-align:right; }
            th { background:#0f2d4d; color:white; }
            @media print { body { padding:10px; } }
          </style>
        </head>
        <body>
          <h1>${periodLabel} - ${escapeHtml(projectName)}</h1>
          <div class="meta">مشروع ${escapeHtml(projectName)} — ${new Date().toLocaleDateString("ar-SA")}</div>
          <div class="total">الإجمالي: ${getExpensePeriodTotal(period).toLocaleString("ar-SA")} ريال</div>
          <table>
            <tr>
              <th>#</th><th>التاريخ</th><th>الفيلا</th><th>المرحلة</th><th>العهدة</th>
              <th>التصنيف</th><th>البند</th>
              <th>قبل الضريبة</th><th>الضريبة</th><th>الإجمالي</th>
            </tr>
            ${body}
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
    setOpenExpenseExport(null);
  };

  const handleExpenseExport = (
    period: "day" | "week" | "month" | "all",
    type: "excel" | "pdf" | "print"
  ) => {
    if (type === "excel") exportExpensesToExcel(period);
    else printExpenses(period);
  };

  const handleUpdateVilla = async (updatedVilla: ProjectVilla) => {
    const villaNumber = Number(updatedVilla.villa_number);
    const area = Number(updatedVilla.area ?? 0);

    if (!villaNumber || villaNumber <= 0) {
      alert("من فضلك أدخل رقم فيلا صحيح");
      return false;
    }
    if (!area || area <= 0) {
      alert("من فضلك أدخل مساحة صحيحة للفيلا");
      return false;
    }
    if (!String(updatedVilla.name ?? "").trim()) {
      alert("من فضلك أدخل اسم الفيلا");
      return false;
    }

    try {
      const { data, error } = await supabase
        .from("project_villas")
        .update({
          villa_number: villaNumber,
          name: String(updatedVilla.name).trim(),
          area,
          classification: updatedVilla.classification || null,
        })
        .eq("id", updatedVilla.id)
        .select("id, project_id, villa_number, name, area, classification")
        .single();

      if (error) {
        alert(`تعذر تعديل بيانات الفيلا:
${error.message}`);
        return false;
      }

      if (data) {
        setProjectVillas((current) =>
          current
            .map((villa) => Number(villa.id) === Number(data.id) ? (data as ProjectVilla) : villa)
            .sort((a, b) => Number(a.villa_number) - Number(b.villa_number))
        );
        setEditingVilla(null);
        setSelectedVilla((current) =>
          current && Number(current.id) === Number(data.id) ? (data as ProjectVilla) : current
        );
        alert("تم تعديل بيانات الفيلا بنجاح.");
        return true;
      }
    } catch (error: any) {
      alert(`حدث خطأ أثناء تعديل الفيلا:
${error?.message ?? ""}`);
    }
    return false;
  };

  if (!project) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
        <h1 className="text-3xl font-bold text-white">
          المشروع غير موجود
        </h1>

        <button
          onClick={() => navigate("/projects")}
          className="
            mt-6
            rounded-xl
            bg-yellow-400
            px-6
            py-3
            font-bold
            text-[#081B33]
            transition
            hover:bg-yellow-500
          "
        >
          رجوع للمشاريع
        </button>
      </div>
    );
  }
  if (showProjectExpenseOverview) {
    return (
      <div className="min-h-[70vh] space-y-6 pb-10" dir="rtl">

            <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#102947] px-7 py-5">
              <div className="text-right">
                <h2 className="text-2xl font-extrabold text-white">تفاصيل إجمالي مصروفات المشروع</h2>
                <p className="mt-1 text-sm text-gray-400">كل ملخصات المصروفات والتفاصيل وبنود التكلفة الخاصة بـ {project.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowProjectExpenseOverview(false)}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-300 hover:bg-red-500/20 hover:text-red-300"
                aria-label="إغلاق تفاصيل المصروفات"
              >
                <X size={22} />
              </button>
            </div>

      {/* =====================================================
          EXPENSE SUMMARY - 4 CARDS
      ===================================================== */}
      <section className="space-y-5">
        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-[#081B33] p-5 md:flex-row md:items-center md:justify-between">
          <div className="text-right">
            <h2 className="text-2xl font-extrabold text-white">
              ملخص مصروفات المشروع
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              اليوم والأسبوع والشهر والإجمالي الكلي
            </p>
          </div>

          <button
            type="button"
            onClick={refreshProjectExpenses}
            className="flex items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-5 py-3 font-bold text-cyan-300 transition hover:bg-cyan-400/20"
          >
            <RefreshCw size={18} />
            تحديث
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <ExpensePeriodCard
            title="إجمالي مصاريف اليوم المحدد"
            value={expensePeriodTotals.day}
            period="day"
            accent="orange"
            openExport={openExpenseExport}
            onOpenExport={setOpenExpenseExport}
            onExport={handleExpenseExport}
            referenceDate={expenseReferenceDate}
            onReferenceDateChange={setExpenseReferenceDate}
            highestCostItem={expensePeriodCostSummaries.day.highest}
            lowestCostItem={expensePeriodCostSummaries.day.lowest}
          />
          <ExpensePeriodCard
            title="إجمالي مصاريف الأسبوع حتى التاريخ"
            value={expensePeriodTotals.week}
            period="week"
            accent="violet"
            openExport={openExpenseExport}
            onOpenExport={setOpenExpenseExport}
            onExport={handleExpenseExport}
            referenceDate={expenseReferenceDate}
            onReferenceDateChange={setExpenseReferenceDate}
            highestCostItem={expensePeriodCostSummaries.week.highest}
            lowestCostItem={expensePeriodCostSummaries.week.lowest}
          />
          <ExpensePeriodCard
            title="إجمالي مصاريف الشهر حتى التاريخ"
            value={expensePeriodTotals.month}
            period="month"
            accent="amber"
            openExport={openExpenseExport}
            onOpenExport={setOpenExpenseExport}
            onExport={handleExpenseExport}
            referenceDate={expenseReferenceDate}
            onReferenceDateChange={setExpenseReferenceDate}
            highestCostItem={expensePeriodCostSummaries.month.highest}
            lowestCostItem={expensePeriodCostSummaries.month.lowest}
          />
          <ExpensePeriodCard
            title="إجمالي المصاريف"
            value={expensePeriodTotals.all}
            period="all"
            accent="rose"
            openExport={openExpenseExport}
            onOpenExport={setOpenExpenseExport}
            onExport={handleExpenseExport}
            referenceDate={expenseReferenceDate}
            onReferenceDateChange={setExpenseReferenceDate}
            highestCostItem={expensePeriodCostSummaries.all.highest}
            lowestCostItem={expensePeriodCostSummaries.all.lowest}
          />
        </div>

      {/* =====================================================
          TOP 5 CATEGORIES
      ===================================================== */}
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#102A43] via-[#0E233A] to-[#081727] shadow-2xl">
        <div className="flex flex-col gap-4 border-b border-white/10 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div className="text-right">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                <WalletCards size={22} />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-white">أكثر 5 تصنيفات تكلفة</h2>
                <p className="mt-1 text-sm text-gray-400">مرتبة من الأعلى إلى الأقل حسب إجمالي المصروفات</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-5 py-3 text-center">
            <p className="text-xs font-semibold text-gray-400">إجمالي المصروفات</p>
            <p className="mt-1 text-xl font-extrabold text-yellow-400">{totalProjectExpenses.toLocaleString("ar-SA")} ريال</p>
          </div>
        </div>

        <div className="divide-y divide-white/10">
          {highestCostItems.length > 0 ? highestCostItems.map((item: any, index: number) => (
            <div key={`${item.name}-${index}`} className="grid grid-cols-[48px_1fr_150px_190px] items-center gap-4 px-6 py-4 transition hover:bg-white/[0.03]">
              {(() => {
                const expectedPercentage = Math.max(0, Number(item.expectedPercentage) || 0);
                const expectedColor =
                  expectedPercentage <= 10
                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                    : expectedPercentage <= 15
                      ? "border-yellow-400/20 bg-yellow-400/10 text-yellow-300"
                      : "border-red-400/20 bg-red-400/10 text-red-300";
                const expectedBarColor =
                  expectedPercentage <= 10
                    ? "bg-emerald-400"
                    : expectedPercentage <= 15
                      ? "bg-yellow-400"
                      : "bg-red-400";

                return (
                  <>
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-sm font-extrabold text-emerald-300">{index + 1}</span>
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate font-bold text-white">{item.name}</span>
                        <span className="text-xs text-gray-500">{item.percentage.toFixed(1)}%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full ${expectedBarColor}`}
                          style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-center font-extrabold text-white">{Number(item.amount).toLocaleString("ar-SA")} <span className="text-xs text-gray-500">ريال</span></div>
                    <div className="flex items-center justify-center gap-2">
                      <span
                        title="نسبة من المصروف الحالي"
                        className="inline-flex min-w-[68px] justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-sm font-extrabold text-emerald-300"
                      >
                        {item.percentage.toFixed(1)}%
                      </span>
                      <span
                        title="النسبة المحددة"
                        className={`inline-flex min-w-[68px] justify-center rounded-full border px-2.5 py-1 text-sm font-extrabold ${expectedColor}`}
                      >
                        {expectedPercentage.toFixed(2)}%
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
          )) : (
            <div className="px-6 py-12 text-center text-gray-400">لا توجد تصنيفات مصروفة حتى الآن.</div>
          )}
        </div>

        <div className="border-t border-white/10 p-5">
          <button type="button" onClick={() => setShowAllCostItems(true)} className="w-full rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-5 py-3 font-bold text-cyan-300 transition hover:bg-cyan-400/20">
            عرض جميع التصنيفات
            <span className="mr-2">←</span>
          </button>
        </div>
      </section>


        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#081B33] shadow-xl">
          <div className="flex flex-col gap-4 border-b border-white/10 bg-[#102947] p-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="text-right">
              <h2 className="text-2xl font-extrabold text-white">
                تفاصيل مصروفات المشروع
              </h2>
              <p className="mt-1 text-sm text-gray-400">
                نفس تفاصيل قائمة المصروفات بالمركز المالي
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingExpense(null);
                  setShowExpenseModal(true);
                }}
                className="flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 font-bold text-[#081B33] transition hover:bg-yellow-300"
              >
                <Plus size={18} />
                إضافة مصروف
              </button>

              <button
                type="button"
                onClick={refreshProjectExpenses}
                className="flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 font-bold text-cyan-300 transition hover:bg-cyan-400/20"
              >
                <RefreshCw size={17} />
                تحديث
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setOpenExpenseExport(
                      openExpenseExport === "table" ? null : "table"
                    )
                  }
                  className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 font-bold text-emerald-300 transition hover:bg-emerald-400/20"
                >
                  <Download size={17} />
                  تصدير
                  <ChevronDown size={15} />
                </button>

                {openExpenseExport === "table" && (
                  <div className="absolute right-0 top-14 z-50 w-52 overflow-hidden rounded-2xl border border-white/10 bg-[#102947] p-1 shadow-2xl">
                    <button
                      type="button"
                      onClick={() => handleExpenseExport("all", "pdf")}
                      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-right text-sm text-white hover:bg-white/10"
                    >
                      <FileText size={17} className="text-red-400" />
                      PDF / حفظ PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExpenseExport("all", "excel")}
                      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-right text-sm text-white hover:bg-white/10"
                    >
                      <FileSpreadsheet size={17} className="text-green-400" />
                      Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExpenseExport("all", "print")}
                      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-right text-sm text-white hover:bg-white/10"
                    >
                      <Printer size={17} className="text-sky-400" />
                      طباعة
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[2200px] w-max text-[14px] leading-6 text-white">
              <thead className="bg-[#102947] text-gray-300">
                <tr>
                  <th className="p-3 text-center">التاريخ</th>
                  <th className="p-3 text-center">رقم الفاتورة</th>
                  <th className="p-3 text-center">الفيلا</th>
                  <th className="p-3 text-center">المرحلة</th>
                  <th className="p-3 text-center">العهدة</th>
                  <th className="p-3 text-center">التصنيف</th>
                  <th className="p-3 text-center">البند</th>
                  <th className="p-3 text-center">الإجمالي</th>
                  <th className="p-3 text-center">المرفقات</th>
                  <th className="p-3 text-center">الإجراءات</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/10">
                {loadingProjectData ? (
                  <tr>
                    <td colSpan={10} className="p-10 text-center text-gray-400">
                      جاري تحميل المصروفات...
                    </td>
                  </tr>
                ) : expenseRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-10 text-center text-gray-400">
                      لا توجد مصروفات لهذا المشروع حتى الآن.
                    </td>
                  </tr>
                ) : (
                  expenseRows.map((expense: any) => (
                    <tr
                      key={String(expense.id)}
                      className="transition hover:bg-white/[0.03]"
                    >
                      <td className="p-3 text-center text-gray-300">
                        {expense.expenseDate || "-"}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        {expense.voucherNo || "-"}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        مصروف عام على المشروع
                      </td>
                      <td className="p-3 text-center font-semibold text-cyan-300">
                        {getExpenseStageName(expense)}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        {accountNameMap.get(Number(expense.accountId)) ?? "-"}
                      </td>
                      <td className="p-3 text-center">
                        {categoryNameMap.get(Number(expense.categoryId)) ?? "-"}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        {itemNameMap.get(Number(expense.itemId)) ?? "-"}
                      </td>

                      {/* الإجمالي */}
                      <td className="p-3 text-center font-bold text-yellow-400">
                        {getExpenseTotal(expense).toLocaleString("ar-SA")}
                      </td>

                      {/* المرفقات — تأتي مباشرة بعد الإجمالي */}
                      <td className="p-3 text-center whitespace-nowrap">
                        {getExpenseAttachment(expense) ? (
                          <button
                            type="button"
                            onClick={() => {
                              const attachment = getExpenseAttachment(expense);
                              if (!attachment) return;

                              const attachmentString = String(attachment);
                              const url =
                                attachmentString.startsWith("http://") ||
                                attachmentString.startsWith("https://")
                                  ? attachmentString
                                  : attachmentString.startsWith("/")
                                    ? attachmentString
                                    : `/${attachmentString}`;

                              window.open(url, "_blank", "noopener,noreferrer");
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-sky-500 px-3 py-2 text-xs font-bold text-white hover:bg-sky-600"
                            title={getExpenseAttachmentName(expense)}
                          >
                            <Eye size={14} />
                            عرض المرفق
                          </button>
                        ) : (
                          <span className="text-xs text-gray-500">لا يوجد</span>
                        )}
                      </td>

                      {/* الإجراءات */}
                      <td className="p-3">
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedExpense(expense)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500 text-white shadow-sm transition hover:bg-sky-600"
                            title="عرض"
                            aria-label="عرض"
                          >
                            <Eye size={19} strokeWidth={2.5} />
                          </button>
                          {canEditProject && <button
                            type="button"
                            onClick={() => handleEditExpense(expense)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-500 text-[#081B33] shadow-sm transition hover:bg-yellow-400"
                            title="تعديل"
                            aria-label="تعديل"
                          >
                            <Pencil size={19} strokeWidth={2.5} />
                          </button>}
                          {canDeleteProject && <button
                            type="button"
                            onClick={() => handleDeleteExpense(expense)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500 text-white shadow-sm transition hover:bg-red-600"
                            title="حذف"
                            aria-label="حذف"
                          >
                            <Trash2 size={19} strokeWidth={2.5} />
                          </button>}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {selectedExpense && (
        <ExpenseDetailsModal
          expense={selectedExpense}
          projectName={project.name}
          villaName="مصروف عام على المشروع"
          accountName={
            accountNameMap.get(Number(selectedExpense.accountId)) ?? "-"
          }
          categoryName={
            categoryNameMap.get(Number(selectedExpense.categoryId)) ?? "-"
          }
          stageName={getExpenseStageName(selectedExpense)}
          itemName={itemNameMap.get(Number(selectedExpense.itemId)) ?? "-"}
          onClose={() => setSelectedExpense(null)}
        />
      )}

      {showExpenseModal && (
        <ExpenseModal
          open={showExpenseModal}
          onClose={closeExpenseModal}
          onSave={handleSaveExpense}
          accounts={accounts}
          initialExpense={editingExpense}
          isEditing={Boolean(editingExpense)}
          forcedProjectId={project.id}
          hideSupplier
          forceGeneralExpense
        />
      )}


      {showAllCostItems && (
        <AllCostItemsModal
          projectName={project?.name ?? "المشروع"}
          items={allCostItems}
          total={totalCostItems}
          onClose={() => setShowAllCostItems(false)}
          onExportExcel={exportCostItemsToExcel}
          onExportPdf={() => printCostItems(true)}
          onPrint={() => printCostItems(false)}
        />
      )}




      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">

      {/* =====================================================
          PROJECT HEADER
      ===================================================== */}

      <div
        className="
          relative
          min-h-[190px]
          overflow-hidden
          rounded-3xl
          border
          border-white/10
          bg-gradient-to-br
          from-[#173C63]
          via-[#0D2948]
          to-[#101C2D]
          px-8
          py-8
          shadow-xl
        "
      >

        {/* Background Glow */}
        <div
          className="
            pointer-events-none
            absolute
            -right-20
            -top-20
            h-72
            w-72
            rounded-full
            bg-yellow-400/10
            blur-3xl
          "
        />

        <div
          className="
            pointer-events-none
            absolute
            -left-20
            -bottom-20
            h-64
            w-64
            rounded-full
            bg-blue-500/10
            blur-3xl
          "
        />

        {/* Back Button */}
        <button
          onClick={() => navigate("/projects")}
          className="
            absolute
            right-5
            top-5
            z-20
            flex
            items-center
            gap-2
            rounded-xl
            border
            border-white/10
            bg-black/10
            px-4
            py-2
            text-sm
            font-semibold
            text-gray-300
            backdrop-blur-sm
            transition
            hover:bg-white/10
            hover:text-white
          "
        >
          رجوع للمشاريع
          <ArrowLeft size={17} />
        </button>

        <div
          className="
            relative
            z-10
            flex
            min-h-[150px]
            items-center
            justify-between
            gap-8
          "
        >

          {/* RIGHT - PROJECT ICON */}
          <div className="flex w-[220px] shrink-0 items-center">
            <div
              className="
                flex
                h-28
                w-28
                items-center
                justify-center
                rounded-3xl
                border
                border-yellow-400/30
                bg-yellow-400/10
                text-yellow-400
                shadow-xl
                shadow-yellow-400/10
              "
            >
              <Building2 size={58} />
            </div>
          </div>

          {/* CENTER - PROJECT NAME */}
          <div className="flex-1 text-center">
            <h1
              className="
                text-4xl
                font-extrabold
                leading-tight
                tracking-wide
                text-white
              "
            >
              {project.name}
            </h1>

            <p className="mt-3 text-base text-gray-400">
              إدارة ومتابعة بيانات المشروع
            </p>
          </div>

          {/* LEFT - STATUS ONLY
              المدينة أزيلت من الهيدر حسب التعديل المطلوب */}
          <div
            className="
              flex
              w-[270px]
              shrink-0
              flex-col
              items-start
              justify-center
              gap-5
            "
          >
            <div className="flex items-center gap-3">
              <div
                className="
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-2xl
                  border
                  border-emerald-400/20
                  bg-emerald-400/10
                  text-emerald-300
                "
              >
                <Building2 size={25} />
              </div>

              <div>
                <p className="text-sm text-gray-400">
                  الحالة
                </p>

                <p className="mt-1 text-xl font-extrabold text-white">
                  {project.status}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>


      {/* =====================================================
          PROJECT KPIs
          5 CARDS - ONE ROW
          المدينة تم حذفها
      ===================================================== */}

      <section>

        <div className="mb-6 flex justify-center">
          <div
            className="
              w-fit
              min-w-[420px]
              rounded-2xl
              border
              border-cyan-300/20
              bg-[#102A43]
              px-10
              py-4
              text-center
              shadow-xl
              shadow-black/20
            "
          >
            <h2 className="text-2xl font-extrabold text-white">
              مؤشرات المشروع
            </h2>

            <p className="mt-1 text-sm text-gray-300">
  ملخص سريع لأهم بيانات {project.name}
</p>
          </div>
        </div>


        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">

          {/* 1 - CURRENT PRICE */}
          <ProjectKpi
            icon={<Calculator size={46} />}
            title="سعر المتر الحالي"
            value={currentProjectMeterPrice.toLocaleString("ar-SA", { maximumFractionDigits: 2 })}
            suffix="ريال / م²"
            cardClass="
              from-[#4D3D21]
              via-[#393020]
              to-[#222132]
              border-amber-400/20
            "
          />

          {/* 2 - TOTAL AREA */}
          <ProjectKpi
            icon={<Ruler size={46} />}
            title="إجمالي المساحة"
            value={totalProjectArea.toLocaleString("ar-SA")}
            suffix="م²"
            cardClass="
              from-[#413462]
              via-[#30284F]
              to-[#1D203A]
              border-violet-400/20
            "
          >
            <div className="mt-4 flex justify-end">
              {!editingProjectArea ? (
                <button type="button" onClick={() => { setProjectAreaInput(String(totalProjectArea || "")); setEditingProjectArea(true); }} className="flex items-center gap-2 rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-2 text-sm font-bold text-yellow-300 transition hover:bg-yellow-400 hover:text-[#081B33]">
                  <Pencil size={16} />
                  تعديل المساحة
                </button>
              ) : (
                <div className="flex w-full items-center gap-2">
                  <input type="number" value={projectAreaInput} onChange={(e) => setProjectAreaInput(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-center font-bold text-white outline-none focus:border-yellow-400/50" autoFocus />
                  <button type="button" onClick={saveProjectTotalArea} disabled={savingProjectArea} className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-bold text-emerald-300 transition hover:bg-emerald-400 hover:text-[#081B33] disabled:opacity-50">{savingProjectArea ? "جاري..." : "حفظ"}</button>
                  <button type="button" onClick={() => setEditingProjectArea(false)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-gray-300 hover:bg-white/10">إلغاء</button>
                </div>
              )}
            </div>
          </ProjectKpi>

          {/* 3 - PROJECT STATUS */}
          <ProjectKpi
            icon={<Building2 size={46} />}
            title="حالة المشروع"
            value={project.status}
            cardClass="
              from-[#164C46]
              via-[#123A3B]
              to-[#0B2730]
              border-emerald-400/20
            "
          />

          {/* 4 - TOTAL VILLAS */}
          <ProjectKpi
            icon={<Building2 size={46} />}
            title="إجمالي الفلل"
            value={String(projectVillas.length || 18)}
            suffix="فيلا"
            onClick={() => setShowVillasOverview(true)}
            cardClass="
              from-[#173F68]
              via-[#123455]
              to-[#0B2139]
              border-blue-400/20
            "
          >
            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
              <VillaCount title="صغيرة" value={String(villaCounts.صغيرة)} />
              <VillaCount title="متوسطة" value={String(villaCounts.متوسطة)} />
              <VillaCount title="كبيرة" value={String(villaCounts.كبيرة)} />
            </div>
          </ProjectKpi>

          {/* 5 - TOTAL EXPENSES */}
          <ProjectKpi
            icon={<WalletCards size={46} />}
            title="إجمالي المصاريف"
            value={totalProjectExpenses.toLocaleString("ar-SA")}
            suffix="ريال"
            onClick={() => setShowProjectExpenseOverview(true)}
            cardClass="
              from-[#4C2B3B]
              via-[#362336]
              to-[#211A2C]
              border-rose-400/20
            "
          />

        </div>

        {/* =====================================================
            SECONDARY PROJECT KPIs
            5 CARDS - SAME DESIGN SYSTEM
        ===================================================== */}
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">

          {/* 1 - RAW METER PRICE */}
          <ProjectKpi
            icon={<Ruler size={46} />}
            title="سعر المتر الخام"
            value={rawProjectMeterPrice.toLocaleString("ar-SA", { maximumFractionDigits: 2 })}
            suffix="ريال / م²"
            cardClass="
              from-[#3D3524]
              via-[#302B23]
              to-[#211F25]
              border-amber-400/20
            "
          />

          {/* 2 - USED QUANTITIES */}
          <ProjectKpi
            icon={<Boxes size={46} />}
            title="الكميات المستخدمة"
            value="اضغط هنا"
            suffix=""
            onClick={() => navigate(`/projects/${id}/quantities`)}
            cardClass="
              from-[#234044]
              via-[#20343E]
              to-[#182632]
              border-cyan-400/20
            "
          />

          {/* 3 - LAND VALUE */}
          <ProjectKpi
            icon={<Calculator size={46} />}
            title="قيمة الأرض"
            value={projectLandValue > 0 ? projectLandValue.toLocaleString("ar-SA") : "غير محدد"}
            suffix={projectLandValue > 0 ? "ريال" : ""}
            cardClass="
              from-[#49332E]
              via-[#35282D]
              to-[#241F2A]
              border-orange-400/20
            "
          >
            <div className="mt-4 flex justify-end">
              {!editingProjectLandValue ? (
                <button
                  type="button"
                  onClick={() => {
                    setProjectLandValueInput(
                      projectLandValue > 0 ? String(projectLandValue) : ""
                    );
                    setEditingProjectLandValue(true);
                  }}
                  className="flex items-center gap-2 rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-2 text-sm font-bold text-yellow-300 transition hover:bg-yellow-400 hover:text-[#081B33]"
                >
                  <Pencil size={16} />
                  تعديل قيمة الأرض
                </button>
              ) : (
                <div className="flex w-full items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={projectLandValueInput}
                    onChange={(e) => setProjectLandValueInput(e.target.value)}
                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-center font-bold text-white outline-none focus:border-yellow-400/50"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={saveProjectLandValue}
                    disabled={savingProjectLandValue}
                    className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-bold text-emerald-300 transition hover:bg-emerald-400 hover:text-[#081B33] disabled:opacity-50"
                  >
                    {savingProjectLandValue ? "جاري..." : "حفظ"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingProjectLandValue(false)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-gray-300 hover:bg-white/10"
                  >
                    إلغاء
                  </button>
                </div>
              )}
            </div>
          </ProjectKpi>

          {/* 4 - CHARTS */}
          <ProjectKpi
            icon={<BarChart3 size={46} />}
            title="الرسوم البيانية"
            value="اضغط هنا"
            suffix=""
            onClick={() => navigate(`/projects/${id}/charts`)}
            cardClass="
              from-[#293B5A]
              via-[#25334D]
              to-[#1A2439]
              border-blue-400/20
            "
          />

          {/* 5 - EXPECTED PROJECT EXPENSES */}
          <ProjectKpi
            icon={<FileText size={46} />}
            title="المصاريف المتوقعة للمشروع"
            value={expectedProjectExpenseTotal.toLocaleString("ar-SA")}
            suffix="ريال"
            cardClass="
              from-[#30343D]
              via-[#282C34]
              to-[#1D212A]
              border-white/10
            "
          >
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <span className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-emerald-300">
                  10% = {((expectedProjectExpenseTotal * 0.10)).toLocaleString("ar-SA")} ريال
                </span>
                <span className="rounded-lg border border-yellow-400/20 bg-yellow-400/10 px-3 py-1.5 text-yellow-300">
                  15% = {((expectedProjectExpenseTotal * 0.15)).toLocaleString("ar-SA")} ريال
                </span>
              </div>

              {!editingExpectedProjectExpense ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setExpectedProjectExpenseInput(String(expectedProjectExpenseTotal));
                    setEditingExpectedProjectExpense(true);
                  }}
                  className="shrink-0 rounded-xl border border-yellow-400/20 bg-yellow-400/10 p-2 text-yellow-300 transition hover:bg-yellow-400 hover:text-[#081B33]"
                  title="تعديل المصاريف المتوقعة"
                >
                  <Pencil size={16} />
                </button>
              ) : (
                <div className="flex shrink-0 items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={expectedProjectExpenseInput}
                    onChange={(event) => setExpectedProjectExpenseInput(event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    className="w-28 rounded-xl border border-white/10 bg-black/20 px-2 py-2 text-center text-sm font-bold text-white outline-none focus:border-yellow-400/50"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void saveExpectedProjectExpense();
                    }}
                    disabled={savingExpectedProjectExpense}
                    className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-300 transition hover:bg-emerald-400 hover:text-[#081B33] disabled:opacity-50"
                  >
                    {savingExpectedProjectExpense ? "..." : "حفظ"}
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setEditingExpectedProjectExpense(false);
                    }}
                    className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-xs font-bold text-gray-300 hover:bg-white/10"
                  >
                    إلغاء
                  </button>
                </div>
              )}
            </div>
          </ProjectKpi>

        </div>

      </section>

      {/* =====================================================
          VILLAS
      ===================================================== */}

      <section>

        <div className="mb-6 mt-8 flex justify-center">
          <div
            className="
              w-fit
              min-w-[560px]
              rounded-2xl
              border
              border-yellow-400/25
              bg-[#171F2E]
              px-8
              py-4
              shadow-xl
              shadow-black/20
            "
          >
            <div className="flex items-center justify-center gap-8">

              {/* عنوان الفلل */}
              <div className="text-center">
                <h2 className="text-3xl font-extrabold text-white">
                  فلل المشروع
                </h2>

                <p className="mt-1 text-sm text-gray-300">
                  جميع فلل مشروع {project.name}
                </p>
              </div>

              {/* إجمالي الفلل */}
              <div
                className="
                  flex
                  items-center
                  gap-3
                  rounded-xl
                  border
                  border-yellow-400/20
                  bg-yellow-400/10
                  px-5
                  py-3
                "
              >
                <span className="text-base font-bold text-yellow-300">
                  إجمالي الفلل
                </span>

                <span className="text-3xl font-extrabold text-yellow-400">
                  {projectVillas.length || 18}
                </span>

                <span className="text-base font-semibold text-gray-300">
                  فيلا
                </span>
              </div>

            </div>
          </div>
        </div>


        {/* 3 VILLAS PER ROW */}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

          {loadingProjectData ? (
            <div className="col-span-full rounded-3xl border border-white/10 bg-white/5 px-6 py-10 text-center text-gray-300">
              جاري تحميل بيانات الفلل...
            </div>
          ) : projectVillas.length > 0 ? (
            projectVillas.map((villa) => {
              // نصيب الفيلا = سعر المتر الحالي للمشروع × مساحة الفيلا نفسها.
              const villaExpenseShare =
                currentProjectMeterPrice * Number(villa.area ?? 0);

              return (
                <VillaCard
                  key={villa.id}
                  villaNumber={villa.villa_number}
                  villaName={villa.name || `فيلا ${villa.villa_number}`}
                  projectName={project?.name ?? "المشروع"}
                  classification={villa.classification}
                  area={villa.area}
                  expenseTotal={villaExpenseShare}
                  onView={() => setSelectedVilla(villa)}
                  onEdit={() => setEditingVilla(villa)}
                />
              );
            })
          ) : (
            <div className="col-span-full rounded-3xl border border-rose-400/20 bg-rose-400/5 px-6 py-10 text-center text-gray-300">
              {projectDataError || "لا توجد بيانات فلل لهذا المشروع."}
            </div>
          )}

        </div>

      </section>


      {selectedVilla && (
        <VillaDetailsModal
          villa={selectedVilla}
          expenseTotal={projectVillas.length > 0 ? totalProjectExpenses / projectVillas.length : totalProjectExpenses / 18}
          onClose={() => setSelectedVilla(null)}
          onEdit={() => {
            setSelectedVilla(null);
            setEditingVilla(selectedVilla);
          }}
        />
      )}

      {showVillasOverview && (
        <VillasOverviewModal
          projectName={project.name}
          villas={projectVillas}
          totalArea={totalProjectArea}
          totalExpenses={totalProjectExpenses}
          currentMeterPrice={currentProjectMeterPrice}
          expectedProjectExpenseTotal={expectedProjectExpenseTotal}
          onClose={() => setShowVillasOverview(false)}
        />
      )}

      {editingVilla && (
        <VillaEditModal villa={editingVilla} onClose={() => setEditingVilla(null)} onSave={handleUpdateVilla} />
      )}

    </div>
  );
}




const formatPaymentMethod = (value: any) => {
  switch (String(value ?? "").toLowerCase()) {
    case "cash":
      return "💵 نقدًا";
    case "bank":
    case "bank transfer":
    case "bank_transfer":
    case "transfer":
      return "🏦 تحويل بنكي";
    case "card":
    case "credit card":
    case "debit card":
      return "💳 بطاقة";
    case "cheque":
    case "check":
      return "🧾 شيك";
    default:
      return value ? String(value) : "-";
  }
};

type ExpensePeriodCardProps = {
  title: string;
  value: number;
  period: "day" | "week" | "month" | "all";
  accent: "orange" | "violet" | "amber" | "rose";
  openExport: string | null;
  onOpenExport: (value: string | null) => void;
  onExport: (
    period: "day" | "week" | "month" | "all",
    type: "excel" | "pdf" | "print"
  ) => void;
  referenceDate: string;
  onReferenceDateChange: (value: string) => void;
  highestCostItem: { name: string; amount: number; percentage: number } | null;
  lowestCostItem: { name: string; amount: number; percentage: number } | null;
};

function ExpensePeriodCard({
  title,
  value,
  period,
  accent,
  openExport,
  onOpenExport,
  onExport,
  referenceDate,
  onReferenceDateChange,
  highestCostItem,
  lowestCostItem,
}: ExpensePeriodCardProps) {
  const styles = {
    orange: {
      border: "border-orange-400/20",
      bg: "bg-orange-400/5",
      value: "text-orange-400",
      button: "border-orange-400/20 bg-orange-400/10 text-orange-300 hover:bg-orange-400/20",
    },
    violet: {
      border: "border-violet-400/20",
      bg: "bg-violet-400/5",
      value: "text-violet-300",
      button: "border-violet-400/20 bg-violet-400/10 text-violet-300 hover:bg-violet-400/20",
    },
    amber: {
      border: "border-amber-400/20",
      bg: "bg-amber-400/5",
      value: "text-amber-400",
      button: "border-amber-400/20 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20",
    },
    rose: {
      border: "border-rose-400/20",
      bg: "bg-rose-400/5",
      value: "text-rose-300",
      button: "border-rose-400/20 bg-rose-400/10 text-rose-300 hover:bg-rose-400/20",
    },
  }[accent];

  const key = `period-${period}`;

  return (
    <div className={`relative rounded-3xl border ${styles.border} ${styles.bg} bg-[#081B33] p-5 shadow-xl`}>
      <p className="text-sm font-semibold text-gray-400">{title}</p>

      <div className="mt-3 flex items-baseline gap-2">
        <span className={`text-3xl font-extrabold ${styles.value}`}>
          {Number(value).toLocaleString("ar-SA")}
        </span>
        <span className="text-sm text-gray-500">ريال</span>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-3">
        <label className="mb-1 block text-[11px] font-semibold text-gray-500">التاريخ المرجعي للنتيجة</label>
        <input
          type="date"
          value={referenceDate}
          onChange={(e) => onReferenceDateChange(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-[#102947] px-3 py-2 text-sm font-bold text-white outline-none focus:border-cyan-400/50"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-3">
          <p className="text-[11px] font-bold text-emerald-300">أكثر بند تكلفة</p>
          <p className="mt-1 truncate text-sm font-extrabold text-white">
            {highestCostItem?.name ?? "لا توجد بيانات"}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {highestCostItem ? `${highestCostItem.amount.toLocaleString("ar-SA")} ريال` : "-"}
          </p>
        </div>
        <div className="rounded-2xl border border-sky-400/20 bg-sky-400/5 p-3">
          <p className="text-[11px] font-bold text-sky-300">أقل بند تكلفة</p>
          <p className="mt-1 truncate text-sm font-extrabold text-white">
            {lowestCostItem?.name ?? "لا توجد بيانات"}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {lowestCostItem ? `${lowestCostItem.amount.toLocaleString("ar-SA")} ريال` : "-"}
          </p>
        </div>
      </div>

      <div className="relative mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => onOpenExport(openExport === key ? null : key)}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition ${styles.button}`}
        >
          <Download size={16} />
          تصدير
          <ChevronDown size={15} />
        </button>

        {openExport === key && (
          <div className="absolute right-0 top-12 z-50 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#102947] p-1 shadow-2xl">
            <button
              type="button"
              onClick={() => onExport(period, "pdf")}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-right text-sm text-white hover:bg-white/10"
            >
              <FileText size={17} className="text-red-400" />
              PDF / حفظ PDF
            </button>
            <button
              type="button"
              onClick={() => onExport(period, "excel")}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-right text-sm text-white hover:bg-white/10"
            >
              <FileSpreadsheet size={17} className="text-green-400" />
              Excel
            </button>
            <button
              type="button"
              onClick={() => onExport(period, "print")}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-right text-sm text-white hover:bg-white/10"
            >
              <Printer size={17} className="text-sky-400" />
              طباعة
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

type ExpenseDetailsModalProps = {
  expense: any;
  projectName: string;
  villaName: string;
  accountName: string;
  categoryName: string;
  stageName: string;
  itemName: string;
  onClose: () => void;
};

function ExpenseDetailsModal({
  expense,
  projectName,
  villaName,
  accountName,
  categoryName,
  stageName,
  itemName,
  onClose,
}: ExpenseDetailsModalProps) {
  const ViewBox = ({ label, value }: { label: string; value: string }) => (
    <div className="rounded-2xl border border-white/10 bg-[#102947] p-4">
      <p className="mb-2 text-xs text-gray-400">{label}</p>
      <p className="font-bold text-white">{value || "-"}</p>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-white/10 bg-[#081B33] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 bg-[#102947] px-7 py-5">
          <div>
            <h2 className="text-2xl font-bold text-white">تفاصيل المصروف</h2>
            <p className="mt-1 text-sm text-gray-400">
              رقم العملية: #{expense.id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-gray-400 hover:bg-red-500/20 hover:text-red-400"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-7">
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <ViewBox label="تاريخ المصروف" value={expense.expenseDate || "-"} />
            <ViewBox label="المشروع" value={projectName} />
            <ViewBox label="الفيلا" value={villaName} />
            <ViewBox label="العهدة" value={accountName} />
            <ViewBox label="التصنيف" value={categoryName} />
            <ViewBox label="المرحلة" value={stageName} />
            <ViewBox label="البند" value={itemName} />
            <ViewBox label="رقم الفاتورة" value={expense.voucherNo || "-"} />
            <ViewBox
              label="طريقة الدفع"
              value={formatPaymentMethod(expense.paymentMethod)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-[#102947] p-5">
              <p className="text-sm text-gray-400">قبل الضريبة</p>
              <p className="mt-2 text-2xl font-bold text-white">
                {Number(expense.amount ?? 0).toLocaleString("ar-SA")}
                <span className="mr-2 text-sm text-gray-500">ريال</span>
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#102947] p-5">
              <p className="text-sm text-gray-400">الضريبة</p>
              <p className="mt-2 text-2xl font-bold text-orange-400">
                {Number(expense.tax ?? 0).toLocaleString("ar-SA")}
                <span className="mr-2 text-sm text-gray-500">ريال</span>
              </p>
            </div>
            <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-5">
              <p className="text-sm text-gray-400">إجمالي الفاتورة</p>
              <p className="mt-2 text-2xl font-bold text-yellow-400">
                {getExpenseTotal(expense).toLocaleString("ar-SA")}
                <span className="mr-2 text-sm text-gray-500">ريال</span>
              </p>
            </div>
          </div>

          {(() => {
            const attachmentUrl = expense?.attachmentUrl ?? expense?.attachment_url ?? (typeof expense?.attachment === "string" && expense.attachment.startsWith("http") ? expense.attachment : null);
            const attachmentPath = expense?.attachmentPath ?? expense?.attachment_path ?? (typeof expense?.attachment === "string" && !expense.attachment.startsWith("http") ? expense.attachment : null);
            const attachmentName = expense?.attachmentName ?? expense?.attachment_name ?? "المرفق";
            const attachment = attachmentUrl || attachmentPath;
            if (!attachment) return null;
            return (
              <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-sky-400/20 bg-sky-400/10 p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-bold text-sky-300">المرفقات</p>
                  <p className="mt-1 text-xs text-gray-400">{attachmentName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (String(attachment).startsWith("http")) window.open(String(attachment), "_blank", "noopener,noreferrer");
                    else alert("المرفق محفوظ بمسار داخلي ولا يوجد رابط مباشر لفتحه.");
                  }}
                  className="rounded-xl bg-sky-500 px-5 py-3 font-bold text-white hover:bg-sky-600"
                >
                  عرض المرفق
                </button>
              </div>
            );
          })()}

          {expense.description && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-[#102947] p-5">
              <p className="mb-2 text-sm text-gray-400">الوصف</p>
              <p className="leading-7 text-white">{expense.description}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-white/10 bg-[#102947] px-7 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-yellow-400 px-7 py-3 font-bold text-[#081B33] hover:bg-yellow-300"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}


/* =========================================================
   TOP COST PANEL
========================================================= */

type TopCostItem = {
  name: string;
  amount: number;
  percentage: number;
  expectedPercentage?: number;
};

type TopCostPanelProps = {
  title: string;
  items: TopCostItem[];
  accent: "green" | "blue";
  onViewAll: () => void;
};

function TopCostPanel({
  title,
  items,
  accent,
  onViewAll,
}: TopCostPanelProps) {

  const accentClasses =
    accent === "green"
      ? {
          border: "border-emerald-400/20",
          icon: "text-emerald-400",
          number: "bg-emerald-400/10 text-emerald-300 border-emerald-400/20",
          bar: "bg-emerald-400",
          button:
            "border-emerald-400/20 bg-emerald-400/5 hover:bg-emerald-400/10",
        }
      : {
          border: "border-blue-400/20",
          icon: "text-blue-400",
          number: "bg-blue-400/10 text-blue-300 border-blue-400/20",
          bar: "bg-blue-400",
          button:
            "border-blue-400/20 bg-blue-400/5 hover:bg-blue-400/10",
        };

  return (
    <div
      className={`
        overflow-hidden
        rounded-3xl
        border
        ${accentClasses.border}
        bg-gradient-to-br
        from-[#102A43]
        via-[#102337]
        to-[#0B1928]
        shadow-xl
      `}
    >

      {/* Header */}
      <div
        className="
          flex
          items-center
          justify-between
          border-b
          border-white/10
          px-6
          py-5
        "
      >
        <div className="flex-1 text-right">
          <h3 className="text-xl font-extrabold text-white">
            {title}
          </h3>

          <p className="mt-1 text-sm text-gray-400">
            ترتيب البنود حسب إجمالي التكلفة حتى الآن
          </p>
        </div>

        <div
          className={`
            mr-4
            flex
            h-12
            w-12
            items-center
            justify-center
            rounded-2xl
            border
            border-white/10
            bg-white/5
            ${accentClasses.icon}
          `}
        >
          <WalletCards size={25} />
        </div>
      </div>


      {/* Table Header */}
      <div
        className="
          grid
          grid-cols-[48px_1fr_145px_120px]
          items-center
          gap-3
          border-b
          border-white/10
          bg-black/10
          px-5
          py-4
          text-xs
          font-bold
          text-gray-400
        "
      >
        <div className="text-center">
          #
        </div>

        <div>
          اسم التصنيف
        </div>

        <div className="text-center">
          إجمالي التكلفة
        </div>

        <div className="text-center">
          النسبة
        </div>
      </div>


      {/* Items */}
      <div>
        {items.slice(0, 3).map((item, index) => {

          const percentage =
            Math.max(
              0,
              Math.min(
                100,
                Number(item.percentage) || 0
              )
            );

          return (
            <div
              key={`${item.name}-${index}`}
              className="
                border-b
                border-white/10
                px-5
                py-5
              "
            >

              <div
                className="
                  grid
                  grid-cols-[48px_1fr_145px_120px]
                  items-center
                  gap-3
                "
              >

                {/* Number */}
                <div className="flex justify-center">
                  <span
                    className={`
                      flex
                      h-9
                      w-9
                      items-center
                      justify-center
                      rounded-xl
                      border
                      text-sm
                      font-extrabold
                      ${accentClasses.number}
                    `}
                  >
                    {index + 1}
                  </span>
                </div>


                {/* Name */}
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-white">
                    {item.name}
                  </p>

                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full ${accentClasses.bar}`}
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  </div>
                </div>


                {/* Amount */}
                <div className="text-center">
                  <p className="text-base font-extrabold text-white">
                    {Number(item.amount).toLocaleString("ar-SA")}
                  </p>

                  <p className="mt-1 text-[11px] text-gray-500">
                    ريال
                  </p>
                </div>


                {/* Percentage */}
                <div className="text-center">
                  <span
                    className={`
                      inline-flex
                      rounded-full
                      border
                      px-3
                      py-1
                      text-sm
                      font-extrabold
                      ${accentClasses.number}
                    `}
                  >
                    {percentage.toFixed(1)}%
                  </span>
                </div>

              </div>

            </div>
          );
        })}
      </div>


      {/* Footer */}
      <div className="px-5 py-4">
        <button
          type="button"
          onClick={onViewAll}
          className={`
            w-full
            rounded-2xl
            border
            px-5
            py-3
            text-sm
            font-bold
            text-gray-200
            transition
            ${accentClasses.button}
          `}
        >
          عرض جميع التصنيفات
          <span className="mr-2">
            ←
          </span>
        </button>
      </div>

    </div>
  );
}


/* =========================================================
   ALL COST ITEMS MODAL
========================================================= */

type AllCostItemsModalProps = {
  projectName: string;
  items: TopCostItem[];
  total: number;
  onClose: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  onPrint: () => void;
};

function AllCostItemsModal({
  projectName,
  items,
  total,
  onClose,
  onExportExcel,
  onExportPdf,
  onPrint,
}: AllCostItemsModalProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="
          flex
          max-h-[90vh]
          w-full
          max-w-6xl
          flex-col
          overflow-hidden
          rounded-3xl
          border
          border-white/10
          bg-gradient-to-br
          from-[#102A43]
          via-[#102337]
          to-[#0B1928]
          shadow-2xl
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div className="text-right">
            <h2 className="text-2xl font-extrabold text-white">
              جميع التصنيفات
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              جميع تصنيفات مشروع {projectName} مرتبة حسب إجمالي التكلفة
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-xl
              border
              border-white/10
              bg-white/5
              text-gray-300
              transition
              hover:bg-rose-400/10
              hover:text-rose-300
            "
            aria-label="إغلاق"
          >
            <X size={22} />
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 gap-4 border-b border-white/10 bg-black/10 p-5 md:grid-cols-2">
          <div className="rounded-2xl border border-blue-400/20 bg-blue-400/5 p-4">
            <p className="text-sm font-semibold text-gray-400">عدد التصنيفات</p>
            <p className="mt-1 text-2xl font-extrabold text-white">
              {items.length}
            </p>
          </div>

          <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-4">
            <p className="text-sm font-semibold text-gray-400">
              إجمالي تكلفة التصنيفات
            </p>
            <p className="mt-1 text-2xl font-extrabold text-yellow-400">
              {total.toLocaleString("ar-SA")} ريال
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="min-h-0 flex-1 overflow-auto p-5">
          <div className="mb-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 px-5 py-3 text-sm text-gray-300">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>
                أساس <strong className="text-white">النسبة المحددة</strong>:
                إجمالي المصروفات المتوقعة للمشروع ={" "}
                <strong className="text-cyan-300">
                  {expectedProjectExpenseTotal.toLocaleString("ar-SA")} ريال
                </strong>
              </span>
              <span className="text-xs text-gray-400">
                10% = {((expectedProjectExpenseTotal * 0.10)).toLocaleString("ar-SA")} ريال — 15% = {((expectedProjectExpenseTotal * 0.15)).toLocaleString("ar-SA")} ريال
              </span>
            </div>
          </div>

          <div className="min-w-[980px] overflow-hidden rounded-2xl border border-white/10">
            <div
              className="
                grid
                grid-cols-[60px_1fr_170px_170px_170px]
                items-center
                gap-3
                border-b
                border-white/10
                bg-black/20
                px-5
                py-4
                text-sm
                font-bold
                text-gray-400
              "
            >
              <div className="text-center">#</div>
              <div>اسم التصنيف</div>
              <div className="text-center">إجمالي التكلفة</div>
              <div className="text-center">نسبة من المصروف الحالي</div>
              <div className="text-center">النسبة المحددة</div>
            </div>

            {items.length > 0 ? (
              items.map((item, index) => {
                const percentage = Math.max(
                  0,
                  Math.min(100, Number(item.percentage) || 0)
                );
                const expectedPercentage = Math.max(
                  0,
                  Number(item.expectedPercentage) || 0
                );

                const expectedColor =
                  expectedPercentage <= 10
                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                    : expectedPercentage <= 15
                      ? "border-yellow-400/20 bg-yellow-400/10 text-yellow-300"
                      : "border-red-400/20 bg-red-400/10 text-red-300";

                const expectedBarColor =
                  expectedPercentage <= 10
                    ? "bg-emerald-400"
                    : expectedPercentage <= 15
                      ? "bg-yellow-400"
                      : "bg-red-400";

                return (
                  <div
                    key={`${item.name}-${index}`}
                    className="grid grid-cols-[60px_1fr_170px_170px_170px] items-center gap-3 border-b border-white/10 px-5 py-5 last:border-b-0"
                  >
                    <div className="flex justify-center">
                      <span
                        className="
                          flex h-9 w-9 items-center justify-center rounded-xl
                          border border-blue-400/20 bg-blue-400/10
                          text-sm font-extrabold text-blue-300
                        "
                      >
                        {index + 1}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-white">
                        {item.name}
                      </p>

                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full ${expectedBarColor}`}
                          style={{
                            width: `${Math.min(100, expectedPercentage)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="text-center">
                      <p className="text-base font-extrabold text-white">
                        {Number(item.amount).toLocaleString("ar-SA")}
                      </p>
                      <p className="mt-1 text-[11px] text-gray-500">ريال</p>
                    </div>

                    <div className="text-center">
                      <span className="inline-flex rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-sm font-extrabold text-blue-300">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>

                    <div className="text-center">
                      <span
                        className={`inline-flex min-w-[82px] justify-center rounded-full border px-3 py-1 text-sm font-extrabold ${expectedColor}`}
                      >
                        {expectedPercentage.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-6 py-12 text-center text-gray-400">
                لا توجد تصنيفات مصروفة حتى الآن.
              </div>
            )}

            {items.length > 0 && (
              <div className="grid grid-cols-[60px_1fr_170px_170px_170px] items-center gap-3 border-t border-yellow-400/20 bg-yellow-400/5 px-5 py-5">
                <div />
                <div className="text-lg font-extrabold text-yellow-300">
                  الإجمالي
                </div>
                <div className="text-center text-lg font-extrabold text-yellow-400">
                  {total.toLocaleString("ar-SA")} ريال
                </div>
                <div className="text-center">
                  <span className="inline-flex rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-sm font-extrabold text-blue-300">
                    100%
                  </span>
                </div>
                <div className="text-center">
                  <span className="inline-flex rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-sm font-extrabold text-yellow-300">
                    {((total / expectedProjectExpenseTotal) * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="grid grid-cols-1 gap-3 border-t border-white/10 bg-black/10 p-5 sm:grid-cols-3">
          <button
            type="button"
            onClick={onExportPdf}
            className="
              flex items-center justify-center gap-2 rounded-2xl
              border border-rose-400/20 bg-rose-400/10 px-5 py-3
              font-bold text-rose-300 transition hover:bg-rose-400 hover:text-white
            "
          >
            <FileText size={19} />
            تصدير PDF
          </button>

          <button
            type="button"
            onClick={onExportExcel}
            className="
              flex items-center justify-center gap-2 rounded-2xl
              border border-emerald-400/20 bg-emerald-400/10 px-5 py-3
              font-bold text-emerald-300 transition hover:bg-emerald-400 hover:text-[#081B33]
            "
          >
            <FileSpreadsheet size={19} />
            تصدير Excel
          </button>

          <button
            type="button"
            onClick={onPrint}
            className="
              flex items-center justify-center gap-2 rounded-2xl
              border border-blue-400/20 bg-blue-400/10 px-5 py-3
              font-bold text-blue-300 transition hover:bg-blue-400 hover:text-white
            "
          >
            <Printer size={19} />
            طباعة
          </button>
        </div>
      </div>
    </div>
  );
}


/* =========================================================
   PROJECT KPI CARD
========================================================= */

type ProjectKpiProps = {
  icon: React.ReactNode;
  title: string;
  value: string;
  suffix?: string;
  cardClass: string;
  onClick?: () => void;
  children?: React.ReactNode;
};

function ProjectKpi({
  icon,
  title,
  value,
  suffix,
  cardClass,
  onClick,
  children,
}: ProjectKpiProps) {
  return (
    <div
      className={`
        group
        relative
        min-h-[205px]
        overflow-hidden
        rounded-3xl
        border
        bg-gradient-to-br
        ${cardClass}
        p-6
        shadow-lg
        transition-all
        duration-300
        hover:-translate-y-1
        hover:shadow-2xl
        ${onClick ? "cursor-pointer" : ""}
      `}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(event) => {
        if (onClick && (event.key === "Enter" || event.key === " ")) onClick();
      }}
    >

      {/* Glow */}
      <div
        className="
          pointer-events-none
          absolute
          -left-10
          -top-10
          h-32
          w-32
          rounded-full
          bg-white/5
          blur-3xl
          transition-all
          duration-500
          group-hover:scale-150
        "
      />


      <div
        className="
          relative
          z-10
          flex
          items-center
          justify-between
          gap-6
        "
      >

        {/* RIGHT - ICON */}
        <div
          className="
            flex
            h-24
            w-24
            shrink-0
            items-center
            justify-center
            rounded-3xl
            border
            border-white/10
            bg-black/10
            text-white
            shadow-xl
            backdrop-blur-sm
            transition-all
            duration-300
            group-hover:scale-110
            group-hover:rotate-2
          "
        >
          {icon}
        </div>


        {/* LEFT - TEXT */}
        <div className="flex-1 text-left">

          <p
            className="
              text-lg
              font-bold
              leading-tight
              text-white
            "
          >
            {title}
          </p>


          <div
            className="
              mt-4
              flex
              items-baseline
              gap-2
            "
          >

            <h3
              className="
                text-3xl
                font-extrabold
                leading-none
                text-white
              "
            >
              {value}
            </h3>

            {suffix && (
              <span
                className="
                  text-sm
                  font-semibold
                  text-gray-300
                "
              >
                {suffix}
              </span>
            )}

          </div>

        </div>

      </div>


      {/* Optional Content */}
      {children}

    </div>
  );
}


/* =========================================================
   VILLA COUNT
========================================================= */

type VillaCountProps = {
  title: string;
  value: string;
};

function VillaCount({
  title,
  value,
}: VillaCountProps) {
  return (
    <div className="text-center">

      <p className="text-sm font-semibold text-gray-400">
        {title}
      </p>

      <p className="mt-1 text-xl font-extrabold text-white">
        {value}
      </p>

    </div>
  );
}


type VillaCardProps = {
  villaNumber: number;
  villaName: string;
  projectName: string;
  classification: string | null;
  area: number | null;
  expenseTotal: number;
  onView: () => void;
  onEdit: () => void;
};

function VillaCard({
  villaNumber,
  villaName,
  projectName,
  classification,
  area,
  expenseTotal,
  onView,
  onEdit,
}: VillaCardProps) {
  return (
    <div className="group flex min-h-[410px] flex-col overflow-hidden rounded-3xl border border-blue-400/15 bg-gradient-to-br from-[#12365D] via-[#0D2948] to-[#091C31] shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-yellow-400/30 hover:shadow-2xl">
      <div className="flex items-start justify-between border-b border-white/10 p-7">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-yellow-400/20 bg-yellow-400/10 text-yellow-400 shadow-lg transition duration-300 group-hover:scale-105">
            <Home size={40} />
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-3">
            <h3 className="text-2xl font-extrabold leading-tight text-white">{villaName}</h3>
            <span className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-base font-extrabold text-yellow-400">فيلا {villaNumber}</span>
          </div>
          <p className="mt-2 text-sm font-bold text-yellow-300">{classification || "غير محدد"}</p>
          <p className="mt-2 text-sm text-gray-400">مشروع {projectName}</p>
        </div>
      </div>

      <div className="flex-1 px-7 py-7">
        <div className="grid grid-cols-2 gap-4">
          <VillaStatBox label="المساحة" value={`${Number(area ?? 0).toLocaleString("ar-SA")} م²`} />
          <VillaStatBox label="التصنيف" value={classification || "غير محدد"} />
        </div>
        <div className="mt-4 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-5 py-4 text-center">
          <p className="text-sm font-semibold text-gray-400">نصيب الفيلا من إجمالي مصاريف المشروع</p>
          <p className="mt-1 text-3xl font-extrabold text-yellow-400">{expenseTotal.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} ريال</p>
          <p className="mt-1 text-xs text-gray-500">سعر المتر الحالي × مساحة الفيلا</p>
        </div>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-3 border-t border-white/10 p-5">
        <button onClick={onView} className="flex items-center justify-center gap-2 rounded-xl border border-blue-400/20 bg-blue-500/10 py-3 font-bold text-blue-300 transition hover:bg-blue-500 hover:text-white">عرض <Eye size={18} /></button>
        <button onClick={onEdit} className="flex items-center justify-center gap-2 rounded-xl border border-yellow-400/20 bg-yellow-400/10 py-3 font-bold text-yellow-400 transition hover:bg-yellow-400 hover:text-[#081B33]">تعديل <Pencil size={18} /></button>
      </div>
    </div>
  );
}

function VillaStatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
      <p className="text-sm font-semibold text-gray-400">{label}</p>
      <p className="mt-2 text-lg font-extrabold text-white">{value}</p>
    </div>
  );
}

function VillaEditModal({ villa, onClose, onSave }: { villa: ProjectVilla; onClose: () => void; onSave: (villa: ProjectVilla) => Promise<boolean> }) {
  const [form, setForm] = useState<ProjectVilla>(villa);
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#081B33] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 bg-[#102947] px-7 py-5">
          <div><h2 className="text-2xl font-extrabold text-white">تعديل بيانات الفيلا</h2><p className="mt-1 text-sm text-gray-400">تعديل الاسم والمساحة والرقم والتصنيف</p></div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-gray-400 hover:bg-red-500/20 hover:text-red-300"><X size={20} /></button>
        </div>
        <div className="grid grid-cols-1 gap-5 p-7 md:grid-cols-2">
          <label><span className="mb-2 block text-sm font-semibold text-gray-300">اسم الفيلا *</span><input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-12 w-full rounded-xl border border-white/10 bg-[#102947] px-4 text-white outline-none focus:border-yellow-400" /></label>
          <label><span className="mb-2 block text-sm font-semibold text-gray-300">رقم الفيلا *</span><input type="number" min="1" value={form.villa_number} onChange={(e) => setForm({ ...form, villa_number: Number(e.target.value) })} className="h-12 w-full rounded-xl border border-white/10 bg-[#102947] px-4 text-white outline-none focus:border-yellow-400" /></label>
          <label><span className="mb-2 block text-sm font-semibold text-gray-300">المساحة م² *</span><input type="number" min="0" step="0.01" value={form.area ?? ""} onChange={(e) => setForm({ ...form, area: Number(e.target.value) })} className="h-12 w-full rounded-xl border border-white/10 bg-[#102947] px-4 text-white outline-none focus:border-yellow-400" /></label>
          <label><span className="mb-2 block text-sm font-semibold text-gray-300">التصنيف</span><select value={form.classification ?? ""} onChange={(e) => setForm({ ...form, classification: e.target.value || null })} className="h-12 w-full rounded-xl border border-white/10 bg-[#102947] px-4 text-white outline-none focus:border-yellow-400"><option value="">غير محدد</option><option value="صغيرة">صغيرة</option><option value="متوسطة">متوسطة</option><option value="كبيرة">كبيرة</option></select></label>
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-white/10 bg-[#102947] p-5">
          <button type="button" onClick={onClose} className="rounded-xl border border-white/10 px-6 py-3 font-bold text-white hover:bg-white/5">إلغاء</button>
          <button type="button" onClick={() => onSave(form)} className="rounded-xl bg-yellow-400 px-6 py-3 font-bold text-[#081B33] hover:bg-yellow-300">حفظ التعديلات</button>
        </div>
      </div>
    </div>
  );
}

function VillasOverviewModal({
  projectName,
  villas,
  totalArea,
  totalExpenses,
  currentMeterPrice,
  expectedProjectExpenseTotal,
  onClose,
}: {
  projectName: string;
  villas: ProjectVilla[];
  totalArea: number;
  totalExpenses: number;
  currentMeterPrice: number;
  expectedProjectExpenseTotal: number;
  onClose: () => void;
}) {
  const villaCount = villas.length || 18;
  const villaShare = totalExpenses / villaCount;

  const exportExcel = () => {
    const rows = villas.map((villa) => {
      const area = Number(villa.area ?? 0);
      const meterPrice = area > 0 ? villaShare / area : 0;
      return `<tr><td>${villa.villa_number}</td><td>${escapeHtml(villa.name || `فيلا ${villa.villa_number}`)}</td><td>${escapeHtml(villa.classification || "غير محدد")}</td><td>${area}</td><td>${villaShare.toFixed(2)}</td><td>${meterPrice.toFixed(2)}</td></tr>`;
    }).join("");

    const html = `<html dir="rtl"><head><meta charset="UTF-8"/><title>تفاصيل فلل ${escapeHtml(projectName)}</title></head><body><h2>تفاصيل فلل ${escapeHtml(projectName)}</h2><p>إجمالي الفلل: ${villaCount} — إجمالي المساحة: ${totalArea.toLocaleString("ar-SA")} م² — إجمالي المصاريف: ${totalExpenses.toLocaleString("ar-SA")} ريال — سعر المتر: ${currentMeterPrice.toFixed(2)} ريال/م²</p><table border="1"><tr><th>رقم الفيلا</th><th>اسم الفيلا</th><th>التصنيف</th><th>المساحة</th><th>نصيب الفيلا من المصاريف</th><th>سعر المتر للمصروف</th></tr>${rows}</table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `تفاصيل_فلل_${projectName}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    const rows = villas.map((villa) => {
      const area = Number(villa.area ?? 0);
      const meterPrice = area > 0 ? villaShare / area : 0;
      return `<tr><td>${villa.villa_number}</td><td>${escapeHtml(villa.name || `فيلا ${villa.villa_number}`)}</td><td>${escapeHtml(villa.classification || "غير محدد")}</td><td>${area.toLocaleString("ar-SA")} م²</td><td>${villaShare.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} ريال</td><td>${meterPrice.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} ريال/م²</td></tr>`;
    }).join("");
    const w = window.open("", "_blank", "width=1400,height=900");
    if (!w) { alert("يرجى السماح بالنوافذ المنبثقة للطباعة."); return; }
    w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>تفاصيل فلل ${escapeHtml(projectName)}</title><style>body{font-family:Arial,Tahoma,sans-serif;padding:24px;color:#111827}h1{margin:0 0 8px}p{color:#6b7280}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #d1d5db;padding:9px;text-align:center}th{background:#0f2d4d;color:#fff}</style></head><body><h1>تفاصيل فلل ${escapeHtml(projectName)}</h1><p>إجمالي الفلل: ${villaCount} — إجمالي المساحة: ${totalArea.toLocaleString("ar-SA")} م² — إجمالي المصاريف: ${totalExpenses.toLocaleString("ar-SA")} ريال — سعر المتر: ${currentMeterPrice.toFixed(2)} ريال/م²</p><table><tr><th>رقم الفيلا</th><th>اسم الفيلا</th><th>التصنيف</th><th>المساحة</th><th>نصيب الفيلا من المصاريف</th><th>سعر المتر للمصروف</th></tr>${rows}</table></body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  };

  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#071A2E] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 bg-[#102947] px-7 py-5">
          <div className="text-right"><h2 className="text-2xl font-extrabold text-white">تفاصيل فلل المشروع</h2><p className="mt-1 text-sm text-gray-400">جميع فلل مشروع {projectName} وحساب نصيب كل فيلا بالتساوي</p></div>
          <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-300 hover:bg-red-500/20 hover:text-red-300"><X size={22} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-4">
            <VillaStatBox label="إجمالي الفلل" value={`${villaCount} فيلا`} />
            <VillaStatBox label="إجمالي المساحة" value={`${totalArea.toLocaleString("ar-SA")} م²`} />
            <VillaStatBox label="إجمالي المصاريف" value={`${totalExpenses.toLocaleString("ar-SA")} ريال`} />
            <VillaStatBox label="سعر المتر الحالي" value={`${currentMeterPrice.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} ريال / م²`} />
          </div>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[1050px] text-sm text-white">
              <thead className="bg-[#102947] text-gray-300"><tr><th className="p-4 text-center">رقم الفيلا</th><th className="p-4 text-center">اسم الفيلا</th><th className="p-4 text-center">التصنيف</th><th className="p-4 text-center">المساحة</th><th className="p-4 text-center">نصيب الفيلا من المصاريف</th><th className="p-4 text-center">سعر المتر للمصروف</th></tr></thead>
              <tbody className="divide-y divide-white/10">
                {villas.map((villa) => {
                  const area = Number(villa.area ?? 0);
                  const meterPrice = area > 0 ? villaShare / area : 0;
                  return <tr key={villa.id} className="hover:bg-white/[0.03]"><td className="p-4 text-center font-bold">{villa.villa_number}</td><td className="p-4 text-center">{villa.name || `فيلا ${villa.villa_number}`}</td><td className="p-4 text-center">{villa.classification || "غير محدد"}</td><td className="p-4 text-center">{area.toLocaleString("ar-SA")} م²</td><td className="p-4 text-center font-bold text-yellow-400">{villaShare.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} ريال</td><td className="p-4 text-center font-bold text-amber-300">{meterPrice.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} ريال/م²</td></tr>;
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 border-t border-white/10 bg-[#102947] p-5 sm:grid-cols-3">
          <button type="button" onClick={exportExcel} className="flex items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-6 py-3 font-bold text-emerald-300 hover:bg-emerald-400/20"><FileSpreadsheet size={17} /> تصدير Excel</button>
          <button type="button" onClick={printReport} className="flex items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-6 py-3 font-bold text-red-300 hover:bg-red-400/20"><FileText size={17} /> PDF / حفظ PDF</button>
          <button type="button" onClick={printReport} className="flex items-center justify-center gap-2 rounded-xl border border-blue-400/20 bg-blue-400/10 px-6 py-3 font-bold text-blue-300 hover:bg-blue-400/20"><Printer size={17} /> طباعة</button>
        </div>
      </div>
    </div>
  );
}

function VillaDetailsModal({ villa, expenseTotal, onClose, onEdit }: { villa: ProjectVilla; expenseTotal: number; onClose: () => void; onEdit: () => void }) {
  const area = Number(villa.area ?? 0);
  const meterPrice = area > 0 ? expenseTotal / area : 0;

  return (
    <div className="fixed inset-0 z-[115] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/10 bg-[#081B33] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 bg-[#102947] px-7 py-5">
          <div className="flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-yellow-400/20 bg-yellow-400/10 text-yellow-400"><Home size={30} /></div><div><h2 className="text-2xl font-extrabold text-white">تفاصيل {villa.name || `فيلا ${villa.villa_number}`}</h2><p className="mt-1 text-sm text-gray-400">بيانات الفيلا ونصيبها من مصروفات المشروع</p></div></div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-gray-400 hover:bg-red-500/20 hover:text-red-300"><X size={20} /></button>
        </div>
        <div className="p-7">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4"><VillaStatBox label="رقم الفيلا" value={String(villa.villa_number)} /><VillaStatBox label="المساحة" value={`${area.toLocaleString("ar-SA")} م²`} /><VillaStatBox label="التصنيف" value={villa.classification || "غير محدد"} /><VillaStatBox label="سعر المتر للمصروف" value={`${meterPrice.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} ريال`} /></div>
          <div className="mt-5 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-6 text-center"><p className="text-sm font-semibold text-gray-400">نصيب الفيلا من إجمالي مصاريف المشروع</p><p className="mt-2 text-3xl font-extrabold text-yellow-400">{expenseTotal.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} ريال</p></div>
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-5"><p className="text-sm font-semibold text-gray-400">طريقة الحساب</p><p className="mt-2 text-lg font-bold text-white">{expenseTotal.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} ÷ {area.toLocaleString("ar-SA")} = {meterPrice.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} ريال / م²</p></div>
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-white/10 bg-[#102947] p-5">
          <button type="button" onClick={onEdit} className="rounded-xl bg-yellow-400 px-5 py-3 font-bold text-[#081B33] hover:bg-yellow-300">تعديل بيانات الفيلا</button>
          <button type="button" onClick={onClose} className="rounded-xl border border-white/10 px-5 py-3 font-bold text-white hover:bg-white/5">إغلاق</button>
        </div>
      </div>
    </div>
  );
}
