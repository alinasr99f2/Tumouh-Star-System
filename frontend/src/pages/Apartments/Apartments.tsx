import { useMemo, useState } from "react";
import {
  Building2,
  Home,
  Plus,
  Search,
  SlidersHorizontal,
  KeyRound,
  CheckCircle2,
  UserRound,
  MapPin,
  Ruler,
  Banknote,
  Pencil,
  Trash2,
  Eye,
  X,
  ChevronDown,
  LayoutGrid,
  List,
} from "lucide-react";

type ApartmentStatus = "متاحة" | "مؤجرة";

type Apartment = {
  id: number;
  number: string;
  type: string;
  rooms: number;
  area: number;
  price: number;
  location: string;
  status: ApartmentStatus;
  tenant?: string;
  notes?: string;
};

const initialApartments: Apartment[] = [
  {
    id: 1,
    number: "شقة 101",
    type: "غرفتين وصالة",
    rooms: 2,
    area: 95,
    price: 24000,
    location: "الجبيل البلد",
    status: "متاحة",
  },
  {
    id: 2,
    number: "شقة 102",
    type: "ثلاث غرف وصالة",
    rooms: 3,
    area: 125,
    price: 30000,
    location: "الجبيل البلد",
    status: "مؤجرة",
    tenant: "محمد أحمد",
  },
  {
    id: 3,
    number: "شقة 103",
    type: "غرفة وصالة",
    rooms: 1,
    area: 70,
    price: 18000,
    location: "الجبيل الصناعية",
    status: "متاحة",
  },
  {
    id: 4,
    number: "شقة 104",
    type: "ثلاث غرف وصالة",
    rooms: 3,
    area: 135,
    price: 32000,
    location: "الفناتير",
    status: "مؤجرة",
    tenant: "أحمد علي",
  },
  {
    id: 5,
    number: "شقة 105",
    type: "غرفتين وصالة",
    rooms: 2,
    area: 100,
    price: 25000,
    location: "الدفي",
    status: "متاحة",
  },
  {
    id: 6,
    number: "شقة 106",
    type: "أربع غرف وصالة",
    rooms: 4,
    area: 165,
    price: 38000,
    location: "الجبيل البلد",
    status: "مؤجرة",
    tenant: "خالد حسن",
  },
];

const formatPrice = (value: number) =>
  new Intl.NumberFormat("ar-SA").format(value);

export default function Apartments() {
  const [apartments, setApartments] = useState<Apartment[]>(initialApartments);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"الكل" | ApartmentStatus>(
    "الكل"
  );
  const [typeFilter, setTypeFilter] = useState("الكل");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showModal, setShowModal] = useState(false);
  const [editingApartment, setEditingApartment] = useState<Apartment | null>(
    null
  );
  const [selectedApartment, setSelectedApartment] =
    useState<Apartment | null>(null);

  const [form, setForm] = useState({
    number: "",
    type: "غرفتين وصالة",
    rooms: "2",
    area: "",
    price: "",
    location: "",
    status: "متاحة" as ApartmentStatus,
    tenant: "",
    notes: "",
  });

  const types = useMemo(
    () => ["الكل", ...Array.from(new Set(apartments.map((item) => item.type)))],
    [apartments]
  );

  const filteredApartments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return apartments.filter((apartment) => {
      const matchesSearch =
        !query ||
        apartment.number.toLowerCase().includes(query) ||
        apartment.type.toLowerCase().includes(query) ||
        apartment.location.toLowerCase().includes(query) ||
        apartment.tenant?.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "الكل" || apartment.status === statusFilter;

      const matchesType =
        typeFilter === "الكل" || apartment.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [apartments, search, statusFilter, typeFilter]);

  const availableCount = apartments.filter(
    (item) => item.status === "متاحة"
  ).length;
  const rentedCount = apartments.filter(
    (item) => item.status === "مؤجرة"
  ).length;
  const totalRent = apartments.reduce((sum, item) => sum + item.price, 0);

  const resetForm = () => {
    setForm({
      number: "",
      type: "غرفتين وصالة",
      rooms: "2",
      area: "",
      price: "",
      location: "",
      status: "متاحة",
      tenant: "",
      notes: "",
    });
    setEditingApartment(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (apartment: Apartment) => {
    setEditingApartment(apartment);
    setForm({
      number: apartment.number,
      type: apartment.type,
      rooms: String(apartment.rooms),
      area: String(apartment.area),
      price: String(apartment.price),
      location: apartment.location,
      status: apartment.status,
      tenant: apartment.tenant ?? "",
      notes: apartment.notes ?? "",
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.number.trim() || !form.area || !form.price) return;

    const apartmentData: Apartment = {
      id: editingApartment?.id ?? Date.now(),
      number: form.number.trim(),
      type: form.type,
      rooms: Number(form.rooms) || 1,
      area: Number(form.area),
      price: Number(form.price),
      location: form.location.trim() || "غير محدد",
      status: form.status,
      tenant: form.status === "مؤجرة" ? form.tenant.trim() : undefined,
      notes: form.notes.trim() || undefined,
    };

    setApartments((current) =>
      editingApartment
        ? current.map((item) =>
            item.id === editingApartment.id ? apartmentData : item
          )
        : [apartmentData, ...current]
    );

    setShowModal(false);
    resetForm();
  };

  const handleDelete = (id: number) => {
    const apartment = apartments.find((item) => item.id === id);
    if (!apartment) return;

    const confirmed = window.confirm(
      `هل أنت متأكد من حذف ${apartment.number}؟`
    );

    if (confirmed) {
      setApartments((current) => current.filter((item) => item.id !== id));
      if (selectedApartment?.id === id) {
        setSelectedApartment(null);
      }
    }
  };

  return (
    <div className="min-h-full w-full px-4 pb-8 pt-4 text-white sm:px-6 lg:px-8">
      {/* Header */}
      <section className="mx-auto max-w-[1600px]">
        <div className="mb-5 rounded-[28px] border border-sky-300/15 bg-slate-950/45 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-sky-300/25 bg-sky-400/10 shadow-inner">
                <Home size={34} className="text-sky-200" />
              </div>

              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                    الشقق المتاحة / المؤجرة
                  </h1>
                  <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-200">
                    إدارة مستقلة
                  </span>
                </div>
                <p className="text-sm text-slate-300">
                  إدارة الشقق السكنية والتجارية ومتابعة حالة كل شقة وبياناتها
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-emerald-300/30 bg-emerald-500/15 px-6 font-bold text-emerald-100 shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-500/25"
            >
              <Plus size={21} />
              إضافة شقة جديدة
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<Home size={24} />}
            title="إجمالي الشقق"
            value={apartments.length}
            suffix="شقة"
            tone="sky"
          />
          <StatCard
            icon={<CheckCircle2 size={24} />}
            title="الشقق المتاحة"
            value={availableCount}
            suffix="شقة متاحة"
            tone="green"
          />
          <StatCard
            icon={<KeyRound size={24} />}
            title="الشقق المؤجرة"
            value={rentedCount}
            suffix="شقة مؤجرة"
            tone="amber"
          />
          <StatCard
            icon={<Banknote size={24} />}
            title="إجمالي الإيجارات"
            value={formatPrice(totalRent)}
            suffix="ريال سنوي"
            tone="purple"
          />
        </div>

        {/* Filters */}
        <section className="mb-5 rounded-[24px] border border-sky-300/15 bg-slate-950/40 p-4 shadow-xl backdrop-blur-xl">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-200">
            <SlidersHorizontal size={18} className="text-amber-300" />
            تصفية وبحث الشقق
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(260px,1.8fr)_minmax(170px,1fr)_minmax(170px,1fr)_auto]">
            <div className="relative">
              <Search
                size={19}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ابحث برقم الشقة أو النوع أو الموقع أو المستأجر..."
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.045] pr-11 pl-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-amber-300/45 focus:bg-white/[0.07]"
              />
            </div>

            <FilterSelect
              value={statusFilter}
              onChange={(value) =>
                setStatusFilter(value as "الكل" | ApartmentStatus)
              }
              options={["الكل", "متاحة", "مؤجرة"]}
              label="الحالة"
            />

            <FilterSelect
              value={typeFilter}
              onChange={setTypeFilter}
              options={types}
              label="نوع الشقة"
            />

            <div className="flex h-12 overflow-hidden rounded-xl border border-white/10 bg-white/[0.045]">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`flex w-14 items-center justify-center transition ${
                  viewMode === "grid"
                    ? "bg-amber-300/15 text-amber-200"
                    : "text-slate-400 hover:bg-white/5"
                }`}
                title="عرض البطاقات"
              >
                <LayoutGrid size={19} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`flex w-14 items-center justify-center transition ${
                  viewMode === "list"
                    ? "bg-amber-300/15 text-amber-200"
                    : "text-slate-400 hover:bg-white/5"
                }`}
                title="عرض القائمة"
              >
                <List size={19} />
              </button>
            </div>
          </div>
        </section>

        {/* Content */}
        {filteredApartments.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-white/15 bg-slate-950/35 px-6 py-20 text-center backdrop-blur-xl">
            <Home size={46} className="mx-auto mb-4 text-slate-500" />
            <h2 className="text-xl font-bold text-white">لا توجد شقق</h2>
            <p className="mt-2 text-sm text-slate-400">
              لا توجد نتائج مطابقة للبحث أو التصفية الحالية.
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredApartments.map((apartment) => (
              <ApartmentCard
                key={apartment.id}
                apartment={apartment}
                onView={() => setSelectedApartment(apartment)}
                onEdit={() => openEditModal(apartment)}
                onDelete={() => handleDelete(apartment.id)}
              />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/45 shadow-xl backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-right">
                <thead className="border-b border-white/10 bg-white/[0.04] text-xs text-slate-400">
                  <tr>
                    <th className="px-5 py-4">الشقة</th>
                    <th className="px-5 py-4">النوع</th>
                    <th className="px-5 py-4">المساحة</th>
                    <th className="px-5 py-4">الإيجار السنوي</th>
                    <th className="px-5 py-4">الموقع</th>
                    <th className="px-5 py-4">الحالة</th>
                    <th className="px-5 py-4">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredApartments.map((apartment) => (
                    <tr
                      key={apartment.id}
                      className="transition hover:bg-white/[0.035]"
                    >
                      <td className="px-5 py-4 font-bold text-white">
                        {apartment.number}
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {apartment.type}
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {apartment.area} م²
                      </td>
                      <td className="px-5 py-4 font-bold text-amber-200">
                        {formatPrice(apartment.price)} ريال
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {apartment.location}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={apartment.status} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <SmallAction
                            icon={<Eye size={16} />}
                            label="عرض"
                            onClick={() => setSelectedApartment(apartment)}
                          />
                          <SmallAction
                            icon={<Pencil size={16} />}
                            label="تعديل"
                            onClick={() => openEditModal(apartment)}
                          />
                          <SmallAction
                            icon={<Trash2 size={16} />}
                            label="حذف"
                            danger
                            onClick={() => handleDelete(apartment.id)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Add / edit modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowModal(false);
          }}
        >
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-amber-300/20 bg-[#071f1b] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#071f1b]/95 px-6 py-5 backdrop-blur-xl">
              <div>
                <h2 className="text-xl font-extrabold text-white">
                  {editingApartment ? "تعديل بيانات الشقة" : "إضافة شقة جديدة"}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  أدخل بيانات الشقة الأساسية
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
              <FormInput
                label="رقم / اسم الشقة"
                value={form.number}
                onChange={(value) => setForm({ ...form, number: value })}
                placeholder="مثال: شقة 101"
              />

              <FormSelect
                label="نوع الشقة"
                value={form.type}
                onChange={(value) => setForm({ ...form, type: value })}
                options={[
                  "غرفة وصالة",
                  "غرفتين وصالة",
                  "ثلاث غرف وصالة",
                  "أربع غرف وصالة",
                  "دوبلكس",
                  "استوديو",
                ]}
              />

              <FormInput
                label="عدد الغرف"
                type="number"
                value={form.rooms}
                onChange={(value) => setForm({ ...form, rooms: value })}
                placeholder="2"
              />

              <FormInput
                label="المساحة بالمتر"
                type="number"
                value={form.area}
                onChange={(value) => setForm({ ...form, area: value })}
                placeholder="100"
              />

              <FormInput
                label="الإيجار السنوي"
                type="number"
                value={form.price}
                onChange={(value) => setForm({ ...form, price: value })}
                placeholder="25000"
              />

              <FormInput
                label="الموقع / العنوان"
                value={form.location}
                onChange={(value) => setForm({ ...form, location: value })}
                placeholder="الجبيل البلد"
              />

              <FormSelect
                label="حالة الشقة"
                value={form.status}
                onChange={(value) =>
                  setForm({
                    ...form,
                    status: value as ApartmentStatus,
                    tenant: value === "مؤجرة" ? form.tenant : "",
                  })
                }
                options={["متاحة", "مؤجرة"]}
              />

              {form.status === "مؤجرة" && (
                <FormInput
                  label="اسم المستأجر"
                  value={form.tenant}
                  onChange={(value) => setForm({ ...form, tenant: value })}
                  placeholder="اسم المستأجر"
                />
              )}

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold text-slate-300">
                  ملاحظات
                </label>
                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm({ ...form, notes: event.target.value })
                  }
                  rows={3}
                  placeholder="أي ملاحظات إضافية..."
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-amber-300/45"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-white/10 p-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-slate-300 transition hover:bg-white/10"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="rounded-xl border border-amber-200/30 bg-amber-300/15 px-7 py-3 text-sm font-extrabold text-amber-100 transition hover:bg-amber-300/25"
              >
                {editingApartment ? "حفظ التعديلات" : "إضافة الشقة"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details modal */}
      {selectedApartment && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedApartment(null);
          }}
        >
          <div className="w-full max-w-xl overflow-hidden rounded-[28px] border border-sky-300/20 bg-[#071f1b] shadow-2xl">
            <div className="border-b border-white/10 bg-gradient-to-l from-sky-500/10 to-transparent p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-300/25 bg-sky-400/10">
                    <Home size={28} className="text-sky-200" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold text-white">
                      {selectedApartment.number}
                    </h2>
                    <p className="text-sm text-slate-400">
                      {selectedApartment.type}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedApartment(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px bg-white/10">
              <DetailItem
                icon={<Ruler size={18} />}
                label="المساحة"
                value={`${selectedApartment.area} م²`}
              />
              <DetailItem
                icon={<Banknote size={18} />}
                label="الإيجار السنوي"
                value={`${formatPrice(selectedApartment.price)} ريال`}
              />
              <DetailItem
                icon={<MapPin size={18} />}
                label="الموقع"
                value={selectedApartment.location}
              />
              <DetailItem
                icon={<Building2 size={18} />}
                label="عدد الغرف"
                value={`${selectedApartment.rooms} غرف`}
              />
            </div>

            <div className="p-6">
              <div className="mb-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <div>
                  <p className="text-xs text-slate-500">حالة الشقة</p>
                  <div className="mt-2">
                    <StatusBadge status={selectedApartment.status} />
                  </div>
                </div>

                {selectedApartment.tenant && (
                  <div className="text-left">
                    <p className="text-xs text-slate-500">المستأجر</p>
                    <p className="mt-1 font-bold text-white">
                      {selectedApartment.tenant}
                    </p>
                  </div>
                )}
              </div>

              {selectedApartment.notes && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <p className="mb-1 text-xs text-slate-500">ملاحظات</p>
                  <p className="text-sm leading-7 text-slate-300">
                    {selectedApartment.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
  suffix,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  suffix: string;
  tone: "sky" | "green" | "amber" | "purple";
}) {
  const tones = {
    sky: "border-sky-300/20 bg-sky-400/[0.06] text-sky-200",
    green: "border-emerald-300/20 bg-emerald-400/[0.06] text-emerald-200",
    amber: "border-amber-300/20 bg-amber-400/[0.06] text-amber-200",
    purple: "border-violet-300/20 bg-violet-400/[0.06] text-violet-200",
  };

  return (
    <div
      className={`rounded-[22px] border p-5 shadow-lg backdrop-blur-xl ${tones[tone]}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-bold text-slate-300">{title}</span>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-current/20 bg-white/[0.04]">
          {icon}
        </div>
      </div>
      <div className="flex items-end gap-2">
        <strong className="text-3xl font-black text-white">{value}</strong>
        <span className="mb-1 text-xs text-slate-400">{suffix}</span>
      </div>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  label: string;
}) {
  return (
    <label className="relative">
      <span className="absolute right-4 top-1.5 z-10 text-[10px] text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full appearance-none rounded-xl border border-white/10 bg-[#09251f] px-4 pb-0 pt-3 text-sm font-bold text-white outline-none transition focus:border-amber-300/45"
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-[#09251f] text-white">
            {option}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 mt-1 -translate-y-1/2 text-slate-400"
      />
    </label>
  );
}

function ApartmentCard({
  apartment,
  onView,
  onEdit,
  onDelete,
}: {
  apartment: Apartment;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const available = apartment.status === "متاحة";

  return (
    <article className="group overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/45 shadow-xl backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-amber-300/25">
      <div
        className={`h-1.5 w-full ${
          available
            ? "bg-gradient-to-l from-emerald-400 via-emerald-500 to-transparent"
            : "bg-gradient-to-l from-amber-300 via-amber-500 to-transparent"
        }`}
      />

      <div className="p-5">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${
                available
                  ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-200"
                  : "border-amber-300/20 bg-amber-400/10 text-amber-200"
              }`}
            >
              <Home size={24} />
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-white">
                {apartment.number}
              </h3>
              <p className="text-xs text-slate-400">{apartment.type}</p>
            </div>
          </div>

          <StatusBadge status={apartment.status} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <InfoBox
            icon={<Ruler size={15} />}
            label="المساحة"
            value={`${apartment.area} م²`}
          />
          <InfoBox
            icon={<Building2 size={15} />}
            label="الغرف"
            value={`${apartment.rooms}`}
          />
          <InfoBox
            icon={<Banknote size={15} />}
            label="الإيجار السنوي"
            value={`${formatPrice(apartment.price)} ريال`}
          />
          <InfoBox
            icon={<MapPin size={15} />}
            label="الموقع"
            value={apartment.location}
          />
        </div>

        {apartment.tenant && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-300/10 bg-amber-300/[0.04] px-3 py-2 text-xs text-slate-300">
            <UserRound size={15} className="text-amber-200" />
            المستأجر: <strong className="text-white">{apartment.tenant}</strong>
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={onView}
            className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-sky-300/15 bg-sky-400/[0.07] text-xs font-bold text-sky-100 transition hover:bg-sky-400/15"
          >
            <Eye size={15} />
            عرض
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-amber-300/15 bg-amber-400/[0.07] text-xs font-bold text-amber-100 transition hover:bg-amber-400/15"
          >
            <Pencil size={15} />
            تعديل
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-red-300/15 bg-red-400/[0.06] text-xs font-bold text-red-200 transition hover:bg-red-400/15"
          >
            <Trash2 size={15} />
            حذف
          </button>
        </div>
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: ApartmentStatus }) {
  const available = status === "متاحة";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-extrabold ${
        available
          ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-200"
          : "border-amber-300/25 bg-amber-400/10 text-amber-200"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          available ? "bg-emerald-300" : "bg-amber-300"
        }`}
      />
      {status}
    </span>
  );
}

function InfoBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] text-slate-500">
        {icon}
        {label}
      </div>
      <div className="truncate text-xs font-bold text-slate-200">{value}</div>
    </div>
  );
}

function SmallAction({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
        danger
          ? "border-red-300/15 bg-red-400/5 text-red-200 hover:bg-red-400/15"
          : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function FormInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-bold text-slate-300">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.045] px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-amber-300/45 focus:bg-white/[0.07]"
      />
    </label>
  );
}

function FormSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-bold text-slate-300">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-xl border border-white/10 bg-[#09251f] px-4 text-sm font-bold text-white outline-none transition focus:border-amber-300/45"
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-[#09251f] text-white">
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-[#09251f] p-5">
      <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
        {icon}
        {label}
      </div>
      <div className="font-bold text-white">{value}</div>
    </div>
  );
}
