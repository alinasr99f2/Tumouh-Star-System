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
} from "lucide-react";

import { projects } from "../../data/projects";
import { supabase } from "../../utils/supabase";
import ExpenseModal from "../../components/financial/ExpenseModal";

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

  const project = projects.find(
    (p) => p.id === Number(id)
  );
  const projectName = project?.name ?? "مشروع تبوك";

  const [projectExpenses, setProjectExpenses] = useState<any[]>([]);
  const [projectVillas, setProjectVillas] = useState<ProjectVilla[]>([]);
  const [topCostItems, setTopCostItems] = useState<any[]>([]);
  const [showAllCostItems, setShowAllCostItems] = useState(false);
  const [loadingProjectData, setLoadingProjectData] = useState(true);
  const [projectDataError, setProjectDataError] = useState<string | null>(null);

  // Expense management state
  const [accounts, setAccounts] = useState<any[]>([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<any | null>(null);
  const [openExpenseExport, setOpenExpenseExport] = useState<string | null>(null);

  // Lookup data used by the project expense table.
  const [categories, setCategories] = useState<any[]>([]);
  const [expenseItems, setExpenseItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);

  const expenseRows = projectExpenses;

  const todayKey = localDateString();
  const todayDate = new Date();
  const weekStartDate = new Date(todayDate);
  weekStartDate.setHours(0, 0, 0, 0);
  weekStartDate.setDate(todayDate.getDate() - todayDate.getDay());

  const weekStartKey = localDateString(weekStartDate);
  const monthStartKey = localDateString(
    new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)
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

  const stageNameMap = useMemo(
    () =>
      new Map<number, string>(
        stages.map((stage: any) => [
          Number(stage.id),
          String(stage.name ?? "غير محددة"),
        ])
      ),
    [stages]
  );

  const getExpenseStageName = (expense: any) => {
    const directStageId =
      expense?.stageId ??
      expense?.stage_id ??
      expense?.phaseId ??
      expense?.phase_id ??
      null;

    if (directStageId !== null && directStageId !== undefined && directStageId !== "") {
      const directName = stageNameMap.get(Number(directStageId));
      if (directName) return directName;
    }

    const categoryId = expense?.categoryId ?? expense?.category_id ?? null;
    if (categoryId !== null && categoryId !== undefined && categoryId !== "") {
      const category = categories.find(
        (item: any) => Number(item.id) === Number(categoryId)
      );
      const categoryStageId = category?.stage_id ?? category?.stageId ?? null;
      if (categoryStageId !== null && categoryStageId !== undefined && categoryStageId !== "") {
        return stageNameMap.get(Number(categoryStageId)) ?? "غير محددة";
      }
    }

    const storedStageName = expense?.stageName ?? expense?.stage_name ?? null;
    if (storedStageName !== null && storedStageName !== undefined && String(storedStageName).trim() !== "") {
      const normalizedStoredName = String(storedStageName).trim();
      if (!/^\d+$/.test(normalizedStoredName)) {
        return normalizedStoredName;
      }

      const numericStoredId = Number(normalizedStoredName);
      const numericStoredName = stageNameMap.get(numericStoredId);
      if (numericStoredName) return numericStoredName;
    }

    return "غير محددة";
  };

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
        .order("id", { ascending: true }),
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
    const total =
      row.total !== null && row.total !== undefined
        ? Number(row.total)
        : Number(row.amount_before_tax ?? row.amount ?? 0) + Number(row.tax ?? 0);

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
      console.error("خطأ في تحميل مراحل المصروفات:", stagesResult.error);
      setStages([]);
    } else {
      setStages(stagesResult.data ?? []);
    }

    const normalizedExpenses = (expensesResult.data ?? []).map((row: any) => ({
      ...row,
      expenseDate: row.date ?? row.expense_date ?? row.entry_date ?? "",
      entryDate: row.entry_date ?? row.date ?? "",
      voucherNo: row.invoice_number ?? row.voucher_no ?? "",
      villaId: row.villa_id ?? null,
      accountId: row.account_id ?? null,
      stageId: row.stage_id ?? null,
      stageName:
        stagesResult.data?.find(
          (stage: any) => Number(stage.id) === Number(row.stage_id)
        )?.name ??
        row.stage_name ??
        null,
      categoryId: row.category_id ?? null,
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

  const villaCounts = useMemo(() => ({
    صغيرة: projectVillas.filter((villa) => villa.classification === "صغيرة").length,
    متوسطة: projectVillas.filter((villa) => villa.classification === "متوسطة").length,
    كبيرة: projectVillas.filter((villa) => villa.classification === "كبيرة").length,
  }), [projectVillas]);

  const totalProjectArea = useMemo(
    () => projectVillas.reduce((sum, villa) => sum + Number(villa.area ?? 0), 0),
    [projectVillas]
  );

  const totalCostItems = useMemo(
    () => topCostItems.reduce((sum, item) => sum + Number(item.total ?? 0), 0),
    [topCostItems]
  );

  const formatCostItem = (item: any) => ({
    name: String(item.name ?? "غير مصنف"),
    amount: Number(item.total ?? 0),
    percentage:
      totalCostItems > 0
        ? (Number(item.total ?? 0) / totalCostItems) * 100
        : 0,
  });

  const highestCostItems = useMemo(
    () => topCostItems.slice(0, 3).map(formatCostItem),
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

  const allCostItems = useMemo(
    () => topCostItems.map(formatCostItem),
    [topCostItems, totalCostItems]
  );

  const exportCostItemsToExcel = () => {
    const rows = allCostItems
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(item.name)}</td>
            <td>${item.amount}</td>
            <td>${item.percentage.toFixed(1)}%</td>
          </tr>
        `
      )
      .join("");

    const html = `
      <html dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <title>بنود تكاليف ${escapeHtml(project?.name ?? "المشروع")}</title>
        </head>
        <body>
          <table border="1">
            <tr>
              <th colspan="4">جميع بنود تكاليف ${escapeHtml(project?.name ?? "المشروع")}</th>
            </tr>
            <tr>
              <th>#</th>
              <th>اسم البند</th>
              <th>إجمالي التكلفة</th>
              <th>النسبة</th>
            </tr>
            ${rows}
            <tr>
              <th colspan="2">الإجمالي</th>
              <th>${totalCostItems}</th>
              <th>100%</th>
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
    link.download = `بنود_تكاليف_${project?.name ?? "المشروع"}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const printCostItems = (saveAsPdf = false) => {
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
          </tr>
        `
      )
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <title>بنود تكاليف ${escapeHtml(project?.name ?? "المشروع")}</title>
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
            <h1>جميع بنود تكاليف ${escapeHtml(project?.name ?? "المشروع")}</h1>
            <div class="date">${new Date().toLocaleDateString("ar-SA")}</div>
          </div>

          <div class="summary">
            <div class="summary-box">
              <div class="summary-label">عدد البنود</div>
              <div class="summary-value">${allCostItems.length}</div>
            </div>
            <div class="summary-box">
              <div class="summary-label">إجمالي التكلفة</div>
              <div class="summary-value">${totalCostItems.toLocaleString("ar-SA")} ريال</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>اسم البند</th>
                <th>إجمالي التكلفة</th>
                <th>النسبة</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
              <tr class="total">
                <td colspan="2">الإجمالي</td>
                <td>${totalCostItems.toLocaleString("ar-SA")} ريال</td>
                <td>100%</td>
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
        printWindow.document.title = `PDF - بنود تكاليف ${project?.name ?? "المشروع"}`;
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
    setEditingExpense(expense);
    setShowExpenseModal(true);
  };

  const handleDeleteExpense = async (expense: any) => {
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

    const accountId = Number(expense?.accountId);
    const stageId = expense?.stageId ? Number(expense.stageId) : null;
    const categoryId = expense?.categoryId ? Number(expense.categoryId) : null;
    const itemId = expense?.itemId ? Number(expense.itemId) : null;
    const villaId =
      expense?.villaId && expense.villaId !== "general"
        ? Number(expense.villaId)
        : null;

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
            stage_id: stageId,
            category_id: categoryId,
            item_id: itemId,
            invoice_number: expense?.voucherNo || null,
            amount_before_tax: amount,
            tax,
            total,
            payment_method: expense?.paymentMethod || null,
            description: expense?.description || null,
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
          stage_id: stageId,
          category_id: categoryId,
          item_id: itemId,
          invoice_number: expense?.voucherNo || null,
          amount_before_tax: amount,
          tax,
          total,
          payment_method: expense?.paymentMethod || null,
          description: expense?.description || null,
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
      if (period === "day") return date === todayKey;
      if (period === "week") return date >= weekStartKey && date <= todayKey;
      return date >= monthStartKey && date <= todayKey;
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
    [expenseRows, todayKey, weekStartKey, monthStartKey]
  );

  const exportExpensesToExcel = (
    period: "day" | "week" | "month" | "all" = "all"
  ) => {
    const rows = getPeriodExpenses(period);
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
            <td>${escapeHtml(villaNameMap.get(Number(expense.villaId)) ?? "مصروف عام")}</td>
            <td>${escapeHtml(accountNameMap.get(Number(expense.accountId)) ?? "-")}</td>
            <td>${escapeHtml(getExpenseStageName(expense))}</td>
            <td>${escapeHtml(categoryNameMap.get(Number(expense.categoryId)) ?? "-")}</td>
            <td>${escapeHtml(itemNameMap.get(Number(expense.itemId)) ?? "-")}</td>
            <td>${escapeHtml(expense.supplier || (expense.supplier_id ? supplierNameMap.get(Number(expense.supplier_id)) : "") || "-")}</td>
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
              <th>#</th><th>التاريخ</th><th>الفيلا</th><th>العهدة</th><th>المرحلة</th>
              <th>التصنيف</th><th>البند</th><th>المورد</th>
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
    const rows = getPeriodExpenses(period);
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
            <td>${escapeHtml(villaNameMap.get(Number(expense.villaId)) ?? "مصروف عام")}</td>
            <td>${escapeHtml(accountNameMap.get(Number(expense.accountId)) ?? "-")}</td>
            <td>${escapeHtml(getExpenseStageName(expense))}</td>
            <td>${escapeHtml(categoryNameMap.get(Number(expense.categoryId)) ?? "-")}</td>
            <td>${escapeHtml(itemNameMap.get(Number(expense.itemId)) ?? "-")}</td>
            <td>${escapeHtml(expense.supplier || (expense.supplier_id ? supplierNameMap.get(Number(expense.supplier_id)) : "") || "-")}</td>
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
              <th>#</th><th>التاريخ</th><th>الفيلا</th><th>العهدة</th><th>المرحلة</th>
              <th>التصنيف</th><th>البند</th><th>المورد</th>
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

  if (!project) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
        <h1 className="text-3xl font-bold text-white">المشروع غير موجود</h1>
        <button
          type="button"
          onClick={() => navigate("/projects")}
          className="mt-6 rounded-xl bg-yellow-400 px-6 py-3 font-bold text-[#081B33] transition hover:bg-yellow-500"
        >
          رجوع للمشاريع
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* =====================================================
          EXPENSES PAGE HEADER
      ===================================================== */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#173C63] via-[#0D2948] to-[#101C2D] px-8 py-7 shadow-xl">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-yellow-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative z-10 flex items-center justify-between gap-6">
          <button
            type="button"
            onClick={() => navigate(`/projects/${project.id}`)}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/10 px-4 py-2 text-sm font-semibold text-gray-300 backdrop-blur-sm transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={17} />
            رجوع للمشروع
          </button>

          <div className="text-center">
            <p className="text-sm font-bold text-yellow-400">المصروفات</p>
            <h1 className="mt-1 text-3xl font-extrabold text-white">
              مصروفات {project.name}
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              ملخص وتفاصيل جميع مصروفات المشروع
            </p>
          </div>

          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-yellow-400/20 bg-yellow-400/10 text-yellow-400">
            <WalletCards size={34} />
          </div>
        </div>
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
            title="إجمالي مصاريف اليوم"
            value={expensePeriodTotals.day}
            period="day"
            accent="orange"
            openExport={openExpenseExport}
            onOpenExport={setOpenExpenseExport}
            onExport={handleExpenseExport}
          />
          <ExpensePeriodCard
            title="إجمالي مصاريف الأسبوع"
            value={expensePeriodTotals.week}
            period="week"
            accent="violet"
            openExport={openExpenseExport}
            onOpenExport={setOpenExpenseExport}
            onExport={handleExpenseExport}
          />
          <ExpensePeriodCard
            title="إجمالي مصاريف الشهر"
            value={expensePeriodTotals.month}
            period="month"
            accent="amber"
            openExport={openExpenseExport}
            onOpenExport={setOpenExpenseExport}
            onExport={handleExpenseExport}
          />
          <ExpensePeriodCard
            title="إجمالي المصاريف"
            value={expensePeriodTotals.all}
            period="all"
            accent="rose"
            openExport={openExpenseExport}
            onOpenExport={setOpenExpenseExport}
            onExport={handleExpenseExport}
          />
        </div>

       
      </section>

      {selectedExpense && (
        <ExpenseDetailsModal
          expense={selectedExpense}
          projectName={project.name}
          villaName={
            villaNameMap.get(Number(selectedExpense.villaId)) ??
            "مصروف عام على المشروع"
          }
          accountName={
            accountNameMap.get(Number(selectedExpense.accountId)) ?? "-"
          }
          stageName={getExpenseStageName(selectedExpense)}
          categoryName={
            categoryNameMap.get(Number(selectedExpense.categoryId)) ?? "-"
          }
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
        />
      )}


      {
        
      /* =====================================================
          TOP COST ITEMS
          نفس فكرة التصميم: لوحتان، 3 بنود في كل لوحة
      ===================================================== */}

      <section className="grid gap-5 xl:grid-cols-2">

        {/* RIGHT - HIGHEST 3 COST ITEMS */}
        <TopCostPanel
          title="أكثر 3 بنود تكلفة حتى الآن"
          items={highestCostItems}
          accent="green"
          onViewAll={() => setShowAllCostItems(true)}
        />

        {/* LEFT - LOWEST 3 COST ITEMS */}
        <TopCostPanel
          title="أقل 3 بنود تكلفة حتى الآن"
          items={lowestCostItems}
          accent="blue"
          onViewAll={() => setShowAllCostItems(true)}
        />

      </section>

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



      {/* =====================================================
          EXPENSE DETAILS TABLE
      ===================================================== */}
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#081B33] shadow-xl">
        <div className="flex flex-col gap-4 border-b border-white/10 bg-[#102947] p-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="text-right">
            <h2 className="text-2xl font-extrabold text-white">تفاصيل مصروفات المشروع</h2>
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
                  setOpenExpenseExport(openExpenseExport === "table" ? null : "table")
                }
                className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 font-bold text-emerald-300 transition hover:bg-emerald-400/20"
              >
                <Download size={17} />
                تصدير
                <ChevronDown size={15} />
              </button>

              {openExpenseExport === "table" && (
                <div className="absolute right-0 top-14 z-50 w-52 overflow-hidden rounded-2xl border border-white/10 bg-[#102947] p-1 shadow-2xl">
                  <button type="button" onClick={() => handleExpenseExport("all", "pdf")} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-right text-sm text-white hover:bg-white/10">
                    <FileText size={17} className="text-red-400" />
                    PDF / حفظ PDF
                  </button>
                  <button type="button" onClick={() => handleExpenseExport("all", "excel")} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-right text-sm text-white hover:bg-white/10">
                    <FileSpreadsheet size={17} className="text-green-400" />
                    Excel
                  </button>
                  <button type="button" onClick={() => handleExpenseExport("all", "print")} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-right text-sm text-white hover:bg-white/10">
                    <Printer size={17} className="text-sky-400" />
                    طباعة
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1500px] w-full text-sm text-white">
            <thead className="bg-[#102947] text-gray-300">
              <tr>
                <th className="p-3 text-center">التاريخ</th>
                <th className="p-3 text-center">رقم الفاتورة</th>
                <th className="p-3 text-center">الفيلا</th>
                <th className="p-3 text-center">العهدة</th>
                <th className="p-3 text-center">المرحلة</th>
                <th className="p-3 text-center">التصنيف</th>
                <th className="p-3 text-center">البند</th>
                <th className="p-3 text-center">المورد</th>
                <th className="p-3 text-center">طريقة الدفع</th>
                <th className="p-3 text-center">قبل الضريبة</th>
                <th className="p-3 text-center">الضريبة</th>
                <th className="p-3 text-center">الإجمالي</th>
                <th className="p-3 text-center">الإجراءات</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10">
              {loadingProjectData ? (
                <tr><td colSpan={13} className="p-10 text-center text-gray-400">جاري تحميل المصروفات...</td></tr>
              ) : expenseRows.length === 0 ? (
                <tr><td colSpan={13} className="p-10 text-center text-gray-400">لا توجد مصروفات لهذا المشروع حتى الآن.</td></tr>
              ) : (
                expenseRows.map((expense: any) => (
                  <tr key={String(expense.id)} className="transition hover:bg-white/[0.03]">
                    <td className="p-3 text-center text-gray-300">{expense.expenseDate || "-"}</td>
                    <td className="p-3 text-center">{expense.voucherNo || "-"}</td>
                    <td className="p-3 text-center">{villaNameMap.get(Number(expense.villaId)) ?? "مصروف عام"}</td>
                    <td className="p-3 text-center">{accountNameMap.get(Number(expense.accountId)) ?? "-"}</td>
                    <td className="p-3 text-center">{getExpenseStageName(expense)}</td>
                    <td className="p-3 text-center">{categoryNameMap.get(Number(expense.categoryId)) ?? "-"}</td>
                    <td className="p-3 text-center">{itemNameMap.get(Number(expense.itemId)) ?? "-"}</td>
                    <td className="p-3 text-center">{expense.supplier || "-"}</td>
                    <td className="p-3 text-center">{formatPaymentMethod(expense.paymentMethod)}</td>
                    <td className="p-3 text-center font-semibold">{Number(expense.amount ?? 0).toLocaleString("ar-SA")}</td>
                    <td className="p-3 text-center">{Number(expense.tax ?? 0).toLocaleString("ar-SA")}</td>
                    <td className="p-3 text-center font-bold text-yellow-400">{getExpenseTotal(expense).toLocaleString("ar-SA")}</td>
                    <td className="p-3">
                      <div className="flex justify-center gap-2">
                        <button type="button" onClick={() => setSelectedExpense(expense)} className="flex items-center gap-1 rounded-lg bg-sky-500 px-3 py-2 text-xs font-bold text-white hover:bg-sky-600">
                          <Eye size={14} /> عرض
                        </button>
                        <button type="button" onClick={() => handleEditExpense(expense)} className="flex items-center gap-1 rounded-lg bg-yellow-500 px-3 py-2 text-xs font-bold text-[#081B33] hover:bg-yellow-400">
                          <Pencil size={14} /> تعديل
                        </button>
                        <button type="button" onClick={() => handleDeleteExpense(expense)} className="flex items-center gap-1 rounded-lg bg-red-500 px-3 py-2 text-xs font-bold text-white hover:bg-red-600">
                          <Trash2 size={14} /> حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedExpense && (
        <ExpenseDetailsModal
          expense={selectedExpense}
          projectName={project.name}
          villaName={villaNameMap.get(Number(selectedExpense.villaId)) ?? "مصروف عام على المشروع"}
          accountName={accountNameMap.get(Number(selectedExpense.accountId)) ?? "-"}
          categoryName={categoryNameMap.get(Number(selectedExpense.categoryId)) ?? "-"}
          itemName={itemNameMap.get(Number(selectedExpense.itemId)) ?? "-"}
          stageName={stageNameMap.get(Number(selectedExpense.stageId ?? selectedExpense.stage_id)) ?? "-"}
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
        />
      )}
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
          اسم البند
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
          عرض جميع بنود التكاليف
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
              جميع بنود التكاليف
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              جميع بنود مشروع {projectName} مرتبة حسب إجمالي التكلفة
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
            <p className="text-sm font-semibold text-gray-400">عدد البنود</p>
            <p className="mt-1 text-2xl font-extrabold text-white">
              {items.length}
            </p>
          </div>

          <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-4">
            <p className="text-sm font-semibold text-gray-400">
              إجمالي تكلفة البنود
            </p>
            <p className="mt-1 text-2xl font-extrabold text-yellow-400">
              {total.toLocaleString("ar-SA")} ريال
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="min-h-0 flex-1 overflow-auto p-5">
          <div className="min-w-[760px] overflow-hidden rounded-2xl border border-white/10">
            <div
              className="
                grid
                grid-cols-[70px_1fr_180px_140px]
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
              <div>اسم البند</div>
              <div className="text-center">إجمالي التكلفة</div>
              <div className="text-center">النسبة</div>
            </div>

            {items.length > 0 ? (
              items.map((item, index) => {
                const percentage = Math.max(
                  0,
                  Math.min(100, Number(item.percentage) || 0)
                );

                return (
                  <div
                    key={`${item.name}-${index}`}
                    className="grid grid-cols-[70px_1fr_180px_140px] items-center gap-3 border-b border-white/10 px-5 py-5 last:border-b-0"
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
                          className="h-full rounded-full bg-blue-400"
                          style={{ width: `${percentage}%` }}
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
                  </div>
                );
              })
            ) : (
              <div className="px-6 py-12 text-center text-gray-400">
                لا توجد بنود تكلفة حتى الآن.
              </div>
            )}

            {items.length > 0 && (
              <div className="grid grid-cols-[70px_1fr_180px_140px] items-center gap-3 border-t border-yellow-400/20 bg-yellow-400/5 px-5 py-5">
                <div />
                <div className="text-lg font-extrabold text-yellow-300">
                  الإجمالي
                </div>
                <div className="text-center text-lg font-extrabold text-yellow-400">
                  {total.toLocaleString("ar-SA")} ريال
                </div>
                <div className="text-center">
                  <span className="inline-flex rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-sm font-extrabold text-yellow-300">
                    100%
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
};

function ExpensePeriodCard({
  title,
  value,
  period,
  accent,
  openExport,
  onOpenExport,
  onExport,
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

      <div className="relative mt-5 flex justify-end">
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
  stageName: string;
  categoryName: string;
  itemName: string;
  onClose: () => void;
};

function ExpenseDetailsModal({
  expense,
  projectName,
  villaName,
  accountName,
  stageName,
  categoryName,
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
            <ViewBox label="المرحلة" value={stageName} />
            <ViewBox label="التصنيف" value={categoryName} />
            <ViewBox label="البند" value={itemName} />
            <ViewBox label="المورد" value={expense.supplier || "-"} />
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
