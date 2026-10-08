import * as React from "react";
import { createContext, useContext, useMemo } from "react";
import { supabase } from "./supabase";

/**
 * =========================================================
 * مفاتيح الصلاحيات
 * =========================================================
 *
 * ملاحظة:
 * - الصلاحيات القديمة تم الإبقاء عليها للتوافق مع الكود الحالي.
 * - الصلاحيات الجديدة الخاصة بالعمائر أضيفت بشكل تفصيلي.
 * - مسؤول النظام يحصل تلقائيًا على جميع الصلاحيات.
 */

export type PermissionKey =
  // =======================================================
  // Dashboard
  // =======================================================
  | "dashboard_view"
  | "dashboard_add"
  | "dashboard_edit"
  | "dashboard_delete"
  | "dashboard_add"
  | "dashboard_edit"
  | "dashboard_delete"

  // =======================================================
  // Projects - الصلاحيات الحالية
  // =======================================================
  | "projects_view"
  | "projects_add"
  | "projects_edit"
  | "projects_delete"

  // =======================================================
  // Buildings - الصلاحيات العامة الحالية
  // =======================================================
  | "buildings_view"
  | "buildings_add"
  | "buildings_edit"
  | "buildings_delete"

  // =======================================================
  // Buildings - تفاصيل العمارة
  // =======================================================
  | "building_details_view"
  | "building_details_edit"
  | "building_apartment_add"
  | "building_apartment_edit"
  | "building_apartment_delete"
  | "building_apartment_add"
  | "building_apartment_edit"
  | "building_apartment_delete"

  // =======================================================
  // Apartments
  // =======================================================
  | "apartments_view"
  | "apartments_add"
  | "apartments_edit"
  | "apartments_delete"

  // =======================================================
  // Apartment Types - أنواع الشقق
  // =======================================================
  | "apartment_types_view"
  | "apartment_types_add"
  | "apartment_types_edit"
  | "apartment_types_delete"

  // =======================================================
  // Tenants - المستأجرين
  // =======================================================
  | "tenants_view"
  | "tenants_edit"

  // =======================================================
  // Contracts - العقود
  // =======================================================
  | "contracts_view"
  | "contracts_edit"

  // =======================================================
  // Rentals - الإيجارات
  // =======================================================
  | "rentals_view"
  | "rentals_add"
  | "rentals_edit"
  | "rentals_delete"

  // =======================================================
  // Invoices / Charges - الفواتير والمستحقات
  // =======================================================
  | "invoices_view"
  | "invoices_add"
  | "invoices_edit"
  | "invoices_delete"

  // =======================================================
  // Collections - التحصيلات
  // =======================================================
  | "collections_view"
  | "collections_add"
  | "collections_edit"
  | "collections_delete"

  // =======================================================
  // Apartment Map - خريطة الشقق
  // =======================================================
  | "apartment_map_view"
  | "apartment_map_edit"
  | "apartment_map_rent_edit"
  | "apartment_map_type_edit"

  // =======================================================
  // Reports - التقارير
  // =======================================================
  | "reports_view"
  | "reports_print"
  | "reports_export"
  | "reports_add"
  | "reports_edit"
  | "reports_delete"
  | "reports_add"
  | "reports_edit"
  | "reports_delete"

  // =======================================================
  // Financial - المركز المالي / الصلاحيات الحالية
  // =======================================================
  | "financial_view"
  | "financial_add"
  | "financial_edit"
  | "financial_delete"

  // =======================================================
  // Users
  // =======================================================
  | "users_view"
  | "users_add"
  | "users_edit"
  | "users_delete"

  // =======================================================
  // Settings
  // =======================================================
  | "settings_view"
  | "settings_add"
  | "settings_edit"
  | "settings_delete"
  | "activity_log_view";


/**
 * خريطة الصلاحيات
 */
type PermissionsMap = Record<PermissionKey, boolean>;


/**
 * =========================================================
 * جميع الصلاحيات الموجودة بالنظام
 * =========================================================
 *
 * أي Permission جديد لازم يتضاف هنا أيضًا.
 * لأن هذه القائمة هي التي تحدد الصلاحيات التي يتم
 * تحميلها وتطبيعها من قاعدة البيانات.
 */
export const ALL_PERMISSIONS: PermissionKey[] = [
  // Dashboard
  "dashboard_view",
  "dashboard_add",
  "dashboard_edit",
  "dashboard_delete",
  "dashboard_add",
  "dashboard_edit",
  "dashboard_delete",

  // Projects
  "projects_view",
  "projects_add",
  "projects_edit",
  "projects_delete",

  // Buildings
  "buildings_view",
  "buildings_add",
  "buildings_edit",
  "buildings_delete",

  // Building Details
  "building_details_view",
  "building_details_edit",
  "building_apartment_add",
  "building_apartment_edit",
  "building_apartment_delete",
  "building_apartment_add",
  "building_apartment_edit",
  "building_apartment_delete",

  // Apartments
  "apartments_view",
  "apartments_add",
  "apartments_edit",
  "apartments_delete",

  // Apartment Types
  "apartment_types_view",
  "apartment_types_add",
  "apartment_types_edit",
  "apartment_types_delete",

  // Tenants
  "tenants_view",
  "tenants_edit",

  // Contracts
  "contracts_view",
  "contracts_edit",

  // Rentals
  "rentals_view",
  "rentals_add",
  "rentals_edit",
  "rentals_delete",

  // Invoices / Charges
  "invoices_view",
  "invoices_add",
  "invoices_edit",
  "invoices_delete",

  // Collections
  "collections_view",
  "collections_add",
  "collections_edit",
  "collections_delete",

  // Apartment Map
  "apartment_map_view",
  "apartment_map_edit",
  "apartment_map_rent_edit",
  "apartment_map_type_edit",

  // Reports
  "reports_view",
  "reports_print",
  "reports_export",
  "reports_add",
  "reports_edit",
  "reports_delete",
  "reports_add",
  "reports_edit",
  "reports_delete",

  // Financial
  "financial_view",
  "financial_add",
  "financial_edit",
  "financial_delete",

  // Users
  "users_view",
  "users_add",
  "users_edit",
  "users_delete",

  // Settings
  "settings_view",
  "settings_add",
  "settings_edit",
  "settings_delete",

  "activity_log_view",
];


/**
 * صلاحيات فارغة
 */
const emptyPermissions: PermissionsMap = ALL_PERMISSIONS.reduce(
  (result, permission) => {
    result[permission] = false;
    return result;
  },
  {} as PermissionsMap
);


/**
 * =========================================================
 * Context
 * =========================================================
 */
type PermissionsContextValue = {
  permissions: PermissionsMap;

  loading: boolean;

  can: (permission: PermissionKey) => boolean;

  hasPermission: (permission: PermissionKey) => boolean;

  canAny: (...permissions: PermissionKey[]) => boolean;

  canAll: (...permissions: PermissionKey[]) => boolean;

  isSystemOwner: boolean;

  isSystemManager: boolean;

  refreshPermissions: () => Promise<void>;
};


const PermissionsContext =
  createContext<PermissionsContextValue | null>(null);


/**
 * =========================================================
 * Permissions Provider
 * =========================================================
 */
export function PermissionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [permissions, setPermissions] =
    React.useState<PermissionsMap>(emptyPermissions);

  const [loading, setLoading] =
    React.useState(true);

  const [isSystemOwner, setIsSystemOwner] =
    React.useState(false);

  const [isSystemManager, setIsSystemManager] =
    React.useState(false);


  /**
   * تحميل صلاحيات المستخدم
   */
  const loadPermissions = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();


      /**
       * لا يوجد مستخدم
       */
      if (!user) {
        setPermissions(emptyPermissions);
        setIsSystemOwner(false);
        setIsSystemManager(false);
        return;
      }


      /**
       * تحميل المستخدم من قاعدة البيانات
       *
       * نستخدم auth_user_id أولاً، ثم البريد الإلكتروني كمسار
       * احتياطي؛ بعض الحسابات القديمة تم إنشاؤها قبل ربط auth_user_id.
       */
      let data: any = null;
      let error: any = null;

      ({ data, error } = await supabase
        .from("users")
        .select(
          "email, role, active, permissions, auth_user_id"
        )
        .eq("auth_user_id", user.id)
        .maybeSingle());

      if (!data && !error && user.email) {
        ({ data, error } = await supabase
          .from("users")
          .select(
            "email, role, active, permissions, auth_user_id"
          )
          .eq("email", user.email)
          .maybeSingle());
      }


      /**
       * خطأ في قاعدة البيانات
       */
      if (error) {
        console.error(
          "خطأ في تحميل صلاحيات المستخدم:",
          error
        );

        setPermissions(emptyPermissions);
        setIsSystemOwner(false);
        setIsSystemManager(false);

        return;
      }


      /**
       * المستخدم غير موجود أو غير نشط
       */
      if (!data || data.active === false) {
        setPermissions(emptyPermissions);
        setIsSystemOwner(false);
        setIsSystemManager(false);

        return;
      }


      /**
       * =====================================================
       * مسؤول النظام الأساسي
       * =====================================================
       */
      const owner =
        data.role === "مسؤول النظام" ||
        data.auth_user_id ===
          "efd4f725-d34a-4438-bc15-8ee410c9d5a9";


      const systemManager = data.role === "مدير النظام";

      setIsSystemOwner(owner);
      setIsSystemManager(systemManager);


      /**
       * =====================================================
       * مسؤول النظام + مدير النظام = جميع الصلاحيات
       * مدير النظام له تحكم كامل في النظام، مع بقاء
       * مسؤول النظام الأساسي محميًا من أي تعديل عليه.
       * =====================================================
       */
      if (owner || data.role === "مدير النظام") {
        const fullPermissions =
          ALL_PERMISSIONS.reduce(
            (result, permission) => {
              result[permission] = true;

              return result;
            },
            {} as PermissionsMap
          );

        setPermissions(fullPermissions);

        return;
      }


      /**
       * =====================================================
       * صلاحيات المستخدم العادي
       * =====================================================
       */
      const databasePermissions =
        data.permissions &&
        typeof data.permissions === "object"
          ? (data.permissions as Record<string, unknown>)
          : {};


      /**
       * تحويل صلاحيات قاعدة البيانات
       * إلى PermissionsMap موحد
       */
      const normalized =
        ALL_PERMISSIONS.reduce(
          (result, permission) => {
            result[permission] =
              databasePermissions[permission] === true;

            return result;
          },
          {} as PermissionsMap
        );


      setPermissions(normalized);

    } catch (error) {
      console.error(
        "خطأ غير متوقع في نظام الصلاحيات:",
        error
      );

      setPermissions(emptyPermissions);

      setIsSystemOwner(false);

    } finally {
      setLoading(false);
    }
  };


  /**
   * =========================================================
   * تحميل الصلاحيات عند تشغيل النظام
   * + إعادة تحميلها عند تغيير حالة تسجيل الدخول
   * =========================================================
   */
  React.useEffect(() => {
    void loadPermissions();


    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(() => {
        void loadPermissions();
      });


    return () => {
      subscription.unsubscribe();
    };
  }, []);


  /**
   * =========================================================
   * Context Value
   * =========================================================
   */
  const value =
    useMemo<PermissionsContextValue>(
      () => ({
        permissions,

        loading,

        isSystemOwner,
        isSystemManager,


        /**
         * فحص صلاحية واحدة
         */
        hasPermission: (permission) =>
          isSystemOwner ||
          isSystemManager ||
          permissions[permission] === true,


        /**
         * alias لنفس الفحص
         */
        can: (permission) =>
          isSystemOwner ||
          isSystemManager ||
          permissions[permission] === true,


        /**
         * المستخدم يحتاج واحدة على الأقل
         */
        canAny: (...requiredPermissions) =>
          isSystemOwner ||
          isSystemManager ||
          requiredPermissions.some(
            (permission) =>
              permissions[permission] === true
          ),


        /**
         * المستخدم يحتاج جميع الصلاحيات
         */
        canAll: (...requiredPermissions) =>
          isSystemOwner ||
          isSystemManager ||
          requiredPermissions.every(
            (permission) =>
              permissions[permission] === true
          ),


        /**
         * إعادة تحميل الصلاحيات
         */
        refreshPermissions: loadPermissions,
      }),

      [
        permissions,
        loading,
        isSystemOwner,
        isSystemManager,
      ]
    );


  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}


/**
 * =========================================================
 * Hook
 * =========================================================
 */
export function usePermissions() {
  const context =
    useContext(PermissionsContext);


  if (!context) {
    throw new Error(
      "usePermissions يجب استخدامه داخل PermissionsProvider"
    );
  }


  return context;
}
