import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  Boxes,
  Building2,
  Calculator,
  WalletCards,
} from "lucide-react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { projects } from "../../data/projects";
import { supabase } from "../../utils/supabase";

type MaterialKey = "حديد" | "خرسانة" | "بلوك";

type ExpenseRow = {
  id: number;
  total?: number | string | null;
  amount?: number | string | null;
  amount_before_tax?: number | string | null;
  date?: string | null;
  category_id?: number | string | null;
  stage_id?: number | string | null;
};

type QuantityPlan = {
  material: MaterialKey;
  expected_quantity: number | string;
  unit: string;
};

type QuantityUsage = {
  id?: string | number;
  project_id?: number;
  material: MaterialKey;
  quantity: number | string;
  usage_date: string;
  notes?: string | null;
};

const MATERIALS: MaterialKey[] = [
  "حديد",
  "خرسانة",
  "بلوك",
];

const QUANTITIES_STORAGE_KEY = (projectId: number) =>
  `tumouh_star_project_quantities_${projectId}`;

const formatNumber = (
  value: number,
  maximumFractionDigits = 0
) =>
  Number(value || 0).toLocaleString("ar-SA", {
    maximumFractionDigits,
  });

const getExpenseTotal = (expense: ExpenseRow) => {
  const total = Number(expense.total ?? NaN);

  if (Number.isFinite(total)) {
    return total;
  }

  return (
    Number(
      expense.amount_before_tax ??
        expense.amount ??
        0
    ) || 0
  );
};

const formatMonth = (dateValue: string) => {
  if (!dateValue) return "غير محدد";

  const cleanDate = dateValue.slice(0, 10);
  const date = new Date(`${cleanDate}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return cleanDate.slice(0, 7);
  }

  return date.toLocaleDateString("ar-SA", {
    month: "short",
    year: "numeric",
  });
};

const safeReadQuantities = (projectId: number) => {
  try {
    const stored = localStorage.getItem(
      QUANTITIES_STORAGE_KEY(projectId)
    );

    if (!stored) {
      return {
        plans: [] as QuantityPlan[],
        usage: [] as QuantityUsage[],
      };
    }

    const parsed = JSON.parse(stored);

    return {
      plans: Array.isArray(parsed?.plans)
        ? (parsed.plans as QuantityPlan[])
        : [],
      usage: Array.isArray(parsed?.usage)
        ? (parsed.usage as QuantityUsage[])
        : [],
    };
  } catch {
    return {
      plans: [] as QuantityPlan[],
      usage: [] as QuantityUsage[],
    };
  }
};

export default function ProjectCharts() {
  const { id } = useParams();
  const navigate = useNavigate();

  const projectId = Number(id);

  const project = projects.find(
    (item) => item.id === projectId
  );

  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [plans, setPlans] = useState<QuantityPlan[]>([]);
  const [usage, setUsage] = useState<QuantityUsage[]>([]);
  const [villas, setVillas] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  const [dataWarnings, setDataWarnings] = useState<string[]>(
    []
  );

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      if (!projectId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setDataWarnings([]);

      /*
       * نقرأ بيانات الكميات محليًا أولًا.
       * ده مهم لأن جداول الكميات ممكن يكون عليها RLS
       * أو تكون قاعدة البيانات غير جاهزة بالكامل.
       */
      const localQuantities =
        safeReadQuantities(projectId);

      if (localQuantities.plans.length > 0) {
        setPlans(localQuantities.plans);
      }

      if (localQuantities.usage.length > 0) {
        setUsage(localQuantities.usage);
      }

      try {
        /*
         * مهم جدًا:
         * جدول expenses عندنا يستخدم "date"
         * وليس "expense_date".
         */
        const [
          expensesResult,
          categoriesResult,
          stagesResult,
          plansResult,
          usageResult,
          villasResult,
        ] = await Promise.all([
          supabase
            .from("expenses")
            .select(
              "id, total, amount, amount_before_tax, date, category_id, stage_id"
            )
            .eq("project_id", projectId)
            .order("date", {
              ascending: true,
            }),

          supabase
            .from("categories")
            .select(
              "id, name, stage_id"
            ),

          supabase
            .from("expense_stages")
            .select(
              "id, name"
            ),

          supabase
            .from("project_material_plans")
            .select(
              "material, expected_quantity, unit"
            )
            .eq("project_id", projectId),

          supabase
            .from("project_material_usage")
            .select(
              "id, project_id, material, quantity, usage_date, notes"
            )
            .eq("project_id", projectId)
            .order("usage_date", {
              ascending: true,
            }),

          supabase
            .from("project_villas")
            .select(
              "id, villa_number, classification"
            )
            .eq("project_id", projectId)
            .order("villa_number", {
              ascending: true,
            }),
        ]);

        if (!active) return;

        const warnings: string[] = [];

        /*
         * المصاريف:
         * لو نجح الاستعلام نستخدم بيانات قاعدة البيانات.
         * لو فشل لا نوقف الصفحة كلها.
         */
        if (expensesResult.error) {
          console.error(
            "تعذر تحميل المصاريف:",
            expensesResult.error
          );

          warnings.push(
            "تعذر تحميل بعض بيانات المصاريف."
          );
        } else {
          setExpenses(
            (expensesResult.data ?? []) as ExpenseRow[]
          );
        }

        /*
         * التصنيفات
         */
        if (categoriesResult.error) {
          console.error(
            "تعذر تحميل التصنيفات:",
            categoriesResult.error
          );

          warnings.push(
            "تعذر تحميل التصنيفات."
          );
        } else {
          setCategories(
            categoriesResult.data ?? []
          );
        }

        /*
         * المراحل
         */
        if (stagesResult.error) {
          console.error(
            "تعذر تحميل المراحل:",
            stagesResult.error
          );

          warnings.push(
            "تعذر تحميل المراحل."
          );
        } else {
          setStages(
            stagesResult.data ?? []
          );
        }

        /*
         * خطة الكميات المتوقعة
         *
         * لو قاعدة البيانات رفضت القراءة 403
         * نستخدم البيانات المحلية بدل ما الصفحة تقع.
         */
        if (plansResult.error) {
          console.error(
            "تعذر تحميل خطة الكميات:",
            plansResult.error
          );

          if (localQuantities.plans.length === 0) {
            setPlans([]);
          }

          warnings.push(
            "خطة الكميات المتوقعة غير متاحة من قاعدة البيانات حاليًا."
          );
        } else {
          setPlans(
            (plansResult.data ?? []) as QuantityPlan[]
          );
        }

        /*
         * الاستخدام الفعلي للكميات
         */
        if (usageResult.error) {
          console.error(
            "تعذر تحميل استخدام الكميات:",
            usageResult.error
          );

          if (localQuantities.usage.length === 0) {
            setUsage([]);
          }

          warnings.push(
            "بيانات استخدام الكميات غير متاحة من قاعدة البيانات حاليًا."
          );
        } else {
          setUsage(
            (usageResult.data ?? []) as QuantityUsage[]
          );
        }

        /*
         * الفلل
         */
        if (villasResult.error) {
          console.error(
            "تعذر تحميل بيانات الفلل:",
            villasResult.error
          );

          setVillas([]);

          warnings.push(
            "تعذر تحميل بيانات الفلل."
          );
        } else {
          setVillas(
            villasResult.data ?? []
          );
        }

        if (active) {
          setDataWarnings(
            Array.from(new Set(warnings))
          );
        }
      } catch (loadError: any) {
        console.error(
          "تعذر تحميل بيانات الرسوم البيانية:",
          loadError
        );

        /*
         * حتى لو حدث خطأ غير متوقع،
         * لا نحول الصفحة كلها إلى Error Screen.
         *
         * نستخدم بيانات localStorage إن وجدت.
         */
        if (
          localQuantities.plans.length > 0
        ) {
          setPlans(
            localQuantities.plans
          );
        }

        if (
          localQuantities.usage.length > 0
        ) {
          setUsage(
            localQuantities.usage
          );
        }

        if (active) {
          setDataWarnings([
            "تعذر تحميل بعض بيانات الرسوم البيانية، وتم عرض البيانات المتاحة.",
          ]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [projectId]);

  const categoryMap = useMemo(
    () =>
      new Map(
        categories.map((item) => [
          Number(item.id),
          String(
            item.name ?? "غير مصنف"
          ),
        ])
      ),
    [categories]
  );

  const stageMap = useMemo(
    () =>
      new Map(
        stages.map((item) => [
          Number(item.id),
          String(
            item.name ?? "غير محدد"
          ),
        ])
      ),
    [stages]
  );

  const totalExpenses = useMemo(
    () =>
      expenses.reduce(
        (sum, expense) =>
          sum + getExpenseTotal(expense),
        0
      ),
    [expenses]
  );

  const expenseByCategory = useMemo(() => {
    const totals = new Map<
      string,
      number
    >();

    expenses.forEach((expense) => {
      const name =
        categoryMap.get(
          Number(expense.category_id)
        ) ?? "غير مصنف";

      totals.set(
        name,
        (totals.get(name) ?? 0) +
          getExpenseTotal(expense)
      );
    });

    return Array.from(
      totals.entries()
    )
      .map(
        ([category, total]) => ({
          category,
          total,
        })
      )
      .sort(
        (a, b) =>
          b.total - a.total
      );
  }, [
    expenses,
    categoryMap,
  ]);

  const expenseByStage = useMemo(() => {
    const totals = new Map<
      string,
      number
    >();

    expenses.forEach((expense) => {
      const category =
        categories.find(
          (item) =>
            Number(item.id) ===
            Number(
              expense.category_id
            )
        );

      const stageId =
        expense.stage_id ??
        category?.stage_id;

      const name =
        stageMap.get(
          Number(stageId)
        ) ?? "غير محدد";

      totals.set(
        name,
        (totals.get(name) ?? 0) +
          getExpenseTotal(expense)
      );
    });

    return Array.from(
      totals.entries()
    )
      .map(
        ([name, value]) => ({
          name,
          value,
        })
      )
      .filter(
        (item) => item.value > 0
      )
      .sort(
        (a, b) =>
          b.value - a.value
      );
  }, [
    expenses,
    categories,
    stageMap,
  ]);

  const expenseTimeline = useMemo(() => {
    const totals = new Map<
      string,
      number
    >();

    expenses.forEach((expense) => {
      /*
       * جدول expenses يستخدم date.
       */
      const date =
        expense.date ?? "";

      const key =
        date.slice(0, 7) ||
        "غير محدد";

      totals.set(
        key,
        (totals.get(key) ?? 0) +
          getExpenseTotal(expense)
      );
    });

    return Array.from(
      totals.entries()
    )
      .sort(
        ([a], [b]) =>
          a.localeCompare(b)
      )
      .map(
        ([month, total]) => ({
          month:
            formatMonth(month),
          total,
        })
      );
  }, [expenses]);

  const quantityComparison =
    useMemo(() => {
      return MATERIALS.map(
        (material) => {
          const plan =
            plans.find(
              (item) =>
                item.material ===
                material
            );

          const expected =
            Number(
              plan?.expected_quantity ??
                0
            );

          const used =
            usage
              .filter(
                (row) =>
                  row.material ===
                  material
              )
              .reduce(
                (
                  sum,
                  row
                ) =>
                  sum +
                  Number(
                    row.quantity ||
                      0
                  ),
                0
              );

          return {
            material,
            expected,
            used,
            remaining: Math.max(
              expected - used,
              0
            ),
            percentage:
              expected > 0
                ? (used /
                    expected) *
                  100
                : 0,
            unit:
              plan?.unit ?? "",
          };
        }
      );
    }, [
      plans,
      usage,
    ]);

  const villaDistribution =
    useMemo(() => {
      const totals = new Map<
        string,
        number
      >();

      villas.forEach((villa) => {
        const name = String(
          villa.classification ??
            "غير محدد"
        );

        totals.set(
          name,
          (totals.get(name) ?? 0) +
            1
        );
      });

      return Array.from(
        totals.entries()
      ).map(
        ([name, value]) => ({
          name,
          value,
        })
      );
    }, [villas]);

  const tooltipStyle = {
    background:
      "#0B223A",
    border:
      "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    color: "#fff",
  };

  if (!project) {
    return (
      <div
        dir="rtl"
        className="min-h-full p-6 text-center text-white"
      >
        المشروع غير موجود.
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-full space-y-6 bg-[#06182B] p-5 text-white md:p-7"
    >
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-l from-[#102947] via-[#0D2742] to-[#081B33] p-6 shadow-2xl">
        <div className="absolute left-5 top-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-300/20 bg-blue-400/10 text-blue-300">
          <BarChart3 size={34} />
        </div>

        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-300/20 bg-blue-400/10 text-blue-300">
            <BarChart3 size={34} />
          </div>

          <div>
            <div className="mb-2 inline-flex rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1 text-[11px] font-bold tracking-wide text-blue-200">
              PROJECT ANALYTICS
            </div>

            <h1 className="text-3xl font-black md:text-4xl">
              الرسوم البيانية
            </h1>

            <p className="mt-2 text-base font-bold text-gray-200">
              {project.name}
            </p>

            <p className="mt-2 text-sm text-gray-400">
              لوحة تحليلية توضح المصاريف،
              حركة الإنفاق، الكميات
              المتوقعة والمستخدمة،
              ومراحل التنفيذ وتوزيع الفلل
              داخل المشروع.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate(
              `/projects/${projectId}`
            )
          }
          className="absolute right-5 top-5 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-extrabold text-gray-200 transition hover:bg-white/10"
        >
          <ArrowLeft size={17} />
          العودة للمشروع
        </button>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-rose-400/20 bg-gradient-to-br from-[#4C2B3B] to-[#211A2C] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-300">
                إجمالي المصاريف
              </p>

              <p className="mt-2 text-2xl font-black text-rose-200">
                {formatNumber(
                  totalExpenses
                )}{" "}
                ريال
              </p>

              <p className="mt-1 text-xs text-gray-400">
                إجمالي المصروفات المسجلة
              </p>
            </div>

            <WalletCards
              size={36}
              className="text-rose-200"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-[#234044] to-[#182632] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-300">
                سجلات استخدام الكميات
              </p>

              <p className="mt-2 text-2xl font-black text-cyan-200">
                {formatNumber(
                  usage.length
                )}
              </p>

              <p className="mt-1 text-xs text-gray-400">
                سجل استخدام مسجل
              </p>
            </div>

            <Boxes
              size={36}
              className="text-cyan-200"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-blue-400/20 bg-gradient-to-br from-[#293B5A] to-[#1A2439] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-300">
                عدد الفلل
              </p>

              <p className="mt-2 text-2xl font-black text-blue-200">
                {formatNumber(
                  villas.length
                )}
              </p>

              <p className="mt-1 text-xs text-gray-400">
                حسب بيانات المشروع
              </p>
            </div>

            <Building2
              size={36}
              className="text-blue-200"
            />
          </div>
        </div>
      </section>

      {dataWarnings.length > 0 && (
        <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/5 px-5 py-4">
          <div className="flex flex-col gap-2 text-right">
            <p className="text-sm font-extrabold text-yellow-300">
              تنبيه بيانات
            </p>

            {dataWarnings.map(
              (warning, index) => (
                <p
                  key={`${warning}-${index}`}
                  className="text-xs font-semibold text-yellow-100/80"
                >
                  • {warning}
                </p>
              )
            )}

            <p className="mt-1 text-xs text-gray-400">
              تم عرض البيانات المتاحة
              بدون إيقاف لوحة الرسوم
              البيانية بالكامل.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-[#0B223A] p-12 text-center text-gray-300 shadow-xl">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-cyan-300" />

          <p className="text-base font-extrabold">
            جاري تحميل بيانات الرسوم البيانية...
          </p>
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <ChartCard
            title="المصاريف حسب التصنيف"
            description="ترتيب أعلى التصنيفات حسب قيمة المصروف الفعلية."
          >
            {expenseByCategory.length ===
            0 ? (
              <EmptyChart
                icon={
                  <WalletCards size={30} />
                }
                text="لا توجد بيانات مصاريف كافية لعرض الرسم."
              />
            ) : (
              <ResponsiveContainer
                width="100%"
                height={350}
              >
                <BarChart
                  data={expenseByCategory.slice(
                    0,
                    10
                  )}
                  layout="vertical"
                  margin={{
                    top: 10,
                    right: 25,
                    left: 20,
                    bottom: 10,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.08)"
                  />

                  <XAxis
                    type="number"
                    tick={{
                      fill: "#CBD5E1",
                      fontSize: 12,
                    }}
                    tickFormatter={(
                      value
                    ) =>
                      formatNumber(
                        Number(value)
                      )
                    }
                  />

                  <YAxis
                    dataKey="category"
                    type="category"
                    width={160}
                    tick={{
                      fill: "#F1F5F9",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  />

                  <Tooltip
                    contentStyle={
                      tooltipStyle
                    }
                    formatter={(
                      value: any
                    ) => [
                      `${formatNumber(
                        Number(value)
                      )} ريال`,
                      "المصروف",
                    ]}
                  />

                  <Bar
                    dataKey="total"
                    name="المصروف"
                    fill="#38BDF8"
                    radius={[
                      0,
                      10,
                      10,
                      0,
                    ]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard
            title="المصاريف عبر الزمن"
            description="تطور إجمالي المصروفات المسجلة حسب الشهر."
          >
            {expenseTimeline.length ===
            0 ? (
              <EmptyChart
                icon={
                  <BarChart3 size={30} />
                }
                text="لا توجد بيانات زمنية للمصاريف حتى الآن."
              />
            ) : (
              <ResponsiveContainer
                width="100%"
                height={350}
              >
                <LineChart
                  data={
                    expenseTimeline
                  }
                  margin={{
                    top: 15,
                    right: 20,
                    left: 10,
                    bottom: 10,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.08)"
                  />

                  <XAxis
                    dataKey="month"
                    tick={{
                      fill: "#CBD5E1",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  />

                  <YAxis
                    tick={{
                      fill: "#CBD5E1",
                      fontSize: 12,
                    }}
                    tickFormatter={(
                      value
                    ) =>
                      formatNumber(
                        Number(value)
                      )
                    }
                  />

                  <Tooltip
                    contentStyle={
                      tooltipStyle
                    }
                    formatter={(
                      value: any
                    ) => [
                      `${formatNumber(
                        Number(value)
                      )} ريال`,
                      "المصروف",
                    ]}
                  />

                  <Line
                    type="monotone"
                    dataKey="total"
                    name="المصروف"
                    stroke="#38BDF8"
                    strokeWidth={4}
                    dot={{
                      r: 5,
                      fill: "#38BDF8",
                    }}
                    activeDot={{
                      r: 7,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard
            title="الكميات المتوقعة مقابل المستخدمة"
            description="مقارنة خطة المكتب مع الاستخدام الفعلي للحديد والخرسانة والبلوك."
          >
            <ResponsiveContainer
              width="100%"
              height={350}
            >
              <BarChart
                data={
                  quantityComparison
                }
                margin={{
                  top: 15,
                  right: 15,
                  left: 10,
                  bottom: 10,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.08)"
                />

                <XAxis
                  dataKey="material"
                  tick={{
                    fill: "#F1F5F9",
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                />

                <YAxis
                  tick={{
                    fill: "#CBD5E1",
                    fontSize: 12,
                  }}
                />

                <Tooltip
                  contentStyle={
                    tooltipStyle
                  }
                  formatter={(
                    value: any,
                    name: any
                  ) => [
                    formatNumber(
                      Number(value),
                      2
                    ),
                    name ===
                    "expected"
                      ? "المتوقع"
                      : "المستخدم",
                  ]}
                />

                <Legend
                  wrapperStyle={{
                    paddingTop: 10,
                    color: "#E2E8F0",
                    fontWeight: 700,
                  }}
                />

                <Bar
                  dataKey="expected"
                  name="المتوقع"
                  fill="#38BDF8"
                  radius={[
                    8,
                    8,
                    0,
                    0,
                  ]}
                />

                <Bar
                  dataKey="used"
                  name="المستخدم"
                  fill="#FBBF24"
                  radius={[
                    8,
                    8,
                    0,
                    0,
                  ]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="توزيع المصاريف حسب المرحلة"
            description="نسبة مساهمة كل مرحلة في إجمالي المصروفات المسجلة."
          >
            {expenseByStage.length ===
            0 ? (
              <EmptyChart
                icon={
                  <Calculator size={30} />
                }
                text="لا توجد بيانات مراحل مرتبطة بالمصاريف."
              />
            ) : (
              <ResponsiveContainer
                width="100%"
                height={350}
              >
                <PieChart>
                  <Pie
                    data={
                      expenseByStage
                    }
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={115}
                    innerRadius={62}
                    paddingAngle={3}
                    label={({
                      name,
                      percent,
                    }) =>
                      `${name} ${(
                        Number(
                          percent
                        ) * 100
                      ).toFixed(
                        1
                      )}%`
                    }
                    labelLine={{
                      stroke:
                        "#64748B",
                    }}
                  >
                    {expenseByStage.map(
                      (
                        _,
                        index
                      ) => (
                        <Cell
                          key={`stage-${index}`}
                          fill={
                            [
                              "#38BDF8",
                              "#FBBF24",
                              "#34D399",
                              "#F472B6",
                              "#A78BFA",
                              "#FB7185",
                            ][
                              index %
                                6
                            ]
                          }
                        />
                      )
                    )}
                  </Pie>

                  <Tooltip
                    contentStyle={
                      tooltipStyle
                    }
                    formatter={(
                      value: any
                    ) => [
                      `${formatNumber(
                        Number(value)
                      )} ريال`,
                      "المصروف",
                    ]}
                  />

                  <Legend
                    wrapperStyle={{
                      paddingTop: 10,
                      color: "#E2E8F0",
                      fontWeight: 700,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <div className="xl:col-span-2">
            <ChartCard
              title="توزيع الفلل حسب التصنيف"
              description="عدد الفلل المسجلة في كل تصنيف داخل المشروع."
            >
              {villaDistribution.length ===
              0 ? (
                <EmptyChart
                  icon={
                    <Building2 size={30} />
                  }
                  text="لا توجد بيانات تصنيف للفلل حتى الآن."
                />
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height={330}
                >
                  <BarChart
                    data={
                      villaDistribution
                    }
                    margin={{
                      top: 15,
                      right: 20,
                      left: 10,
                      bottom: 10,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.08)"
                    />

                    <XAxis
                      dataKey="name"
                      tick={{
                        fill: "#F1F5F9",
                        fontSize: 13,
                        fontWeight: 800,
                      }}
                    />

                    <YAxis
                      allowDecimals={
                        false
                      }
                      tick={{
                        fill: "#CBD5E1",
                        fontSize: 12,
                      }}
                    />

                    <Tooltip
                      contentStyle={
                        tooltipStyle
                      }
                      formatter={(
                        value: any
                      ) => [
                        formatNumber(
                          Number(value)
                        ),
                        "عدد الفلل",
                      ]}
                    />

                    <Bar
                      dataKey="value"
                      name="عدد الفلل"
                      fill="#34D399"
                      radius={[
                        10,
                        10,
                        0,
                        0,
                      ]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </section>
      )}
    </div>
  );
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#102947] via-[#0D2742] to-[#081B33] p-5 shadow-xl">
      <div className="mb-4 flex items-start gap-3 border-b border-white/10 pb-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-yellow-400/20 bg-yellow-400/10 text-yellow-300">
          <Calculator size={21} />
        </div>

        <div className="min-w-0">
          <h2 className="text-xl font-black text-white">
            {title}
          </h2>

          <p className="mt-1 text-sm font-medium leading-6 text-gray-400">
            {description}
          </p>
        </div>
      </div>

      {children}
    </div>
  );
}

function EmptyChart({
  icon,
  text,
}: {
  icon: ReactNode;
  text: string;
}) {
  return (
    <div className="flex h-[350px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#081B33]/50 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-gray-400">
        {icon}
      </div>

      <p className="text-base font-extrabold text-gray-300">
        {text}
      </p>

      <p className="mt-2 max-w-md text-xs leading-6 text-gray-500">
        عند توفر البيانات سيتم عرضها
        تلقائيًا في الرسم البياني.
      </p>
    </div>
  );
}