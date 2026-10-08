import { useEffect, useRef, useState } from "react";

import {
  Receipt,
  Wallet,
  Landmark,
  FolderTree,
  Layers3,
  Tags,
  ListPlus,
  Plus,
  Eye,
  ArrowUpRight,
} from "lucide-react";

import ExpensesPage from "./ExpensesPage";
import FundingPage from "./FundingPage";

import { supabase } from "../../utils/supabase";
import { usePermissions } from "../../utils/permissions";
import { financialEngine } from "../../core/engine/financial.engine";
import ExpenseModal from "../../components/financial/ExpenseModal";
import FundingModal from "./FundingModal";


import { projects } from "../../data/projects";
import { expenseDistributions }
from "../../data/expenseDistributions";
import {
  applyFunding,
  createLedgerEntry,
} from "../../services/financialEngine";
import { distributionEngine } from "../../core/engine/distribution.engine";


type Tab =
  | "expenses"
  | "accounts"
  | "funding"
  | "categories";

export default function FinancialCenter() {
  // صلاحيات المركز المالي
  const { hasPermission } = usePermissions();

  const canViewFinancial = hasPermission("financial_view");
  const canAddFinancial = hasPermission("financial_add");
  const canEditFinancial = hasPermission("financial_edit");
  const canDeleteFinancial = hasPermission("financial_delete");
  const [activeTab, setActiveTab] =
    useState<Tab>("expenses");

  const [openExpenseModal, setOpenExpenseModal] =
    useState(false);

  const [editingExpense, setEditingExpense] =
    useState<any | null>(null);

  const [expenseRefreshKey, setExpenseRefreshKey] =
    useState(0);

  const [openFundingModal, setOpenFundingModal] =
    useState(false);
  const [selectedAccountId, setSelectedAccountId] =
  useState<number | null>(null);

const [selectedAccount, setSelectedAccount] =
  useState<any | null>(null);


  const [expenses, setExpenses] =
    useState<any[]>([]);

  const [funding, setFunding] =
    useState<any[]>([]);

  const [ledger, setLedger] =
    useState<any[]>([]);

  const [accounts, setAccounts] =
useState<any[]>([]);

  const [categories, setCategories] =
    useState<any[]>([]);

  const [expenseItems, setExpenseItems] =
    useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
const [openAccountModal, setOpenAccountModal] =
  useState(false);

const [newAccountName, setNewAccountName] =
  useState("");

const [newAccountType, setNewAccountType] =
  useState("عهدة");
const [editingAccount, setEditingAccount] =
  useState<any | null>(null);
  // ==========================================
  // إدارة المراحل والتصنيفات والبنود
  // ==========================================
  // المراحل مصدرها Supabase فقط.
  // لا توجد مراحل افتراضية؛ إذا كانت قاعدة البيانات فارغة تظهر القائمة فارغة.
  const [stages, setStages] = useState<any[]>([]);

  const [openStageModal, setOpenStageModal] = useState(false);
  const [openCategoryModal, setOpenCategoryModal] = useState(false);
  const [openItemModal, setOpenItemModal] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategoryId, setNewItemCategoryId] = useState("");

  // ==========================================
  // حساب إجمالي المصروف بشكل موحّد
  // ==========================================
  const getExpenseTotal = (item: any) => {
    const directTotal = Number(
      item?.total ??
      item?.grand_total ??
      item?.total_amount ??
      item?.totalAmount ??
      0
    );

    if (Number.isFinite(directTotal) && directTotal > 0) {
      return directTotal;
    }

    const amount = Number(
      item?.amount ??
      item?.subtotal ??
      item?.before_tax ??
      item?.totalBeforeTax ??
      0
    );

    const tax = Number(
      item?.tax ??
      item?.tax_amount ??
      0
    );

    return amount + tax;
  };

  useEffect(() => {
    const loadAccounts = async () => {
  const [
  { data: accountsData, error: accountsError },
  { data: fundingData, error: fundingError },
  { data: expensesData, error: expensesError },
  { data: categoriesData, error: categoriesError },
  { data: itemsData, error: itemsError },
  { data: suppliersData, error: suppliersError },
  { data: stagesData, error: stagesError },
] = await Promise.all([
    supabase
      .from("accounts")
      .select("*")
      .order("id", { ascending: true }),

    supabase
  .from("funding")
  .select("*")
  .not("account_id", "is", null),

    supabase
      .from("expenses")
      .select("*")
      .order("id", { ascending: false }),

    supabase
      .from("categories")
      .select("id, name")
      .order("id", { ascending: true }),

    supabase
      .from("expense_items")
      .select("id, name, category_id")
      .order("id", { ascending: true }),
    supabase
  .from("suppliers")
  .select("id, name, phone, tax_number, address, notes")
  .order("id", { ascending: true }),

    supabase
      .from("expense_stages")
      .select("id, name, is_active")
      .eq("is_active", true)
      .order("id", { ascending: true }),
  ]);
console.log("ACCOUNTS FROM SUPABASE:", accountsData);
console.log("ACCOUNTS ERROR:", accountsError);
  if (accountsError) {
    console.error("خطأ في تحميل الحسابات:", accountsError);
    return;
  }

  if (fundingError) {
    console.error("خطأ في تحميل التغذية:", fundingError);
    return;
  }

  if (expensesError) {
  console.error("خطأ في تحميل المصروفات:", expensesError);
}

  if (categoriesError) {
    console.error("خطأ في تحميل التصنيفات:", categoriesError);
  } else {
    setCategories(categoriesData ?? []);
  }

  if (itemsError) {
    console.error("خطأ في تحميل البنود:", itemsError);
  } else {
    setExpenseItems(itemsData ?? []);
  }
  if (suppliersError) {
  console.error("خطأ في تحميل الموردين:", suppliersError);
} else {
  setSuppliers(suppliersData ?? []);
}

  // تحميل المراحل من قاعدة البيانات فقط.
  // لا ننشئ أي مراحل تلقائيًا إذا كانت قاعدة البيانات فارغة.
  if (stagesError) {
    console.error("خطأ في تحميل المراحل:", stagesError);
  } else {
    setStages(stagesData ?? []);
  }

  const fundingRows = fundingData ?? [];
  const expenseRows = expensesData ?? [];

  // حتى لو فشل استعلام واحد، نظل نعرض أي بيانات نجحت في التحميل.
  setFunding(fundingRows);
  setExpenses(expenseRows);

  let savedStageMap: Record<string, { id?: string | number; name?: string }> = {};
  try {
    savedStageMap = JSON.parse(
      localStorage.getItem("tumouh-expense-stage-map") || "{}"
    );
  } catch {
    savedStageMap = {};
  }

  const supplierMap = new Map<number, any>(
    (suppliersData ?? []).map((supplier: any) => [Number(supplier.id), supplier])
  );

  const expensesWithStages = expenseRows.map((row) => {
    const savedStage = savedStageMap[String(row.id)];
    const supplierId = row.supplier_id ?? row.supplierId ?? null;
    const supplierRow = supplierId != null ? supplierMap.get(Number(supplierId)) : null;
    return {
      ...row,
      supplierId,
      supplier: supplierRow?.name ?? row.supplier ?? "",
      stageId:
        row.stage_id ??
        row.stageId ??
        row.phase_id ??
        row.phaseId ??
        savedStage?.id ??
        null,
      stageName:
        row.stage_name ??
        row.stageName ??
        row.phase_name ??
        row.phaseName ??
        savedStage?.name ??
        null,
    };
  });

  setExpenses(expensesWithStages);
  const formattedAccounts = (accountsData ?? []).map((account) => {

    const accountFunding = fundingRows.filter(
      (item) =>
        Number(item.account_id) === Number(account.id)
    );

    const accountExpenses = expenseRows.filter(
      (item) =>
        Number(item.account_id) === Number(account.id)
    );

    const totalFunding = accountFunding.reduce(
      (sum, item) =>
        sum + Number(item.amount ?? 0),
      0
    );

    const totalExpenses = accountExpenses.reduce(
      (sum, item) => sum + getExpenseTotal(item),
      0
    );

    const operationsCount =
      accountFunding.length +
      accountExpenses.length;

    return {
  id: account.id,
  name: account.name,
  type: account.type ?? "عهدة",

  // الرصيد الحقيقي = إجمالي التغذية - إجمالي المصروفات
  currentBalance:
    Number(totalFunding) - Number(totalExpenses),

  totalFunding: Number(totalFunding),
  totalExpenses: Number(totalExpenses),

  operationsCount: operationsCount,
};
  });

  setAccounts(formattedAccounts);
};
const loadFunding = async () => {
  const { data, error } = await supabase
    .from("funding")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    console.error("خطأ في تحميل عمليات التغذية:", error);
    return;
  }

  if (data) {
    setFunding(data);
  }
};
  loadAccounts();
  loadFunding();
}, []);
const savingExpenseRef = useRef(false);

  const closeExpenseModal = () => {
    setOpenExpenseModal(false);
    setEditingExpense(null);
  };

  const handleEditExpense = (expense: any) => {
    if (!canEditFinancial) { alert("ليس لديك صلاحية تعديل المصروفات."); return; }
    setEditingExpense(expense);
    setOpenExpenseModal(true);
  };

  const handleDeleteExpense = async (expense: any) => {
    if (!canDeleteFinancial) { alert("ليس لديك صلاحية حذف المصروفات."); return; }
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف هذا المصروف؟\n\nالإجمالي: ${Number(expense?.total ?? 0).toLocaleString()} ريال\n\nسيتم إعادة مبلغ المصروف إلى رصيد العهدة.`
    );

    if (!confirmed) return;

    try {
      const expenseId = Number(expense?.id);
      if (!expenseId) {
        alert("رقم المصروف غير صالح");
        return;
      }

      const { data: existing, error: existingError } = await supabase
        .from("expenses")
        .select("id, account_id, total")
        .eq("id", expenseId)
        .single();

      if (existingError || !existing) {
        console.error("خطأ في قراءة المصروف قبل الحذف:", existingError);
        alert(`تعذر قراءة المصروف قبل الحذف:\n${existingError?.message ?? "السجل غير موجود"}`);
        return;
      }

      const oldTotal = Number(existing.total ?? 0);
      const oldAccountId = Number(existing.account_id ?? 0);

      if (oldAccountId && oldTotal > 0) {
        const { data: accountRow, error: accountReadError } = await supabase
          .from("accounts")
          .select("id, balance")
          .eq("id", oldAccountId)
          .single();

        if (accountReadError) {
          console.error("خطأ في قراءة رصيد العهدة:", accountReadError);
          alert(`تعذر قراءة رصيد العهدة:\n${accountReadError.message}`);
          return;
        }

        const restoredBalance = Number(accountRow?.balance ?? 0) + oldTotal;

        const { error: balanceError } = await supabase
          .from("accounts")
          .update({ balance: restoredBalance })
          .eq("id", oldAccountId);

        if (balanceError) {
          console.error("خطأ في إعادة مبلغ المصروف للعهدة:", balanceError);
          alert(`تعذر إعادة مبلغ المصروف إلى العهدة:\n${balanceError.message}`);
          return;
        }
      }

      const { error: deleteError } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expenseId);

      if (deleteError) {
        console.error("خطأ في حذف المصروف:", deleteError);

        // محاولة عكس إعادة الرصيد إذا فشل الحذف.
        if (oldAccountId && oldTotal > 0) {
          const { data: rollbackAccount } = await supabase
            .from("accounts")
            .select("balance")
            .eq("id", oldAccountId)
            .single();

          if (rollbackAccount) {
            await supabase
              .from("accounts")
              .update({ balance: Number(rollbackAccount.balance ?? 0) - oldTotal })
              .eq("id", oldAccountId);
          }
        }

        alert(`تعذر حذف المصروف:\n${deleteError.message}`);
        return;
      }

      setExpenses((prev) => prev.filter((row) => String(row.id) !== String(expenseId)));
      setExpenseRefreshKey((value) => value + 1);

      setAccounts((prev) =>
        prev.map((item) =>
          Number(item.id) === oldAccountId
            ? {
                ...item,
                currentBalance: Number(item.currentBalance ?? 0) + oldTotal,
                totalExpenses: Math.max(0, Number(item.totalExpenses ?? 0) - oldTotal),
                operationsCount: Math.max(0, Number(item.operationsCount ?? 0) - 1),
              }
            : item
        )
      );

      alert("تم حذف المصروف وإعادة المبلغ إلى العهدة بنجاح.");
    } catch (error) {
      console.error("خطأ غير متوقع أثناء حذف المصروف:", error);
      alert("حدث خطأ غير متوقع أثناء حذف المصروف.");
    }
  };

  const handleSaveExpense = async (
    expense: any
  ): Promise<boolean> => {
    if (editingExpense?.id ? !canEditFinancial : !canAddFinancial) {
      alert(editingExpense?.id ? "ليس لديك صلاحية تعديل المصروفات." : "ليس لديك صلاحية إضافة المصروفات.");
      return false;
    }
    if (savingExpenseRef.current) {
      return false;
    }

    savingExpenseRef.current = true;

    try {
      if (!expense.accountId) {
        alert("من فضلك اختر العهدة التي تم دفع المصروف منها");
        return false;
      }

      const accountId = Number(expense.accountId);
      const expenseTotal = Number(expense.total ?? 0);
      const tax = Number(expense.tax ?? 0);
      const amountBeforeTax = Number(
        expense.amount ?? Math.max(0, expenseTotal - tax)
      );

      if (!expenseTotal || expenseTotal <= 0) {
        alert("من فضلك أدخل مبلغ المصروف");
        return false;
      }

      if (!expense.stageId || !Number.isFinite(Number(expense.stageId))) {
        alert("من فضلك اختر مرحلة صحيحة مرتبطة بقاعدة البيانات");
        return false;
      }

      const expenseDateForDb = expense.expenseDate || expense.entryDate || null;

      const supplierId =
        expense.supplierId != null && String(expense.supplierId).trim() !== ""
          ? Number(expense.supplierId)
          : expense.supplier && /^\d+$/.test(String(expense.supplier).trim())
            ? Number(expense.supplier)
            : null;

      // ==============================
      // تعديل مصروف موجود
      // ==============================
      if (editingExpense?.id) {
        const expenseId = Number(editingExpense.id);

        const { data: oldExpense, error: oldExpenseError } = await supabase
          .from("expenses")
          .select("id, account_id, total")
          .eq("id", expenseId)
          .single();

        if (oldExpenseError || !oldExpense) {
          console.error("خطأ في قراءة المصروف القديم:", oldExpenseError);
          alert(`تعذر قراءة المصروف القديم:\n${oldExpenseError?.message ?? "السجل غير موجود"}`);
          return false;
        }

        const oldAccountId = Number(oldExpense.account_id ?? 0);
        const oldTotal = Number(oldExpense.total ?? 0);

        const accountIds = Array.from(
          new Set([oldAccountId, accountId].filter((id) => Number(id) > 0))
        );

        const { data: accountRows, error: accountRowsError } = await supabase
          .from("accounts")
          .select("id, balance")
          .in("id", accountIds);

        if (accountRowsError) {
          console.error("خطأ في قراءة أرصدة العهد:", accountRowsError);
          alert(`تعذر قراءة أرصدة العهد:\n${accountRowsError.message}`);
          return false;
        }

        const accountMap = new Map<number, number>(
          (accountRows ?? []).map((row: any) => [Number(row.id), Number(row.balance ?? 0)] as [number, number])
        );

        const oldBalance = accountMap.get(oldAccountId) ?? 0;
        const newBalance = accountMap.get(accountId) ?? 0;

        if (oldAccountId === accountId) {
          const availableBalance = oldBalance + oldTotal;
          if (expenseTotal > availableBalance) {
            alert(
              `رصيد العهدة غير كافٍ لتعديل المصروف.\nالرصيد المتاح بعد عكس المصروف القديم: ${availableBalance.toLocaleString()} ريال`
            );
            return false;
          }
        } else if (expenseTotal > newBalance) {
          alert(
            `رصيد العهدة الجديدة غير كافٍ.\nالرصيد الحالي: ${newBalance.toLocaleString()} ريال`
          );
          return false;
        }

        const { data: updatedExpense, error: updateError } = await supabase
          .from("expenses")
          .update({
            date: expenseDateForDb,
            project_id: expense.projectId ? Number(expense.projectId) : null,
            account_id: accountId,
            category_id: expense.categoryId ? Number(expense.categoryId) : null,
            supplier_id: supplierId,
            description: expense.description || null,
            amount_before_tax: amountBeforeTax,
            tax,
            total: expenseTotal,
            payment_method: expense.paymentMethod || null,
            invoice_number: expense.voucherNo || null,
            attachment:
              expense.attachmentUrl ||
              expense.attachmentPath ||
              null,
            item_id: expense.itemId ? Number(expense.itemId) : null,
            stage_id: Number(expense.stageId),
          })
          .eq("id", expenseId)
          .select()
          .single();

        if (updateError) {
          console.error("خطأ في تعديل المصروف:", updateError);
          alert(`تعذر تعديل المصروف:\n${updateError.message}`);
          return false;
        }

        // تحديث الأرصدة: نعكس القديم أولًا ثم نخصم الجديد.
        if (oldAccountId === accountId) {
          const finalBalance = oldBalance + oldTotal - expenseTotal;
          const { error: balanceError } = await supabase
            .from("accounts")
            .update({ balance: finalBalance })
            .eq("id", accountId);

          if (balanceError) {
            console.error("خطأ في تحديث رصيد العهدة بعد التعديل:", balanceError);
            alert(`تم تعديل المصروف لكن تعذر تحديث رصيد العهدة:\n${balanceError.message}`);
            return false;
          }
        } else {
          const { error: oldAccountError } = await supabase
            .from("accounts")
            .update({ balance: oldBalance + oldTotal })
            .eq("id", oldAccountId);

          if (oldAccountError) {
            console.error("خطأ في إعادة رصيد العهدة القديمة:", oldAccountError);
            alert(`تم تعديل المصروف لكن تعذر إعادة رصيد العهدة القديمة:\n${oldAccountError.message}`);
            return false;
          }

          const { error: newAccountError } = await supabase
            .from("accounts")
            .update({ balance: newBalance - expenseTotal })
            .eq("id", accountId);

          if (newAccountError) {
            console.error("خطأ في خصم رصيد العهدة الجديدة:", newAccountError);
            alert(`تم تعديل المصروف لكن تعذر خصم رصيد العهدة الجديدة:\n${newAccountError.message}`);
            return false;
          }
        }

        const finalExpense = {
          ...expense,
          id: updatedExpense?.id ?? expenseId,
          amount: amountBeforeTax,
          total: expenseTotal,
          tax,
          projectId: updatedExpense?.project_id ?? expense.projectId ?? null,
          accountId: updatedExpense?.account_id ?? accountId,
          categoryId: updatedExpense?.category_id ?? expense.categoryId ?? null,
          itemId: updatedExpense?.item_id ?? expense.itemId ?? null,
          voucherNo: updatedExpense?.invoice_number ?? expense.voucherNo ?? "",
          expenseDate: updatedExpense?.date ?? expenseDateForDb ?? "-",
          entryDate: expense.entryDate ?? expenseDateForDb ?? "-",
          paymentMethod: updatedExpense?.payment_method ?? expense.paymentMethod ?? "",
          supplierId: updatedExpense?.supplier_id ?? supplierId ?? null,
          supplier:
            suppliers.find((item) => Number(item.id) === Number(updatedExpense?.supplier_id ?? supplierId))?.name
              ?? expense.supplier
              ?? "",
          description: updatedExpense?.description ?? expense.description ?? "",
          stageId: updatedExpense?.stage_id ?? expense.stageId ?? null,
          stageName: expense.stageName ?? null,
        };

        setExpenses((prev) =>
          prev.map((row) =>
            String(row.id) === String(expenseId) ? finalExpense : row
          )
        );
        setExpenseRefreshKey((value) => value + 1);

        setAccounts((prev) =>
          prev.map((item) => {
            const id = Number(item.id);
            if (oldAccountId === accountId && id === accountId) {
              return {
                ...item,
                currentBalance: Number(item.currentBalance ?? 0) + oldTotal - expenseTotal,
                totalExpenses: Math.max(0, Number(item.totalExpenses ?? 0) - oldTotal + expenseTotal),
              };
            }
            if (oldAccountId !== accountId && id === oldAccountId) {
              return {
                ...item,
                currentBalance: Number(item.currentBalance ?? 0) + oldTotal,
                totalExpenses: Math.max(0, Number(item.totalExpenses ?? 0) - oldTotal),
              };
            }
            if (oldAccountId !== accountId && id === accountId) {
              return {
                ...item,
                currentBalance: Number(item.currentBalance ?? 0) - expenseTotal,
                totalExpenses: Number(item.totalExpenses ?? 0) + expenseTotal,
              };
            }
            return item;
          })
        );

        setOpenExpenseModal(false);
        setEditingExpense(null);
        return true;
      }

      // ==============================
      // إضافة مصروف جديد
      // ==============================
      const account = accounts.find(
        (item) => Number(item.id) === accountId
      );

      if (!account) {
        alert("العهدة المختارة غير موجودة");
        return false;
      }

      const currentBalance = Number(account.currentBalance ?? 0);

      if (expenseTotal > currentBalance) {
        alert(
          `رصيد العهدة غير كافٍ.\nالرصيد الحالي: ${currentBalance.toLocaleString()} ريال`
        );
        return false;
      }

      const { data: savedExpense, error: expenseError } = await supabase
        .from("expenses")
        .insert([
          {
            date: expenseDateForDb,
            project_id: expense.projectId ? Number(expense.projectId) : null,
            account_id: accountId,
            category_id: expense.categoryId ? Number(expense.categoryId) : null,
            supplier_id: supplierId,
            description: expense.description || null,
            amount_before_tax: amountBeforeTax,
            tax,
            total: expenseTotal,
            payment_method: expense.paymentMethod || null,
            invoice_number: expense.voucherNo || null,
            attachment:
              expense.attachmentUrl || expense.attachmentPath || null,
            item_id: expense.itemId ? Number(expense.itemId) : null,
            stage_id: Number(expense.stageId),
          },
        ])
        .select()
        .single();

      if (expenseError) {
        console.error("خطأ في حفظ المصروف:", expenseError);
        alert(`حدث خطأ أثناء حفظ المصروف:\n${expenseError.message}`);
        return false;
      }

      if (savedExpense?.id && expense.stageId) {
        try {
          const currentMap = JSON.parse(
            localStorage.getItem("tumouh-expense-stage-map") || "{}"
          );
          currentMap[String(savedExpense.id)] = {
            id: expense.stageId,
            name: expense.stageName ?? null,
          };
          localStorage.setItem(
            "tumouh-expense-stage-map",
            JSON.stringify(currentMap)
          );
        } catch {
          // لا نوقف الحفظ بسبب localStorage
        }
      }

      const newBalance = currentBalance - expenseTotal;

      const { error: accountError } = await supabase
        .from("accounts")
        .update({ balance: newBalance })
        .eq("id", accountId);

      if (accountError) {
        console.error("خطأ في تحديث رصيد العهدة:", accountError);
        // نحاول حذف المصروف الذي تم إدخاله حتى لا يبقى سجل غير مكتمل.
        if (savedExpense?.id) {
          await supabase.from("expenses").delete().eq("id", savedExpense.id);
        }
        alert("تعذر تحديث رصيد العهدة، لذلك تم إلغاء تسجيل المصروف.");
        return false;
      }

      const finalExpense = {
        ...expense,
        id: savedExpense?.id ?? expense.id,
        entryDate: expense.entryDate ?? expenseDateForDb ?? "-",
        expenseDate: savedExpense?.date ?? expenseDateForDb ?? "-",
        projectId: savedExpense?.project_id ?? expense.projectId ?? null,
        accountId: savedExpense?.account_id ?? accountId,
        categoryId: savedExpense?.category_id ?? expense.categoryId ?? null,
        itemId: savedExpense?.item_id ?? expense.itemId ?? null,
        voucherNo:
          savedExpense?.invoice_number ?? expense.voucherNo ?? "",
        amount: amountBeforeTax,
        tax,
        total: expenseTotal,
        paymentMethod:
          savedExpense?.payment_method ?? expense.paymentMethod ?? "",
        supplierId: savedExpense?.supplier_id ?? supplierId ?? null,
        supplier:
          suppliers.find((item) => Number(item.id) === Number(savedExpense?.supplier_id ?? supplierId))?.name
            ?? expense.supplier
            ?? "",
        description:
          savedExpense?.description ?? expense.description ?? "",
      };

      setExpenses((prev) => [finalExpense, ...prev]);
      setExpenseRefreshKey((value) => value + 1);
      setAccounts((prev) =>
        prev.map((item) =>
          Number(item.id) === accountId
            ? {
                ...item,
                currentBalance: newBalance,
                totalExpenses:
                  Number(item.totalExpenses ?? 0) + expenseTotal,
                operationsCount:
                  Number(item.operationsCount ?? 0) + 1,
              }
            : item
        )
      );

      const distribution = distributionEngine.distributeExpense(
        finalExpense,
        projects
      );

      if (Array.isArray(distribution)) {
        expenseDistributions.push(...distribution);
      } else if (distribution) {
        expenseDistributions.push(distribution);
      }

      setOpenExpenseModal(false);
setEditingExpense(null);

alert("تم حفظ المصروف بنجاح.");

return true;
    } catch (error) {
      console.error("خطأ غير متوقع أثناء حفظ المصروف:", error);
      alert("حدث خطأ غير متوقع أثناء حفظ المصروف");
      return false;
    } finally {
      savingExpenseRef.current = false;
    }
  };

  const handleSaveFunding = async (item: any) => {
    if (!canAddFinancial) { alert("ليس لديك صلاحية إضافة التغذية المالية."); return false; }
  try {
    // =========================================================
    // 1) التأكد من بيانات عملية التغذية
    // =========================================================

    const fundingId = item?.id;

    const accountId = Number(
      item?.account_id ??
      item?.accountId ??
      selectedAccountId
    );

    const amount = Number(
      item?.amount ?? 0
    );

    if (
      !fundingId ||
      !accountId ||
      !amount ||
      amount <= 0
    ) {
      console.error(
        "بيانات التغذية غير صحيحة:",
        item
      );

      return;
    }

    // =========================================================
    // 2) إضافة عملية التغذية للواجهة مرة واحدة فقط
    // =========================================================

    setFunding((prev) => {
      const exists = prev.some(
        (row) =>
          String(row.id) ===
          String(fundingId)
      );

      if (exists) {
        return prev;
      }

      return [
        ...prev,
        item,
      ];
    });

    // =========================================================
    // 3) تحديث سجل العمليات
    // =========================================================

    setLedger((prev) => {
      const exists = prev.some(
        (entry: any) =>
          String(entry?.referenceId ?? "") ===
          String(fundingId)
      );

      if (exists) {
        return prev;
      }

      return [
        ...prev,
        createLedgerEntry(
          "funding",
          item
        ),
      ];
    });

    // =========================================================
    // 4) إعادة تحميل العهد من Supabase
    //
    // مهم جدًا:
    // لا نحسب currentBalance هنا يدويًا.
    //
    // Supabase هو مصدر الحقيقة.
    // =========================================================

    const {
      data: accountsData,
      error: accountsError,
    } = await supabase
      .from("accounts")
      .select("*")
      .order("id", {
        ascending: true,
      });

    if (accountsError) {
      console.error(
        "خطأ أثناء إعادة تحميل العهد:",
        accountsError
      );
    } else {
      setAccounts(
        (accountsData ?? []) as any[]
      );
    }

    // =========================================================
    // 5) إعادة تحميل عمليات التغذية من Supabase
    //
    // يمنع أي تضاعف ناتج عن الحالة المحلية.
    // =========================================================

    const {
      data: fundingData,
      error: fundingError,
    } = await supabase
      .from("funding")
      .select("*")
      .order("id", {
        ascending: true,
      });

    if (fundingError) {
      console.error(
        "خطأ أثناء إعادة تحميل عمليات التغذية:",
        fundingError
      );
    } else {
      setFunding(
        (fundingData ?? []) as any[]
      );
    }

    // =========================================================
    // 6) إغلاق نافذة التغذية
    // =========================================================

    setOpenFundingModal(false);
    setSelectedAccountId(null);

    console.log(
      "تم حفظ التغذية بنجاح:",
      item
    );

  } catch (error) {
    console.error(
      "خطأ أثناء تحديث بيانات التغذية:",
      error
    );

    alert(
      "حدث خطأ أثناء تحديث بيانات التغذية"
    );
  }
};
const handleAddFundingForAccount = (
  accountId: number
) => {
  if (!canAddFinancial) { alert("ليس لديك صلاحية إضافة التغذية المالية."); return; }
  setSelectedAccountId(accountId);
  setOpenFundingModal(true);
};

const handleViewAccount = (account: any) => {
  setSelectedAccount(account);
};
const handleAddAccount = async () => {
  if (!canAddFinancial) { alert("ليس لديك صلاحية إضافة العهد."); return; }
  const name = newAccountName.trim();

  if (!name) {
    alert("من فضلك اكتب اسم العهدة");
    return;
  }

  try {
    const { data, error } = await supabase
      .from("accounts")
      .insert([
        {
          name: name,
          type: newAccountType,
          balance: 0,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("خطأ في إضافة العهدة:", error);
      alert("حدث خطأ أثناء إضافة العهدة");
      return;
    }

    const newAccount = {
      id: data.id,
      name: data.name,
      type: data.type ?? "عهدة",
      currentBalance: Number(data.balance ?? 0),
      totalFunding: 0,
      totalExpenses: 0,
      operationsCount: 0,
    };

    setAccounts((prev) => [
      ...prev,
      newAccount,
    ]);

    setNewAccountName("");
    setNewAccountType("عهدة");
    setOpenAccountModal(false);

  } catch (error) {
    console.error("خطأ غير متوقع:", error);
    alert("حدث خطأ أثناء إضافة العهدة");
  }
};
// تعديل العهدة
const handleEditAccount = async (account: any) => {
  if (!canEditFinancial) { alert("ليس لديك صلاحية تعديل العهد."); return; }
  const newName = prompt(
    "اكتب اسم العهدة الجديد:",
    account.name
  );

  if (newName === null) return;

  const name = newName.trim();

  if (!name) {
    alert("من فضلك اكتب اسم العهدة");
    return;
  }

  try {
    const { error } = await supabase
      .from("accounts")
      .update({
        name: name,
      })
      .eq("id", account.id);

    if (error) {
      console.error("خطأ في تعديل العهدة:", error);
      alert("حدث خطأ أثناء تعديل العهدة");
      return;
    }

    setAccounts((prev) =>
      prev.map((item) =>
        Number(item.id) === Number(account.id)
          ? {
              ...item,
              name: name,
            }
          : item
      )
    );

  } catch (error) {
    console.error("خطأ غير متوقع أثناء تعديل العهدة:", error);
    alert("حدث خطأ غير متوقع أثناء تعديل العهدة");
  }
};


// حذف العهدة
const handleDeleteAccount = async (account: any) => {
  if (!canDeleteFinancial) { alert("ليس لديك صلاحية حذف العهد."); return; }
  const confirmed = window.confirm(
    `هل أنت متأكد من حذف العهدة "${account.name}"؟\n\nلن يتم حذفها إذا كانت مرتبطة بعمليات تغذية أو مصروفات.`
  );

  if (!confirmed) return;

  try {
    // =====================================================
    // 1) التحقق من وجود تغذيات مرتبطة بالعهدة
    // =====================================================

    const { count: fundingCount, error: fundingCheckError } =
      await supabase
        .from("funding")
        .select("id", { count: "exact", head: true })
        .eq("account_id", account.id);

    if (fundingCheckError) {
      console.error(
        "خطأ أثناء التحقق من التغذيات:",
        fundingCheckError
      );

      alert("تعذر التحقق من حركات التغذية الخاصة بالعهدة");
      return;
    }

    // =====================================================
    // 2) التحقق من وجود مصروفات مرتبطة بالعهدة
    // =====================================================

    const { count: expenseCount, error: expenseCheckError } =
      await supabase
        .from("expenses")
        .select("id", { count: "exact", head: true })
        .eq("account_id", account.id);

    if (expenseCheckError) {
      console.error(
        "خطأ أثناء التحقق من المصروفات:",
        expenseCheckError
      );

      alert("تعذر التحقق من حركات المصروفات الخاصة بالعهدة");
      return;
    }

    // =====================================================
    // 3) منع الحذف إذا كانت العهدة مرتبطة بحركات
    // =====================================================

    if (
      (fundingCount ?? 0) > 0 ||
      (expenseCount ?? 0) > 0
    ) {
      alert(
        "لا يمكن حذف هذه العهدة لأنها مرتبطة بعمليات تغذية أو مصروفات."
      );
      return;
    }

    // =====================================================
    // 4) حذف العهدة من Supabase
    //    ونطلب من Supabase إرجاع الصف المحذوف
    //    للتأكد أن الحذف تم فعلاً
    // =====================================================

    const {
      data: deletedRows,
      error: deleteError,
    } = await supabase
      .from("accounts")
      .delete()
      .eq("id", account.id)
      .select("id");

    if (deleteError) {
      console.error(
        "خطأ في حذف العهدة من Supabase:",
        deleteError
      );

      alert(
        "حدث خطأ أثناء حذف العهدة من قاعدة البيانات."
      );

      return;
    }

    // =====================================================
    // 5) التأكد أن Supabase حذف الصف فعلاً
    // =====================================================

    if (!deletedRows || deletedRows.length === 0) {
      console.error(
        "لم يتم حذف العهدة فعليًا من Supabase:",
        account
      );

      alert(
        "العهدة لم تُحذف من قاعدة البيانات.\n\n" +
        "غالبًا توجد مشكلة في صلاحيات الحذف (RLS) في جدول accounts."
      );

      return;
    }

    // =====================================================
    // 6) حذف العهدة من الواجهة بعد نجاح الحذف الحقيقي
    // =====================================================

    setAccounts((prev) =>
      prev.filter(
        (item) =>
          Number(item.id) !== Number(account.id)
      )
    );

    console.log(
      "تم حذف العهدة بنجاح:",
      deletedRows
    );

    alert(`تم حذف العهدة "${account.name}" بنجاح.`);

  } catch (error) {
    console.error(
      "خطأ غير متوقع أثناء حذف العهدة:",
      error
    );

    alert(
      "حدث خطأ غير متوقع أثناء حذف العهدة."
    );
  }
};
  const totalExpensesAmount = expenses.reduce(
    (sum, item) => sum + getExpenseTotal(item),
    0
  );

  const totalAccounts = accounts.length;

  // نعتمد على رقم العملية id حتى لا تتكرر نفس العملية في الإجماليات
  // إذا وصلت البيانات للحالة أكثر من مرة.
  const uniqueFunding = Array.from(
  new Map(
    funding.map((item) => [String(item.id), item])
  ).values()
);

  const uniqueExpenses = Array.from(
    new Map(
      expenses.map((item) => [String(item.id), item])
    ).values()
  );

  const totalFundingOperations = uniqueFunding.length;

  const totalFundingAmount = uniqueFunding.reduce(
    (sum, item) => sum + Number(item.amount ?? 0),
    0
  );

 

  // إجمالي العمليات الحقيقي = التغذية الحقيقية + المصروفات الحقيقية.
  const totalOperationsCount =
    uniqueFunding.length + uniqueExpenses.length;

  const totalExpenseItems = expenseItems.length;
  const totalCategories = categories.length;
  const totalStages = stages.length;

  const handleAddStage = async () => {
    if (!canAddFinancial) { alert("ليس لديك صلاحية إضافة البنود المالية."); return; }
    const name = newStageName.trim();

    if (!name) {
      alert("من فضلك اكتب اسم المرحلة");
      return;
    }

    const exists = stages.some(
      (stage) =>
        String(stage.name ?? "").trim().toLowerCase() ===
        name.toLowerCase()
    );

    if (exists) {
      alert("هذه المرحلة موجودة بالفعل");
      return;
    }

    // المرحلة يجب أن تكون في قاعدة البيانات، وليس localStorage فقط،
    // لأن نافذة إضافة المصروف تقرأ المراحل من expense_stages.
    const { data, error } = await supabase
      .from("expense_stages")
      .insert([{ name, is_active: true }])
      .select("id, name, is_active")
      .single();

    if (error) {
      console.error("خطأ في إضافة المرحلة:", error);
      alert(`تعذر إضافة المرحلة:\n${error.message}`);
      return;
    }

    if (data) {
      setStages((prev) => [...prev, data]);
    }

    setNewStageName("");
    setOpenStageModal(false);
  };

  const handleAddCategory = async () => {
    if (!canAddFinancial) { alert("ليس لديك صلاحية إضافة التصنيفات المالية."); return; }
    const name = newCategoryName.trim();
    if (!name) {
      alert("من فضلك اكتب اسم التصنيف");
      return;
    }

    const exists = categories.some(
      (category) => category.name.trim().toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      alert("هذا التصنيف موجود بالفعل");
      return;
    }

    const { data, error } = await supabase
      .from("categories")
      .insert([{ name }])
      .select("id, name")
      .single();

    if (error) {
      console.error("خطأ في إضافة التصنيف:", error);
      alert(`تعذر إضافة التصنيف:\n${error.message}`);
      return;
    }

    setCategories((prev) => [...prev, data]);
    setNewCategoryName("");
    setOpenCategoryModal(false);
  };

  const handleAddItem = async () => {
    if (!canAddFinancial) { alert("ليس لديك صلاحية إضافة بنود المصروفات."); return; }
    const name = newItemName.trim();
    if (!name) {
      alert("من فضلك اكتب اسم البند");
      return;
    }
    if (!newItemCategoryId) {
      alert("من فضلك اختر التصنيف");
      return;
    }

    const exists = expenseItems.some(
      (item) =>
        String(item.category_id) === String(newItemCategoryId) &&
        item.name.trim().toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      alert("هذا البند موجود بالفعل داخل التصنيف المختار");
      return;
    }

    const { data, error } = await supabase
      .from("expense_items")
      .insert([{
        name,
        category_id: Number(newItemCategoryId),
      }])
      .select("id, name, category_id")
      .single();

    if (error) {
      console.error("خطأ في إضافة البند:", error);
      alert(`تعذر إضافة البند:\n${error.message}`);
      return;
    }

    setExpenseItems((prev) => [...prev, data]);
    setNewItemName("");
    setNewItemCategoryId("");
    setOpenItemModal(false);
  };

  return (

    <div className="w-full min-w-0 space-y-6 sm:space-y-8">

      <div className="w-full min-w-0 rounded-[28px] border border-white/10 bg-gradient-to-br from-[#0B4537] via-[#073529] to-[#05261F] p-4 text-center sm:p-6 lg:p-8">

        <h1 className="text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
          💰 المركز المالي
        </h1>

        <p className="mt-2 text-sm text-[#B4CEC5] sm:mt-3 sm:text-base lg:text-lg">
          إدارة المصروفات والعهد والتغذية والبنود المالية
        </p>

      </div>

      <div className="space-y-8">
        {/* Dashboard */}

<div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

  <div className="min-w-0 rounded-[28px] border border-emerald-400/20 bg-[#073529] p-4 sm:p-6">
    <p className="text-sm text-[#B4CEC5]">
      إجمالي الأرصدة
    </p>

    <h2 className="mt-3 text-4xl font-bold text-emerald-400">
      {(
  funding.reduce(
    (sum, item) => sum + Number(item.amount ?? 0),
    0
  ) -
  expenses.reduce(
    (sum, item) => sum + Number(item.total ?? 0),
    0
  )
).toLocaleString()}
    </h2>

    <span className="text-sm text-[#8EADA2]">
      ريال
    </span>
  </div>

  <div className="min-w-0 rounded-[28px] border border-red-400/20 bg-[#073529] p-4 sm:p-6">
    <p className="text-sm text-[#B4CEC5]">
      إجمالي المصروفات
    </p>

    <h2 className="mt-3 text-4xl font-bold text-red-400">
      {totalExpensesAmount.toLocaleString()}
    </h2>

    <span className="text-sm text-[#8EADA2]">
      ريال
    </span>
  </div>

  <div className="min-w-0 rounded-[28px] border border-[#C49A3A]/20 bg-[#073529] p-4 sm:p-6">
    <p className="text-sm text-[#B4CEC5]">
      إجمالي التغذية
    </p>

    <h2 className="mt-3 text-4xl font-bold text-[#F6D878]">
      {totalFundingAmount.toLocaleString()}
    </h2>

    <span className="text-sm text-[#8EADA2]">
      ريال
    </span>
  </div>

  <div className="min-w-0 rounded-[28px] border border-[#C49A3A]/20 bg-[#073529] p-4 sm:p-6">
    <p className="text-sm text-[#B4CEC5]">
      عدد العمليات
    </p>

    <h2 className="mt-3 text-4xl font-bold text-[#F6D878]">
      {totalOperationsCount}
    </h2>

    <span className="text-sm text-[#8EADA2]">
      عملية
    </span>
  </div>

</div>

        <div className="w-full">

          <div className="w-full min-w-0 rounded-[28px] border border-white/10 bg-gradient-to-br from-[#0B4537] via-[#073529] to-[#05261F] p-4 sm:p-6">

            <div className="relative mb-8 flex items-center justify-center text-center">

              <div>
                <h2 className="text-2xl font-bold text-white sm:text-3xl">
                  الأقسام المالية
                </h2>
                <p className="mt-2 text-[#B4CEC5]">
                  اختر القسم الذي تريد العمل عليه
                </p>
              </div>

              <div className="absolute left-0 rounded-2xl border border-[#C49A3A]/20 bg-[#C49A3A]/10 px-5 py-3 font-bold text-[#F6D878]">
                4 أقسام
              </div>

            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

           
            <div
  onClick={() => setActiveTab("expenses")}
  className={`cursor-pointer rounded-[28px] border p-6 h-[230px]
  transition-all duration-500 ease-out ${
    activeTab === "expenses"
      ? "border-[#C49A3A] bg-gradient-to-br from-[#C49A3A] to-[#F6D878] text-[#081B33] shadow-2xl"
      : "border-white/10 bg-[#073529] hover:border-[#C49A3A] hover:-translate-y-2 hover:scale-[1.03] hover:shadow-[0_20px_45px_rgba(0,0,0,.35)]"
  }`}
>

  <div className="flex items-center justify-between">

    <div
      className={`flex h-20 w-20 items-center justify-center rounded-[24px] border ${
        activeTab === "expenses"
          ? "border-white/30 bg-white/20"
          : "border-[#C49A3A]/20 bg-[#C49A3A]/10"
      }`}
    >
      <Receipt size={52} strokeWidth={2.4} />
    </div>

    <Receipt
      size={22}
      className={
        activeTab === "expenses"
          ? "opacity-70"
          : "text-[#F6D878] opacity-40"
      }
    />

  </div>

  <h3 className="mt-5 text-2xl font-extrabold sm:mt-7 sm:text-[30px]">
    المصروفات
  </h3>

  <p
    className={`mt-3 text-base leading-7 ${
      activeTab === "expenses"
        ? "text-[#081B33]/80"
        : "text-[#B4CEC5]"
    }`}
  >
    إدارة جميع المصروفات والفواتير
  </p>

  <div
    className={`my-5 h-px ${
      activeTab === "expenses"
        ? "bg-gradient-to-br from-[#0B4537] via-[#073529] to-[#05261F]/20"
        : "bg-white/10"
    }`}
  />

  <div className="flex items-end justify-between">

    <div>

      <div className="text-4xl font-extrabold">
        {totalExpensesAmount.toLocaleString()}
      </div>

      <div
        className={`mt-1 text-sm ${
          activeTab === "expenses"
            ? "text-[#081B33]/70"
            : "text-[#B4CEC5]"
        }`}
      >
        إجمالي المصروفات (ريال)
      </div>

    </div>

    <div
      className={`rounded-xl px-3 py-1 text-xs font-bold ${
        activeTab === "expenses"
          ? "bg-white/20"
          : "bg-[#C49A3A]/10 text-[#F6D878]"
      }`}
    >
      نشط
    </div>

  </div>

</div>
<div
  onClick={() => setActiveTab("accounts")}
  className={`cursor-pointer rounded-[28px] border p-6 h-[230px]
  transition-all duration-500 ease-out ${
    activeTab === "accounts"
      ? "border-emerald-400 bg-gradient-to-br from-[#0F8F68] to-[#35C99A] text-[#081B33] shadow-2xl"
      : "border-white/10 bg-[#073529] hover:border-emerald-300 hover:-translate-y-2 hover:scale-[1.03] hover:shadow-[0_20px_45px_rgba(0,0,0,.35)]"
  }`}
>

  <div className="flex items-center justify-between">

    <div
      className={`flex h-20 w-20 items-center justify-center rounded-[24px] border ${
        activeTab === "accounts"
          ? "border-white/30 bg-white/20"
          : "border-emerald-400/20 bg-emerald-400/10"
      }`}
    >
      <Wallet size={52} strokeWidth={2.4} />
    </div>

    <Wallet
      size={22}
      className={
        activeTab === "accounts"
          ? "opacity-70"
          : "text-emerald-400 opacity-40"
      }
    />

  </div>

  <h3 className="mt-5 text-2xl font-extrabold sm:mt-7 sm:text-[30px]">
    العهد المالية
  </h3>

  <p
    className={`mt-3 text-base leading-7 ${
      activeTab === "accounts"
        ? "text-[#081B33]/80"
        : "text-[#B4CEC5]"
    }`}
  >
    إدارة الحسابات والأرصدة المالية
  </p>

  <div
    className={`my-5 h-px ${
      activeTab === "accounts"
        ? "bg-gradient-to-br from-[#0B4537] via-[#073529] to-[#05261F]/20"
        : "bg-white/10"
    }`}
  />

  <div className="flex items-end justify-between">

    <div>

      <div className="text-4xl font-extrabold">
        {totalAccounts}
      </div>

      <div
        className={`mt-1 text-sm ${
          activeTab === "accounts"
            ? "text-[#081B33]/70"
            : "text-[#B4CEC5]"
        }`}
      >
        عدد الحسابات
      </div>

    </div>

    <div
      className={`rounded-xl px-3 py-1 text-xs font-bold ${
        activeTab === "accounts"
          ? "bg-white/20"
          : "bg-emerald-400/10 text-emerald-400"
      }`}
    >
      نشط
    </div>

  </div>

</div>
<div
  onClick={() => setActiveTab("funding")}
  className={`cursor-pointer rounded-[28px] border p-6 h-[230px]
  transition-all duration-500 ease-out ${
    activeTab === "funding"
      ? "border-[#C49A3A] bg-gradient-to-br from-[#C49A3A] to-[#F6D878] text-[#081B33] shadow-2xl"
      : "border-white/10 bg-[#073529] hover:border-[#C49A3A] hover:-translate-y-2 hover:scale-[1.03] hover:shadow-[0_20px_45px_rgba(0,0,0,.35)]"
  }`}
>

  <div className="flex items-center justify-between">

    <div
      className={`flex h-20 w-20 items-center justify-center rounded-[24px] border ${
        activeTab === "funding"
          ? "border-white/30 bg-white/20"
          : "border-[#C49A3A]/20 bg-[#C49A3A]/10"
      }`}
    >
      <Landmark size={52} strokeWidth={2.4} />
    </div>

    <Landmark
      size={22}
      className={
        activeTab === "funding"
          ? "opacity-70"
          : "text-[#F6D878] opacity-40"
      }
    />

  </div>

  <h3 className="mt-5 text-2xl font-extrabold sm:mt-7 sm:text-[30px]">
    التغذية
  </h3>

  <p
    className={`mt-3 text-base leading-7 ${
      activeTab === "funding"
        ? "text-[#081B33]/80"
        : "text-[#B4CEC5]"
    }`}
  >
    تسجيل جميع عمليات تغذية الحسابات
  </p>

  <div
    className={`my-5 h-px ${
      activeTab === "funding"
        ? "bg-gradient-to-br from-[#0B4537] via-[#073529] to-[#05261F]/20"
        : "bg-white/10"
    }`}
  />

  <div className="flex items-end justify-between">

    <div>

      <div className="text-4xl font-extrabold">
        {totalFundingOperations}
      </div>

      <div
        className={`mt-1 text-sm ${
          activeTab === "funding"
            ? "text-[#081B33]/70"
            : "text-[#B4CEC5]"
        }`}
      >
        عمليات التغذية
      </div>

    </div>

    <div
      className={`rounded-xl px-3 py-1 text-xs font-bold ${
        activeTab === "funding"
          ? "bg-white/20"
          : "bg-[#C49A3A]/10 text-[#F6D878]"
      }`}
    >
      نشط
    </div>

  </div>

</div>
<div
  onClick={() => setActiveTab("categories")}
  className={`cursor-pointer rounded-[28px] border p-6 h-[230px]
  transition-all duration-500 ease-out ${
    activeTab === "categories"
      ? "border-[#D4AD4D] bg-gradient-to-br from-[#A9822F] to-[#F6D878] text-[#081B33] shadow-2xl"
      : "border-white/10 bg-[#073529] hover:border-[#D4AD4D] hover:-translate-y-2 hover:scale-[1.03] hover:shadow-[0_20px_45px_rgba(0,0,0,.35)]"
  }`}
>

  <div className="flex items-center justify-between">

    <div
      className={`flex h-20 w-20 items-center justify-center rounded-[24px] border ${
        activeTab === "categories"
          ? "border-white/30 bg-white/20"
          : "border-[#D4AD4D]/20 bg-[#C49A3A]/10"
      }`}
    >
      <FolderTree size={52} strokeWidth={2.4} />
    </div>

    <FolderTree
      size={22}
      className={
        activeTab === "categories"
          ? "opacity-70"
          : "text-[#F6D878] opacity-40"
      }
    />

  </div>

  <h3 className="mt-5 text-2xl font-extrabold sm:mt-7 sm:text-[30px]">
    البنود
  </h3>

  <p
    className={`mt-3 text-base leading-7 ${
      activeTab === "categories"
        ? "text-[#081B33]/80"
        : "text-[#B4CEC5]"
    }`}
  >
    إدارة وتصنيف بنود المصروفات
  </p>

  <div
    className={`my-5 h-px ${
      activeTab === "categories"
        ? "bg-gradient-to-br from-[#0B4537] via-[#073529] to-[#05261F]/20"
        : "bg-white/10"
    }`}
  />

  <div className="mt-5 grid grid-cols-3 gap-3 text-center">
    <div className={`rounded-2xl px-3 py-3 ${activeTab === "categories" ? "bg-white/20" : "bg-white/5"}`}>
      <div className="text-2xl font-extrabold">{totalExpenseItems}</div>
      <div className={`mt-1 text-xs ${activeTab === "categories" ? "text-[#081B33]/70" : "text-[#B4CEC5]"}`}>إجمالي البنود</div>
    </div>
    <div className={`rounded-2xl px-3 py-3 ${activeTab === "categories" ? "bg-white/20" : "bg-white/5"}`}>
      <div className="text-2xl font-extrabold">{totalCategories}</div>
      <div className={`mt-1 text-xs ${activeTab === "categories" ? "text-[#081B33]/70" : "text-[#B4CEC5]"}`}>إجمالي التصنيفات</div>
    </div>
    <div className={`rounded-2xl px-3 py-3 ${activeTab === "categories" ? "bg-white/20" : "bg-white/5"}`}>
      <div className="text-2xl font-extrabold">{totalStages}</div>
      <div className={`mt-1 text-xs ${activeTab === "categories" ? "text-[#081B33]/70" : "text-[#B4CEC5]"}`}>إجمالي المراحل</div>
    </div>
  </div>

</div>

</div>

</div>
</div>
{/* المحتوى */}

<div>

  <div className="mb-6" />

    {activeTab === "expenses" && (
    <>
      <ExpensesPage
        expenses={expenses}
        accounts={accounts}
        refreshKey={expenseRefreshKey}
        onAddExpense={canAddFinancial ? () => {
          setEditingExpense(null);
          setOpenExpenseModal(true);
        } : undefined}
        onEditExpense={canEditFinancial ? handleEditExpense : undefined}
        onDeleteExpense={canDeleteFinancial ? handleDeleteExpense : undefined}
      />

      {/* نافذة إضافة المصروف تظهر مباشرة أسفل جدول المصروفات */}
<ExpenseModal
  open={openExpenseModal}
  onClose={closeExpenseModal}
  onSave={handleSaveExpense}
  accounts={accounts}
  initialExpense={editingExpense}
  isEditing={Boolean(editingExpense)}
/>
    </>
  )}

  {activeTab === "accounts" && (
    <div dir="rtl" className="space-y-6">
      <div className="relative flex items-center justify-between rounded-3xl border border-white/10 bg-gradient-to-br from-[#0B4537] via-[#073529] to-[#05261F] p-6">

  {/* زر إضافة عهدة */}
  <button
    type="button"
    onClick={() => setOpenAccountModal(true)}
    disabled={!canAddFinancial}
    className="flex items-center gap-2 rounded-2xl bg-[#0F8F68] px-6 py-4 font-bold text-white transition hover:bg-[#0B6F52] hover:-translate-y-0.5"
  >
    <Plus size={20} />
    إضافة عهدة جديدة
  </button>

  {/* العنوان */}
  <div className="text-center">
    <h2 className="text-3xl font-extrabold text-white">
      العهد المالية
    </h2>
    <p className="mt-2 text-[#B4CEC5]">
      إدارة جميع العهد والأرصدة المالية
    </p>
  </div>

  {/* إجمالي العهد */}
  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-6 py-4 text-center">
    <div className="text-3xl font-extrabold text-emerald-400">
      {accounts.length}
    </div>
    <div className="mt-1 text-sm text-[#B4CEC5]">
      إجمالي العهد
    </div>
  </div>

</div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {accounts.length === 0 ? (
          <div className="col-span-full rounded-3xl border border-white/10 bg-gradient-to-br from-[#0B4537] via-[#073529] to-[#05261F] p-12 text-center text-[#8EADA2]">
            لا توجد عهد مالية مدخلة حتى الآن
          </div>
        ) : (
          accounts.map((account) => (
            <div key={account.id} className="rounded-3xl border border-white/10 bg-[#073529] p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4">

  <div className="min-w-0 flex-1">
    <h3 className="text-xl font-extrabold text-white sm:text-2xl">
      {account.name}
    </h3>

    <p className="mt-1 text-sm text-[#B4CEC5]">
      {account.type || "عهدة مالية"}
    </p>
  </div>

  <div className="flex shrink-0 items-center gap-2">

    {canEditFinancial && <button
      type="button"
      onClick={() => handleEditAccount(account)}
      title="تعديل العهدة"
      className="
        flex h-10 w-10 items-center justify-center
        rounded-xl
        border border-[#C49A3A]/30
        bg-[#C49A3A]/10
        text-lg
        transition
        hover:border-[#D4AD4D]
        hover:bg-[#C49A3A]/20
      "
    >
      ✏️
    </button>}

    {canDeleteFinancial && <button
      type="button"
      onClick={() => handleDeleteAccount(account)}
      title="حذف العهدة"
      className="
        flex h-10 w-10 items-center justify-center
        rounded-xl
        border border-red-400/30
        bg-red-400/10
        text-lg
        transition
        hover:border-red-400
        hover:bg-red-400/20
      "
    >
      🗑️
    </button>}

    {/* أيقونة العهدة */}
    <div className="rounded-2xl bg-emerald-400/10 p-3 text-emerald-400">
      <Wallet size={28} />
    </div>
 
</div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-gradient-to-br from-[#0B4537] via-[#073529] to-[#05261F] p-5">
                <p className="text-sm text-[#B4CEC5]">الرصيد الحالي</p>
                <p className="mt-2 text-3xl font-extrabold text-[#F6D878]">
                  {Number(account.currentBalance ?? 0).toLocaleString()} <span className="text-sm text-[#8EADA2]">ريال</span>
                </p>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-red-400/10 p-3">
                  <div className="text-lg font-bold text-red-400">{Number(account.totalExpenses ?? 0).toLocaleString()}</div>
                  <div className="text-xs text-[#B4CEC5]">المصروفات</div>
                </div>
                <div className="rounded-xl bg-green-400/10 p-3">
                  <div className="text-lg font-bold text-green-400">{Number(account.totalFunding ?? 0).toLocaleString()}</div>
                  <div className="text-xs text-[#B4CEC5]">التغذية</div>
                </div>
                <div className="rounded-xl bg-[#C49A3A]/10 p-3">
                  <div className="text-lg font-bold text-[#F6D878]">{Number(account.operationsCount ?? 0)}</div>
                  <div className="text-xs text-[#B4CEC5]">عدد العمليات</div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button type="button" onClick={() => handleViewAccount(account)} className="flex items-center justify-center gap-2 rounded-xl border border-[#C49A3A]/30 bg-[#C49A3A]/10 py-3 font-bold text-[#F6D878] hover:bg-[#C49A3A]/20">
                  <Eye size={18} /> عرض
                </button>
                <button type="button" onClick={() => handleAddFundingForAccount(Number(account.id))} className="flex items-center justify-center gap-2 rounded-xl bg-green-500 py-3 font-bold text-white hover:bg-green-600">
                  <Plus size={18} /> تغذية
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )}

  {activeTab === "funding" && (
    <FundingPage
      onAddFunding={canAddFinancial ? () => setOpenFundingModal(true) : () => {}}
    />
  )}

   {activeTab === "categories" && (
  <div dir="rtl" className="space-y-6">

    {/* عنوان القسم */}
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#0B4537] via-[#073529] to-[#05261F] p-6 text-center">
      <h2 className="text-3xl font-extrabold text-white">
        البنود والمراحل والتصنيفات
      </h2>

      <p className="mt-2 text-[#B4CEC5]">
        إدارة المراحل والتصنيفات وبنود المصروفات من مكان واحد
      </p>
    </div>

    {/* كروت الإضافة */}
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">

      {/* إضافة مرحلة */}
      <button
        type="button"
        onClick={() => setOpenStageModal(true)}
        className="group rounded-3xl border border-[#C49A3A]/20 bg-[#073529] p-7 text-right transition hover:-translate-y-1 hover:border-[#C49A3A] hover:bg-[#0E5141]"
      >
        <div className="flex items-center justify-between">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#C49A3A]/10 text-[#F6D878]">
            <Layers3 size={34} />
          </div>

          <Plus className="text-[#F6D878] opacity-60 group-hover:opacity-100" />
        </div>

        <h3 className="mt-6 text-2xl font-extrabold text-white">
          إضافة مرحلة
        </h3>

        <p className="mt-2 text-[#B4CEC5]">
          إضافة مرحلة جديدة لاستخدامها مع المصروفات
        </p>

        <div className="mt-5 text-sm font-bold text-[#F6D878]">
          {stages.length} مراحل مسجلة
        </div>
      </button>


      {/* إضافة تصنيف */}
      <button
        type="button"
        onClick={() => setOpenCategoryModal(true)}
        className="group rounded-3xl border border-[#C49A3A]/20 bg-[#073529] p-7 text-right transition hover:-translate-y-1 hover:border-[#D4AD4D] hover:bg-[#0E5141]"
      >
        <div className="flex items-center justify-between">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#C49A3A]/10 text-[#F6D878]">
            <Tags size={34} />
          </div>

          <Plus className="text-[#F6D878] opacity-60 group-hover:opacity-100" />
        </div>

        <h3 className="mt-6 text-2xl font-extrabold text-white">
          إضافة تصنيف
        </h3>

        <p className="mt-2 text-[#B4CEC5]">
          إضافة تصنيف جديد للمصروفات
        </p>

        <div className="mt-5 text-sm font-bold text-[#F6D878]">
          {categories.length} تصنيف مسجل
        </div>
      </button>


      {/* إضافة بند */}
      <button
        type="button"
        onClick={() => setOpenItemModal(true)}
        className="group rounded-3xl border border-[#D4AD4D]/20 bg-[#073529] p-7 text-right transition hover:-translate-y-1 hover:border-[#D4AD4D] hover:bg-[#0E5141]"
      >
        <div className="flex items-center justify-between">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#C49A3A]/10 text-[#F6D878]">
            <ListPlus size={34} />
          </div>

          <Plus className="text-[#F6D878] opacity-60 group-hover:opacity-100" />
        </div>

        <h3 className="mt-6 text-2xl font-extrabold text-white">
          إضافة بند
        </h3>

        <p className="mt-2 text-[#B4CEC5]">
          إضافة بند وربطه بالتصنيف المناسب
        </p>

        <div className="mt-5 text-3xl font-extrabold text-[#F6D878]">
          {expenseItems.length}
        </div>

        <div className="text-sm text-[#B4CEC5]">
          إجمالي عدد البنود
        </div>
      </button>

    </div>


    {/* ============================= */}
    {/* الجداول الثلاثة */}
    {/* ============================= */}

    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">


      {/* جدول البنود */}
      <div className="overflow-hidden rounded-3xl border border-[#D4AD4D]/20 bg-gradient-to-br from-[#0B4537] via-[#073529] to-[#05261F]">

        <div className="flex items-center justify-between border-b border-white/10 bg-[#073529] px-5 py-4">

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C49A3A]/10 text-[#F6D878]">
              <ListPlus size={22} />
            </div>

            <div>
              <h3 className="font-extrabold text-white">
                البنود
              </h3>

              <p className="text-xs text-[#B4CEC5]">
                بنود المصروفات
              </p>
            </div>
          </div>

          <span className="rounded-xl bg-[#C49A3A]/10 px-3 py-1 text-sm font-bold text-[#F6D878]">
            {expenseItems.length}
          </span>

        </div>


        <div className="max-h-[330px] overflow-y-auto">

          {expenseItems.length === 0 ? (

            <div className="px-5 py-10 text-center text-[#8EADA2]">
              لا توجد بنود حتى الآن
            </div>

          ) : (

            <table className="w-full text-sm">

              <thead className="sticky top-0 bg-[#073529] text-[#B4CEC5]">
                <tr>
                  <th className="px-4 py-3 text-right">
                    #
                  </th>

                  <th className="px-4 py-3 text-right">
                    اسم البند
                  </th>

                  <th className="px-4 py-3 text-right">
                    التصنيف
                  </th>
                </tr>
              </thead>


              <tbody>

                {expenseItems.map((item, index) => {

                  const category = categories.find(
                    (c) =>
                      String(c.id) ===
                      String(item.category_id)
                  );

                  return (
                    <tr
                      key={item.id}
                      className="border-t border-white/10 hover:bg-white/5"
                    >

                      <td className="px-4 py-3 text-[#8EADA2]">
                        {index + 1}
                      </td>

                      <td className="px-4 py-3 font-bold text-white">
                        {item.name}
                      </td>

                      <td className="px-4 py-3 text-[#B4CEC5]">
                        {category?.name ?? "-"}
                      </td>

                    </tr>
                  );

                })}

              </tbody>

            </table>

          )}

        </div>

      </div>



      {/* جدول التصنيفات */}
      <div className="overflow-hidden rounded-3xl border border-[#C49A3A]/20 bg-gradient-to-br from-[#0B4537] via-[#073529] to-[#05261F]">

        <div className="flex items-center justify-between border-b border-white/10 bg-[#073529] px-5 py-4">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C49A3A]/10 text-[#F6D878]">
              <Tags size={22} />
            </div>

            <div>
              <h3 className="font-extrabold text-white">
                التصنيفات
              </h3>

              <p className="text-xs text-[#B4CEC5]">
                تصنيفات المصروفات
              </p>
            </div>

          </div>

          <span className="rounded-xl bg-[#C49A3A]/10 px-3 py-1 text-sm font-bold text-[#F6D878]">
            {categories.length}
          </span>

        </div>


        <div className="max-h-[330px] overflow-y-auto">

          {categories.length === 0 ? (

            <div className="px-5 py-10 text-center text-[#8EADA2]">
              لا توجد تصنيفات حتى الآن
            </div>

          ) : (

            <table className="w-full text-sm">

              <thead className="sticky top-0 bg-[#073529] text-[#B4CEC5]">
                <tr>

                  <th className="px-4 py-3 text-right">
                    #
                  </th>

                  <th className="px-4 py-3 text-right">
                    اسم التصنيف
                  </th>

                  <th className="px-4 py-3 text-right">
                    عدد البنود
                  </th>

                </tr>
              </thead>


              <tbody>

                {categories.map((category, index) => {

                  const categoryItems =
                    expenseItems.filter(
                      (item) =>
                        String(item.category_id) ===
                        String(category.id)
                    );

                  return (

                    <tr
                      key={category.id}
                      className="border-t border-white/10 hover:bg-white/5"
                    >

                      <td className="px-4 py-3 text-[#8EADA2]">
                        {index + 1}
                      </td>

                      <td className="px-4 py-3 font-bold text-white">
                        {category.name}
                      </td>

                      <td className="px-4 py-3 font-bold text-[#F6D878]">
                        {categoryItems.length}
                      </td>

                    </tr>

                  );

                })}

              </tbody>

            </table>

          )}

        </div>

      </div>



      {/* جدول المراحل */}
      <div className="overflow-hidden rounded-3xl border border-[#C49A3A]/20 bg-gradient-to-br from-[#0B4537] via-[#073529] to-[#05261F]">

        <div className="flex items-center justify-between border-b border-white/10 bg-[#073529] px-5 py-4">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C49A3A]/10 text-[#F6D878]">
              <Layers3 size={22} />
            </div>

            <div>
              <h3 className="font-extrabold text-white">
                المراحل
              </h3>

              <p className="text-xs text-[#B4CEC5]">
                مراحل تنفيذ الأعمال
              </p>
            </div>

          </div>

          <span className="rounded-xl bg-[#C49A3A]/10 px-3 py-1 text-sm font-bold text-[#F6D878]">
            {stages.length}
          </span>

        </div>


        <div className="max-h-[330px] overflow-y-auto">

          {stages.length === 0 ? (

            <div className="px-5 py-10 text-center text-[#8EADA2]">
              لا توجد مراحل حتى الآن
            </div>

          ) : (

            <table className="w-full text-sm">

              <thead className="sticky top-0 bg-[#073529] text-[#B4CEC5]">
                <tr>

                  <th className="px-4 py-3 text-right">
                    #
                  </th>

                  <th className="px-4 py-3 text-right">
                    اسم المرحلة
                  </th>

                  <th className="px-4 py-3 text-right">
                    الحالة
                  </th>

                </tr>
              </thead>


              <tbody>

                {stages.map((stage, index) => (

                  <tr
                    key={stage.id}
                    className="border-t border-white/10 hover:bg-white/5"
                  >

                    <td className="px-4 py-3 text-[#8EADA2]">
                      {index + 1}
                    </td>

                    <td className="px-4 py-3 font-bold text-white">
                      {stage.name}
                    </td>

                    <td className="px-4 py-3">

                      <span className="rounded-lg bg-green-400/10 px-2 py-1 text-xs font-bold text-green-400">
                        نشطة
                      </span>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          )}

        </div>

      </div>

    </div>

  </div>
)}
  {/* نافذة إضافة مرحلة */}
  {openStageModal && (
    <div className="fixed inset-0 z-[400] flex items-start justify-center overflow-y-auto bg-black/70 p-3 sm:items-center sm:p-4">
      <div className="w-full max-w-lg max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-3xl border border-white/10 bg-gradient-to-br from-[#0B4537] via-[#073529] to-[#05261F] p-4 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:p-7">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white">إضافة مرحلة جديدة</h3>
            <p className="mt-2 text-sm text-[#B4CEC5]">أضف مرحلة لاستخدامها في المصروفات</p>
          </div>
          <button type="button" onClick={() => setOpenStageModal(false)} className="text-2xl text-[#B4CEC5] hover:text-red-400">×</button>
        </div>
        <input value={newStageName} onChange={(e) => setNewStageName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddStage()} autoFocus placeholder="اسم المرحلة" className="w-full rounded-2xl border border-white/10 bg-[#073529] px-4 py-4 text-white outline-none focus:border-[#C49A3A]" />
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => setOpenStageModal(false)} className="h-12 rounded-xl border border-white/10 bg-white/5 font-bold text-[#B4CEC5]">إلغاء</button>
          <button type="button" onClick={handleAddStage} className="h-12 rounded-xl bg-[#D4AD4D] font-bold text-[#081B33]">+ إضافة المرحلة</button>
        </div>
      </div>
    </div>
  )}

  {/* نافذة إضافة تصنيف */}
  {openCategoryModal && (
    <div className="fixed inset-0 z-[400] flex items-start justify-center overflow-y-auto bg-black/70 p-3 sm:items-center sm:p-4">
      <div className="w-full max-w-lg max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-3xl border border-white/10 bg-gradient-to-br from-[#0B4537] via-[#073529] to-[#05261F] p-4 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:p-7">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white">إضافة تصنيف جديد</h3>
            <p className="mt-2 text-sm text-[#B4CEC5]">سيتم حفظ التصنيف مباشرة في قاعدة البيانات</p>
          </div>
          <button type="button" onClick={() => setOpenCategoryModal(false)} className="text-2xl text-[#B4CEC5] hover:text-red-400">×</button>
        </div>
        <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddCategory()} autoFocus placeholder="اسم التصنيف" className="w-full rounded-2xl border border-white/10 bg-[#073529] px-4 py-4 text-white outline-none focus:border-[#D4AD4D]" />
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => setOpenCategoryModal(false)} className="h-12 rounded-xl border border-white/10 bg-white/5 font-bold text-[#B4CEC5]">إلغاء</button>
          <button type="button" onClick={handleAddCategory} className="h-12 rounded-xl bg-[#C49A3A] font-bold text-white">+ إضافة التصنيف</button>
        </div>
      </div>
    </div>
  )}

  {/* نافذة إضافة بند */}
  {openItemModal && (
    <div className="fixed inset-0 z-[400] flex items-start justify-center overflow-y-auto bg-black/70 p-3 sm:items-center sm:p-4">
      <div className="w-full max-w-lg max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-3xl border border-white/10 bg-gradient-to-br from-[#0B4537] via-[#073529] to-[#05261F] p-4 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:p-7">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white">إضافة بند جديد</h3>
            <p className="mt-2 text-sm text-[#B4CEC5]">اختر التصنيف ثم أدخل اسم البند</p>
          </div>
          <button type="button" onClick={() => setOpenItemModal(false)} className="text-2xl text-[#B4CEC5] hover:text-red-400">×</button>
        </div>
        <select value={newItemCategoryId} onChange={(e) => setNewItemCategoryId(e.target.value)} className="mb-4 w-full rounded-2xl border border-white/10 bg-[#073529] px-4 py-4 text-white outline-none focus:border-[#D4AD4D]">
          <option value="">اختر التصنيف</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
        <input value={newItemName} onChange={(e) => setNewItemName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddItem()} placeholder="اسم البند" className="w-full rounded-2xl border border-white/10 bg-[#073529] px-4 py-4 text-white outline-none focus:border-[#D4AD4D]" />
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => setOpenItemModal(false)} className="h-12 rounded-xl border border-white/10 bg-white/5 font-bold text-[#B4CEC5]">إلغاء</button>
          <button type="button" onClick={handleAddItem} className="h-12 rounded-xl bg-[#C49A3A] font-bold text-white">+ إضافة البند</button>
        </div>
      </div>
    </div>
  )}


<FundingModal
  open={openFundingModal}
  onClose={() => setOpenFundingModal(false)}
  onSave={handleSaveFunding}
  selectedAccountId={selectedAccountId}
/>
{selectedAccount && (
  <div className="fixed inset-0 z-[300] flex items-start justify-center overflow-y-auto bg-black/70 p-3 sm:items-center sm:p-4">
    <div className="w-full max-w-5xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-3xl border border-white/10 bg-gradient-to-br from-[#0B4537] via-[#073529] to-[#05261F] p-4 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:p-7">

      {/* العنوان */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white sm:text-2xl">
            تفاصيل العهدة
          </h2>

          <p className="mt-2 text-sm text-[#B4CEC5]">
            عرض بيانات وحركة العهدة المالية
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSelectedAccount(null)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xl text-[#B4CEC5] hover:bg-white/10 hover:text-white"
        >
          ×
        </button>
      </div>

      {/* اسم العهدة */}
      <div className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5">
        <p className="text-sm text-[#B4CEC5]">
          اسم العهدة
        </p>

        <h3 className="mt-2 break-words text-2xl font-extrabold text-white sm:text-3xl">
          {selectedAccount.name}
        </h3>

        <p className="mt-1 text-sm text-[#B4CEC5]">
          {selectedAccount.type || "عهدة مالية"}
        </p>
      </div>

      {/* البيانات المالية */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">

        {/* الرصيد الحالي */}
        <div className="rounded-2xl border border-[#C49A3A]/20 bg-[#C49A3A]/10 p-5 text-center">
          <p className="text-sm text-[#B4CEC5]">
            الرصيد الحالي
          </p>

          <p className="mt-2 text-2xl font-extrabold text-[#F6D878]">
            {Number(
              selectedAccount.currentBalance ?? 0
            ).toLocaleString()}
          </p>

          <span className="text-xs text-[#8EADA2]">
            ريال
          </span>
        </div>

        {/* إجمالي التغذية */}
        <div className="rounded-2xl border border-green-400/20 bg-green-400/10 p-5 text-center">
          <p className="text-sm text-[#B4CEC5]">
            إجمالي التغذية
          </p>

          <p className="mt-2 text-2xl font-extrabold text-green-400">
            {Number(
              selectedAccount.totalFunding ?? 0
            ).toLocaleString()}
          </p>

          <span className="text-xs text-[#8EADA2]">
            ريال
          </span>
        </div>

        {/* إجمالي المصروفات */}
        <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-5 text-center">
          <p className="text-sm text-[#B4CEC5]">
            إجمالي المصروفات
          </p>

          <p className="mt-2 text-2xl font-extrabold text-red-400">
            {Number(
              selectedAccount.totalExpenses ?? 0
            ).toLocaleString()}
          </p>

          <span className="text-xs text-[#8EADA2]">
            ريال
          </span>
        </div>

      </div>

      {/* عدد العمليات */}
      <div className="mt-5 rounded-2xl border border-[#C49A3A]/20 bg-[#C49A3A]/10 p-5 text-center">
        <p className="text-sm text-[#B4CEC5]">
          إجمالي عدد العمليات
        </p>

        <p className="mt-2 text-3xl font-extrabold text-[#F6D878]">
          {Number(
            selectedAccount.operationsCount ?? 0
          )}
        </p>

        <span className="text-xs text-[#8EADA2]">
          عملية
        </span>
      </div>

      {/* =========================
          سجل تغذيات العهدة
      ========================= */}
      <div className="mt-6">

        {/* عنوان الجدول */}
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">
            سجل التغذيات
          </h3>

          <span className="rounded-lg bg-green-400/10 px-3 py-1 text-sm text-green-400">
            {
              funding.filter(
                (item: any) =>
                  Number(item.account_id) ===
                  Number(selectedAccount.id)
              ).length
            }{" "}
            تغذية
          </span>
        </div>

        {/* الجدول */}
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#073529]">

          <div className="max-h-[280px] overflow-auto">

            <table className="w-full min-w-[700px] text-sm">

              {/* رأس الجدول */}
              <thead className="sticky top-0 z-10 bg-[#0B4537]">
                <tr className="text-[#B4CEC5]">

                  <th className="px-4 py-4 text-right font-bold">
                    تاريخ الإدخال
                  </th>

                  <th className="px-4 py-4 text-right font-bold">
                    تاريخ التغذية
                  </th>

                  <th className="px-4 py-4 text-right font-bold">
                    المبلغ
                  </th>

                  <th className="px-4 py-4 text-right font-bold">
                    طريقة الدفع
                  </th>

                  <th className="px-4 py-4 text-center font-bold">
                    المرفقات
                  </th>

                </tr>
              </thead>

              {/* بيانات الجدول */}
              <tbody>

                {funding
                  .filter(
                    (item: any) =>
                      Number(item.account_id) ===
                      Number(selectedAccount.id)
                  )
                  .sort(
                    (a: any, b: any) =>
                      new Date(
                        b.created_at || 0
                      ).getTime() -
                      new Date(
                        a.created_at || 0
                      ).getTime()
                  )
                  .map((item: any) => (

                    <tr
                      key={item.id}
                      className="border-t border-white/10 text-gray-200 hover:bg-white/5"
                    >

                      {/* تاريخ الإدخال */}
                      <td className="px-4 py-4">
                        {item.created_at
                          ? new Date(
                              item.created_at
                            ).toLocaleDateString("en-CA")
                          : "—"}
                      </td>

                      {/* تاريخ التغذية */}
                      <td className="px-4 py-4">
                        {item.funding_date || "—"}
                      </td>

                      {/* المبلغ */}
                      <td className="px-4 py-4 font-extrabold text-green-400">
                        {Number(
                          item.amount || 0
                        ).toLocaleString()}{" "}
                        ريال
                      </td>

                      {/* طريقة الدفع */}
                      <td className="px-4 py-4">

                        {item.source === "cash" ? (
                          <span className="text-green-400">
                            💵 نقدًا
                          </span>
                        ) : item.source === "bank" ? (
                          <span className="text-[#F6D878]">
                            🏦 تحويل بنكي
                          </span>
                        ) : item.source === "card" ? (
                          <span className="text-[#F6D878]">
                            💳 بطاقة
                          </span>
                        ) : (
                          <span className="text-[#B4CEC5]">
                            {item.source || "—"}
                          </span>
                        )}

                      </td>

                      {/* المرفقات */}
                      <td className="px-4 py-4 text-center">

                        {item.attachment_url ? (

                          <button
  type="button"
  onClick={async () => {
    const { data, error } = await supabase.storage
      .from("funding-attachments")
      .createSignedUrl(item.attachment_url, 300);

    if (error || !data?.signedUrl) {
      console.error("خطأ فتح المرفق:", error);
      alert("تعذر فتح المرفق");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }}
  className="inline-flex items-center justify-center rounded-lg bg-[#C49A3A]/10 px-4 py-2 text-[#F6D878] hover:bg-[#C49A3A]/20"
>
  عرض المرفق
</button>

                        ) : (

                          <span className="text-[#8EADA2]">
                            لا يوجد
                          </span>

                        )}

                      </td>

                    </tr>

                  ))}

                {/* لا توجد تغذيات */}
                {funding.filter(
                  (item: any) =>
                    Number(item.account_id) ===
                    Number(selectedAccount.id)
                ).length === 0 && (

                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-[#8EADA2]"
                    >
                      لا توجد تغذيات مسجلة لهذه العهدة
                    </td>
                  </tr>

                )}

              </tbody>

            </table>

          </div>

        </div>

      </div>

      {/* الأزرار */}
      <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">

        <button
          type="button"
          onClick={() => {
            const accountId = Number(
              selectedAccount.id
            );

            setSelectedAccount(null);
            setSelectedAccountId(accountId);
            setOpenFundingModal(true);
          }}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-green-500 font-bold text-white hover:bg-green-600"
        >
          <Plus size={18} />
          إضافة تغذية
        </button>

        <button
          type="button"
          onClick={() => setSelectedAccount(null)}
          className="h-12 rounded-xl border border-white/10 bg-white/5 font-bold text-[#B4CEC5] hover:bg-white/10 hover:text-white"
        >
          إغلاق
        </button>

      </div>

    </div>
  </div>
)}
  {/* نافذة إضافة عهدة */}
  {openAccountModal && (
    
    <div className="fixed inset-0 z-[300] flex items-start justify-center overflow-y-auto bg-black/70 p-3 sm:items-center sm:p-4">

      <div className="w-full max-w-lg max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-3xl border border-white/10 bg-gradient-to-br from-[#0B4537] via-[#073529] to-[#05261F] p-4 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:p-7">

        {/* العنوان */}

        <div className="mb-6 flex items-center justify-between">

          <div>
            <h2 className="text-2xl font-bold text-white">
              إضافة عهدة جديدة
            </h2>

            <p className="mt-2 text-sm text-[#B4CEC5]">
              إنشاء عهدة مالية جديدة
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setOpenAccountModal(false);
              setNewAccountName("");
              setNewAccountType("عهدة");
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xl text-[#B4CEC5] hover:bg-white/10 hover:text-white"
          >
            ×
          </button>

        </div>

        {/* اسم العهدة */}

        <div className="mb-5">

          <label className="mb-2 block text-sm font-bold text-[#B4CEC5]">
            اسم العهدة
          </label>

          <input
            type="text"
            value={newAccountName}
            onChange={(e) => setNewAccountName(e.target.value)}
            placeholder="مثال: عهدة المشتريات"
            className="w-full rounded-2xl border border-white/10 bg-[#073529] px-4 py-4 text-white outline-none placeholder:text-[#8EADA2] focus:border-[#C49A3A]/50"
            autoFocus
          />

        </div>

        {/* نوع العهدة */}

        <div className="mb-7">

          <label className="mb-2 block text-sm font-bold text-[#B4CEC5]">
            نوع العهدة
          </label>

          <select
            value={newAccountType}
            onChange={(e) => setNewAccountType(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#073529] px-4 py-4 text-white outline-none focus:border-[#C49A3A]/50"
          >
            <option value="عهدة">
              عهدة
            </option>
          </select>

        </div>

        {/* الأزرار */}

        <div className="grid grid-cols-2 gap-3">

          <button
            type="button"
            onClick={() => {
              setOpenAccountModal(false);
              setNewAccountName("");
              setNewAccountType("عهدة");
            }}
            className="h-12 rounded-xl border border-white/10 bg-white/5 font-bold text-[#B4CEC5] hover:bg-white/10 hover:text-white"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleAddAccount}
            className="h-12 rounded-xl bg-green-500 font-bold text-white hover:bg-green-600"
          >
            + إنشاء العهدة
          </button>

                               </div>
      </div>
    </div>
  )}

  </div>
  </div>
  </div>

);
}
