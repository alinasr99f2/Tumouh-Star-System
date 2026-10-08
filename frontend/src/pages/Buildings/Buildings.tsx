

import { useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import { supabase } from "../../utils/supabase";
import { usePermissions } from "../../utils/permissions";
import PermissionDeniedModal from "../../components/PermissionDeniedModal";



import {

  Building2,

  Hammer,

  CheckCircle2,

  PauseCircle,

  Search,

  MapPin,

  Home,

  User,

  ChevronLeft,

  Edit3,

  X,

  Save,

  DoorOpen,

  Plus,

  Trash2,

  Archive,

  RotateCcw,

} from "lucide-react";



type BuildingStatus =

  | "قيد التنفيذ"

  | "مكتمل"

  | "متوقف";



type Building = {

  id: number;

  name: string;

  buildingNumber: string;

  city: string;

  status: BuildingStatus;

  units: number;

  occupiedUnits: number;

  vacantUnits: number;

  progress: number;

  annualRent: number;

};



type BuildingApartment = {

  status?: string;

};



const initialBuildings: Building[] = [



];



type Filter = "الكل" | BuildingStatus;



export default function Buildings() {

  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canAddBuildings = hasPermission("buildings_add");
  const canEditBuildings = hasPermission("buildings_edit");
  const canDeleteBuildings = hasPermission("buildings_delete");
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);



  const [buildings, setBuildings] =

  useState<Building[]>([]);

  const [archivedBuildings, setArchivedBuildings] = useState<Building[]>([]);

const [showArchived, setShowArchived] = useState(false);



  const [search, setSearch] = useState("");



  const [filter, setFilter] =

    useState<Filter>("الكل");



  const [editingBuilding, setEditingBuilding] =

    useState<Building | null>(null);



  const [editName, setEditName] = useState("");

  const [editCity, setEditCity] = useState("");

  const [editStatus, setEditStatus] =

    useState<BuildingStatus>("قيد التنفيذ");



  const [isSavingBuilding, setIsSavingBuilding] = useState(false);

  const [deletingBuildingId, setDeletingBuildingId] = useState<number | null>(null);



  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [newBuildingName, setNewBuildingName] = useState("");

  const [newBuildingNumber, setNewBuildingNumber] = useState("");

  const [newBuildingAddress, setNewBuildingAddress] = useState("");

  const [newBuildingUnits, setNewBuildingUnits] = useState("");

  const [isCreatingBuilding, setIsCreatingBuilding] = useState(false);



  // تحميل العمائر الفعلية من جدول buildings.

  // العمارة التجريبية الحالية تبقى ظاهرة حتى يتم نقل بياناتها إلى الجدول الموحد.

  useEffect(() => {

    let cancelled = false;



    const loadBuildings = async () => {

      const { data, error } = await supabase

  .from("buildings")

  .select("*")

  .eq("status", "active")

        .select("id, name, address, building_number, units_count, status")

        .order("id", { ascending: true });



      if (cancelled) return;



      if (error) {

        console.error("خطأ في تحميل العمائر من Supabase:", error);

        return;

      }



      if (!data) return;



      const buildingIds = data.map((row) => Number(row.id)).filter(Boolean);



      // نقرأ خريطة الشقق الفعلية لكل عمارة من building_state.

      // بهذه الطريقة الأرقام الظاهرة في كارت العمارة تكون مرتبطة بنفس

      // بيانات الشقق التي تظهر داخل صفحة خريطة الشقق الخاصة بالعمارة.

      const { data: buildingStates, error: buildingStatesError } = await supabase

        .from("building_state")

        .select("building_id, apartments")

        .in("building_id", buildingIds);



      if (buildingStatesError) {

        console.error("خطأ في تحميل بيانات شقق العمائر:", buildingStatesError);

      }



      const apartmentSummaryByBuilding = new Map<

        number,

        { total: number; rented: number; vacant: number }

      >();



      (buildingStates ?? []).forEach((state) => {

        const buildingId = Number(state.building_id);

        const apartments = Array.isArray(state.apartments)

          ? (state.apartments as BuildingApartment[])

          : [];



        const rented = apartments.filter(

          (apartment) =>

            apartment.status === "مؤجرة" ||

            apartment.status === "مؤجرة للشركة"

        ).length;



        const vacant = apartments.filter(

          (apartment) => apartment.status === "شاغرة"

        ).length;



        apartmentSummaryByBuilding.set(buildingId, {

          total: apartments.length,

          rented,

          vacant,

        });

      });



      const normalized = data.map((row) => {

        const id = Number(row.id);

        const apartmentSummary = apartmentSummaryByBuilding.get(id);



        return {

          id,

          name: row.name || "عمارة بدون اسم",

          buildingNumber: row.building_number || "",

          city: row.address || "",

          status: (

            row.status === "مكتمل" || row.status === "completed"

              ? "مكتمل"

              : row.status === "متوقف" || row.status === "stopped"

              ? "متوقف"

              : "قيد التنفيذ"

          ) as BuildingStatus,          // عدد الشقق الذي تم إدخاله عند إنشاء العمارة هو المصدر الأساسي
          // للعدد الإجمالي. لا نسمح لبيانات building_state القديمة أو الناقصة
          // أن تستبدل العدد المسجل في جدول buildings.
          units: Number(row.units_count) || 0,
          occupiedUnits: apartmentSummary?.rented ?? 0,
          vacantUnits: Math.max(
            (Number(row.units_count) || 0) - (apartmentSummary?.rented ?? 0),
            0
          ),

          progress: 0,

          annualRent: 0,

        };

      });



      setBuildings((current) => {

        const currentById = new Map<number, Building>(current.map((item) => [item.id, item] as [number, Building]));

        normalized.forEach((item) => {

          currentById.set(item.id, {

            ...currentById.get(item.id),

            ...item,

            // لا نفقد بيانات الكارت القديمة مثل نسبة الإنجاز والإيجار،

            // لكن عدد الشقق المؤجرة يجب أن يأتي دائمًا من building_state الفعلي.

            occupiedUnits: item.occupiedUnits,

            vacantUnits: item.vacantUnits,

            progress: currentById.get(item.id)?.progress ?? item.progress,

            annualRent: currentById.get(item.id)?.annualRent ?? item.annualRent,

          });

        });

        return Array.from(currentById.values());

      });

    };



    void loadBuildings();



    return () => {

      cancelled = true;

    };

  }, []);



  // تحميل العمائر المؤرشفة فقط عند فتح قسم الأرشيف.

  useEffect(() => {

    if (!showArchived) return;

    void loadArchivedBuildings();

  }, [showArchived]);



  const openCreateModal = () => {
    if (!canAddBuildings) {
      setPermissionMessage("غير مسموح للمستخدم الحالي بإضافة عمارة جديدة.");
      return;
    }

    setNewBuildingName("");

    setNewBuildingNumber("");

    setNewBuildingAddress("");

    setNewBuildingUnits("");

    setIsCreateModalOpen(true);

  };



  const closeCreateModal = () => {

    if (isCreatingBuilding) return;

    setIsCreateModalOpen(false);

    setNewBuildingName("");

    setNewBuildingNumber("");

    setNewBuildingAddress("");

    setNewBuildingUnits("");

  };



  const createBuilding = async () => {

    if (isCreatingBuilding) return;



    const name = newBuildingName.trim();

    const buildingNumber = newBuildingNumber.trim();

    const address = newBuildingAddress.trim();

    const unitsCount = Number(newBuildingUnits);



    if (!name || !buildingNumber || !address || !Number.isInteger(unitsCount) || unitsCount < 1) {

      alert("من فضلك أدخل اسم العمارة ورقمها والعنوان وعدد الشقق بشكل صحيح.");

      return;

    }



    setIsCreatingBuilding(true);



    try {

      // نستخدم الجلسة المحلية بدل getUser حتى لا نرسل طلب /auth/v1/user

      // في كل مرة نضغط فيها على حفظ. هذا يتجنب خطأ 403 المتكرر الظاهر في الـ Console.

      const {

  data: { session },

  error: sessionError,

} = await supabase.auth.getSession();



console.log("SESSION:", session);

console.log("SESSION ERROR:", sessionError);



if (sessionError) {

  throw sessionError;

}



const {

  data: userData,

  error: userError,

} = await supabase.auth.getUser();



console.log("USER:", userData.user);

console.log("USER ERROR:", userError);



if (userError) {

  throw userError;

}



const user = userData.user;



if (!user) {

  throw new Error(

    "لا توجد جلسة دخول صالحة. يجب تسجيل الدخول قبل إنشاء العمارة."

  );

}

console.log("AUTH USER ID:", user.id);

console.log("AUTH USER EMAIL:", user.email);



      const { data: building, error } = await supabase

  .from("buildings")

  .insert({

    name,

    building_number: buildingNumber,

    address,

    building_type: "عمارة سكنية",

    units_count: unitsCount,

    created_by: user.id,

  })

  .select("id, name, address, building_number, units_count, status")

  .single();



if (error) {

  console.error("BUILDING INSERT ERROR:", error);

  console.error("MESSAGE:", error.message);

  console.error("DETAILS:", error.details);

  console.error("HINT:", error.hint);

  console.error("CODE:", error.code);



  throw error;

}



console.log("BUILDING CREATED:", building);

      // تهيئة حالة الشقق مباشرة بالعدد الذي أدخله المستخدم.
      // هذا يمنع أي building_state قديم/ناقص من إظهار عدد مختلف في صفحة العمائر.
      const initialApartments = Array.from(
        { length: unitsCount },
        (_, index) => ({
          number: index + 1,
          type: "غير محدد",
          rent: 0,
          status: "شاغرة",
          tenant: "لا يوجد مستأجر",
        })
      );

      const { error: buildingStateError } = await supabase
        .from("building_state")
        .upsert(
          {
            building_id: Number(building.id),
            apartments: initialApartments,
            apartment_types: {},
            custom_apartment_types: [],
            custom_apartment_statuses: [],
            apartment_type_rents: {},
            apartment_extra_info: {},
            apartment_tenant_info: {},
            apartment_contract_info: {},
            building_charges: [],
            building_collections: [],
            updated_at: new Date().toISOString(),
          },
          { onConflict: "building_id" }
        );

      if (buildingStateError) {
        // إنشاء العمارة الأساسية تم بالفعل؛ لا نفشل العملية كلها إذا تعذر
        // تهيئة building_state، لأن الصفحة تستطيع الرجوع إلى units_count.
        console.warn("تعذر تهيئة خريطة شقق العمارة الجديدة:", buildingStateError);
      }




    if (!building) {

  throw new Error("تم إنشاء العمارة لكن لم يتم إرجاع بياناتها.");

}



      const newBuilding: Building = {

  id: Number(building.id),

  name: building.name,

  buildingNumber: building.building_number || buildingNumber,

  city: building.address || address,

  status: "قيد التنفيذ",

  units: Number(building.units_count) || 0,

  occupiedUnits: 0,

        vacantUnits: Number(building.units_count) || 0,

        progress: 0,

        annualRent: 0,

      };



      setBuildings((current) => [...current, newBuilding]);

      closeCreateModal();



      // فتح صفحة العمارة الجديدة مباشرة بعد إنشائها.

      navigate(`/buildings/${newBuilding.id}`);

    } catch (error) {

      console.error("خطأ في إنشاء العمارة:", error);

      alert("تعذر إنشاء العمارة. تأكد من صلاحيات قاعدة البيانات ثم حاول مرة أخرى.");

    } finally {

      setIsCreatingBuilding(false);

    }

  };



  const filteredBuildings = useMemo(() => {

    return buildings.filter((building) => {

      const normalizedSearch = search

        .trim()

        .toLowerCase();



      const matchesSearch =

        building.name

          .toLowerCase()

          .includes(normalizedSearch) ||

        building.city

          .toLowerCase()

          .includes(normalizedSearch);



      const matchesFilter =

        filter === "الكل" ||

        building.status === filter;



      return matchesSearch && matchesFilter;

    });

  }, [buildings, search, filter]);



  const stats = [

    {

      title: "إجمالي العمائر",

      value: buildings.length,

      icon: Building2,

      iconClass: "text-[#F6D878]",

      borderClass: "border-[#C49A3A]/40",

      bgClass: "bg-[#C49A3A]/10",

      glowClass: "shadow-[#C49A3A]/10",

    },

    {

      title: "قيد التنفيذ",

      value: buildings.filter(

        (building) =>

          building.status === "قيد التنفيذ"

      ).length,

      icon: Hammer,

      iconClass: "text-[#F6D878]",

      borderClass: "border-[#C49A3A]/40",

      bgClass: "bg-[#C49A3A]/10",

      glowClass: "shadow-[#C49A3A]/10",

    },

    {

      title: "مكتمل",

      value: buildings.filter(

        (building) =>

          building.status === "مكتمل"

      ).length,

      icon: CheckCircle2,

      iconClass: "text-emerald-300",

      borderClass: "border-emerald-400/30",

      bgClass: "bg-emerald-400/10",

      glowClass: "shadow-emerald-500/10",

    },

    {

      title: "متوقف",

      value: buildings.filter(

        (building) =>

          building.status === "متوقف"

      ).length,

      icon: PauseCircle,

      iconClass: "text-red-300",

      borderClass: "border-red-400/30",

      bgClass: "bg-red-400/10",

      glowClass: "shadow-red-500/10",

    },

  ];



  const openEditModal = (building: Building) => {
    if (!canEditBuildings) {
      setPermissionMessage("غير مسموح للمستخدم الحالي بتعديل بيانات العمارة.");
      return;
    }


    setEditingBuilding(building);

    setEditName(building.name);

    setEditCity(building.city);

    setEditStatus(building.status);

  };



  const closeEditModal = () => {

    setEditingBuilding(null);

    setEditName("");

    setEditCity("");

    setEditStatus("قيد التنفيذ");

  };



  const saveBuildingChanges = async () => {
    if (!canEditBuildings) {
      setPermissionMessage("غير مسموح للمستخدم الحالي بهذا الإجراء.");
      return;
    }


    if (!editingBuilding || isSavingBuilding) return;



    const trimmedName = editName.trim();

    const trimmedCity = editCity.trim();



    if (!trimmedName || !trimmedCity) {

      alert("من فضلك أدخل اسم العمارة والعنوان.");

      return;

    }



    setIsSavingBuilding(true);



    try {

      const databaseStatus =

        editStatus === "مكتمل"

          ? "completed"

          : editStatus === "متوقف"

          ? "stopped"

          : "active";



      const { error } = await supabase

        .from("buildings")

        .update({

          name: trimmedName,

          address: trimmedCity,

          status: databaseStatus,

        })

        .eq("id", editingBuilding.id);



      if (error) {

        throw error;

      }



      setBuildings((previousBuildings) =>

        previousBuildings.map((building) =>

          building.id === editingBuilding.id

            ? {

                ...building,

                name: trimmedName,

                city: trimmedCity,

                status: editStatus,

              }

            : building

        )

      );



      closeEditModal();

    } catch (error) {

      console.error("خطأ في حفظ بيانات العمارة:", error);

      alert(

        "تعذر حفظ بيانات العمارة في قاعدة البيانات. تأكد من إضافة حقول بيانات العمارة إلى جدول building_state."

      );

    } finally {

      setIsSavingBuilding(false);

    }

  };



  // تحميل العمائر المؤرشفة عند الحاجة.

  const loadArchivedBuildings = async () => {

    const { data, error } = await supabase

      .from("buildings")

      .select("id, name, address, building_number, units_count, status, archived_at")

      .eq("status", "archived")

      .order("archived_at", { ascending: false });



    if (error) {

      console.error("خطأ في تحميل العمائر المؤرشفة:", error);

      return;

    }



    const normalizedArchivedBuildings: Building[] = (data ?? []).map((row) => ({

      id: Number(row.id),

      name: row.name || "عمارة بدون اسم",

      buildingNumber: row.building_number || "",

      city: row.address || "",

      status: "قيد التنفيذ",

      units: Number(row.units_count) || 0,

      occupiedUnits: 0,

      vacantUnits: Number(row.units_count) || 0,

      progress: 0,

      annualRent: 0,

    }));



    setArchivedBuildings(normalizedArchivedBuildings);

  };



  // استعادة عمارة مؤرشفة وإعادتها إلى قائمة العمائر النشطة.

  const restoreBuilding = async (building: Building) => {
    if (!canEditBuildings) {
      setPermissionMessage("غير مسموح للمستخدم الحالي باستعادة العمارة.");
      return;
    }


    try {

      const { error } = await supabase

        .from("buildings")

        .update({

          status: "active",

          archived_at: null,

        })

        .eq("id", building.id);



      if (error) throw error;



      setArchivedBuildings((previousBuildings) =>

        previousBuildings.filter((item) => item.id !== building.id)

      );



      setBuildings((previousBuildings) => [

        ...previousBuildings,

        {

          ...building,

          status: "قيد التنفيذ",

        },

      ]);

    } catch (error) {

      console.error("خطأ في استعادة العمارة:", error);

      alert("تعذر استعادة العمارة. حاول مرة أخرى.");

    }

  };



  const deleteBuilding = async (building: Building) => {
    if (!canDeleteBuildings) {
      setPermissionMessage("غير مسموح للمستخدم الحالي بحذف العمارة.");
      return;
    }


    if (deletingBuildingId !== null) return;



    const confirmed = window.confirm(

      `هل أنت متأكد من حذف العمارة "${building.name}"؟\n\nسيتم حذف العمارة من قائمة العمائر. لا يمكن التراجع عن هذا الإجراء.`

    );



    if (!confirmed) return;



    setDeletingBuildingId(building.id);



    try {

      const { error } = await supabase

        .from("buildings")

  .update({

    status: "archived",

    archived_at: new Date().toISOString(),

  })

  .eq("id", building.id);





      if (error) throw error;



      setBuildings((previousBuildings) =>

        previousBuildings.filter((item) => item.id !== building.id)

      );



      if (showArchived) {

        void loadArchivedBuildings();

      }



      if (editingBuilding?.id === building.id) closeEditModal();

    } catch (error) {

      console.error("خطأ في حذف العمارة:", error);

      alert(

        "تعذر حذف العمارة. قد تكون مرتبطة ببيانات أخرى في النظام، وفي هذه الحالة يجب حذف أو فك الارتباط بالبيانات المرتبطة أولًا."

      );

    } finally {

      setDeletingBuildingId(null);

    }

  };



  return (

    <>

      <div

        className="space-y-8 pb-8"

        dir="rtl"

      >

        {/* =========================

            عنوان الصفحة

        ========================= */}



        <div className="flex flex-col items-center justify-center gap-4 text-center">

          <div>

            <h1 className="text-3xl font-extrabold text-white md:text-4xl">

              العمائر

            </h1>



            <p className="mt-3 text-base text-[#B4CEC5]">

              إدارة جميع عمائر شركة طموح ستار

            </p>

          </div>



          <div className="flex flex-wrap items-center justify-center gap-3">

            {canAddBuildings && (
            <button

              type="button"

              onClick={openCreateModal}

              className="

                rounded-2xl

                border border-[#D4AD4D]

                bg-gradient-to-r from-[#C49A3A] to-[#F6D878]

                px-6 py-3

                font-bold

                text-[#16352B]

                shadow-lg shadow-[#C49A3A]/10

                transition-all duration-300

                hover:-translate-y-0.5

                hover:shadow-xl

              "

            >

              + عمارة جديدة

            </button>
            )}



            <button

              type="button"

              onClick={() => setShowArchived((current) => !current)}

              className="

                flex items-center gap-2 rounded-2xl

                border border-white/15

                bg-white/5 px-6 py-3

                font-bold text-[#D5E5DE]

                transition-all duration-300

                hover:-translate-y-0.5 hover:bg-white/10

                hover:text-white

              "

            >

              <Archive size={18} />

              {showArchived ? "إخفاء الأرشيف" : "العمائر المؤرشفة"}

            </button>

          </div>

        </div>



        {/* =========================

            البحث

        ========================= */}



        <div className="flex justify-center">

          <div className="group relative w-full max-w-xl">

            <Search

              size={21}

              className="

                absolute right-4 top-1/2

                -translate-y-1/2

                text-[#9ABDB0]

                transition-colors

                group-focus-within:text-[#F6D878]

              "

            />



            <input

              value={search}

              onChange={(event) =>

                setSearch(event.target.value)

              }

              placeholder="ابحث باسم العمارة أو المدينة..."

              className="

                w-full

                rounded-2xl

                border border-[#C49A3A]/30

                bg-gradient-to-r

                from-[#0B4537]

                via-[#073529]

                to-[#05261F]

                py-4

                pr-12 pl-5

                text-base

                text-white

                placeholder:text-[#8EADA2]

                shadow-lg shadow-black/10

                outline-none

                transition-all duration-300

                hover:border-[#C49A3A]/60

                focus:border-[#D4AD4D]

                focus:ring-2

                focus:ring-[#D4AD4D]/20

              "

            />

          </div>

        </div>



        {/* =========================

            الفلاتر

        ========================= */}



        <div className="flex flex-wrap items-center justify-center gap-3">

          {(

            [

              "الكل",

              "قيد التنفيذ",

              "مكتمل",

              "متوقف",

            ] as Filter[]

          ).map((item) => {

            const isActive = filter === item;



            return (

              <button

                key={item}

                type="button"

                onClick={() => setFilter(item)}

                className={`

                  min-w-[125px]

                  rounded-2xl

                  border

                  px-6 py-3

                  text-sm

                  font-bold

                  transition-all duration-300

                  ${

                    isActive

                      ? `

                        border-[#D4AD4D]

                        bg-gradient-to-r

                        from-[#C49A3A]

                        to-[#F6D878]

                        text-[#16352B]

                        shadow-lg

                        shadow-[#C49A3A]/20

                      `

                      : `

                        border-[#C49A3A]/25

                        bg-gradient-to-r

                        from-[#0B4537]

                        to-[#05261F]

                        text-[#C5D9D1]

                        hover:-translate-y-0.5

                        hover:border-[#D4AD4D]

                        hover:text-[#F6D878]

                        hover:shadow-lg

                        hover:shadow-[#C49A3A]/10

                      `

                  }

                `}

              >

                {item}

              </button>

            );

          })}

        </div>



        {/* =========================

            الإحصائيات

        ========================= */}



        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">

          {stats.map((item) => {

            const Icon = item.icon;



            return (

              <div

                key={item.title}

                className={`

                  group

                  relative

                  overflow-hidden

                  rounded-2xl

                  border

                  ${item.borderClass}

                  bg-gradient-to-br

                  from-[#0B4537]

                  via-[#073529]

                  to-[#05261F]

                  p-6

                  text-center

                  shadow-lg

                  ${item.glowClass}

                  transition-all duration-300

                  hover:-translate-y-1

                  hover:shadow-xl

                `}

              >

                <div className="flex flex-col items-center gap-3">

                  <div

                    className={`

                      flex h-14 w-14

                      items-center justify-center

                      rounded-2xl

                      border

                      ${item.borderClass}

                      ${item.bgClass}

                      transition-transform duration-300

                      group-hover:scale-110

                    `}

                  >

                    <Icon

                      size={28}

                      className={item.iconClass}

                    />

                  </div>



                  <p className="text-sm font-semibold text-[#B4CEC5]">

                    {item.title}

                  </p>



                  <h2 className="text-4xl font-extrabold leading-none text-white">

                    {item.value}

                  </h2>

                </div>



                <div

                  className="

                    absolute bottom-0 left-1/2

                    h-1 w-0

                    -translate-x-1/2

                    rounded-full

                    bg-[#D4AD4D]

                    transition-all duration-300

                    group-hover:w-1/3

                  "

                />

              </div>

            );

          })}

        </div>



        {/* =========================

            عنوان قائمة العمائر

        ========================= */}



        <div className="space-y-5">

          <div className="flex flex-col items-center justify-center gap-3 text-center">

            <div className="flex items-center justify-center gap-3">

              <div

                className="

                  flex h-12 w-12

                  items-center justify-center

                  rounded-2xl

                  border border-[#C49A3A]/50

                  bg-[#C49A3A]/10

                "

              >

                <Building2

                  size={25}

                  className="text-[#F6D878]"

                />

              </div>



              <h2 className="text-2xl font-extrabold text-white md:text-3xl">

                قائمة العمائر

              </h2>

            </div>



            <span

              className="

                rounded-full

                border border-[#C49A3A]/30

                bg-[#C49A3A]/10

                px-5 py-2

                text-sm font-semibold

                text-[#F6D878]

              "

            >

              {filteredBuildings.length} عمارة

            </span>

          </div>



          {/* =========================

              قائمة الكروت

          ========================= */}



          {filteredBuildings.length === 0 ? (

            <div

              className="

                rounded-2xl

                border border-dashed border-[#C49A3A]/40

                bg-gradient-to-br

                from-[#0B4537]

                via-[#073529]

                to-[#05261F]

                p-12

                text-center

                text-[#8EADA2]

              "

            >

              لا توجد عمائر مطابقة للبحث أو الفلتر.

            </div>

          ) : (

            <div className="grid gap-6 xl:grid-cols-2">

              {filteredBuildings.map((building) => {

                const occupancy =

                  building.units > 0

                    ? Math.round(

                        (building.occupiedUnits /

                          building.units) *

                          100

                      )

                    : 0;



                const vacantUnits = building.vacantUnits;



                return (

                  <div

                    key={building.id}

                    className="

                      overflow-hidden

                      rounded-3xl

                      border border-[#C49A3A]/25

                      bg-gradient-to-br

                      from-[#0B4537]

                      via-[#073529]

                      to-[#05261F]

                      shadow-xl shadow-black/10

                      transition-all duration-300

                      hover:border-[#C49A3A]/55

                      hover:shadow-2xl

                    "

                  >

                    {/* =====================

                        رأس الكارت

                    ===================== */}



                    <div

                      className="

                        border-b border-white/10

                        px-7 py-7

                      "

                    >

                      <div className="flex items-start justify-between gap-4">

                        <div className="flex min-w-0 items-start gap-4">

                          <div

                            className="

                              flex h-14 w-14 shrink-0

                              items-center justify-center

                              rounded-2xl

                              border border-[#C49A3A]/40

                              bg-[#C49A3A]/10

                            "

                          >

                            <Building2

                              size={29}

                              className="text-[#F6D878]"

                            />

                          </div>



                          <div className="min-w-0">

                            <div className="flex flex-wrap items-center gap-2">

                              <h3 className="text-xl font-extrabold text-white">

                                {building.name}

                              </h3>



                              <span

                                className="

                                  rounded-full

                                  border border-[#C49A3A]/35

                                  bg-[#C49A3A]/10

                                  px-3 py-1

                                  text-xs font-bold

                                  text-[#F6D878]

                                "

                              >

                                {building.status}

                              </span>

                            </div>



                            <div

                              className="

                                mt-2 flex items-center

                                gap-1.5

                                text-sm

                                text-[#B4CEC5]

                              "

                            >

                              <MapPin size={16} />

                              <span>{building.city}</span>

                              {building.buildingNumber && (

                                <span className="mr-2 text-[#F6D878]">

                                  • رقم {building.buildingNumber}

                                </span>

                              )}

                            </div>

                          </div>

                        </div>



                        {/* أزرار تعديل وحذف العمارة */}

                        <div className="flex shrink-0 items-center gap-2">

                          

                          {canEditBuildings && (
<button

                            type="button"

                            title="تعديل بيانات العمارة"

                            onClick={() => openEditModal(building)}

                            disabled={deletingBuildingId === building.id}

                            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#C49A3A]/40 bg-[#C49A3A]/10 text-[#F6D878] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#D4AD4D] hover:bg-[#C49A3A]/25 disabled:cursor-not-allowed disabled:opacity-50"

                          >

                            <Edit3 size={19} />

                          </button>
                          )}



                          



                          {canDeleteBuildings && (
<button

                            type="button"

                            title="حذف العمارة"

                            onClick={() => void deleteBuilding(building)}

                            disabled={deletingBuildingId === building.id}

                            className="flex h-11 w-11 items-center justify-center rounded-xl border border-red-400/35 bg-red-500/10 text-red-300 transition-all duration-300 hover:-translate-y-0.5 hover:border-red-400/70 hover:bg-red-500/20 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"

                          >

                            {deletingBuildingId === building.id ? (

                              <span className="text-xs font-extrabold">...</span>

                            ) : (

                              <Trash2 size={19} />

                            )}

                          </button>
                          )}

                        </div>

                      </div>

                    </div>



                    {/* =====================

                        بيانات العمارة

                    ===================== */}



                    <div

                      className="

                        grid

                        grid-cols-2

                        divide-x divide-x-reverse

                        divide-y

                        divide-white/10

                        md:grid-cols-4

                        md:divide-y-0

                      "

                    >

                      {/* إجمالي الشقق الفعلي داخل العمارة */}

                      <div className="flex min-h-[142px] flex-col items-center justify-center p-5 text-center">

                        <Home

                          size={21}

                          className="mx-auto mb-3 text-[#F6D878]"

                        />



                        <p className="text-sm font-semibold text-[#B4CEC5]">

                          إجمالي الشقق

                        </p>



                        <p className="mt-2 text-xl font-extrabold text-white">

                          {building.units}

                        </p>

                      </div>



                      {/* إجمالي الشقق المؤجرة الفعلي */}

                      <div className="flex min-h-[142px] flex-col items-center justify-center p-5 text-center">

                        <User

                          size={21}

                          className="mx-auto mb-3 text-emerald-300"

                        />



                        <p className="text-sm font-semibold text-[#B4CEC5]">

                          الشقق المؤجرة

                        </p>



                        <p className="mt-2 text-xl font-extrabold text-white">

                          {building.occupiedUnits}

                        </p>

                      </div>



                      {/* إجمالي الشقق الفارغة الفعلي */}

                      <div className="flex min-h-[142px] flex-col items-center justify-center p-5 text-center">

                        <DoorOpen

                          size={21}

                          className="mx-auto mb-3 text-red-300"

                        />



                        <p className="text-sm font-semibold text-[#B4CEC5]">

                          الشقق الفارغة

                        </p>



                        <p className="mt-2 text-xl font-extrabold text-white">

                          {vacantUnits}

                        </p>

                      </div>



                      {/* نسبة الإشغال الفعلية */}

                      <div className="flex min-h-[142px] flex-col items-center justify-center p-5 text-center">

                        <Building2

                          size={21}

                          className="mx-auto mb-3 text-[#D4AD4D]"

                        />



                        <p className="text-sm font-semibold text-[#B4CEC5]">

                          نسبة الإشغال

                        </p>



                        <p className="mt-2 text-xl font-extrabold text-white">

                          {occupancy}%

                        </p>

                      </div>

                    </div>



                   {/* =====================

    نسبة الإشغال

\===================== */}



<div

  className="

    border-t border-white/10

    px-7 py-7

  "

>

  <div className="mb-3 flex items-center justify-between text-sm">

    <span className="font-semibold text-[#B4CEC5]">

      نسبة الإشغال

    </span>



    <span className="font-extrabold text-[#F6D878]">

      {occupancy}%

    </span>

  </div>



  <div

    className="

      h-3

      overflow-hidden

      rounded-full

      bg-[#031F18]

    "

  >

    <div

      className="

        h-full

        rounded-full

        bg-gradient-to-r

        from-[#B88B2D]

        to-[#F6D878]

        transition-all duration-500

      "

      style={{

        width: `${Math.min(Math.max(occupancy, 0), 100)}%`,

      }}

    />

  </div>



  {/* زر عرض التفاصيل */}

  <button

    type="button"

    onClick={() =>

      navigate(

        `/buildings/${building.id}`

      )

    }

    className="

      mt-6

      flex min-h-[58px] w-full

      items-center justify-center

      gap-2

      rounded-2xl

      border border-[#C49A3A]/40

      bg-[#C49A3A]/10

      px-6 py-5

      text-base

      font-extrabold

      text-[#F6D878]

      transition-all duration-300

      hover:-translate-y-0.5

      hover:bg-gradient-to-r

      hover:from-[#C49A3A]

      hover:to-[#F6D878]

      hover:text-[#16352B]

    "

  >

    عرض تفاصيل العمارة



    <ChevronLeft size={19} />

  </button>

</div>

                  </div>

                );

              })}

            </div>

          )}

        </div>

      </div>



      {showArchived && (

        <div className="mt-8 space-y-5" dir="rtl">

          <div className="flex items-center justify-center gap-3 text-center">

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/5">

              <Archive size={24} className="text-[#F6D878]" />

            </div>

            <div>

              <h2 className="text-2xl font-extrabold text-white">العمائر المؤرشفة</h2>

              <p className="mt-1 text-sm text-[#8EADA2]">يمكنك استعادة أي عمارة وإعادتها إلى القائمة النشطة.</p>

            </div>

          </div>



          {archivedBuildings.length === 0 ? (

            <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-10 text-center text-[#8EADA2]">

              لا توجد عمائر مؤرشفة حاليًا.

            </div>

          ) : (

            <div className="grid gap-4 xl:grid-cols-2">

              {archivedBuildings.map((building) => (

                <div

                  key={building.id}

                  className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-[#0B4537] via-[#073529] to-[#05261F] p-5 shadow-lg"

                >

                  <div className="flex items-start justify-between gap-4">

                    <div className="min-w-0">

                      <h3 className="text-lg font-extrabold text-white">{building.name}</h3>

                      <p className="mt-1 text-sm text-[#B4CEC5]">

                        {building.city}

                        {building.buildingNumber && ` • رقم ${building.buildingNumber}`}

                      </p>

                    </div>

                    <span className="shrink-0 rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-300">

                      مؤرشفة

                    </span>

                  </div>



                  



                  {canEditBuildings && (
<button

                    type="button"

                    onClick={() => void restoreBuilding(building)}

                    className="flex items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 font-extrabold text-emerald-300 transition hover:bg-emerald-500/20"

                  >

                    <RotateCcw size={18} />

                    استعادة العمارة

                  </button>
                  )}

                </div>

              ))}

            </div>

          )}

        </div>

      )}



      {/* =========================

          نافذة إنشاء عمارة جديدة

      ========================= */}

      {isCreateModalOpen && (

        <div

          className="fixed inset-0 z-50 flex items-center justify-center bg-[#001b15]/82 p-4 backdrop-blur-md md:p-6"

          dir="rtl"

        >

          <div

            className="relative flex max-h-[92vh] w-full max-w-[1180px] overflow-hidden rounded-[2rem] border border-[#D4AD4D]/60 bg-[#05261F] shadow-[0_35px_110px_rgba(0,0,0,0.62)]"

          >

            {/* صورة الهوية الخاصة بالنافذة */}

            <div

              className="absolute inset-0 bg-cover bg-center"

              style={{ backgroundImage: "url('/add building.png')" }}

            />

            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,28,23,0.90)\_0%,rgba(3,38,30,0.80)\_38%,rgba(3,30,24,0.95)\_60%,rgba(2,24,19,0.97)\_100%)]" />

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%\_18%,rgba(246,216,120,0.12),transparent_28%),radial-gradient(circle_at_82%\_82%,rgba(20,112,88,0.16),transparent_35%)]" />



            {/* زر الإغلاق */}

            <button

              type="button"

              onClick={closeCreateModal}

              disabled={isCreatingBuilding}

              className="absolute left-5 top-5 z-30 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-[#06271F]/65 text-[#D5E5DE] shadow-lg backdrop-blur-md transition-all duration-300 hover:border-[#D4AD4D]/70 hover:bg-[#C49A3A]/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"

              title="إغلاق"

            >

              <X size={22} />

            </button>



            {/* =========================

                الجهة اليمنى — البيانات واللوجو

            ========================= */}

            <section className="relative z-10 flex min-h-[700px] w-full flex-col overflow-y-auto border-l border-white/10 px-6 pb-6 pt-8 sm:px-8 lg:w-[60%] lg:px-9 lg:pb-7 lg:pt-9">

              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(1,24,19,0.12),rgba(1,24,19,0.05)\_55%,rgba(1,24,19,0.55)\_100%)]" />

              {/* رأس النموذج */}

              <div className="relative z-10 mb-5 flex items-start justify-between gap-5 pl-12">

                <div className="flex items-start gap-4">

                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#D4AD4D]/60 bg-[#C49A3A]/15 shadow-lg shadow-[#C49A3A]/10">

                    <Plus size={27} strokeWidth={2.4} className="text-[#F6D878]" />

                  </div>

                  <div>

                    <p className="mb-1 text-xs font-extrabold tracking-[0.22em] text-[#C49A3A]">

                      AQARY SMART

                    </p>

                    <h2 className="text-2xl font-black text-white sm:text-[1.9rem]">

                      إضافة عمارة جديدة

                    </h2>

                    <p className="mt-1 text-sm font-semibold text-[#AFC8BE]">

                      أدخل بيانات العمارة وسيتم إنشاؤها داخل النظام

                    </p>

                  </div>

                </div>

              </div>



              {/* الحقول */}

              <div className="relative z-10 pr-1 [scrollbar-width:thin] [scrollbar-color:#C49A3A55_transparent]">

                <div className="grid gap-4 sm:grid-cols-2">

                  {/* اسم العمارة */}

                  <div className="rounded-[1.35rem] border border-white/10 bg-[#03251D]/55 p-4 shadow-inner shadow-black/20 backdrop-blur-md">

                    <label

                      htmlFor="create-building-name"

                      className="mb-2.5 block text-sm font-black text-[#F2F7F4]"

                    >

                      اسم العمارة

                    </label>

                    <div className="rounded-xl border border-[#D4AD4D]/35 bg-[#021D17]/70 p-1.5 transition-all duration-300 focus-within:border-[#D4AD4D]/80 focus-within:shadow-[0_0_0_3px_rgba(212,173,77,0.10)]">

                      <input

                        id="create-building-name"

                        autoFocus

                        value={newBuildingName}

                        onChange={(event) => setNewBuildingName(event.target.value)}

                        placeholder="مثال: عمارة النخيل"

                        className="h-14 w-full rounded-lg border-0 bg-transparent px-4 text-base font-semibold text-white outline-none placeholder:text-[#78998E]"

                      />

                    </div>

                  </div>



                  {/* رقم العمارة */}

                  <div className="rounded-[1.35rem] border border-white/10 bg-[#03251D]/55 p-4 shadow-inner shadow-black/20 backdrop-blur-md">

                    <label

                      htmlFor="create-building-number"

                      className="mb-2.5 block text-sm font-black text-[#F2F7F4]"

                    >

                      رقم العمارة

                    </label>

                    <div className="rounded-xl border border-[#D4AD4D]/35 bg-[#021D17]/70 p-1.5 transition-all duration-300 focus-within:border-[#D4AD4D]/80 focus-within:shadow-[0_0_0_3px_rgba(212,173,77,0.10)]">

                      <input

                        id="create-building-number"

                        value={newBuildingNumber}

                        onChange={(event) => setNewBuildingNumber(event.target.value)}

                        placeholder="مثال: 2"

                        className="h-14 w-full rounded-lg border-0 bg-transparent px-4 text-base font-semibold text-white outline-none placeholder:text-[#78998E]"

                      />

                    </div>

                  </div>



                  {/* العنوان */}

                  <div className="rounded-[1.35rem] border border-white/10 bg-[#03251D]/55 p-4 shadow-inner shadow-black/20 backdrop-blur-md">

                    <label

                      htmlFor="create-building-address"

                      className="mb-2.5 block text-sm font-black text-[#F2F7F4]"

                    >

                      العنوان / المدينة

                    </label>

                    <div className="rounded-xl border border-[#D4AD4D]/35 bg-[#021D17]/70 p-1.5 transition-all duration-300 focus-within:border-[#D4AD4D]/80 focus-within:shadow-[0_0_0_3px_rgba(212,173,77,0.10)]">

                      <input

                        id="create-building-address"

                        value={newBuildingAddress}

                        onChange={(event) => setNewBuildingAddress(event.target.value)}

                        placeholder="مثال: الجبيل البلد"

                        className="h-14 w-full rounded-lg border-0 bg-transparent px-4 text-base font-semibold text-white outline-none placeholder:text-[#78998E]"

                      />

                    </div>

                  </div>



                  {/* عدد الشقق */}

                  <div className="rounded-[1.35rem] border border-white/10 bg-[#03251D]/55 p-4 shadow-inner shadow-black/20 backdrop-blur-md">

                    <label

                      htmlFor="create-building-units"

                      className="mb-2.5 block text-sm font-black text-[#F2F7F4]"

                    >

                      عدد الشقق

                    </label>

                    <div className="rounded-xl border border-[#D4AD4D]/35 bg-[#021D17]/70 p-1.5 transition-all duration-300 focus-within:border-[#D4AD4D]/80 focus-within:shadow-[0_0_0_3px_rgba(212,173,77,0.10)]">

                      <input

                        id="create-building-units"

                        type="number"

                        min="1"

                        step="1"

                        value={newBuildingUnits}

                        onChange={(event) => setNewBuildingUnits(event.target.value)}

                        placeholder="مثال: 24"

                        className="h-14 w-full rounded-lg border-0 bg-transparent px-4 text-base font-semibold text-white outline-none placeholder:text-[#78998E]"

                      />

                    </div>

                    <p className="mt-2 px-1 text-xs font-semibold leading-5 text-[#91B1A5]">

                      سيتم إنشاء هذا العدد من الشقق فارغًا داخل العمارة الجديدة.

                    </p>

                  </div>

                </div>



                {/* ملاحظة */}

                <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[#D4AD4D]/55 bg-[#0A3A2D]/55 px-5 py-4 backdrop-blur-md">

                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#D4AD4D]/20 text-lg font-black text-[#F6D878]">

                    i

                  </div>

                  <div>

                    <p className="text-sm font-black text-[#F6D878]">معلومة مهمة</p>

                    <p className="mt-1 text-xs font-semibold leading-6 text-[#C7D9D2]">

                      رقم العمارة يُستخدم كرقم تعريفي للعقار داخل النظام، بينما يمكن أن يتكرر رقم العقار الفعلي في مواقع مختلفة.

                    </p>

                  </div>

                </div>

              </div>



              {/* الأزرار */}

              <div className="relative z-10 mt-5 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-2">

                <button

                  type="button"

                  onClick={createBuilding}

                  disabled={isCreatingBuilding}

                  className="group flex min-h-[58px] items-center justify-center gap-2.5 rounded-2xl border border-[#F6D878]/70 bg-gradient-to-r from-[#B88B2D] via-[#D4AD4D] to-[#F6D878] px-6 text-base font-black text-[#12352B] shadow-[0_12px_30px_rgba(196,154,58,0.20)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_16px_36px_rgba(196,154,58,0.30)] disabled:cursor-not-allowed disabled:opacity-60"

                >

                  <Save size={19} className="transition-transform duration-300 group-hover:scale-110" />

                  {isCreatingBuilding ? "جارٍ الإنشاء..." : "حفظ وإنشاء العمارة"}

                </button>



                <button

                  type="button"

                  onClick={closeCreateModal}

                  disabled={isCreatingBuilding}

                  className="flex min-h-[58px] items-center justify-center gap-2 rounded-2xl border border-white/15 bg-[#03271F]/70 px-6 text-base font-bold text-[#D5E5DE] backdrop-blur-md transition-all duration-300 hover:border-white/25 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"

                >

                  إلغاء

                  <X size={17} />

                </button>

              </div>



              {/* اللوجو أسفل مربعات الإدخال في نفس الجهة اليمنى */}

              <div className="relative z-10 mt-6 flex w-full items-center justify-center">

                <div className="flex w-full max-w-[430px] items-center justify-center rounded-[2rem] border border-[#D4AD4D]/35 bg-[#031F18]/35 px-7 py-6 shadow-[0_18px_55px_rgba(0,0,0,0.28)] backdrop-blur-[2px]">

                  <img

                    src="/aqar-smart-logo.png"

                    alt="عقاري سمارت"

                    className="h-auto w-full max-w-[360px] object-contain drop-shadow-[0_18px_25px_rgba(0,0,0,0.45)]"

                  />

                </div>

              </div>

            </section>



            {/* =========================

                الجهة اليسرى — الهوية

            ========================= */}

            <section className="relative hidden min-h-[700px] w-[40%] flex-col justify-center overflow-hidden px-8 pb-8 pt-10 lg:flex">

              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(1,24,19,0.20),rgba(1,24,19,0.08)\_45%,rgba(1,24,19,0.78)\_100%)]" />

              <div className="relative z-10 text-center">

                <p className="mb-2 text-xs font-extrabold tracking-[0.28em] text-[#C49A3A]">

                  AQARY SMART ERP

                </p>

                <h3 className="text-3xl font-black leading-tight text-white xl:text-[2.15rem]">

                  أضف عمارتك الجديدة

                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-[#C8D9D2]">

                  وابدأ إدارة عقارك باحترافية من خلال نظام عقاري سمارت.

                </p>

              </div>

            </section>

          </div>

        </div>

      )}



      {/* =========================

          نافذة تعديل بيانات العمارة

      ========================= */}



      {editingBuilding && (

        <div

          className="

            fixed inset-0 z-50

            flex items-center justify-center

            bg-black/70

            p-4

            backdrop-blur-sm

          "

          dir="rtl"

        >

          <div

            className="

              w-full max-w-lg

              overflow-hidden

              rounded-3xl

              border border-[#C49A3A]/40

              bg-gradient-to-br

              from-[#0B4537]

              via-[#073529]

              to-[#05261F]

              shadow-2xl shadow-black/40

            "

          >

            {/* رأس النافذة */}

            <div

              className="

                flex items-center justify-between

                border-b border-white/10

                px-6 py-5

              "

            >

              <div className="flex items-center gap-3">

                <div

                  className="

                    flex h-11 w-11

                    items-center justify-center

                    rounded-xl

                    border border-[#C49A3A]/40

                    bg-[#C49A3A]/10

                  "

                >

                  <Edit3

                    size={20}

                    className="text-[#F6D878]"

                  />

                </div>



                <h2 className="text-xl font-extrabold text-white">

                  تعديل بيانات العمارة

                </h2>

              </div>



              <button

                type="button"

                onClick={closeEditModal}

                className="

                  flex h-10 w-10

                  items-center justify-center

                  rounded-xl

                  text-[#B4CEC5]

                  transition

                  hover:bg-white/10

                  hover:text-white

                "

                title="إغلاق"

              >

                <X size={21} />

              </button>

            </div>



            {/* محتوى النافذة */}

            <div className="space-y-5 p-6">

              {/* اسم العمارة */}

              <div>

                <label

                  htmlFor="building-name"

                  className="mb-2 block text-sm font-bold text-[#D5E5DE]"

                >

                  اسم العمارة

                </label>



                <input

                  id="building-name"

                  type="text"

                  value={editName}

                  onChange={(event) =>

                    setEditName(event.target.value)

                  }

                  className="

                    w-full

                    rounded-xl

                    border border-[#C49A3A]/30

                    bg-[#031F18]/70

                    px-4 py-3

                    text-white

                    outline-none

                    transition

                    placeholder:text-[#8EADA2]

                    focus:border-[#D4AD4D]

                    focus:ring-2

                    focus:ring-[#D4AD4D]/20

                  "

                  placeholder="اكتب اسم العمارة"

                />

              </div>



              {/* العنوان */}

              <div>

                <label

                  htmlFor="building-city"

                  className="mb-2 block text-sm font-bold text-[#D5E5DE]"

                >

                  العنوان / المدينة

                </label>



                <input

                  id="building-city"

                  type="text"

                  value={editCity}

                  onChange={(event) =>

                    setEditCity(event.target.value)

                  }

                  className="

                    w-full

                    rounded-xl

                    border border-[#C49A3A]/30

                    bg-[#031F18]/70

                    px-4 py-3

                    text-white

                    outline-none

                    transition

                    placeholder:text-[#8EADA2]

                    focus:border-[#D4AD4D]

                    focus:ring-2

                    focus:ring-[#D4AD4D]/20

                  "

                  placeholder="اكتب العنوان أو المدينة"

                />

              </div>



              {/* الحالة */}

              <div>

                <label

                  htmlFor="building-status"

                  className="mb-2 block text-sm font-bold text-[#D5E5DE]"

                >

                  حالة العمارة

                </label>



                <select

                  id="building-status"

                  value={editStatus}

                  onChange={(event) =>

                    setEditStatus(

                      event.target.value as BuildingStatus

                    )

                  }

                  className="

                    w-full

                    rounded-xl

                    border border-[#C49A3A]/30

                    bg-[#031F18]

                    px-4 py-3

                    text-white

                    outline-none

                    transition

                    focus:border-[#D4AD4D]

                    focus:ring-2

                    focus:ring-[#D4AD4D]/20

                  "

                >

                  <option value="قيد التنفيذ">

                    قيد التنفيذ

                  </option>



                  <option value="مكتمل">

                    مكتمل

                  </option>



                  <option value="متوقف">

                    متوقف

                  </option>

                </select>

              </div>



              {/* أزرار النافذة */}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">

                <button

                  type="button"

                  onClick={saveBuildingChanges}

                  className="

                    flex flex-1

                    items-center justify-center

                    gap-2

                    rounded-xl

                    bg-gradient-to-r

                    from-[#C49A3A]

                    to-[#F6D878]

                    px-5 py-3

                    font-extrabold

                    text-[#16352B]

                    shadow-lg shadow-[#C49A3A]/10

                    transition

                    hover:brightness-110

                    disabled:cursor-not-allowed

                    disabled:opacity-60

                  "

                  disabled={isSavingBuilding}

                >

                  <Save size={18} />

                  {isSavingBuilding ? "جارٍ الحفظ..." : "حفظ التعديلات"}

                </button>



                <button

                  type="button"

                  onClick={closeEditModal}

                  className="

                    flex flex-1

                    items-center justify-center

                    gap-2

                    rounded-xl

                    border border-white/15

                    bg-white/5

                    px-5 py-3

                    font-bold

                    text-[#D5E5DE]

                    transition

                    hover:bg-white/10

                  "

                >

                  إلغاء

                </button>

              </div>

            </div>

          </div>

        </div>

      )}

      <PermissionDeniedModal
        open={permissionMessage !== null}
        message={permissionMessage ?? "عذرًا، غير مسموح للمستخدم الحالي بهذا الإجراء."}
        onClose={() => setPermissionMessage(null)}
      />

    </>

  );

}