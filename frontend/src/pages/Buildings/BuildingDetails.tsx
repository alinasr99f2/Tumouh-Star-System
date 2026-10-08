import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePermissions } from "../../utils/permissions";
import PermissionDeniedModal from "../../components/PermissionDeniedModal";
import { supabase } from "../../utils/supabase";
import {
  X,
  Building2,
  Home,
  CalendarDays,
  Wallet,
  User,
  Phone,
  Users,
  Car,
  Zap,
  Droplets,
  Sofa,
  FileText,
  MessageSquare,
  Paperclip,
  Coins,
  MapPin,
  Edit3,
  Trash2,
  Info,
  CheckCircle2,
  Plus,
  AlertCircle,
  ArrowUpRight,
  Receipt,
  Image as ImageIcon,
  Search,
  Check,
  Banknote,
  CircleDollarSign,
  Download,
  Printer,
} from "lucide-react";

type ApartmentStatus = string;

type Apartment = {
  number: number;
  type: string;
  rent: number;
  status: ApartmentStatus;
  tenant: string;
};

type ApartmentExtraInfo = {
  floor: string;
  parking: "متوفر" | "لا يوجد" | "غير محدد";
  electricityMeter: "مشترك" | "فردي";
  waterMeter: "مشترك" | "فردي";
  furnitureStatus: "مفروشة" | "نص فرش" | "مفروشة بالكامل";
};

type ApartmentTenantInfo = {
  status: ApartmentStatus;
  tenantName: string;
  phone: string;
  identityNumber: string;
};

type ApartmentContractInfo = {
  contractNumber: string;
  startDate: string;
  endDate: string;
  durationUnit: "day" | "month" | "year";
  durationValue: number;
  insuranceAmount: number;
  insuranceNotes: string;
};

type BuildingCharge = {
  type: string;
  amount: string;
  date: string;
  notes: string;
  apartmentNumber?: number;
  rentMonths?: number;
  dueMonth?: string;
};

const getCurrentBuildingIdFromPath = () => {
  if (typeof window === "undefined") return null;
  const match = window.location.pathname.match(/\/buildings\/(\d+)/);
  return match ? Number(match[1]) : null;
};

const getBuildingStorageKey = (baseKey: string) => {
  const buildingId = getCurrentBuildingIdFromPath();
  return buildingId ? `${baseKey}_${buildingId}` : baseKey;
};

const getBuildingStorageValue = (baseKey: string) => {
  if (typeof window === "undefined") return null;

  // مهم: لا يوجد LocalStorage مشترك بين العمائر.
  // كل عمارة لها مساحة تخزين مستقلة باسم المفتاح + رقم العمارة.
  const scopedKey = getBuildingStorageKey(baseKey);
  return window.localStorage.getItem(scopedKey);
};

const setBuildingStorageValue = (baseKey: string, value: string) => {
  if (typeof window === "undefined") return;

  // الحفظ يكون للعمارة الحالية فقط.
  const scopedKey = getBuildingStorageKey(baseKey);
  window.localStorage.setItem(scopedKey, value);
  window.dispatchEvent(new CustomEvent("building-data-updated"));
};

const createBlankApartments = (count: number): Apartment[] =>
  Array.from({ length: Math.max(0, count) }, (_, index) => ({
    number: index + 1,
    type: "غرفة وصالة",
    rent: 0,
    status: "شاغرة",
    tenant: "لا يوجد مستأجر",
  }));

const DEFAULT_APARTMENT_EXTRA_INFO: ApartmentExtraInfo = {
  floor: "",
  parking: "غير محدد",
  electricityMeter: "مشترك",
  waterMeter: "مشترك",
  furnitureStatus: "مفروشة بالكامل",
};

const DEFAULT_APARTMENT_CONTRACT_START_DATE = "2025-06-01";

const formatContractDate = (value: string) => {
  if (!value) {
    return "غير محدد";
  }

  const [year, month, day] = value.split("-");
  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
};

const getTodayLocalDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getAccruedRentMonths = (startDate: string, endDate: string) => {
  if (!startDate) {
    return 0;
  }

  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);

  if (
    !startYear ||
    !startMonth ||
    !startDay
  ) {
    return 0;
  }

  const start = new Date(startYear, startMonth - 1, startDay);
  start.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (today.getTime() < start.getTime()) {
    return 0;
  }

  let effectiveDate = today;

  if (endDate) {
    const [endYear, endMonth, endDay] = endDate.split("-").map(Number);

    if (endYear && endMonth && endDay) {
      const end = new Date(endYear, endMonth - 1, endDay);
      end.setHours(0, 0, 0, 0);

      if (end.getTime() < effectiveDate.getTime()) {
        effectiveDate = end;
      }
    }
  }

  if (effectiveDate.getTime() < start.getTime()) {
    return 0;
  }

  let months =
    (effectiveDate.getFullYear() - start.getFullYear()) * 12 +
    (effectiveDate.getMonth() - start.getMonth());

  if (effectiveDate.getDate() >= start.getDate()) {
    months += 1;
  }

  return Math.max(months, 0);
};

const getContractDaysRemaining = (endDate: string) => {
  if (!endDate) {
    return null;
  }

  const [year, month, day] = endDate.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  const end = new Date(year, month - 1, day);
  end.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diff = end.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const addContractDuration = (
  startDate: string,
  durationUnit: "day" | "month" | "year",
  durationValue: number
) => {
  const [year, month, day] = startDate.split("-").map(Number);

  if (!year || !month || !day || !Number.isFinite(durationValue) || durationValue < 1) {
    return "";
  }

  const start = new Date(year, month - 1, day);
  const end = new Date(start);

  if (durationUnit === "year") {
    end.setFullYear(end.getFullYear() + durationValue);
  } else if (durationUnit === "month") {
    end.setMonth(end.getMonth() + durationValue);
  } else {
    end.setDate(end.getDate() + durationValue);
  }

  end.setDate(end.getDate() - 1);

  const endYear = end.getFullYear();
  const endMonth = String(end.getMonth() + 1).padStart(2, "0");
  const endDay = String(end.getDate()).padStart(2, "0");

  return `${endYear}-${endMonth}-${endDay}`;
};

const formatContractDuration = (
  unit: "day" | "month" | "year",
  value: number
) => {
  const count = Math.max(1, Number(value) || 1);

  if (unit === "year") {
    if (count === 1) return "سنة واحدة";
    if (count === 2) return "سنتان";
    if (count >= 3 && count <= 10) return `${count} سنوات`;
    return `${count} سنة`;
  }

  if (unit === "day") {
    if (count === 1) return "يوم واحد";
    if (count === 2) return "يومان";
    if (count >= 3 && count <= 10) return `${count} أيام`;
    return `${count} يوم`;
  }

  if (count === 1) return "شهر واحد";
  if (count === 2) return "شهران";
  if (count >= 3 && count <= 10) return `${count} أشهر`;
  return `${count} شهر`;
};

const createDefaultApartmentContractInfo = (apartmentNumber: number): ApartmentContractInfo => ({
  contractNumber: `CNT-001-${apartmentNumber}`,
  startDate: DEFAULT_APARTMENT_CONTRACT_START_DATE,
  endDate: addContractDuration(
    DEFAULT_APARTMENT_CONTRACT_START_DATE,
    "year",
    1
  ),
  durationUnit: "year",
  durationValue: 1,
  insuranceAmount: 0,
  insuranceNotes: "",
});

type ApartmentTab =
  | "البيانات الأساسية"
  | "بيانات المستأجر"
  | "العقد"
  | "المدفوعات"
  | "المستندات"
  | "الملاحظات";

export default function BuildingDetails() {
  const { id: buildingIdParam } = useParams<{ id: string }>();
  const currentBuildingId = Number.isFinite(Number(buildingIdParam))
    ? Number(buildingIdParam)
    : null;
    const navigate = useNavigate();

const { loading: permissionsLoading, hasPermission } = usePermissions();

const canViewBuildings = hasPermission("building_details_view");
const canEditBuildings = hasPermission("building_details_edit");
const canAddBuildings = hasPermission("buildings_add");
const canDeleteBuildings = hasPermission("buildings_delete");

const canViewApartments = hasPermission("apartments_view");
const canEditApartments = hasPermission("building_apartment_edit");
const canAddApartments = hasPermission("building_apartment_add");
const canDeleteApartments = hasPermission("building_apartment_delete");
const canViewApartmentTypes = hasPermission("apartment_types_view");
const canAddApartmentTypes = hasPermission("apartment_types_add");
const canEditApartmentTypes = hasPermission("apartment_types_edit");
const canEditTenants = hasPermission("tenants_edit");
const canEditContracts = hasPermission("contracts_edit");
const canAddRentals = hasPermission("rentals_add");
const canAddInvoices = hasPermission("invoices_add");
const canAddCollections = hasPermission("collections_add");

const [permissionMessage, setPermissionMessage] =
  useState<string | null>(null);

const showPermissionDenied = (message: string) => {
  setPermissionMessage(message);
};

const denyAdd = () => {
  if (canAddBuildings) return false;
  showPermissionDenied("عذرًا، غير مسموح للمستخدم الحالي بهذا الإجراء.");
  return true;
};

const denyDelete = () => {
  if (canDeleteBuildings) return false;
  showPermissionDenied("عذرًا، غير مسموح للمستخدم الحالي بهذا الإجراء.");
  return true;
};

const denyApartmentEdit = () => {
  if (canEditApartments) return false;
  showPermissionDenied("عذرًا، غير مسموح للمستخدم الحالي بهذا الإجراء.");
  return true;
};

const denyApartmentAdd = () => {
  if (canAddApartments) return false;
  showPermissionDenied("عذرًا، غير مسموح للمستخدم الحالي بهذا الإجراء.");
  return true;
};

const denyApartmentDelete = () => {
  if (canDeleteApartments) return false;
  showPermissionDenied("عذرًا، غير مسموح للمستخدم الحالي بهذا الإجراء.");
  return true;
};

const denyApartmentTypeAdd = () => {
  if (canAddApartmentTypes) return false;
  showPermissionDenied("غير مسموح للمستخدم الحالي بإضافة نوع شقة.");
  return true;
};

const denyApartmentTypeEdit = () => {
  if (canEditApartmentTypes) return false;
  showPermissionDenied("غير مسموح للمستخدم الحالي بتعديل أنواع الشقق.");
  return true;
};

const denyTenantEdit = () => {
  if (canEditTenants) return false;
  showPermissionDenied("غير مسموح للمستخدم الحالي بتعديل بيانات المستأجر.");
  return true;
};

const denyContractEdit = () => {
  if (canEditContracts) return false;
  showPermissionDenied("غير مسموح للمستخدم الحالي بتعديل بيانات العقد.");
  return true;
};

const denyChargeAdd = (mode: "charge" | "collection", type: string) => {
  const allowed =
    mode === "collection"
      ? canAddCollections
      : type === "إيجار"
      ? canAddRentals
      : canAddInvoices;

  if (allowed) return false;
  showPermissionDenied(
    mode === "collection"
      ? "غير مسموح للمستخدم الحالي بإضافة تحصيل."
      : type === "إيجار"
      ? "غير مسموح للمستخدم الحالي بإضافة إيجار."
      : "غير مسموح للمستخدم الحالي بإضافة فاتورة أو مستحق."
  );
  return true;
};

  const [selectedApartment, setSelectedApartment] =
    useState<Apartment | null>(null);

  // أنواع الشقق المخصصة لكل شقة + الأنواع الجديدة المحفوظة
  const [apartmentTypes, setApartmentTypes] =
    useState<Record<number, string>>(() => {
      try {
        const saved = getBuildingStorageValue("tumouh_star_apartment_types");
        const parsed = saved ? JSON.parse(saved) : {};
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? parsed
          : {};
      } catch {
        return {};
      }
    });

  const [customApartmentTypes, setCustomApartmentTypes] =
    useState<string[]>(() => {
      try {
        const saved = getBuildingStorageValue("tumouh_star_custom_apartment_types");
        const parsed = saved ? JSON.parse(saved) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    });

  // حالات الشقق المخصصة + الحالات الجديدة المحفوظة
  const [customApartmentStatuses, setCustomApartmentStatuses] =
    useState<string[]>(() => {
      try {
        const saved = getBuildingStorageValue("tumouh_star_custom_apartment_statuses");
        const parsed = saved ? JSON.parse(saved) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    });

  const [apartmentTypeRents, setApartmentTypeRents] =
    useState<Record<string, number>>(() => {
      try {
        const saved = getBuildingStorageValue("tumouh_star_apartment_type_rents");
        const parsed = saved ? JSON.parse(saved) : {};
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? parsed
          : {};
      } catch {
        return {};
      }
    });

  const [apartmentExtraInfo, setApartmentExtraInfo] =
    useState<Record<number, ApartmentExtraInfo>>(() => {
      try {
        const saved = getBuildingStorageValue("tumouh_star_apartment_extra_info");
        const parsed = saved ? JSON.parse(saved) : {};
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? parsed
          : {};
      } catch {
        return {};
      }
    });

  const [apartmentTenantInfo, setApartmentTenantInfo] =
    useState<Record<number, ApartmentTenantInfo>>(() => {
      try {
        const saved = getBuildingStorageValue("tumouh_star_apartment_tenant_info");
        const parsed = saved ? JSON.parse(saved) : {};
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? parsed
          : {};
      } catch {
        return {};
      }
    });

  const [apartmentContractInfo, setApartmentContractInfo] =
    useState<Record<number, ApartmentContractInfo>>(() => {
      try {
        const saved = getBuildingStorageValue("tumouh_star_apartment_contract_info");
        const parsed = saved ? JSON.parse(saved) : {};
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? parsed
          : {};
      } catch {
        return {};
      }
    });

  const [activeTab, setActiveTab] =
    useState<ApartmentTab>("البيانات الأساسية");

  const [fromDate, setFromDate] = useState("2026-09-01");
  const [toDate, setToDate] = useState("2026-09-30");

  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
  const [chargeModalMode, setChargeModalMode] = useState<"charge" | "collection">("charge");
  const [chargeForm, setChargeForm] = useState<BuildingCharge>({
    type: "إيجار",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const [selectedChargeApartments, setSelectedChargeApartments] =
    useState<number[]>([]);
  const [apartmentTypeFilter, setApartmentTypeFilter] = useState("");
  const [apartmentStatusFilter, setApartmentStatusFilter] = useState("");
  const [apartmentSearch, setApartmentSearch] = useState("");
  const [rentCollectionMonths, setRentCollectionMonths] = useState(1);
  const [rentDueMonth, setRentDueMonth] = useState(new Date().toISOString().slice(0, 7));
  const [rentDueMonths, setRentDueMonths] = useState<string[]>([]);
  const [chargeDueMonth, setChargeDueMonth] = useState(new Date().toISOString().slice(0, 7));
  const [chargeDueMonths, setChargeDueMonths] = useState<string[]>([]);
  const [collectionDueMonth, setCollectionDueMonth] = useState(new Date().toISOString().slice(0, 7));
  const [collectionDueMonths, setCollectionDueMonths] = useState<string[]>([]);

  const [apartmentReportType, setApartmentReportType] = useState<
    "total" | "rented" | "reserved" | "maintenance" | "vacant" | "occupancy" | null
  >(null);

  const [isPaymentExportMenuOpen, setIsPaymentExportMenuOpen] = useState(false);
  const [isMonthlyDueReportOpen, setIsMonthlyDueReportOpen] = useState(false);
  const [monthlyReportType, setMonthlyReportType] = useState<
    "total" | "rent" | "electricity" | "water"
  >("total");

  const [isMonthlyCollectionReportOpen, setIsMonthlyCollectionReportOpen] =
    useState(false);
  const [monthlyCollectionReportType, setMonthlyCollectionReportType] =
    useState<"total" | "rent" | "electricity" | "water">("total");

  const [selectedApartmentFinancialReport, setSelectedApartmentFinancialReport] =
    useState<"collections" | "water" | "electricity" | "late" | null>(null);

  const [isApartmentTypeModalOpen, setIsApartmentTypeModalOpen] =
    useState(false);
  const [selectedApartmentType, setSelectedApartmentType] =
    useState("");
  const [selectedTypeApartments, setSelectedTypeApartments] =
    useState<number[]>([]);
  const [selectedApartmentTypeReport, setSelectedApartmentTypeReport] =
    useState<string | null>(null);
  const [apartmentTypeSearch, setApartmentTypeSearch] = useState("");
  const [newApartmentType, setNewApartmentType] = useState("");
  const [newApartmentTypeRent, setNewApartmentTypeRent] = useState("");

  const [isDeleteApartmentModalOpen, setIsDeleteApartmentModalOpen] =
    useState(false);
  const [selectedDeleteApartments, setSelectedDeleteApartments] =
    useState<number[]>([]);
  const [deleteApartmentSearch, setDeleteApartmentSearch] = useState("");

  // بيانات الشقق لا تبدأ من LocalStorage عام أو بيانات عمارة أخرى.
  // المصدر الأساسي هو building_state المرتبط بـ building_id.
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [buildingName, setBuildingName] = useState("العمارة");
  const buildingStateHydratedRef = useRef(false);
  const [buildingDataSyncVersion, setBuildingDataSyncVersion] = useState(0);

  // عند الانتقال بين عمارتين بدون إعادة تحميل الصفحة، يجب إعادة تحميل
  // كل حالة العمارة من الـ storage الخاص بنفس رقم العمارة فقط.
  useEffect(() => {
    const readJson = <T,>(key: string, fallback: T): T => {
      try {
        const saved = getBuildingStorageValue(key);
        if (!saved) return fallback;
        const parsed = JSON.parse(saved);
        return parsed as T;
      } catch {
        return fallback;
      }
    };

    const savedApartments = readJson<unknown>(
      "tumouh_star_building_apartments",
      null
    );

    setApartments(
      Array.isArray(savedApartments)
        ? savedApartments.map((apartment) => ({
            ...(apartment as Apartment),
            number: Number((apartment as Apartment).number),
          }))
        : []
    );

    const savedTypes = readJson<unknown>("tumouh_star_apartment_types", {});
    setApartmentTypes(
      savedTypes && typeof savedTypes === "object" && !Array.isArray(savedTypes)
        ? (savedTypes as Record<number, string>)
        : {}
    );

    const savedCustomTypes = readJson<unknown>(
      "tumouh_star_custom_apartment_types",
      []
    );
    setCustomApartmentTypes(
      Array.isArray(savedCustomTypes) ? (savedCustomTypes as string[]) : []
    );

    const savedCustomStatuses = readJson<unknown>(
      "tumouh_star_custom_apartment_statuses",
      []
    );
    setCustomApartmentStatuses(
      Array.isArray(savedCustomStatuses) ? (savedCustomStatuses as string[]) : []
    );

    const savedTypeRents = readJson<unknown>(
      "tumouh_star_apartment_type_rents",
      {}
    );
    setApartmentTypeRents(
      savedTypeRents && typeof savedTypeRents === "object" && !Array.isArray(savedTypeRents)
        ? (savedTypeRents as Record<string, number>)
        : {}
    );

    const savedExtraInfo = readJson<unknown>(
      "tumouh_star_apartment_extra_info",
      {}
    );
    setApartmentExtraInfo(
      savedExtraInfo && typeof savedExtraInfo === "object" && !Array.isArray(savedExtraInfo)
        ? (savedExtraInfo as Record<number, ApartmentExtraInfo>)
        : {}
    );

    const savedTenantInfo = readJson<unknown>(
      "tumouh_star_apartment_tenant_info",
      {}
    );
    setApartmentTenantInfo(
      savedTenantInfo && typeof savedTenantInfo === "object" && !Array.isArray(savedTenantInfo)
        ? (savedTenantInfo as Record<number, ApartmentTenantInfo>)
        : {}
    );

    const savedContractInfo = readJson<unknown>(
      "tumouh_star_apartment_contract_info",
      {}
    );
    setApartmentContractInfo(
      savedContractInfo && typeof savedContractInfo === "object" && !Array.isArray(savedContractInfo)
        ? (savedContractInfo as Record<number, ApartmentContractInfo>)
        : {}
    );

    setBuildingName(currentBuildingId ? `العمارة ${currentBuildingId}` : "العمارة");
    setSelectedApartment(null);
    setSelectedChargeApartments([]);
    setSelectedTypeApartments([]);
    setSelectedApartmentTypeReport(null);
  }, [currentBuildingId]);

  // ============================================================
  // مصدر الحقيقة للعمارة الحالية: Supabase / building_state
  // ============================================================
  useEffect(() => {
    let cancelled = false;

    const loadCurrentBuildingState = async () => {
      if (!currentBuildingId) return;

      buildingStateHydratedRef.current = false;

      const { data: building, error: buildingError } = await supabase
        .from("buildings")
        .select("id, name, units_count")
        .eq("id", currentBuildingId)
        .maybeSingle();

      if (cancelled) return;

      if (buildingError) {
        console.error("خطأ في تحميل بيانات العمارة الأساسية:", buildingError);
      }

      setBuildingName(
        String(building?.name || "").trim() || `العمارة ${currentBuildingId}`
      );

      const unitsCount = Math.max(0, Number(building?.units_count) || 0);

      const { data: state, error: stateError } = await supabase
        .from("building_state")
        .select(
          "apartments, apartment_types, custom_apartment_types, custom_apartment_statuses, apartment_type_rents, apartment_extra_info, apartment_tenant_info, apartment_contract_info, building_charges, building_collections"
        )
        .eq("building_id", currentBuildingId)
        .maybeSingle();

      if (cancelled) return;

      if (stateError) {
        console.error("خطأ في تحميل بيانات العمارة من Supabase:", stateError);
      }

      if (state) {
        if (Array.isArray(state.apartments)) {
          const normalizedApartments = state.apartments
            .filter((apartment: Apartment) => apartment && apartment.number != null)
            .map((apartment: Apartment) => ({
              ...apartment,
              number: Number(apartment.number),
              rent: Number(apartment.rent) || 0,
              type: apartment.type || "غرفة وصالة",
              status: apartment.status || "شاغرة",
              tenant: apartment.tenant || "لا يوجد مستأجر",
            }));

          setApartments(normalizedApartments);
          setBuildingStorageValue(
            "tumouh_star_building_apartments",
            JSON.stringify(normalizedApartments)
          );
        } else if (unitsCount > 0) {
          const blankApartments = createBlankApartments(unitsCount);
          setApartments(blankApartments);
          setBuildingStorageValue(
            "tumouh_star_building_apartments",
            JSON.stringify(blankApartments)
          );
        }

        if (state.apartment_types && typeof state.apartment_types === "object") {
          setApartmentTypes(state.apartment_types as Record<number, string>);
        }

        if (Array.isArray(state.custom_apartment_types)) {
          setCustomApartmentTypes(state.custom_apartment_types as string[]);
        }

        if (Array.isArray(state.custom_apartment_statuses)) {
          setCustomApartmentStatuses(state.custom_apartment_statuses as string[]);
        }

        if (state.apartment_type_rents && typeof state.apartment_type_rents === "object") {
          setApartmentTypeRents(state.apartment_type_rents as Record<string, number>);
        }

        if (state.apartment_extra_info && typeof state.apartment_extra_info === "object") {
          setApartmentExtraInfo(
            state.apartment_extra_info as Record<number, ApartmentExtraInfo>
          );
        }

        if (state.apartment_tenant_info && typeof state.apartment_tenant_info === "object") {
          setApartmentTenantInfo(
            state.apartment_tenant_info as Record<number, ApartmentTenantInfo>
          );
        }

        if (state.apartment_contract_info && typeof state.apartment_contract_info === "object") {
          setApartmentContractInfo(
            state.apartment_contract_info as Record<number, ApartmentContractInfo>
          );
        }

        if (Array.isArray(state.building_charges)) {
          setBuildingStorageValue(
            "tumouh_star_building_charges",
            JSON.stringify(state.building_charges)
          );
        }

        if (Array.isArray(state.building_collections)) {
          setBuildingStorageValue(
            "tumouh_star_building_collections",
            JSON.stringify(state.building_collections)
          );
        }
      } else {
        // عمارة جديدة: لا نرث أي بيانات من عمارة أخرى.
        // نستخدم units_count فقط لإنشاء خريطة أولية فارغة.
        const scopedSaved = getBuildingStorageValue(
          "tumouh_star_building_apartments"
        );

        if (!scopedSaved && unitsCount > 0) {
          const blankApartments = createBlankApartments(unitsCount);
          setApartments(blankApartments);
          setBuildingStorageValue(
            "tumouh_star_building_apartments",
            JSON.stringify(blankApartments)
          );
        } else if (scopedSaved) {
          try {
            const parsed = JSON.parse(scopedSaved);
            if (Array.isArray(parsed)) {
              setApartments(
                parsed.map((apartment) => ({
                  ...apartment,
                  number: Number(apartment.number),
                }))
              );
            }
          } catch {
            // تجاهل التخزين المحلي غير الصالح.
          }
        } else {
          setApartments([]);
        }
      }

      buildingStateHydratedRef.current = true;
      setBuildingDataSyncVersion((value) => value + 1);
    };

    void loadCurrentBuildingState();

    return () => {
      cancelled = true;
      buildingStateHydratedRef.current = false;
    };
  }, [currentBuildingId]);

  // إعادة تحميل بيانات نفس العمارة عند الرجوع للصفحة أو بعد تعديل الخريطة.
  useEffect(() => {
    const reloadOnReturn = () => {
      if (!currentBuildingId) return;
      window.dispatchEvent(new CustomEvent("building-data-refresh"));
    };

    window.addEventListener("pageshow", reloadOnReturn);
    window.addEventListener("building-data-updated", reloadOnReturn);

    return () => {
      window.removeEventListener("pageshow", reloadOnReturn);
      window.removeEventListener("building-data-updated", reloadOnReturn);
    };
  }, [currentBuildingId]);

  // حفظ تغييرات العمارة الحالية في سجلها الخاص داخل Supabase.
  useEffect(() => {
  if (
    permissionsLoading ||
    !currentBuildingId ||
    !buildingStateHydratedRef.current ||
    !canEditBuildings ||
    !canEditApartments
  ) {
    return;
  }

    const saveCurrentBuildingState = async () => {
      const readScopedArray = (key: string): BuildingCharge[] => {
        try {
          const saved = getBuildingStorageValue(key);
          return saved ? (JSON.parse(saved) as BuildingCharge[]) : [];
        } catch {
          return [];
        }
      };

      const { error } = await supabase.from("building_state").upsert(
        {
          building_id: currentBuildingId,
          apartments,
          apartment_types: apartmentTypes,
          custom_apartment_types: customApartmentTypes,
          custom_apartment_statuses: customApartmentStatuses,
          apartment_type_rents: apartmentTypeRents,
          apartment_extra_info: apartmentExtraInfo,
          apartment_tenant_info: apartmentTenantInfo,
          apartment_contract_info: apartmentContractInfo,
          building_charges: readScopedArray("tumouh_star_building_charges"),
          building_collections: readScopedArray("tumouh_star_building_collections"),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "building_id" }
      );

      if (error) {
        console.error("خطأ في حفظ بيانات العمارة الحالية:", error);
      }
    };

    void saveCurrentBuildingState();
  }, [
    currentBuildingId,
    apartments,
    apartmentTypes,
    customApartmentTypes,
    customApartmentStatuses,
    apartmentTypeRents,
    apartmentExtraInfo,
    apartmentTenantInfo,
    apartmentContractInfo,
    buildingDataSyncVersion,
    permissionsLoading,
    canEditBuildings,
    canEditApartments,
  ]);

  useEffect(() => {
    let cancelled = false;

    const loadBuildingInfo = async () => {
      const buildingId = currentBuildingId;
      if (!buildingId) return;

      const { data, error } = await supabase
        .from("buildings")
        .select("name, units_count")
        .eq("id", buildingId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("خطأ في تحميل بيانات العمارة:", error);
        return;
      }

      const unitsCount = Math.max(0, Number(data?.units_count) || 0);
      setBuildingName(data?.name?.trim() || `العمارة ${buildingId}`);

      const existingApartments = getBuildingStorageValue(
        "tumouh_star_building_apartments"
      );

      if (!existingApartments && unitsCount > 0) {
        const blankApartments = createBlankApartments(unitsCount);
        setApartments(blankApartments);
        setBuildingStorageValue(
          "tumouh_star_building_apartments",
          JSON.stringify(blankApartments)
        );
      }
    };

    void loadBuildingInfo();

    return () => {
      cancelled = true;
    };
  }, [currentBuildingId]);

  // مزامنة فورية مع شاشة خريطة الشقق. الخريطة تحفظ القائمة في localStorage،
  // لذلك نعيد قراءتها عند الرجوع للصفحة أو وصول حدث storage.
  useEffect(() => {
    const syncApartmentsFromStorage = () => {
      try {
        const saved = getBuildingStorageValue("tumouh_star_building_apartments");
        if (!saved) return;

        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed)) return;

        setApartments(
          parsed
            .filter((apartment) => apartment && apartment.number != null)
            .map((apartment) => ({
              ...(apartment as Apartment),
              number: Number((apartment as Apartment).number),
            }))
        );
      } catch {
        // تجاهل أي بيانات تخزين غير صالحة بدون تعطيل الصفحة.
      }
    };

    window.addEventListener("focus", syncApartmentsFromStorage);
    window.addEventListener("pageshow", syncApartmentsFromStorage);
    window.addEventListener("storage", syncApartmentsFromStorage);
    window.addEventListener("building-apartments-updated", syncApartmentsFromStorage);

    return () => {
      window.removeEventListener("focus", syncApartmentsFromStorage);
      window.removeEventListener("pageshow", syncApartmentsFromStorage);
      window.removeEventListener("storage", syncApartmentsFromStorage);
      window.removeEventListener("building-apartments-updated", syncApartmentsFromStorage);
    };
  }, [currentBuildingId]);

  const addApartment = () => {
    if (denyApartmentAdd()) return;
    if (denyAdd()) return;
    setApartments((current) => {
      const nextNumber =
        current.length > 0
          ? Math.max(...current.map((apartment) => apartment.number)) + 1
          : 1;

      const updated = [
        ...current,
        {
          number: nextNumber,
          type: "غرفة وصالة",
          rent: 3000,
          status: "شاغرة" as ApartmentStatus,
          tenant: "لا يوجد مستأجر",
        },
      ];

      setBuildingStorageValue("tumouh_star_building_apartments",
        JSON.stringify(updated)
      );

      return updated;
    });
  };

  // إجمالي الشقق = عدد سجلات الشقق الفعلية المحفوظة لهذه العمارة.
  // لا نعتمد على units_count ولا على رقم ثابت.
  const totalApartments = apartments.length;

  // الحالة الفعلية للشقة: نعتمد على بيانات الشقة نفسها، مع الاستفادة من
  // بيانات المستأجر القديمة إذا كانت هي التي تحتوي على الحالة المحفوظة.
  // هذا يمنع ظهور 0 مؤجرة / 44 فارغة رغم أن الشقة مسجلة كمؤجرة داخل التفاصيل.
  const normalizeApartmentStatus = (value: unknown): string => {
    const normalized = String(value ?? "")
      .normalize("NFKC")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // بعض البيانات القديمة كانت تحفظ "فارغة" بدل "شاغرة".
    if (normalized === "فارغة") return "شاغرة";
    return normalized;
  };

  const getEffectiveApartmentStatus = (apartment: Apartment): ApartmentStatus => {
    const apartmentStatus = normalizeApartmentStatus(apartment.status);
    const tenantStatus = normalizeApartmentStatus(
      apartmentTenantInfo?.[apartment.number]?.status
    );

    const knownStatuses = new Set([
      "مؤجرة",
      "مؤجرة للشركة",
      "شاغرة",
      "محجوزة",
      "تحت الصيانة",
    ]);

    // بيانات حالة المستأجر هي المصدر الأحدث داخل تفاصيل الشقة،
    // لذلك نعتمدها أولاً إذا كانت تحتوي على حالة صالحة.
    // هذا يعالج السجلات القديمة التي ظلت فيها apartment.status = "شاغرة"
    // بينما تم حفظ حالة الشقة داخل apartmentTenantInfo على أنها "مؤجرة".
    if (knownStatuses.has(tenantStatus)) {
      return tenantStatus as ApartmentStatus;
    }

    if (knownStatuses.has(apartmentStatus)) {
      return apartmentStatus as ApartmentStatus;
    }

    return "شاغرة";
  };

  // كل الكروت الستة تعتمد على نفس الحالة الفعلية للشقق.
  // بهذا لا يحدث تعارض بين apartment.status وبيانات المستأجر القديمة.
  const rentedApartments = apartments.filter(
    (apartment) => {
      const status = getEffectiveApartmentStatus(apartment);
      return status === "مؤجرة" || status === "مؤجرة للشركة";
    }
  ).length;

  const reservedApartments = apartments.filter(
    (apartment) => getEffectiveApartmentStatus(apartment) === "محجوزة"
  ).length;

  const maintenanceApartments = apartments.filter(
    (apartment) => getEffectiveApartmentStatus(apartment) === "تحت الصيانة"
  ).length;

  const vacantApartments = apartments.filter(
    (apartment) => getEffectiveApartmentStatus(apartment) === "شاغرة"
  ).length;

  const occupancyRate =
    totalApartments > 0
      ? ((rentedApartments / totalApartments) * 100).toFixed(2)
      : "0.00";

  const getApartmentColor = (
    status: ApartmentStatus
  ) => {
    if (status === "شاغرة") {
      return "bg-red-600 hover:bg-red-500";
    }

    if (status === "تحت الصيانة") {
      return "bg-yellow-500 hover:bg-yellow-400";
    }

    if (status === "محجوزة") {
      return "bg-blue-600 hover:bg-blue-500";
    }

    if (status === "مؤجرة للشركة") {
      return "bg-emerald-700 hover:bg-emerald-600";
    }

    return "bg-green-600 hover:bg-green-500";
  };

  const getStatusColor = (
    status: ApartmentStatus
  ) => {
    if (status === "شاغرة") {
      return {
        badge:
          "border-red-400/30 bg-red-500/10 text-red-400",
        dot: "bg-red-400",
      };
    }

    if (status === "مؤجرة للشركة") {
      return {
        badge:
          "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
        dot: "bg-emerald-400",
      };
    }

    if (status === "محجوزة") {
      return {
        badge:
          "border-blue-400/30 bg-blue-500/10 text-blue-400",
        dot: "bg-blue-400",
      };
    }

    if (status === "تحت الصيانة") {
      return {
        badge:
          "border-orange-400/30 bg-orange-500/10 text-orange-400",
        dot: "bg-orange-400",
      };
    }

    return {
      badge:
        "border-green-400/30 bg-green-500/10 text-green-400",
      dot: "bg-green-400",
    };
  };

  const getApartmentStatusCard = (
    status: ApartmentStatus
  ) => {
    if (status === "شاغرة") {
      return {
        label: "فارغة",
        icon: Home,
        iconClass: "text-red-400",
        iconBorder: "border-red-400/20",
        iconBg: "bg-red-400/10",
        valueClass: "text-red-400",
      };
    }

    if (status === "مؤجرة للشركة") {
      return {
        label: "مؤجرة للشركة",
        icon: User,
        iconClass: "text-emerald-300",
        iconBorder: "border-emerald-400/20",
        iconBg: "bg-emerald-500/10",
        valueClass: "text-emerald-300",
      };
    }

    if (status === "محجوزة") {
      return {
        label: "محجوزة",
        icon: CalendarDays,
        iconClass: "text-blue-400",
        iconBorder: "border-blue-400/20",
        iconBg: "bg-blue-400/10",
        valueClass: "text-blue-400",
      };
    }

    if (status === "تحت الصيانة") {
      return {
        label: "تحت الصيانة",
        icon: AlertCircle,
        iconClass: "text-yellow-400",
        iconBorder: "border-yellow-400/20",
        iconBg: "bg-yellow-400/10",
        valueClass: "text-yellow-400",
      };
    }

    return {
      label: status,
      icon: User,
      iconClass: "text-green-300",
      iconBorder: "border-green-400/20",
      iconBg: "bg-green-400/10",
      valueClass: "text-green-300",
    };
  };

  const apartmentTabs: {
    title: ApartmentTab;
    icon: typeof Home;
  }[] = [
    {
      title: "البيانات الأساسية",
      icon: Home,
    },
    {
      title: "بيانات المستأجر",
      icon: User,
    },
    {
      title: "العقد",
      icon: FileText,
    },
    {
      title: "المدفوعات",
      icon: Coins,
    },
    {
      title: "المستندات",
      icon: Paperclip,
    },
    {
      title: "الملاحظات",
      icon: MessageSquare,
    },
  ];

  const getApartmentExtraInfo = (
    apartmentNumber: number
  ): ApartmentExtraInfo => {
    return (
      (apartmentExtraInfo ?? {})[apartmentNumber] ??
      DEFAULT_APARTMENT_EXTRA_INFO
    );
  };

  const getApartmentTenantInfo = (
    apartment: Apartment
  ): ApartmentTenantInfo => {
    return (
      (apartmentTenantInfo ?? {})[apartment.number] ??
      {
        status: apartment.status,
        tenantName:
          apartment.status === "شاغرة"
            ? ""
            : apartment.tenant === "اسم المستأجر غير مضاف"
            ? ""
            : apartment.tenant,
        phone: "",
        identityNumber: "",
      }
    );
  };

  const updateApartmentTenantInfo = <K extends keyof ApartmentTenantInfo>(
    apartment: Apartment,
    key: K,
    value: ApartmentTenantInfo[K]
  ) => {
    if (denyTenantEdit()) return;
    setApartmentTenantInfo((current) => ({
      ...current,
      [apartment.number]: {
        ...getApartmentTenantInfo(apartment),
        [key]: value,
      },
    }));
  };

  const updateApartmentExtraInfo = <K extends keyof ApartmentExtraInfo>(
    apartmentNumber: number,
    key: K,
    value: ApartmentExtraInfo[K]
  ) => {
    if (denyApartmentEdit()) return;
    setApartmentExtraInfo((current) => ({
      ...current,
      [apartmentNumber]: {
        ...getApartmentExtraInfo(apartmentNumber),
        [key]: value,
      },
    }));
  };

  const getApartmentType = (apartment: Apartment) => {
    return (apartmentTypes ?? {})[apartment.number] ?? apartment.type;
  };

  const getApartmentRent = (apartment: Apartment) => {
    const type = getApartmentType(apartment);
    const typeRent = (apartmentTypeRents ?? {})[type];

    if (typeof typeRent === "number" && typeRent > 0) {
      return typeRent;
    }

    const firstApartmentOfType = apartments.find(
      (item) => getApartmentType(item) === type
    );

    return firstApartmentOfType?.rent ?? apartment.rent;
  };

  const openDeleteApartmentModal = () => {
    if (denyApartmentDelete()) return;
    if (denyDelete()) return;
    setSelectedDeleteApartments([]);
    setDeleteApartmentSearch("");
    setIsDeleteApartmentModalOpen(true);
  };

  const closeDeleteApartmentModal = () => {
    setIsDeleteApartmentModalOpen(false);
    setSelectedDeleteApartments([]);
    setDeleteApartmentSearch("");
  };

  const toggleDeleteApartment = (apartmentNumber: number) => {
    setSelectedDeleteApartments((current) =>
      current.includes(apartmentNumber)
        ? current.filter((number) => number !== apartmentNumber)
        : [...current, apartmentNumber]
    );
  };

  const filteredDeleteApartments = apartments.filter((apartment) => {
    const search = deleteApartmentSearch.trim().toLowerCase();

    if (!search) {
      return true;
    }

    return (
      apartment.number.toString().includes(search) ||
      getApartmentType(apartment).toLowerCase().includes(search)
    );
  });

  const toggleAllDeleteApartments = () => {
    const visibleNumbers = filteredDeleteApartments.map(
      (apartment) => apartment.number
    );

    const allVisibleSelected =
      visibleNumbers.length > 0 &&
      visibleNumbers.every((number) =>
        selectedDeleteApartments.includes(number)
      );

    setSelectedDeleteApartments((current) =>
      allVisibleSelected
        ? current.filter((number) => !visibleNumbers.includes(number))
        : Array.from(new Set([...current, ...visibleNumbers]))
    );
  };

  const deleteSelectedApartments = () => {
    if (denyApartmentDelete()) return;
    if (denyDelete()) return;
    if (selectedDeleteApartments.length === 0) {
      window.alert("اختر شقة واحدة على الأقل للحذف.");
      return;
    }

    const selectedNumbers = new Set(selectedDeleteApartments);
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف ${selectedDeleteApartments.length} شقة محددة؟`
    );

    if (!confirmed) {
      return;
    }

    setApartments((current) => {
      const updated = current.filter(
        (apartment) => !selectedNumbers.has(apartment.number)
      );

      setBuildingStorageValue("tumouh_star_building_apartments",
        JSON.stringify(updated)
      );

      return updated;
    });

    setApartmentTypes((current) => {
      const updated = { ...current };

      selectedNumbers.forEach((apartmentNumber) => {
        delete updated[apartmentNumber];
      });

      setBuildingStorageValue("tumouh_star_apartment_types",
        JSON.stringify(updated)
      );

      return updated;
    });

    setApartmentExtraInfo((current) => {
      const updated = { ...current };

      selectedNumbers.forEach((apartmentNumber) => {
        delete updated[apartmentNumber];
      });

      return updated;
    });

    setApartmentTenantInfo((current) => {
      const updated = { ...current };

      selectedNumbers.forEach((apartmentNumber) => {
        delete updated[apartmentNumber];
      });

      return updated;
    });

    if (
      selectedApartment &&
      selectedNumbers.has(selectedApartment.number)
    ) {
      closeApartment();
    }

    closeDeleteApartmentModal();
  };

  const updateApartmentTypeRent = (type: string, value: string) => {
    if (denyApartmentTypeEdit()) return;
    const numericValue = Number(value);

    setApartmentTypeRents((current) => {
      const updated = {
        ...current,
        [type]: Number.isFinite(numericValue) ? numericValue : 0,
      };

      setBuildingStorageValue("tumouh_star_apartment_type_rents",
        JSON.stringify(updated)
      );

      return updated;
    });
  };

  const availableApartmentTypes = Array.from(
    new Set([
      "غرفتين وصالة",
      "غرفة وصالة",
      ...customApartmentTypes,
      ...apartments.map((apartment) => getApartmentType(apartment)),
    ])
  );

  const filteredTypeApartments = apartments.filter((apartment) => {
    const search = apartmentTypeSearch.trim().toLowerCase();

    if (!search) {
      return true;
    }

    return (
      apartment.number.toString().includes(search) ||
      getApartmentType(apartment).toLowerCase().includes(search)
    );
  });

  const openApartmentTypeModal = () => {
    const firstType = availableApartmentTypes[0] ?? "غرفتين وصالة";
    setSelectedApartmentType(firstType);
    setSelectedTypeApartments(
      apartments
        .filter((apartment) => getApartmentType(apartment) === firstType)
        .map((apartment) => apartment.number)
    );
    setApartmentTypeSearch("");
    setNewApartmentType("");
    setNewApartmentTypeRent("");
    setIsApartmentTypeModalOpen(true);
  };

  const closeApartmentTypeModal = () => {
    setIsApartmentTypeModalOpen(false);
    setApartmentTypeSearch("");
    setNewApartmentType("");
    setNewApartmentTypeRent("");
    setSelectedTypeApartments([]);
  };

  const selectApartmentTypeForManagement = (type: string) => {
    setSelectedApartmentType(type);
    setSelectedTypeApartments(
      apartments
        .filter((apartment) => getApartmentType(apartment) === type)
        .map((apartment) => apartment.number)
    );
  };

  const toggleTypeApartment = (apartmentNumber: number) => {
    setSelectedTypeApartments((current) =>
      current.includes(apartmentNumber)
        ? current.filter((number) => number !== apartmentNumber)
        : [...current, apartmentNumber]
    );
  };

  const toggleAllTypeApartments = () => {
    const visibleNumbers = filteredTypeApartments.map(
      (apartment) => apartment.number
    );
    const allSelected = visibleNumbers.every((number) =>
      selectedTypeApartments.includes(number)
    );

    setSelectedTypeApartments((current) =>
      allSelected
        ? current.filter((number) => !visibleNumbers.includes(number))
        : Array.from(new Set([...current, ...visibleNumbers]))
    );
  };

  const addNewApartmentTypeFromCard = () => {
    if (denyApartmentTypeAdd()) return;
    const type = newApartmentType.trim();
    const rent = Number(newApartmentTypeRent);

    if (!type) {
      window.alert("اكتب اسم نوع الشقة أولاً");
      return;
    }

    if (!Number.isFinite(rent) || rent <= 0) {
      window.alert("اكتب قيمة إيجار صحيحة لنوع الشقة");
      return;
    }

    if (availableApartmentTypes.includes(type)) {
      updateApartmentTypeRent(type, String(rent));
      setSelectedApartmentType(type);
      setSelectedTypeApartments([]);
      setNewApartmentType("");
      setNewApartmentTypeRent("");
      return;
    }

    setCustomApartmentTypes((current) => {
      const updated = [...current, type];
      setBuildingStorageValue("tumouh_star_custom_apartment_types",
        JSON.stringify(updated)
      );
      return updated;
    });

    updateApartmentTypeRent(type, String(rent));
    setSelectedApartmentType(type);
    setSelectedTypeApartments([]);
    setNewApartmentType("");
    setNewApartmentTypeRent("");
  };

  const saveApartmentTypeAssignments = () => {
    if (denyApartmentTypeEdit()) return;
    if (!selectedApartmentType) {
      window.alert("اختر نوع الشقة أولاً");
      return;
    }

    setApartmentTypes((current) => {
      const updated = { ...current };
      const selectedSet = new Set(selectedTypeApartments);

      apartments.forEach((apartment) => {
        if (selectedSet.has(apartment.number)) {
          updated[apartment.number] = selectedApartmentType;
        } else if (current[apartment.number] === selectedApartmentType) {
          delete updated[apartment.number];
        }
      });

      setBuildingStorageValue("tumouh_star_apartment_types",
        JSON.stringify(updated)
      );

      return updated;
    });

    closeApartmentTypeModal();
  };

  const updateApartmentType = (
    apartment: Apartment,
    value: string
  ) => {
    if (denyApartmentTypeEdit()) return;
    if (value === "__add_new__") {
      const newType = window.prompt(
        "اكتب اسم نوع الشقة الجديد:"
      )?.trim();

      if (!newType) {
        return;
      }

      setCustomApartmentTypes((current) => {
        const updated = current.includes(newType)
          ? current
          : [...current, newType];

        setBuildingStorageValue("tumouh_star_custom_apartment_types",
          JSON.stringify(updated)
        );

        return updated;
      });

      if (apartmentTypeRents[newType] === undefined) {
        updateApartmentTypeRent(newType, String(apartment.rent));
      }

      setApartmentTypes((current) => {
        const updated = {
          ...current,
          [apartment.number]: newType,
        };

        setBuildingStorageValue("tumouh_star_apartment_types",
          JSON.stringify(updated)
        );

        return updated;
      });

      return;
    }

    setApartmentTypes((current) => {
      const updated = {
        ...current,
        [apartment.number]: value,
      };

      setBuildingStorageValue("tumouh_star_apartment_types",
        JSON.stringify(updated)
      );

      return updated;
    });
  };

  const availableApartmentStatuses: ApartmentStatus[] = [
    "مؤجرة",
    "شاغرة",
    "تحت الصيانة",
    "محجوزة",
    "مؤجرة للشركة",
    ...customApartmentStatuses,
  ];

  const addNewApartmentStatus = (apartment?: Apartment) => {
    if (denyApartmentAdd()) return;
    if (denyAdd()) return;
    const newStatus = window.prompt("اكتب اسم حالة الشقة الجديدة:")?.trim();

    if (!newStatus) {
      return;
    }

    if (availableApartmentStatuses.includes(newStatus)) {
      if (apartment) {
        updateApartmentStatus(apartment, newStatus);
      }
      return;
    }

    setCustomApartmentStatuses((current) => {
      const updated = [...current, newStatus];
      setBuildingStorageValue("tumouh_star_custom_apartment_statuses",
        JSON.stringify(updated)
      );
      return updated;
    });

    if (apartment) {
      updateApartmentStatus(apartment, newStatus);
    }
  };

  const handleApartmentStatusChange = (
    apartment: Apartment,
    value: string
  ) => {
    if (denyApartmentEdit()) return;
    if (value === "__add_new_status__") {
      addNewApartmentStatus(apartment);
      return;
    }

    updateApartmentStatus(apartment, value as ApartmentStatus);
  };

  const updateApartmentStatus = (
    apartment: Apartment,
    status: ApartmentStatus
  ) => {
    if (denyApartmentEdit()) return;
    const updatedApartment = {
      ...apartment,
      status,
    };

    setApartments((current) => {
      const updated = current.map((item) =>
        item.number === apartment.number ? updatedApartment : item
      );

      setBuildingStorageValue("tumouh_star_building_apartments",
        JSON.stringify(updated)
      );

      return updated;
    });

    setApartmentTenantInfo((current) => {
      const updated = {
        ...current,
        [apartment.number]: {
          ...getApartmentTenantInfo(apartment),
          status,
        },
      };

      setBuildingStorageValue(
        "tumouh_star_apartment_tenant_info",
        JSON.stringify(updated)
      );

      return updated;
    });

    setSelectedApartment(updatedApartment);
  };

  const openApartment = (
    apartment: Apartment
  ) => {
    if (!canViewApartments) {
      showPermissionDenied("عذرًا، غير مسموح للمستخدم الحالي بعرض هذه الصفحة.");
      return;
    }
    setSelectedApartment(apartment);
    setActiveTab("البيانات الأساسية");
  };

  const closeApartment = () => {
    setSelectedApartment(null);
    setActiveTab("البيانات الأساسية");
    setIsPaymentExportMenuOpen(false);
  };

  const saveApartmentTenantField = <
    K extends keyof Pick<
      ApartmentTenantInfo,
      "tenantName" | "phone" | "identityNumber"
    >
  >(
    apartment: Apartment,
    key: K
  ) => {
    if (denyTenantEdit()) return;
    const tenantInfo = getApartmentTenantInfo(apartment);

    const updatedTenantInfo = {
      ...tenantInfo,
      [key]: tenantInfo[key],
    };

    setApartmentTenantInfo((current) => {
      const updated = {
        ...current,
        [apartment.number]: updatedTenantInfo,
      };

      setBuildingStorageValue("tumouh_star_apartment_tenant_info",
        JSON.stringify(updated)
      );

      return updated;
    });

    if (key === "tenantName") {
      setApartments((current) => {
        const updated = current.map((item) =>
          item.number === apartment.number
            ? {
                ...item,
                tenant:
                  tenantInfo.tenantName || "اسم المستأجر غير مضاف",
              }
            : item
        );

        setBuildingStorageValue("tumouh_star_building_apartments",
          JSON.stringify(updated)
        );

        return updated;
      });

      setSelectedApartment((current) =>
        current && current.number === apartment.number
          ? {
              ...current,
              tenant:
                tenantInfo.tenantName || "اسم المستأجر غير مضاف",
            }
          : current
      );
    }
  };

  const saveApartmentFloor = (apartmentNumber: number) => {
    if (denyApartmentEdit()) return;
    const extraInfo = getApartmentExtraInfo(apartmentNumber);

    setApartmentExtraInfo((current) => {
      const updated = {
        ...current,
        [apartmentNumber]: extraInfo,
      };

      setBuildingStorageValue("tumouh_star_apartment_extra_info",
        JSON.stringify(updated)
      );

      return updated;
    });
  };

  const getApartmentContractInfo = (apartmentNumber: number) => {
    return (
      (apartmentContractInfo ?? {})[apartmentNumber] ??
      createDefaultApartmentContractInfo(apartmentNumber)
    );
  };

  const updateApartmentContractField = <
    K extends keyof ApartmentContractInfo
  >(
    apartmentNumber: number,
    key: K,
    value: ApartmentContractInfo[K]
  ) => {
    if (denyContractEdit()) return;
    setApartmentContractInfo((current) => ({
      ...current,
      [apartmentNumber]: {
        ...getApartmentContractInfo(apartmentNumber),
        [key]: value,
      },
    }));
  };

  const updateApartmentContractStartDate = (
    apartmentNumber: number,
    startDate: string
  ) => {
    if (denyContractEdit()) return;
    const currentInfo = getApartmentContractInfo(apartmentNumber);
    const endDate = addContractDuration(
      startDate,
      currentInfo.durationUnit,
      currentInfo.durationValue
    );

    setApartmentContractInfo((current) => ({
      ...current,
      [apartmentNumber]: {
        ...currentInfo,
        startDate,
        endDate: endDate || currentInfo.endDate,
      },
    }));
  };

  const updateApartmentContractDuration = (
    apartmentNumber: number,
    durationUnit: "day" | "month" | "year",
    durationValue: number
  ) => {
    if (denyContractEdit()) return;
    const currentInfo = getApartmentContractInfo(apartmentNumber);
    const safeValue = Math.max(1, Number(durationValue) || 1);
    const endDate = addContractDuration(
      currentInfo.startDate,
      durationUnit,
      safeValue
    );

    setApartmentContractInfo((current) => ({
      ...current,
      [apartmentNumber]: {
        ...currentInfo,
        durationUnit,
        durationValue: safeValue,
        endDate: endDate || currentInfo.endDate,
      },
    }));
  };

  const saveApartmentContractInfo = (apartmentNumber: number) => {
    if (denyContractEdit()) return;
    const contractInfo = getApartmentContractInfo(apartmentNumber);

    setApartmentContractInfo((current) => {
      const updated = {
        ...current,
        [apartmentNumber]: contractInfo,
      };

      setBuildingStorageValue("tumouh_star_apartment_contract_info",
        JSON.stringify(updated)
      );

      return updated;
    });
  };

  const saveApartmentDetails = () => {
    if (denyApartmentEdit()) return;
    if (!selectedApartment) {
      return;
    }

    const updatedApartments = apartments.map((apartment) => {
      const tenantInfo = apartmentTenantInfo[apartment.number];

      return tenantInfo
        ? {
            ...apartment,
            tenant:
              tenantInfo.tenantName || "اسم المستأجر غير مضاف",
            status: tenantInfo.status,
          }
        : apartment;
    });

    setBuildingStorageValue("tumouh_star_building_apartments",
      JSON.stringify(updatedApartments)
    );

    setBuildingStorageValue("tumouh_star_apartment_types",
      JSON.stringify(apartmentTypes)
    );

    setBuildingStorageValue("tumouh_star_apartment_extra_info",
      JSON.stringify(apartmentExtraInfo)
    );

    setBuildingStorageValue("tumouh_star_apartment_tenant_info",
      JSON.stringify(apartmentTenantInfo)
    );

    setBuildingStorageValue("tumouh_star_apartment_contract_info",
      JSON.stringify(apartmentContractInfo)
    );

    setApartments(updatedApartments);
    closeApartment();
  };

  const openChargeModal = (
    mode: "charge" | "collection",
    type: string,
    apartmentNumber?: number
  ) => {
    if (denyChargeAdd(mode, type)) return;
    setChargeModalMode(mode);
    setChargeForm({
      type,
      amount: "",
      date: new Date().toISOString().slice(0, 10),
      notes: "",
    });
    setSelectedChargeApartments(
      apartmentNumber !== undefined ? [apartmentNumber] : []
    );
    setApartmentTypeFilter("");
    setApartmentStatusFilter("");
    setApartmentSearch("");
    setRentCollectionMonths(1);
    setRentDueMonth(new Date().toISOString().slice(0, 7));
    setRentDueMonths([]);
    setChargeDueMonth(new Date().toISOString().slice(0, 7));
    setChargeDueMonths([]);
    setCollectionDueMonth(new Date().toISOString().slice(0, 7));
    setCollectionDueMonths([]);
    setIsChargeModalOpen(true);
  };

  const toggleChargeApartment = (apartmentNumber: number) => {
    setSelectedChargeApartments((current) =>
      current.includes(apartmentNumber)
        ? current.filter((number) => number !== apartmentNumber)
        : [...current, apartmentNumber]
    );
  };

  const apartmentTypeOptions = Array.from(
    new Set([
      ...apartments.map((apartment) => getApartmentType(apartment)),
      ...customApartmentTypes,
    ])
  );

  const visibleChargeApartments = apartments.filter((apartment) => {
    const search = apartmentSearch.trim().toLowerCase();
    const apartmentType = getApartmentType(apartment);

    if (apartmentTypeFilter && apartmentType !== apartmentTypeFilter) {
      return false;
    }

    if (apartmentStatusFilter && apartment.status !== apartmentStatusFilter) {
      return false;
    }

    if (!search) {
      return true;
    }

    return (
      apartment.number.toString().includes(search) ||
      apartmentType.toLowerCase().includes(search)
    );
  });

  const toggleAllVisibleChargeApartments = () => {
    const visibleNumbers = visibleChargeApartments.map(
      (apartment) => apartment.number
    );

    const allVisibleSelected = visibleNumbers.every((number) =>
      selectedChargeApartments.includes(number)
    );

    setSelectedChargeApartments((current) =>
      allVisibleSelected
        ? current.filter((number) => !visibleNumbers.includes(number))
        : Array.from(new Set([...current, ...visibleNumbers]))
    );
  };

  const selectedRentTotal = selectedChargeApartments.reduce(
    (total, apartmentNumber) => {
      const apartment = apartments.find(
        (item) => item.number === apartmentNumber
      );

      return total + (apartment ? getApartmentRent(apartment) : 0);
    },
    0
  );

  const getContractDurationMonths = (contractInfo: ApartmentContractInfo) => {
    const value = Math.max(1, Number(contractInfo.durationValue) || 1);

    if (contractInfo.durationUnit === "year") {
      return value * 12;
    }

    if (contractInfo.durationUnit === "month") {
      return value;
    }

    return Math.max(1, Math.ceil(value / 30));
  };

  const getApartmentRentCollected = (apartmentNumber: number) => {
    return getApartmentPayments(apartmentNumber)
      .filter((payment) => payment.type?.trim() === "إيجار")
      .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  };

  const getApartmentRemainingRentMonths = (apartment: Apartment) => {
    const contractInfo = getApartmentContractInfo(apartment.number);
    const contractMonths = getContractDurationMonths(contractInfo);
    const monthlyRent = getApartmentRent(apartment);

    if (monthlyRent <= 0) {
      return 0;
    }

    const contractTotal = contractMonths * monthlyRent;
    const collectedRent = getApartmentRentCollected(apartment.number);
    const remainingValue = Math.max(contractTotal - collectedRent, 0);

    return Math.min(
      contractMonths,
      Math.max(0, Math.floor((remainingValue + 0.000001) / monthlyRent))
    );
  };

  const selectedRentChargeTotal =
    chargeModalMode === "charge" && chargeForm.type === "إيجار"
      ? selectedRentTotal * Math.max(1, rentDueMonths.length)
      : selectedRentTotal;

  const selectedRentCollectionTotal =
    chargeModalMode === "collection" && chargeForm.type === "إيجار"
      ? selectedRentTotal * Math.max(1, rentCollectionMonths)
      : selectedRentTotal;

  const selectedChargeNonRentTotal =
    chargeModalMode === "charge" && chargeForm.type !== "إيجار"
      ? selectedChargeApartments.length * (Number(chargeForm.amount) || 0) * Math.max(1, chargeDueMonths.length)
      : 0;

  const selectedCollectionNonRentTotal =
    chargeModalMode === "collection" && chargeForm.type !== "إيجار"
      ? selectedChargeApartments.length * (Number(chargeForm.amount) || 0) * Math.max(1, collectionDueMonths.length)
      : 0;

  const selectedRentCollectionMaxMonths = selectedChargeApartments.length
    ? Math.min(
        ...selectedChargeApartments.map((apartmentNumber) => {
          const apartment = apartments.find(
            (item) => item.number === apartmentNumber
          );
          return apartment ? getApartmentRemainingRentMonths(apartment) : 0;
        })
      )
    : 0;

  const getApartmentReport = () => {
    if (!apartmentReportType) {
      return {
        title: "",
        subtitle: "",
        data: [] as Apartment[],
      };
    }

    if (apartmentReportType === "total") {
      return {
        title: "تقرير إجمالي الشقق",
        subtitle: `جميع الشقق المسجلة في ${buildingName} (${totalApartments} شقة)`,
        data: apartments,
      };
    }

    if (apartmentReportType === "rented") {
      return {
        title: "تقرير الشقق المؤجرة",
        subtitle: `الشقق المؤجرة سكنيًا أو المؤجرة للشركة (${rentedApartments} شقة)`,
        data: apartments.filter((apartment) => {
          const status = getEffectiveApartmentStatus(apartment);
          return status === "مؤجرة" || status === "مؤجرة للشركة";
        }),
      };
    }

    if (apartmentReportType === "reserved") {
      return {
        title: "تقرير الشقق المحجوزة",
        subtitle: `الشقق التي حالتها محجوزة (${reservedApartments} شقة)`,
        data: apartments.filter(
          (apartment) => getEffectiveApartmentStatus(apartment) === "محجوزة"
        ),
      };
    }

    if (apartmentReportType === "maintenance") {
      return {
        title: "تقرير الشقق تحت الصيانة",
        subtitle: `الشقق التي حالتها تحت الصيانة (${maintenanceApartments} شقة)`,
        data: apartments.filter(
          (apartment) => getEffectiveApartmentStatus(apartment) === "تحت الصيانة"
        ),
      };
    }

    if (apartmentReportType === "vacant") {
      return {
        title: "تقرير الشقق الفارغة",
        subtitle: `الشقق الفارغة (${vacantApartments} شقة)`,
        data: apartments.filter(
          (apartment) => getEffectiveApartmentStatus(apartment) === "شاغرة"
        ),
      };
    }

    return {
      title: "تقرير نسبة الإشغال",
      subtitle: `نسبة الإشغال الحالية ${occupancyRate}% — ${rentedApartments} مؤجرة من أصل ${totalApartments} شقة`,
      data: apartments,
    };
  };

  const openApartmentReport = (
    type:
      | "total"
      | "rented"
      | "reserved"
      | "maintenance"
      | "vacant"
      | "occupancy"
  ) => {
    setApartmentReportType(type);
  };

  const closeApartmentReport = () => {
    setApartmentReportType(null);
  };

  const getBuildingChargesForPeriod = (): BuildingCharge[] => {
    try {
      const saved = getBuildingStorageValue("tumouh_star_building_charges");

      if (!saved) {
        return [];
      }

      const charges = JSON.parse(saved) as BuildingCharge[];

      return charges
        .filter((charge) => {
          const chargePeriod = charge.dueMonth
            ? `${charge.dueMonth}-01`
            : charge.date;

          if (!chargePeriod) {
            return false;
          }

          return chargePeriod >= fromDate && chargePeriod <= toDate;
        })
        .sort((a, b) => {
          const aPeriod = a.dueMonth ? `${a.dueMonth}-01` : a.date;
          const bPeriod = b.dueMonth ? `${b.dueMonth}-01` : b.date;

          if (aPeriod !== bPeriod) {
            return bPeriod.localeCompare(aPeriod);
          }

          return Number(a.apartmentNumber ?? 0) - Number(b.apartmentNumber ?? 0);
        });
    } catch {
      return [];
    }
  };

  const getCurrentRentDueCharges = (): BuildingCharge[] => {
    try {
      const saved = getBuildingStorageValue("tumouh_star_building_charges");
      if (!saved) return [];

      const charges = JSON.parse(saved) as BuildingCharge[];
      const currentMonth = getTodayLocalDateString().slice(0, 7);

      return charges
        .filter((charge) => {
          if (charge.type?.trim() !== "إيجار" || !charge.dueMonth) {
            return false;
          }

          // المستحق الآن = كل الشهور السابقة غير المحصلة + الشهر الحالي،
          // ولا ندخل أي شهر مستقبلي.
          return charge.dueMonth <= currentMonth;
        })
        .sort((a, b) => {
          const aPeriod = a.dueMonth || a.date;
          const bPeriod = b.dueMonth || b.date;
          return aPeriod.localeCompare(bPeriod);
        });
    } catch {
      return [];
    }
  };

  const getCurrentRentCollectionsTotal = () => {
    try {
      const saved = getBuildingStorageValue("tumouh_star_building_collections");
      if (!saved) return 0;

      const collections = JSON.parse(saved) as BuildingCharge[];
      return collections
        .filter((collection) => collection.type?.trim() === "إيجار")
        .reduce((sum, collection) => sum + (Number(collection.amount) || 0), 0);
    } catch {
      return 0;
    }
  };

  const getMonthlyRentDueTotal = () => {
    const dueTotal = getCurrentRentDueCharges().reduce(
      (sum, charge) => sum + (Number(charge.amount) || 0),
      0
    );

    return Math.max(dueTotal - getCurrentRentCollectionsTotal(), 0);
  };

  const getMonthlyDueTotal = () => {
    // هذه الخانة خاصة بالمستحقات الأخرى فقط، والإيجارات لها خانة مستقلة.
    const charges = getBuildingChargesForPeriod().filter(
      (charge) => charge.type?.trim() !== "إيجار"
    );

    return charges.reduce(
      (sum, charge) => sum + (Number(charge.amount) || 0),
      0
    );
  };

  const getMonthlyRentRows = () => {
    const charges = getCurrentRentDueCharges();

    return charges.map((charge) => {
      const apartment = apartments.find(
        (item) => Number(item.number) === Number(charge.apartmentNumber)
      );
      const tenantInfo = apartment ? getApartmentTenantInfo(apartment) : null;

      return {
        apartmentNumber: charge.apartmentNumber,
        tenant:
          tenantInfo?.tenantName ||
          apartment?.tenant ||
          "غير مضاف",
        date: charge.dueMonth ? `${charge.dueMonth}-01` : charge.date,
        type: "إيجار",
        amount: Number(charge.amount) || 0,
        notes: `إيجار مستحق عن شهر ${
          charge.dueMonth
            ? new Intl.DateTimeFormat("ar-SA", { year: "numeric", month: "long" }).format(
                new Date(`${charge.dueMonth}-01T00:00:00`)
              )
            : "غير محدد"
        }`,
      };
    });
  };

  const getMonthlyReportData = () => {
    const charges = getBuildingChargesForPeriod();

    if (monthlyReportType === "rent") {
      const rows = getMonthlyRentRows();
      return {
        title: "تقرير إجمالي الإيجارات المستحقة للشهر",
        subtitle: "تفاصيل الإيجارات المستحقة حتى الشهر الحالي، مع استبعاد الشهور المستقبلية والمحصل منها",
        rows,
        total: rows.reduce((sum, row) => sum + row.amount, 0),
      };
    }

    if (monthlyReportType === "electricity") {
      const rows = charges
        .filter((charge) => charge.type?.trim() === "فاتورة كهرباء")
        .map((charge) => {
          const apartment = apartments.find(
            (item) =>
              Number(item.number) === Number(charge.apartmentNumber)
          );
          const tenantInfo = apartment
            ? getApartmentTenantInfo(apartment)
            : null;

          return {
            apartmentNumber: charge.apartmentNumber,
            tenant:
              tenantInfo?.tenantName ||
              apartment?.tenant ||
              "غير مضاف",
            date: charge.date,
            type: charge.type || "فاتورة كهرباء",
            amount: Number(charge.amount) || 0,
            notes: charge.notes || "لا توجد تفاصيل",
          };
        });

      return {
        title: "تقرير إجمالي فواتير الكهرباء للشهر",
        subtitle: "تفاصيل فواتير الكهرباء المستحقة والمدخلة خلال الفترة المحددة",
        rows,
        total: rows.reduce((sum, row) => sum + row.amount, 0),
      };
    }

    if (monthlyReportType === "water") {
      const rows = charges
        .filter((charge) => charge.type?.trim() === "فاتورة مياه")
        .map((charge) => {
          const apartment = apartments.find(
            (item) =>
              Number(item.number) === Number(charge.apartmentNumber)
          );
          const tenantInfo = apartment
            ? getApartmentTenantInfo(apartment)
            : null;

          return {
            apartmentNumber: charge.apartmentNumber,
            tenant:
              tenantInfo?.tenantName ||
              apartment?.tenant ||
              "غير مضاف",
            date: charge.date,
            type: charge.type || "فاتورة مياه",
            amount: Number(charge.amount) || 0,
            notes: charge.notes || "لا توجد تفاصيل",
          };
        });

      return {
        title: "تقرير إجمالي فواتير المياه للشهر",
        subtitle: "تفاصيل فواتير المياه المستحقة والمدخلة خلال الفترة المحددة",
        rows,
        total: rows.reduce((sum, row) => sum + row.amount, 0),
      };
    }

    const rows = charges.map((charge) => {
      const apartment = apartments.find(
        (item) =>
          Number(item.number) === Number(charge.apartmentNumber)
      );
      const tenantInfo = apartment
        ? getApartmentTenantInfo(apartment)
        : null;

      return {
        apartmentNumber: charge.apartmentNumber,
        tenant:
          tenantInfo?.tenantName ||
          apartment?.tenant ||
          "غير مضاف",
        date: charge.date,
        type: charge.type || "غير محدد",
        amount: Number(charge.amount) || 0,
        notes: charge.notes || "لا توجد تفاصيل",
      };
    });

    return {
      title: "تقرير إجمالي المستحقات للشهر",
      subtitle: "تفاصيل جميع المستحقات المسجلة على الشقق خلال الفترة المحددة",
      rows,
      total: rows.reduce((sum, row) => sum + row.amount, 0),
    };
  };

  const getBuildingCollectionsForPeriod = (): BuildingCharge[] => {
    try {
      const saved = getBuildingStorageValue("tumouh_star_building_collections");

      if (!saved) {
        return [];
      }

      const parsed = JSON.parse(saved);
      const collections = Array.isArray(parsed) ? (parsed as BuildingCharge[]) : [];

      return collections
        .filter((collection) => {
          const collectionPeriod = collection.dueMonth
            ? `${collection.dueMonth}-01`
            : collection.date;

          if (!collectionPeriod) {
            return false;
          }

          return collectionPeriod >= fromDate && collectionPeriod <= toDate;
        })
        .sort((a, b) => {
          const aPeriod = a.dueMonth ? `${a.dueMonth}-01` : a.date;
          const bPeriod = b.dueMonth ? `${b.dueMonth}-01` : b.date;

          if (aPeriod !== bPeriod) {
            return bPeriod.localeCompare(aPeriod);
          }

          return (
            Number(a.apartmentNumber ?? 0) -
            Number(b.apartmentNumber ?? 0)
          );
        });
    } catch {
      return [];
    }
  };

  const getMonthlyCollectionReportData = () => {
    const charges = getBuildingChargesForPeriod();
    const collections = getBuildingCollectionsForPeriod();

    const monthlyRentRows = getMonthlyRentRows();

    const getTenantForApartment = (apartmentNumber?: number) => {
      const apartment = apartments.find(
        (item) => Number(item.number) === Number(apartmentNumber)
      );

      if (!apartment) {
        return "غير مضاف";
      }

      const tenantInfo = getApartmentTenantInfo(apartment);

      return tenantInfo.tenantName || apartment.tenant || "غير مضاف";
    };

    const getDueRows = (
      type: "total" | "rent" | "electricity" | "water"
    ) => {
      if (type === "rent") {
        return monthlyRentRows.map((row) => ({
          apartmentNumber: row.apartmentNumber,
          tenant: row.tenant,
          date: row.date,
          type: "إيجار",
          transactionType: "مستحق",
          amount: row.amount,
          notes: row.notes,
        }));
      }

      const filteredCharges =
        type === "electricity"
          ? charges.filter((charge) => charge.type?.trim() === "فاتورة كهرباء")
          : type === "water"
          ? charges.filter((charge) => charge.type?.trim() === "فاتورة مياه")
          : charges.filter((charge) => charge.type?.trim() !== "إيجار");

      return filteredCharges.map((charge) => ({
        apartmentNumber: charge.apartmentNumber,
        tenant: getTenantForApartment(charge.apartmentNumber),
        date: charge.date,
        type: charge.type || "غير محدد",
        transactionType: "مستحق",
        amount: Number(charge.amount) || 0,
        notes: charge.notes || "لا توجد تفاصيل",
      }));
    };

    const getCollectionRows = (
      type: "total" | "rent" | "electricity" | "water"
    ) => {
      const filteredCollections =
        type === "rent"
          ? collections.filter((collection) => collection.type?.trim() === "إيجار")
          : type === "electricity"
          ? collections.filter(
              (collection) => collection.type?.trim() === "فاتورة كهرباء"
            )
          : type === "water"
          ? collections.filter(
              (collection) => collection.type?.trim() === "فاتورة مياه"
            )
          : collections.filter(
              // تقرير تحصيلات المستحقات = المستحقات الأخرى فقط، بدون الإيجارات.
              (collection) => collection.type?.trim() !== "إيجار"
            );

      return filteredCollections.map((collection) => ({
        apartmentNumber: collection.apartmentNumber,
        tenant: getTenantForApartment(collection.apartmentNumber),
        date: collection.date,
        type: collection.type || "غير محدد",
        transactionType: "تحصيل",
        amount: Number(collection.amount) || 0,
        notes: collection.notes || "لا توجد تفاصيل",
      }));
    };

    const dueRows = getDueRows(monthlyCollectionReportType);
    const collectionRows = getCollectionRows(monthlyCollectionReportType);

    const dueTotal = dueRows.reduce((sum, row) => sum + row.amount, 0);
    const collectedTotal = collectionRows.reduce(
      (sum, row) => sum + row.amount,
      0
    );

    return {
      title:
        monthlyCollectionReportType === "total"
          ? "تقرير إجمالي تحصيلات المستحقات للشهر"
          : monthlyCollectionReportType === "rent"
          ? "تقرير إجمالي تحصيلات الإيجارات للشهر"
          : monthlyCollectionReportType === "electricity"
          ? "تقرير تحصيلات فواتير الكهرباء والمتبقي"
          : "تقرير تحصيلات فواتير المياه والمتبقي",
      subtitle:
        monthlyCollectionReportType === "total"
          ? "تفاصيل جميع المستحقات والتحصيلات المسجلة خلال الفترة المحددة"
          : monthlyCollectionReportType === "rent"
          ? "تفاصيل إيجارات الشقق والتحصيلات المسجلة خلال الفترة المحددة"
          : monthlyCollectionReportType === "electricity"
          ? "تفاصيل فواتير الكهرباء والتحصيلات المسجلة خلال الفترة المحددة"
          : "تفاصيل فواتير المياه والتحصيلات المسجلة خلال الفترة المحددة",
      rows: [...dueRows, ...collectionRows].sort((a, b) => {
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }

        return (
          Number(a.apartmentNumber ?? 0) -
          Number(b.apartmentNumber ?? 0)
        );
      }),
      dueTotal,
      collectedTotal,
      remainingTotal: Math.max(dueTotal - collectedTotal, 0),
    };
  };

  const getMonthlyCollectionReportHtml = () => {
    const report = getMonthlyCollectionReportData();

    const rows = report.rows.length
      ? report.rows
          .map(
            (row, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${row.apartmentNumber ?? "غير محدد"}</td>
                <td>${escapeReportHtml(row.tenant)}</td>
                <td>${escapeReportHtml(formatContractDate(row.date))}</td>
                <td>${escapeReportHtml(row.type)}</td>
                <td>${escapeReportHtml(row.transactionType)}</td>
                <td>${row.amount.toLocaleString("en-US")} ريال</td>
                <td>${escapeReportHtml(row.notes)}</td>
              </tr>
            `
          )
          .join("")
      : `
          <tr>
            <td colspan="8">لا توجد بيانات مسجلة خلال الفترة المحددة.</td>
          </tr>
        `;

    return `
      <div class="report-header">
        <div class="report-brand">TUMOUH STAR</div>
        <h1>${escapeReportHtml(report.title)}</h1>
        <div class="report-subtitle">
          ${escapeReportHtml(report.subtitle)}
        </div>
        <div class="report-period">
          من ${escapeReportHtml(formatContractDate(fromDate))}
          إلى ${escapeReportHtml(formatContractDate(toDate))}
        </div>
      </div>

      <div class="tenant-info">
        <div class="info-box">
          <span>إجمالي المستحق</span>
          <strong>${report.dueTotal.toLocaleString("en-US")} ريال</strong>
        </div>
        <div class="info-box">
          <span>إجمالي المحصل</span>
          <strong>${report.collectedTotal.toLocaleString("en-US")} ريال</strong>
        </div>
        <div class="info-box">
          <span>المتبقي</span>
          <strong>${report.remainingTotal.toLocaleString("en-US")} ريال</strong>
        </div>
        <div class="info-box">
          <span>عدد العمليات</span>
          <strong>${report.rows.length}</strong>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>رقم الشقة</th>
            <th>المستأجر / الجهة</th>
            <th>التاريخ</th>
            <th>نوع المستحق</th>
            <th>نوع العملية</th>
            <th>المبلغ</th>
            <th>تفاصيل / ملاحظات</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="report-footer">
        تاريخ إصدار التقرير: ${new Date().toLocaleDateString("ar-SA")}
      </div>
    `;
  };

  const getMonthlyCollectionExportDocument = () => {
    return `
      <!doctype html>
      <html dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <title>تقرير التحصيلات</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 28px;
              font-family: Arial, Tahoma, sans-serif;
              color: #111827;
              direction: rtl;
              background: #ffffff;
            }
            .report-header {
              text-align: center;
              margin-bottom: 22px;
            }
            .report-brand {
              font-size: 22px;
              font-weight: 900;
              letter-spacing: 2px;
              margin-bottom: 8px;
            }
            h1 {
              margin: 0;
              font-size: 28px;
            }
            .report-subtitle {
              margin-top: 7px;
              color: #6b7280;
              font-size: 14px;
            }
            .report-period {
              margin-top: 10px;
              font-size: 14px;
              font-weight: 800;
              color: #374151;
            }
            .tenant-info {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin-bottom: 16px;
            }
            .info-box {
              border: 1px solid #d1d5db;
              border-radius: 10px;
              padding: 11px;
              text-align: center;
              background: #f9fafb;
            }
            .info-box span {
              display: block;
              color: #6b7280;
              font-size: 12px;
              margin-bottom: 5px;
            }
            .info-box strong {
              display: block;
              font-size: 17px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              border: 1px solid #9ca3af;
              padding: 9px 7px;
              text-align: center;
              font-size: 12px;
              vertical-align: middle;
            }
            th {
              background: #e5e7eb;
              font-weight: 900;
            }
            .report-footer {
              margin-top: 18px;
              text-align: center;
              color: #6b7280;
              font-size: 12px;
            }
            @media print {
              body { padding: 10mm; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${getMonthlyCollectionReportHtml()}
        </body>
      </html>
    `;
  };

  const printMonthlyCollectionReport = () => {
    const report = getMonthlyCollectionReportData();

    if (!report.rows.length) {
      window.alert("لا توجد بيانات تحصيل أو مستحقات خلال الفترة المحددة.");
      return;
    }

    const printWindow = window.open(
      "",
      "_blank",
      "width=1200,height=850"
    );

    if (!printWindow) {
      window.alert(
        "تعذر فتح نافذة التقرير. اسمح بالنوافذ المنبثقة ثم حاول مرة أخرى."
      );
      return;
    }

    printWindow.document.write(getMonthlyCollectionExportDocument());
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const exportMonthlyCollectionPdf = () => {
    printMonthlyCollectionReport();
  };

  const exportMonthlyCollectionExcel = () => {
    const report = getMonthlyCollectionReportData();

    if (!report.rows.length) {
      window.alert("لا توجد بيانات تحصيل أو مستحقات خلال الفترة المحددة لتصديرها.");
      return;
    }

    const rows = report.rows
      .map(
        (row, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${row.apartmentNumber ?? "غير محدد"}</td>
            <td>${escapeReportHtml(row.tenant)}</td>
            <td>${escapeReportHtml(formatContractDate(row.date))}</td>
            <td>${escapeReportHtml(row.type)}</td>
            <td>${escapeReportHtml(row.transactionType)}</td>
            <td>${row.amount.toLocaleString("en-US")}</td>
            <td>${escapeReportHtml(row.notes)}</td>
          </tr>
        `
      )
      .join("");

    const html = `
      <html dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <style>
            body { font-family: Arial, Tahoma, sans-serif; direction: rtl; }
            h1, p { text-align: center; }
            .summary {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
            }
            .summary td {
              border: 1px solid #999;
              padding: 8px;
              text-align: center;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            th, td {
              border: 1px solid #999;
              padding: 8px;
              text-align: center;
            }
            th { background: #e9ecef; }
          </style>
        </head>
        <body>
          <h1>${escapeReportHtml(report.title)}</h1>
          <p>Tumouh Star</p>
          <p>
            الفترة من ${escapeReportHtml(formatContractDate(fromDate))}
            إلى ${escapeReportHtml(formatContractDate(toDate))}
          </p>

          <table class="summary">
            <tr>
              <td><strong>إجمالي المستحق</strong><br />${report.dueTotal.toLocaleString("en-US")} ريال</td>
              <td><strong>إجمالي المحصل</strong><br />${report.collectedTotal.toLocaleString("en-US")} ريال</td>
              <td><strong>المتبقي</strong><br />${report.remainingTotal.toLocaleString("en-US")} ريال</td>
              <td><strong>عدد العمليات</strong><br />${report.rows.length}</td>
            </tr>
          </table>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>رقم الشقة</th>
                <th>المستأجر / الجهة</th>
                <th>التاريخ</th>
                <th>نوع المستحق</th>
                <th>نوع العملية</th>
                <th>المبلغ</th>
                <th>تفاصيل / ملاحظات</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${report.title.replace(/\s+/g, "_")}_${fromDate}_${toDate}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getMonthlyDueReportHtml = () => {
    const report = getMonthlyReportData();

    const rows = report.rows.length
      ? report.rows
          .map(
            (row, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${row.apartmentNumber ?? "غير محدد"}</td>
                <td>${escapeReportHtml(row.tenant)}</td>
                <td>${escapeReportHtml(formatContractDate(row.date))}</td>
                <td>${escapeReportHtml(row.type)}</td>
                <td>${row.amount.toLocaleString("en-US")} ريال</td>
                <td>${escapeReportHtml(row.notes)}</td>
              </tr>
            `
          )
          .join("")
      : `
          <tr>
            <td colspan="7">لا توجد بيانات مسجلة خلال الفترة المحددة.</td>
          </tr>
        `;

    return `
      <div class="report-header">
        <div class="report-brand">TUMOUH STAR</div>
        <h1>${escapeReportHtml(report.title)}</h1>
        <div class="report-subtitle">
          ${escapeReportHtml(report.subtitle)}
        </div>
        <div class="report-period">
          من ${escapeReportHtml(formatContractDate(fromDate))}
          إلى ${escapeReportHtml(formatContractDate(toDate))}
        </div>
      </div>

      <div class="summary">
        <div class="summary-box">
          <span>عدد العمليات</span>
          <strong>${report.rows.length}</strong>
        </div>
        <div class="summary-box total">
          <span>الإجمالي</span>
          <strong>${report.total.toLocaleString("en-US")} ريال</strong>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>رقم الشقة</th>
            <th>المستأجر / الجهة</th>
            <th>التاريخ</th>
            <th>نوع المستحق</th>
            <th>المبلغ</th>
            <th>تفاصيل / ملاحظات</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="report-footer">
        تاريخ إصدار التقرير: ${new Date().toLocaleDateString("ar-SA")}
      </div>
    `;
  };

  const getMonthlyDueExportDocument = () => {
    const report = getMonthlyReportData();

    return `
      <!doctype html>
      <html dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <title>${escapeReportHtml(report.title)}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 28px;
              font-family: Arial, Tahoma, sans-serif;
              color: #111827;
              direction: rtl;
              background: #ffffff;
            }
            .report-header {
              text-align: center;
              margin-bottom: 22px;
            }
            .report-brand {
              font-size: 22px;
              font-weight: 900;
              letter-spacing: 2px;
              margin-bottom: 8px;
            }
            h1 {
              margin: 0;
              font-size: 28px;
            }
            .report-subtitle {
              margin-top: 7px;
              color: #6b7280;
              font-size: 14px;
            }
            .report-period {
              margin-top: 10px;
              font-size: 14px;
              font-weight: 800;
              color: #374151;
            }
            .summary {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-bottom: 16px;
            }
            .summary-box {
              border: 1px solid #d1d5db;
              border-radius: 10px;
              padding: 12px;
              text-align: center;
              background: #f9fafb;
            }
            .summary-box span {
              display: block;
              color: #6b7280;
              font-size: 12px;
              margin-bottom: 5px;
            }
            .summary-box strong {
              display: block;
              font-size: 20px;
            }
            .summary-box.total strong {
              font-size: 24px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              border: 1px solid #9ca3af;
              padding: 9px 7px;
              text-align: center;
              font-size: 12px;
              vertical-align: middle;
            }
            th {
              background: #e5e7eb;
              font-weight: 900;
            }
            .report-footer {
              margin-top: 18px;
              text-align: center;
              color: #6b7280;
              font-size: 12px;
            }
            @media print {
              body { padding: 10mm; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${getMonthlyDueReportHtml()}
        </body>
      </html>
    `;
  };

  const printMonthlyDueReport = () => {
    const report = getMonthlyReportData();

    if (!report.rows.length) {
      window.alert("لا توجد بيانات مسجلة خلال الفترة المحددة للطباعة أو التصدير.");
      return;
    }

    const printWindow = window.open(
      "",
      "_blank",
      "width=1200,height=850"
    );

    if (!printWindow) {
      window.alert(
        "تعذر فتح نافذة التقرير. اسمح بالنوافذ المنبثقة ثم حاول مرة أخرى."
      );
      return;
    }

    printWindow.document.write(getMonthlyDueExportDocument());
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const exportMonthlyDuePdf = () => {
    printMonthlyDueReport();
  };

  const exportMonthlyDueExcel = () => {
    const report = getMonthlyReportData();

    if (!report.rows.length) {
      window.alert("لا توجد بيانات مسجلة خلال الفترة المحددة لتصديرها.");
      return;
    }

    const rows = report.rows
      .map(
        (row, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${row.apartmentNumber ?? "غير محدد"}</td>
            <td>${escapeReportHtml(row.tenant)}</td>
            <td>${escapeReportHtml(formatContractDate(row.date))}</td>
            <td>${escapeReportHtml(row.type)}</td>
            <td>${row.amount.toLocaleString("en-US")}</td>
            <td>${escapeReportHtml(row.notes)}</td>
          </tr>
        `
      )
      .join("");

    const html = `
      <html dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <style>
            body { font-family: Arial, Tahoma, sans-serif; direction: rtl; }
            h1, p { text-align: center; }
            .info {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
            }
            .info td {
              border: 1px solid #999;
              padding: 8px;
              text-align: center;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            th, td {
              border: 1px solid #999;
              padding: 8px;
              text-align: center;
            }
            th { background: #e9ecef; }
          </style>
        </head>
        <body>
          <h1>${escapeReportHtml(report.title)}</h1>
          <p>Tumouh Star</p>
          <p>
            الفترة من ${escapeReportHtml(
              formatContractDate(fromDate)
            )} إلى ${escapeReportHtml(formatContractDate(toDate))}
          </p>

          <table class="info">
            <tr>
              <td><strong>عدد العمليات</strong><br />${
                report.rows.length
              }</td>
              <td><strong>الإجمالي</strong><br />${report.total.toLocaleString(
                "en-US"
              )} ريال</td>
            </tr>
          </table>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>رقم الشقة</th>
                <th>المستأجر / الجهة</th>
                <th>التاريخ</th>
                <th>نوع المستحق</th>
                <th>المبلغ</th>
                <th>تفاصيل / ملاحظات</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${report.title.replace(/\s+/g, "_")}_${fromDate}_${toDate}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const escapeReportHtml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  function getApartmentPayments(apartmentNumber: number): BuildingCharge[] {
    try {
      const saved = getBuildingStorageValue("tumouh_star_building_collections");

      if (!saved) {
        return [];
      };

      const collections = JSON.parse(saved) as BuildingCharge[];

      return collections
        .filter(
          (payment) =>
            payment &&
            Number(payment.apartmentNumber) === Number(apartmentNumber)
        )
        .sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")));
    } catch {
      return [];
    }
  };

  const formatPaymentDate = (value: string) => {
    return formatContractDate(value);
  };

  const getSelectedApartmentPeriodPayments = (): BuildingCharge[] => {
    if (!selectedApartment) {
      return [];
    }

    return getApartmentPayments(selectedApartment.number).filter(
      (payment) =>
        Boolean(payment.date) &&
        payment.date >= fromDate &&
        payment.date <= toDate
    );
  };

  const getSelectedApartmentPeriodCharges = (): BuildingCharge[] => {
    if (!selectedApartment) {
      return [];
    }

    try {
      const saved = getBuildingStorageValue("tumouh_star_building_charges");

      if (!saved) {
        return [];
      }

      const charges = JSON.parse(saved) as BuildingCharge[];

      return charges.filter(
        (charge) =>
          Number(charge.apartmentNumber) === Number(selectedApartment.number) &&
          Boolean(charge.date) &&
          charge.date >= fromDate &&
          charge.date <= toDate
      );
    } catch {
      return [];
    }
  };

  const getApartmentRentDueCharges = (apartmentNumber: number): BuildingCharge[] => {
    try {
      const saved = getBuildingStorageValue("tumouh_star_building_charges");
      if (!saved) return [];
      const charges = JSON.parse(saved) as BuildingCharge[];
      return charges
        .filter(
          (charge) =>
            Number(charge.apartmentNumber) === Number(apartmentNumber) &&
            charge.type?.trim() === "إيجار"
        )
        .sort((a, b) => {
          const aPeriod = a.dueMonth ? `${a.dueMonth}-01` : a.date;
          const bPeriod = b.dueMonth ? `${b.dueMonth}-01` : b.date;
          return bPeriod.localeCompare(aPeriod);
        });
    } catch {
      return [];
    }
  };

  const getSelectedApartmentLateRemaining = () => {
    if (!selectedApartment) {
      return 0;
    }

    const contractInfo = getApartmentContractInfo(selectedApartment.number);
    const apartmentRent = getApartmentRent(selectedApartment);
    const today = getTodayLocalDateString();

    // إجمالي الإيجارات المستحقة من بداية العقد حتى اليوم.
    const accruedRentMonths =
      selectedApartment.status === "مؤجرة" ||
      selectedApartment.status === "مؤجرة للشركة"
        ? getAccruedRentMonths(contractInfo.startDate, contractInfo.endDate)
        : 0;
    const rentDue = accruedRentMonths * apartmentRent;

    // إجمالي المستحقات الأخرى المسجلة على الشقة من بداية العقد حتى اليوم
    // (مع استبعاد الإيجار حتى لا يتم احتسابه مرتين).
    const otherDue = getApartmentCharges(
      selectedApartment.number,
      contractInfo.startDate
    ).reduce((sum, charge) => sum + (Number(charge.amount) || 0), 0);

    // كل التحصيلات الفعلية المسجلة على الشقة حتى اليوم، بما فيها الإيجارات
    // والمدفوعات الخاصة بالفواتير والمستحقات الأخرى.
    const contractPayments = getApartmentPayments(selectedApartment.number).filter(
      (payment) => Boolean(payment.date) && payment.date <= today
    );
    const collected = contractPayments.reduce(
      (sum, payment) => sum + (Number(payment.amount) || 0),
      0
    );

    // المتبقي الفعلي على الشقة = كل المستحقات حتى اليوم - كل ما تم تحصيله.
    const totalDue = rentDue + otherDue;
    return Math.max(totalDue - collected, 0);
  };

  const getSelectedApartmentFinancialReport = () => {
    if (!selectedApartment || !selectedApartmentFinancialReport) {
      return { title: "", rows: [], total: 0 };
    }

    const payments = getSelectedApartmentPeriodPayments();
    const charges = getSelectedApartmentPeriodCharges();

    if (selectedApartmentFinancialReport === "collections") {
      return {
        title: "تقرير تحصيلات الشقة",
        rows: payments,
        total: payments.reduce(
          (sum, payment) => sum + (Number(payment.amount) || 0),
          0
        ),
      };
    }

    if (selectedApartmentFinancialReport === "water") {
      const rows = charges.filter(
        (charge) => charge.type?.trim() === "فاتورة مياه"
      );
      return {
        title: "تقرير فواتير المياه للشقة",
        rows,
        total: rows.reduce(
          (sum, charge) => sum + (Number(charge.amount) || 0),
          0
        ),
      };
    }

    if (selectedApartmentFinancialReport === "electricity") {
      const rows = charges.filter(
        (charge) => charge.type?.trim() === "فاتورة كهرباء"
      );
      return {
        title: "تقرير فواتير الكهرباء للشقة",
        rows,
        total: rows.reduce(
          (sum, charge) => sum + (Number(charge.amount) || 0),
          0
        ),
      };
    }

    const contractInfo = getApartmentContractInfo(selectedApartment.number);
    const apartmentRent = getApartmentRent(selectedApartment);
    const today = getTodayLocalDateString();

    // إجمالي الإيجارات المستحقة من بداية العقد حتى اليوم.
    const accruedRentMonths =
      selectedApartment.status === "مؤجرة" ||
      selectedApartment.status === "مؤجرة للشركة"
        ? getAccruedRentMonths(contractInfo.startDate, contractInfo.endDate)
        : 0;
    const rentDue = accruedRentMonths * apartmentRent;

    // إجمالي المستحقات الأخرى المسجلة على الشقة من بداية العقد حتى اليوم
    // (مع استبعاد الإيجار حتى لا يتم احتسابه مرتين).
    const otherDue = getApartmentCharges(
      selectedApartment.number,
      contractInfo.startDate
    ).reduce((sum, charge) => sum + (Number(charge.amount) || 0), 0);

    // كل التحصيلات الفعلية المسجلة على الشقة حتى اليوم، بما فيها الإيجارات
    // والمدفوعات الخاصة بالفواتير والمستحقات الأخرى.
    const contractPayments = getApartmentPayments(selectedApartment.number).filter(
      (payment) => Boolean(payment.date) && payment.date <= today
    );
    const collected = contractPayments.reduce(
      (sum, payment) => sum + (Number(payment.amount) || 0),
      0
    );

    // المتبقي الفعلي على الشقة = كل المستحقات حتى اليوم - كل ما تم تحصيله.
    const totalDue = rentDue + otherDue;
    const remaining = Math.max(totalDue - collected, 0);

    return {
      title: "تقرير التحصيلات المتأخرة للشقة",
      rows: [
        {
          type: "إجمالي الإيجارات المستحقة",
          amount: String(rentDue),
          date: today,
          notes: `من بداية العقد حتى اليوم — عدد أشهر الإيجار المستحقة: ${accruedRentMonths} × ${apartmentRent.toLocaleString("ar-SA")} ريال`,
          apartmentNumber: selectedApartment.number,
        },
        {
          type: "إجمالي المستحقات الأخرى",
          amount: String(otherDue),
          date: today,
          notes: "إجمالي المستحقات والفواتير المسجلة على الشقة حتى اليوم",
          apartmentNumber: selectedApartment.number,
        },
        {
          type: "إجمالي المستحقات حتى اليوم",
          amount: String(totalDue),
          date: today,
          notes: "الإيجارات المستحقة + المستحقات والفواتير الأخرى",
          apartmentNumber: selectedApartment.number,
        },
        {
          type: "إجمالي المحصل",
          amount: String(collected),
          date: today,
          notes: "إجمالي جميع التحصيلات الفعلية المسجلة على الشقة حتى اليوم",
          apartmentNumber: selectedApartment.number,
        },
        {
          type: "إجمالي المتبقي",
          amount: String(remaining),
          date: today,
          notes: "المبلغ المتبقي فعليًا بعد خصم جميع التحصيلات من إجمالي المستحقات",
          apartmentNumber: selectedApartment.number,
        },
      ],
      total: remaining,
    };
  };

  const getSelectedApartmentFinancialReportExportDocument = () => {
    if (!selectedApartment || !selectedApartmentFinancialReport) {
      return "";
    }

    const report = getSelectedApartmentFinancialReport();
    const rows = report.rows
      .map(
        (row, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeReportHtml(formatContractDate(row.date))}</td>
            <td>${escapeReportHtml(row.type || "غير محدد")}</td>
            <td>${(Number(row.amount) || 0).toLocaleString("en-US")} ريال</td>
            <td>${escapeReportHtml(row.notes || "لا توجد تفاصيل")}</td>
          </tr>
        `
      )
      .join("");

    return `
      <!doctype html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>${escapeReportHtml(report.title)}</title>
          <style>
            body { font-family: Arial, Tahoma, sans-serif; direction: rtl; padding: 28px; color: #111827; }
            .header { text-align: center; margin-bottom: 24px; }
            .brand { font-size: 18px; font-weight: 900; letter-spacing: 2px; color: #b77900; }
            h1 { margin: 8px 0; font-size: 25px; }
            .subtitle { color: #6b7280; font-size: 13px; }
            .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 20px 0; }
            .box { border: 1px solid #d1d5db; border-radius: 10px; padding: 12px; text-align: center; }
            .label { color: #6b7280; font-size: 11px; margin-bottom: 5px; }
            .value { font-size: 18px; font-weight: 900; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; }
            th, td { border: 1px solid #d1d5db; padding: 9px; text-align: center; font-size: 12px; }
            th { background: #eef2f7; font-weight: 900; }
            .total { margin-top: 18px; padding: 14px; border: 1px solid #d1d5db; text-align: center; font-weight: 900; }
            @media print { body { padding: 10mm; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">TUMOUH STAR</div>
            <h1>${escapeReportHtml(report.title)}</h1>
            <div class="subtitle">شقة رقم ${selectedApartment.number} — ${formatContractDate(fromDate)} إلى ${formatContractDate(toDate)}</div>
          </div>

          <div class="summary">
            <div class="box"><div class="label">إجمالي التقرير</div><div class="value">${report.total.toLocaleString("en-US")} ريال</div></div>
            <div class="box"><div class="label">عدد العمليات</div><div class="value">${report.rows.length}</div></div>
            <div class="box"><div class="label">الفترة</div><div class="value">${formatContractDate(fromDate)} — ${formatContractDate(toDate)}</div></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>التاريخ</th>
                <th>نوع العملية</th>
                <th>المبلغ</th>
                <th>التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="5">لا توجد بيانات خلال الفترة المحددة.</td></tr>'}
            </tbody>
          </table>

          <div class="total">إجمالي التقرير: ${report.total.toLocaleString("en-US")} ريال</div>
        </body>
      </html>
    `;
  };

  const exportSelectedApartmentFinancialReportExcel = () => {
    if (!selectedApartment || !selectedApartmentFinancialReport) {
      return;
    }

    const report = getSelectedApartmentFinancialReport();
    if (!report.rows.length) {
      window.alert("لا توجد بيانات خلال الفترة المحددة لتصديرها.");
      return;
    }

    const html = getSelectedApartmentFinancialReportExportDocument();
    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `تقرير_${report.title.replace(/\s+/g, "_")}_شقة_${selectedApartment.number}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const printSelectedApartmentFinancialReport = () => {
    if (!selectedApartment || !selectedApartmentFinancialReport) {
      return;
    }

    const report = getSelectedApartmentFinancialReport();
    if (!report.rows.length) {
      window.alert("لا توجد بيانات خلال الفترة المحددة للطباعة أو التصدير.");
      return;
    }

    const printWindow = window.open("", "_blank", "width=1100,height=800");

    if (!printWindow) {
      window.alert("تعذر فتح نافذة التقرير. اسمح بالنوافذ المنبثقة ثم حاول مرة أخرى.");
      return;
    }

    printWindow.document.write(getSelectedApartmentFinancialReportExportDocument());
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const exportSelectedApartmentFinancialReportPdf = () => {
    printSelectedApartmentFinancialReport();
  };

  const getApartmentCharges = (
    apartmentNumber: number,
    fromDate?: string
  ): BuildingCharge[] => {
    try {
      const saved = getBuildingStorageValue("tumouh_star_building_charges");

      if (!saved) {
        return [];
      }

      const charges = JSON.parse(saved) as BuildingCharge[];
      const today = getTodayLocalDateString();

      return charges.filter(
        (charge) =>
          Number(charge.apartmentNumber) === Number(apartmentNumber) &&
          Boolean(charge.date) &&
          charge.date <= today &&
          (!fromDate || charge.date >= fromDate) &&
          charge.type?.trim() !== "إيجار"
      );
    } catch {
      return [];
    }
  };


  const getApartmentPaymentReportHtml = () => {
    if (!selectedApartment) {
      return "";
    }

    const tenantInfo = getApartmentTenantInfo(selectedApartment);
    const payments = getApartmentPayments(selectedApartment.number);
    const totalPaid = payments.reduce(
      (sum, payment) => sum + (Number(payment.amount) || 0),
      0
    );

    const paymentRows = payments.length
      ? payments
          .map(
            (payment, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${escapeReportHtml(formatPaymentDate(payment.date))}</td>
                <td>${escapeReportHtml(payment.type || "غير محدد")}</td>
                <td>${(Number(payment.amount) || 0).toLocaleString("en-US")} ريال</td>
                <td>${escapeReportHtml(payment.notes || "لا توجد تفاصيل")}</td>
              </tr>
            `
          )
          .join("")
      : `
          <tr>
            <td colspan="5">لا توجد دفعات مسجلة لهذه الشقة.</td>
          </tr>
        `;

    return `
      <div class="report-header">
        <div class="report-brand">TUMOUH STAR</div>
        <h1>تقرير سجل دفعات الشقة</h1>
        <div class="report-subtitle">تفاصيل جميع عمليات الدفع والتحصيل المسجلة للشقة</div>
      </div>

      <div class="tenant-info">
        <div class="info-box">
          <span>رقم الشقة</span>
          <strong>${selectedApartment.number}</strong>
        </div>
        <div class="info-box">
          <span>اسم المستأجر</span>
          <strong>${escapeReportHtml(tenantInfo.tenantName || "غير مضاف")}</strong>
        </div>
        <div class="info-box">
          <span>رقم الجوال</span>
          <strong>${escapeReportHtml(tenantInfo.phone || "غير مضاف")}</strong>
        </div>
        <div class="info-box">
          <span>رقم الهوية / الإقامة</span>
          <strong>${escapeReportHtml(
            tenantInfo.identityNumber || "غير مضاف"
          )}</strong>
        </div>
      </div>

      <div class="report-total">
        <span>إجمالي المدفوعات</span>
        <strong>${totalPaid.toLocaleString("en-US")} ريال</strong>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>تاريخ الدفع</th>
            <th>نوع المستحق</th>
            <th>المبلغ</th>
            <th>تفاصيل / ملاحظات</th>
          </tr>
        </thead>
        <tbody>${paymentRows}</tbody>
      </table>

      <div class="report-footer">
        تاريخ إصدار التقرير: ${new Date().toLocaleDateString("ar-SA")}
      </div>
    `;
  };

  const getApartmentPaymentExportDocument = () => {
    return `
      <!doctype html>
      <html dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <title>تقرير دفعات الشقة ${selectedApartment?.number ?? ""}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 28px;
              font-family: Arial, Tahoma, sans-serif;
              color: #111827;
              direction: rtl;
              background: #ffffff;
            }
            .report-header {
              text-align: center;
              margin-bottom: 22px;
            }
            .report-brand {
              font-size: 22px;
              font-weight: 900;
              letter-spacing: 2px;
              margin-bottom: 8px;
            }
            h1 {
              margin: 0;
              font-size: 28px;
            }
            .report-subtitle {
              margin-top: 7px;
              color: #6b7280;
              font-size: 14px;
            }
            .tenant-info {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin-bottom: 16px;
            }
            .info-box {
              border: 1px solid #d1d5db;
              border-radius: 10px;
              padding: 11px;
              text-align: center;
              background: #f9fafb;
            }
            .info-box span {
              display: block;
              color: #6b7280;
              font-size: 12px;
              margin-bottom: 5px;
            }
            .info-box strong {
              display: block;
              font-size: 15px;
              word-break: break-word;
            }
            .report-total {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border: 1px solid #d1d5db;
              border-radius: 10px;
              padding: 12px 15px;
              margin-bottom: 16px;
              background: #f9fafb;
              font-weight: 800;
            }
            .report-total strong {
              font-size: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              border: 1px solid #9ca3af;
              padding: 10px 8px;
              text-align: center;
              font-size: 13px;
              vertical-align: middle;
            }
            th {
              background: #e5e7eb;
              font-weight: 900;
            }
            .report-footer {
              margin-top: 18px;
              text-align: center;
              color: #6b7280;
              font-size: 12px;
            }
            @media print {
              body { padding: 10mm; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${getApartmentPaymentReportHtml()}
        </body>
      </html>
    `;
  };

  const exportApartmentPaymentsExcel = () => {
    if (!selectedApartment) {
      return;
    }

    const payments = getApartmentPayments(selectedApartment.number);

    if (!payments.length) {
      window.alert("لا توجد دفعات مسجلة لهذه الشقة لتصديرها.");
      return;
    }

    const tenantInfo = getApartmentTenantInfo(selectedApartment);
    const totalPaid = payments.reduce(
      (sum, payment) => sum + (Number(payment.amount) || 0),
      0
    );

    const rows = payments
      .map(
        (payment, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeReportHtml(formatPaymentDate(payment.date))}</td>
            <td>${escapeReportHtml(payment.type || "غير محدد")}</td>
            <td>${(Number(payment.amount) || 0).toLocaleString("en-US")}</td>
            <td>${escapeReportHtml(payment.notes || "لا توجد تفاصيل")}</td>
          </tr>
        `
      )
      .join("");

    const html = `
      <html dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <style>
            body { font-family: Arial, Tahoma, sans-serif; direction: rtl; }
            h1, h2, p { text-align: center; }
            .info {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
            }
            .info td {
              border: 1px solid #999;
              padding: 8px;
              text-align: center;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            th, td {
              border: 1px solid #999;
              padding: 8px;
              text-align: center;
            }
            th { background: #e9ecef; }
          </style>
        </head>
        <body>
          <h1>تقرير سجل دفعات الشقة</h1>
          <p>Tumouh Star</p>
          <table class="info">
            <tr>
              <td><strong>رقم الشقة</strong><br />${selectedApartment.number}</td>
              <td><strong>اسم المستأجر</strong><br />${escapeReportHtml(
                tenantInfo.tenantName || "غير مضاف"
              )}</td>
              <td><strong>رقم الجوال</strong><br />${escapeReportHtml(
                tenantInfo.phone || "غير مضاف"
              )}</td>
              <td><strong>رقم الهوية / الإقامة</strong><br />${escapeReportHtml(
                tenantInfo.identityNumber || "غير مضاف"
              )}</td>
            </tr>
            <tr>
              <td colspan="4"><strong>إجمالي المدفوعات: ${totalPaid.toLocaleString(
                "en-US"
              )} ريال</strong></td>
            </tr>
          </table>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>تاريخ الدفع</th>
                <th>نوع المستحق</th>
                <th>المبلغ</th>
                <th>تفاصيل / ملاحظات</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `سجل_دفعات_الشقة_${selectedApartment.number}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsPaymentExportMenuOpen(false);
  };

  const printApartmentPayments = () => {
    if (!selectedApartment) {
      return;
    }

    const payments = getApartmentPayments(selectedApartment.number);

    if (!payments.length) {
      window.alert("لا توجد دفعات مسجلة لهذه الشقة للطباعة أو التصدير.");
      return;
    }

    const printWindow = window.open(
      "",
      "_blank",
      "width=1100,height=800"
    );

    if (!printWindow) {
      window.alert(
        "تعذر فتح نافذة التقرير. اسمح بالنوافذ المنبثقة ثم حاول مرة أخرى."
      );
      return;
    }

    printWindow.document.write(getApartmentPaymentExportDocument());
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 250);

    setIsPaymentExportMenuOpen(false);
  };

  const exportApartmentPaymentsPdf = () => {
    printApartmentPayments();
  };

  const getApartmentTypeReportData = () => {
    if (!selectedApartmentTypeReport) {
      return [];
    }

    return apartments
      .filter(
        (apartment) =>
          getApartmentType(apartment) === selectedApartmentTypeReport
      )
      .map((apartment) => {
        const extraInfo = getApartmentExtraInfo(apartment.number);
        const tenantInfo = getApartmentTenantInfo(apartment);
        const contractInfo = getApartmentContractInfo(apartment.number);
        const payments = getApartmentPayments(apartment.number);

        return {
          apartment,
          extraInfo,
          tenantInfo,
          contractInfo,
          paymentCount: payments.length,
          totalPaid: payments.reduce(
            (sum, payment) => sum + (Number(payment.amount) || 0),
            0
          ),
        };
      });
  };

  const getApartmentTypeReportTitle = () =>
    selectedApartmentTypeReport
      ? `تقرير شقق ${selectedApartmentTypeReport}`
      : "";

  const exportApartmentTypeReportExcel = () => {
    const rows = getApartmentTypeReportData();

    if (!rows.length) {
      window.alert("لا توجد شقق مسجلة لهذا النوع لتصديرها.");
      return;
    }

    const bodyRows = rows
      .map(
        ({
          apartment,
          extraInfo,
          tenantInfo,
          contractInfo,
          paymentCount,
          totalPaid,
        }) => `
          <tr>
            <td>${apartment.number}</td>
            <td>${escapeReportHtml(getApartmentType(apartment))}</td>
            <td>${escapeReportHtml(
              apartment.status === "شاغرة" ? "فارغة" : apartment.status
            )}</td>
            <td>${getApartmentRent(apartment).toLocaleString("en-US")}</td>
            <td>${escapeReportHtml(tenantInfo.tenantName || apartment.tenant || "غير مضاف")}</td>
            <td>${escapeReportHtml(tenantInfo.phone || "غير مضاف")}</td>
            <td>${escapeReportHtml(tenantInfo.identityNumber || "غير مضاف")}</td>
            <td>${escapeReportHtml(extraInfo.floor || "غير محدد")}</td>
            <td>${escapeReportHtml(extraInfo.parking)}</td>
            <td>${escapeReportHtml(extraInfo.electricityMeter)}</td>
            <td>${escapeReportHtml(extraInfo.waterMeter)}</td>
            <td>${escapeReportHtml(extraInfo.furnitureStatus)}</td>
            <td>${escapeReportHtml(contractInfo.contractNumber || "غير محدد")}</td>
            <td>${escapeReportHtml(formatContractDate(contractInfo.startDate))}</td>
            <td>${escapeReportHtml(formatContractDate(contractInfo.endDate))}</td>
            <td>${escapeReportHtml(
              formatContractDuration(
                contractInfo.durationUnit,
                contractInfo.durationValue
              )
            )}</td>
            <td>${Number(contractInfo.insuranceAmount || 0).toLocaleString("en-US")}</td>
            <td>${escapeReportHtml(contractInfo.insuranceNotes || "لا توجد ملاحظات")}</td>
            <td>${paymentCount}</td>
            <td>${totalPaid.toLocaleString("en-US")}</td>
          </tr>
        `
      )
      .join("");

    const html = `
      <!doctype html>
      <html dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <title>${escapeReportHtml(getApartmentTypeReportTitle())}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 24px;
              font-family: Arial, "Tahoma", sans-serif;
              direction: rtl;
              color: #111827;
            }
            h1 { margin: 0 0 8px; text-align: center; font-size: 26px; }
            p { margin: 0 0 18px; text-align: center; color: #4b5563; }
            .summary {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin-bottom: 18px;
            }
            .summary div {
              border: 1px solid #d1d5db;
              border-radius: 10px;
              padding: 10px;
              text-align: center;
              background: #f9fafb;
              font-weight: 700;
            }
            .table-wrap { overflow-x: auto; }
            table { width: 100%; min-width: 2400px; border-collapse: collapse; }
            th, td {
              border: 1px solid #9ca3af;
              padding: 7px 6px;
              text-align: center;
              font-size: 10px;
              white-space: nowrap;
            }
            th { background: #e5e7eb; }
            @media print {
              @page { size: A3 landscape; margin: 8mm; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <h1>${escapeReportHtml(getApartmentTypeReportTitle())}</h1>
          <p>تفاصيل جميع الشقق المسجلة تحت هذا النوع</p>
          <div class="summary">
            <div>عدد الشقق: ${rows.length}</div>
            <div>إيجار الشقة: ${getApartmentRent(rows[0].apartment).toLocaleString("en-US")} ريال</div>
            <div>إجمالي الإيجار الشهري: ${rows
              .reduce(
                (sum, row) => sum + getApartmentRent(row.apartment),
                0
              )
              .toLocaleString("en-US")} ريال</div>
            <div>إجمالي المدفوعات: ${rows
              .reduce((sum, row) => sum + row.totalPaid, 0)
              .toLocaleString("en-US")} ريال</div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>رقم الشقة</th>
                  <th>النوع</th>
                  <th>الحالة</th>
                  <th>الإيجار الشهري</th>
                  <th>اسم المستأجر / الجهة</th>
                  <th>الجوال</th>
                  <th>رقم الهوية</th>
                  <th>الدور</th>
                  <th>المواقف</th>
                  <th>عداد الكهرباء</th>
                  <th>عداد المياه</th>
                  <th>حالة الفرش</th>
                  <th>رقم العقد</th>
                  <th>بداية العقد</th>
                  <th>نهاية العقد</th>
                  <th>مدة العقد</th>
                  <th>التأمين</th>
                  <th>ملاحظات التأمين</th>
                  <th>عدد الدفعات</th>
                  <th>إجمالي المدفوع</th>
                </tr>
              </thead>
              <tbody>${bodyRows}</tbody>
            </table>
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${getApartmentTypeReportTitle().replace(/\s+/g, "_")}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const printApartmentTypeReport = () => {
    const rows = getApartmentTypeReportData();

    if (!rows.length) {
      window.alert("لا توجد شقق مسجلة لهذا النوع للطباعة.");
      return;
    }

    const bodyRows = rows
      .map(
        ({
          apartment,
          extraInfo,
          tenantInfo,
          contractInfo,
          paymentCount,
          totalPaid,
        }) => `
          <tr>
            <td>${apartment.number}</td>
            <td>${escapeReportHtml(getApartmentType(apartment))}</td>
            <td>${escapeReportHtml(
              apartment.status === "شاغرة" ? "فارغة" : apartment.status
            )}</td>
            <td>${getApartmentRent(apartment).toLocaleString("en-US")} ريال</td>
            <td>${escapeReportHtml(tenantInfo.tenantName || apartment.tenant || "غير مضاف")}</td>
            <td>${escapeReportHtml(tenantInfo.phone || "غير مضاف")}</td>
            <td>${escapeReportHtml(tenantInfo.identityNumber || "غير مضاف")}</td>
            <td>${escapeReportHtml(extraInfo.floor || "غير محدد")}</td>
            <td>${escapeReportHtml(extraInfo.parking)}</td>
            <td>${escapeReportHtml(extraInfo.electricityMeter)}</td>
            <td>${escapeReportHtml(extraInfo.waterMeter)}</td>
            <td>${escapeReportHtml(extraInfo.furnitureStatus)}</td>
            <td>${escapeReportHtml(contractInfo.contractNumber || "غير محدد")}</td>
            <td>${escapeReportHtml(formatContractDate(contractInfo.startDate))}</td>
            <td>${escapeReportHtml(formatContractDate(contractInfo.endDate))}</td>
            <td>${escapeReportHtml(
              formatContractDuration(
                contractInfo.durationUnit,
                contractInfo.durationValue
              )
            )}</td>
            <td>${Number(contractInfo.insuranceAmount || 0).toLocaleString("en-US")} ريال</td>
            <td>${escapeReportHtml(contractInfo.insuranceNotes || "لا توجد ملاحظات")}</td>
            <td>${paymentCount}</td>
            <td>${totalPaid.toLocaleString("en-US")} ريال</td>
          </tr>
        `
      )
      .join("");

    const totalRent = rows.reduce(
      (sum, row) => sum + getApartmentRent(row.apartment),
      0
    );
    const totalPaid = rows.reduce((sum, row) => sum + row.totalPaid, 0);

    const printWindow = window.open("", "_blank", "width=1500,height=900");

    if (!printWindow) {
      window.alert(
        "تعذر فتح نافذة التقرير. اسمح بالنوافذ المنبثقة ثم حاول مرة أخرى."
      );
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <title>${escapeReportHtml(getApartmentTypeReportTitle())}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 20px;
              font-family: Arial, "Tahoma", sans-serif;
              color: #111827;
              direction: rtl;
            }
            h1 { margin: 0 0 8px; text-align: center; font-size: 26px; }
            p { margin: 0 0 16px; text-align: center; color: #4b5563; }
            .summary {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 8px;
              margin-bottom: 16px;
            }
            .summary div {
              border: 1px solid #d1d5db;
              border-radius: 8px;
              padding: 8px;
              text-align: center;
              background: #f9fafb;
              font-weight: 700;
              font-size: 12px;
            }
            table { width: 100%; border-collapse: collapse; }
            th, td {
              border: 1px solid #9ca3af;
              padding: 6px 5px;
              text-align: center;
              font-size: 9px;
              white-space: nowrap;
            }
            th { background: #e5e7eb; }
            @media print {
              @page { size: A3 landscape; margin: 8mm; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <h1>${escapeReportHtml(getApartmentTypeReportTitle())}</h1>
          <p>تفاصيل جميع الشقق المسجلة تحت هذا النوع</p>
          <div class="summary">
            <div>عدد الشقق: ${rows.length}</div>
            <div>إيجار الشقة: ${getApartmentRent(rows[0].apartment).toLocaleString("ar-SA")} ريال</div>
            <div>إجمالي الإيجار الشهري: ${totalRent.toLocaleString("ar-SA")} ريال</div>
            <div>إجمالي المدفوعات: ${totalPaid.toLocaleString("ar-SA")} ريال</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>رقم الشقة</th>
                <th>النوع</th>
                <th>الحالة</th>
                <th>الإيجار الشهري</th>
                <th>اسم المستأجر / الجهة</th>
                <th>الجوال</th>
                <th>رقم الهوية</th>
                <th>الدور</th>
                <th>المواقف</th>
                <th>عداد الكهرباء</th>
                <th>عداد المياه</th>
                <th>حالة الفرش</th>
                <th>رقم العقد</th>
                <th>بداية العقد</th>
                <th>نهاية العقد</th>
                <th>مدة العقد</th>
                <th>التأمين</th>
                <th>ملاحظات التأمين</th>
                <th>عدد الدفعات</th>
                <th>إجمالي المدفوع</th>
              </tr>
            </thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const exportApartmentTypeReportPdf = () => {
    printApartmentTypeReport();
  };

  const exportApartmentReportExcel = () => {
    const report = getApartmentReport();
    if (!report.data.length) {
      window.alert("لا توجد بيانات لتصديرها.");
      return;
    }

    const rows = report.data
      .map(
        (apartment) => `
          <tr>
            <td>${apartment.number}</td>
            <td>${escapeReportHtml(getApartmentType(apartment))}</td>
            <td>${escapeReportHtml(
              apartment.status === "شاغرة" ? "فارغة" : apartment.status
            )}</td>
            <td>${getApartmentRent(apartment).toLocaleString("en-US")}</td>
            <td>${escapeReportHtml(apartment.tenant || "غير مضاف")}</td>
          </tr>
        `
      )
      .join("");

    const html = `
      <html dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <style>
            body { font-family: Arial, sans-serif; direction: rtl; }
            h1, p { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #999; padding: 8px; text-align: center; }
            th { background: #e9ecef; }
          </style>
        </head>
        <body>
          <h1>${escapeReportHtml(report.title)}</h1>
          <p>${escapeReportHtml(report.subtitle)}</p>
          <table>
            <thead>
              <tr>
                <th>رقم الشقة</th>
                <th>نوع الشقة</th>
                <th>الحالة</th>
                <th>الإيجار الشهري</th>
                <th>المستأجر / الجهة</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${report.title.replace(/\s+/g, "_")}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const printApartmentReport = () => {
    const report = getApartmentReport();
    if (!report.data.length) {
      window.alert("لا توجد بيانات للطباعة.");
      return;
    }

    const rows = report.data
      .map(
        (apartment) => `
          <tr>
            <td>${apartment.number}</td>
            <td>${escapeReportHtml(getApartmentType(apartment))}</td>
            <td>${escapeReportHtml(
              apartment.status === "شاغرة" ? "فارغة" : apartment.status
            )}</td>
            <td>${getApartmentRent(apartment).toLocaleString("en-US")} ريال</td>
            <td>${escapeReportHtml(apartment.tenant || "غير مضاف")}</td>
          </tr>
        `
      )
      .join("");

    const printWindow = window.open("", "_blank", "width=1100,height=800");
    if (!printWindow) {
      window.alert("تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم حاول مرة أخرى.");
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <title>${escapeReportHtml(report.title)}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 30px;
              font-family: Arial, "Tahoma", sans-serif;
              color: #111827;
              direction: rtl;
            }
            h1 { margin: 0 0 8px; text-align: center; font-size: 28px; }
            p { margin: 0 0 22px; text-align: center; color: #4b5563; }
            .summary {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 10px;
              margin-bottom: 20px;
            }
            .summary div {
              border: 1px solid #d1d5db;
              border-radius: 10px;
              padding: 10px;
              text-align: center;
              background: #f9fafb;
              font-weight: 700;
            }
            table { width: 100%; border-collapse: collapse; }
            th, td {
              border: 1px solid #9ca3af;
              padding: 9px 7px;
              text-align: center;
              font-size: 13px;
            }
            th { background: #e5e7eb; }
            @media print {
              body { padding: 10mm; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>${escapeReportHtml(report.title)}</h1>
          <p>${escapeReportHtml(report.subtitle)}</p>
          <div class="summary">
            <div>عدد الشقق: ${report.data.length}</div>
            <div>الإيجار الشهري: ${report.data
              .reduce((sum, apartment) => sum + getApartmentRent(apartment), 0)
              .toLocaleString("en-US")} ريال</div>
            <div>تاريخ التقرير: ${new Date().toLocaleDateString("ar-SA")}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>رقم الشقة</th>
                <th>نوع الشقة</th>
                <th>الحالة</th>
                <th>الإيجار الشهري</th>
                <th>المستأجر / الجهة</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const exportApartmentReportPdf = () => {
    printApartmentReport();
  };

  const openFinancialMovementsDetails = () => {
    window.location.href = "/buildings/financial-details";
  };

  const openTenantDetails = () => {
    window.location.href = "/buildings/tenant-details";
  };

  if (permissionsLoading) {
    return null;
  }

  if (!canViewBuildings) {
    return (
      <PermissionDeniedModal
        open={true}
        message="عذرًا، غير مسموح للمستخدم الحالي بعرض هذه الصفحة."
        redirectTo="/home"
        onClose={() => navigate("/home", { replace: true })}
      />
    );
  }

  const isFinancialMovementsPage =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("view") ===
      "financial-movements";

  if (isFinancialMovementsPage) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-[#061426] p-6 text-white"
      >
        <div className="mx-auto min-h-[calc(100vh-3rem)] max-w-7xl rounded-3xl border border-[#d89b18]/40 bg-[#07182b] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-between border-b border-white/10 pb-5">
            <button
              type="button"
              onClick={() => window.close()}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-black text-gray-300 transition hover:border-[#f0ad18]/50 hover:bg-[#f0ad18]/10 hover:text-[#f6c84a]"
            >
              <X size={18} />
              إغلاق الصفحة
            </button>

            <div className="text-center">
              <h1 className="text-2xl font-black text-[#f6c84a] sm:text-3xl">
                تفاصيل الحركات المالية
              </h1>
              <p className="mt-1 text-sm font-semibold text-gray-400">
                تقارير المستحقات والتحصيلات وعمليات الإضافة والتعديل والحذف
              </p>
            </div>

            <div className="w-[110px]" />
          </div>

          <div className="flex min-h-[70vh] items-center justify-center">
            <div className="rounded-3xl border border-white/10 bg-white/[0.025] px-8 py-10 text-center">
              <FileText
                size={46}
                className="mx-auto text-[#f0ad18]"
              />
              <h2 className="mt-5 text-xl font-black text-gray-200">
                صفحة تقارير الحركات
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-7 text-gray-500">
                سيتم تجهيز جداول المستحقات والتحصيلات هنا مع إمكانية عرض
                تفاصيل العملية وتعديلها أو حذفها.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#031F18] p-6 text-white"
      style={{
        backgroundImage:
          "linear-gradient(rgba(3,31,24,0.93), rgba(3,31,24,0.93)), url('/aqar-smart-logo.png')",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center, center",
        backgroundSize: "cover, 420px",
        backgroundAttachment: "fixed, fixed",
      }}
    >

      {/* ===================================================== */}
      {/* HEADER                                                 */}
      {/* ===================================================== */}

      <div className="mb-6 rounded-2xl border border-[#d89b18] bg-[#050505] p-6 shadow-lg">

        <div className="flex flex-col items-center justify-center gap-2 text-center">

          <div className="flex items-center justify-center gap-5 text-center">

            <h1 className="text-4xl font-bold text-[#f0ad18]">
              {buildingName}
            </h1>

            <div className="text-3xl font-bold text-white">
              Tumouh Star
            </div>

          </div>

          <div className="flex items-center justify-center gap-4 text-center">

            <p className="text-lg text-gray-300">
              تفاصيل الاستثمار والعقود والإيرادات
            </p>

            <div className="text-base text-[#d89b18]">
              ERP System
            </div>

          </div>

        </div>

      </div>

      {/* ===================================================== */}
      {/* QUICK FINANCIAL ACTIONS - 4 LARGE GLASS CARDS            */}
      {/* ===================================================== */}

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5" dir="rtl">

        {/* 1 - ADD INVOICE / CHARGE */}
        <button
          type="button"
          onClick={() => openChargeModal("charge", "فاتورة مياه")}
          className="group relative min-h-[155px] overflow-hidden rounded-3xl border border-cyan-400/30 bg-white/[0.055] p-4 text-center shadow-[0_12px_40px_rgba(0,0,0,0.22)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-cyan-300/70 hover:bg-cyan-400/[0.08] hover:shadow-[0_18px_50px_rgba(34,211,238,0.16)]"
        >
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-400/10 shadow-[0_0_25px_rgba(34,211,238,0.10)]">
            <Receipt size={30} className="text-cyan-300" />
          </div>
          <div className="mt-4 text-2xl font-black text-white">
            إضافة فاتورة أو مستحقات
          </div>
          <div className="mt-2 text-base font-semibold text-cyan-200/75">
            مياه، كهرباء، نظافة أو مستحقات أخرى
          </div>
          <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1.5 text-sm font-black text-cyan-200">
            <Users size={15} />
            اختيار الشقق
          </div>
        </button>

        {/* 2 - COLLECT INVOICE / CHARGE */}
        <button
          type="button"
          onClick={() => openChargeModal("collection", "فاتورة مياه")}
          className="group relative min-h-[155px] overflow-hidden rounded-3xl border border-green-400/30 bg-white/[0.055] p-4 text-center shadow-[0_12px_40px_rgba(0,0,0,0.22)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-green-300/70 hover:bg-green-400/[0.08] hover:shadow-[0_18px_50px_rgba(34,197,94,0.14)]"
        >
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-green-300 to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-green-300/30 bg-green-400/10 shadow-[0_0_25px_rgba(34,197,94,0.10)]">
            <Coins size={30} className="text-green-300" />
          </div>
          <div className="mt-4 text-2xl font-black text-white">
            تحصيل فاتورة أو مستحقات
          </div>
          <div className="mt-2 text-base font-semibold text-green-200/75">
            تسجيل تحصيل المياه، الكهرباء أو مستحقات أخرى
          </div>
          <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-green-300/20 bg-green-400/10 px-3 py-1.5 text-sm font-black text-green-200">
            <Users size={15} />
            اختيار الشقق
          </div>
        </button>

        {/* 3 - ADD RENT */}
        <button
          type="button"
          onClick={() => openChargeModal("charge", "إيجار")}
          className="group relative min-h-[155px] overflow-hidden rounded-3xl border border-[#f0ad18]/35 bg-white/[0.055] p-4 text-center shadow-[0_12px_40px_rgba(0,0,0,0.22)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-[#f6c84a]/80 hover:bg-[#f0ad18]/[0.08] hover:shadow-[0_18px_50px_rgba(240,173,24,0.16)]"
        >
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#f6c84a] to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#f6c84a]/30 bg-[#f0ad18]/10 shadow-[0_0_25px_rgba(240,173,24,0.10)]">
            <Wallet size={30} className="text-[#f6c84a]" />
          </div>
          <div className="mt-4 text-2xl font-black text-white">
            إضافة إيجار
          </div>
          <div className="mt-2 text-base font-semibold text-[#f6c84a]/75">
            تسجيل استحقاق إيجار جديد
          </div>
          <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-[#f6c84a]/20 bg-[#f0ad18]/10 px-3 py-1.5 text-sm font-black text-[#f6c84a]">
            <Users size={15} />
            اختيار الشقق
          </div>
        </button>

        {/* 4 - COLLECT RENT */}
        <button
          type="button"
          onClick={() => openChargeModal("collection", "إيجار")}
          className="group relative min-h-[155px] overflow-hidden rounded-3xl border border-purple-400/30 bg-white/[0.055] p-4 text-center shadow-[0_12px_40px_rgba(0,0,0,0.22)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-purple-300/70 hover:bg-purple-400/[0.08] hover:shadow-[0_18px_50px_rgba(168,85,247,0.15)]"
        >
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-purple-300 to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-300/30 bg-purple-400/10 shadow-[0_0_25px_rgba(168,85,247,0.10)]">
            <ArrowUpRight size={30} className="text-purple-300" />
          </div>
          <div className="mt-4 text-2xl font-black text-white">
            تحصيل إيجار
          </div>
          <div className="mt-2 text-base font-semibold text-purple-200/75">
            تسجيل دفعة إيجار محصلة
          </div>
          <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-purple-300/20 bg-purple-400/10 px-3 py-1.5 text-sm font-black text-purple-200">
            <Users size={15} />
            اختيار الشقق
          </div>
        </button>

        {/* 5 - APARTMENT TYPES */}
        {canViewApartmentTypes && (
        <button
          type="button"
          onClick={openApartmentTypeModal}
          className="group relative min-h-[155px] overflow-hidden rounded-3xl border border-blue-400/30 bg-white/[0.055] p-4 text-center shadow-[0_12px_40px_rgba(0,0,0,0.22)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-blue-300/70 hover:bg-blue-400/[0.08] hover:shadow-[0_18px_50px_rgba(59,130,246,0.16)]"
        >
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-blue-300 to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-300/30 bg-blue-400/10 shadow-[0_0_25px_rgba(59,130,246,0.10)]">
            <Building2 size={30} className="text-blue-300" />
          </div>
          <div className="mt-4 text-2xl font-black text-white">
            أنواع الشقق
          </div>
          <div className="mt-2 text-base font-semibold text-blue-200/75">
            إضافة أنواع الشقق وتحديد أرقامها داخل العمارة
          </div>
          <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1.5 text-sm font-black text-blue-200">
            <Plus size={15} />
            إدارة الأنواع
          </div>
        </button>
        )}

      </div>

      {/* ===================================================== */}
      {/* BASIC INFO - 6 GLASS CARDS                            */}
      {/* ===================================================== */}

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">

        {/* 1 - TOTAL APARTMENTS */}

        <div
          onClick={() => openApartmentReport("total")}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-center shadow-[0_10px_35px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:border-[#f0ad18]/70 hover:bg-white/[0.07] hover:shadow-[0_16px_45px_rgba(240,173,24,0.12)]">

          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f0ad18]/70 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-100" />

          <div className="mb-3 flex items-center justify-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#f0ad18]/25 bg-[#f0ad18]/10">
              <Building2 size={19} className="text-[#f0ad18]" />
            </div>
            <span className="text-[11px] font-medium text-gray-500">
              01
            </span>
          </div>

          <div className="text-sm font-medium text-gray-300">
            إجمالي الشقق
          </div>

          <div className="mt-1 text-3xl font-black leading-none text-[#f0ad18]">
            {totalApartments}
          </div>

          <div className="mt-2 text-xs text-gray-400">
            شقة
          </div>

        </div>

        {/* 2 - RENTED */}

        <div
          onClick={() => openApartmentReport("rented")}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-center shadow-[0_10px_35px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:border-green-400/70 hover:bg-white/[0.07] hover:shadow-[0_16px_45px_rgba(34,197,94,0.10)]">

          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-green-400/70 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-100" />

          <div className="mb-3 flex items-center justify-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-green-400/25 bg-green-400/10">
              <User size={19} className="text-green-400" />
            </div>
            <span className="text-[11px] font-medium text-gray-500">
              02
            </span>
          </div>

          <div className="text-sm font-medium text-gray-300">
            إجمالي الشقق المؤجرة
          </div>

          <div className="mt-1 text-3xl font-black leading-none text-green-400">
            {rentedApartments}
          </div>

          <div className="mt-2 text-xs text-gray-400">
            شقة
          </div>

        </div>

        {/* 3 - RESERVED */}

        <div
          onClick={() => openApartmentReport("reserved")}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-center shadow-[0_10px_35px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:border-blue-400/70 hover:bg-white/[0.07] hover:shadow-[0_16px_45px_rgba(59,130,246,0.10)]">

          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/70 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-100" />

          <div className="mb-3 flex items-center justify-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-400/25 bg-blue-400/10">
              <CalendarDays size={19} className="text-blue-400" />
            </div>
            <span className="text-[11px] font-medium text-gray-500">
              03
            </span>
          </div>

          <div className="text-sm font-medium text-gray-300">
            إجمالي الشقق المحجوزة
          </div>

          <div className="mt-1 text-3xl font-black leading-none text-blue-400">
            {reservedApartments}
          </div>

          <div className="mt-2 text-xs text-gray-400">
            شقة
          </div>

        </div>

        {/* 4 - MAINTENANCE */}

        <div
          onClick={() => openApartmentReport("maintenance")}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-center shadow-[0_10px_35px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:border-orange-400/70 hover:bg-white/[0.07] hover:shadow-[0_16px_45px_rgba(251,146,60,0.10)]">

          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/70 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-100" />

          <div className="mb-3 flex items-center justify-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-orange-400/25 bg-orange-400/10">
              <AlertCircle size={19} className="text-orange-400" />
            </div>
            <span className="text-[11px] font-medium text-gray-500">
              04
            </span>
          </div>

          <div className="text-sm font-medium text-gray-300">
            إجمالي الشقق تحت الصيانة
          </div>

          <div className="mt-1 text-3xl font-black leading-none text-orange-400">
            {maintenanceApartments}
          </div>

          <div className="mt-2 text-xs text-gray-400">
            شقة
          </div>

        </div>

        {/* 5 - VACANT */}

        <div
          onClick={() => openApartmentReport("vacant")}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-center shadow-[0_10px_35px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:border-red-400/70 hover:bg-white/[0.07] hover:shadow-[0_16px_45px_rgba(248,113,113,0.10)]">

          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-400/70 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-100" />

          <div className="mb-3 flex items-center justify-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-400/25 bg-red-400/10">
              <Home size={19} className="text-red-400" />
            </div>
            <span className="text-[11px] font-medium text-gray-500">
              05
            </span>
          </div>

          <div className="text-sm font-medium text-gray-300">
            إجمالي الشقق الفارغة
          </div>

          <div className="mt-1 text-3xl font-black leading-none text-red-400">
            {vacantApartments}
          </div>

          <div className="mt-2 text-xs text-gray-400">
            شقة
          </div>

        </div>

        {/* 6 - OCCUPANCY */}

        <div
          onClick={() => openApartmentReport("occupancy")}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-center shadow-[0_10px_35px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:border-[#f6c84a]/70 hover:bg-white/[0.07] hover:shadow-[0_16px_45px_rgba(246,200,74,0.12)]">

          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f6c84a]/70 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-100" />

          <div className="mb-3 flex items-center justify-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#f6c84a]/25 bg-[#f6c84a]/10">
              <CheckCircle2 size={19} className="text-[#f6c84a]" />
            </div>
            <span className="text-[11px] font-medium text-gray-500">
              06
            </span>
          </div>

          <div className="text-sm font-medium text-gray-300">
            نسبة الإشغال
          </div>

          <div className="mt-1 text-3xl font-black leading-none text-[#f6c84a]">
            {occupancyRate}%
          </div>

          <div className="mt-2 text-xs text-gray-400">
            من إجمالي الشقق
          </div>

        </div>

      </div>


      {/* ===================================================== */}
      {/* MONTHLY FINANCIAL SUMMARY - 8 LARGE GLASS CARDS        */}
      {/* ===================================================== */}

      <div className="mb-6 rounded-3xl border border-emerald-400/20 bg-[#06382b]/70 p-4 shadow-[0_14px_45px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:p-5">
        <div className="relative mb-5 min-h-[76px]">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-32 text-center">
            <div>
              <h2 className="text-xl font-black text-[#f6c84a]">
                إجماليات المستحقات والتحصيلات حسب الفترة المحددة
              </h2>
              <p className="mt-1 text-sm font-semibold text-gray-400">
                الملخص المالي للفترة
              </p>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={openFinancialMovementsDetails}
                className="flex min-h-[46px] items-center gap-2 rounded-2xl border border-[#f0ad18]/45 bg-[#f0ad18]/10 px-5 py-3 text-sm font-black text-[#f6c84a] shadow-[0_8px_24px_rgba(240,173,24,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#f6c84a]/80 hover:bg-[#f0ad18]/20 hover:shadow-[0_10px_28px_rgba(240,173,24,0.14)]"
              >
                <ArrowUpRight size={19} />
                عرض التفاصيل المالية
              </button>

              <button
                type="button"
                onClick={openTenantDetails}
                className="flex min-h-[46px] items-center gap-2 rounded-2xl border border-cyan-400/40 bg-cyan-400/10 px-5 py-3 text-sm font-black text-cyan-300 shadow-[0_8px_24px_rgba(34,211,238,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-300/80 hover:bg-cyan-400/20 hover:shadow-[0_10px_28px_rgba(34,211,238,0.14)]"
              >
                <Users size={19} />
                تفاصيل المستأجرين
              </button>
            </div>

            <div className="w-full max-w-[560px] ml-auto grid grid-cols-2 gap-3">
            <label className="text-center text-xs font-bold text-gray-400">
              من تاريخ
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#07182b] px-3 py-2.5 text-center text-sm font-bold text-white outline-none transition focus:border-[#f0ad18]/60"
              />
            </label>

            <label className="text-center text-xs font-bold text-gray-400">
              إلى تاريخ
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#07182b] px-3 py-2.5 text-center text-sm font-bold text-white outline-none transition focus:border-[#f0ad18]/60"
              />
            </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* 1 - TOTAL CHARGES */}
          <div
            onClick={() => {
              setMonthlyReportType("total");
              setIsMonthlyDueReportOpen(true);
            }}
            className="group relative min-h-[150px] cursor-pointer overflow-hidden rounded-3xl border border-orange-400/25 bg-white/[0.045] p-5 text-center shadow-[0_10px_35px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-orange-300/60 hover:bg-orange-400/[0.06]"
          >
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-orange-400 to-transparent opacity-70" />
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-400/25 bg-orange-400/10">
              <FileText size={23} className="text-orange-300" />
            </div>
            <div className="mt-3 text-base font-black text-gray-100">
              إجمالي المستحقات للشهر
            </div>
            <div className="mt-3 text-3xl font-black text-orange-300">
              {getMonthlyDueTotal().toLocaleString("ar-SA")}{" "}
              <span className="text-xs font-bold text-gray-500">ريال</span>
            </div>
            <div className="mt-2 text-xs font-semibold text-gray-400">
              حسب الفترة المحددة
            </div>
          </div>

          {/* 2 - TOTAL RENT DUE */}
          <div
            onClick={() => {
              setMonthlyReportType("rent");
              setIsMonthlyDueReportOpen(true);
            }}
            className="group relative min-h-[150px] cursor-pointer overflow-hidden rounded-3xl border border-[#f0ad18]/30 bg-white/[0.045] p-5 text-center shadow-[0_10px_35px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-[#f6c84a]/70 hover:bg-[#f0ad18]/[0.06]"
          >
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#f6c84a] to-transparent opacity-70" />
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-[#f6c84a]/25 bg-[#f0ad18]/10">
              <Wallet size={23} className="text-[#f6c84a]" />
            </div>
            <div className="mt-3 text-base font-black text-gray-100">
              إجمالي الإيجارات المستحقة للشهر
            </div>
            <div className="mt-3 text-3xl font-black text-[#f6c84a]">
              {getMonthlyRentDueTotal().toLocaleString("ar-SA")}{" "}
              <span className="text-xs font-bold text-gray-500">ريال</span>
            </div>
            <div className="mt-2 text-xs font-semibold text-gray-400">
              المستحق حتى الشهر الحالي فقط — الشهور السابقة + الشهر الحالي
            </div>
          </div>

          {/* 3 - ELECTRICITY BILLS */}
          <div
            onClick={() => {
              setMonthlyReportType("electricity");
              setIsMonthlyDueReportOpen(true);
            }}
            className="group relative min-h-[150px] cursor-pointer overflow-hidden rounded-3xl border border-yellow-400/25 bg-white/[0.045] p-5 text-center shadow-[0_10px_35px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-yellow-300/60 hover:bg-yellow-400/[0.06]"
          >
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-300 to-transparent opacity-70" />
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-yellow-400/25 bg-yellow-400/10">
              <Zap size={23} className="text-yellow-300" />
            </div>
            <div className="mt-3 text-base font-black text-gray-100">
              إجمالي فواتير الكهرباء للشهر
            </div>
            <div className="mt-3 text-3xl font-black text-yellow-300">
              {getBuildingChargesForPeriod()
                .filter((charge) => charge.type?.trim() === "فاتورة كهرباء")
                .reduce(
                  (sum, charge) => sum + (Number(charge.amount) || 0),
                  0
                )
                .toLocaleString("ar-SA")}{" "}
              <span className="text-xs font-bold text-gray-500">ريال</span>
            </div>
            <div className="mt-2 text-xs font-semibold text-gray-400">
              الفواتير المدخلة والمستحقة خلال الفترة المحددة
            </div>
          </div>

          {/* 4 - WATER BILLS */}
          <div
            onClick={() => {
              setMonthlyReportType("water");
              setIsMonthlyDueReportOpen(true);
            }}
            className="group relative min-h-[150px] cursor-pointer overflow-hidden rounded-3xl border border-cyan-400/25 bg-white/[0.045] p-5 text-center shadow-[0_10px_35px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-cyan-300/60 hover:bg-cyan-400/[0.06]"
          >
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent opacity-70" />
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-400/10">
              <Droplets size={23} className="text-cyan-300" />
            </div>
            <div className="mt-3 text-base font-black text-gray-100">
              إجمالي فواتير المياه للشهر
            </div>
            <div className="mt-3 text-3xl font-black text-cyan-300">
              {getBuildingChargesForPeriod()
                .filter((charge) => charge.type?.trim() === "فاتورة مياه")
                .reduce(
                  (sum, charge) => sum + (Number(charge.amount) || 0),
                  0
                )
                .toLocaleString("ar-SA")}{" "}
              <span className="text-xs font-bold text-gray-500">ريال</span>
            </div>
            <div className="mt-2 text-xs font-semibold text-gray-400">
              الفواتير المدخلة والمستحقة خلال الفترة المحددة
            </div>
          </div>

          {/* 5 - CHARGE COLLECTIONS */}
          <div
            onClick={() => {
              setMonthlyCollectionReportType("total");
              setIsMonthlyCollectionReportOpen(true);
            }}
            className="group relative min-h-[150px] cursor-pointer overflow-hidden rounded-3xl border border-green-400/25 bg-white/[0.045] p-5 text-center shadow-[0_10px_35px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-green-300/60 hover:bg-green-400/[0.06]"
          >
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-green-300 to-transparent opacity-70" />
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-green-400/25 bg-green-400/10">
              <Coins size={23} className="text-green-300" />
            </div>
            <div className="mt-3 text-base font-black text-gray-100">
              إجمالي تحصيلات المستحقات للشهر
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-green-400/15 bg-green-400/[0.06] p-2">
                <div className="text-xs font-bold text-gray-400">المحصل</div>
                <div className="mt-1 text-xl font-black text-green-300">
                  {getMonthlyCollectionReportData().collectedTotal.toLocaleString("ar-SA")}
                </div>
              </div>
              <div className="rounded-xl border border-red-400/15 bg-red-400/[0.06] p-2">
                <div className="text-xs font-bold text-gray-400">المتبقي</div>
                <div className="mt-1 text-xl font-black text-red-300">
                  {getMonthlyCollectionReportData().remainingTotal.toLocaleString("ar-SA")}
                </div>
              </div>
            </div>
          </div>

          {/* 6 - RENT COLLECTIONS */}
          <div
            onClick={() => {
              setMonthlyCollectionReportType("rent");
              setIsMonthlyCollectionReportOpen(true);
            }}
            className="group relative min-h-[150px] cursor-pointer overflow-hidden rounded-3xl border border-purple-400/25 bg-white/[0.045] p-5 text-center shadow-[0_10px_35px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-purple-300/60 hover:bg-purple-400/[0.06]"
          >
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-purple-300 to-transparent opacity-70" />
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-purple-400/25 bg-purple-400/10">
              <Banknote size={23} className="text-purple-300" />
            </div>
            <div className="mt-3 text-base font-black text-gray-100">
              إجمالي تحصيلات الإيجارات للشهر
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-green-400/15 bg-green-400/[0.06] p-2">
                <div className="text-xs font-bold text-gray-400">المحصل</div>
                <div className="mt-1 text-xl font-black text-green-300">
                  {(() => {
                    const collections = getBuildingCollectionsForPeriod()
                      .filter((collection) => collection.type?.trim() === "إيجار");
                    return collections
                      .reduce((sum, collection) => sum + (Number(collection.amount) || 0), 0)
                      .toLocaleString("ar-SA");
                  })()}
                </div>
              </div>
              <div className="rounded-xl border border-red-400/15 bg-red-400/[0.06] p-2">
                <div className="text-xs font-bold text-gray-400">المتبقي</div>
                <div className="mt-1 text-xl font-black text-red-300">
                  {Math.max(
                    getMonthlyRentRows().reduce((sum, row) => sum + row.amount, 0) -
                      getBuildingCollectionsForPeriod()
                        .filter((collection) => collection.type?.trim() === "إيجار")
                        .reduce((sum, collection) => sum + (Number(collection.amount) || 0), 0),
                    0
                  ).toLocaleString("ar-SA")}
                </div>
              </div>
            </div>
          </div>

          {/* 7 - ELECTRICITY COLLECTIONS / REMAINING */}
          <div
            onClick={() => {
              setMonthlyCollectionReportType("electricity");
              setIsMonthlyCollectionReportOpen(true);
            }}
            className="group relative min-h-[150px] cursor-pointer overflow-hidden rounded-3xl border border-amber-400/25 bg-white/[0.045] p-5 text-center shadow-[0_10px_35px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-amber-300/60 hover:bg-amber-400/[0.06]"
          >
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-300 to-transparent opacity-70" />
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-400/25 bg-amber-400/10">
              <Zap size={23} className="text-amber-300" />
            </div>
            <div className="mt-3 text-base font-black text-gray-100">
              تحصيلات فواتير الكهرباء والمتبقي
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-green-400/15 bg-green-400/[0.06] p-2">
                <div className="text-xs font-bold text-gray-400">المحصل</div>
                <div className="mt-1 text-xl font-black text-green-300">
                  {getBuildingCollectionsForPeriod()
                    .filter((collection) => collection.type?.trim() === "فاتورة كهرباء")
                    .reduce((sum, collection) => sum + (Number(collection.amount) || 0), 0)
                    .toLocaleString("ar-SA")}
                </div>
              </div>
              <div className="rounded-xl border border-red-400/15 bg-red-400/[0.06] p-2">
                <div className="text-xs font-bold text-gray-400">المتبقي</div>
                <div className="mt-1 text-xl font-black text-red-300">
                  {Math.max(
                    getBuildingChargesForPeriod()
                      .filter((charge) => charge.type?.trim() === "فاتورة كهرباء")
                      .reduce((sum, charge) => sum + (Number(charge.amount) || 0), 0) -
                      getBuildingCollectionsForPeriod()
                        .filter((collection) => collection.type?.trim() === "فاتورة كهرباء")
                        .reduce((sum, collection) => sum + (Number(collection.amount) || 0), 0),
                    0
                  ).toLocaleString("ar-SA")}
                </div>
              </div>
            </div>
          </div>

          {/* 8 - WATER COLLECTIONS / REMAINING */}
          <div
            onClick={() => {
              setMonthlyCollectionReportType("water");
              setIsMonthlyCollectionReportOpen(true);
            }}
            className="group relative min-h-[150px] cursor-pointer overflow-hidden rounded-3xl border border-blue-400/25 bg-white/[0.045] p-5 text-center shadow-[0_10px_35px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-blue-300/60 hover:bg-blue-400/[0.06]"
          >
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-blue-300 to-transparent opacity-70" />
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-400/25 bg-blue-400/10">
              <Droplets size={23} className="text-blue-300" />
            </div>
            <div className="mt-3 text-base font-black text-gray-100">
              تحصيلات فواتير المياه والمتبقي
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-green-400/15 bg-green-400/[0.06] p-2">
                <div className="text-xs font-bold text-gray-400">المحصل</div>
                <div className="mt-1 text-xl font-black text-green-300">
                  {getBuildingCollectionsForPeriod()
                    .filter((collection) => collection.type?.trim() === "فاتورة مياه")
                    .reduce((sum, collection) => sum + (Number(collection.amount) || 0), 0)
                    .toLocaleString("ar-SA")}
                </div>
              </div>
              <div className="rounded-xl border border-red-400/15 bg-red-400/[0.06] p-2">
                <div className="text-xs font-bold text-gray-400">المتبقي</div>
                <div className="mt-1 text-xl font-black text-red-300">
                  {Math.max(
                    getBuildingChargesForPeriod()
                      .filter((charge) => charge.type?.trim() === "فاتورة مياه")
                      .reduce((sum, charge) => sum + (Number(charge.amount) || 0), 0) -
                      getBuildingCollectionsForPeriod()
                        .filter((collection) => collection.type?.trim() === "فاتورة مياه")
                        .reduce((sum, collection) => sum + (Number(collection.amount) || 0), 0),
                    0
                  ).toLocaleString("ar-SA")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================== */}
      {/* APARTMENT TYPES                                       */}
      {/* ===================================================== */}

      <div className="mb-6 rounded-2xl border border-emerald-400/25 bg-[#06382b]/80 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.16)] backdrop-blur-xl">

        <h2 className="mb-6 text-center text-2xl font-bold text-[#f0ad18]">
          أنواع الشقق وأسعار الإيجار
        </h2>

        {(() => {
          const apartmentTypeGroups = availableApartmentTypes
            .map((type) => {
              const typeApartments = apartments.filter(
                (apartment) => getApartmentType(apartment) === type
              );

              if (typeApartments.length === 0) {
                return null;
              }

              const rent = getApartmentRent(typeApartments[0]);
              const totalRent = typeApartments.reduce(
                (sum, apartment) => sum + getApartmentRent(apartment),
                0
              );

              const statuses = Array.from(
                new Set([
                  ...availableApartmentStatuses,
                  ...typeApartments.map((apartment) => apartment.status),
                ])
              )
                .map((status) => ({
                  status,
                  count: typeApartments.filter(
                    (apartment) => apartment.status === status
                  ).length,
                }))
                .filter((item) => item.count > 0);

              return {
                type,
                apartments: typeApartments,
                rent,
                totalRent,
                statuses,
              };
            })
            .filter(
              (
                group
              ): group is {
                type: string;
                apartments: Apartment[];
                rent: number;
                totalRent: number;
                statuses: { status: string; count: number }[];
              } => group !== null
            );

          return (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {apartmentTypeGroups.map((group) => {
                const percentage =
                  totalApartments > 0
                    ? Math.min(
                        (group.apartments.length / totalApartments) * 100,
                        100
                      )
                    : 0;

                return (
                  <div
                    key={group.type}
                    onClick={() => setSelectedApartmentTypeReport(group.type)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedApartmentTypeReport(group.type);
                      }
                    }}
                    className="cursor-pointer rounded-2xl border border-[#173858] bg-[#07182b] p-5 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:border-[#f0ad18]/60 hover:shadow-[0_15px_45px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-[#f0ad18]/60"
                  >
                    <div className="mb-5 rounded-2xl border border-[#173858] bg-[#0b2039] p-5 text-center">
                      <h3 className="text-2xl font-black text-white">
                        {group.type}
                      </h3>

                      <p className="mt-2 text-sm font-semibold text-gray-400">
                        تفاصيل النوع
                      </p>
                    </div>

                    <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-white/5 bg-[#0b2039] p-4 text-center">
                        <p className="text-sm font-semibold text-gray-400">
                          عدد الشقق
                        </p>

                        <p className="mt-2 text-2xl font-black text-white">
                          {group.apartments.length.toLocaleString("en-US")}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          شقة
                        </p>
                      </div>

                      <div className="rounded-xl border border-[#f0ad18]/20 bg-[#0b2039] p-4 text-center">
                        <p className="text-sm font-semibold text-gray-400">
                          إيجار الشقة
                        </p>

                        <p className="mt-2 text-2xl font-black text-[#f0ad18]">
                          {group.rent.toLocaleString("en-US")}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          ريال / شهريًا
                        </p>
                      </div>

                      <div className="rounded-xl border border-green-400/20 bg-[#0b2039] p-4 text-center">
                        <p className="text-sm font-semibold text-gray-400">
                          إجمالي إيجار النوع
                        </p>

                        <p className="mt-2 text-2xl font-black text-green-400">
                          {group.totalRent.toLocaleString("en-US")}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          ريال / شهريًا
                        </p>
                      </div>
                    </div>

                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h4 className="text-base font-black text-white">
                        توزيع الشقق حسب الحالة
                      </h4>

                      <span className="rounded-full border border-[#f0ad18]/20 bg-[#f0ad18]/10 px-3 py-1 text-xs font-bold text-[#f0ad18]">
                        {percentage.toFixed(1)}% من إجمالي الشقق
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
                      {group.statuses.map((item) => {
                        const isVacant = item.status === "شاغرة";
                        const isCompany = item.status === "مؤجرة للشركة";
                        const isReserved = item.status === "محجوزة";
                        const isMaintenance = item.status === "تحت الصيانة";

                        const statusLabel = isVacant
                          ? "فارغة"
                          : item.status;

                        const statusClass = isVacant
                          ? "border-red-400/20 bg-red-500/10 text-red-300"
                          : isCompany
                          ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                          : isReserved
                          ? "border-blue-400/20 bg-blue-500/10 text-blue-300"
                          : isMaintenance
                          ? "border-yellow-400/20 bg-yellow-500/10 text-yellow-300"
                          : "border-green-400/20 bg-green-500/10 text-green-300";

                        return (
                          <div
                            key={`${group.type}-${item.status}`}
                            className={`flex min-h-[48px] items-center justify-between gap-3 rounded-xl border px-4 py-3 ${statusClass}`}
                          >
                            <span className="font-bold">
                              {statusLabel}
                            </span>

                            <span className="font-black">
                              {item.count.toLocaleString("en-US")} شقة
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-[#173858]">
                      <div
                        className="h-full rounded-full bg-[#f0ad18] transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

      </div>

      {/* ===================================================== */}

      {/* APARTMENT MAP */}
      <div className="rounded-2xl border border-emerald-400/25 bg-[#06382b]/80 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.16)] backdrop-blur-xl sm:p-6">
        <button
          type="button"
          onClick={() => {
            const buildingId = getCurrentBuildingIdFromPath();
            if (!buildingId) {
              window.alert("لم يتم التعرف على رقم العمارة من الرابط.");
              return;
            }
            window.location.href = `/buildings/${buildingId}/apartments`;
          }}
          className="group flex w-full flex-col items-center justify-center rounded-2xl border border-[#d89b18]/70 bg-gradient-to-br from-[#0a4a38] via-[#073b2d] to-[#05291f] px-6 py-8 text-center transition-all duration-300 hover:-translate-y-1 hover:border-[#f6c84a] hover:shadow-[0_0_40px_rgba(216,155,24,0.14)]"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#d89b18]/60 bg-[#d89b18]/10 text-[#f6c84a] transition-transform duration-300 group-hover:scale-105">
            <Building2 size={34} />
          </div>
          <h2 className="text-3xl font-black text-[#f6c84a]">خريطة الشقق</h2>
          <p className="mt-2 text-base font-semibold text-gray-300">
            اضغط هنا لفتح صفحة خريطة الشقق وإدارة جميع الشقق وتفاصيلها
          </p>
          <div className="mt-5 rounded-xl border border-[#d89b18]/40 bg-[#d89b18]/10 px-6 py-3 text-sm font-black text-[#f6c84a]">
            فتح خريطة الشقق ←
          </div>
        </button>
      </div>

      {/* DELETE APARTMENTS MODAL                                */}
      {/* ===================================================== */}

      {isDeleteApartmentModalOpen && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 p-3 backdrop-blur-xl sm:p-5"
          onClick={closeDeleteApartmentModal}
        >
          <div
            dir="rtl"
            className="relative flex max-h-[calc(100vh-24px)] w-full max-w-[760px] flex-col overflow-hidden rounded-[30px] border border-red-400/55 bg-[#061426]/[0.97] shadow-[0_0_100px_rgba(0,0,0,0.55)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-red-400 to-transparent" />

            <div className="shrink-0 border-b border-white/10 bg-gradient-to-r from-[#050d18] via-[#25131b] to-[#061426] px-5 py-4 sm:px-7">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-red-400/40 bg-red-400/10 text-red-300">
                    <Trash2 size={29} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl font-black text-red-300 sm:text-2xl">
                      حذف الشقق
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-gray-400">
                      اختر شقة أو أكثر ثم اضغط تأكيد الحذف
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeDeleteApartmentModal}
                  aria-label="إغلاق"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-400 transition hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-400"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={toggleAllDeleteApartments}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-red-400/30 bg-red-400/10 text-sm font-black text-red-300 transition hover:bg-red-400/20"
                >
                  <Check size={18} />
                  {filteredDeleteApartments.length > 0 &&
                  filteredDeleteApartments.every((apartment) =>
                    selectedDeleteApartments.includes(apartment.number)
                  )
                    ? "إلغاء تحديد الكل"
                    : "تحديد الكل"}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDeleteApartments([])}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 text-sm font-bold text-gray-400 transition hover:bg-white/10 hover:text-white"
                >
                  إلغاء التحديد
                </button>

                <div className="flex h-12 items-center justify-center rounded-xl border border-red-400/20 bg-red-400/[0.05] px-5 text-sm font-black text-red-300">
                  {selectedDeleteApartments.length} محددة
                </div>
              </div>

              <div className="relative mb-4">
                <Search
                  size={19}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  value={deleteApartmentSearch}
                  onChange={(event) =>
                    setDeleteApartmentSearch(event.target.value)
                  }
                  placeholder="ابحث برقم الشقة أو نوعها..."
                  className="h-12 w-full rounded-xl border border-white/10 bg-[#07182b] pl-4 pr-11 text-sm font-semibold text-white outline-none transition placeholder:text-gray-600 focus:border-red-400/50"
                />
              </div>

              <div className="max-h-[480px] overflow-y-auto rounded-2xl border border-white/5 bg-[#061426]/60 p-2 scrollbar-thin">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {filteredDeleteApartments.map((apartment) => {
                    const isSelected = selectedDeleteApartments.includes(
                      apartment.number
                    );

                    return (
                      <button
                        key={apartment.number}
                        type="button"
                        onClick={() => toggleDeleteApartment(apartment.number)}
                        className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-right transition ${
                          isSelected
                            ? "border-red-400/40 bg-red-400/10"
                            : "border-transparent bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.045]"
                        }`}
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition ${
                            isSelected
                              ? "border-red-300 bg-red-300 text-[#07182b]"
                              : "border-gray-600 bg-transparent text-transparent"
                          }`}
                        >
                          <Check size={16} strokeWidth={3} />
                        </span>

                        <span className="flex-1">
                          <span className="flex items-center justify-between gap-3">
                            <span className="text-base font-black text-white">
                              شقة {apartment.number}
                            </span>
                            <span className="text-sm font-bold text-gray-300">
                              {getApartmentType(apartment)}
                            </span>
                          </span>
                          <span className="mt-1 block text-xs font-semibold text-gray-500">
                            إيجار {getApartmentRent(apartment).toLocaleString("ar-SA")} ريال
                          </span>
                        </span>
                      </button>
                    );
                  })}

                  {filteredDeleteApartments.length === 0 && (
                    <div className="col-span-full py-10 text-center text-sm font-semibold text-gray-500">
                      لا توجد شقق مطابقة للبحث
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-white/10 bg-[#061426] p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={deleteSelectedApartments}
                  className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-red-400/40 bg-gradient-to-r from-red-700 to-red-500 px-5 text-base font-black text-white shadow-[0_8px_30px_rgba(239,68,68,0.16)] transition hover:brightness-110 sm:text-lg"
                >
                  <Trash2 size={21} />
                  تأكيد حذف الشقق المحددة
                </button>

                <button
                  type="button"
                  onClick={closeDeleteApartmentModal}
                  className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 text-base font-black text-gray-300 transition hover:bg-white/10 hover:text-white sm:text-lg"
                >
                  <X size={21} />
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================== */}
      {/* APARTMENT DETAILS MODAL                               */}
      {/* ===================================================== */}

      {selectedApartment && (

        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-2 backdrop-blur-md sm:p-4"
          onClick={closeApartment}
        >

          <div
            className="relative flex max-h-[calc(100vh-16px)] w-full max-w-[1420px] flex-col overflow-hidden rounded-[28px] border border-[#d89b18]/70 bg-[#061426]/98 shadow-[0_0_80px_rgba(216,155,24,0.18)] sm:max-h-[calc(100vh-32px)]"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* GOLD LINE */}

            <div className="absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#f6c84a] to-transparent" />

            {/* ================================================= */}
            {/* MODAL HEADER                                      */}
            {/* ================================================= */}

            <div className="relative border-b border-white/10 bg-gradient-to-r from-[#050d18] via-[#0a2038] to-[#071a2d] px-5 py-3 lg:px-7">
              <div className="relative flex min-h-[58px] items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={closeApartment}
                  aria-label="إغلاق"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-400 transition hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-400"
                >
                  <X size={25} />
                </button>

                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                  <h2 className="text-2xl font-bold text-[#f6c84a] lg:text-3xl">
                    تفاصيل الشقة
                  </h2>
                  <p className="mt-1 text-base font-semibold text-gray-300 lg:text-lg">
                    {buildingName}
                  </p>
                </div>

                <div className="mr-auto flex items-center gap-3 text-right">
                  <div className="hidden sm:block">
                    <div className="text-xl font-black tracking-[0.08em] text-white lg:text-2xl">
                      TUMOUH STAR
                    </div>
                    <div className="text-sm font-semibold text-[#d89b18]">
                      طموح ستار
                    </div>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#f0ad18]/40 bg-[#f0ad18]/10 shadow-[0_0_25px_rgba(240,173,24,0.12)]">
                    <Building2 size={25} className="text-[#f0ad18]" />
                  </div>
                </div>
              </div>
            </div>

            {/* ================================================= */}
            {/* MODAL HERO                                         */}
            {/* ================================================= */}

            <div className="grid shrink-0 grid-cols-1 gap-4 border-b border-white/10 bg-[#06182c] p-4 lg:grid-cols-[330px_1fr] lg:p-5" dir="ltr">
              <div className="relative min-h-[220px] overflow-hidden rounded-3xl border border-[#d89b18]/30 bg-[#0a1e33]">
                <img
                  src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85"
                  alt="صورة الشقة"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#020813]/95 via-[#061426]/35 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-right" dir="rtl">
                  <div className="text-sm font-medium text-gray-300">شقة رقم</div>
                  <div className="mt-1 text-[76px] font-black leading-none text-[#f6c84a] drop-shadow-[0_0_25px_rgba(246,200,74,0.25)]">
                    {selectedApartment.number}
                  </div>
                  <div className={`mt-4 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold backdrop-blur-md ${getStatusColor(selectedApartment.status).badge}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${getStatusColor(selectedApartment.status).dot}`} />
                    {selectedApartment.status}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="flex h-full min-h-0 flex-col gap-3">
                  <div className="flex flex-1 flex-col justify-between rounded-2xl border border-[#2a5275] bg-white/[0.035] p-3 text-center backdrop-blur-xl transition hover:border-[#f0ad18]/50">
                    <div className="mb-2 flex flex-col items-center justify-center gap-1.5">
                      <span className="text-sm font-semibold text-gray-300">
                        نوع الشقة
                      </span>
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-400/10">
                        <Home size={19} className="text-blue-400" />
                      </div>
                    </div>

                    <select
                      value={getApartmentType(selectedApartment)}
                      onChange={(event) =>
                        updateApartmentType(
                          selectedApartment,
                          event.target.value
                        )
                      }
                      disabled={!canEditApartmentTypes}
                      className="mx-auto block w-full max-w-[230px] rounded-xl border border-white/10 bg-[#0b2039] px-3 py-2 text-center text-sm font-bold text-white outline-none transition focus:border-blue-400/60"
                    >
                      <option value="غرفتين وصالة">
                        غرفتين وصالة
                      </option>
                      <option value="غرفة وصالة">
                        غرفة وصالة
                      </option>

                      {customApartmentTypes
                        .filter(
                          (type) =>
                            type !== "غرفتين وصالة" &&
                            type !== "غرفة وصالة"
                        )
                        .map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}

                      <option value="__add_new__">
                        + إضافة نوع جديد
                      </option>
                    </select>

                    <div className="mt-1 text-xs text-gray-500">

                    </div>
                  </div>

                  {(() => {
                    const statusCard = getApartmentStatusCard(
                      selectedApartment.status
                    );
                    const StatusIcon = statusCard.icon;

                    return (
                      <div className="flex flex-1 flex-col justify-between rounded-2xl border border-[#2a5275] bg-white/[0.035] p-3 text-center backdrop-blur-xl transition hover:border-[#f0ad18]/50">
                        <div className="flex items-center justify-center gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-xl border ${statusCard.iconBorder} ${statusCard.iconBg}`}
                          >
                            <StatusIcon
                              size={19}
                              className={statusCard.iconClass}
                            />
                          </div>
                          <span className="text-sm font-semibold text-gray-300">
                            حالة الشقة
                          </span>
                        </div>

                        <select
                          value={selectedApartment.status}
                          onChange={(event) =>
                            handleApartmentStatusChange(
                              selectedApartment,
                              event.target.value
                            )
                          }
                          className={`mx-auto mt-2 block w-full max-w-[230px] rounded-xl border bg-[#071a2d] px-3 py-2 text-center text-sm font-black outline-none transition ${statusCard.iconBorder} ${statusCard.valueClass}`}
                        >
                          <option className="bg-[#071a2d] text-white" value="مؤجرة">مؤجرة</option>
                          <option className="bg-[#071a2d] text-white" value="شاغرة">فارغة</option>
                          <option className="bg-[#071a2d] text-white" value="تحت الصيانة">تحت الصيانة</option>
                          <option className="bg-[#071a2d] text-white" value="محجوزة">محجوزة</option>
                          <option className="bg-[#071a2d] text-white" value="مؤجرة للشركة">مؤجرة للشركة</option>
                          {customApartmentStatuses.map((status) => (
                            <option
                              key={status}
                              className="bg-[#071a2d] text-white"
                              value={status}
                            >
                              {status}
                            </option>
                          ))}
                          <option
                            className="bg-[#071a2d] text-[#f0ad18] font-black"
                            value="__add_new_status__"
                          >
                            + إضافة حالة جديدة
                          </option>
                        </select>
                      </div>
                    );
                  })()}
                </div>

                <div className="rounded-2xl border border-[#2a5275] bg-white/[0.035] p-5 text-center backdrop-blur-xl transition hover:border-[#f0ad18]/50">
                  <div className="mb-4 flex flex-col items-center justify-center gap-2">
                    <span className="text-base font-semibold text-gray-300">قيمة الإيجار</span>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#f0ad18]/20 bg-[#f0ad18]/10">
                      <Wallet size={23} className="text-[#f0ad18]" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-[#f6c84a]">{getApartmentRent(selectedApartment).toLocaleString("ar-SA")}</div>
                  <div className="mt-2 text-sm text-gray-500">ريال / شهرياً</div>
                </div>

                <div className="rounded-2xl border border-[#2a5275] bg-white/[0.035] p-5 text-center backdrop-blur-xl transition hover:border-[#f0ad18]/50">
                  <div className="mb-4 flex flex-col items-center justify-center gap-2">
                    <span className="text-base font-semibold text-gray-300">تاريخ بداية العقد</span>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-purple-400/20 bg-purple-400/10">
                      <CalendarDays size={23} className="text-purple-400" />
                    </div>
                  </div>
                  <div className="text-xl font-black text-white">{formatContractDate(getApartmentContractInfo(selectedApartment.number).startDate)}</div>
                  <div className="mt-2 text-base font-semibold text-gray-400">منذ بداية العقد</div>
                </div>

                <div className="rounded-2xl border border-[#2a5275] bg-white/[0.035] p-5 text-center backdrop-blur-xl transition hover:border-[#f0ad18]/50">
                  <div className="mb-4 flex flex-col items-center justify-center gap-2">
                    <span className="text-base font-semibold text-gray-300">تاريخ نهاية العقد</span>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
                      <CalendarDays size={23} className="text-cyan-400" />
                    </div>
                  </div>
                  <div className="text-xl font-black text-white">{formatContractDate(getApartmentContractInfo(selectedApartment.number).endDate)}</div>
                  {(() => {
                    const daysRemaining = getContractDaysRemaining(
                      getApartmentContractInfo(selectedApartment.number).endDate
                    );

                    if (daysRemaining !== null && daysRemaining >= 46 && daysRemaining <= 90) {
                      return (
                        <div className="mt-2 text-base font-black text-yellow-400">
                          متبقي {daysRemaining} يوم على انتهاء العقد
                        </div>
                      );
                    }

                    if (daysRemaining !== null && daysRemaining <= 45) {
                      return (
                        <div className="mt-2 text-base font-black text-red-400">
                          متبقي {Math.max(0, daysRemaining)} يوم — يحتاج إلى تحديث
                        </div>
                      );
                    }

                    return null;
                  })()}
                </div>
              </div>
            </div>

            {/* ================================================= */}
            {/* SECONDARY FINANCIAL / UTILITY CARDS               */}
            {/* ================================================= */}

            <div className="shrink-0 border-b border-white/10 bg-[#071a2d] p-3 lg:p-4" dir="rtl">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">

                {/* إضافة فاتورة أو مستحقات */}
                {canAddInvoices && (
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedApartment) return;
                    openChargeModal("charge", "فاتورة مياه", selectedApartment.number);
                  }}
                  className="rounded-2xl border border-cyan-400/40 bg-cyan-400/[0.06] p-5 text-right transition hover:border-cyan-400/60 hover:bg-cyan-400/[0.10]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-bold text-gray-100">إضافة فاتورة أو مستحقات</p>
                      <p className="mt-1 text-sm text-gray-400">مياه، كهرباء أو مستحقات أخرى</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400 text-[#07182b]">
                      <Receipt size={21} />
                    </div>
                  </div>
                  <div className="mt-4 text-base font-bold text-cyan-300">إضافة فاتورة +</div>
                </button>
                )}

                {/* إضافة تحصيل */}
                {canAddCollections && (
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedApartment) return;
                    openChargeModal("collection", "إيجار", selectedApartment.number);
                  }}
                  className="rounded-2xl border border-[#f0ad18]/60 bg-[#f0ad18]/10 p-5 text-right transition hover:bg-[#f0ad18]/20"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-bold text-gray-100">إضافة تحصيل إيجار</p>
                      <p className="mt-1 text-sm text-gray-400">تسجيل دفعة جديدة</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0ad18] text-[#07182b]">
                      <Plus size={22} />
                    </div>
                  </div>
                  <div className="mt-4 text-base font-bold text-[#f6c84a]">إضافة تحصيل +</div>
                </button>
                )}

                {/* إجمالي التحصيلات */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedApartmentFinancialReport("collections")}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedApartmentFinancialReport("collections");
                    }
                  }}
                  className="rounded-2xl border border-[#f0ad18]/25 bg-[#0b2039] p-4 text-right transition hover:border-[#f6c84a]/60 hover:bg-[#0f2945]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-200">إجمالي التحصيلات</p>
                      <p className="mt-1 text-[11px] text-gray-500">من تاريخ إلى تاريخ</p>
                    </div>
                    <Coins size={21} className="text-[#f0ad18]" />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <label className="text-[10px] text-gray-500">
                      من
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(event) => setFromDate(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-white/10 bg-[#07182b] px-2 py-1.5 text-[11px] text-white outline-none focus:border-[#f0ad18]/60"
                      />
                    </label>
                    <label className="text-[10px] text-gray-500">
                      إلى
                      <input
                        type="date"
                        value={toDate}
                        onChange={(event) => setToDate(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-white/10 bg-[#07182b] px-2 py-1.5 text-[11px] text-white outline-none focus:border-[#f0ad18]/60"
                      />
                    </label>
                  </div>

                  <div className="mt-3 text-2xl font-black text-green-400">
                    {getSelectedApartmentPeriodPayments()
                      .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0)
                      .toLocaleString("ar-SA")} <span className="text-xs text-gray-500">ريال</span>
                  </div>
                  <div className="mt-1 text-[10px] font-semibold text-gray-500">اضغط لعرض التفاصيل</div>
                </div>

                {/* فواتير المياه */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedApartmentFinancialReport("water")}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedApartmentFinancialReport("water");
                    }
                  }}
                  className="rounded-2xl border border-cyan-400/20 bg-[#0b2039] p-4 text-right transition hover:border-cyan-300/60 hover:bg-[#0f2945]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-200">إجمالي فواتير المياه</p>
                      <p className="mt-1 text-xs text-cyan-300/80">تحديد الفترة</p>
                    </div>
                    <Droplets size={21} className="text-cyan-400" />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <label className="text-[10px] font-semibold text-gray-400">
                      من
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(event) => setFromDate(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-white/10 bg-[#07182b] px-2 py-1.5 text-[11px] font-semibold text-white outline-none focus:border-cyan-400/60"
                      />
                    </label>
                    <label className="text-[10px] font-semibold text-gray-400">
                      إلى
                      <input
                        type="date"
                        value={toDate}
                        onChange={(event) => setToDate(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-white/10 bg-[#07182b] px-2 py-1.5 text-[11px] font-semibold text-white outline-none focus:border-cyan-400/60"
                      />
                    </label>
                  </div>

                  <div className="mt-3 text-2xl font-black text-cyan-400">
                    {getSelectedApartmentPeriodCharges()
                      .filter((charge) => charge.type?.trim() === "فاتورة مياه")
                      .reduce((sum, charge) => sum + (Number(charge.amount) || 0), 0)
                      .toLocaleString("ar-SA")} <span className="text-xs font-semibold text-gray-500">ريال</span>
                  </div>
                  <div className="mt-1 text-[10px] font-semibold text-gray-500">اضغط لعرض التفاصيل</div>
                </div>

                {/* فواتير الكهرباء */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedApartmentFinancialReport("electricity")}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedApartmentFinancialReport("electricity");
                    }
                  }}
                  className="rounded-2xl border border-yellow-400/20 bg-[#0b2039] p-4 text-right transition hover:border-yellow-300/60 hover:bg-[#0f2945]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-200">إجمالي فواتير الكهرباء</p>
                      <p className="mt-1 text-xs text-yellow-300/80">تحديد الفترة</p>
                    </div>
                    <Zap size={21} className="text-yellow-400" />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <label className="text-[10px] font-semibold text-gray-400">
                      من
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(event) => setFromDate(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-white/10 bg-[#07182b] px-2 py-1.5 text-[11px] font-semibold text-white outline-none focus:border-yellow-400/60"
                      />
                    </label>
                    <label className="text-[10px] font-semibold text-gray-400">
                      إلى
                      <input
                        type="date"
                        value={toDate}
                        onChange={(event) => setToDate(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-white/10 bg-[#07182b] px-2 py-1.5 text-[11px] font-semibold text-white outline-none focus:border-yellow-400/60"
                      />
                    </label>
                  </div>

                  <div className="mt-3 text-2xl font-black text-yellow-400">
                    {getSelectedApartmentPeriodCharges()
                      .filter((charge) => charge.type?.trim() === "فاتورة كهرباء")
                      .reduce((sum, charge) => sum + (Number(charge.amount) || 0), 0)
                      .toLocaleString("ar-SA")} <span className="text-xs font-semibold text-gray-500">ريال</span>
                  </div>
                  <div className="mt-1 text-[10px] font-semibold text-gray-500">اضغط لعرض التفاصيل</div>
                </div>

                {/* التحصيلات المتأخرة */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedApartmentFinancialReport("late")}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedApartmentFinancialReport("late");
                    }
                  }}
                  className="rounded-2xl border border-red-400/25 bg-[#301b29]/70 p-4 text-right transition hover:border-red-300/60 hover:bg-[#3a202f]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-200">التحصيلات المتأخرة</p>
                      <p className="mt-1 text-xs text-gray-500">إجمالي المتبقي على الشقة حتى اليوم</p>
                    </div>
                    <AlertCircle size={21} className="text-red-400" />
                  </div>
                  <div className="mt-3 text-2xl font-black text-red-400">
                    {getSelectedApartmentLateRemaining().toLocaleString("ar-SA")} <span className="text-xs text-gray-500">ريال</span>
                  </div>
                  <div className="mt-1 text-[10px] font-semibold text-gray-500">اضغط لعرض التفاصيل</div>
                </div>

              </div>
            </div>

            {/* ================================================= */}
            {/* TABS                                               */}
            {/* ================================================= */}

            <div className="shrink-0 border-b border-white/10 bg-[#071a2d] px-3 py-2.5 lg:px-5">

              <div className="flex gap-2.5 overflow-x-auto">

                {apartmentTabs.map((tab) => {

                  const Icon = tab.icon;

                  const active =
                    activeTab === tab.title;

                  return (

                    <button
                      key={tab.title}
                      type="button"
                      onClick={() =>
                        setActiveTab(tab.title)
                      }
                      className={`flex min-h-[50px] min-w-fit items-center justify-center gap-2.5 rounded-xl border px-5 py-3 text-base font-bold transition ${
                        active
                          ? "border-[#f0ad18]/60 bg-gradient-to-r from-[#f0ad18] to-[#d99a12] text-[#07182b] shadow-[0_0_20px_rgba(240,173,24,0.18)]"
                          : "border-white/10 bg-white/[0.025] text-gray-300 hover:border-[#f0ad18]/30 hover:bg-white/[0.05] hover:text-white"
                      }`}
                    >

                      <Icon size={21} strokeWidth={2.2} />

                      {tab.title}

                    </button>

                  );
                })}

              </div>

            </div>

            {/* ================================================= */}
            {/* TAB CONTENT                                        */}
            {/* ================================================= */}

            <div className="min-h-0 flex-1 overflow-y-auto bg-[#061426] p-4 lg:p-5">

              {/* BASIC */}

              {activeTab ===
                "البيانات الأساسية" && (

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

                  <div className="order-2 rounded-3xl border border-[#285273] bg-white/[0.025] p-6 backdrop-blur-xl lg:order-2">

                    <div className="relative mb-7 flex items-center justify-center">
                      <h3 className="text-2xl font-black text-white">
                        حالة الشقة والمستأجر
                      </h3>

                      <User
                        size={24}
                        className="absolute left-0 text-blue-400"
                      />
                    </div>

                    <div className="space-y-4">

                      {/* الحالة الحالية */}
                      <div className="flex min-h-[68px] items-center justify-between gap-5 rounded-2xl border border-white/5 bg-[#061a2d] px-5 py-4">
                        <span className="text-lg font-bold text-gray-200">
                          الحالة الحالية
                        </span>

                        <select
                          value={
                            getApartmentTenantInfo(
                              selectedApartment
                            ).status
                          }
                          onChange={(event) =>
                            handleApartmentStatusChange(
                              selectedApartment,
                              event.target.value
                            )
                          }
                          className="min-w-[180px] rounded-xl border border-white/10 bg-[#0b2039] px-4 py-2.5 text-base font-bold text-white outline-none transition focus:border-[#f0ad18]/60"
                        >
                          {availableApartmentStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status === "شاغرة" ? "فارغة" : status}
                            </option>
                          ))}
                          <option value="__add_new_status__">
                            + إضافة حالة جديدة
                          </option>
                        </select>
                      </div>

                      {/* اسم المستأجر */}
                      <div className="flex min-h-[68px] items-center justify-between gap-5 rounded-2xl border border-white/5 bg-[#061a2d] px-5 py-4">
                        <span className="shrink-0 text-lg font-bold text-gray-200">
                          اسم المستأجر
                        </span>

                        <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
                          <input
                            type="text"
                            value={
                              getApartmentTenantInfo(
                                selectedApartment
                              ).tenantName
                            }
                            onChange={(event) =>
                              updateApartmentTenantInfo(
                                selectedApartment,
                                "tenantName",
                                event.target.value
                              )
                            }
                            placeholder="اكتب اسم المستأجر"
                            className="w-full max-w-[280px] rounded-xl border border-white/10 bg-[#0b2039] px-4 py-2.5 text-right text-base font-bold text-white outline-none transition placeholder:text-gray-600 focus:border-[#f0ad18]/60"
                          />
                          <Edit3
                            size={19}
                            className="shrink-0 text-[#f0ad18]"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              saveApartmentTenantField(
                                selectedApartment,
                                "tenantName"
                              )
                            }
                            className="shrink-0 rounded-lg border border-green-400/40 bg-green-500/10 px-3 py-1.5 text-sm font-black text-green-400 transition hover:bg-green-500/20"
                          >
                            حفظ
                          </button>
                        </div>
                      </div>

                      {/* رقم الجوال */}
                      <div className="flex min-h-[68px] items-center justify-between gap-5 rounded-2xl border border-white/5 bg-[#061a2d] px-5 py-4">
                        <span className="shrink-0 text-lg font-bold text-gray-200">
                          رقم الجوال
                        </span>

                        <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
                          <input
                            type="tel"
                            value={
                              getApartmentTenantInfo(
                                selectedApartment
                              ).phone
                            }
                            onChange={(event) =>
                              updateApartmentTenantInfo(
                                selectedApartment,
                                "phone",
                                event.target.value
                              )
                            }
                            placeholder="05XXXXXXXX"
                            className="w-full max-w-[280px] rounded-xl border border-white/10 bg-[#0b2039] px-4 py-2.5 text-left text-base font-bold text-white outline-none transition placeholder:text-gray-600 focus:border-[#f0ad18]/60"
                          />
                          <Edit3
                            size={19}
                            className="shrink-0 text-[#f0ad18]"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              saveApartmentTenantField(
                                selectedApartment,
                                "phone"
                              )
                            }
                            className="shrink-0 rounded-lg border border-green-400/40 bg-green-500/10 px-3 py-1.5 text-sm font-black text-green-400 transition hover:bg-green-500/20"
                          >
                            حفظ
                          </button>
                        </div>
                      </div>

                      {/* رقم الهوية */}
                      <div className="flex min-h-[68px] items-center justify-between gap-5 rounded-2xl border border-white/5 bg-[#061a2d] px-5 py-4">
                        <span className="shrink-0 text-lg font-bold text-gray-200">
                          رقم الهوية
                        </span>

                        <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={
                              getApartmentTenantInfo(
                                selectedApartment
                              ).identityNumber
                            }
                            onChange={(event) =>
                              updateApartmentTenantInfo(
                                selectedApartment,
                                "identityNumber",
                                event.target.value
                              )
                            }
                            placeholder="اكتب رقم الهوية"
                            className="w-full max-w-[280px] rounded-xl border border-white/10 bg-[#0b2039] px-4 py-2.5 text-left text-base font-bold text-white outline-none transition placeholder:text-gray-600 focus:border-[#f0ad18]/60"
                          />
                          <Edit3
                            size={19}
                            className="shrink-0 text-[#f0ad18]"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              saveApartmentTenantField(
                                selectedApartment,
                                "identityNumber"
                              )
                            }
                            className="shrink-0 rounded-lg border border-green-400/40 bg-green-500/10 px-3 py-1.5 text-sm font-black text-green-400 transition hover:bg-green-500/20"
                          >
                            حفظ
                          </button>
                        </div>
                      </div>

                    </div>

                  </div>

                  <div className="order-3 rounded-3xl border border-[#285273] bg-white/[0.025] p-5 backdrop-blur-xl lg:order-1">

                    <div className="relative mb-6 flex items-center justify-center">

                      <h3 className="text-xl font-bold text-white">
                        معلومات إضافية
                      </h3>

                      <Info
                        size={22}
                        className="absolute left-0 text-[#f0ad18]"
                      />

                    </div>

                    <div className="space-y-3">
                      {/* الدور */}
                      <div className="flex min-h-[68px] items-center justify-between gap-5 rounded-2xl border border-white/5 bg-[#061a2d] px-5 py-4">
                        <span className="flex shrink-0 items-center gap-2 text-lg font-bold text-gray-200">
                          <Building2 size={16} />
                          الدور
                        </span>

                        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                          <input
                            type="text"
                            value={
                              getApartmentExtraInfo(
                                selectedApartment.number
                              ).floor
                            }
                            onChange={(event) =>
                              updateApartmentExtraInfo(
                                selectedApartment.number,
                                "floor",
                                event.target.value
                              )
                            }
                            placeholder="اكتب الدور"
                            className="w-full max-w-[280px] rounded-xl border border-white/10 bg-[#0b2039] px-4 py-2.5 text-right text-base font-bold text-white outline-none transition placeholder:text-gray-600 focus:border-[#f0ad18]/60"
                          />
                          <Edit3
                            size={19}
                            className="shrink-0 text-[#f0ad18]"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              saveApartmentFloor(selectedApartment.number)
                            }
                            className="shrink-0 rounded-lg border border-green-400/40 bg-green-500/10 px-3 py-1.5 text-sm font-black text-green-400 transition hover:bg-green-500/20"
                          >
                            حفظ
                          </button>
                        </div>
                      </div>

                      {/* موقف سيارة */}
                      <div className="flex min-h-[68px] items-center justify-between gap-5 rounded-2xl border border-white/5 bg-[#061a2d] px-5 py-4">
                        <span className="flex items-center gap-2 text-lg font-bold text-gray-200">
                          <Car size={16} />
                          موقف سيارة
                        </span>

                        <select
                          value={
                            getApartmentExtraInfo(
                              selectedApartment.number
                            ).parking
                          }
                          onChange={(event) =>
                            updateApartmentExtraInfo(
                              selectedApartment.number,
                              "parking",
                              event.target.value as ApartmentExtraInfo["parking"]
                            )
                          }
                          className="min-w-[180px] rounded-xl border border-white/10 bg-[#0b2039] px-4 py-2.5 text-base font-bold text-white outline-none transition focus:border-[#f0ad18]/60"
                        >
                          <option value="غير محدد">غير محدد</option>
                          <option value="متوفر">متوفر</option>
                          <option value="لا يوجد">لا يوجد</option>
                        </select>
                      </div>

                      {/* عداد الكهرباء */}
                      <div className="flex min-h-[68px] items-center justify-between gap-5 rounded-2xl border border-white/5 bg-[#061a2d] px-5 py-4">
                        <span className="flex items-center gap-2 text-lg font-bold text-gray-200">
                          <Zap size={16} />
                          عداد الكهرباء
                        </span>

                        <select
                          value={
                            getApartmentExtraInfo(
                              selectedApartment.number
                            ).electricityMeter
                          }
                          onChange={(event) =>
                            updateApartmentExtraInfo(
                              selectedApartment.number,
                              "electricityMeter",
                              event.target.value as ApartmentExtraInfo["electricityMeter"]
                            )
                          }
                          className="min-w-[180px] rounded-xl border border-white/10 bg-[#0b2039] px-4 py-2.5 text-base font-bold text-white outline-none transition focus:border-[#f0ad18]/60"
                        >
                          <option value="مشترك">مشترك</option>
                          <option value="فردي">فردي</option>
                        </select>
                      </div>

                      {/* عداد المياه */}
                      <div className="flex min-h-[68px] items-center justify-between gap-5 rounded-2xl border border-white/5 bg-[#061a2d] px-5 py-4">
                        <span className="flex items-center gap-2 text-lg font-bold text-gray-200">
                          <Droplets size={16} />
                          عداد المياه
                        </span>

                        <select
                          value={
                            getApartmentExtraInfo(
                              selectedApartment.number
                            ).waterMeter
                          }
                          onChange={(event) =>
                            updateApartmentExtraInfo(
                              selectedApartment.number,
                              "waterMeter",
                              event.target.value as ApartmentExtraInfo["waterMeter"]
                            )
                          }
                          className="min-w-[180px] rounded-xl border border-white/10 bg-[#0b2039] px-4 py-2.5 text-base font-bold text-white outline-none transition focus:border-[#f0ad18]/60"
                        >
                          <option value="مشترك">مشترك</option>
                          <option value="فردي">فردي</option>
                        </select>
                      </div>

                      {/* حالة الأثاث */}
                      <div className="flex min-h-[68px] items-center justify-between gap-5 rounded-2xl border border-white/5 bg-[#061a2d] px-5 py-4">
                        <span className="flex items-center gap-2 text-lg font-bold text-gray-200">
                          <Sofa size={16} />
                          حالة الأثاث
                        </span>

                        <select
                          value={
                            getApartmentExtraInfo(
                              selectedApartment.number
                            ).furnitureStatus
                          }
                          onChange={(event) =>
                            updateApartmentExtraInfo(
                              selectedApartment.number,
                              "furnitureStatus",
                              event.target.value as ApartmentExtraInfo["furnitureStatus"]
                            )
                          }
                          className="min-w-[180px] rounded-xl border border-white/10 bg-[#0b2039] px-4 py-2.5 text-base font-bold text-white outline-none transition focus:border-[#f0ad18]/60"
                        >
                          <option value="مفروشة">فارغة</option>
                          <option value="نص فرش">نص مفروش</option>
                          <option value="مفروشة بالكامل">
                            مفروشة بالكامل
                          </option>
                        </select>
                      </div>
                    </div>

                  </div>

                  <div className="order-4 rounded-3xl border border-[#285273] bg-white/[0.025] p-5 backdrop-blur-xl lg:order-3">
                    <div className="mb-5 flex items-center justify-between">
                      <h3 className="text-lg font-bold leading-relaxed">صورة الشقة</h3>
                      <ImageIcon size={21} className="text-cyan-400" />
                    </div>

                    <div className="space-y-3">
                      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#061a2d]">
                        <img
                          src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80"
                          alt="غرفة الشقة"
                          className="h-40 w-full object-cover"
                        />
                      </div>
                      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#061a2d]">
                        <img
                          src="https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=900&q=80"
                          alt="مطبخ الشقة"
                          className="h-40 w-full object-cover"
                        />
                      </div>
                    </div>
                  </div>

                </div>

              )}

              {/* TENANT */}

              {activeTab ===
                "بيانات المستأجر" && (

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

                  <div className="rounded-3xl border border-[#285273] bg-white/[0.025] p-7 backdrop-blur-xl">

                    <div className="mb-8 flex flex-col items-center justify-center text-center">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-400/10 text-blue-400">
                        <User size={28} />
                      </div>

                      <h3 className="text-2xl font-black text-white">
                        بيانات المستأجر
                      </h3>

                      <p className="mt-2 text-base font-medium text-gray-400">
                        المعلومات الشخصية وبيانات التواصل
                      </p>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">

                      {/* الاسم */}
                      <div className="rounded-2xl border border-white/5 bg-[#061a2d] p-5">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <span className="text-lg font-bold text-gray-200">
                            اسم المستأجر
                          </span>
                          <Edit3 size={19} className="text-[#f0ad18]" />
                        </div>

                        <input
                          type="text"
                          value={
                            getApartmentTenantInfo(
                              selectedApartment
                            ).tenantName
                          }
                          onChange={(event) =>
                            updateApartmentTenantInfo(
                              selectedApartment,
                              "tenantName",
                              event.target.value
                            )
                          }
                          placeholder="اكتب اسم المستأجر"
                          className="w-full rounded-xl border border-white/10 bg-[#0b2039] px-4 py-3 text-right text-lg font-bold text-white outline-none transition placeholder:text-gray-600 focus:border-[#f0ad18]/60"
                        />
                      </div>

                      {/* رقم الجوال */}
                      <div className="rounded-2xl border border-white/5 bg-[#061a2d] p-5">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <span className="text-lg font-bold text-gray-200">
                            رقم الجوال
                          </span>
                          <Edit3 size={19} className="text-[#f0ad18]" />
                        </div>

                        <input
                          type="tel"
                          value={
                            getApartmentTenantInfo(
                              selectedApartment
                            ).phone
                          }
                          onChange={(event) =>
                            updateApartmentTenantInfo(
                              selectedApartment,
                              "phone",
                              event.target.value
                            )
                          }
                          placeholder="05XXXXXXXX"
                          className="w-full rounded-xl border border-white/10 bg-[#0b2039] px-4 py-3 text-left text-lg font-bold text-white outline-none transition placeholder:text-gray-600 focus:border-[#f0ad18]/60"
                        />
                      </div>

                      {/* رقم الهوية */}
                      <div className="rounded-2xl border border-white/5 bg-[#061a2d] p-5 md:col-span-2">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <span className="text-lg font-bold text-gray-200">
                            رقم الهوية
                          </span>
                          <Edit3 size={19} className="text-[#f0ad18]" />
                        </div>

                        <input
                          type="text"
                          inputMode="numeric"
                          value={
                            getApartmentTenantInfo(
                              selectedApartment
                            ).identityNumber
                          }
                          onChange={(event) =>
                            updateApartmentTenantInfo(
                              selectedApartment,
                              "identityNumber",
                              event.target.value
                            )
                          }
                          placeholder="اكتب رقم الهوية"
                          className="w-full rounded-xl border border-white/10 bg-[#0b2039] px-4 py-3 text-left text-lg font-bold text-white outline-none transition placeholder:text-gray-600 focus:border-[#f0ad18]/60"
                        />
                      </div>

                    </div>

                  </div>

                  <div className="rounded-3xl border border-[#285273] bg-white/[0.025] p-7 backdrop-blur-xl">

                    <div className="mb-8 flex flex-col items-center justify-center text-center">

                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-green-400/20 bg-green-400/10 text-green-400">
                        <CheckCircle2 size={28} />
                      </div>

                      <h3 className="text-2xl font-black text-white">
                        حالة المستأجر
                      </h3>

                      <p className="mt-2 text-base font-medium text-gray-400">
                        ملخص التعامل مع المستأجر
                      </p>

                    </div>

                    <div className="space-y-4">

                      <div className="flex min-h-[70px] items-center justify-between rounded-2xl border border-white/5 bg-[#061a2d] px-5 py-4">
                        <span className="text-lg font-bold text-gray-300">
                          حالة الحساب
                        </span>
                        <span className="text-lg font-black text-green-400">
                          نشط
                        </span>
                      </div>

                      <div className="flex min-h-[70px] items-center justify-between rounded-2xl border border-white/5 bg-[#061a2d] px-5 py-4">
                        <span className="text-lg font-bold text-gray-300">
                          الالتزام بالسداد
                        </span>
                        <span className="text-lg font-black text-green-400">
                          منتظم
                        </span>
                      </div>

                      <div className="flex min-h-[70px] items-center justify-between rounded-2xl border border-white/5 bg-[#061a2d] px-5 py-4">
                        <span className="text-lg font-bold text-gray-300">
                          آخر دفعة
                        </span>
                        <span className="text-lg font-black text-white">
                          01 / 05 / 2026
                        </span>
                      </div>

                    </div>

                  </div>

                </div>

              )}

              {/* CONTRACT */}

              {activeTab === "العقد" && (

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

                  {(() => {
                    const contractInfo = getApartmentContractInfo(
                      selectedApartment.number
                    );

                    return (
                      <>
                        <div className="rounded-3xl border border-[#285273] bg-white/[0.025] p-6 text-center">

                          <div className="mb-4 flex justify-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#f0ad18]/20 bg-[#f0ad18]/10">
                              <FileText size={26} className="text-[#f0ad18]" />
                            </div>
                          </div>

                          <div className="text-lg font-black text-gray-200">
                            رقم العقد
                          </div>

                          <div className="mt-4 flex items-center justify-center gap-3">
                            <Edit3 size={20} className="shrink-0 text-[#f0ad18]" />
                            <input
                              type="text"
                              value={contractInfo.contractNumber}
                              onChange={(event) =>
                                updateApartmentContractField(
                                  selectedApartment.number,
                                  "contractNumber",
                                  event.target.value
                                )
                              }
                              className="w-full max-w-[260px] rounded-xl border border-white/10 bg-[#061a2d] px-4 py-3 text-center text-xl font-black text-white outline-none transition focus:border-[#f0ad18]/60"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                saveApartmentContractInfo(
                                  selectedApartment.number
                                )
                              }
                              className="shrink-0 rounded-lg border border-green-400/40 bg-green-500/10 px-3 py-2 text-sm font-black text-green-400 transition hover:bg-green-500/20"
                            >
                              حفظ
                            </button>
                          </div>

                        </div>

                        <div className="rounded-3xl border border-[#285273] bg-white/[0.025] p-6 text-center">

                          <div className="mb-4 flex justify-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-400/10">
                              <CalendarDays size={26} className="text-blue-400" />
                            </div>
                          </div>

                          <div className="text-lg font-black text-gray-200">
                            بداية العقد
                          </div>

                          <input
                            key={`contract-start-date-${selectedApartment.number}-${contractInfo.startDate}`}
                            type="text"
                            inputMode="numeric"
                            dir="ltr"
                            defaultValue={formatContractDate(contractInfo.startDate)}
                            onChange={(event) => {
                              const value = event.target.value.replace(/[^0-9/]/g, "");
                              const match = value.match(/^(\d{0,2})(?:\/(\d{0,2}))?(?:\/(\d{0,4}))?$/);

                              if (!match) return;

                              const [, day, month, year] = match;
                              const formatted = [day, month, year].filter(Boolean).join("/");

                              if (day?.length === 2 && month?.length === 2 && year?.length === 4) {
                                const parsedDate = `${year}-${month}-${day}`;
                                const parsed = new Date(`${parsedDate}T00:00:00`);
                                if (
                                  !Number.isNaN(parsed.getTime()) &&
                                  parsed.getFullYear() === Number(year) &&
                                  parsed.getMonth() + 1 === Number(month) &&
                                  parsed.getDate() === Number(day)
                                ) {
                                  updateApartmentContractStartDate(
                                    selectedApartment.number,
                                    parsedDate
                                  );
                                }
                              } else if (!formatted) {
                                updateApartmentContractStartDate(
                                  selectedApartment.number,
                                  ""
                                );
                              }
                            }}
                            onBlur={(event) => {
                              const currentValue = event.currentTarget.value;
                              const match = currentValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

                              if (!match) {
                                event.currentTarget.value = formatContractDate(contractInfo.startDate);
                              }
                            }}
                            placeholder="يوم/شهر/سنة"
                            className="mt-4 w-full rounded-xl border border-white/10 bg-[#061a2d] px-4 py-3 text-center text-xl font-black text-white outline-none transition focus:border-blue-400/60"
                          />

                          <div className="mt-2 text-sm text-gray-500">
                            يتم حساب نهاية العقد تلقائيًا حسب المدة
                          </div>

                        </div>

                        <div className="rounded-3xl border border-[#285273] bg-white/[0.025] p-6 text-center">

                          <div className="mb-4 flex justify-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-400/20 bg-red-400/10">
                              <CalendarDays size={26} className="text-red-400" />
                            </div>
                          </div>

                          <div className="text-lg font-black text-gray-200">
                            نهاية العقد
                          </div>

                          <input
                            key={`contract-end-date-${selectedApartment.number}-${contractInfo.endDate}`}
                            type="text"
                            inputMode="numeric"
                            dir="ltr"
                            defaultValue={formatContractDate(contractInfo.endDate)}
                            onChange={(event) => {
                              const value = event.target.value.replace(/[^0-9/]/g, "");
                              const match = value.match(/^(\d{0,2})(?:\/(\d{0,2}))?(?:\/(\d{0,4}))?$/);

                              if (!match) return;

                              const [, day, month, year] = match;
                              const formatted = [day, month, year].filter(Boolean).join("/");

                              if (day?.length === 2 && month?.length === 2 && year?.length === 4) {
                                const parsedDate = `${year}-${month}-${day}`;
                                const parsed = new Date(`${parsedDate}T00:00:00`);
                                if (
                                  !Number.isNaN(parsed.getTime()) &&
                                  parsed.getFullYear() === Number(year) &&
                                  parsed.getMonth() + 1 === Number(month) &&
                                  parsed.getDate() === Number(day)
                                ) {
                                  updateApartmentContractField(
                                    selectedApartment.number,
                                    "endDate",
                                    parsedDate
                                  );
                                }
                              } else if (!formatted) {
                                updateApartmentContractField(
                                  selectedApartment.number,
                                  "endDate",
                                  ""
                                );
                              }
                            }}
                            placeholder="يوم/شهر/سنة"
                            className="mt-4 w-full rounded-xl border border-white/10 bg-[#061a2d] px-4 py-3 text-center text-xl font-black text-white outline-none transition focus:border-red-400/60"
                          />

                          <div className="mt-2 text-sm text-gray-500">
                            يمكنك تعديل التاريخ يدويًا عند الحاجة
                          </div>

                        </div>

                        <div className="rounded-3xl border border-[#285273] bg-white/[0.025] p-6 lg:col-span-3">

                          <h3 className="mb-5 text-center text-2xl font-black text-[#f0ad18]">
                            تفاصيل العقد
                          </h3>

                          <div className="grid gap-4 md:grid-cols-3">

                            <div className="rounded-xl bg-[#061a2d] p-5 text-center">
                              <div className="text-lg font-black text-gray-200">
                                قيمة الإيجار
                              </div>
                              <div className="mt-3 text-2xl font-black text-[#f0ad18]">
                                {selectedApartment.rent.toLocaleString(
                                  "ar-SA"
                                )} {" "}
                                ريال
                              </div>
                            </div>

                            <div className="rounded-xl bg-[#061a2d] p-5 text-center">
                              <div className="text-xl font-black text-gray-100 text-center">
                                مدة العقد
                              </div>

                              <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
                                <select
                                  value={contractInfo.durationUnit}
                                  onChange={(event) =>
                                    updateApartmentContractDuration(
                                      selectedApartment.number,
                                      event.target.value as "day" | "month" | "year",
                                      contractInfo.durationValue
                                    )
                                  }
                                  className="rounded-xl border border-white/10 bg-[#071a2d] px-4 py-2.5 text-center text-base font-black text-white outline-none transition focus:border-[#f0ad18]/60"
                                >
                                  <option value="day" className="bg-[#071a2d] text-white">
                                    يوم
                                  </option>
                                  <option value="month" className="bg-[#071a2d] text-white">
                                    شهر
                                  </option>
                                  <option value="year" className="bg-[#071a2d] text-white">
                                    سنة
                                  </option>
                                </select>

                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={contractInfo.durationValue}
                                  onChange={(event) =>
                                    updateApartmentContractDuration(
                                      selectedApartment.number,
                                      contractInfo.durationUnit,
                                      Number(event.target.value)
                                    )
                                  }
                                  className="w-24 rounded-xl border border-white/10 bg-[#071a2d] px-4 py-2.5 text-center text-base font-black text-white outline-none transition focus:border-[#f0ad18]/60"
                                />
                              </div>

                              <div className="mt-3 text-xl font-black text-white">
                                {formatContractDuration(
                                  contractInfo.durationUnit,
                                  contractInfo.durationValue
                                )}
                              </div>
                            </div>

                            <div className="rounded-xl bg-[#061a2d] p-5 text-center">
                              <div className="text-xl font-black text-gray-100 text-center">
                                التأمين
                              </div>

                              <div className="mt-3 flex items-center justify-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={contractInfo.insuranceAmount || ""}
                                  onChange={(event) =>
                                    updateApartmentContractField(
                                      selectedApartment.number,
                                      "insuranceAmount",
                                      Math.max(0, Number(event.target.value) || 0)
                                    )
                                  }
                                  placeholder="مبلغ التأمين"
                                  className="w-full max-w-[190px] rounded-xl border border-white/10 bg-[#071a2d] px-4 py-2.5 text-center text-2xl font-black text-white outline-none transition focus:border-[#f0ad18]/60"
                                />
                                <span className="text-base font-bold text-gray-400">ريال</span>
                              </div>

                              <input
                                type="text"
                                value={contractInfo.insuranceNotes}
                                onChange={(event) =>
                                  updateApartmentContractField(
                                    selectedApartment.number,
                                    "insuranceNotes",
                                    event.target.value
                                  )
                                }
                                placeholder="ملاحظات التأمين"
                                className="mt-3 w-full rounded-xl border border-white/10 bg-[#071a2d] px-4 py-2.5 text-center text-base font-semibold text-white outline-none transition focus:border-[#f0ad18]/60"
                              />
                            </div>

                          </div>

                        </div>
                      </>
                    );
                  })()}

                </div>

              )}

              {/* PAYMENTS */}

              {activeTab ===
                "المدفوعات" && (() => {
                const payments = getApartmentPayments(selectedApartment.number);
                const contractInfo = getApartmentContractInfo(
                  selectedApartment.number
                );
                const contractPayments = payments.filter(
                  (payment) =>
                    Boolean(payment.date) &&
                    (!contractInfo.startDate || payment.date >= contractInfo.startDate)
                );
                const totalPaid = contractPayments.reduce(
                  (sum, payment) => sum + (Number(payment.amount) || 0),
                  0
                );

                const apartmentRent = getApartmentRent(selectedApartment);
                const rentDueCharges = getApartmentRentDueCharges(selectedApartment.number);
                const registeredRentMonths = rentDueCharges.length;
                const totalRentDue = rentDueCharges.reduce(
                  (sum, charge) => sum + (Number(charge.amount) || 0),
                  0
                );

                const otherChargesTotal = getApartmentCharges(
                  selectedApartment.number,
                  contractInfo.startDate
                ).reduce(
                  (sum, charge) => sum + (Number(charge.amount) || 0),
                  0
                );

                const totalDue = totalRentDue + otherChargesTotal;

                const totalRentCollected = contractPayments
                  .filter((payment) => payment.type?.trim() === "إيجار")
                  .reduce(
                    (sum, payment) => sum + (Number(payment.amount) || 0),
                    0
                  );

                const collectedRentMonths =
                  apartmentRent > 0
                    ? Math.floor(totalRentCollected / apartmentRent)
                    : 0;

                const partialRentCollected =
                  apartmentRent > 0
                    ? totalRentCollected - collectedRentMonths * apartmentRent
                    : 0;

                const totalRemaining = Math.max(totalDue - totalPaid, 0);

                return (
                  <div className="space-y-5">

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

                      <div className="rounded-3xl border border-orange-400/25 bg-orange-500/[0.04] p-6">
                        <div className="text-sm font-bold text-gray-400">
                          إجمالي المستحقات + الإيجارات
                        </div>
                        <div className="mt-2 text-3xl font-black text-orange-300">
                          {totalDue.toLocaleString("ar-SA")} ريال
                        </div>
                        <div className="mt-2 text-xs font-semibold text-gray-500">
                          {registeredRentMonths} {registeredRentMonths === 1 ? "شهر" : "أشهر"} إيجار مسجل + المستحقات الأخرى
                        </div>
                      </div>

                      <div className="rounded-3xl border border-blue-400/20 bg-blue-500/[0.04] p-6">
                        <div className="text-sm font-bold text-gray-400">
                          إجمالي المدفوع
                        </div>
                        <div className="mt-2 text-3xl font-black text-blue-300">
                          {totalPaid.toLocaleString("ar-SA")} ريال
                        </div>
                        <div className="mt-2 text-xs font-semibold text-gray-500">
                          إيجارات + فواتير + مستحقات محصلة
                        </div>
                      </div>

                      <div className="rounded-3xl border border-red-400/20 bg-red-500/[0.04] p-6">
                        <div className="text-sm font-bold text-gray-400">
                          إجمالي المتبقي
                        </div>
                        <div className="mt-2 text-3xl font-black text-red-300">
                          {totalRemaining.toLocaleString("ar-SA")} ريال
                        </div>
                        <div className="mt-2 text-xs font-semibold text-gray-500">
                          المبلغ غير المدفوع أو المتأخر حتى الآن
                        </div>
                      </div>

                      <div className="rounded-3xl border border-green-400/20 bg-green-500/[0.04] p-6">
                        <div className="text-sm font-bold text-gray-400">
                          إجمالي الإيجارات المحصلة
                        </div>
                        <div className="mt-2 text-3xl font-black text-green-300">
                          {totalRentCollected.toLocaleString("ar-SA")} ريال
                        </div>
                        <div className="mt-2 text-xs font-semibold text-gray-500">
                          {collectedRentMonths} {collectedRentMonths === 1 ? "شهر محصل" : "أشهر محصلة"}
                          {partialRentCollected > 0
                            ? ` + ${partialRentCollected.toLocaleString("ar-SA")} ريال جزئي`
                            : ""}
                        </div>
                      </div>

                    </div>

                    {(() => {
                      const rentDueCharges = getApartmentRentDueCharges(selectedApartment.number);
                      return (
                        <div className="mb-5 overflow-hidden rounded-3xl border border-cyan-400/20 bg-cyan-400/[0.03]">
                          <div className="border-b border-white/10 bg-[#071a2d] p-5">
                            <h3 className="text-xl font-bold">الإيجارات المستحقة</h3>
                            <p className="mt-1 text-sm font-semibold text-gray-500">الأشهر التي تم تسجيلها كمستحقات إيجار لهذه الشقة</p>
                          </div>
                          <div className="overflow-x-auto">
                            <div className="min-w-[700px] divide-y divide-white/5">
                              <div className="grid grid-cols-[70px_180px_150px_1fr] gap-3 bg-[#0a2137] px-5 py-4 text-sm font-black text-gray-300">
                                <div>#</div>
                                <div>الشهر المستحق</div>
                                <div>تاريخ الإدخال</div>
                                <div>المبلغ</div>
                              </div>
                              {rentDueCharges.length > 0 ? (
                                rentDueCharges.map((charge, index) => (
                                  <div key={`${charge.dueMonth || charge.date}-${index}`} className="grid grid-cols-[70px_180px_150px_1fr] gap-3 bg-[#061426] px-5 py-4 text-sm">
                                    <div className="font-bold text-gray-500">{index + 1}</div>
                                    <div className="font-black text-cyan-300">
                                      {charge.dueMonth
                                        ? new Intl.DateTimeFormat("ar-SA", { year: "numeric", month: "long" }).format(new Date(`${charge.dueMonth}-01T00:00:00`))
                                        : "غير محدد"}
                                    </div>
                                    <div className="font-bold text-gray-300">{formatPaymentDate(charge.date)}</div>
                                    <div className="font-black text-orange-300">{(Number(charge.amount) || 0).toLocaleString("ar-SA")} ريال</div>
                                  </div>
                                ))
                              ) : (
                                <div className="px-5 py-10 text-center text-sm font-bold text-gray-500">لا توجد مستحقات إيجار مسجلة لهذه الشقة.</div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="overflow-visible rounded-3xl border border-[#285273]">

                      <div className="relative flex flex-col gap-4 border-b border-white/10 bg-[#071a2d] p-5 sm:flex-row sm:items-center sm:justify-between">

                        <div>
                          <h3 className="text-xl font-bold">
                            سجل الدفعات
                          </h3>
                          <p className="mt-1 text-sm font-semibold text-gray-500">
                            جميع عمليات الدفع والتحصيل الخاصة بهذه الشقة
                          </p>
                        </div>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setIsPaymentExportMenuOpen((current) => !current)
                            }
                            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#f0ad18]/45 bg-[#f0ad18]/10 px-5 py-2.5 text-base font-black text-[#f6c84a] transition hover:border-[#f6c84a]/80 hover:bg-[#f0ad18]/20"
                          >
                            <Download size={19} />
                            تصدير
                          </button>

                          {isPaymentExportMenuOpen && (
                            <div className="absolute left-0 top-[calc(100%+8px)] z-[120] w-48 overflow-hidden rounded-2xl border border-[#285273] bg-[#061426] p-1.5 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">

                              <button
                                type="button"
                                onClick={exportApartmentPaymentsPdf}
                                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-right text-sm font-black text-white transition hover:bg-red-500/10 hover:text-red-300"
                              >
                                <FileText size={18} className="text-red-300" />
                                تصدير PDF
                              </button>

                              <button
                                type="button"
                                onClick={exportApartmentPaymentsExcel}
                                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-right text-sm font-black text-white transition hover:bg-green-500/10 hover:text-green-300"
                              >
                                <Download size={18} className="text-green-300" />
                                تصدير Excel
                              </button>

                              <button
                                type="button"
                                onClick={printApartmentPayments}
                                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-right text-sm font-black text-white transition hover:bg-blue-500/10 hover:text-blue-300"
                              >
                                <Printer size={18} className="text-blue-300" />
                                طباعة
                              </button>

                            </div>
                          )}
                        </div>

                      </div>

                      <div className="overflow-x-auto">
                        <div className="min-w-[760px] divide-y divide-white/5">

                          <div className="grid grid-cols-[70px_150px_1fr_150px_1.5fr] gap-3 bg-[#0a2137] px-5 py-4 text-sm font-black text-gray-300">
                            <div>#</div>
                            <div>تاريخ الدفع</div>
                            <div>نوع المستحق</div>
                            <div>المبلغ</div>
                            <div>تفاصيل المبلغ</div>
                          </div>

                          {payments.length > 0 ? (
                            payments.map((payment, index) => (
                              <div
                                key={`${payment.date}-${payment.type}-${index}`}
                                className="grid grid-cols-[70px_150px_1fr_150px_1.5fr] gap-3 bg-[#061426] px-5 py-4 text-sm"
                              >
                                <div className="font-bold text-gray-500">
                                  {index + 1}
                                </div>

                                <div className="font-bold text-gray-300">
                                  {formatPaymentDate(payment.date)}
                                </div>

                                <div className="font-black text-white">
                                  {payment.type || "غير محدد"}
                                </div>

                                <div className="font-black text-green-400">
                                  {(Number(payment.amount) || 0).toLocaleString(
                                    "ar-SA"
                                  )}{" "}
                                  ريال
                                </div>

                                <div className="font-semibold leading-6 text-gray-400">
                                  {payment.notes || "لا توجد تفاصيل"}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="px-5 py-14 text-center">
                              <Receipt
                                size={42}
                                className="mx-auto text-gray-700"
                              />
                              <div className="mt-4 text-base font-bold text-gray-400">
                                لا توجد دفعات مسجلة لهذه الشقة حتى الآن
                              </div>
                              <div className="mt-2 text-sm text-gray-600">
                                عند تسجيل تحصيل من شاشة التحصيل سيظهر هنا تلقائيًا.
                              </div>
                            </div>
                          )}

                        </div>
                      </div>

                    </div>

                  </div>
                );
              })()}

              {/* DOCUMENTS */}

              {activeTab ===
                "المستندات" && (

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">

                  {[
                    "عقد الإيجار",
                    "صورة الهوية",
                    "إيصال التأمين",
                    "محضر الاستلام",
                    "صور الشقة",
                    "مستندات إضافية",
                  ].map((document) => (

                    <div
                      key={document}
                      className="group rounded-3xl border border-[#285273] bg-white/[0.025] p-6 transition hover:border-[#f0ad18]/40"
                    >

                      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0ad18]/10 text-[#f0ad18]">

                        <Paperclip size={25} />

                      </div>

                      <div className="font-bold">
                        {document}
                      </div>

                      <div className="mt-2 text-sm text-gray-500">
                        لم يتم رفع المستند بعد
                      </div>

                      <button
                        type="button"
                        className="mt-5 rounded-xl border border-white/10 px-4 py-2 text-sm text-gray-400 transition hover:border-[#f0ad18]/40 hover:text-[#f0ad18]"
                      >
                        إضافة مستند
                      </button>

                    </div>

                  ))}

                </div>

              )}

              {/* NOTES */}

              {activeTab ===
                "الملاحظات" && (

                <div className="rounded-3xl border border-[#285273] bg-white/[0.025] p-6">

                  <div className="mb-6 flex items-center gap-3">

                    <div className="rounded-xl bg-purple-400/10 p-3 text-purple-400">
                      <MessageSquare size={23} />
                    </div>

                    <div>

                      <h3 className="text-xl font-bold">
                        ملاحظات الشقة
                      </h3>

                      <p className="text-sm text-gray-500">
                        سجل الملاحظات والمعلومات المهمة
                      </p>

                    </div>

                  </div>

                  <div className="rounded-2xl border border-dashed border-white/10 bg-[#061a2d] p-10 text-center">

                    <MessageSquare
                      size={42}
                      className="mx-auto text-gray-600"
                    />

                    <div className="mt-4 text-gray-400">
                      لا توجد ملاحظات مسجلة حاليًا
                    </div>

                    <button
                      type="button"
                      className="mt-5 rounded-xl bg-[#f0ad18] px-5 py-3 font-bold text-[#07182b] transition hover:bg-[#f6c84a]"
                    >
                      + إضافة ملاحظة
                    </button>

                  </div>

                </div>

              )}

            </div>

            {/* ================================================= */}
            {/* MODAL FOOTER                                      */}
            {/* ================================================= */}

            <div className="flex flex-col gap-3 border-t border-white/10 bg-[#050f1d] p-5 sm:flex-row sm:items-center sm:justify-center lg:px-6">

              <button
                type="button"
                onClick={saveApartmentDetails}
                className="flex min-h-[54px] min-w-[180px] items-center justify-center gap-3 rounded-2xl border border-green-400/60 bg-green-500/10 px-8 py-4 text-lg font-black text-green-400 transition hover:bg-green-500/15"
              >
                <CheckCircle2 size={24} />
                حفظ
              </button>

              <button
                type="button"
                onClick={closeApartment}
                className="flex min-h-[54px] min-w-[180px] items-center justify-center gap-3 rounded-2xl border border-[#f0ad18]/60 bg-[#f0ad18]/10 px-8 py-4 text-lg font-black text-[#f6c84a] transition hover:bg-[#f0ad18] hover:text-[#07182b]"
              >
                إغلاق
                <X size={23} />
              </button>

            </div>

          </div>

        </div>

      )}

      {/* ===================================================== */}
      {/* APARTMENT TYPES MANAGEMENT MODAL                        */}
      {/* ===================================================== */}

      {isApartmentTypeModalOpen && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 p-3 backdrop-blur-xl sm:p-5"
          onClick={closeApartmentTypeModal}
        >
          <div
            dir="rtl"
            className="relative flex max-h-[calc(100vh-24px)] w-full max-w-[1120px] flex-col overflow-hidden rounded-[30px] border border-blue-400/55 bg-[#061426]/[0.97] shadow-[0_0_100px_rgba(0,0,0,0.55)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-blue-300 to-transparent" />

            <div className="shrink-0 border-b border-white/10 bg-gradient-to-r from-[#050d18] via-[#09213a] to-[#061426] px-5 py-4 sm:px-7">
              <div className="flex items-center justify-center gap-4">
                <div className="flex min-w-0 items-center justify-center gap-4 text-center">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-300/40 bg-blue-400/10 text-blue-300">
                    <Building2 size={29} />
                  </div>
                  <div className="min-w-0 text-center">
                    <h2 className="text-xl font-black text-blue-300 sm:text-2xl lg:text-3xl">
                      أنواع الشقق
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-gray-400">
                      أضف أنواع الشقق وحدد أرقام الشقق التابعة لكل نوع
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeApartmentTypeModal}
                  aria-label="إغلاق"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-400 transition hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-400"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
              <div className="grid min-h-0 grid-cols-1 gap-5 lg:grid-cols-[0.8fr_1.2fr]">
                <div className="rounded-3xl border border-blue-400/20 bg-[#081c31]/80 p-4 backdrop-blur-2xl sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-black text-white">أنواع الشقق المتاحة</h3>
                      <p className="mt-1 text-sm font-semibold text-gray-500">اختر النوع لإدارة أرقام الشقق</p>
                    </div>
                    <span className="rounded-full border border-blue-400/25 bg-blue-400/10 px-3 py-1.5 text-xs font-black text-blue-300">
                      {availableApartmentTypes.length} أنواع
                    </span>
                  </div>

                  <div className="mb-4 space-y-2">
                    <div className="flex gap-2">
                      <input
                        value={newApartmentType}
                        onChange={(event) => setNewApartmentType(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            addNewApartmentTypeFromCard();
                          }
                        }}
                        placeholder="اكتب نوع شقة جديد"
                        className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-[#07182b] px-3 text-sm font-bold text-white outline-none transition placeholder:text-gray-600 focus:border-blue-400/60"
                      />
                      <button
                        type="button"
                        onClick={addNewApartmentTypeFromCard}
                        className="flex h-11 shrink-0 items-center gap-2 rounded-xl border border-blue-400/30 bg-blue-400/10 px-4 text-sm font-black text-blue-300 transition hover:bg-blue-400/20"
                      >
                        <Plus size={17} />
                        إضافة
                      </button>
                    </div>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newApartmentTypeRent}
                      onChange={(event) => setNewApartmentTypeRent(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          addNewApartmentTypeFromCard();
                        }
                      }}
                      placeholder="قيمة الإيجار الشهري للنوع (ريال)"
                      className="h-11 w-full rounded-xl border border-[#f0ad18]/20 bg-[#07182b] px-3 text-sm font-bold text-white outline-none transition placeholder:text-gray-600 focus:border-[#f0ad18]/60"
                    />
                  </div>

                  <div className="space-y-2">
                    {availableApartmentTypes.map((type) => {
                      const count = apartments.filter(
                        (apartment) => getApartmentType(apartment) === type
                      ).length;
                      const active = selectedApartmentType === type;
                      const rent = apartmentTypeRents[type] ??
                        apartments.find((apartment) => getApartmentType(apartment) === type)?.rent ?? 0;

                      return (
                        <div
                          key={type}
                          className={`rounded-2xl border p-3 text-right transition ${
                            active
                              ? "border-blue-400/40 bg-blue-400/10"
                              : "border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.05]"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => selectApartmentTypeForManagement(type)}
                            className="flex w-full items-center justify-between gap-3 text-right"
                          >
                            <span className={`font-black ${active ? "text-blue-300" : "text-white"}`}>
                              {type}
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-gray-400">
                              {count} شقة
                            </span>
                          </button>

                          <div className="mt-2 flex items-center gap-2">
                            <span className="shrink-0 text-xs font-bold text-gray-500">
                              قيمة الإيجار
                            </span>
                            <div className="relative min-w-0 flex-1">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={rent || ""}
                                onChange={(event) =>
                                  updateApartmentTypeRent(type, event.target.value)
                                }
                                disabled={!canEditApartmentTypes}
                                placeholder="ريال / شهرياً"
                                className="h-9 w-full rounded-lg border border-white/10 bg-[#07182b] px-3 pl-14 text-sm font-black text-[#f6c84a] outline-none transition placeholder:text-gray-600 focus:border-[#f0ad18]/60"
                              />
                              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gray-500">
                                ريال
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-4 backdrop-blur-2xl sm:p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Home size={22} className="text-blue-300" />
                        <h3 className="text-xl font-black text-white">
                          تحديد شقق: {selectedApartmentType || "-"}
                        </h3>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-gray-500">
                        حدد أرقام الشقق التي تنتمي إلى النوع المختار
                      </p>
                    </div>
                    <div className="rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1.5 text-xs font-black text-blue-300">
                      {selectedTypeApartments.length} محددة
                    </div>
                  </div>

                  <div className="mb-3 flex gap-2">
                    <button
                      type="button"
                      onClick={toggleAllTypeApartments}
                      className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-blue-400/30 bg-blue-400/10 text-sm font-black text-blue-300 transition hover:bg-blue-400/15"
                    >
                      <Check size={17} />
                      {filteredTypeApartments.length > 0 &&
                      filteredTypeApartments.every((apartment) =>
                        selectedTypeApartments.includes(apartment.number)
                      )
                        ? "إلغاء تحديد الكل"
                        : "تحديد الكل"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedTypeApartments([])}
                      className="flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-gray-400 transition hover:bg-white/10 hover:text-white"
                    >
                      إلغاء التحديد
                    </button>
                  </div>

                  <div className="relative mb-3">
                    <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      value={apartmentTypeSearch}
                      onChange={(event) => setApartmentTypeSearch(event.target.value)}
                      placeholder="ابحث عن رقم الشقة أو النوع..."
                      className="h-11 w-full rounded-xl border border-white/10 bg-[#07182b] pl-4 pr-10 text-sm font-semibold text-white outline-none transition placeholder:text-gray-600 focus:border-blue-400/50"
                    />
                  </div>

                  <div className="max-h-[420px] overflow-y-auto rounded-2xl border border-white/5 bg-[#061426]/60 p-2 scrollbar-thin">
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      {filteredTypeApartments.map((apartment) => {
                        const isSelected = selectedTypeApartments.includes(apartment.number);

                        return (
                          <button
                            key={apartment.number}
                            type="button"
                            onClick={() => toggleTypeApartment(apartment.number)}
                            className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-right transition ${
                              isSelected
                                ? "border-blue-400/30 bg-blue-400/10"
                                : "border-transparent bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.045]"
                            }`}
                          >
                            <span
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition ${
                                isSelected
                                  ? "border-blue-300 bg-blue-300 text-[#07182b]"
                                  : "border-gray-600 bg-transparent text-transparent"
                              }`}
                            >
                              <Check size={15} strokeWidth={3} />
                            </span>
                            <span className="flex-1">
                              <span className="flex items-center justify-between gap-3">
                                <span className="text-base font-black text-white">
                                  شقة {apartment.number}
                                </span>
                                <span className="text-sm font-bold text-gray-300">
                                  {getApartmentType(apartment)}
                                </span>
                              </span>
                            </span>
                          </button>
                        );
                      })}

                      {filteredTypeApartments.length === 0 && (
                        <div className="col-span-full py-10 text-center text-sm font-semibold text-gray-500">
                          لا توجد شقق مطابقة للبحث
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl border border-blue-400/20 bg-blue-400/[0.05] px-4 py-3 text-sm font-bold text-gray-300">
                    سيتم حفظ أرقام الشقق المحددة تحت النوع: <span className="font-black text-blue-300">{selectedApartmentType || "-"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-white/10 bg-[#061426] p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={saveApartmentTypeAssignments}
                  disabled={!canEditApartmentTypes}
                  className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-blue-400/40 bg-gradient-to-r from-blue-700 to-blue-500 px-5 text-base font-black text-white shadow-[0_8px_30px_rgba(59,130,246,0.16)] transition hover:brightness-110 sm:text-lg"
                >
                  <CheckCircle2 size={21} />
                  حفظ توزيع النوع
                </button>

                <button
                  type="button"
                  onClick={closeApartmentTypeModal}
                  className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 text-base font-black text-gray-300 transition hover:bg-white/10 hover:text-white sm:text-lg"
                >
                  <X size={21} />
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================== */}
      {/* ADD CHARGE / COLLECTION MODAL                          */}
      {/* ===================================================== */}

      {isChargeModalOpen && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 p-3 backdrop-blur-xl sm:p-5"
          onClick={() => setIsChargeModalOpen(false)}
        >
          <div
            dir="rtl"
            className={`relative flex max-h-[calc(100vh-24px)] w-full ${
              selectedApartment ? "max-w-[720px]" : "max-w-[1120px]"
            } flex-col overflow-hidden rounded-[30px] border bg-[#061426]/[0.97] shadow-[0_0_100px_rgba(0,0,0,0.55)] ${
              chargeModalMode === "collection"
                ? "border-[#f0ad18]/55 shadow-[0_0_70px_rgba(240,173,24,0.12)]"
                : "border-cyan-400/55 shadow-[0_0_70px_rgba(34,211,238,0.12)]"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent ${
                chargeModalMode === "collection"
                  ? "via-[#f6c84a]"
                  : "via-cyan-300"
              } to-transparent`}
            />

            {/* MODAL HEADER */}
            <div className="shrink-0 border-b border-white/10 bg-gradient-to-r from-[#050d18] via-[#09213a] to-[#061426] px-5 py-4 sm:px-7">
              <div className="flex items-center justify-center gap-4">
                <div className="flex min-w-0 items-center justify-center gap-4 text-center">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border shadow-[0_0_28px_rgba(34,211,238,0.10)] ${
                      chargeModalMode === "collection"
                        ? "border-[#f6c84a]/40 bg-[#f0ad18]/10 text-[#f6c84a]"
                        : "border-cyan-300/40 bg-cyan-400/10 text-cyan-300"
                    }`}
                  >
                    {chargeModalMode === "collection" ? (
                      <Coins size={29} />
                    ) : (
                      <Receipt size={29} />
                    )}
                  </div>

                  <div className="min-w-0 text-center">
                    <h2
                      className={`truncate text-xl font-black sm:text-2xl lg:text-3xl ${
                        chargeModalMode === "collection"
                          ? "text-[#f6c84a]"
                          : "text-cyan-300"
                      }`}
                    >
                      {chargeModalMode === "collection"
                        ? chargeForm.type === "إيجار"
                          ? "تحصيل إيجار"
                          : "تحصيل فاتورة أو مستحقات"
                        : chargeForm.type === "إيجار"
                        ? "إضافة إيجار"
                        : "إضافة فاتورة أو مستحقات"}
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-gray-400">
                      {selectedApartment
                        ? `تسجيل العملية للشقة رقم ${selectedApartment.number} فقط`
                        : chargeModalMode === "collection"
                        ? "تسجيل تحصيل جديد للشقق المحددة"
                        : chargeForm.type === "إيجار"
                        ? "تسجيل استحقاق إيجار جديد للشقق المحددة"
                        : "تسجيل مستحق جديد للشقق المحددة"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsChargeModalOpen(false)}
                  aria-label="إغلاق"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-400 transition hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-400"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* MODAL BODY */}
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
              <div
                className={`grid min-h-0 grid-cols-1 gap-5 ${
                  selectedApartment ? "lg:grid-cols-1" : "lg:grid-cols-[1fr_1.08fr]"
                }`}
                dir="ltr"
              >
                {selectedApartment ? (
                  <div
                    className={`rounded-3xl border bg-[#081c31]/80 p-4 backdrop-blur-2xl sm:p-5 ${
                      chargeModalMode === "collection"
                        ? "border-[#f0ad18]/25"
                        : "border-cyan-400/25"
                    }`}
                    dir="rtl"
                  >
                    <div className="relative flex min-h-[88px] items-center justify-center px-14 py-2 text-center">
                      <div
                        className={`absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl border ${
                          chargeModalMode === "collection"
                            ? "border-[#f6c84a]/30 bg-[#f0ad18]/10 text-[#f6c84a]"
                            : "border-cyan-300/30 bg-cyan-400/10 text-cyan-300"
                        }`}
                      >
                        <Home size={22} />
                      </div>

                      <div className="text-center">
                        <p className="text-xs font-bold text-gray-400">الشقة المحددة</p>
                        <h3 className="text-xl font-black text-white">
                          شقة {selectedApartment.number}
                        </h3>
                        <div className="mt-1 text-lg font-black text-[#f6c84a]">
                          {getApartmentRent(selectedApartment).toLocaleString("ar-SA")} ريال
                        </div>
                        <div className="text-[11px] font-semibold text-gray-500">
                          {getApartmentType(selectedApartment)} • {selectedApartment.status}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                <div
                  className={`min-h-0 overflow-hidden rounded-3xl border bg-[#081c31]/80 p-4 backdrop-blur-2xl sm:p-5 ${
                    chargeModalMode === "collection"
                      ? "border-[#f0ad18]/25"
                      : "border-cyan-400/25"
                  }`}
                  dir="rtl"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Home
                          size={22}
                          className={
                            chargeModalMode === "collection"
                              ? "text-[#f6c84a]"
                              : "text-cyan-300"
                          }
                        />
                        <h3 className="text-xl font-black text-white">
                          اختر الشقق
                        </h3>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-gray-500">
                        يمكنك اختيار شقة واحدة أو أكثر أو الكل
                      </p>
                    </div>

                    <div
                      className={`rounded-full border px-3 py-1.5 text-xs font-black ${
                        selectedChargeApartments.length > 0
                          ? chargeModalMode === "collection"
                            ? "border-[#f0ad18]/30 bg-[#f0ad18]/10 text-[#f6c84a]"
                            : "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
                          : "border-white/10 bg-white/5 text-gray-500"
                      }`}
                    >
                      {selectedChargeApartments.length} محددة
                    </div>
                  </div>

                  <div className="mb-3 flex gap-2">
                    <button
                      type="button"
                      onClick={toggleAllVisibleChargeApartments}
                      className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border text-sm font-black transition ${
                        chargeModalMode === "collection"
                          ? "border-[#f0ad18]/30 bg-[#f0ad18]/10 text-[#f6c84a] hover:bg-[#f0ad18]/15"
                          : "border-cyan-400/30 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/15"
                      }`}
                    >
                      <Check size={17} />
                      {visibleChargeApartments.length > 0 &&
                      visibleChargeApartments.every((apartment) =>
                        selectedChargeApartments.includes(apartment.number)
                      )
                        ? "إلغاء تحديد الكل"
                        : "تحديد الكل"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedChargeApartments([])}
                      className="flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-gray-400 transition hover:bg-white/10 hover:text-white"
                    >
                      إلغاء التحديد
                    </button>
                  </div>

                  <div className="relative mb-3">
                    <select
                      value={apartmentTypeFilter}
                      onChange={(event) =>
                        setApartmentTypeFilter(event.target.value)
                      }
                      className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-[#07182b] px-4 text-sm font-bold text-white outline-none transition focus:border-cyan-400/50"
                    >
                      <option value="">كل أنواع الشقق</option>
                      {apartmentTypeOptions.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="relative mb-3">
                    <select
                      value={apartmentStatusFilter}
                      onChange={(event) =>
                        setApartmentStatusFilter(event.target.value)
                      }
                      className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-[#07182b] px-4 text-sm font-bold text-white outline-none transition focus:border-cyan-400/50"
                    >
                      <option value="">كل حالات الشقق</option>
                      {availableApartmentStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="relative mb-3">
                    <Search
                      size={18}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    />
                    <input
                      value={apartmentSearch}
                      onChange={(event) =>
                        setApartmentSearch(event.target.value)
                      }
                      placeholder="ابحث عن رقم الشقة..."
                      className="h-11 w-full rounded-xl border border-white/10 bg-[#07182b] pl-4 pr-10 text-sm font-semibold text-white outline-none transition placeholder:text-gray-600 focus:border-cyan-400/50"
                    />
                  </div>

                  <div className="max-h-[390px] overflow-y-auto rounded-2xl border border-white/5 bg-[#061426]/60 p-2 scrollbar-thin">
                    <div className="space-y-1.5">
                      {visibleChargeApartments.map((apartment) => {
                        const isSelected =
                          selectedChargeApartments.includes(apartment.number);

                        return (
                          <button
                            key={apartment.number}
                            type="button"
                            onClick={() =>
                              toggleChargeApartment(apartment.number)
                            }
                            className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-right transition ${
                              isSelected
                                ? chargeModalMode === "collection"
                                  ? "border-[#f0ad18]/30 bg-[#f0ad18]/10"
                                  : "border-cyan-400/30 bg-cyan-400/10"
                                : "border-transparent bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.045]"
                            }`}
                          >
                            <span
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition ${
                                isSelected
                                  ? chargeModalMode === "collection"
                                    ? "border-[#f0ad18] bg-[#f0ad18] text-[#07182b]"
                                    : "border-cyan-300 bg-cyan-300 text-[#07182b]"
                                  : "border-gray-600 bg-transparent text-transparent"
                              }`}
                            >
                              <Check size={15} strokeWidth={3} />
                            </span>

                            <span className="flex-1">
                              <span className="flex items-center justify-between gap-3">
                                <span className="text-base font-black text-white">
                                  شقة {apartment.number}
                                </span>
                                <span className="text-sm font-bold text-white">
                                  {getApartmentRent(apartment).toLocaleString("ar-SA")} ريال
                                </span>
                              </span>
                              <span className="mt-0.5 block text-xs font-semibold text-gray-500">
                                {getApartmentType(apartment)} •{" "}
                                {apartment.status}
                              </span>
                            </span>
                          </button>
                        );
                      })}

                      {visibleChargeApartments.length === 0 && (
                        <div className="py-10 text-center text-sm font-semibold text-gray-500">
                          لا توجد شقق مطابقة للبحث
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    className={`mt-3 flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black ${
                      chargeModalMode === "collection"
                        ? "border-[#f0ad18]/25 bg-[#f0ad18]/[0.06] text-[#f6c84a]"
                        : "border-cyan-400/25 bg-cyan-400/[0.06] text-cyan-300"
                    }`}
                  >
                    <Users size={18} />
                    تم اختيار {selectedChargeApartments.length} شقة
                  </div>
                </div>
                )}

                {/* CHARGE FORM */}
                <div
                  className="rounded-3xl border border-white/10 bg-white/[0.025] p-4 text-center backdrop-blur-2xl sm:p-5"
                  dir="rtl"
                >
                  <div className="relative mb-4 flex min-h-[58px] items-center justify-center px-12 text-center">
                    <div
                      className={`absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl border ${
                        chargeModalMode === "collection"
                          ? "border-[#f0ad18]/30 bg-[#f0ad18]/10 text-[#f6c84a]"
                          : "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
                      }`}
                    >
                      <FileText size={20} />
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-black text-white">
                        بيانات المستحق
                      </h3>
                      <p className="mt-1 text-sm font-semibold text-gray-500">
                        {selectedApartment
                          ? `العملية مخصصة للشقة رقم ${selectedApartment.number} فقط`
                          : "نفس البيانات ستطبق على كل الشقق المحددة"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-center">
                      <span className="mb-2 block text-sm font-black text-gray-300 text-center">
                        نوع المستحق
                      </span>
                      <select
                        value={chargeForm.type}
                        onChange={(event) =>
                          setChargeForm((current) => ({
                            ...current,
                            type: event.target.value,
                          }))
                        }
                        className={`h-13 w-full rounded-xl border bg-[#0b2039] px-4 text-center text-base font-bold text-white outline-none transition ${
                          chargeModalMode === "collection"
                            ? "border-[#f0ad18]/25 focus:border-[#f0ad18]/70"
                            : "border-cyan-400/20 focus:border-cyan-400/70"
                        }`}
                      >
                        <option value="إيجار">إيجار</option>
                        <option value="فاتورة مياه">فاتورة مياه</option>
                        <option value="فاتورة كهرباء">فاتورة كهرباء</option>
                        <option value="مصاريف نظافة">مصاريف نظافة</option>
                        <option value="مستحقات أخرى">مستحقات أخرى</option>
                      </select>
                    </label>

                    <label className="block text-center">
                      <span className="mb-2 block text-sm font-black text-gray-300 text-center">
                        {chargeForm.type === "إيجار"
                          ? "إجمالي الإيجار للشقق المحددة (ريال)"
                          : "المبلغ لكل شقة (ريال)"}
                      </span>
                      <div className="relative">
                        {chargeForm.type === "إيجار" ? (
                          <div
                            className={`flex h-14 w-full items-center justify-center rounded-xl border bg-[#0b2039] px-4 pl-16 text-center text-xl font-black text-white ${
                              chargeModalMode === "collection"
                                ? "border-[#f0ad18]/25"
                                : "border-cyan-400/20"
                            }`}
                          >
                            {selectedRentTotal.toLocaleString("ar-SA")}
                          </div>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={chargeForm.amount}
                            onChange={(event) =>
                              setChargeForm((current) => ({
                                ...current,
                                amount: event.target.value,
                              }))
                            }
                            placeholder="اكتب المبلغ"
                            className={`h-14 w-full rounded-xl border bg-[#0b2039] px-4 pl-16 text-center text-xl font-black text-white outline-none transition placeholder:text-gray-600 ${
                              chargeModalMode === "collection"
                                ? "border-[#f0ad18]/25 focus:border-[#f0ad18]/70"
                                : "border-cyan-400/20 focus:border-cyan-400/70"
                            }`}
                          />
                        )}
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-gray-500">
                          ريال
                        </span>
                      </div>
                    </label>

                    {chargeModalMode === "collection" && chargeForm.type === "إيجار" && (
                      <label className="block text-center">
                        <span className="mb-2 block text-sm font-black text-gray-300 text-center">
                          عدد أشهر التحصيل
                        </span>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            max={Math.max(1, selectedRentCollectionMaxMonths)}
                            step="1"
                            value={rentCollectionMonths}
                            onChange={(event) => {
                              const requested = Math.max(1, Number(event.target.value) || 1);
                              const maxMonths = selectedRentCollectionMaxMonths;
                              setRentCollectionMonths(
                                maxMonths > 0 ? Math.min(requested, maxMonths) : requested
                              );
                            }}
                            className="h-14 w-full rounded-xl border border-[#f0ad18]/25 bg-[#0b2039] px-4 text-center text-xl font-black text-white outline-none transition focus:border-[#f0ad18]/70"
                          />
                          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-gray-500">
                            شهر
                          </span>
                        </div>
                        <p className="mt-2 text-xs font-semibold text-gray-500">
                          الافتراضي شهر واحد — الحد الأقصى المتاح للتحصيل: {selectedRentCollectionMaxMonths.toLocaleString("ar-SA")} أشهر
                        </p>
                      </label>
                    )}

                    {chargeForm.type === "إيجار" && chargeModalMode === "charge" && (
                      <div className="block text-center">
                        <span className="mb-2 block text-sm font-black text-gray-300 text-center">
                          الإيجار مستحق عن شهر / أشهر
                        </span>
                        <div className="flex gap-2">
                          <input
                            type="month"
                            value={rentDueMonth}
                            onChange={(event) => setRentDueMonth(event.target.value)}
                            className="h-14 min-w-0 flex-1 rounded-xl border border-cyan-400/20 bg-[#0b2039] px-4 text-center text-base font-bold text-white outline-none transition focus:border-cyan-400/70"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!rentDueMonth || rentDueMonths.includes(rentDueMonth)) return;
                              setRentDueMonths((current) => [...current, rentDueMonth].sort());
                            }}
                            className="h-14 shrink-0 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 text-sm font-black text-cyan-300 transition hover:bg-cyan-400/20"
                          >
                            إضافة
                          </button>
                        </div>
                        <div className="mt-2 flex flex-wrap justify-center gap-2">
                          {rentDueMonths.map((month) => (
                            <button
                              key={month}
                              type="button"
                              onClick={() => setRentDueMonths((current) => current.filter((item) => item !== month))}
                              className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-black text-cyan-200"
                            >
                              {new Intl.DateTimeFormat("ar-SA", { year: "numeric", month: "long" }).format(new Date(`${month}-01T00:00:00`))} ×
                            </button>
                          ))}
                        </div>
                        <p className="mt-2 text-xs font-semibold text-gray-500">
                          يمكنك تحديد شهر واحد أو عدة أشهر مستحقة لنفس العملية.
                        </p>
                      </div>
                    )}

                    {chargeForm.type !== "إيجار" && (
                      <div className="block text-center">
                        <span className="mb-2 block text-sm font-black text-gray-300 text-center">
                          {chargeModalMode === "collection"
                            ? "المستحق عن شهر / أشهر"
                            : "المستحق عن شهر / أشهر"}
                        </span>
                        <div className="flex gap-2">
                          <input
                            type="month"
                            value={chargeModalMode === "collection" ? collectionDueMonth : chargeDueMonth}
                            onChange={(event) =>
                              chargeModalMode === "collection"
                                ? setCollectionDueMonth(event.target.value)
                                : setChargeDueMonth(event.target.value)
                            }
                            className={`h-14 min-w-0 flex-1 rounded-xl border bg-[#0b2039] px-4 text-center text-base font-bold text-white outline-none transition ${
                              chargeModalMode === "collection"
                                ? "border-[#f0ad18]/25 focus:border-[#f0ad18]/70"
                                : "border-cyan-400/20 focus:border-cyan-400/70"
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const selectedMonth = chargeModalMode === "collection" ? collectionDueMonth : chargeDueMonth;
                              if (!selectedMonth) return;
                              if (chargeModalMode === "collection") {
                                if (collectionDueMonths.includes(selectedMonth)) return;
                                setCollectionDueMonths((current) => [...current, selectedMonth].sort());
                              } else {
                                if (chargeDueMonths.includes(selectedMonth)) return;
                                setChargeDueMonths((current) => [...current, selectedMonth].sort());
                              }
                            }}
                            className={`h-14 shrink-0 rounded-xl border px-4 text-sm font-black transition ${
                              chargeModalMode === "collection"
                                ? "border-[#f0ad18]/30 bg-[#f0ad18]/10 text-[#f6c84a] hover:bg-[#f0ad18]/20"
                                : "border-cyan-400/30 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20"
                            }`}
                          >
                            إضافة
                          </button>
                        </div>
                        <div className="mt-2 flex flex-wrap justify-center gap-2">
                          {(chargeModalMode === "collection" ? collectionDueMonths : chargeDueMonths).map((month) => (
                            <button
                              key={month}
                              type="button"
                              onClick={() =>
                                chargeModalMode === "collection"
                                  ? setCollectionDueMonths((current) => current.filter((item) => item !== month))
                                  : setChargeDueMonths((current) => current.filter((item) => item !== month))
                              }
                              className={`rounded-full border px-3 py-1.5 text-xs font-black ${
                                chargeModalMode === "collection"
                                  ? "border-[#f0ad18]/20 bg-[#f0ad18]/10 text-[#f6c84a]"
                                  : "border-cyan-400/20 bg-cyan-400/10 text-cyan-200"
                              }`}
                            >
                              {new Intl.DateTimeFormat("ar-SA", { year: "numeric", month: "long" }).format(new Date(`${month}-01T00:00:00`))} ×
                            </button>
                          ))}
                        </div>
                        <p className="mt-2 text-xs font-semibold text-gray-500">
                          يمكنك تحديد شهر واحد أو عدة أشهر لنفس الفاتورة أو المستحق.
                        </p>
                      </div>
                    )}

                    <label className="block text-center">
                      <span className="mb-2 block text-sm font-black text-gray-300 text-center">
                        تاريخ الإدخال
                      </span>
                      <input
                        type="date"
                        value={chargeForm.date}
                        onChange={(event) =>
                          setChargeForm((current) => ({
                            ...current,
                            date: event.target.value,
                          }))
                        }
                        className={`h-14 w-full rounded-xl border bg-[#0b2039] px-4 text-center text-base font-bold text-white outline-none transition ${
                          chargeModalMode === "collection"
                            ? "border-[#f0ad18]/25 focus:border-[#f0ad18]/70"
                            : "border-cyan-400/20 focus:border-cyan-400/70"
                        }`}
                      />
                    </label>

                    <label className="block text-center">
                      <span className="mb-2 block text-sm font-black text-gray-300 text-center">
                        ملاحظات
                      </span>
                      <textarea
                        rows={3}
                        value={chargeForm.notes}
                        onChange={(event) =>
                          setChargeForm((current) => ({
                            ...current,
                            notes: event.target.value,
                          }))
                        }
                        placeholder="اكتب أي ملاحظات إضافية..."
                        className={`min-h-[90px] w-full resize-none rounded-xl border bg-[#0b2039] px-4 py-2.5 text-center text-base font-semibold text-white outline-none transition placeholder:text-gray-600 ${
                          chargeModalMode === "collection"
                            ? "border-[#f0ad18]/25 focus:border-[#f0ad18]/70"
                            : "border-cyan-400/20 focus:border-cyan-400/70"
                        }`}
                      />
                    </label>

                    <div
                      className={`rounded-2xl border px-4 py-3 text-center text-sm font-bold ${
                        chargeModalMode === "collection"
                          ? "border-[#f0ad18]/20 bg-[#f0ad18]/[0.06] text-gray-300"
                          : "border-cyan-400/20 bg-cyan-400/[0.05] text-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span>عدد الشقق المحددة</span>
                        <span
                          className={`text-lg font-black ${
                            chargeModalMode === "collection"
                              ? "text-[#f6c84a]"
                              : "text-cyan-300"
                          }`}
                        >
                          {selectedChargeApartments.length}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <span>إجمالي العملية</span>
                        <span className="text-base font-black text-white">
                          {chargeForm.type === "إيجار"
                            ? (chargeModalMode === "charge"
                                ? selectedRentChargeTotal
                                : selectedRentCollectionTotal
                              ).toLocaleString("ar-SA")
                            : (chargeModalMode === "charge"
                                ? selectedChargeNonRentTotal
                                : selectedCollectionNonRentTotal
                              ).toLocaleString("ar-SA")}{" "}
                          ريال
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="shrink-0 border-t border-white/10 bg-[#061426] p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    if (denyChargeAdd(chargeModalMode, chargeForm.type)) return;

                    if (selectedChargeApartments.length === 0) {
                      window.alert("من فضلك اختر شقة واحدة على الأقل");
                      return;
                    }

                    if (
                      chargeForm.type !== "إيجار" &&
                      (!chargeForm.amount.trim() || Number(chargeForm.amount) <= 0)
                    ) {
                      window.alert("من فضلك اكتب مبلغًا صحيحًا أولاً");
                      return;
                    }

                    if (chargeModalMode === "charge" && chargeForm.type === "إيجار" && rentDueMonths.length === 0) {
                      window.alert("من فضلك حدد شهرًا مستحقًا واحدًا على الأقل للإيجار.");
                      return;
                    }

                    if (chargeModalMode === "charge" && chargeForm.type !== "إيجار" && chargeDueMonths.length === 0) {
                      window.alert("من فضلك حدد شهرًا مستحقًا واحدًا على الأقل للفاتورة أو المستحق.");
                      return;
                    }

                    if (chargeModalMode === "collection" && chargeForm.type !== "إيجار" && collectionDueMonths.length === 0) {
                      window.alert("من فضلك حدد شهرًا واحدًا على الأقل للتحصيل.");
                      return;
                    }

                    if (chargeModalMode === "collection" && chargeForm.type === "إيجار") {
                      if (rentCollectionMonths < 1) {
                        window.alert("عدد أشهر التحصيل يجب أن يكون شهرًا واحدًا على الأقل.");
                        return;
                      }

                      const invalidApartment = selectedChargeApartments
                        .map((apartmentNumber) =>
                          apartments.find((item) => item.number === apartmentNumber)
                        )
                        .find(
                          (apartment) =>
                            apartment &&
                            rentCollectionMonths > getApartmentRemainingRentMonths(apartment)
                        );

                      if (invalidApartment) {
                        const maxMonths = getApartmentRemainingRentMonths(invalidApartment);
                        window.alert(
                          maxMonths > 0
                            ? `لا يمكن تحصيل أكثر من ${maxMonths} شهر للشقة رقم ${invalidApartment.number} لأن هذا هو المتبقي من قيمة عقدها بعد التحصيلات السابقة.`
                            : `لا يوجد متبقي من قيمة عقد الشقة رقم ${invalidApartment.number} يمكن تحصيله.`
                        );
                        return;
                      }
                    }

                    try {
                      const storageKey =
                        chargeModalMode === "collection"
                          ? "tumouh_star_building_collections"
                          : "tumouh_star_building_charges";

                      const saved = getBuildingStorageValue(storageKey);
                      const currentCharges: BuildingCharge[] = saved
                        ? JSON.parse(saved)
                        : [];

                      const newCharges = selectedChargeApartments.flatMap(
                        (apartmentNumber) => {
                          const apartment = apartments.find(
                            (item) => item.number === apartmentNumber
                          );
                          const monthlyRent = apartment ? getApartmentRent(apartment) : 0;
                          const rentMonths =
                            chargeModalMode === "collection" && chargeForm.type === "إيجار"
                              ? Math.max(1, rentCollectionMonths)
                              : undefined;

                          if (chargeModalMode === "charge" && chargeForm.type === "إيجار") {
                            return rentDueMonths.map((dueMonth) => ({
                              ...chargeForm,
                              amount: String(monthlyRent),
                              notes: chargeForm.notes,
                              apartmentNumber,
                              dueMonth,
                            }));
                          }

                          if (chargeForm.type !== "إيجار") {
                            const selectedMonths =
                              chargeModalMode === "collection"
                                ? collectionDueMonths
                                : chargeDueMonths;

                            return selectedMonths.map((dueMonth) => ({
                              ...chargeForm,
                              amount: chargeForm.amount,
                              notes: chargeForm.notes,
                              apartmentNumber,
                              dueMonth,
                            }));
                          }

                          return [{
                            ...chargeForm,
                            amount: String(monthlyRent * (rentMonths ?? 1)),
                            notes:
                              rentMonths
                                ? `${chargeForm.notes ? `${chargeForm.notes} — ` : ""}تحصيل إيجار عن ${rentMonths} ${rentMonths === 1 ? "شهر" : "أشهر"}`
                                : chargeForm.notes,
                            apartmentNumber,
                            ...(rentMonths ? { rentMonths } : {}),
                          }];
                        }
                      );

                      setBuildingStorageValue(
                        storageKey,
                        JSON.stringify([...currentCharges, ...newCharges])
                      );
                    } catch {
                      // تجاهل خطأ التخزين المحلي مع إغلاق النموذج.
                    }

                    setChargeForm({
                      type: "إيجار",
                      amount: "",
                      date: new Date().toISOString().slice(0, 10),
                      notes: "",
                    });
                    setSelectedChargeApartments([]);
                    setApartmentTypeFilter("");
                    setApartmentStatusFilter("");
                    setApartmentSearch("");
                    setRentCollectionMonths(1);
                    setRentDueMonth(new Date().toISOString().slice(0, 7));
                    setRentDueMonths([]);
                    setChargeDueMonth(new Date().toISOString().slice(0, 7));
                    setChargeDueMonths([]);
                    setCollectionDueMonth(new Date().toISOString().slice(0, 7));
                    setCollectionDueMonths([]);
                    setIsChargeModalOpen(false);
                  }}
                  className={`flex h-14 items-center justify-center gap-2 rounded-2xl border px-5 text-base font-black transition sm:text-lg ${
                    chargeModalMode === "collection"
                      ? "border-[#f0ad18]/50 bg-gradient-to-r from-[#d89b18] to-[#f6c84a] text-[#07182b] shadow-[0_8px_30px_rgba(240,173,24,0.18)] hover:brightness-110"
                      : "border-green-400/40 bg-gradient-to-r from-emerald-600 to-green-500 text-white shadow-[0_8px_30px_rgba(34,197,94,0.16)] hover:brightness-110"
                  }`}
                >
                  <CheckCircle2 size={21} />
                  <span>
                    حفظ{" "}
                    {selectedChargeApartments.length > 0
                      ? `للشقق المحددة (${selectedChargeApartments.length})`
                      : ""}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsChargeModalOpen(false)}
                  className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 text-base font-black text-gray-300 transition hover:bg-white/10 hover:text-white sm:text-lg"
                >
                  <X size={21} />
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================== */}
      {/* APARTMENT TYPE DETAILS REPORT MODAL                      */}
      {/* ===================================================== */}

      {selectedApartmentTypeReport && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/85 p-2 backdrop-blur-md sm:p-4"
          onClick={() => setSelectedApartmentTypeReport(null)}
        >
          <div
            dir="rtl"
            className="flex max-h-[94vh] w-full max-w-[98vw] flex-col overflow-hidden rounded-3xl border border-[#d89b18]/40 bg-[#07182b] shadow-[0_25px_90px_rgba(0,0,0,0.65)]"
            onClick={(event) => event.stopPropagation()}
          >
            {(() => {
              const rows = getApartmentTypeReportData();
              const totalRent = rows.reduce(
                (sum, row) => sum + getApartmentRent(row.apartment),
                0
              );
              const totalPaid = rows.reduce(
                (sum, row) => sum + row.totalPaid,
                0
              );

              return (
                <>
                  <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#061426] px-5 py-4">
                    <div className="text-right">
                      <h2 className="text-xl font-black text-[#f6c84a] sm:text-2xl">
                        {getApartmentTypeReportTitle()}
                      </h2>
                      <p className="mt-1 text-xs font-semibold text-gray-400 sm:text-sm">
                        تفاصيل جميع الشقق المسجلة تحت هذا النوع
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedApartmentTypeReport(null)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-300 transition hover:border-red-400/40 hover:bg-red-400/10 hover:text-red-300"
                      aria-label="إغلاق التقرير"
                    >
                      <X size={21} />
                    </button>
                  </div>

                  <div className="shrink-0 grid grid-cols-2 gap-3 border-b border-white/10 bg-[#0b2039] p-4 sm:grid-cols-4">
                    <div className="rounded-2xl border border-[#f0ad18]/20 bg-[#07182b] p-3 text-center">
                      <div className="text-xs font-bold text-gray-400">عدد الشقق</div>
                      <div className="mt-1 text-2xl font-black text-[#f6c84a]">
                        {rows.length}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-green-400/20 bg-[#07182b] p-3 text-center">
                      <div className="text-xs font-bold text-gray-400">إيجار الشقة</div>
                      <div className="mt-1 text-2xl font-black text-green-300">
                        {rows.length
                          ? getApartmentRent(rows[0].apartment).toLocaleString("ar-SA")
                          : "0"}{" "}
                        ريال
                      </div>
                    </div>

                    <div className="rounded-2xl border border-blue-400/20 bg-[#07182b] p-3 text-center">
                      <div className="text-xs font-bold text-gray-400">إجمالي الإيجار الشهري</div>
                      <div className="mt-1 text-2xl font-black text-blue-300">
                        {totalRent.toLocaleString("ar-SA")} ريال
                      </div>
                    </div>

                    <div className="rounded-2xl border border-purple-400/20 bg-[#07182b] p-3 text-center">
                      <div className="text-xs font-bold text-gray-400">إجمالي المدفوعات</div>
                      <div className="mt-1 text-2xl font-black text-purple-300">
                        {totalPaid.toLocaleString("ar-SA")} ريال
                      </div>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-auto p-4">
                    <div className="overflow-x-auto rounded-2xl border border-white/10">
                      <table className="w-full min-w-[2200px] border-collapse text-xs">
                        <thead className="sticky top-0 z-10 bg-[#0b2039]">
                          <tr className="text-gray-300">
                            <th className="border-b border-white/10 px-3 py-3 text-center">رقم الشقة</th>
                            <th className="border-b border-white/10 px-3 py-3 text-center">النوع</th>
                            <th className="border-b border-white/10 px-3 py-3 text-center">الحالة</th>
                            <th className="border-b border-white/10 px-3 py-3 text-center">الإيجار الشهري</th>
                            <th className="border-b border-white/10 px-3 py-3 text-center">اسم المستأجر / الجهة</th>
                            <th className="border-b border-white/10 px-3 py-3 text-center">الجوال</th>
                            <th className="border-b border-white/10 px-3 py-3 text-center">رقم الهوية</th>
                            <th className="border-b border-white/10 px-3 py-3 text-center">الدور</th>
                            <th className="border-b border-white/10 px-3 py-3 text-center">المواقف</th>
                            <th className="border-b border-white/10 px-3 py-3 text-center">عداد الكهرباء</th>
                            <th className="border-b border-white/10 px-3 py-3 text-center">عداد المياه</th>
                            <th className="border-b border-white/10 px-3 py-3 text-center">حالة الفرش</th>
                            <th className="border-b border-white/10 px-3 py-3 text-center">رقم العقد</th>
                            <th className="border-b border-white/10 px-3 py-3 text-center">بداية العقد</th>
                            <th className="border-b border-white/10 px-3 py-3 text-center">نهاية العقد</th>
                            <th className="border-b border-white/10 px-3 py-3 text-center">مدة العقد</th>
                            <th className="border-b border-white/10 px-3 py-3 text-center">التأمين</th>
                            <th className="border-b border-white/10 px-3 py-3 text-center">ملاحظات التأمين</th>
                            <th className="border-b border-white/10 px-3 py-3 text-center">عدد الدفعات</th>
                            <th className="border-b border-white/10 px-3 py-3 text-center">إجمالي المدفوع</th>
                          </tr>
                        </thead>

                        <tbody>
                          {rows.map(
                            ({
                              apartment,
                              extraInfo,
                              tenantInfo,
                              contractInfo,
                              paymentCount,
                              totalPaid: apartmentTotalPaid,
                            }) => {
                              const effectiveStatus = getEffectiveApartmentStatus(apartment);
                            const statusColor = getStatusColor(effectiveStatus);

                              return (
                                <tr
                                  key={apartment.number}
                                  className="border-b border-white/5 bg-white/[0.02] transition hover:bg-white/[0.05]"
                                >
                                  <td className="px-3 py-3 text-center font-black text-[#f6c84a]">
                                    {apartment.number}
                                  </td>
                                  <td className="px-3 py-3 text-center font-semibold text-gray-200">
                                    {getApartmentType(apartment)}
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                    <span
                                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${statusColor.badge}`}
                                    >
                                      <span className={`h-2 w-2 rounded-full ${statusColor.dot}`} />
                                      {apartment.status === "شاغرة"
                                        ? "فارغة"
                                        : apartment.status}
                                    </span>
                                  </td>
                                  <td className="px-3 py-3 text-center font-black text-green-300">
                                    {getApartmentRent(apartment).toLocaleString("ar-SA")} ريال
                                  </td>
                                  <td className="px-3 py-3 text-center font-semibold text-gray-300">
                                    {tenantInfo.tenantName || apartment.tenant || "غير مضاف"}
                                  </td>
                                  <td className="px-3 py-3 text-center font-semibold text-gray-300">
                                    {tenantInfo.phone || "غير مضاف"}
                                  </td>
                                  <td className="px-3 py-3 text-center font-semibold text-gray-300">
                                    {tenantInfo.identityNumber || "غير مضاف"}
                                  </td>
                                  <td className="px-3 py-3 text-center font-semibold text-gray-300">
                                    {extraInfo.floor || "غير محدد"}
                                  </td>
                                  <td className="px-3 py-3 text-center font-semibold text-gray-300">
                                    {extraInfo.parking}
                                  </td>
                                  <td className="px-3 py-3 text-center font-semibold text-gray-300">
                                    {extraInfo.electricityMeter}
                                  </td>
                                  <td className="px-3 py-3 text-center font-semibold text-gray-300">
                                    {extraInfo.waterMeter}
                                  </td>
                                  <td className="px-3 py-3 text-center font-semibold text-gray-300">
                                    {extraInfo.furnitureStatus}
                                  </td>
                                  <td className="px-3 py-3 text-center font-semibold text-gray-300">
                                    {contractInfo.contractNumber || "غير محدد"}
                                  </td>
                                  <td className="px-3 py-3 text-center font-semibold text-gray-300">
                                    {formatContractDate(contractInfo.startDate)}
                                  </td>
                                  <td className="px-3 py-3 text-center font-semibold text-gray-300">
                                    {formatContractDate(contractInfo.endDate)}
                                  </td>
                                  <td className="px-3 py-3 text-center font-semibold text-gray-300">
                                    {formatContractDuration(
                                      contractInfo.durationUnit,
                                      contractInfo.durationValue
                                    )}
                                  </td>
                                  <td className="px-3 py-3 text-center font-black text-[#f6c84a]">
                                    {Number(contractInfo.insuranceAmount || 0).toLocaleString("ar-SA")} ريال
                                  </td>
                                  <td className="px-3 py-3 text-center font-semibold text-gray-400">
                                    {contractInfo.insuranceNotes || "لا توجد ملاحظات"}
                                  </td>
                                  <td className="px-3 py-3 text-center font-black text-blue-300">
                                    {paymentCount}
                                  </td>
                                  <td className="px-3 py-3 text-center font-black text-purple-300">
                                    {apartmentTotalPaid.toLocaleString("ar-SA")} ريال
                                  </td>
                                </tr>
                              );
                            }
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="shrink-0 border-t border-white/10 bg-[#061426] p-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <button
                        type="button"
                        onClick={exportApartmentTypeReportExcel}
                        className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-green-400/30 bg-green-500/10 px-4 text-sm font-black text-green-300 transition hover:bg-green-500/20"
                      >
                        <Download size={19} />
                        تصدير Excel
                      </button>

                      <button
                        type="button"
                        onClick={printApartmentTypeReport}
                        className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-blue-400/30 bg-blue-500/10 px-4 text-sm font-black text-blue-300 transition hover:bg-blue-500/20"
                      >
                        <Printer size={19} />
                        طباعة
                      </button>

                      <button
                        type="button"
                        onClick={exportApartmentTypeReportPdf}
                        className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 text-sm font-black text-red-300 transition hover:bg-red-500/20"
                      >
                        <FileText size={19} />
                        تصدير PDF
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ===================================================== */}
      {/* APARTMENT REPORT MODAL                                  */}
      {/* ===================================================== */}

      {apartmentReportType && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={closeApartmentReport}
        >
          <div
            dir="rtl"
            className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-[#d89b18]/40 bg-[#07182b] shadow-[0_25px_90px_rgba(0,0,0,0.55)]"
            onClick={(event) => event.stopPropagation()}
          >
            {(() => {
              const report = getApartmentReport();
              const totalReportRent = report.data.reduce(
                (sum, apartment) => sum + getApartmentRent(apartment),
                0
              );

              return (
                <>
                  <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#061426] px-5 py-4">
                    <div className="text-right">
                      <h2 className="text-xl font-black text-[#f6c84a] sm:text-2xl">
                        {report.title}
                      </h2>
                      <p className="mt-1 text-xs font-semibold text-gray-400 sm:text-sm">
                        {report.subtitle}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={closeApartmentReport}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-300 transition hover:border-red-400/40 hover:bg-red-400/10 hover:text-red-300"
                      aria-label="إغلاق التقرير"
                    >
                      <X size={21} />
                    </button>
                  </div>

                  <div className="shrink-0 grid grid-cols-2 gap-3 border-b border-white/10 bg-[#0b2039] p-4 sm:grid-cols-4">
                    <div className="rounded-2xl border border-[#f0ad18]/20 bg-[#07182b] p-3 text-center">
                      <div className="text-xs font-bold text-gray-400">عدد الشقق</div>
                      <div className="mt-1 text-2xl font-black text-[#f6c84a]">
                        {report.data.length}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-green-400/20 bg-[#07182b] p-3 text-center">
                      <div className="text-xs font-bold text-gray-400">الإيجار الشهري</div>
                      <div className="mt-1 text-2xl font-black text-green-300">
                        {totalReportRent.toLocaleString("ar-SA")}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-blue-400/20 bg-[#07182b] p-3 text-center">
                      <div className="text-xs font-bold text-gray-400">الفترة</div>
                      <div className="mt-1 text-sm font-black text-blue-300">
                        تقرير حالي
                      </div>
                    </div>

                    <div className="rounded-2xl border border-purple-400/20 bg-[#07182b] p-3 text-center">
                      <div className="text-xs font-bold text-gray-400">نسبة الإشغال</div>
                      <div className="mt-1 text-2xl font-black text-purple-300">
                        {occupancyRate}%
                      </div>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-auto p-4">
                    <div className="overflow-hidden rounded-2xl border border-white/10">
                      <table className="w-full min-w-[760px] border-collapse text-sm">
                        <thead className="sticky top-0 z-10 bg-[#0b2039]">
                          <tr className="text-gray-300">
                            <th className="border-b border-white/10 px-4 py-3 text-center">رقم الشقة</th>
                            <th className="border-b border-white/10 px-4 py-3 text-center">نوع الشقة</th>
                            <th className="border-b border-white/10 px-4 py-3 text-center">الحالة</th>
                            <th className="border-b border-white/10 px-4 py-3 text-center">الإيجار الشهري</th>
                            <th className="border-b border-white/10 px-4 py-3 text-center">المستأجر / الجهة</th>
                          </tr>
                        </thead>

                        <tbody>
                          {report.data.map((apartment) => {
                            const effectiveStatus = getEffectiveApartmentStatus(apartment);
                            const statusColor = getStatusColor(effectiveStatus);

                            return (
                              <tr
                                key={apartment.number}
                                className="border-b border-white/5 bg-white/[0.02] transition hover:bg-white/[0.05]"
                              >
                                <td className="px-4 py-3 text-center font-black text-[#f6c84a]">
                                  {apartment.number}
                                </td>
                                <td className="px-4 py-3 text-center font-semibold text-gray-200">
                                  {getApartmentType(apartment)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span
                                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${statusColor.badge}`}
                                  >
                                    <span className={`h-2 w-2 rounded-full ${statusColor.dot}`} />
                                    {effectiveStatus === "شاغرة"
                                      ? "فارغة"
                                      : effectiveStatus}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center font-black text-green-300">
                                  {getApartmentRent(apartment).toLocaleString("ar-SA")} ريال
                                </td>
                                <td className="px-4 py-3 text-center font-semibold text-gray-300">
                                  {apartment.tenant || "غير مضاف"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="shrink-0 border-t border-white/10 bg-[#061426] p-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <button
                        type="button"
                        onClick={exportApartmentReportExcel}
                        className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-green-400/30 bg-green-500/10 px-4 text-sm font-black text-green-300 transition hover:bg-green-500/20"
                      >
                        <Download size={19} />
                        تصدير Excel
                      </button>

                      <button
                        type="button"
                        onClick={printApartmentReport}
                        className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-blue-400/30 bg-blue-500/10 px-4 text-sm font-black text-blue-300 transition hover:bg-blue-500/20"
                      >
                        <Printer size={19} />
                        طباعة
                      </button>

                      <button
                        type="button"
                        onClick={exportApartmentReportPdf}
                        className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 text-sm font-black text-red-300 transition hover:bg-red-500/20"
                      >
                        <FileText size={19} />
                        تصدير PDF
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ===================================================== */}
      {/* MONTHLY FINANCIAL REPORT MODAL                           */}
      {/* ===================================================== */}

      {isMonthlyDueReportOpen && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          onClick={() => setIsMonthlyDueReportOpen(false)}
        >
          <div
            dir="rtl"
            className="flex max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border border-orange-400/30 bg-[#07182b] shadow-[0_25px_90px_rgba(0,0,0,0.6)]"
            onClick={(event) => event.stopPropagation()}
          >
            {(() => {
              const report = getMonthlyReportData();

              return (
                <>
                  <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#061426] px-5 py-4">
                    <div className="text-right">
                      <h2 className="text-xl font-black text-[#f6c84a] sm:text-2xl">
                        {report.title}
                      </h2>
                      <p className="mt-1 text-xs font-semibold text-gray-400 sm:text-sm">
                        {report.subtitle}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsMonthlyDueReportOpen(false)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-300 transition hover:border-red-400/40 hover:bg-red-400/10 hover:text-red-300"
                      aria-label="إغلاق التقرير"
                    >
                      <X size={21} />
                    </button>
                  </div>

                  <div className="shrink-0 grid grid-cols-1 gap-3 border-b border-white/10 bg-[#0b2039] p-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-orange-400/20 bg-[#07182b] p-3 text-center">
                      <div className="text-xs font-bold text-gray-400">
                        إجمالي المستحق
                      </div>
                      <div className="mt-1 text-2xl font-black text-orange-300">
                        {report.total.toLocaleString("ar-SA")} ريال
                      </div>
                    </div>

                    <div className="rounded-2xl border border-blue-400/20 bg-[#07182b] p-3 text-center">
                      <div className="text-xs font-bold text-gray-400">
                        عدد العمليات
                      </div>
                      <div className="mt-1 text-2xl font-black text-blue-300">
                        {report.rows.length}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-green-400/20 bg-[#07182b] p-3 text-center">
                      <div className="text-xs font-bold text-gray-400">
                        الفترة المحددة
                      </div>
                      <div className="mt-1 text-sm font-black text-green-300">
                        {formatContractDate(fromDate)} —{" "}
                        {formatContractDate(toDate)}
                      </div>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-auto p-4">
                    <div className="overflow-hidden rounded-2xl border border-white/10">
                      <table className="w-full min-w-[1050px] border-collapse text-sm">
                        <thead className="sticky top-0 z-10 bg-[#0b2039]">
                          <tr className="text-gray-300">
                            <th className="border-b border-white/10 px-4 py-3 text-center">
                              #
                            </th>
                            <th className="border-b border-white/10 px-4 py-3 text-center">
                              رقم الشقة
                            </th>
                            <th className="border-b border-white/10 px-4 py-3 text-center">
                              المستأجر / الجهة
                            </th>
                            <th className="border-b border-white/10 px-4 py-3 text-center">
                              التاريخ
                            </th>
                            <th className="border-b border-white/10 px-4 py-3 text-center">
                              نوع المستحق
                            </th>
                            <th className="border-b border-white/10 px-4 py-3 text-center">
                              المبلغ
                            </th>
                            <th className="border-b border-white/10 px-4 py-3 text-center">
                              تفاصيل / ملاحظات
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {report.rows.length > 0 ? (
                            report.rows.map((row, index) => (
                              <tr
                                key={`${row.date}-${row.apartmentNumber}-${row.type}-${index}`}
                                className="border-b border-white/5 bg-white/[0.02] transition hover:bg-white/[0.05]"
                              >
                                <td className="px-4 py-3 text-center font-bold text-gray-500">
                                  {index + 1}
                                </td>
                                <td className="px-4 py-3 text-center font-black text-[#f6c84a]">
                                  {row.apartmentNumber ?? "غير محدد"}
                                </td>
                                <td className="px-4 py-3 text-center font-semibold text-gray-200">
                                  {row.tenant}
                                </td>
                                <td className="px-4 py-3 text-center font-bold text-gray-300">
                                  {formatContractDate(row.date)}
                                </td>
                                <td className="px-4 py-3 text-center font-black text-white">
                                  {row.type}
                                </td>
                                <td className="px-4 py-3 text-center font-black text-green-300">
                                  {row.amount.toLocaleString("ar-SA")} ريال
                                </td>
                                <td className="px-4 py-3 text-center font-semibold leading-6 text-gray-400">
                                  {row.notes}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan={7}
                                className="px-5 py-16 text-center"
                              >
                                <Receipt
                                  size={42}
                                  className="mx-auto text-gray-700"
                                />
                                <div className="mt-4 text-base font-bold text-gray-400">
                                  لا توجد بيانات مسجلة خلال الفترة المحددة
                                </div>
                                <div className="mt-2 text-sm text-gray-600">
                                  عند إضافة البيانات الخاصة بهذا النوع ستظهر هنا تلقائيًا.
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="shrink-0 border-t border-white/10 bg-[#061426] p-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <button
                        type="button"
                        onClick={exportMonthlyDueExcel}
                        className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-green-400/30 bg-green-500/10 px-4 text-sm font-black text-green-300 transition hover:bg-green-500/20"
                      >
                        <Download size={19} />
                        تصدير Excel
                      </button>

                      <button
                        type="button"
                        onClick={printMonthlyDueReport}
                        className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-blue-400/30 bg-blue-500/10 px-4 text-sm font-black text-blue-300 transition hover:bg-blue-500/20"
                      >
                        <Printer size={19} />
                        طباعة
                      </button>

                      <button
                        type="button"
                        onClick={exportMonthlyDuePdf}
                        className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 text-sm font-black text-red-300 transition hover:bg-red-500/20"
                      >
                        <FileText size={19} />
                        تصدير PDF
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ===================================================== */}
      {/* MONTHLY COLLECTION REPORT MODAL                        */}
      {/* ===================================================== */}

      {isMonthlyCollectionReportOpen && (
        <div
          className="fixed inset-0 z-[96] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          onClick={() => setIsMonthlyCollectionReportOpen(false)}
        >
          <div
            dir="rtl"
            className="flex max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border border-green-400/30 bg-[#07182b] shadow-[0_25px_90px_rgba(0,0,0,0.6)]"
            onClick={(event) => event.stopPropagation()}
          >
            {(() => {
              const report = getMonthlyCollectionReportData();

              return (
                <>
                  <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#061426] px-5 py-4">
                    <div className="text-right">
                      <h2 className="text-xl font-black text-green-300 sm:text-2xl">
                        {report.title}
                      </h2>
                      <p className="mt-1 text-xs font-semibold text-gray-400 sm:text-sm">
                        {report.subtitle}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsMonthlyCollectionReportOpen(false)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-300 transition hover:border-red-400/40 hover:bg-red-400/10 hover:text-red-300"
                      aria-label="إغلاق تقرير التحصيلات"
                    >
                      <X size={21} />
                    </button>
                  </div>

                  <div className="shrink-0 grid grid-cols-1 gap-3 border-b border-white/10 bg-[#0b2039] p-4 sm:grid-cols-4">
                    <div className="rounded-2xl border border-orange-400/20 bg-[#07182b] p-3 text-center">
                      <div className="text-xs font-bold text-gray-400">
                        إجمالي المستحق
                      </div>
                      <div className="mt-1 text-2xl font-black text-orange-300">
                        {report.dueTotal.toLocaleString("ar-SA")} ريال
                      </div>
                    </div>

                    <div className="rounded-2xl border border-green-400/20 bg-[#07182b] p-3 text-center">
                      <div className="text-xs font-bold text-gray-400">
                        إجمالي المحصل
                      </div>
                      <div className="mt-1 text-2xl font-black text-green-300">
                        {report.collectedTotal.toLocaleString("ar-SA")} ريال
                      </div>
                    </div>

                    <div className="rounded-2xl border border-red-400/20 bg-[#07182b] p-3 text-center">
                      <div className="text-xs font-bold text-gray-400">
                        المتبقي
                      </div>
                      <div className="mt-1 text-2xl font-black text-red-300">
                        {report.remainingTotal.toLocaleString("ar-SA")} ريال
                      </div>
                    </div>

                    <div className="rounded-2xl border border-blue-400/20 bg-[#07182b] p-3 text-center">
                      <div className="text-xs font-bold text-gray-400">
                        الفترة المحددة
                      </div>
                      <div className="mt-1 text-sm font-black text-blue-300">
                        {formatContractDate(fromDate)} —{" "}
                        {formatContractDate(toDate)}
                      </div>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-auto p-4">
                    <div className="overflow-hidden rounded-2xl border border-white/10">
                      <table className="w-full min-w-[1200px] border-collapse text-sm">
                        <thead className="sticky top-0 z-10 bg-[#0b2039]">
                          <tr className="text-gray-300">
                            <th className="border-b border-white/10 px-4 py-3 text-center">
                              #
                            </th>
                            <th className="border-b border-white/10 px-4 py-3 text-center">
                              رقم الشقة
                            </th>
                            <th className="border-b border-white/10 px-4 py-3 text-center">
                              المستأجر / الجهة
                            </th>
                            <th className="border-b border-white/10 px-4 py-3 text-center">
                              التاريخ
                            </th>
                            <th className="border-b border-white/10 px-4 py-3 text-center">
                              نوع المستحق
                            </th>
                            <th className="border-b border-white/10 px-4 py-3 text-center">
                              نوع العملية
                            </th>
                            <th className="border-b border-white/10 px-4 py-3 text-center">
                              المبلغ
                            </th>
                            <th className="border-b border-white/10 px-4 py-3 text-center">
                              تفاصيل / ملاحظات
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {report.rows.length > 0 ? (
                            report.rows.map((row, index) => (
                              <tr
                                key={`${row.date}-${row.apartmentNumber}-${row.type}-${row.transactionType}-${index}`}
                                className="border-b border-white/5 bg-white/[0.02] transition hover:bg-white/[0.05]"
                              >
                                <td className="px-4 py-3 text-center font-bold text-gray-500">
                                  {index + 1}
                                </td>
                                <td className="px-4 py-3 text-center font-black text-[#f6c84a]">
                                  {row.apartmentNumber ?? "غير محدد"}
                                </td>
                                <td className="px-4 py-3 text-center font-semibold text-gray-200">
                                  {row.tenant}
                                </td>
                                <td className="px-4 py-3 text-center font-bold text-gray-300">
                                  {formatContractDate(row.date)}
                                </td>
                                <td className="px-4 py-3 text-center font-black text-white">
                                  {row.type}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span
                                    className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-black ${
                                      row.transactionType === "تحصيل"
                                        ? "border-green-400/25 bg-green-400/10 text-green-300"
                                        : "border-orange-400/25 bg-orange-400/10 text-orange-300"
                                    }`}
                                  >
                                    {row.transactionType}
                                  </span>
                                </td>
                                <td
                                  className={`px-4 py-3 text-center font-black ${
                                    row.transactionType === "تحصيل"
                                      ? "text-green-300"
                                      : "text-orange-300"
                                  }`}
                                >
                                  {row.amount.toLocaleString("ar-SA")} ريال
                                </td>
                                <td className="px-4 py-3 text-center font-semibold leading-6 text-gray-400">
                                  {row.notes}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan={8}
                                className="px-5 py-16 text-center"
                              >
                                <Receipt
                                  size={42}
                                  className="mx-auto text-gray-700"
                                />
                                <div className="mt-4 text-base font-bold text-gray-400">
                                  لا توجد بيانات مسجلة خلال الفترة المحددة
                                </div>
                                <div className="mt-2 text-sm text-gray-600">
                                  عند إضافة المستحقات أو تسجيل التحصيلات ستظهر
                                  هنا تلقائيًا.
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="shrink-0 border-t border-white/10 bg-[#061426] p-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <button
                        type="button"
                        onClick={exportMonthlyCollectionExcel}
                        className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-green-400/30 bg-green-500/10 px-4 text-sm font-black text-green-300 transition hover:bg-green-500/20"
                      >
                        <Download size={19} />
                        تصدير Excel
                      </button>

                      <button
                        type="button"
                        onClick={printMonthlyCollectionReport}
                        className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-blue-400/30 bg-blue-500/10 px-4 text-sm font-black text-blue-300 transition hover:bg-blue-500/20"
                      >
                        <Printer size={19} />
                        طباعة
                      </button>

                      <button
                        type="button"
                        onClick={exportMonthlyCollectionPdf}
                        className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 text-sm font-black text-red-300 transition hover:bg-red-500/20"
                      >
                        <FileText size={19} />
                        تصدير PDF
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ===================================================== */}
      {/* SELECTED APARTMENT FINANCIAL REPORT                    */}
      {/* ===================================================== */}

      {selectedApartmentFinancialReport && selectedApartment && (
        <div
          className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/85 p-3 backdrop-blur-md sm:p-5"
          onClick={() => setSelectedApartmentFinancialReport(null)}
        >
          <div
            dir="rtl"
            className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-[#f0ad18]/30 bg-[#07182b] shadow-[0_25px_90px_rgba(0,0,0,0.65)]"
            onClick={(event) => event.stopPropagation()}
          >
            {(() => {
              const report = getSelectedApartmentFinancialReport();
              return (
                <>
                  <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#061426] px-5 py-4">
                    <div>
                      <h2 className="text-xl font-black text-[#f6c84a] sm:text-2xl">
                        {report.title}
                      </h2>
                      <p className="mt-1 text-sm font-semibold text-gray-400">
                        شقة رقم {selectedApartment.number} — {formatContractDate(fromDate)} إلى {formatContractDate(toDate)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedApartmentFinancialReport(null)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-300 transition hover:border-red-400/40 hover:bg-red-400/10 hover:text-red-300"
                    >
                      <X size={21} />
                    </button>
                  </div>

                  <div className="grid shrink-0 grid-cols-1 gap-3 border-b border-white/10 bg-[#0b2039] p-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-[#f0ad18]/20 bg-[#07182b] p-4 text-center">
                      <div className="text-xs font-bold text-gray-400">إجمالي التقرير</div>
                      <div className="mt-1 text-2xl font-black text-[#f6c84a]">
                        {report.total.toLocaleString("ar-SA")} ريال
                      </div>
                    </div>
                    <div className="rounded-2xl border border-blue-400/20 bg-[#07182b] p-4 text-center">
                      <div className="text-xs font-bold text-gray-400">عدد العمليات</div>
                      <div className="mt-1 text-2xl font-black text-blue-300">
                        {report.rows.length}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-green-400/20 bg-[#07182b] p-4 text-center">
                      <div className="text-xs font-bold text-gray-400">الفترة</div>
                      <div className="mt-1 text-sm font-black text-green-300">
                        {formatContractDate(fromDate)} — {formatContractDate(toDate)}
                      </div>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-auto p-4">
                    <div className="overflow-hidden rounded-2xl border border-white/10">
                      <table className="w-full min-w-[850px] border-collapse text-sm">
                        <thead className="sticky top-0 z-10 bg-[#0b2039]">
                          <tr className="text-gray-300">
                            <th className="border-b border-white/10 px-4 py-3 text-center">#</th>
                            <th className="border-b border-white/10 px-4 py-3 text-center">التاريخ</th>
                            <th className="border-b border-white/10 px-4 py-3 text-center">نوع العملية</th>
                            <th className="border-b border-white/10 px-4 py-3 text-center">المبلغ</th>
                            <th className="border-b border-white/10 px-4 py-3 text-center">التفاصيل</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.rows.length ? (
                            report.rows.map((row, index) => (
                              <tr key={`${row.date}-${row.type}-${index}`} className="border-b border-white/5 bg-white/[0.02] hover:bg-white/[0.05]">
                                <td className="px-4 py-3 text-center font-bold text-gray-500">{index + 1}</td>
                                <td className="px-4 py-3 text-center font-bold text-gray-300">{formatContractDate(row.date)}</td>
                                <td className="px-4 py-3 text-center font-black text-white">{row.type || "غير محدد"}</td>
                                <td className="px-4 py-3 text-center font-black text-green-300">{(Number(row.amount) || 0).toLocaleString("ar-SA")} ريال</td>
                                <td className="px-4 py-3 text-center font-semibold text-gray-400">{row.notes || "لا توجد تفاصيل"}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="px-5 py-14 text-center text-gray-500">لا توجد بيانات خلال الفترة المحددة.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="shrink-0 border-t border-white/10 bg-[#061426] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                        <button
                          type="button"
                          onClick={printSelectedApartmentFinancialReport}
                          className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-blue-400/30 bg-blue-500/10 px-5 text-sm font-black text-blue-300 transition hover:bg-blue-500/20"
                        >
                          <Printer size={18} />
                          طباعة
                        </button>

                        <button
                          type="button"
                          onClick={exportSelectedApartmentFinancialReportPdf}
                          className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-red-400/30 bg-red-500/10 px-5 text-sm font-black text-red-300 transition hover:bg-red-500/20"
                        >
                          <FileText size={18} />
                          تصدير PDF
                        </button>

                        <button
                          type="button"
                          onClick={exportSelectedApartmentFinancialReportExcel}
                          className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-green-400/30 bg-green-500/10 px-5 text-sm font-black text-green-300 transition hover:bg-green-500/20"
                        >
                          <Download size={18} />
                          تصدير Excel
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedApartmentFinancialReport(null)}
                        className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-8 text-sm font-black text-gray-300 transition hover:border-red-400/40 hover:bg-red-400/10 hover:text-red-300"
                      >
                        <X size={19} />
                        إغلاق
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ===================================================== */}
      {/* FOOTER                                                 */}
      {/* ===================================================== */}

      <div className="mt-6 rounded-2xl border border-emerald-400/10 bg-[#06382b]/35 py-3 text-center text-sm text-gray-400 backdrop-blur-sm">
        Aqary Smart ERP System — تفاصيل {buildingName}
      </div>

      <PermissionDeniedModal
        open={Boolean(permissionMessage)}
        message={
          permissionMessage ??
          "عذرًا، غير مسموح للمستخدم الحالي بهذا الإجراء."
        }
        onClose={() => setPermissionMessage(null)}
      />
    </div>
  );
}

