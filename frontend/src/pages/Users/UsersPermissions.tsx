import {

  ShieldCheck,

  UsersRound,

  UserPlus,

  LockKeyhole,

  Settings,

  Search,

  ChevronDown,

  Plus,

  Save,

  Pencil,

  Trash2,

  MoreHorizontal,

  Eye,

  Building2,

  FolderKanban,

  LayoutDashboard,

  Receipt,

  KeyRound,

  Database,

  Calculator,

  UserCog,

  Headphones,

  Mail,

  Check,

  X,

  Camera,

  Crown,

  BriefcaseBusiness,

} from "lucide-react";

import { useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "../../utils/supabase";

const SYSTEM_OWNER_EMAIL = "alinasr99f@gmail.com";
const USER_AVATARS_BUCKET = "user-avatars";
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

type Role =

  | "مسؤول النظام"

  | "مدير النظام"

  | "مدير"

  | "مشرف"

  | "محاسب"

  | "موظف"

  | "مدخل بيانات";



type PermissionKey =

  | "dashboard_view"

  | "dashboard_add"

  | "dashboard_edit"

  | "dashboard_delete"

  | "projects_view"

  | "projects_add"

  | "projects_edit"

  | "projects_delete"

  | "buildings_view"

  | "buildings_add"

  | "buildings_edit"

  | "buildings_delete"

  | "building_details_view"

  | "building_details_edit"

  | "building_apartment_add"

  | "building_apartment_edit"

  | "building_apartment_delete"

  | "rentals_view"

  | "rentals_add"

  | "rentals_edit"

  | "rentals_delete"

  | "invoices_view"

  | "invoices_add"

  | "invoices_edit"

  | "invoices_delete"

  | "collections_add"

  | "collections_edit"

  | "apartment_map_view"

  | "apartments_view"

  | "apartments_add"

  | "apartments_edit"

  | "apartments_delete"

  | "financial_view"

  | "financial_add"

  | "financial_edit"

  | "financial_delete"

  | "users_view"

  | "users_add"

  | "users_edit"

  | "users_delete"

  | "reports_view"

  | "reports_add"

  | "reports_edit"

  | "reports_delete"

  | "settings_view"

  | "settings_add"

  | "settings_edit"

  | "settings_delete";



type UserRow = {

  id: number;

  name: string;

  email: string;

  role: Role;

  active: boolean;

  avatar_url: string | null;

  permissions: Record<PermissionKey, boolean>;

};



const roleMeta: Record<

  Role,

  { icon: typeof Crown; tone: string; description: string }

> = {

  "مسؤول النظام": {

    icon: Crown,

    tone: "text-amber-200 bg-amber-400/10 border-amber-300/20",

    description: "جميع الصلاحيات الكاملة على النظام",

  },

  "مدير النظام": {
    icon: Settings,
    tone: "text-emerald-200 bg-emerald-400/10 border-emerald-300/20",
    description: "إدارة النظام حسب الصلاحيات المحددة",
  },

  مدير: {

    icon: Settings,

    tone: "text-emerald-200 bg-emerald-400/10 border-emerald-300/20",

    description: "إدارة المشاريع والمستخدمين والتقارير",

  },

  مشرف: {

    icon: ShieldCheck,

    tone: "text-amber-100 bg-amber-400/10 border-amber-300/20",

    description: "متابعة العمليات والمشاريع",

  },

  محاسب: {

    icon: Calculator,

    tone: "text-violet-200 bg-violet-400/10 border-violet-300/20",

    description: "إدارة البيانات المالية والتقارير",

  },

  موظف: {

    icon: UserCog,

    tone: "text-sky-200 bg-sky-400/10 border-sky-300/20",

    description: "الوصول المحدود حسب الصلاحيات",

  },

  "مدخل بيانات": {

    icon: Database,

    tone: "text-slate-200 bg-slate-400/10 border-slate-300/20",

    description: "إدخال وتعديل البيانات الأساسية فقط",

  },

};



type PermissionItem = { key: PermissionKey; title: string };

type PermissionSection = {
  key: string;
  title: string;
  icon: typeof LayoutDashboard;
  children: PermissionItem[];
};

type PermissionGroup = {
  key: string;
  title: string;
  icon: typeof LayoutDashboard;
  children: PermissionItem[];
  sections?: PermissionSection[];
};

const permissionGroups: PermissionGroup[] = [
  {
    key: "dashboard",
    title: "لوحة التحكم",
    icon: LayoutDashboard,
    children: [
      { key: "dashboard_view", title: "عرض" },
      { key: "dashboard_add", title: "إضافة" },
      { key: "dashboard_edit", title: "تعديل" },
      { key: "dashboard_delete", title: "حذف" },
    ],
  },
  {
    key: "projects",
    title: "المشاريع",
    icon: FolderKanban,
    children: [
      { key: "projects_view", title: "عرض" },
      { key: "projects_add", title: "إضافة" },
      { key: "projects_edit", title: "تعديل" },
      { key: "projects_delete", title: "حذف" },
    ],
  },
  {
    key: "buildings",
    title: "العمائر",
    icon: Building2,
    children: [
      { key: "buildings_view", title: "👁 عرض العمائر" },
      { key: "buildings_add", title: "➕ إضافة عمارة" },
      { key: "buildings_edit", title: "✏️ تعديل العمارة" },
      { key: "buildings_delete", title: "🗑 حذف العمارة" },
      { key: "building_details_view", title: "👁 عرض تفاصيل العمارة" },
      { key: "building_details_edit", title: "✏️ تعديل تفاصيل العمارة" },
      { key: "building_apartment_add", title: "➕ إضافة شقة" },
      { key: "building_apartment_edit", title: "✏️ تعديل شقة" },
      { key: "building_apartment_delete", title: "🗑 حذف شقة" },
      { key: "rentals_view", title: "👁 عرض الإيجارات" },
      { key: "rentals_add", title: "➕ إضافة إيجار" },
      { key: "rentals_edit", title: "✏️ تعديل إيجار" },
      { key: "rentals_delete", title: "🗑 حذف إيجار" },
      { key: "invoices_view", title: "👁 عرض الفواتير" },
      { key: "invoices_add", title: "➕ إضافة فاتورة" },
      { key: "invoices_edit", title: "✏️ تعديل فاتورة" },
      { key: "invoices_delete", title: "🗑 حذف فاتورة" },
      { key: "collections_add", title: "💰 تحصيل مستحق" },
      { key: "collections_edit", title: "✏️ تعديل تحصيل" },
      { key: "apartment_map_view", title: "👁 عرض خريطة الشقق" },
    ],
    sections: [
      {
        key: "building_details",
        title: "تفاصيل العمارة",
        icon: Building2,
        children: [
          { key: "building_details_view", title: "👁 عرض التفاصيل" },
          { key: "building_details_edit", title: "✏️ تعديل التفاصيل" },
          { key: "building_apartment_add", title: "➕ إضافة شقة" },
          { key: "building_apartment_edit", title: "✏️ تعديل شقة" },
          { key: "building_apartment_delete", title: "🗑 حذف شقة" },
        ],
      },
      {
        key: "rentals",
        title: "الإيجارات",
        icon: Receipt,
        children: [
          { key: "rentals_view", title: "👁 عرض الإيجارات" },
          { key: "rentals_add", title: "➕ إضافة إيجار" },
          { key: "rentals_edit", title: "✏️ تعديل إيجار" },
          { key: "rentals_delete", title: "🗑 حذف إيجار" },
        ],
      },
      {
        key: "invoices",
        title: "الفواتير والمستحقات",
        icon: Receipt,
        children: [
          { key: "invoices_view", title: "👁 عرض الفواتير" },
          { key: "invoices_add", title: "➕ إضافة فاتورة" },
          { key: "invoices_edit", title: "✏️ تعديل فاتورة" },
          { key: "invoices_delete", title: "🗑 حذف فاتورة" },
          { key: "collections_add", title: "💰 تحصيل مستحق" },
          { key: "collections_edit", title: "✏️ تعديل تحصيل" },
        ],
      },
      {
        key: "apartment_map",
        title: "خريطة الشقق",
        icon: Building2,
        children: [
          { key: "apartment_map_view", title: "👁 عرض خريطة الشقق" },
        ],
      },
    ],
  },
  {
    key: "apartments",
    title: "الشقق",
    icon: Building2,
    children: [
      { key: "apartments_view", title: "عرض" },
      { key: "apartments_add", title: "إضافة" },
      { key: "apartments_edit", title: "تعديل" },
      { key: "apartments_delete", title: "حذف" },
    ],
  },
  {
    key: "financial",
    title: "المركز المالي",
    icon: Receipt,
    children: [
      { key: "financial_view", title: "عرض" },
      { key: "financial_add", title: "إضافة" },
      { key: "financial_edit", title: "تعديل" },
      { key: "financial_delete", title: "حذف" },
    ],
  },
  {
    key: "users",
    title: "المستخدمين والصلاحيات",
    icon: UsersRound,
    children: [
      { key: "users_view", title: "عرض" },
      { key: "users_add", title: "إضافة" },
      { key: "users_edit", title: "تعديل" },
      { key: "users_delete", title: "حذف" },
    ],
  },
  {
    key: "reports",
    title: "التقارير",
    icon: BriefcaseBusiness,
    children: [
      { key: "reports_view", title: "عرض" },
      { key: "reports_add", title: "إضافة" },
      { key: "reports_edit", title: "تعديل" },
      { key: "reports_delete", title: "حذف" },
    ],
  },
  {
    key: "settings",
    title: "إعدادات النظام",
    icon: Settings,
    children: [
      { key: "settings_view", title: "عرض" },
      { key: "settings_add", title: "إضافة" },
      { key: "settings_edit", title: "تعديل" },
      { key: "settings_delete", title: "حذف" },
    ],
  },
];

const defaultPermissions: Record<PermissionKey, boolean> = {

  dashboard_view: true,

  dashboard_add: false,

  dashboard_edit: false,
  dashboard_delete: false,

  projects_view: true,

  projects_add: false,

  projects_edit: false,
  projects_delete: false,

  buildings_view: true,

  buildings_add: false,

  buildings_edit: false,
  buildings_delete: false,

  building_details_view: true,

  building_details_edit: false,

  building_apartment_add: false,

  building_apartment_edit: false,

  building_apartment_delete: false,

  rentals_view: true,

  rentals_add: false,

  rentals_edit: false,

  rentals_delete: false,

  invoices_view: true,

  invoices_add: false,

  invoices_edit: false,

  invoices_delete: false,

  collections_add: false,

  collections_edit: false,

  apartment_map_view: true,

  apartments_view: true,

  apartments_add: false,

  apartments_edit: false,
  apartments_delete: false,

  financial_view: true,

  financial_add: false,

  financial_edit: false,
  financial_delete: false,

  users_view: true,

  users_add: false,

  users_edit: false,
  users_delete: false,

  reports_view: true,

  reports_add: false,

  reports_edit: false,
  reports_delete: false,

  settings_view: false,

  settings_add: false,

  settings_edit: false,
  settings_delete: false,

};



const getRolePermissions = (role: Role): Record<PermissionKey, boolean> => {

  const permissions = {} as Record<PermissionKey, boolean>;



  permissionGroups.forEach((group) => {

    group.children.forEach((permission) => {

      if (role === "مسؤول النظام" || role === "مدير النظام") {

        permissions[permission.key] = true;

        return;

      }



      // إعدادات النظام: ممنوعة على كل التصنيفات ما عدا مسؤول النظام.

      if (group.key === "settings") {

        permissions[permission.key] = false;

        return;

      }



      // المستخدمون والصلاحيات: المدير عرض + إضافة، وباقي التصنيفات عرض فقط.

      if (group.key === "users") {

        permissions[permission.key] =

          role === "مدير"

            ? permission.key === "users_view" ||
                permission.key === "users_add" ||
                permission.key === "users_delete"

            : permission.key === "users_view";

        return;

      }



      // المدير / المشرف / مدخل البيانات: عرض + إضافة افتراضيًا.

      if (

        role === "مدير" ||

        role === "مشرف" ||

        role === "مدخل بيانات"

      ) {

        permissions[permission.key] =

          permission.key.endsWith("_view") ||

          permission.key.endsWith("_add");

        return;

      }



      // المحاسب / الموظف: عرض فقط افتراضيًا.

      permissions[permission.key] = permission.key.endsWith("_view");

    });

  });



  return permissions;

};

const glass =
  "border border-white/10 bg-white/[0.035] backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.18)]";

const isValidAvatarFile = (file: File) => {
  if (!file.type.startsWith("image/")) { alert("يرجى اختيار ملف صورة فقط."); return false; }
  if (file.size > MAX_AVATAR_SIZE) { alert("حجم الصورة يجب ألا يتجاوز 5 ميجابايت."); return false; }
  return true;
};

const uploadUserAvatar = async (userId: number, file: File) => {
  const avatarPath = `${userId}/avatar`;
  const { error } = await supabase.storage.from(USER_AVATARS_BUCKET).upload(avatarPath, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
  if (error) throw error;
  const { data } = supabase.storage.from(USER_AVATARS_BUCKET).getPublicUrl(avatarPath);
  return `${data.publicUrl}?v=${Date.now()}`;
};

const deleteUserAvatar = async (userId: number) => {
  const { error } = await supabase.storage.from(USER_AVATARS_BUCKET).remove([`${userId}/avatar`]);
  if (error) console.warn("تعذر حذف صورة المستخدم من التخزين:", error);
};

export default function UsersPermissions() {

  const [currentUser, setCurrentUser] = useState<UserRow | null>(null);

  const [users, setUsers] = useState<UserRow[]>([]);

  const isSystemOwner =

    currentUser?.email?.trim().toLowerCase() === SYSTEM_OWNER_EMAIL.toLowerCase();

  const isSystemManager = currentUser?.role?.trim() === "مدير النظام";

  // مدير النظام يمتلك صلاحية إدارة المستخدمين والصلاحيات بالكامل،
  // لكن مسؤول النظام الأساسي يظل محميًا ولا يمكنه تعديله.
  const canAddUsers =
    isSystemOwner || isSystemManager || Boolean(currentUser?.permissions?.users_add);
  const canEditUsers =
    isSystemOwner || isSystemManager || Boolean(currentUser?.permissions?.users_edit);
  const canDeleteUsers =
    isSystemOwner || isSystemManager || Boolean(currentUser?.permissions?.users_delete);
  const canManageUsers = isSystemOwner || isSystemManager || canAddUsers || canEditUsers || canDeleteUsers;

  const protectedPermissionKeys = new Set<PermissionKey>([

    "users_view",

    "users_add",

    "users_edit",

    "users_delete",

    "settings_view",

    "settings_add",

    "settings_edit",

    "settings_delete",

  ]);

  const [loadingUsers, setLoadingUsers] = useState(true);

  const [savingUsers, setSavingUsers] = useState(false);

  const [databaseError, setDatabaseError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const [roleFilter, setRoleFilter] = useState<"الكل" | Role>("الكل");

  const [statusFilter, setStatusFilter] = useState<"الكل" | "نشط" | "غير نشط">(

    "الكل",

  );

  const [newName, setNewName] = useState("");

  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);

const [newAvatarPreview, setNewAvatarPreview] = useState<string | null>(null);

const newAvatarInputRef = useRef<HTMLInputElement | null>(null);

  const [newEmail, setNewEmail] = useState("");

  const [newEmailFocused, setNewEmailFocused] = useState(false);

  const [newPassword, setNewPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const [newRole, setNewRole] = useState<Role>("موظف");

  const [selectedPermissions, setSelectedPermissions] =

    useState<Record<PermissionKey, boolean>>(getRolePermissions("موظف"));

  const [currentPassword, setCurrentPassword] = useState("");

  const [newCurrentPassword, setNewCurrentPassword] = useState("");

  const [changingPassword, setChangingPassword] = useState(false);



  const [editingUser, setEditingUser] = useState<UserRow | null>(null);

  const [deleteUserTarget, setDeleteUserTarget] = useState<UserRow | null>(null);

  // نافذة تفاصيل صلاحيات القسم من جدول المستخدمين
  const [overviewGroupKey, setOverviewGroupKey] = useState<string | null>(null);

  const [editName, setEditName] = useState("");

  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);

const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);

const editAvatarInputRef = useRef<HTMLInputElement | null>(null);

  const [editEmail, setEditEmail] = useState("");

  const [editRole, setEditRole] = useState<Role>("موظف");

  const [editActive, setEditActive] = useState(true);

  const [editPermissions, setEditPermissions] =

    useState<Record<PermissionKey, boolean>>(getRolePermissions("موظف"));



  const normalizePermissions = (

    value: unknown,

  ): Record<PermissionKey, boolean> => ({

    ...defaultPermissions,

    ...(value && typeof value === "object"

      ? (value as Record<PermissionKey, boolean>)

      : {}),

  });



  const handleNewAvatarChange = (file?: File) => {
    if (!file || !isValidAvatarFile(file)) return;
    if (newAvatarPreview) URL.revokeObjectURL(newAvatarPreview);
    setNewAvatarFile(file);
    setNewAvatarPreview(URL.createObjectURL(file));
  };

  const handleEditAvatarChange = (file?: File) => {
    if (!file || !isValidAvatarFile(file)) return;
    if (editAvatarPreview) URL.revokeObjectURL(editAvatarPreview);
    setEditAvatarFile(file);
    setEditAvatarPreview(URL.createObjectURL(file));
  };

  const loadUsers = async () => {

    setLoadingUsers(true);

    setDatabaseError(null);



    const { data, error } = await supabase

      .from("users")

      .select("id, name, email, role, active, avatar_url, permissions")

      .order("id", { ascending: true });



    if (error) {

      console.error("خطأ في تحميل المستخدمين من Supabase:", error);

      setDatabaseError(error.message);

      setUsers([]);

      setLoadingUsers(false);

      return;

    }



    const rows: UserRow[] = (data ?? []).map((row) => ({

  id: Number(row.id),

  name: String(row.name ?? ""),

  email: String(row.email ?? ""),

  role: (row.role as Role) ?? "موظف",

  active: Boolean(row.active),

  avatar_url: row.avatar_url ? String(row.avatar_url) : null,

  permissions:
    String(row.role ?? "").trim() === "مدير النظام"
      ? getRolePermissions("مدير النظام")
      : normalizePermissions(row.permissions),

}));



    const { data: { user: authUser } } = await supabase.auth.getUser();

    const authEmail = authUser?.email?.trim().toLowerCase() ?? "";

    const me = rows.find(

      (user) => user.email.trim().toLowerCase() === authEmail,

    );



    setCurrentUser(me ?? null);



    const ownerEmail = SYSTEM_OWNER_EMAIL.toLowerCase();

    let visibleUsers: UserRow[] = [];



    if (authEmail === ownerEmail) {

      visibleUsers = rows;

    } else if (
      me?.role?.trim() === "مدير" ||
      me?.role?.trim() === "مدير النظام"
    ) {

      // المدير والمدير النظامي يشاهدان جميع المستخدمين
      // باستثناء مسؤول النظام الأساسي فقط.
      visibleUsers = rows.filter(

        (user) => user.email.trim().toLowerCase() !== ownerEmail,

      );

    } else if (me) {

      visibleUsers = rows.filter((user) => user.id === me.id);

    }



    setUsers(visibleUsers);

    setLoadingUsers(false);

  };



  useEffect(() => {

    void loadUsers();

  }, []);



  // تحميل الصلاحيات الافتراضية تلقائيًا عند تغيير نوع المستخدم،

  // مع بقاء إمكانية تعديل أي مربع يدويًا بعد ذلك.

  useEffect(() => {

    if (newRole === "مدير النظام") {
      const currentManager = users.find((user) => user.role === "مدير");
      setSelectedPermissions(
        currentManager
          ? { ...currentManager.permissions }
          : getRolePermissions("مدير النظام"),
      );
      return;
    }

    setSelectedPermissions(getRolePermissions(newRole));

  }, [newRole, users]);



  const filteredUsers = useMemo(() => {

    return users.filter((user) => {

      const query = search.trim().toLowerCase();

      const matchesSearch =

        !query ||

        user.name.toLowerCase().includes(query) ||

        user.email.toLowerCase().includes(query);



      const matchesRole = roleFilter === "الكل" || user.role === roleFilter;

      const matchesStatus =

        statusFilter === "الكل" ||

        (statusFilter === "نشط" ? user.active : !user.active);



      return matchesSearch && matchesRole && matchesStatus;

    });

  }, [users, search, roleFilter, statusFilter]);



  const roleCounts = useMemo(() => {

    return {

      total: users.length,

      مدير: users.filter((u) => u.role === "مدير").length,

      مشرف: users.filter((u) => u.role === "مشرف").length,

      موظف: users.filter((u) => u.role === "موظف").length,

      محاسب: users.filter((u) => u.role === "محاسب").length,

      inactive: users.filter((u) => !u.active).length,

    };

  }, [users]);



  const togglePermission = (key: PermissionKey) => {

    setSelectedPermissions((current) => ({

      ...current,

      [key]: !current[key],

    }));

  };



  const addUser = async () => {

    if (!canManageUsers) {

      alert("ليس لديك صلاحية إضافة مستخدمين.");

      return;

    }



    if (!isSystemOwner && ["مسؤول النظام", "مدير النظام"].includes(newRole)) {

      alert("لا يمكن لهذا المستخدم إنشاء مدير نظام أو مسؤول نظام.");

      return;

    }



    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {

      alert("يرجى استكمال بيانات المستخدم.");

      return;

    }



    if (newPassword !== confirmPassword) {

      alert("كلمة المرور وتأكيد كلمة المرور غير متطابقين.");

      return;

    }



    setSavingUsers(true);



    try {

      const { data: insertedUser, error: insertError } = await supabase

        .from("users")

        .insert({

          name: newName.trim(),

          email: newEmail.trim(),

          role: newRole,

          active: true,

          permissions: {

            ...selectedPermissions,

          },

        })

        .select("id, name, email, role, active, avatar_url, permissions")
        .single();



      if (insertError) throw insertError;



      const {

        data: { session: currentSession },

      } = await supabase.auth.getSession();



      const { data: authData, error: authError } =

        await supabase.auth.signUp({

          email: newEmail.trim(),

          password: newPassword,

          options: {

            data: {

              name: newName.trim(),

              role: newRole,

            },

          },

        });



      if (currentSession) {

        await supabase.auth.setSession({

          access_token: currentSession.access_token,

          refresh_token: currentSession.refresh_token,

        });

      }



      if (authError || !authData.user) {

        await supabase

          .from("users")

          .delete()

          .eq("id", insertedUser.id);



        throw (

          authError ??

          new Error("لم يتم إنشاء حساب المستخدم في Auth.")

        );

      }

      let avatarUrl: string | null = insertedUser.avatar_url ? String(insertedUser.avatar_url) : null;
      if (newAvatarFile) {
        try {
          avatarUrl = await uploadUserAvatar(Number(insertedUser.id), newAvatarFile);
          const { error: avatarUpdateError } = await supabase.from("users").update({ avatar_url: avatarUrl }).eq("id", insertedUser.id);
          if (avatarUpdateError) throw avatarUpdateError;
        } catch (avatarError) {
          console.error("تعذر حفظ صورة المستخدم الجديد:", avatarError);
          avatarUrl = null;
          alert("تم إنشاء المستخدم، لكن تعذر حفظ الصورة. تأكد من إنشاء Storage Bucket باسم user-avatars.");
        }
      }

      const newUser: UserRow = {

        id: Number(insertedUser.id),

        name: String(insertedUser.name ?? ""),

        email: String(insertedUser.email ?? ""),

        role: insertedUser.role as Role,

        active: Boolean(insertedUser.active),
        avatar_url: avatarUrl,

        permissions: normalizePermissions(insertedUser.permissions),

      };



      setUsers((current) => [newUser, ...current]);

      setNewName("");

      setNewEmail("");

      setNewEmailFocused(false);

      setNewPassword("");

      setConfirmPassword("");
      setNewAvatarFile(null);
      if (newAvatarPreview) URL.revokeObjectURL(newAvatarPreview);
      setNewAvatarPreview(null);

      setNewRole("موظف");

      setSelectedPermissions(getRolePermissions("موظف"));



      alert("تم إضافة المستخدم وحفظه في قاعدة البيانات بنجاح.");

    } catch (error) {

      console.error("خطأ في إضافة المستخدم:", error);

      alert(

        `تعذر إضافة المستخدم وحفظه في قاعدة البيانات:\n${

          error instanceof Error ? error.message : "خطأ غير معروف"

        }`,

      );

    } finally {

      setSavingUsers(false);

    }

  };



  const deleteUser = (user: UserRow) => {

    if (!isSystemOwner && !Boolean(currentUser?.permissions?.users_delete)) {

      alert("عذرًا، غير مسموح للمستخدم الحالي بهذا الإجراء.");

      return;

    }



    if (user.email.trim().toLowerCase() === SYSTEM_OWNER_EMAIL.toLowerCase()) {

      alert("لا يمكن حذف مسؤول النظام الحالي.");

      return;

    }



    setDeleteUserTarget(user);

  };



  const confirmDeleteUser = async () => {

    if (!deleteUserTarget) return;



    setSavingUsers(true);



    try {

      const { error } = await supabase

        .from("users")

        .delete()

        .eq("id", deleteUserTarget.id);



      if (error) throw error;

      await deleteUserAvatar(deleteUserTarget.id);



      setUsers((current) =>

        current.filter((user) => user.id !== deleteUserTarget.id),

      );

      setDeleteUserTarget(null);

      alert("تم حذف المستخدم من قاعدة البيانات.");

    } catch (error) {

      console.error("خطأ في حذف المستخدم:", error);

      alert(

        `تعذر حذف المستخدم من قاعدة البيانات:\n${

          error instanceof Error ? error.message : "خطأ غير معروف"

        }`,

      );

    } finally {

      setSavingUsers(false);

    }

  };



  const toggleUserPermission = async (

    id: number,

    key: PermissionKey,

  ) => {

    if (!canManageUsers) {

      alert("ليس لديك صلاحية تعديل الصلاحيات.");

      return;

    }



    if (!isSystemOwner && !isSystemManager && protectedPermissionKeys.has(key)) {

      alert("هذه الصلاحية محمية ولا يمكن للمدير تعديلها.");

      return;

    }



    const previousUser = users.find((user) => user.id === id);

    if (!previousUser) return;



    if (previousUser.email.trim().toLowerCase() === SYSTEM_OWNER_EMAIL.toLowerCase() && !isSystemOwner) {

      alert("لا يمكن تعديل مسؤول النظام الأساسي.");

      return;

    }



    const nextPermissions = {

      ...previousUser.permissions,

      [key]: !previousUser.permissions[key],

    };



    setUsers((current) =>

      current.map((user) =>

        user.id === id ? { ...user, permissions: nextPermissions } : user,

      ),

    );



    const { data: savedRow, error } = await supabase

      .from("users")

      .update({ permissions: nextPermissions })

      .eq("id", id)
      .select("id, permissions")
      .maybeSingle();

    // لا نعتبر العملية ناجحة إلا إذا أعادت قاعدة البيانات السجل الذي تم تحديثه.
    // هذا يمنع رجوع الصلاحية بعد Refresh عندما تمنع RLS عملية UPDATE أو لا يتم تحديث أي صف.
    if (error || !savedRow) {

      console.error(
        "خطأ في حفظ صلاحية المستخدم:",
        error ?? new Error("لم يتم تحديث أي سجل في جدول users"),
      );

      setUsers((current) =>

        current.map((user) => (user.id === id ? previousUser : user)),

      );

      alert(
        `تعذر حفظ الصلاحية في قاعدة البيانات.\n${
          error?.message ??
          "لم يتم تحديث أي سجل. تحقق من صلاحيات UPDATE/RLS لجدول users."
        }`,
      );

      return;
    }

    // استخدم القيمة التي أعادتها قاعدة البيانات بدل الاعتماد على الحالة المحلية فقط.
    const persistedPermissions = normalizePermissions(savedRow.permissions);

    setUsers((current) =>

      current.map((user) =>
        user.id === id
          ? { ...user, permissions: persistedPermissions }
          : user,
      ),

    );

  };



  const openEditUser = (user: UserRow) => {

    if (!canManageUsers) {

      alert("ليس لديك صلاحية تعديل المستخدمين.");

      return;

    }



    if (user.email.trim().toLowerCase() === SYSTEM_OWNER_EMAIL.toLowerCase() && !isSystemOwner) {

      alert("لا يمكن تعديل مسؤول النظام الأساسي.");

      return;

    }



    setEditingUser(user);

    setEditName(user.name);

    setEditEmail(user.email);

    setEditRole(user.role);

    setEditActive(user.active);
    setEditAvatarFile(null);
    if (editAvatarPreview) URL.revokeObjectURL(editAvatarPreview);
    setEditAvatarPreview(null);

    setEditPermissions(
      user.role?.trim() === "مدير النظام"
        ? getRolePermissions("مدير النظام")
        : { ...user.permissions },
    );

  };



  const closeEditUser = () => {
    if (editAvatarPreview) URL.revokeObjectURL(editAvatarPreview);
    setEditAvatarPreview(null);
    setEditAvatarFile(null);
    setEditingUser(null);
  };



  const toggleEditPermission = (key: PermissionKey) => {

    if (!canManageUsers) return;

    if (
      isSystemManager &&
      editingUser?.id === currentUser?.id
    ) {
      alert("مدير النظام يمتلك جميع الصلاحيات ولا يمكن تعطيل صلاحيات حسابه.");
      return;
    }



    if (!isSystemOwner && !isSystemManager && protectedPermissionKeys.has(key)) {

      alert("هذه الصلاحية محمية ولا يمكن للمدير تعديلها.");

      return;

    }



    setEditPermissions((current) => ({

      ...current,

      [key]: !current[key],

    }));

  };



  const changeEditRole = (role: Role) => {

    if (!isSystemOwner && editingUser?.id === currentUser?.id) {

      alert("لا يمكنك تغيير نوع حساب المدير الخاص بك.");

      return;

    }



    if (!isSystemOwner && ["مسؤول النظام", "مدير النظام"].includes(role)) {

      alert("لا يمكن لهذا المستخدم إنشاء مدير نظام أو مسؤول نظام.");

      return;

    }



    setEditRole(role);

    const next = getRolePermissions(role);

    setEditPermissions(next);

  };



  const changeCurrentPassword = async () => {
    if (changingPassword) return;

    const current = currentPassword;
    const next = newCurrentPassword;

    if (!current) {
      alert("يرجى إدخال كلمة المرور الحالية.");
      return;
    }

    if (!next.trim()) {
      alert("يرجى إدخال كلمة المرور الجديدة.");
      return;
    }

    if (next.length < 6) {
      alert("كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف أو أرقام.");
      return;
    }

    // يجب أن تحتوي كلمة المرور الجديدة على حرف أو رقم واحد على الأقل.
    if (!/[\p{L}\p{N}]/u.test(next)) {
      alert("كلمة المرور الجديدة يجب أن تحتوي على حرف أو رقم واحد على الأقل.");
      return;
    }

    setChangingPassword(true);

    try {
      const {
        data: { user: authUser },
        error: authUserError,
      } = await supabase.auth.getUser();

      if (authUserError) throw authUserError;

      const email = authUser?.email?.trim();
      if (!email) {
        throw new Error("تعذر تحديد البريد الإلكتروني للحساب الحالي.");
      }

      // التحقق من كلمة المرور الحالية فعليًا عبر Supabase Auth.
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password: current,
      });

      if (verifyError) {
        alert("كلمة المرور الحالية غير صحيحة.");
        return;
      }

      // كلمة المرور تُحفظ في Supabase Auth وليس داخل جدول users.
      const { error: updateError } = await supabase.auth.updateUser({
        password: next,
      });

      if (updateError) throw updateError;

      setCurrentPassword("");
      setNewCurrentPassword("");
      alert("تم تغيير كلمة المرور بنجاح.");
    } catch (error) {
      console.error("خطأ في تغيير كلمة المرور:", error);
      alert(
        `تعذر تغيير كلمة المرور:\n${
          error instanceof Error ? error.message : "خطأ غير معروف"
        }`,
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const saveEditedUser = async () => {

    if (!editingUser) return;



    if (!canManageUsers) {

      alert("ليس لديك صلاحية تعديل المستخدمين.");

      return;

    }



    if (editingUser.email.trim().toLowerCase() === SYSTEM_OWNER_EMAIL.toLowerCase() && !isSystemOwner) {

      alert("لا يمكن تعديل مسؤول النظام الأساسي.");

      return;

    }



    if (!isSystemOwner && ["مسؤول النظام", "مدير النظام"].includes(editRole)) {

      alert("لا يمكن لهذا المستخدم إنشاء مدير نظام أو مسؤول نظام.");

      return;

    }



    if (!editName.trim() || !editEmail.trim()) {

      alert("يرجى استكمال اسم المستخدم والبريد الإلكتروني.");

      return;

    }



    setSavingUsers(true);



    try {

      const { data, error } = await supabase

        .from("users")

        .update({

          name: editName.trim(),

          email: editEmail.trim(),

          role: editRole,

          active: editActive,

          permissions: {

            ...editPermissions,

          },

        })

        .eq("id", editingUser.id)

        .select("id, name, email, role, active, avatar_url, permissions")
        .single();



      if (error) throw error;



      
      let updatedAvatarUrl = data.avatar_url ? String(data.avatar_url) : null;
      if (editAvatarFile) {
        updatedAvatarUrl = await uploadUserAvatar(editingUser.id, editAvatarFile);
        const { error: avatarUpdateError } = await supabase.from("users").update({ avatar_url: updatedAvatarUrl }).eq("id", editingUser.id);
        if (avatarUpdateError) throw avatarUpdateError;
      }

      const updatedUser: UserRow = {

        id: Number(data.id),

        name: String(data.name ?? ""),

        email: String(data.email ?? ""),

        role: data.role as Role,

        active: Boolean(data.active),
        avatar_url: updatedAvatarUrl,

        permissions: normalizePermissions(data.permissions),

      };



      setUsers((current) =>

        current.map((user) =>

          user.id === editingUser.id ? updatedUser : user,

        ),

      );



      setEditingUser(null);

      alert("تم حفظ تعديلات المستخدم في قاعدة البيانات.");

    } catch (error) {

      console.error("خطأ في تعديل المستخدم:", error);

      alert(

        `تعذر حفظ تعديلات المستخدم:\n${

          error instanceof Error ? error.message : "خطأ غير معروف"

        }`,

      );

    } finally {

      setSavingUsers(false);

    }

  };



  return (

    <div

      dir="rtl"

      className="min-h-full w-full overflow-x-hidden px-2 py-4 sm:px-3 lg:px-4"

    >

      <div className="w-full max-w-none">

        {/* Page Header */}

        <section

          className={`${glass} relative mb-4 overflow-hidden rounded-[28px] border-sky-300/15 bg-gradient-to-br from-[#0b4036]/85 via-[#082d29]/90 to-[#071e29]/95] p-5 sm:p-6`}

        >

          <div className="absolute -left-20 -top-24 h-60 w-60 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="absolute -bottom-28 right-20 h-60 w-60 rounded-full bg-sky-400/10 blur-3xl" />



          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-4">

              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-amber-300/30 bg-amber-400/10 text-amber-100 shadow-lg">

                <UsersRound size={34} />

              </div>

              <div>

                <div className="mb-1 text-xs font-semibold text-cyan-200/70">

                  الرئيسية / المستخدمين والصلاحيات

                </div>

                <h1 className="text-2xl font-black text-white sm:text-3xl">

                  المستخدمين والصلاحيات

                </h1>

                <p className="mt-1 text-sm text-slate-300">

                  إدارة مستخدمي النظام وتحديد الصلاحيات والوصول إلى الأقسام

                  المختلفة.

                </p>

              </div>

            </div>



            <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3 text-center">

              <div className="text-xs text-slate-400">إجمالي المستخدمين</div>

              <div className="text-2xl font-black text-white">

                {roleCounts.total}

              </div>

            </div>

          </div>

        </section>



        {/* Statistics */}

        <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-6">

          <StatCard

            label="إجمالي المستخدمين"

            value={roleCounts.total}

            icon={UsersRound}

            tone="sky"

          />

          <StatCard

            label="مدير"

            value={roleCounts.مدير}

            icon={Settings}

            tone="emerald"

          />

          <StatCard

            label="مشرف"

            value={roleCounts.مشرف}

            icon={ShieldCheck}

            tone="gold"

          />

          <StatCard

            label="موظف"

            value={roleCounts.موظف}

            icon={UserCog}

            tone="blue"

          />

          <StatCard

            label="محاسب"

            value={roleCounts.محاسب}

            icon={Calculator}

            tone="violet"

          />

          <StatCard

            label="غير مفعل"

            value={roleCounts.inactive}

            icon={LockKeyhole}

            tone="red"

          />

        </section>



        {/* Add User + Roles */}

        {canManageUsers && (

        <section className="mb-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">

          <div className={`${glass} rounded-[26px] p-4 sm:p-5`}>

            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-300/25 bg-emerald-400/10 text-emerald-200">

                  <Plus size={25} />

                </div>

                <div>

                  <h2 className="text-xl font-black text-white">

                    إضافة مستخدم جديد

                  </h2>

                  <p className="text-xs text-slate-400">

                    إنشاء حساب مستخدم جديد وتحديد الصلاحيات

                  </p>

                </div>

              </div>

            </div>



            <div className="grid gap-4 lg:grid-cols-[145px_minmax(0,1fr)]">

              <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/10 p-4">

                <div className="h-24 w-24 overflow-hidden rounded-full border border-slate-300/25 bg-slate-300/10 text-slate-300">
                  {newAvatarPreview ? (
                    <img src={newAvatarPreview} alt={newName || "صورة المستخدم"} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center"><UsersRound size={45} /></div>
                  )}
                </div>
                <input ref={newAvatarInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => { handleNewAvatarChange(event.target.files?.[0]); event.target.value = ""; }} />
                <button type="button" onClick={() => newAvatarInputRef.current?.click()} className="mt-3 flex items-center gap-2 rounded-xl border border-sky-300/20 bg-sky-400/10 px-3 py-2 text-xs font-bold text-sky-100 transition hover:bg-sky-400/20">
                  <Camera size={15} /> {newAvatarPreview ? "تغيير الصورة" : "رفع صورة"}
                </button>
                <span className="mt-2 text-center text-[10px] text-slate-500">JPG / PNG — بحد أقصى 5MB</span>

              </div>



              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

                <Field

                  label="الاسم الكامل"

                  required

                  placeholder="مثال: أحمد محمد"

                  value={newName}

                  onChange={setNewName}

                  autoComplete="new-username"

                />

                <Field

                  label="البريد الإلكتروني"

                  required

                  placeholder=""

                  value={newEmail}

                  onChange={setNewEmail}

                  type="email"

                  autoComplete="off"

                  name="user-email-create"

                  readOnly={!newEmailFocused}

                  onFocus={() => {

                    setNewEmailFocused(true);

                    setNewEmail("");

                  }}

                />

                <SelectField

                  label="نوع المستخدم"

                  value={newRole}

                  onChange={(value) => setNewRole(value as Role)}

                  options={Object.keys(roleMeta) as Role[]}

                />

                <Field

                  label="كلمة المرور"

                  required

                  placeholder="••••••••••"

                  value={newPassword}

                  onChange={setNewPassword}

                  type="password"

                  autoComplete="new-password"

                />

                <Field

                  label="تأكيد كلمة المرور"

                  required

                  placeholder="••••••••••"

                  value={confirmPassword}

                  onChange={setConfirmPassword}

                  type="password"

                  autoComplete="new-password"

                />

                <SelectField

                  label="حالة الحساب"

                  value="نشط"

                  onChange={() => undefined}

                  options={["نشط", "غير نشط"]}

                />

              </div>

            </div>



            <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-4">

              <div className="mb-3 flex items-center justify-between">

                <div>

                  <h3 className="font-black text-white">صلاحيات المستخدم الجديد</h3>

                  <p className="text-xs text-slate-400">

                    حدد الأقسام التي يمكن للمستخدم الوصول إليها

                  </p>

                </div>

                <KeyRound className="text-amber-200" size={20} />

              </div>



              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">

                {permissionGroups.map((group) => (

                  <PermissionGroupCard

                    key={group.key}

                    groupKey={group.key}

                    title={group.title}

                    icon={group.icon}

                    permissions={group.children}

                    sections={group.sections}

                    values={selectedPermissions}

                    onChange={togglePermission}

                    disabledKeys={!isSystemOwner && !isSystemManager ? protectedPermissionKeys : undefined}

                  />

                ))}

              </div>

            </div>



            <button

              type="button"

              onClick={() => void addUser()}

              disabled={savingUsers}

              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-amber-300/50 bg-gradient-to-r from-amber-500/20 to-emerald-500/20 text-sm font-black text-white shadow-lg transition hover:from-amber-500/30 hover:to-emerald-500/30"

            >

              <UserPlus size={19} />

              إضافة المستخدم

            </button>

          </div>



          <div className={`${glass} rounded-[26px] p-4 sm:p-5`}>

            <div className="mb-3 flex items-center justify-between">

              <div>

                <h2 className="text-lg font-black text-white">نوع المستخدم</h2>

                <p className="text-xs text-slate-400">

                  التصنيفات المتاحة داخل النظام

                </p>

              </div>

              <UserCog className="text-amber-200" size={23} />

            </div>



            <div className="space-y-1">

              {(Object.keys(roleMeta) as Role[]).map((role) => {

                const meta = roleMeta[role];

                const Icon = meta.icon;



                return (

                  <div

                    key={role}

                    className="flex items-center gap-3 border-b border-white/[0.07] px-2 py-2.5 last:border-0"

                  >

                    <div

                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${meta.tone}`}

                    >

                      <Icon size={18} />

                    </div>

                    <div className="min-w-0">

                      <div className="text-sm font-bold text-white">{role}</div>

                      <div className="truncate text-[10px] text-slate-500">

                        {meta.description}

                      </div>

                    </div>

                  </div>

                );

              })}

            </div>

          </div>

        </section>

        )}



        {/* Current Password */}

        <section className={`${glass} mb-5 rounded-[26px] p-4 sm:p-5`}>

          <div className="mb-4 flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-300/20 bg-violet-400/10 text-violet-200">

              <LockKeyhole size={23} />

            </div>

            <div>

              <h2 className="text-lg font-black text-white">

                تعديل كلمة مرور المستخدم الحالي

              </h2>

              <p className="text-xs text-slate-400">

                استخدم هذه الخانة لتحديث كلمة مرور حسابك الحالي

              </p>

            </div>

          </div>



          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">

            <Field

              label="كلمة المرور الحالية"

              placeholder="••••••••••"

              value={currentPassword}

              onChange={setCurrentPassword}

              type="password"

              autoComplete="current-password"

            />

            <Field

              label="كلمة المرور الجديدة"

              placeholder="••••••••••"

              value={newCurrentPassword}

              onChange={setNewCurrentPassword}

              type="password"

              autoComplete="new-password"

            />

            <button

              type="button"

              onClick={() => void changeCurrentPassword()}

              disabled={changingPassword}

              className="mt-auto flex h-11 items-center justify-center gap-2 rounded-xl border border-violet-300/30 bg-violet-400/10 px-6 text-sm font-black text-violet-100 transition hover:bg-violet-400/20 disabled:cursor-not-allowed disabled:opacity-50"

            >

              <Save size={17} />

              {changingPassword ? "جاري الحفظ..." : "حفظ التغيير"}

            </button>

          </div>

        </section>



        {/* Users + Permission Matrix */}

        <section className={`${glass} overflow-hidden rounded-[26px]`}>

          <div className="border-b border-white/10 p-4 sm:p-5">

            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-300/25 bg-amber-400/10 text-amber-200">

                  <Settings size={23} />

                </div>

                <div>

                  <h2 className="text-xl font-black text-white">

                    المستخدمين والصلاحيات

                  </h2>

                  <p className="text-xs text-slate-400">

                    إدارة المستخدمين وتحديد صلاحيات الوصول لكل جزء من النظام

                  </p>

                </div>

              </div>



              <button

                type="button"

                disabled={savingUsers || loadingUsers}

                onClick={() => void loadUsers()}

                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-amber-300/50 bg-amber-400/10 px-5 text-sm font-black text-white transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"

              >

                <Save size={17} />

                تحديث البيانات

              </button>

            </div>



            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(240px,1fr)_190px_190px]">

              <div className="relative">

                <Search

                  size={18}

                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"

                />

                <input

                  value={search}

                  onChange={(e) => setSearch(e.target.value)}

                  placeholder="البحث عن مستخدم..."

                  className="h-11 w-full rounded-xl border border-white/10 bg-black/10 pr-10 pl-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-amber-300/40"

                />

              </div>



              <FilterSelect

                value={roleFilter}

                onChange={(value) => setRoleFilter(value as "الكل" | Role)}

                options={["الكل", ...(Object.keys(roleMeta) as Role[])]}

              />



              <FilterSelect

                value={statusFilter}

                onChange={(value) =>

                  setStatusFilter(value as "الكل" | "نشط" | "غير نشط")

                }

                options={["الكل", "نشط", "غير نشط"]}

              />

            </div>

          </div>



          {databaseError && (

            <div className="mx-4 mt-4 rounded-xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">

              تعذر تحميل المستخدمين من قاعدة البيانات: {databaseError}

            </div>

          )}



          {loadingUsers && (

            <div className="px-5 py-6 text-center text-sm text-slate-400">

              جاري تحميل المستخدمين من قاعدة البيانات...

            </div>

          )}



          <div className="overflow-x-auto">

            <table className="min-w-[1500px] w-full border-collapse text-sm">

              <thead>

                <tr className="bg-white/[0.045] text-slate-200">

                  <th

                    rowSpan={2}

                    className="border border-white/10 px-3 py-3 text-center"

                  >

                    #

                  </th>

                  <th

                    rowSpan={2}

                    className="border border-white/10 px-4 py-3 text-right"

                  >

                    المستخدم

                  </th>

                  <th

                    rowSpan={2}

                    className="border border-white/10 px-4 py-3 text-right"

                  >

                    البريد الإلكتروني

                  </th>

                  <th

                    rowSpan={2}

                    className="border border-white/10 px-4 py-3 text-center"

                  >

                    نوع المستخدم

                  </th>

                  <th

                    rowSpan={2}

                    className="border border-white/10 px-3 py-3 text-center"

                  >

                    حالة الحساب

                  </th>



                  {permissionGroups.map((group) => (

                    <th

                      key={group.key}

                      colSpan={4}

                      className="border border-white/10 px-2 py-2 text-center text-amber-100"

                    >

                      <button
                        type="button"
                        onClick={() => setOverviewGroupKey(group.key)}
                        className="group mx-auto flex w-full min-w-[150px] flex-col items-center justify-center gap-1.5 rounded-xl border border-transparent px-2 py-1.5 transition hover:border-amber-300/25 hover:bg-amber-400/5"
                        title={`عرض كل صلاحيات ${group.title}`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <group.icon size={15} />
                          <span className="font-black">{group.title}</span>
                        </div>
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-sky-300/20 bg-sky-400/5 text-sky-200" title="عرض">
                            <Eye size={12} />
                          </span>
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-violet-300/20 bg-violet-400/5 text-violet-200" title="تعديل">
                            <Pencil size={12} />
                          </span>
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-emerald-300/20 bg-emerald-400/5 text-emerald-200" title="إضافة">
                            <Plus size={12} />
                          </span>
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-red-300/20 bg-red-400/5 text-red-200" title="حذف">
                            <Trash2 size={12} />
                          </span>
                        </div>
                      </button>

                    </th>

                  ))}



                  <th

                    rowSpan={2}

                    className="border border-white/10 px-3 py-3 text-center"

                  >

                    إجراءات

                  </th>

                </tr>



                <tr className="bg-black/10 text-[11px] text-slate-400">

                  {permissionGroups.flatMap((group) =>

                    [
                      { suffix: "_view", title: "عرض" },
                      { suffix: "_edit", title: "تعديل" },
                      { suffix: "_add", title: "إضافة" },
                      { suffix: "_delete", title: "حذف" },
                    ].map((action) => (

                      <th

                        key={`${group.key}-${action.suffix}`}

                        className="border border-white/10 px-2 py-2 text-center"

                      >

                        {action.title}

                      </th>

                    )),

                  )}

                </tr>

              </thead>



              <tbody>

                {filteredUsers.map((user, index) => {

                  const meta = roleMeta[user.role];

                  const RoleIcon = meta.icon;



                  return (

                    <tr

                      key={user.id}

                      className="transition hover:bg-white/[0.035]"

                    >

                      <td className="border border-white/[0.07] px-3 py-3 text-center text-slate-500">

                        {index + 1}

                      </td>



                      <td className="border border-white/[0.07] px-4 py-3">

                        <div className="flex items-center gap-3">

                          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/[0.05] font-black text-amber-100">
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt={user.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">{user.name.charAt(0)}</div>
                            )}
                          </div>

                          <span className="font-bold text-white">

                            {user.name}

                          </span>

                        </div>

                      </td>



                      <td className="border border-white/[0.07] px-4 py-3 text-slate-300">

                        <div className="flex items-center gap-2">

                          <Mail size={14} className="text-slate-500" />

                          {user.email}

                        </div>

                      </td>



                      <td className="border border-white/[0.07] px-3 py-3">

                        <div

                          className={`mx-auto flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${meta.tone}`}

                        >

                          <RoleIcon size={14} />

                          {user.role}

                        </div>

                      </td>



                      <td className="border border-white/[0.07] px-3 py-3 text-center">

                        <span

                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${

                            user.active

                              ? "bg-emerald-500/15 text-emerald-300"

                              : "bg-red-500/15 text-red-300"

                          }`}

                        >

                          <span

                            className={`h-1.5 w-1.5 rounded-full ${

                              user.active ? "bg-emerald-400" : "bg-red-400"

                            }`}

                          />

                          {user.active ? "نشط" : "غير نشط"}

                        </span>

                      </td>



                      {permissionGroups.flatMap((group) =>

                        ["_view", "_edit", "_add", "_delete"].map((suffix) => {
                          const child = group.children.find((permission) => permission.key === `${group.key}${suffix}`);

                          return (
                            <td

                              key={`${user.id}-${group.key}-${suffix}`}

                              className="border border-white/[0.07] px-2 py-3 text-center"

                            >

                              {child ? (
                                <PermissionBox

                                  checked={user.permissions[child.key]}

                                  onClick={

                                    canManageUsers &&

                                    !(!isSystemOwner && !isSystemManager && protectedPermissionKeys.has(child.key))

                                      ? () => toggleUserPermission(user.id, child.key)

                                      : undefined

                                  }

                                />
                              ) : (
                                <span className="text-[10px] text-slate-700">—</span>
                              )}

                            </td>
                          );
                        }),

                      )}



                      <td className="border border-white/[0.07] px-3 py-3">

                        <div className="flex items-center justify-center gap-1">

                          {canManageUsers && (

                            <>

                              <ActionButton

                                icon={MoreHorizontal}

                                label="المزيد"

                              />

                              <ActionButton

                                icon={Pencil}

                                label="تعديل"

                                onClick={() => openEditUser(user)}

                              />

                              <ActionButton

                                icon={Trash2}

                                label="حذف"

                                danger

                                onClick={() => deleteUser(user)}

                              />

                            </>

                          )}

                        </div>

                      </td>

                    </tr>

                  );

                })}



                {filteredUsers.length === 0 && (

                  <tr>

                    <td

                      colSpan={6 + permissionGroups.reduce((total, group) => total + group.children.length, 0)}

                      className="px-5 py-14 text-center text-slate-500"

                    >

                      لا توجد نتائج مطابقة للبحث أو الفلاتر.

                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>



          <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">

            <span>

              عرض {filteredUsers.length} من أصل {users.length} مستخدم

            </span>

            <div className="flex items-center gap-2">

              <button

                type="button"

                className="rounded-lg border border-white/10 px-3 py-2 transition hover:bg-white/5"

              >

                السابق

              </button>

              <span className="rounded-lg border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-amber-100">

                1

              </span>

              <button

                type="button"

                className="rounded-lg border border-white/10 px-3 py-2 transition hover:bg-white/5"

              >

                التالي

              </button>

            </div>

          </div>

        </section>



        {overviewGroupKey && (() => {
          const group = permissionGroups.find((item) => item.key === overviewGroupKey);
          if (!group) return null;
          const GroupIcon = group.icon;
          const renderOverviewItems = (items: PermissionItem[]) => items.map((permission) => {
            const actionType = permission.key.endsWith("_view")
              ? "عرض"
              : permission.key.endsWith("_add")
                ? "إضافة"
                : permission.key.endsWith("_edit")
                  ? "تعديل"
                  : permission.key.endsWith("_delete")
                    ? "حذف"
                    : "صلاحية";
            const ActionIcon =
              actionType === "عرض" ? Eye
                : actionType === "إضافة" ? Plus
                  : actionType === "تعديل" ? Pencil
                    : actionType === "حذف" ? Trash2 : KeyRound;
            return (
              <div key={permission.key} className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-amber-200">
                    <ActionIcon size={16} />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-black text-white">{permission.title}</div>
                    <div className="mt-0.5 text-[10px] font-bold text-slate-500">{actionType}</div>
                  </div>
                </div>
                <span className="shrink-0 rounded-lg border border-sky-300/20 bg-sky-400/10 px-2.5 py-1 text-[10px] font-black text-sky-200">متاحة للتخصيص</span>
              </div>
            );
          });
          const sectionItems = group.sections?.flatMap((section) => section.children) ?? [];
          const directItems = group.sections ? group.children.filter((item) => !sectionItems.some((sectionItem) => sectionItem.key === item.key)) : group.children;

          return (
            <div
              className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setOverviewGroupKey(null);
              }}
            >
              <div dir="rtl" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-amber-300/20 bg-[#071d19] shadow-2xl shadow-black/60">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#071d19]/95 px-5 py-4 backdrop-blur-xl">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-400/10 text-amber-200">
                      <GroupIcon size={20} />
                    </span>
                    <div>
                      <h3 className="text-base font-black text-white">صلاحيات {group.title}</h3>
                      <p className="mt-1 text-[11px] font-bold text-slate-400">جميع الصلاحيات الموجودة داخل هذا القسم مرتبة حسب الأجزاء</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setOverviewGroupKey(null)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 transition hover:bg-red-400/10 hover:text-red-200" aria-label="إغلاق">
                    <X size={17} />
                  </button>
                </div>

                <div className="space-y-4 p-5">
                  {directItems.length > 0 && (
                    <div className="rounded-2xl border border-amber-300/15 bg-white/[0.02] p-3">
                      {group.sections && (
                        <div className="mb-3 flex items-center gap-2 border-b border-white/[0.07] pb-2">
                          <GroupIcon size={15} className="text-amber-200" />
                          <span className="text-xs font-black text-white">الصلاحيات الأساسية</span>
                        </div>
                      )}
                      <div className="grid gap-2 sm:grid-cols-2">{renderOverviewItems(directItems)}</div>
                    </div>
                  )}

                  {group.sections?.map((section) => {
                    const SectionIcon = section.icon;
                    return (
                      <div key={section.key} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                        <div className="mb-3 flex items-center justify-between gap-3 border-b border-white/[0.07] pb-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-300/20 bg-amber-400/10 text-amber-200"><SectionIcon size={15} /></span>
                            <span className="text-sm font-black text-white">{section.title}</span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-500">{section.children.length} صلاحيات</span>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">{renderOverviewItems(section.children)}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between border-t border-white/10 px-5 py-3">
                  <span className="text-[11px] font-bold text-slate-500">إجمالي الصلاحيات: {group.children.length}</span>
                  <button type="button" onClick={() => setOverviewGroupKey(null)} className="rounded-xl border border-amber-300/30 bg-amber-400/10 px-5 py-2 text-xs font-black text-amber-100 transition hover:bg-amber-400/20">إغلاق</button>
                </div>
              </div>
            </div>
          );
        })()}

        {deleteUserTarget && (

          <div

            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"

            onMouseDown={(event) => {

              if (event.target === event.currentTarget) {

                setDeleteUserTarget(null);

              }

            }}

          >

            <div

              dir="rtl"

              className="w-full max-w-md rounded-[24px] border border-red-300/20 bg-gradient-to-br from-[#0b4036] via-[#082d29] to-[#071e29] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.55)]"

            >

              <div className="flex items-start gap-4">

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-300/25 bg-red-400/10 text-red-200">

                  <Trash2 size={22} />

                </div>



                <div className="min-w-0">

                  <h2 className="text-lg font-black text-white">

                    تأكيد حذف المستخدم

                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-300">

                    هل أنت متأكد من حذف المستخدم

                    <span className="mx-1 font-black text-white">

                      {deleteUserTarget.name}

                    </span>

                    ؟

                  </p>

                  <p className="mt-1 text-xs text-red-300/80">

                    سيتم حذف المستخدم من قاعدة البيانات وإزالة صورته إن وُجدت، ولا يمكن التراجع عن هذا الإجراء بعد تأكيد الحذف.

                  </p>

                </div>

              </div>



              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">

                <button

                  type="button"

                  onClick={() => setDeleteUserTarget(null)}

                  className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-6 text-sm font-black text-slate-200 transition hover:bg-white/[0.07]"

                >

                  <X size={17} />

                  إلغاء

                </button>



                <button

                  type="button"

                  onClick={() => void confirmDeleteUser()}

                  disabled={savingUsers}

                  className="flex h-11 items-center justify-center gap-2 rounded-xl border border-red-300/30 bg-red-500/15 px-6 text-sm font-black text-red-100 transition hover:bg-red-500/25"

                >

                  <Trash2 size={17} />

                  حذف المستخدم

                </button>

              </div>

            </div>

          </div>

        )}



        {editingUser && (

          <div

            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-6"

            onMouseDown={(event) => {

              if (event.target === event.currentTarget) {

                closeEditUser();

              }

            }}

          >

            <div

              dir="rtl"

              className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[28px] border border-amber-300/20 bg-gradient-to-br from-[#0b4036] via-[#082d29] to-[#071e29] p-4 shadow-[0_30px_100px_rgba(0,0,0,0.55)] sm:p-6"

            >

              <div className="mb-5 flex items-start justify-between gap-4 border-b border-white/10 pb-4">

                <div className="flex items-center gap-3">

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-400/10 text-amber-100">

                    <Pencil size={22} />

                  </div>

                  <div>

                    <h2 className="text-xl font-black text-white sm:text-2xl">

                      تعديل بيانات المستخدم

                    </h2>

                    <p className="mt-1 text-xs text-slate-400">

                      تعديل بيانات وصلاحيات المستخدم: {editingUser.name}

                    </p>

                  </div>

                </div>



                <button

                  type="button"

                  onClick={closeEditUser}

                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 transition hover:bg-red-400/10 hover:text-red-200"

                  title="إغلاق"

                >

                  <X size={19} />

                </button>

              </div>



              <div className="grid gap-4 lg:grid-cols-[145px_minmax(0,1fr)]">

                <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/10 p-4">

                  <div className="h-24 w-24 overflow-hidden rounded-full border border-amber-300/25 bg-amber-400/10 text-amber-100">
                    {editAvatarPreview || editingUser.avatar_url ? (
                      <img src={editAvatarPreview || editingUser.avatar_url || ""} alt={editName || "صورة المستخدم"} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center"><span className="text-3xl font-black">{editName.trim().charAt(0) || "؟"}</span></div>
                    )}
                  </div>
                  <input ref={editAvatarInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => { handleEditAvatarChange(event.target.files?.[0]); event.target.value = ""; }} />
                  <button type="button" onClick={() => editAvatarInputRef.current?.click()} className="mt-3 flex items-center gap-2 rounded-xl border border-sky-300/20 bg-sky-400/10 px-3 py-2 text-xs font-bold text-sky-100 transition hover:bg-sky-400/20">
                    <Camera size={15} /> {editAvatarPreview || editingUser.avatar_url ? "تغيير الصورة" : "رفع صورة"}
                  </button>
                  <span className="mt-2 text-center text-[10px] text-slate-500">JPG / PNG — بحد أقصى 5MB</span>

                </div>



                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

                  <Field

                    label="الاسم الكامل"

                    required

                    placeholder=""

                    value={editName}

                    onChange={setEditName}

                    autoComplete="off"

                    name="edit-user-name"

                  />

                  <Field

                    label="البريد الإلكتروني"

                    required

                    placeholder=""

                    value={editEmail}

                    onChange={setEditEmail}

                    type="email"

                    autoComplete="off"

                    name="edit-user-email"

                  />

                  <SelectField

                    label="نوع المستخدم"

                    value={editRole}

                    onChange={(value) => changeEditRole(value as Role)}

                    options={

                      (isSystemOwner

                        ? Object.keys(roleMeta)

                        : Object.keys(roleMeta).filter((role) => role !== "مسؤول النظام")) as Role[]

                    }

                  />

                  <SelectField

                    label="حالة الحساب"

                    value={editActive ? "نشط" : "غير نشط"}

                    onChange={(value) => setEditActive(value === "نشط")}

                    options={["نشط", "غير نشط"]}

                  />

                </div>

              </div>



              <div className="mt-5 rounded-2xl border border-white/10 bg-black/10 p-4">

                <div className="mb-3 flex items-center justify-between gap-3">

                  <div>

                    <h3 className="font-black text-white">صلاحيات المستخدم</h3>

                    <p className="text-xs text-slate-400">

                      يمكنك تعديل الصلاحيات يدويًا بعد تحديد نوع المستخدم.

                    </p>

                  </div>

                  <KeyRound className="text-amber-200" size={20} />

                </div>



                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">

                  {permissionGroups.map((group) => (

                    <PermissionGroupCard

                      key={`edit-${group.key}`}

                      groupKey={group.key}

                      title={group.title}

                      icon={group.icon}

                      permissions={group.children}

                      sections={group.sections}

                      values={editPermissions}

                      onChange={toggleEditPermission}

                      disabledKeys={!isSystemOwner && !isSystemManager ? protectedPermissionKeys : undefined}

                    />

                  ))}

                </div>

              </div>



              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                <button

                  type="button"

                  onClick={closeEditUser}

                  className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-6 text-sm font-black text-slate-200 transition hover:bg-white/[0.07]"

                >

                  <X size={17} />

                  إلغاء

                </button>

                <button

                  type="button"

                  onClick={saveEditedUser}

                  className="flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-300/40 bg-gradient-to-r from-emerald-500/20 to-amber-500/20 px-7 text-sm font-black text-white shadow-lg transition hover:from-emerald-500/30 hover:to-amber-500/30"

                >

                  <Save size={17} />

                  حفظ التعديلات

                </button>

              </div>

            </div>

          </div>

        )}

      </div>

    </div>

  );

}



function StatCard({

  label,

  value,

  icon: Icon,

  tone,

}: {

  label: string;

  value: number;

  icon: typeof UsersRound;

  tone: "sky" | "emerald" | "gold" | "blue" | "violet" | "red";

}) {

  const tones = {

    sky: "border-sky-300/20 bg-sky-400/[0.06] text-sky-200",

    emerald: "border-emerald-300/20 bg-emerald-400/[0.06] text-emerald-200",

    gold: "border-amber-300/20 bg-amber-400/[0.06] text-amber-200",

    blue: "border-blue-300/20 bg-blue-400/[0.06] text-blue-200",

    violet: "border-violet-300/20 bg-violet-400/[0.06] text-violet-200",

    red: "border-red-300/20 bg-red-400/[0.06] text-red-200",

  };



  return (

    <div

      className={`rounded-2xl border p-4 shadow-lg backdrop-blur-xl ${tones[tone]}`}

    >

      <div className="flex items-center justify-between gap-2">

        <div>

          <div className="text-[11px] font-semibold text-slate-400">{label}</div>

          <div className="mt-1 text-2xl font-black text-white">{value}</div>

        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-current/20 bg-black/10">

          <Icon size={22} />

        </div>

      </div>

    </div>

  );

}



function Field({

  label,

  value,

  onChange,

  placeholder,

  type = "text",

  required = false,

  autoComplete = "off",

  name,

  readOnly = false,

  onFocus,

}: {

  label: string;

  value: string;

  onChange: (value: string) => void;

  placeholder: string;

  type?: string;

  required?: boolean;

  autoComplete?: string;

  name?: string;

  readOnly?: boolean;

  onFocus?: () => void;

}) {

  return (

    <label className="block">

      <span className="mb-1.5 block text-xs font-bold text-slate-300">

        {label}

        {required && <span className="mr-1 text-red-400">*</span>}

      </span>

      <input

        type={type}

        value={value}

        onChange={(e) => onChange(e.target.value)}

        placeholder={placeholder}

        autoComplete={autoComplete}

        name={name ?? "user-field"}

        readOnly={readOnly}

        onFocus={onFocus}

        className="h-11 w-full rounded-xl border border-white/10 bg-black/10 px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-300/40 focus:bg-white/[0.04]"

      />

    </label>

  );

}



function SelectField({

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

    <label className="block">

      <span className="mb-1.5 block text-xs font-bold text-slate-300">{label}</span>

      <div className="relative">

        <select

          value={value}

          onChange={(e) => onChange(e.target.value)}

          className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-[#082d29] px-3 pl-9 text-sm text-white outline-none focus:border-amber-300/40"

        >

          {options.map((option) => (

            <option key={option} value={option} className="bg-[#082d29]">

              {option}

            </option>

          ))}

        </select>

        <ChevronDown

          size={16}

          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"

        />

      </div>

    </label>

  );

}



function FilterSelect({

  value,

  onChange,

  options,

}: {

  value: string;

  onChange: (value: string) => void;

  options: string[];

}) {

  return (

    <div className="relative">

      <select

        value={value}

        onChange={(e) => onChange(e.target.value)}

        className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-black/10 px-3 pl-9 text-sm text-white outline-none focus:border-amber-300/40"

      >

        {options.map((option) => (

          <option key={option} value={option} className="bg-[#082d29]">

            {option === "الكل" ? "جميع الخيارات" : option}

          </option>

        ))}

      </select>

      <ChevronDown

        size={16}

        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"

      />

    </div>

  );

}



function PermissionGroupCard({
  groupKey,
  title,
  icon: Icon,
  permissions,
  sections,
  values,
  onChange,
  disabledKeys,
}: {
  groupKey: string;
  title: string;
  icon: typeof LayoutDashboard;
  permissions: PermissionItem[];
  sections?: PermissionSection[];
  values: Record<PermissionKey, boolean>;
  onChange: (key: PermissionKey) => void;
  disabledKeys?: Set<PermissionKey>;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const actionKeys: Record<"view" | "add" | "edit" | "delete", PermissionKey | undefined> = {
    view: permissions.find((permission) => permission.key.endsWith("_view"))?.key,
    add: permissions.find((permission) => permission.key.endsWith("_add"))?.key,
    edit: permissions.find((permission) => permission.key.endsWith("_edit"))?.key,
    delete: permissions.find((permission) => permission.key.endsWith("_delete"))?.key,
  };

  const actions = [
    { type: "view" as const, label: "عرض", icon: Eye, tone: "text-sky-200" },
    { type: "edit" as const, label: "تعديل", icon: Pencil, tone: "text-violet-200" },
    { type: "add" as const, label: "إضافة", icon: Plus, tone: "text-emerald-200" },
    { type: "delete" as const, label: "حذف", icon: Trash2, tone: "text-red-300" },
  ];

  const enabledCount = permissions.filter((permission) => values[permission.key]).length;
  const renderPermissionButton = (permission: PermissionItem) => {
    const disabled = disabledKeys?.has(permission.key) ?? false;
    const checked = values[permission.key];
    return (
      <button
        key={permission.key}
        type="button"
        disabled={disabled}
        onClick={() => onChange(permission.key)}
        className={`flex min-h-14 items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-right transition ${
          checked ? "border-emerald-300/30 bg-emerald-400/10" : "border-white/10 bg-black/10 hover:bg-white/[0.04]"
        } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
      >
        <span className="flex min-w-0 items-center gap-3">
          <PermissionBox checked={checked} />
          <span className="text-xs font-black text-slate-200">{permission.title}</span>
        </span>
        <span className={`text-[10px] font-black ${checked ? "text-emerald-200" : "text-slate-500"}`}>
          {checked ? "مفعلة" : "غير مفعلة"}
        </span>
      </button>
    );
  };

  return (
    <>
      <div className="rounded-2xl border border-white/10 bg-black/10 p-3 transition hover:border-amber-300/20 hover:bg-white/[0.025]">
        <button type="button" onClick={() => setIsOpen(true)} className="mb-3 flex w-full items-center justify-between gap-3 text-right" title={`عرض صلاحيات ${title}`}>
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-400/10 text-amber-200"><Icon size={17} /></span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-black text-white">{title}</span>
              <span className="mt-0.5 block text-[10px] font-bold text-slate-500">{enabledCount} من {permissions.length} مفعلة · اضغط للتفاصيل</span>
            </span>
          </div>
          <ChevronDown size={15} className="shrink-0 -rotate-90 text-slate-500" />
        </button>

        <div className="grid grid-cols-4 gap-1.5 border-t border-white/[0.07] pt-3">
          {actions.map((action) => {
            const key = actionKeys[action.type];
            const disabled = !key || disabledKeys?.has(key) || false;
            const checked = key ? values[key] : false;
            const ActionIcon = action.icon;
            return (
              <button key={action.type} type="button" disabled={disabled} title={key ? `${action.label} ${checked ? "مفعلة" : "غير مفعلة"}` : `لا توجد صلاحية ${action.label}`} onClick={() => key && onChange(key)} className={`flex h-10 items-center justify-center rounded-xl border transition ${checked ? "border-emerald-300/30 bg-emerald-400/10 text-white" : "border-white/10 bg-black/10 text-slate-500 hover:bg-white/[0.04]"} ${disabled ? "cursor-not-allowed opacity-35" : ""}`}>
                <ActionIcon size={16} className={checked ? "text-emerald-200" : action.tone} />
              </button>
            );
          })}
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}>
          <div dir="rtl" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-amber-300/20 bg-[#071d19] shadow-2xl shadow-black/50">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#071d19]/95 px-5 py-4 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-400/10 text-amber-200"><Icon size={19} /></span>
                <div>
                  <h3 className="text-base font-black text-white">صلاحيات {title}</h3>
                  <p className="mt-0.5 text-[11px] font-bold text-slate-400">حدد الصلاحيات المطلوبة لهذا القسم</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 transition hover:bg-red-400/10 hover:text-red-200" aria-label="إغلاق"><X size={17} /></button>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              {sections && sections.length > 0 && (
                <div className="rounded-2xl border border-amber-300/15 bg-white/[0.02] p-3">
                  <div className="mb-3 flex items-center gap-2 border-b border-white/[0.07] pb-2">
                    <Icon size={15} className="text-amber-200" />
                    <span className="text-xs font-black text-white">الصلاحيات الأساسية</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">{permissions.filter((item) => !sections.some((section) => section.children.some((child) => child.key === item.key))).map(renderPermissionButton)}</div>
                </div>
              )}

              {sections?.map((section) => {
                const SectionIcon = section.icon;
                return (
                  <div key={section.key} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                    <div className="mb-3 flex items-center justify-between gap-3 border-b border-white/[0.07] pb-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-300/20 bg-amber-400/10 text-amber-200"><SectionIcon size={15} /></span>
                        <span className="text-sm font-black text-white">{section.title}</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">{section.children.length} صلاحيات</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">{section.children.map(renderPermissionButton)}</div>
                  </div>
                );
              })}

              {(!sections || sections.length === 0) && (
                <div className="grid gap-2 sm:grid-cols-2">{permissions.map(renderPermissionButton)}</div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-white/10 px-5 py-3">
              <span className="text-[11px] font-bold text-slate-500">القسم: {groupKey} · إجمالي الصلاحيات: {permissions.length}</span>
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-xl border border-amber-300/30 bg-amber-400/10 px-5 py-2 text-xs font-black text-amber-100 transition hover:bg-amber-400/20">تم</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PermissionBox({

  checked,

  onClick,

}: {

  checked: boolean;

  onClick?: () => void;

}) {

  const content = (

    <span

      className={`flex h-5 w-5 items-center justify-center rounded-md border transition ${

        checked

          ? "border-emerald-300/50 bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.25)]"

          : "border-slate-500/50 bg-black/10 text-transparent"

      }`}

    >

      {checked ? <Check size={13} strokeWidth={3} /> : <X size={11} />}

    </span>

  );



  if (!onClick) return content;



  return (

    <button

      type="button"

      onClick={onClick}

      aria-label={checked ? "إلغاء الصلاحية" : "تفعيل الصلاحية"}

      className="mx-auto block"

    >

      {content}

    </button>

  );

}



function ActionButton({

  icon: Icon,

  label,

  danger = false,

  onClick,

}: {

  icon: typeof MoreHorizontal;

  label: string;

  danger?: boolean;

  onClick?: () => void;

}) {

  return (

    <button

      type="button"

      title={label}

      onClick={onClick}

      className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${

        danger

          ? "border-red-300/20 bg-red-400/10 text-red-300 hover:bg-red-400/20"

          : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/10 hover:text-white"

      }`}

    >

      <Icon size={14} />

    </button>

  );

}
