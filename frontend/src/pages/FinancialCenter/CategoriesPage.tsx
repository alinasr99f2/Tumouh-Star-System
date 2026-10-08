import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  FolderTree,
  Layers3,
  RefreshCw,
  Plus,
  Tags,
  ListPlus,
  X,
} from "lucide-react";

type Stage = {
  id: number;
  name: string;
  active?: boolean;
};

type Category = {
  id: number;
  name: string;
  itemCount?: number;
};

type ExpenseItem = {
  id: number;
  name: string;
  categoryId?: number | null;
  stageId?: number | null;
};

const STAGES_KEY = "tumouh-expense-stages";
const CATEGORIES_KEY = "tumouh-expense-categories";
const ITEMS_KEY = "tumouh-expense-items";

const defaultStages: Stage[] = [
  { id: 1, name: "تمهيدي", active: true },
  { id: 2, name: "إنشائي", active: true },
  { id: 3, name: "تشطيبي", active: true },
  { id: 4, name: "ديكورات", active: true },
];

const defaultCategories: Category[] = [
  { id: 1, name: "مواد كهربائية" },
  { id: 2, name: "مواد سباكة" },
  { id: 3, name: "حديد" },
  { id: 4, name: "أسمنت" },
  { id: 5, name: "خرسانة" },
  { id: 6, name: "أثاث" },
  { id: 7, name: "أجهزة كهربائية" },
  { id: 8, name: "وقود" },
  { id: 9, name: "صيانة سيارات" },
  { id: 10, name: "رواتب" },
  { id: 11, name: "إيجارات" },
  { id: 12, name: "ضيافة" },
  { id: 13, name: "أدوات كهربائية" },
  { id: 14, name: "ديكور داخلي" },
  { id: 15, name: "ديكور داخلي" },
];

const defaultItems: ExpenseItem[] = [
  {
    id: 1,
    name: "أسلاك كهرباء",
    categoryId: 1,
    stageId: 1,
  },
  {
    id: 2,
    name: "ألوان",
    categoryId: 2,
    stageId: 4,
  },
];

function readStorage<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);

    if (!saved) {
      return fallback;
    }

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed) ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // تجاهل خطأ التخزين
  }
}

function notifyFinancialDataUpdated() {
  window.dispatchEvent(new Event("tumouh-financial-data-updated"));
}

export default function CategoriesPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);

  const [loading, setLoading] = useState(true);

  const [openStageModal, setOpenStageModal] = useState(false);
  const [openCategoryModal, setOpenCategoryModal] = useState(false);
  const [openItemModal, setOpenItemModal] = useState(false);

  const [stageName, setStageName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [itemName, setItemName] = useState("");

  const [selectedCategoryId, setSelectedCategoryId] =
    useState<number | null>(null);

  const [selectedStageId, setSelectedStageId] =
    useState<number | null>(null);

  const loadData = () => {
    setLoading(true);

    const savedStages = readStorage<Stage[]>(
      STAGES_KEY,
      defaultStages
    );

    const savedCategories = readStorage<Category[]>(
      CATEGORIES_KEY,
      defaultCategories
    );

    const savedItems = readStorage<ExpenseItem[]>(
      ITEMS_KEY,
      defaultItems
    );

    setStages(savedStages);
    setCategories(savedCategories);
    setExpenseItems(savedItems);

    setTimeout(() => {
      setLoading(false);
    }, 150);
  };

  useEffect(() => {
    loadData();
  }, []);

  const categoriesWithCount = useMemo(() => {
    return categories.map((category) => ({
      ...category,
      itemCount: expenseItems.filter(
        (item) => item.categoryId === category.id
      ).length,
    }));
  }, [categories, expenseItems]);

  const stagesWithCount = useMemo(() => {
    return stages.map((stage) => ({
      ...stage,
      itemCount: expenseItems.filter(
        (item) => item.stageId === stage.id
      ).length,
    }));
  }, [stages, expenseItems]);

  const addStage = () => {
    const name = stageName.trim();

    if (!name) {
      return;
    }

    const newStage: Stage = {
      id: Date.now(),
      name,
      active: true,
    };

    const updated = [...stages, newStage];

    setStages(updated);
    saveStorage(STAGES_KEY, updated);
    notifyFinancialDataUpdated();

    setStageName("");
    setOpenStageModal(false);
  };

  const addCategory = () => {
    const name = categoryName.trim();

    if (!name) {
      return;
    }

    const newCategory: Category = {
      id: Date.now(),
      name,
    };

    const updated = [...categories, newCategory];

    setCategories(updated);
    saveStorage(CATEGORIES_KEY, updated);
    notifyFinancialDataUpdated();

    setCategoryName("");
    setOpenCategoryModal(false);
  };

  const addItem = () => {
    const name = itemName.trim();

    if (!name) {
      return;
    }

    const newItem: ExpenseItem = {
      id: Date.now(),
      name,
      categoryId: selectedCategoryId,
      stageId: selectedStageId,
    };

    const updated = [...expenseItems, newItem];

    setExpenseItems(updated);
    saveStorage(ITEMS_KEY, updated);
    notifyFinancialDataUpdated();

    setItemName("");
    setSelectedCategoryId(null);
    setSelectedStageId(null);
    setOpenItemModal(false);
  };

  const getCategoryName = (categoryId?: number | null) => {
    const category = categories.find(
      (item) => item.id === categoryId
    );

    return category?.name || "-";
  };

  const getStageName = (stageId?: number | null) => {
    const stage = stages.find(
      (item) => item.id === stageId
    );

    return stage?.name || "-";
  };

  return (
    <div
      dir="rtl"
      className="space-y-6 text-white"
    >

      {/* ================= Header ================= */}

      <div className="text-right">

        <h2 className="text-3xl font-bold text-white">
          البنود
        </h2>

        <p className="mt-2 text-sm text-gray-400">
          إدارة بنود المصروفات والتصنيفات والمراحل.
        </p>

      </div>

      {/* ================= Main Summary Card ================= */}

      <div className="rounded-3xl border border-white/10 bg-[#102947] p-4 sm:p-6">

        {/* عنوان الكارت */}

        <div className="flex flex-col items-center justify-center text-center">

          <div
            className="
              flex h-16 w-16
              items-center justify-center
              rounded-2xl
              border border-yellow-400/30
              bg-yellow-400/10
              text-yellow-400
            "
          >
            <ClipboardList size={32} />
          </div>

          <h3 className="mt-3 text-2xl font-bold text-white">
            البنود المالية
          </h3>

          <p className="mt-1 text-sm text-gray-400">
            إدارة وتصنيف بنود المصروفات والمراحل.
          </p>

        </div>

        {/* ================= 3 Statistics ================= */}

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">

          {/* إجمالي البنود */}

          <div
            className="
              rounded-2xl
              border border-yellow-400/20
              bg-yellow-400/10
              p-5
            "
          >

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-gray-400">
                  إجمالي البنود
                </p>

                <p className="mt-2 text-3xl font-bold text-yellow-400">
                  {expenseItems.length}
                </p>

              </div>

              <div
                className="
                  flex h-12 w-12
                  items-center justify-center
                  rounded-xl
                  border border-yellow-400/20
                  bg-yellow-400/10
                "
              >
                <ClipboardList
                  size={25}
                  className="text-yellow-400"
                />
              </div>

            </div>

          </div>

          {/* إجمالي التصنيفات */}

          <div
            className="
              rounded-2xl
              border border-sky-400/20
              bg-sky-400/10
              p-5
            "
          >

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-gray-400">
                  إجمالي التصنيفات
                </p>

                <p className="mt-2 text-3xl font-bold text-sky-400">
                  {categories.length}
                </p>

              </div>

              <div
                className="
                  flex h-12 w-12
                  items-center justify-center
                  rounded-xl
                  border border-sky-400/20
                  bg-sky-400/10
                "
              >
                <Tags
                  size={25}
                  className="text-sky-400"
                />
              </div>

            </div>

          </div>

          {/* إجمالي المراحل */}

          <div
            className="
              rounded-2xl
              border border-emerald-400/20
              bg-emerald-400/10
              p-5
            "
          >

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-gray-400">
                  إجمالي المراحل
                </p>

                <p className="mt-2 text-3xl font-bold text-emerald-400">
                  {stages.length}
                </p>

              </div>

              <div
                className="
                  flex h-12 w-12
                  items-center justify-center
                  rounded-xl
                  border border-emerald-400/20
                  bg-emerald-400/10
                "
              >
                <Layers3
                  size={25}
                  className="text-emerald-400"
                />
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* ================= Refresh ================= */}

      <div className="flex justify-start">

        <button
          type="button"
          onClick={loadData}
          className="
            flex h-11 w-11
            items-center justify-center
            rounded-xl
            border border-white/10
            bg-[#102947]
            text-gray-300
            transition
            hover:border-sky-400/40
            hover:bg-sky-400/10
            hover:text-sky-400
          "
          title="تحديث"
        >
          <RefreshCw
            size={20}
            className={loading ? "animate-spin" : ""}
          />
        </button>

      </div>

      {/* ================= Add Cards ================= */}

      <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-3">

        {/* إضافة بند */}

        <button
          type="button"
          onClick={() => setOpenItemModal(true)}
          className="
            group
            rounded-3xl
            border border-emerald-400/20
            bg-[#102947]
            p-4 sm:p-6
            text-right
            transition
            hover:-translate-y-1
            hover:border-emerald-400/50
            hover:bg-emerald-400/10
          "
        >

          <div className="flex items-center justify-between">

            <div
              className="
                flex h-14 w-14
                items-center justify-center
                rounded-2xl
                border border-emerald-400/30
                bg-emerald-400/10
                text-emerald-400
              "
            >
              <ListPlus size={28} />
            </div>

            <Plus
              size={24}
              className="text-emerald-400"
            />

          </div>

          <h3 className="mt-5 text-2xl font-bold">
            إضافة بند
          </h3>

          <p className="mt-2 text-sm text-gray-400">
            إضافة بند جديد وربطه بالتصنيف والمرحلة المناسبة.
          </p>

          <p className="mt-4 text-sm font-bold text-emerald-400">
            {expenseItems.length} بند مسجل
          </p>

        </button>

        {/* إضافة تصنيف */}

        <button
          type="button"
          onClick={() => setOpenCategoryModal(true)}
          className="
            group
            rounded-3xl
            border border-sky-400/20
            bg-[#102947]
            p-4 sm:p-6
            text-right
            transition
            hover:-translate-y-1
            hover:border-sky-400/50
            hover:bg-sky-400/10
          "
        >

          <div className="flex items-center justify-between">

            <div
              className="
                flex h-14 w-14
                items-center justify-center
                rounded-2xl
                border border-sky-400/30
                bg-sky-400/10
                text-sky-400
              "
            >
              <Tags size={28} />
            </div>

            <Plus
              size={24}
              className="text-sky-400"
            />

          </div>

          <h3 className="mt-5 text-2xl font-bold">
            إضافة تصنيف
          </h3>

          <p className="mt-2 text-sm text-gray-400">
            إضافة تصنيف جديد للمصروفات والبنود.
          </p>

          <p className="mt-4 text-sm font-bold text-sky-400">
            {categories.length} تصنيف مسجل
          </p>

        </button>

        {/* إضافة مرحلة */}

        <button
          type="button"
          onClick={() => setOpenStageModal(true)}
          className="
            group
            rounded-3xl
            border border-yellow-400/20
            bg-[#102947]
            p-4 sm:p-6
            text-right
            transition
            hover:-translate-y-1
            hover:border-yellow-400/50
            hover:bg-yellow-400/10
          "
        >

          <div className="flex items-center justify-between">

            <div
              className="
                flex h-14 w-14
                items-center justify-center
                rounded-2xl
                border border-yellow-400/30
                bg-yellow-400/10
                text-yellow-400
              "
            >
              <Layers3 size={28} />
            </div>

            <Plus
              size={24}
              className="text-yellow-400"
            />

          </div>

          <h3 className="mt-5 text-2xl font-bold">
            إضافة مرحلة
          </h3>

          <p className="mt-2 text-sm text-gray-400">
            إضافة مرحلة جديدة لاستخدامها مع المصروفات.
          </p>

          <p className="mt-4 text-sm font-bold text-yellow-400">
            {stages.length} مراحل مسجلة
          </p>

        </button>

      </div>

      {/* ================= Tables ================= */}

      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-3">

        {/* ================= Items ================= */}

        <div
          className="
            overflow-hidden
            rounded-3xl
            border border-white/10
            bg-[#081B33]
          "
        >

          <div
            className="
              flex items-center justify-between
              border-b border-white/10
              bg-yellow-400/10
              px-5 py-4
            "
          >

            <div className="flex items-center gap-3">

              <ClipboardList
                size={22}
                className="text-yellow-400"
              />

              <div>

                <h3 className="font-bold text-white">
                  البنود
                </h3>

                <p className="text-xs text-gray-400">
                  {expenseItems.length} بند
                </p>

              </div>

            </div>

            <span className="text-xl font-bold text-yellow-400">
              {expenseItems.length}
            </span>

          </div>

          <div className="max-h-[430px] overflow-x-auto overflow-y-auto">

            <table className="min-w-[420px] w-full text-sm">

              <thead className="sticky top-0 bg-[#102947]">

                <tr>

                  <th className="px-4 py-3 text-right text-gray-400">
                    #
                  </th>

                  <th className="px-4 py-3 text-right text-gray-400">
                    البند
                  </th>

                  <th className="px-4 py-3 text-right text-gray-400">
                    التصنيف
                  </th>

                </tr>

              </thead>

              <tbody>

                {expenseItems.length === 0 ? (

                  <tr>

                    <td
                      colSpan={3}
                      className="py-12 text-center text-gray-500"
                    >
                      لا توجد بنود
                    </td>

                  </tr>

                ) : (

                  expenseItems.map((item, index) => (

                    <tr
                      key={item.id}
                      className="
                        border-t border-white/5
                        hover:bg-white/5
                      "
                    >

                      <td className="px-4 py-3 text-gray-500">
                        {index + 1}
                      </td>

                      <td className="px-4 py-3 font-bold text-white">
                        {item.name}
                      </td>

                      <td className="px-4 py-3 text-gray-400">
                        {getCategoryName(item.categoryId)}
                      </td>

                    </tr>

                  ))

                )}

              </tbody>

            </table>

          </div>

        </div>

        {/* ================= Categories ================= */}

        <div
          className="
            overflow-hidden
            rounded-3xl
            border border-white/10
            bg-[#081B33]
          "
        >

          <div
            className="
              flex items-center justify-between
              border-b border-white/10
              bg-sky-400/10
              px-5 py-4
            "
          >

            <div className="flex items-center gap-3">

              <Tags
                size={22}
                className="text-sky-400"
              />

              <div>

                <h3 className="font-bold text-white">
                  التصنيفات
                </h3>

                <p className="text-xs text-gray-400">
                  {categories.length} تصنيف
                </p>

              </div>

            </div>

            <span className="text-xl font-bold text-sky-400">
              {categories.length}
            </span>

          </div>

          <div className="max-h-[430px] overflow-x-auto overflow-y-auto">

            <table className="min-w-[420px] w-full text-sm">

              <thead className="sticky top-0 bg-[#102947]">

                <tr>

                  <th className="px-4 py-3 text-right text-gray-400">
                    #
                  </th>

                  <th className="px-4 py-3 text-right text-gray-400">
                    التصنيف
                  </th>

                  <th className="px-4 py-3 text-center text-gray-400">
                    عدد البنود
                  </th>

                </tr>

              </thead>

              <tbody>

                {categoriesWithCount.length === 0 ? (

                  <tr>

                    <td
                      colSpan={3}
                      className="py-12 text-center text-gray-500"
                    >
                      لا توجد تصنيفات
                    </td>

                  </tr>

                ) : (

                  categoriesWithCount.map((category, index) => (

                    <tr
                      key={category.id}
                      className="
                        border-t border-white/5
                        hover:bg-white/5
                      "
                    >

                      <td className="px-4 py-3 text-gray-500">
                        {index + 1}
                      </td>

                      <td className="px-4 py-3 font-bold text-white">
                        {category.name}
                      </td>

                      <td className="px-4 py-3 text-center">

                        <span
                          className="
                            inline-flex
                            min-w-8
                            justify-center
                            rounded-lg
                            bg-sky-400/10
                            px-2 py-1
                            font-bold
                            text-sky-400
                          "
                        >
                          {category.itemCount}
                        </span>

                      </td>

                    </tr>

                  ))

                )}

              </tbody>

            </table>

          </div>

        </div>

        {/* ================= Stages ================= */}

        <div
          className="
            overflow-hidden
            rounded-3xl
            border border-white/10
            bg-[#081B33]
          "
        >

          <div
            className="
              flex items-center justify-between
              border-b border-white/10
              bg-emerald-400/10
              px-5 py-4
            "
          >

            <div className="flex items-center gap-3">

              <Layers3
                size={22}
                className="text-emerald-400"
              />

              <div>

                <h3 className="font-bold text-white">
                  المراحل
                </h3>

                <p className="text-xs text-gray-400">
                  {stages.length} مراحل
                </p>

              </div>

            </div>

            <span className="text-xl font-bold text-emerald-400">
              {stages.length}
            </span>

          </div>

          <div className="max-h-[430px] overflow-x-auto overflow-y-auto">

            <table className="min-w-[420px] w-full text-sm">

              <thead className="sticky top-0 bg-[#102947]">

                <tr>

                  <th className="px-4 py-3 text-right text-gray-400">
                    #
                  </th>

                  <th className="px-4 py-3 text-right text-gray-400">
                    المرحلة
                  </th>

                  <th className="px-4 py-3 text-center text-gray-400">
                    الحالة
                  </th>

                </tr>

              </thead>

              <tbody>

                {stagesWithCount.length === 0 ? (

                  <tr>

                    <td
                      colSpan={3}
                      className="py-12 text-center text-gray-500"
                    >
                      لا توجد مراحل
                    </td>

                  </tr>

                ) : (

                  stagesWithCount.map((stage, index) => (

                    <tr
                      key={stage.id}
                      className="
                        border-t border-white/5
                        hover:bg-white/5
                      "
                    >

                      <td className="px-4 py-3 text-gray-500">
                        {index + 1}
                      </td>

                      <td className="px-4 py-3 font-bold text-white">
                        {stage.name}
                      </td>

                      <td className="px-4 py-3 text-center">

                        <span
                          className="
                            inline-flex
                            rounded-lg
                            bg-emerald-400/10
                            px-3 py-1
                            font-bold
                            text-emerald-400
                          "
                        >
                          نشط
                        </span>

                      </td>

                    </tr>

                  ))

                )}

              </tbody>

            </table>

          </div>

        </div>

      </div>

      {/* ================= Add Stage Modal ================= */}

      {openStageModal && (

        <div
          className="
            fixed inset-0 z-50
            flex items-center justify-center
            bg-black/70
            p-4
            backdrop-blur-sm
          "
        >

          <div
            className="
              w-full max-w-md
              rounded-3xl
              border border-yellow-400/20
              bg-[#081B33]
              p-4 sm:p-6
              shadow-2xl
            "
          >

            <div className="flex items-center justify-between">

              <h3 className="text-xl font-bold">
                إضافة مرحلة
              </h3>

              <button
                type="button"
                onClick={() => setOpenStageModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={22} />
              </button>

            </div>

            <input
              value={stageName}
              onChange={(event) =>
                setStageName(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  addStage();
                }
              }}
              placeholder="اسم المرحلة"
              className="
                mt-6
                w-full
                rounded-xl
                border border-white/10
                bg-[#102947]
                px-4 py-3
                text-white
                outline-none
                focus:border-yellow-400/50
              "
              autoFocus
            />

            <button
              type="button"
              onClick={addStage}
              className="
                mt-4
                w-full
                rounded-xl
                bg-yellow-400
                px-4 py-3
                font-bold
                text-[#081B33]
                transition
                hover:bg-yellow-300
              "
            >
              إضافة المرحلة
            </button>

          </div>

        </div>

      )}

      {/* ================= Add Category Modal ================= */}

      {openCategoryModal && (

        <div
          className="
            fixed inset-0 z-50
            flex items-center justify-center
            bg-black/70
            p-4
            backdrop-blur-sm
          "
        >

          <div
            className="
              w-full max-w-md
              rounded-3xl
              border border-sky-400/20
              bg-[#081B33]
              p-4 sm:p-6
              shadow-2xl
            "
          >

            <div className="flex items-center justify-between">

              <h3 className="text-xl font-bold">
                إضافة تصنيف
              </h3>

              <button
                type="button"
                onClick={() => setOpenCategoryModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={22} />
              </button>

            </div>

            <input
              value={categoryName}
              onChange={(event) =>
                setCategoryName(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  addCategory();
                }
              }}
              placeholder="اسم التصنيف"
              className="
                mt-6
                w-full
                rounded-xl
                border border-white/10
                bg-[#102947]
                px-4 py-3
                text-white
                outline-none
                focus:border-sky-400/50
              "
              autoFocus
            />

            <button
              type="button"
              onClick={addCategory}
              className="
                mt-4
                w-full
                rounded-xl
                bg-sky-400
                px-4 py-3
                font-bold
                text-[#081B33]
                transition
                hover:bg-sky-300
              "
            >
              إضافة التصنيف
            </button>

          </div>

        </div>

      )}

      {/* ================= Add Item Modal ================= */}

      {openItemModal && (

        <div
          className="
            fixed inset-0 z-50
            flex items-center justify-center
            bg-black/70
            p-4
            backdrop-blur-sm
          "
        >

          <div
            className="
              w-full max-w-md
              rounded-3xl
              border border-emerald-400/20
              bg-[#081B33]
              p-4 sm:p-6
              shadow-2xl
            "
          >

            <div className="flex items-center justify-between">

              <h3 className="text-xl font-bold">
                إضافة بند
              </h3>

              <button
                type="button"
                onClick={() => setOpenItemModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={22} />
              </button>

            </div>

            <input
              value={itemName}
              onChange={(event) =>
                setItemName(event.target.value)
              }
              placeholder="اسم البند"
              className="
                mt-6
                w-full
                rounded-xl
                border border-white/10
                bg-[#102947]
                px-4 py-3
                text-white
                outline-none
                focus:border-emerald-400/50
              "
              autoFocus
            />

            <select
              value={selectedCategoryId ?? ""}
              onChange={(event) =>
                setSelectedCategoryId(
                  event.target.value
                    ? Number(event.target.value)
                    : null
                )
              }
              className="
                mt-4
                w-full
                rounded-xl
                border border-white/10
                bg-[#102947]
                px-4 py-3
                text-white
                outline-none
              "
            >

              <option value="">
                اختر التصنيف
              </option>

              {categories.map((category) => (

                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.name}
                </option>

              ))}

            </select>

            <select
              value={selectedStageId ?? ""}
              onChange={(event) =>
                setSelectedStageId(
                  event.target.value
                    ? Number(event.target.value)
                    : null
                )
              }
              className="
                mt-4
                w-full
                rounded-xl
                border border-white/10
                bg-[#102947]
                px-4 py-3
                text-white
                outline-none
              "
            >

              <option value="">
                اختر المرحلة
              </option>

              {stages.map((stage) => (

                <option
                  key={stage.id}
                  value={stage.id}
                >
                  {stage.name}
                </option>

              ))}

            </select>

            <button
              type="button"
              onClick={addItem}
              className="
                mt-4
                w-full
                rounded-xl
                bg-emerald-400
                px-4 py-3
                font-bold
                text-[#081B33]
                transition
                hover:bg-emerald-300
              "
            >
              إضافة البند
            </button>

          </div>

        </div>

      )}

    </div>
  );
}
