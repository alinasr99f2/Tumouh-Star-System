import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Boxes,
  Check,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

import { projects } from "../../data/projects";
import { supabase } from "../../utils/supabase";
import { usePermissions } from "../../utils/permissions";

type MaterialKey = "حديد" | "خرسانة" | "بلوك";

type MaterialPlan = {
  material: MaterialKey;
  expected: number;
  unit: string;
};

type UsageRow = {
  id: string | number;
  project_id: number;
  material: MaterialKey;
  quantity: number;
  usage_date: string;
  notes: string | null;
};

const MATERIALS: MaterialPlan[] = [
  { material: "حديد", expected: 0, unit: "طن" },
  { material: "خرسانة", expected: 0, unit: "م³" },
  { material: "بلوك", expected: 0, unit: "حبة" },
];

const STORAGE_KEY = (projectId: number) =>
  `tumouh_star_project_quantities_${projectId}`;

const today = () => {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const formatNumber = (value: number) =>
  Number(value || 0).toLocaleString("ar-SA", {
    maximumFractionDigits: 2,
  });

const getStatus = (percentage: number) => {
  if (percentage > 100) {
    return {
      label: "تجاوز الكمية المتوقعة",
      text: "text-red-300",
      bg: "bg-red-400/10",
      border: "border-red-400/20",
      bar: "bg-red-400",
    };
  }

  if (percentage >= 80) {
    return {
      label: "قريب من الحد المتوقع",
      text: "text-yellow-300",
      bg: "bg-yellow-400/10",
      border: "border-yellow-400/20",
      bar: "bg-yellow-400",
    };
  }

  return {
    label: "ضمن الكمية المتوقعة",
    text: "text-emerald-300",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
    bar: "bg-emerald-400",
  };
};

export default function ProjectQuantities() {
  const { id } = useParams();
  const navigate = useNavigate();
  const projectId = Number(id);
  const project = projects.find((item) => item.id === projectId);
  const { hasPermission } = usePermissions();
  const canEditProject = hasPermission("projects_edit");
  const canDeleteProject = hasPermission("projects_delete");

  const [plans, setPlans] = useState<MaterialPlan[]>(MATERIALS);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dbAvailable, setDbAvailable] = useState(true);

  const [editingMaterial, setEditingMaterial] = useState<MaterialKey | null>(null);
  const [expectedInput, setExpectedInput] = useState("");

  const [showUsageModal, setShowUsageModal] = useState(false);
  const [usageMaterial, setUsageMaterial] = useState<MaterialKey>("حديد");
  const [usageQuantityInput, setUsageQuantityInput] = useState("");
  const [usageDate, setUsageDate] = useState(today());
  const [usageNotes, setUsageNotes] = useState("");

  const migrateLocalDataToDatabase = async () => {
    const stored = localStorage.getItem(STORAGE_KEY(projectId));
    if (!stored) return false;

    let parsed: { plans?: MaterialPlan[]; usage?: UsageRow[] };
    try {
      parsed = JSON.parse(stored);
    } catch (error) {
      console.error("بيانات الكميات المحلية غير صالحة:", error);
      return false;
    }

    const localPlans = Array.isArray(parsed.plans) ? parsed.plans : [];
    const localUsage = Array.isArray(parsed.usage) ? parsed.usage : [];

    if (localPlans.length === 0 && localUsage.length === 0) return false;

    try {
      // ننقل الكميات المتوقعة إلى قاعدة البيانات أولًا.
      for (const plan of localPlans) {
        const { data: existing, error: findError } = await supabase
          .from("project_material_plans")
          .select("id")
          .eq("project_id", projectId)
          .eq("material", plan.material)
          .maybeSingle();

        if (findError) throw findError;

        const payload = {
          project_id: projectId,
          material: plan.material,
          expected_quantity: Number(plan.expected || 0),
          unit: plan.unit,
        };

        const result = existing
          ? await supabase
              .from("project_material_plans")
              .update(payload)
              .eq("id", existing.id)
          : await supabase.from("project_material_plans").insert(payload);

        if (result.error) throw result.error;
      }

      // ننقل سجلات الاستخدام مع منع التكرار لو كانت عملية النقل قد بدأت من قبل.
      for (const row of localUsage) {
        const { data: matches, error: matchError } = await supabase
          .from("project_material_usage")
          .select("id")
          .eq("project_id", projectId)
          .eq("material", row.material)
          .eq("quantity", Number(row.quantity || 0))
          .eq("usage_date", row.usage_date)
          .eq("notes", row.notes ?? null)
          .limit(1);

        if (matchError) throw matchError;
        if (matches && matches.length > 0) continue;

        const { error: insertError } = await supabase
          .from("project_material_usage")
          .insert({
            project_id: projectId,
            material: row.material,
            quantity: Number(row.quantity || 0),
            usage_date: row.usage_date,
            notes: row.notes ?? null,
          });

        if (insertError) throw insertError;
      }

      // بعد التأكد من نجاح النقل بالكامل، تصبح قاعدة البيانات هي المصدر الوحيد.
      localStorage.removeItem(STORAGE_KEY(projectId));
      return true;
    } catch (error) {
      console.error("تعذر نقل بيانات الكميات المحلية إلى قاعدة البيانات:", error);
      throw error;
    }
  };

  const loadData = async () => {
    if (!projectId) return;
    setLoading(true);
    setDbAvailable(true);

    try {
      // أي بيانات قديمة محفوظة محليًا يتم نقلها مرة واحدة إلى Supabase.
      await migrateLocalDataToDatabase();

      const [plansResult, usageResult] = await Promise.all([
        supabase
          .from("project_material_plans")
          .select("material, expected_quantity, unit")
          .eq("project_id", projectId),
        supabase
          .from("project_material_usage")
          .select("id, project_id, material, quantity, usage_date, notes")
          .eq("project_id", projectId)
          .order("usage_date", { ascending: false })
          .order("id", { ascending: false }),
      ]);

      if (plansResult.error) throw plansResult.error;
      if (usageResult.error) throw usageResult.error;

      const planMap = new Map(
        (plansResult.data ?? []).map((row: any) => [
          String(row.material) as MaterialKey,
          {
            material: String(row.material) as MaterialKey,
            expected: Number(row.expected_quantity ?? 0),
            unit: String(
              row.unit ??
                MATERIALS.find((m) => m.material === row.material)?.unit ??
                ""
            ),
          },
        ])
      );

      setPlans(
        MATERIALS.map((material) =>
          planMap.get(material.material) ?? material
        )
      );
      setUsage((usageResult.data ?? []) as UsageRow[]);
    } catch (error: any) {
      console.error("تعذر تحميل كميات المشروع من قاعدة البيانات:", error);
      setDbAvailable(false);
      setPlans(MATERIALS);
      setUsage([]);
      alert(
        `تعذر الاتصال بقاعدة البيانات. لم يتم حفظ أو تحميل أي بيانات محليًا.\n${
          error?.message ?? "حدث خطأ غير معروف."
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const summaries = useMemo(() => {
    return plans.map((plan) => {
      const used = usage
        .filter((row) => row.material === plan.material)
        .reduce((sum, row) => sum + Number(row.quantity || 0), 0);
      const expected = Number(plan.expected || 0);
      const percentage = expected > 0 ? (used / expected) * 100 : 0;
      const remaining = expected - used;
      return {
        ...plan,
        used,
        percentage,
        remaining,
        status: getStatus(percentage),
      };
    });
  }, [plans, usage]);

  const saveExpected = async () => {
    if (!canEditProject) { alert("ليس لديك صلاحية تعديل كميات المشروع."); return; }
    if (!editingMaterial) return;
    const expected = Number(expectedInput);
    if (!Number.isFinite(expected) || expected <= 0) {
      alert("من فضلك أدخل كمية متوقعة صحيحة.");
      return;
    }

    const nextPlans = plans.map((plan) =>
      plan.material === editingMaterial ? { ...plan, expected } : plan
    );

    setSaving(true);
    try {
      const plan = nextPlans.find((item) => item.material === editingMaterial);
      const unit = plan?.unit ?? "";

      const { data: existing, error: findError } = await supabase
        .from("project_material_plans")
        .select("id")
        .eq("project_id", projectId)
        .eq("material", editingMaterial)
        .maybeSingle();

      if (findError) throw findError;

      const payload = {
        project_id: projectId,
        material: editingMaterial,
        expected_quantity: expected,
        unit,
      };

      const result = existing
        ? await supabase
            .from("project_material_plans")
            .update(payload)
            .eq("id", existing.id)
        : await supabase.from("project_material_plans").insert(payload);

      if (result.error) throw result.error;

      setPlans(nextPlans);
      setEditingMaterial(null);
      setExpectedInput("");
    } catch (error: any) {
      setDbAvailable(false);
      alert(
        `لم يتم حفظ الكمية في قاعدة البيانات.\n${
          error?.message ?? "حدث خطأ غير معروف."
        }`
      );
    } finally {
      setSaving(false);
    }
  };

  const addUsage = async () => {
    if (!canEditProject) { alert("ليس لديك صلاحية إضافة استخدامات المشروع."); return; }
    const quantity = Number(usageQuantityInput);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      alert("من فضلك أدخل كمية مستخدمة صحيحة.");
      return;
    }
    if (!usageDate) {
      alert("من فضلك اختر تاريخ الاستخدام.");
      return;
    }

    setSaving(true);

    try {
      const { data, error } = await supabase
        .from("project_material_usage")
        .insert({
          project_id: projectId,
          material: usageMaterial,
          quantity,
          usage_date: usageDate,
          notes: usageNotes.trim() || null,
        })
        .select("id, project_id, material, quantity, usage_date, notes")
        .single();

      if (error) throw error;

      setUsage((current) => [data as UsageRow, ...current]);
      setShowUsageModal(false);
      setUsageQuantityInput("");
      setUsageNotes("");
      setUsageDate(today());
    } catch (error: any) {
      setDbAvailable(false);
      alert(
        `لم يتم تسجيل الاستخدام في قاعدة البيانات.\n${
          error?.message ?? "حدث خطأ غير معروف."
        }`
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteUsage = async (row: UsageRow) => {
    if (!canDeleteProject) { alert("ليس لديك صلاحية حذف استخدامات المشروع."); return; }
    if (!window.confirm("هل أنت متأكد من حذف سجل الاستخدام هذا؟")) return;

    try {
      if (typeof row.id !== "number") {
        alert("هذا السجل غير موجود كرقم في قاعدة البيانات.");
        return;
      }

      const { error } = await supabase
        .from("project_material_usage")
        .delete()
        .eq("id", row.id);

      if (error) throw error;

      setUsage((current) => current.filter((item) => item.id !== row.id));
    } catch (error: any) {
      alert(
        `تعذر حذف سجل الاستخدام من قاعدة البيانات.\n${
          error?.message ?? "حدث خطأ غير معروف."
        }`
      );
    }
  };

  const openExpectedEditor = (plan: MaterialPlan) => {
    setEditingMaterial(plan.material);
    setExpectedInput(plan.expected > 0 ? String(plan.expected) : "");
  };

  const openUsage = (material: MaterialKey = "حديد") => {
    setUsageMaterial(material);
    setShowUsageModal(true);
  };

  if (!project) {
    return (
      <div className="min-h-full p-6 text-right text-white" dir="rtl">
        <button
          type="button"
          onClick={() => navigate("/projects")}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-bold"
        >
          العودة للمشاريع
        </button>
        <p className="mt-6 text-xl font-bold">المشروع غير موجود.</p>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-full bg-[#06182B] p-4 text-white md:p-6">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-5 rounded-3xl border border-white/10 bg-gradient-to-l from-[#173F68] via-[#102947] to-[#081B33] p-5 shadow-2xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
                  <Boxes size={32} />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold">كميات المشروع</h1>
                  <p className="mt-1 text-sm text-gray-400">{project.name}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-gray-400">
                متابعة الكميات المتوقعة من المكتب ومقارنتها بالاستخدام الفعلي للمشروع.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canEditProject && <button
                type="button"
                onClick={() => openUsage()}
                className="flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2.5 font-extrabold text-[#081B33] transition hover:bg-yellow-300"
              >
                <Plus size={18} />
                إضافة استخدام
              </button>}
              <button
                type="button"
                onClick={loadData}
                className="flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2.5 font-bold text-cyan-300 transition hover:bg-cyan-400/20"
              >
                <RefreshCw size={17} />
                تحديث
              </button>
              <button
                type="button"
                onClick={() => navigate(`/projects/${projectId}`)}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-bold text-gray-200 transition hover:bg-white/10"
              >
                <ArrowLeft size={18} />
                رجوع للمشروع
              </button>
            </div>
          </div>
        </div>

        {!dbAvailable && (
          <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-200">
            قاعدة البيانات غير متاحة حاليًا. لن يتم حفظ أي بيانات محليًا.
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-[#0B273F] p-12 text-center text-gray-400">
            جاري تحميل الكميات...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
              {summaries.map((item) => {
                const progress = Math.min(Math.max(item.percentage, 0), 100);
                return (
                  <div
                    key={item.material}
                    className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#173F68] via-[#102F4D] to-[#081B33] shadow-xl"
                  >
                    <div className="flex items-start justify-between border-b border-white/10 p-5">
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
                            <Boxes size={27} />
                          </div>
                          <div>
                            <h2 className="text-xl font-extrabold">{item.material}</h2>
                            <p className="text-xs text-gray-400">الوحدة: {item.unit}</p>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openExpectedEditor(item)}
                        className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 p-2.5 text-yellow-300 transition hover:bg-yellow-400 hover:text-[#081B33]"
                        title="تعديل الكمية المتوقعة"
                      >
                        <Pencil size={17} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-5">
                      <div className="rounded-2xl border border-blue-400/10 bg-white/5 p-4 text-center">
                        <p className="text-xs font-bold text-gray-400">الكمية المتوقعة</p>
                        <p className="mt-2 text-2xl font-extrabold text-white">{formatNumber(item.expected)}</p>
                        <p className="mt-1 text-xs text-gray-500">{item.unit}</p>
                      </div>
                      <div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/5 p-4 text-center">
                        <p className="text-xs font-bold text-gray-400">المستخدم فعليًا</p>
                        <p className="mt-2 text-2xl font-extrabold text-cyan-300">{formatNumber(item.used)}</p>
                        <p className="mt-1 text-xs text-gray-500">{item.unit}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                        <p className="text-xs font-bold text-gray-400">المتبقي</p>
                        <p className={`mt-2 text-xl font-extrabold ${item.remaining < 0 ? "text-red-300" : "text-emerald-300"}`}>
                          {formatNumber(item.remaining)}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">{item.unit}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                        <p className="text-xs font-bold text-gray-400">نسبة الاستخدام</p>
                        <p className={`mt-2 text-xl font-extrabold ${item.status.text}`}>{formatNumber(item.percentage)}%</p>
                      </div>
                    </div>

                    <div className="px-5 pb-5">
                      <div className="mb-2 flex items-center justify-between text-xs font-bold text-gray-400">
                        <span>{item.status.label}</span>
                        <span>{formatNumber(item.percentage)}%</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full transition-all ${item.status.bar}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => openUsage(item.material)}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-yellow-400/20 bg-yellow-400/10 py-2.5 font-bold text-yellow-300 transition hover:bg-yellow-400 hover:text-[#081B33]"
                      >
                        <Plus size={17} />
                        إضافة استخدام {item.material}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[#0B273F] shadow-xl">
              <div className="flex flex-col gap-3 border-b border-white/10 bg-[#102947] p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-extrabold">سجل استخدام المواد</h2>
                  <p className="mt-1 text-xs text-gray-400">كل إضافة يتم تسجيلها لتجميع الاستخدام الفعلي تلقائيًا.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-gray-300">
                  إجمالي السجلات: {usage.length}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-right text-sm">
                  <thead className="bg-[#081B33] text-gray-400">
                    <tr>
                      <th className="px-4 py-3">التاريخ</th>
                      <th className="px-4 py-3">البند</th>
                      <th className="px-4 py-3">الكمية</th>
                      <th className="px-4 py-3">الوحدة</th>
                      <th className="px-4 py-3">الملاحظات</th>
                      <th className="px-4 py-3 text-center">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usage.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                          لا توجد عمليات استخدام مسجلة حتى الآن.
                        </td>
                      </tr>
                    ) : (
                      usage.map((row) => {
                        const unit = plans.find((plan) => plan.material === row.material)?.unit ?? "";
                        return (
                          <tr key={String(row.id)} className="border-t border-white/10 hover:bg-white/[0.03]">
                            <td className="px-4 py-3 font-bold text-gray-300">{row.usage_date}</td>
                            <td className="px-4 py-3 font-extrabold text-white">{row.material}</td>
                            <td className="px-4 py-3 font-extrabold text-yellow-300">{formatNumber(Number(row.quantity))}</td>
                            <td className="px-4 py-3 text-gray-400">{unit}</td>
                            <td className="max-w-[320px] px-4 py-3 text-gray-400">{row.notes || "—"}</td>
                            <td className="px-4 py-3 text-center">
                              {canDeleteProject && <button
                                type="button"
                                onClick={() => deleteUsage(row)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-red-500 text-white transition hover:bg-red-400"
                                title="حذف"
                              >
                                <Trash2 size={17} />
                              </button>}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {editingMaterial && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0B273F] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 bg-[#102947] px-5 py-4">
              <div>
                <h3 className="text-lg font-extrabold">الكمية المتوقعة — {editingMaterial}</h3>
                <p className="mt-1 text-xs text-gray-400">أدخل الكمية المحددة من المكتب.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingMaterial(null)}
                className="rounded-xl bg-white/5 p-2 text-gray-300 hover:bg-white/10"
              >
                <X size={19} />
              </button>
            </div>
            <div className="p-5">
              <label className="mb-2 block text-sm font-bold text-gray-300">الكمية المتوقعة</label>
              <input
                type="number"
                min="0"
                step="any"
                value={expectedInput}
                onChange={(event) => setExpectedInput(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-[#081B33] px-4 py-3 text-lg font-extrabold text-white outline-none focus:border-yellow-400/50"
                autoFocus
              />
              <p className="mt-2 text-xs text-gray-500">
                الوحدة: {plans.find((plan) => plan.material === editingMaterial)?.unit}
              </p>
              <div className="mt-5 flex gap-2">
                {canEditProject && <button
                  type="button"
                  onClick={saveExpected}
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-yellow-400 py-3 font-extrabold text-[#081B33] disabled:opacity-50"
                >
                  <Check size={18} />
                  {saving ? "جاري الحفظ..." : "حفظ"}
                </button>}
                <button
                  type="button"
                  onClick={() => setEditingMaterial(null)}
                  className="rounded-xl border border-white/10 bg-white/5 px-5 font-bold text-gray-300"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showUsageModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[#0B273F] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 bg-[#102947] px-5 py-4">
              <div>
                <h3 className="text-lg font-extrabold">إضافة استخدام فعلي</h3>
                <p className="mt-1 text-xs text-gray-400">سجل الكمية التي تم استخدامها فعليًا.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowUsageModal(false)}
                className="rounded-xl bg-white/5 p-2 text-gray-300 hover:bg-white/10"
              >
                <X size={19} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-300">البند</label>
                <select
                  value={usageMaterial}
                  onChange={(event) => setUsageMaterial(event.target.value as MaterialKey)}
                  className="w-full rounded-2xl border border-white/10 bg-[#081B33] px-4 py-3 font-bold text-white outline-none"
                >
                  {MATERIALS.map((material) => (
                    <option key={material.material} value={material.material}>
                      {material.material}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-300">الكمية</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={usageQuantityInput}
                    onChange={(event) => setUsageQuantityInput(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-[#081B33] px-4 py-3 font-extrabold text-white outline-none focus:border-yellow-400/50"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-300">التاريخ</label>
                  <input
                    type="date"
                    value={usageDate}
                    onChange={(event) => setUsageDate(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-[#081B33] px-4 py-3 font-bold text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-gray-300">ملاحظات</label>
                <textarea
                  value={usageNotes}
                  onChange={(event) => setUsageNotes(event.target.value)}
                  rows={3}
                  placeholder="مثال: تسليح الفلل A1 - A3"
                  className="w-full resize-none rounded-2xl border border-white/10 bg-[#081B33] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-yellow-400/50"
                />
              </div>

              <button
                type="button"
                onClick={addUsage}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 py-3 font-extrabold text-[#081B33] disabled:opacity-50"
              >
                <Plus size={18} />
                {saving ? "جاري التسجيل..." : "تسجيل الاستخدام"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
