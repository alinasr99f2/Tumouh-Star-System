import { useEffect, useMemo, useState } from "react";
import { projects } from "../../data/projects";
import { villas } from "../../data/villas";
import { supabase } from "../../utils/supabase";

type Account = {
  id: number;
  name: string;
  type: string;
  currentBalance: number;
  totalFunding: number;
  totalExpenses: number;
  operationsCount: number;
};

type Props = {
  open: boolean;
  onClose: () => void;

  // دعم صفحة Dashboard الحالية
  onAddExpense?: (expense: any) => void | Promise<void | boolean>;
  onAddCategory?: (category: any) => void | Promise<void>;
  onAddClassification?: (classification: any) => void | Promise<void>;
  categories?: { id: string | number; name: string }[];
  classifications?: any[];

  // دعم صفحة المصروفات/المشروع الحالية
  onSave?: (expense: any) => Promise<boolean>;
  accounts?: Account[];
  villas: any[];

  initialExpense?: any | null;
  isEditing?: boolean;
  forcedProjectId?: string | number | null;
  forcedVillaId?: string | number | null;
  forcedVillaLabel?: string;
  hideSupplier?: boolean;
  forceGeneralExpense?: boolean;
};

export default function AddExpenseModal({
  open,
  onClose,
  onSave,
  onAddExpense,
  onAddCategory,
  onAddClassification,
  categories: initialCategories = [],
  accounts = [],
  villas,
  initialExpense,
  isEditing = false,
  forcedProjectId = null,
  forcedVillaId = null,
  forcedVillaLabel,
  hideSupplier = false,
  forceGeneralExpense = false,
}: Props) {


  
const today = new Date().toISOString().split("T")[0];

const [entryDate, setEntryDate] = useState(today);

const [expenseDate, setExpenseDate] = useState(today);
const [supplier, setSupplier] = useState("");
const [projectId, setProjectId] = useState("");
const [suppliers, setSuppliers] = useState<
  { id: number; name: string }[]
>([]);

const [showAddSupplier, setShowAddSupplier] = useState(false);
const [newSupplierName, setNewSupplierName] = useState("");
const [villaCode, setVillaCode] = useState("");
const [villaId, setVillaId] = useState("");
const [accountId, setAccountId] = useState("");
const [stageId, setStageId] = useState("");

const [categoryId, setCategoryId] = useState("");
const [itemId, setItemId] = useState("");

const [showAddCategory, setShowAddCategory] = useState(false);
const [showAddItem, setShowAddItem] = useState(false);
const [showAddAccount, setShowAddAccount] = useState(false);
const [showAddStage, setShowAddStage] = useState(false);

const [newCategoryName, setNewCategoryName] = useState("");
const [newItemName, setNewItemName] = useState("");
const [newAccountName, setNewAccountName] = useState("");
const [newStageName, setNewStageName] = useState("");

const [categories, setCategories] = useState<
  { id: string | number; name: string }[]
>(initialCategories);

const [expenseItems, setExpenseItems] = useState<
  { id: number; name: string; category_id: number }[]
>([]);

const [stages, setStages] = useState<
  { id: number; name: string; is_active?: boolean }[]
>([]);
const [stageCategoryMap, setStageCategoryMap] = useState<Record<string, number[]>>({});
const [showStageCategoryManager, setShowStageCategoryManager] = useState(false);
const [localAccounts, setLocalAccounts] = useState<Account[]>(accounts);

const [voucherNo, setVoucherNo] = useState("");
const [amount, setAmount] = useState("");
const [taxPercent, setTaxPercent] = useState("15");

const [paymentMethod, setPaymentMethod] =
  useState("");

const [description, setDescription] =
  useState("");

useEffect(() => {
  if (accounts.length > 0) {
    setLocalAccounts(accounts);
    return;
  }

  let cancelled = false;

  const loadAccounts = async () => {
    const { data, error } = await supabase
      .from("accounts")
      .select("id, name, type, balance")
      .order("id", { ascending: true });

    if (error) {
      console.error("خطأ في تحميل العهد:", error);
      return;
    }

    if (cancelled) return;

    setLocalAccounts(
      (data ?? []).map((account: any) => ({
        id: Number(account.id),
        name: String(account.name ?? ""),
        type: String(account.type ?? "عهدة"),
        currentBalance: Number(account.balance ?? 0),
        totalFunding: Number(account.totalFunding ?? 0),
        totalExpenses: Number(account.totalExpenses ?? 0),
        operationsCount: Number(account.operationsCount ?? 0),
      }))
    );
  };

  loadAccounts();

  return () => {
    cancelled = true;
  };
}, [accounts]);

const tax = useMemo(() => {
  const value = Number(amount || 0);
  return value * Number(taxPercent || 0) / 100;
}, [amount, taxPercent]);

const total = useMemo(() => {
  return Number(amount || 0) + tax;
}, [amount, tax]);

const projectVillas = useMemo(() => {
  console.log(projectId);

console.log(villas);

  if (!projectId) return [];

  return villas.filter(
    (v) => String(v.projectId) === String(projectId)
  );

}, [projectId, villas]);
useEffect(() => {
  const loadCategoriesAndItems = async () => {
    const [
      { data: categoriesData, error: categoriesError },
      { data: itemsData, error: itemsError },
      { data: suppliersData, error: suppliersError },
      { data: stagesData, error: stagesError },
    ] = await Promise.all([
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
  .select("id, name")
  .order("id", { ascending: true }),

      supabase
        .from("expense_stages")
        .select("id, name, is_active")
        .eq("is_active", true)
        .order("id", { ascending: true }),
    ]);

    if (categoriesError) {
      console.error(
        "خطأ في تحميل التصنيفات:",
        categoriesError
      );
      return;
    }

    if (itemsError) {
      console.error(
        "خطأ في تحميل البنود:",
        itemsError
      );
      return;
    }

    if (suppliersError) {
      console.error("خطأ في تحميل الموردين:", suppliersError);
    }

    if (stagesError) {
      console.error("خطأ في تحميل المراحل:", stagesError);
    }

    setCategories(
      initialCategories.length > 0 ? initialCategories : (categoriesData ?? [])
    );
    setExpenseItems(itemsData ?? []);
    setSuppliers(suppliersData ?? []);
    setStages(stagesData ?? []);
    try {
      const savedMap = JSON.parse(localStorage.getItem("tumouh-stage-category-map") || "{}");
      setStageCategoryMap(savedMap && typeof savedMap === "object" ? savedMap : {});
    } catch { setStageCategoryMap({}); }
  };

  if (open) {
    loadCategoriesAndItems();
  }
}, [open]);

// تعبئة النموذج عند فتحه في وضع التعديل، وإرجاعه للوضع الفارغ عند الإضافة.
useEffect(() => {
  if (!open) return;

  if (forcedProjectId != null) {
    setProjectId(String(forcedProjectId));
  }

  if (forceGeneralExpense) {
    setVillaId("general");
  } else if (forcedVillaId != null && !isEditing) {
    setVillaId(String(forcedVillaId));
  } else if (!isEditing && forcedVillaId == null) {
    setVillaId("");
  }

  if (initialExpense && isEditing) {
    setEntryDate(
      String(
        initialExpense.entryDate ??
        initialExpense.entry_date ??
        today
      ).split("T")[0]
    );
    setExpenseDate(
      String(
        initialExpense.expenseDate ??
        initialExpense.expense_date ??
        initialExpense.entryDate ??
        today
      ).split("T")[0]
    );
    setSupplier(String(initialExpense.supplier ?? ""));
    setProjectId(String(initialExpense.projectId ?? initialExpense.project_id ?? ""));
    setVillaId(
      initialExpense.villaId ?? initialExpense.villa_id
        ? String(initialExpense.villaId ?? initialExpense.villa_id)
        : ""
    );
    setAccountId(String(initialExpense.accountId ?? initialExpense.account_id ?? ""));
    setStageId(String(initialExpense.stageId ?? initialExpense.stage_id ?? ""));
    setCategoryId(String(initialExpense.categoryId ?? initialExpense.category_id ?? ""));
    setItemId(String(initialExpense.itemId ?? initialExpense.item_id ?? ""));
    setVoucherNo(String(initialExpense.voucherNo ?? initialExpense.voucher_no ?? ""));
    setAmount(String(initialExpense.amount ?? 0));
    setTaxPercent(
      Number(initialExpense.amount ?? 0) > 0
        ? String(
            (Number(initialExpense.tax ?? initialExpense.tax_amount ?? 0) /
              Number(initialExpense.amount ?? 1)) *
              100
          )
        : "15"
    );
    setPaymentMethod(String(initialExpense.paymentMethod ?? initialExpense.payment_method ?? ""));
    setDescription(String(initialExpense.description ?? ""));
    if (forceGeneralExpense) setVillaId("general");
  } else {
    resetForm();
    setEntryDate(today);
    if (forcedProjectId != null) {
      setProjectId(String(forcedProjectId));
    }
    if (forceGeneralExpense) {
      setVillaId("general");
    } else if (forcedVillaId != null) {
      setVillaId(String(forcedVillaId));
    }
  }
}, [open, initialExpense, isEditing, forcedProjectId, forcedVillaId, forceGeneralExpense]);

const handleAddSupplier = async () => {
  const name = newSupplierName.trim();

  if (!name) {
    alert("من فضلك أدخل اسم المورد");
    return;
  }

  const existingSupplier = suppliers.find(
    (item) => item.name.trim().toLowerCase() === name.toLowerCase()
  );

  if (existingSupplier) {
    setSupplier(existingSupplier.name);
    setShowAddSupplier(false);
    setNewSupplierName("");
    return;
  }

  const { data, error } = await supabase
    .from("suppliers")
    .insert({ name })
    .select("id, name")
    .single();

  if (error) {
    console.error("خطأ في إضافة المورد:", error);
    alert(`تعذر إضافة المورد:\n${error.message}`);
    return;
  }

  if (data) {
    setSuppliers((current) => [...current, data]);
    setSupplier(String(data.name ?? name));
  }

  setNewSupplierName("");
  setShowAddSupplier(false);
};

const linkedCategoryIds = stageId ? (stageCategoryMap[String(stageId)] ?? []) : [];
const availableCategories = stageId ? categories.filter((category) => linkedCategoryIds.includes(Number(category.id))) : [];

const saveStageCategoryLinks = (categoryIds: number[]) => {
  if (!stageId) return;
  const nextMap = { ...stageCategoryMap, [String(stageId)]: categoryIds };
  setStageCategoryMap(nextMap);
  try { localStorage.setItem("tumouh-stage-category-map", JSON.stringify(nextMap)); } catch {}
  setCategoryId("");
  setItemId("");
  setShowStageCategoryManager(false);
};

const handleAddCategory = async () => {
  const name = newCategoryName.trim();

  if (!name) {
    alert("من فضلك أدخل اسم التصنيف");
    return;
  }

  const existingCategory = categories.find(
    (category) =>
      category.name.trim().toLowerCase() === name.toLowerCase()
  );

  if (existingCategory) {
    alert("هذا التصنيف موجود بالفعل");
    setCategoryId(String(existingCategory.id));
    setItemId("");
    setShowAddCategory(false);
    setNewCategoryName("");
    return;
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({ name })
    .select("id, name")
    .single();

  if (error) {
    console.error("خطأ في إضافة التصنيف:", error);
    alert("حدث خطأ أثناء إضافة التصنيف");
    return;
  }

  if (data) {
    setCategories((current) => [...current, data]);
    setCategoryId(String(data.id));
    setItemId("");
    await onAddCategory?.(data);
  }

  setNewCategoryName("");
  setShowAddCategory(false);
};

const handleAddItem = async () => {
  const name = newItemName.trim();

  if (!categoryId) {
    alert("من فضلك اختر التصنيف أولاً");
    return;
  }

  if (!name) {
    alert("من فضلك أدخل اسم البند");
    return;
  }

  const existingItem = expenseItems.find(
    (item) =>
      String(item.category_id) === String(categoryId) &&
      item.name.trim().toLowerCase() === name.toLowerCase()
  );

  if (existingItem) {
    alert("هذا البند موجود بالفعل داخل التصنيف");
    setItemId(String(existingItem.id));
    setShowAddItem(false);
    setNewItemName("");
    return;
  }

  const { data, error } = await supabase
    .from("expense_items")
    .insert({
      name,
      category_id: Number(categoryId),
    })
    .select("id, name, category_id")
    .single();

  if (error) {
    console.error("خطأ في إضافة البند:", error);
    alert("حدث خطأ أثناء إضافة البند");
    return;
  }

  if (data) {
    setExpenseItems((current) => [...current, data]);
    setItemId(String(data.id));
  }

  setNewItemName("");
  setShowAddItem(false);
};

const handleAddAccount = async () => {
  const name = newAccountName.trim();

  if (!name) {
    alert("من فضلك أدخل اسم العهدة");
    return;
  }

  const existing = localAccounts.find(
    (account) => account.name.trim().toLowerCase() === name.toLowerCase()
  );

  if (existing) {
    setAccountId(String(existing.id));
    setShowAddAccount(false);
    setNewAccountName("");
    return;
  }

  const { data, error } = await supabase
    .from("accounts")
    .insert({ name, type: "عهدة", balance: 0 })
    .select("id, name, type, balance")
    .single();

  if (error) {
    console.error("خطأ في إضافة العهدة:", error);
    alert(`تعذر إضافة العهدة:\n${error.message}`);
    return;
  }

  if (data) {
    const newAccount: Account = {
      id: Number(data.id),
      name: String(data.name ?? name),
      type: String(data.type ?? "عهدة"),
      currentBalance: Number(data.balance ?? 0),
      totalFunding: 0,
      totalExpenses: 0,
      operationsCount: 0,
    };
    setLocalAccounts((current) => [...current, newAccount]);
    setAccountId(String(newAccount.id));
  }

  setNewAccountName("");
  setShowAddAccount(false);
};

const handleAddStage = async () => {
  const name = newStageName.trim();

  if (!name) {
    alert("من فضلك أدخل اسم المرحلة");
    return;
  }

  const existing = stages.find(
    (stage) => stage.name.trim().toLowerCase() === name.toLowerCase()
  );

  if (existing) {
    setStageId(String(existing.id));
    setShowAddStage(false);
    setNewStageName("");
    return;
  }

  const { data, error } = await supabase
    .from("expense_stages")
    .insert({ name, is_active: true })
    .select("id, name, is_active")
    .single();

  if (error) {
    console.error("خطأ في إضافة المرحلة:", error);
    alert(`تعذر إضافة المرحلة:\n${error.message}`);
    return;
  }

  if (data) {
    setStages((current) => [...current, data]);
    setStageId(String(data.id));
  }

  setNewStageName("");
  setShowAddStage(false);
};

const resetForm = () => {
  setEntryDate(today);
  setExpenseDate(today);
  setSupplier("");
  setProjectId("");
  setVillaId("");
  setAccountId("");
  setCategoryId("");
  setItemId("");
  setStageId("");
  setVoucherNo("");
  setAmount("");
  setTaxPercent("15");
  setPaymentMethod("");
  setDescription("");
};

const handleSave = async (addAnother = false) => {

  if (!accountId) {
    alert("من فضلك اختر العهدة");
    return;
  }

  if (!projectId) {
    alert("من فضلك اختر المشروع");
    return;
  }

  if (forcedVillaId != null && !villaId) {
    alert("الفيلا المختارة مطلوبة");
    return;
  }

  if (!categoryId) {
    alert("من فضلك اختر البند");
    return;
  }

  if (!amount || Number(amount) <= 0) {
    alert("من فضلك أدخل مبلغ المصروف");
    return;
  }

  const savedVillaId =
    villaId === "general" ? null : villaId;

  const expense = {
    id: initialExpense?.id ?? crypto.randomUUID(),

    entryDate,
    expenseDate,
    supplier: hideSupplier ? "" : supplier,
    projectId,
    villaId: forceGeneralExpense ? null : savedVillaId,
    accountId: Number(accountId),
    categoryId,
    stageId: stageId ? Number(stageId) : null,
    stageName: stages.find((stage) => String(stage.id) === String(stageId))?.name ?? null,
itemId: itemId ? Number(itemId) : null,
voucherNo,
amount: Number(amount),
    tax,
    total,
    paymentMethod,
    description,
    createdAt: new Date().toISOString(),
  };

 let success = true;

if (onSave) {
  success = await onSave(expense);
} else if (onAddExpense) {
  const result = await onAddExpense(expense);
  success = result !== false;
}

if (!success) {
  return;
}

console.log(expense);

resetForm();

if (forcedProjectId != null) {
  setProjectId(String(forcedProjectId));
}
if (forceGeneralExpense) {
  setVillaId("general");
} else if (forcedVillaId != null) {
  setVillaId(String(forcedVillaId));
}

if (!addAnother) {
  onClose();
}

};

if (!open) return null;

return (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">

    <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#081B33] p-8 shadow-2xl">

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">

        <h2 className="text-3xl font-bold text-white">
          {isEditing ? "تعديل المصروف" : "إضافة مصروف جديد"}
        </h2>

        <button
          type="button"
          onClick={onClose}
          className="text-2xl text-gray-400 transition hover:text-red-400"
        >
          ✕
        </button>

      </div>

      {/* Form */}
      <div className="grid grid-cols-2 gap-5">

        {/* تاريخ الإدخال */}
        <Input
          label="تاريخ الإدخال"
          type="date"
          value={entryDate}
          readOnly
        />

        {/* تاريخ المصروف */}
        <Input
          label="تاريخ المصروف"
          type="date"
          value={expenseDate}
          onChange={setExpenseDate}
        />

        {/* المورد */}
        {!hideSupplier && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm text-gray-300">المورد</label>
              <button type="button" onClick={() => { setNewSupplierName(""); setShowAddSupplier(true); }} className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-400 font-bold text-[#081B33]">+</button>
            </div>
            <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className="h-12 w-full rounded-xl border border-white/10 bg-[#102947] px-4 text-white outline-none focus:border-yellow-400">
              <option value="">اختر المورد...</option>
              {suppliers.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
            </select>
          </div>
        )}

        {/* المشروع */}
        <Select
          label="المشروع"
          value={projectId}
          onChange={setProjectId}
          disabled={forcedProjectId != null}
          options={projects.map((p) => ({
            value: p.id,
            label: p.name,
          }))}
        />

        {/* الفيلا */}
        {forceGeneralExpense ? (
          <Input label="الفيلا" value="مصروف عام على المشروع" readOnly />
        ) : (
          <Select
            label="الفيلا"
            value={villaId}
            onChange={setVillaId}
            disabled={forcedVillaId != null}
            options={
              forcedVillaId != null
                ? [{ value: String(forcedVillaId), label: forcedVillaLabel || `فيلا ${forcedVillaId}` }]
                : [{ value: "general", label: "🏘️ مصروف عام على المشروع" }, ...projectVillas.map((villa) => ({ value: villa.code, label: `${villa.block} - فيلا ${villa.code}` }))]
            }
          />
        )}

        {/* العهدة */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm text-gray-300">العهدة</label>
            <button
              type="button"
              onClick={() => {
                setNewAccountName("");
                setShowAddAccount(true);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-400 font-bold text-[#081B33] transition hover:bg-yellow-300"
              title="إضافة عهدة"
            >
              +
            </button>
          </div>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="h-12 w-full rounded-xl border border-white/10 bg-[#102947] px-4 text-white outline-none focus:border-yellow-400"
          >
            <option value="">اختر العهدة...</option>
            {localAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({Number(account.currentBalance || 0).toLocaleString()} ريال)
              </option>
            ))}
          </select>
        </div>

        {/* المرحلة */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm text-gray-300">المرحلة</label>
            <div className="flex items-center gap-2">
              <button type="button" disabled={!stageId} onClick={() => setShowStageCategoryManager(true)} className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[11px] font-bold text-cyan-300 disabled:opacity-40">ربط التصنيفات</button>
              <button
              type="button"
              onClick={() => {
                setNewStageName("");
                setShowAddStage(true);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-400 font-bold text-[#081B33] transition hover:bg-yellow-300"
              title="إضافة مرحلة"
            >
              +
            </button>
            </div>
          </div>
          <select
            value={stageId}
            onChange={(e) => setStageId(e.target.value)}
            className="h-12 w-full rounded-xl border border-white/10 bg-[#102947] px-4 text-white outline-none focus:border-yellow-400"
          >
            <option value="">اختر المرحلة...</option>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        </div>

        {/* التصنيف */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm text-gray-300">
              التصنيف
            </label>

            <button
              type="button"
              onClick={() => setShowAddCategory(true)}
              className="
                flex h-7 w-7
                items-center justify-center
                rounded-lg
                bg-yellow-400
                font-bold
                text-[#081B33]
                transition
                hover:bg-yellow-300
              "
            >
              +
            </button>
          </div>

          <select
            value={categoryId}
            disabled={!stageId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setItemId("");
            }}
            className="
              h-12 w-full
              rounded-xl
              border border-white/10
              bg-[#102947]
              px-4
              text-white
              outline-none
              focus:border-yellow-400
            "
          >
            <option value="">
              {stageId ? (availableCategories.length ? "اختر التصنيف..." : "لا توجد تصنيفات مرتبطة بهذه المرحلة") : "اختر المرحلة أولاً"}
            </option>

            {availableCategories.map((category) => (
              <option
                key={category.id}
                value={category.id}
              >
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* البند */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm text-gray-300">
              البند
            </label>

            <button
              type="button"
              disabled={!categoryId}
              onClick={() => {
                setNewItemName("");
                setShowAddItem(true);
              }}
              className="
                flex h-7 w-7
                items-center justify-center
                rounded-lg
                bg-yellow-400
                font-bold
                text-[#081B33]
                transition
                hover:bg-yellow-300
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              +
            </button>
          </div>

          <select
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            disabled={!categoryId}
            className="
              h-12 w-full
              rounded-xl
              border border-white/10
              bg-[#102947]
              px-4
              text-white
              outline-none
              focus:border-yellow-400
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            <option value="">
              {categoryId
                ? "اختر البند..."
                : "اختر التصنيف أولاً"}
            </option>

            {expenseItems
              .filter(
                (item) =>
                  String(item.category_id) ===
                  String(categoryId)
              )
              .map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                </option>
              ))}
          </select>
        </div>

        {/* رقم الفاتورة */}
        <Input
          label="رقم الفاتورة"
          value={voucherNo}
          onChange={setVoucherNo}
        />

        {/* المبلغ قبل الضريبة */}
        <Input
          label="المبلغ قبل الضريبة"
          type="number"
          value={amount}
          onChange={setAmount}
        />

        {/* الضريبة */}
        <Input
          label="الضريبة %"
          type="number"
          value={taxPercent}
          onChange={setTaxPercent}
        />

        {/* إجمالي الفاتورة */}
        <Input
          label="إجمالي الفاتورة"
          type="number"
          value={String(total)}
          readOnly
        />

        {/* طريقة الدفع */}
        <Select
          label="طريقة الدفع"
          value={paymentMethod}
          onChange={setPaymentMethod}
          options={[
            {
              value: "cash",
              label: "💵 نقدًا",
            },
            {
              value: "bank",
              label: "🏦 تحويل بنكي",
            },
            {
              value: "card",
              label: "💳 بطاقة",
            },
          ]}
        />

      </div>

      {/* Description */}
      <div className="mt-6">

        <label className="mb-2 block text-sm text-gray-300">
          الوصف
        </label>

        <textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="
            w-full
            rounded-xl
            border border-white/10
            bg-[#102947]
            p-4
            text-white
            outline-none
            focus:border-yellow-400
          "
        />

      </div>

      {/* Attachment */}
      <div className="mt-6">

        <label className="mb-2 block text-sm text-gray-300">
          إرفاق فاتورة
        </label>

        <input
          type="file"
          className="
            block w-full
            rounded-xl
            border border-white/10
            bg-[#102947]
            p-3
            text-white
          "
        />

      </div>

      {/* ================= إضافة مورد جديد ================= */}
      {showAddSupplier && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#081B33] p-7 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white">إضافة مورد جديد</h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddSupplier(false);
                  setNewSupplierName("");
                }}
                className="text-2xl text-gray-400 hover:text-red-400"
              >
                ✕
              </button>
            </div>

            <label className="mb-2 block text-sm text-gray-300">اسم المورد</label>
            <input
              type="text"
              value={newSupplierName}
              onChange={(e) => setNewSupplierName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddSupplier()}
              autoFocus
              placeholder="أدخل اسم المورد"
              className="h-12 w-full rounded-xl border border-white/10 bg-[#102947] px-4 text-white outline-none focus:border-yellow-400"
            />

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddSupplier(false);
                  setNewSupplierName("");
                }}
                className="rounded-xl border border-white/10 px-6 py-3 font-bold text-white hover:bg-white/5"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleAddSupplier}
                className="rounded-xl bg-yellow-400 px-6 py-3 font-bold text-[#081B33] hover:bg-yellow-300"
              >
                + إضافة المورد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= إضافة عهدة جديدة ================= */}
      {showAddAccount && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#081B33] p-7 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white">إضافة عهدة جديدة</h3>
              <button type="button" onClick={() => setShowAddAccount(false)} className="text-2xl text-gray-400 hover:text-red-400">✕</button>
            </div>
            <label className="mb-2 block text-sm text-gray-300">اسم العهدة</label>
            <input
              type="text"
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddAccount()}
              autoFocus
              placeholder="أدخل اسم العهدة"
              className="h-12 w-full rounded-xl border border-white/10 bg-[#102947] px-4 text-white outline-none focus:border-yellow-400"
            />
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setShowAddAccount(false)} className="rounded-xl border border-white/10 px-6 py-3 font-bold text-white hover:bg-white/5">إلغاء</button>
              <button type="button" onClick={handleAddAccount} className="rounded-xl bg-yellow-400 px-6 py-3 font-bold text-[#081B33] hover:bg-yellow-300">+ إضافة العهدة</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= إضافة مرحلة جديدة ================= */}
      {showAddStage && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#081B33] p-7 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white">إضافة مرحلة جديدة</h3>
              <button type="button" onClick={() => setShowAddStage(false)} className="text-2xl text-gray-400 hover:text-red-400">✕</button>
            </div>
            <label className="mb-2 block text-sm text-gray-300">اسم المرحلة</label>
            <input
              type="text"
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddStage()}
              autoFocus
              placeholder="أدخل اسم المرحلة"
              className="h-12 w-full rounded-xl border border-white/10 bg-[#102947] px-4 text-white outline-none focus:border-yellow-400"
            />
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setShowAddStage(false)} className="rounded-xl border border-white/10 px-6 py-3 font-bold text-white hover:bg-white/5">إلغاء</button>
              <button type="button" onClick={handleAddStage} className="rounded-xl bg-yellow-400 px-6 py-3 font-bold text-[#081B33] hover:bg-yellow-300">+ إضافة المرحلة</button>
            </div>
          </div>
        </div>
      )}

      {showStageCategoryManager && stageId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#081B33] p-7 shadow-2xl">
            <div className="mb-5 flex items-center justify-between"><div><h3 className="text-2xl font-bold text-white">ربط التصنيفات بالمرحلة</h3><p className="mt-1 text-sm text-gray-400">المرحلة: {stages.find((stage) => String(stage.id) === String(stageId))?.name || "-"}</p></div><button type="button" onClick={() => setShowStageCategoryManager(false)} className="text-2xl text-gray-400">✕</button></div>
            <div className="max-h-[50vh] space-y-2 overflow-y-auto">
              {categories.map((category) => { const checked = linkedCategoryIds.includes(Number(category.id)); return <label key={category.id} className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-[#102947] px-4 py-3 text-white"><span>{category.name}</span><input type="checkbox" checked={checked} onChange={() => { const next = checked ? linkedCategoryIds.filter((id) => id !== Number(category.id)) : [...linkedCategoryIds, Number(category.id)]; setStageCategoryMap((current) => ({ ...current, [String(stageId)]: next })); }} className="h-5 w-5 accent-yellow-400" /></label>; })}
            </div>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setShowStageCategoryManager(false)} className="rounded-xl border border-white/10 px-6 py-3 font-bold text-white">إغلاق</button><button type="button" onClick={() => saveStageCategoryLinks(stageCategoryMap[String(stageId)] ?? [])} className="rounded-xl bg-yellow-400 px-6 py-3 font-bold text-[#081B33]">حفظ الربط</button></div>
          </div>
        </div>
      )}

      {/* ================= إضافة تصنيف جديد ================= */}
      {showAddCategory && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#081B33] p-7 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white">
                إضافة تصنيف جديد
              </h3>

              <button
                type="button"
                onClick={() => {
                  setShowAddCategory(false);
                  setNewCategoryName("");
                }}
                className="text-2xl text-gray-400 transition hover:text-red-400"
              >
                ✕
              </button>
            </div>

            <label className="mb-2 block text-sm text-gray-300">
              اسم التصنيف
            </label>

            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddCategory();
                }
              }}
              autoFocus
              placeholder="أدخل اسم التصنيف"
              className="
                h-12 w-full
                rounded-xl
                border border-white/10
                bg-[#102947]
                px-4
                text-white
                outline-none
                placeholder:text-gray-500
                focus:border-yellow-400
              "
            />

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddCategory(false);
                  setNewCategoryName("");
                }}
                className="
                  rounded-xl
                  border border-white/10
                  px-6 py-3
                  font-bold
                  text-white
                  transition
                  hover:bg-white/5
                "
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleAddCategory}
                className="
                  rounded-xl
                  bg-yellow-400
                  px-6 py-3
                  font-bold
                  text-[#081B33]
                  transition
                  hover:bg-yellow-300
                "
              >
                + إضافة التصنيف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= إضافة بند جديد ================= */}
      {showAddItem && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#081B33] p-7 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white">
                  إضافة بند جديد
                </h3>

                <p className="mt-2 text-sm text-gray-400">
                  التصنيف:{" "}
                  {categories.find(
                    (category) =>
                      String(category.id) === String(categoryId)
                  )?.name || "-"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowAddItem(false);
                  setNewItemName("");
                }}
                className="text-2xl text-gray-400 transition hover:text-red-400"
              >
                ✕
              </button>
            </div>

            <label className="mb-2 block text-sm text-gray-300">
              اسم البند
            </label>

            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddItem();
                }
              }}
              autoFocus
              placeholder="أدخل اسم البند"
              className="
                h-12 w-full
                rounded-xl
                border border-white/10
                bg-[#102947]
                px-4
                text-white
                outline-none
                placeholder:text-gray-500
                focus:border-yellow-400
              "
            />

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddItem(false);
                  setNewItemName("");
                }}
                className="
                  rounded-xl
                  border border-white/10
                  px-6 py-3
                  font-bold
                  text-white
                  transition
                  hover:bg-white/5
                "
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleAddItem}
                className="
                  rounded-xl
                  bg-yellow-400
                  px-6 py-3
                  font-bold
                  text-[#081B33]
                  transition
                  hover:bg-yellow-300
                "
              >
                + إضافة البند
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="mt-8 flex justify-end gap-3">

        {/* إلغاء */}
        <button
          type="button"
          onClick={onClose}
          className="
            rounded-xl
            border border-white/10
            px-6 py-3
            font-bold
            text-white
            transition
            hover:bg-white/5
          "
        >
          إلغاء
        </button>

        {!isEditing && (
        <button
          type="button"
          onClick={() => handleSave(true)}
          className="
            rounded-xl
            border border-green-400/30
            bg-green-500/10
            px-6 py-3
            font-bold
            text-green-400
            transition
            hover:border-green-400
            hover:bg-green-500
            hover:text-white
          "
        >
          + حفظ وإضافة آخر
        </button>
        )}

        {/* حفظ المصروف */}
        <button
          type="button"
          onClick={() => handleSave(false)}
          className="
            rounded-xl
            bg-yellow-400
            px-8 py-3
            font-bold
            text-[#081B33]
            transition
            hover:bg-yellow-300
          "
        >
          {isEditing ? "حفظ التعديل" : "حفظ المصروف"}
        </button>

      </div>

    </div>
  </div>
);

}

type InputProps = {
  label: string;
  type?: string;
  value?: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
};

function Input({
  label,
  type = "text",
  value = "",
  readOnly = false,
  onChange,
}: InputProps) {
  return (
    <div>
      <label className="mb-2 block text-sm text-gray-300">
        {label}
      </label>

      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        className="
          h-12
          w-full
          rounded-xl
          border
          border-white/10
          bg-[#102947]
          px-4
          text-white
          outline-none
          focus:border-yellow-400
        "
      />
    </div>
  );
}

type SelectOption = {
  value: number | string;
  label: string;
};

type SelectProps = {
  label: string;
  value?: string;
  options?: SelectOption[];
  onChange?: (value: string) => void;
  disabled?: boolean;
};

function Select({
  label,
  value = "",
  options = [],
  onChange,
  disabled = false,
}: SelectProps) {
  return (
    <div>
      <label className="mb-2 block text-sm text-gray-300">
        {label}
      </label>

      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className="
          h-12
          w-full
          rounded-xl
          border
          border-white/10
          bg-[#102947]
          px-4
          text-white
          outline-none
          focus:border-yellow-400
        "
      >
        <option value="">
          اختر...
        </option>

        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}