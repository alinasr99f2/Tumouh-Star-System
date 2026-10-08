import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

import {
  LogOut,
  Circle,
  ChevronDown,
  ChevronLeft,
  Building2,
  WalletCards,
} from "lucide-react";

import { sidebarMenu } from "../../data/menu";
import { supabase } from "../../utils/supabase";
import { usePermissions, type PermissionKey } from "../../utils/permissions";

type SidebarProps = {
  onLogout: () => void;
};

type CurrentUser = {
  name: string;
  role: string;
  avatar_url: string | null;
};

function Sidebar({ onLogout }: SidebarProps) {
  const location = useLocation();
  const { hasPermission, isSystemOwner } = usePermissions();

  const mainItemPermission = (title: string): PermissionKey | null => {
    switch (title) {
      
      case "لوحة التحكم": return "dashboard_view";
      case "المشاريع": return "projects_view";
      case "العمائر": return "buildings_view";
      case "الشقق المتاحة / المؤجرة": return "apartments_view";
      case "المركز المالي": return "financial_view";
      case "المستخدمين والصلاحيات": return "users_view";
      case "سجل النشاط": return "activity_log_view";
      default: return null;
    }
  };

  const [projectsOpen, setProjectsOpen] = useState(() => {
    return (
      location.pathname === "/projects" ||
      location.pathname.startsWith("/projects/")
    );
  });

  const [buildingsOpen, setBuildingsOpen] = useState(() => {
    return (
      location.pathname === "/buildings" ||
      location.pathname.startsWith("/buildings/")
    );
  });

  const [mobileOpen, setMobileOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState<CurrentUser>({
    name: "المستخدم",
    role: "موظف",
    avatar_url: null,
  });

  type SidebarBuilding = {
    id: number;
    name: string;
  };

  const [buildings, setBuildings] = useState<SidebarBuilding[]>([]);

  useEffect(() => {
    let mounted = true;

    const loadCurrentUser = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (authUser?.email) {
          const { data, error } = await supabase
            .from("users")
            .select("name, role, avatar_url")
            .eq("email", authUser.email)
            .maybeSingle();

          if (!error && data) {
            setCurrentUser({
              name: String(data.name ?? "المستخدم"),
              role: String(data.role ?? "موظف"),
              avatar_url: data.avatar_url ? String(data.avatar_url) : null,
            });
            return;
          }
        }

        const metadata = authUser?.user_metadata;
        setCurrentUser({
          name: String(metadata?.name ?? authUser?.email ?? "المستخدم"),
          role: String(metadata?.role ?? "موظف"),
          avatar_url: null,
        });
      } catch (error) {
        console.error("خطأ في تحميل بيانات المستخدم الحالي:", error);
      }
    };

    void loadCurrentUser();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadBuildings = async () => {
      const { data, error } = await supabase
        .from("buildings")
        .select("id, name")
        .eq("status", "active")
        .order("id", { ascending: true });

      if (cancelled) return;

      if (error) {
        console.error("خطأ في تحميل العمائر للقائمة الجانبية:", error);
        setBuildings([]);
        return;
      }

      const normalizedBuildings = (data ?? [])
        .map((row) => ({
          id: Number(row.id),
          name: String(row.name ?? "").trim(),
        }))
        .filter((building) => Number.isFinite(building.id) && building.name);

      setBuildings(normalizedBuildings);
    };

    void loadBuildings();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (
      location.pathname === "/projects" ||
      location.pathname.startsWith("/projects/")
    ) {
      setProjectsOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (
      location.pathname === "/buildings" ||
      location.pathname.startsWith("/buildings/")
    ) {
      setBuildingsOpen(true);
    }
  }, [location.pathname]);

  const handleMobileNavigate = () => {
    setMobileOpen(false);
  };

  const toggleProjects = () => {
    setProjectsOpen((previous) => !previous);
  };

  const toggleBuildings = () => {
    setBuildingsOpen((previous) => !previous);
  };

  return (
    <>
      {/* ===================================================== */}
      {/* Mobile menu button */}
      {/* ===================================================== */}

      <button
        type="button"
        aria-label="فتح القائمة الجانبية"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen(true)}
        className="
          fixed
          right-3
          top-3
          z-[10001]
          flex
          h-11
          w-11
          items-center
          justify-center
          rounded-xl
          border
          border-[#C49A3A]/35
          bg-[#0B4034]
          text-white
          shadow-lg
          transition
          hover:bg-[#145545]
          lg:hidden
        "
      >
        <span className="text-2xl leading-none">☰</span>
      </button>

      {/* ===================================================== */}
      {/* Mobile overlay */}
      {/* ===================================================== */}

      {mobileOpen && (
        <button
          type="button"
          aria-label="إغلاق القائمة الجانبية"
          onClick={() => setMobileOpen(false)}
          className="
            fixed
            inset-0
            z-[9998]
            bg-black/55
            backdrop-blur-[2px]
            lg:hidden
          "
        />
      )}

      {/* ===================================================== */}
      {/* Sidebar */}
      {/* ===================================================== */}

      <aside
        className={`
          fixed
          inset-y-0
          right-0
          z-[10000]
          flex
          h-screen
          w-[min(290px,88vw)]
          shrink-0
          flex-col
          overflow-hidden
          bg-[#668C7A]
          text-white
          border-l
          border-[#C49A3A]/35
          shadow-2xl
          transition-transform
          duration-300
          ease-out
          lg:static
          lg:w-[290px]
          lg:translate-x-0
          lg:shadow-none
          ${mobileOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* ===================================================== */}
        {/* Mobile close */}
        {/* ===================================================== */}

        <button
          type="button"
          aria-label="إغلاق القائمة الجانبية"
          onClick={() => setMobileOpen(false)}
          className="
            absolute
            left-3
            top-3
            z-[20]
            flex
            h-9
            w-9
            items-center
            justify-center
            rounded-xl
            bg-black/15
            text-white
            transition
            hover:bg-black/25
            lg:hidden
          "
        >
          <span className="text-xl leading-none">×</span>
        </button>

        {/* ===================================================== */}
        {/* Logo */}
        {/* ===================================================== */}

        <div
          className="
            relative
            flex
            items-center
            justify-center
            overflow-hidden
            px-4
            py-3
            pt-12
            lg:pt-3
            border-b
            border-[#C49A3A]/40
            bg-[#668C7A]
            shadow-[0_4px_18px_rgba(0,0,0,0.15)]
          "
        >
          <div
            className="
              pointer-events-none
              absolute
              inset-0
              bg-gradient-to-br
              from-white/10
              via-transparent
              to-[#315F4D]/20
            "
          />

          <img
            src="/aqar-smart-logo.png"
            alt="عقاري سمارت"
            className="
              relative
              z-10
              w-full
              max-w-[255px]
              h-[110px]
              sm:h-[135px]
              object-contain
              drop-shadow-[0_3px_5px_rgba(0,0,0,0.25)]
            "
          />
        </div>

        {/* ===================================================== */}
        {/* User */}
        {/* ===================================================== */}

        <div className="px-4 pt-5">
          <div
            className="
              rounded-3xl
              bg-black/[0.10]
              border
              border-white/20
              backdrop-blur-md
              p-5
              shadow-lg
              shadow-black/10
            "
          >
            <div className="flex items-center gap-4">
              <div
                className="
                  w-14
                  h-14
                  rounded-full
                  bg-gradient-to-br
                  from-[#F6D878]
                  to-[#C49A3A]
                  flex
                  items-center
                  justify-center
                  text-[#062B24]
                  font-bold
                  text-lg
                  shadow-lg
                  shadow-[#C49A3A]/20
                "
              >
                {currentUser.avatar_url ? (
                  <img
                    src={currentUser.avatar_url}
                    alt={currentUser.name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    {currentUser.name.trim().charAt(0) || "م"}
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <h3 className="truncate font-bold text-white">
                  {currentUser.name}
                </h3>

                <p className="mt-1 text-sm text-[#E0EEE7]">
                  {currentUser.role}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Circle
                size={10}
                fill="#22C55E"
                className="text-green-500"
              />

              <span className="text-green-300 text-sm">
                Online
              </span>
            </div>
          </div>
        </div>

        {/* ===================================================== */}
        {/* Menu */}
        {/* ===================================================== */}

        <div
          className="
            flex-1
            overflow-y-auto
            overflow-x-hidden
            mt-6
            px-4
            pb-5
            scrollbar-thin
            scrollbar-thumb-[#C49A3A]/30
          "
        >
          <p
            className="
              text-xs
              text-white/70
              px-3
              mb-4
              uppercase
              tracking-widest
            "
          >
            MAIN MENU
          </p>

          <div className="space-y-3">
            {sidebarMenu
              .filter((item) => item.title !== "المركز المالي")
              .filter((item) => {
                const permission = mainItemPermission(item.title);
                return isSystemOwner || !permission || hasPermission(permission);
              })
              .map((item) => {
              const isProjects = item.title === "المشاريع";
              const isBuildings = item.title === "العمائر";

              return (
                <div
                  key={item.title}
                  className="space-y-2"
                >
                  {/* ================================================= */}
                  {/* Main menu item */}
                  {/* ================================================= */}

                  <div className="relative">
                    <NavLink
                      to={item.path}
                      onClick={handleMobileNavigate}
                      end={item.path === "/"}
                      className={({ isActive }) =>
                        `
                        group
                        relative
                        flex
                        min-h-[64px]
                        items-center
                        gap-4
                        rounded-2xl
                        px-5
                        py-4
                        border
                        transition-all
                        duration-300
                        ease-out
                        ${
                          isActive
                            ? `
                              border-[#F6D878]
                              bg-gradient-to-r
                              from-[#145B46]
                              via-[#0B4537]
                              to-[#073529]
                              text-white
                              font-bold
                              shadow-lg
                              shadow-[#C49A3A]/15
                              before:absolute
                              before:right-[-1px]
                              before:top-2
                              before:bottom-2
                              before:w-[4px]
                              before:rounded-l-full
                              before:bg-[#F6D878]
                            `
                            : `
                              border-transparent
                              bg-black/[0.08]
                              text-white
                              hover:border-[#C49A3A]/55
                              hover:bg-[#557B6A]
                              hover:text-white
                              hover:-translate-x-1
                              hover:shadow-md
                              hover:shadow-black/10
                            `
                        }
                        ${isProjects || isBuildings ? "pl-14" : ""}
                      `
                      }
                    >
                      <item.icon
                        size={25}
                        strokeWidth={1.8}
                        className="
                          shrink-0
                          transition-all
                          duration-300
                          group-hover:scale-110
                          group-hover:text-[#F6D878]
                        "
                      />

                      <span className="flex-1 text-[16px] leading-6">
                        {item.title}
                      </span>
                    </NavLink>

                    {/* ================================================= */}
                    {/* Section Arrow */}
                    {/* ================================================= */}

                    {(isProjects || isBuildings) && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          if (isProjects) {
                            toggleProjects();
                          } else {
                            toggleBuildings();
                          }
                        }}
                        aria-label={
                          isProjects
                            ? projectsOpen
                              ? "إخفاء المشاريع"
                              : "إظهار المشاريع"
                            : buildingsOpen
                            ? "إخفاء العمائر"
                            : "إظهار العمائر"
                        }
                        aria-expanded={isProjects ? projectsOpen : buildingsOpen}
                        className="
                          absolute
                          left-2
                          top-1/2
                          -translate-y-1/2
                          z-20
                          flex
                          h-10
                          w-10
                          items-center
                          justify-center
                          rounded-xl
                          border
                          border-white/10
                          bg-black/10
                          text-white
                          hover:bg-[#C49A3A]/20
                          hover:text-[#F6D878]
                          transition-all
                          duration-200
                          cursor-pointer
                        "
                      >
                        {(isProjects ? projectsOpen : buildingsOpen) ? (
                          <ChevronDown
                            size={20}
                            strokeWidth={2.2}
                          />
                        ) : (
                          <ChevronLeft
                            size={20}
                            strokeWidth={2.2}
                          />
                        )}
                      </button>
                    )}
                  </div>

                  {/* ================================================= */}
                  {/* Projects Submenu */}
                  {/* ================================================= */}

                  {isProjects && projectsOpen && (
                    <div
                      className="
                        mr-5
                        ml-2
                        border-r
                        border-white/25
                        pr-3
                        space-y-2
                      "
                    >
                      {hasPermission("financial_view") && (
                      <NavLink
                        to="/projects/financial"
                        onClick={handleMobileNavigate}
                        className={({ isActive }) =>
                          `
                          group
                          flex
                          min-h-[48px]
                          items-center
                          gap-3
                          rounded-xl
                          border
                          px-4
                          py-3
                          text-sm
                          transition-all
                          duration-300
                          ${
                            isActive
                              ? `
                                border-[#D4AD4D]
                                bg-gradient-to-r
                                from-[#145B46]
                                to-[#073529]
                                text-[#F6D878]
                                font-bold
                                shadow-md
                              `
                              : `
                                border-transparent
                                text-white/90
                                hover:border-[#C49A3A]/35
                                hover:bg-black/[0.10]
                                hover:text-white
                                hover:translate-x-1
                              `
                          }
                        `
                        }
                      >
                        <WalletCards
                          size={19}
                          className="shrink-0 transition-transform duration-300 group-hover:scale-110"
                        />
                        <span className="truncate">المركز المالي</span>
                      </NavLink>
                      )}

                      <NavLink
                        to="/projects/1"
                        onClick={handleMobileNavigate}
                        className={({ isActive }) =>
                          `
                          group
                          flex
                          min-h-[48px]
                          items-center
                          gap-3
                          rounded-xl
                          border
                          px-4
                          py-3
                          text-sm
                          transition-all
                          duration-300
                          ${
                            isActive
                              ? `
                                border-[#D4AD4D]
                                bg-gradient-to-r
                                from-[#145B46]
                                to-[#073529]
                                text-[#F6D878]
                                font-bold
                                shadow-md
                              `
                              : `
                                border-transparent
                                text-white/90
                                hover:border-[#C49A3A]/35
                                hover:bg-black/[0.10]
                                hover:text-white
                                hover:translate-x-1
                              `
                          }
                        `
                        }
                      >
                        <Building2
                          size={19}
                          className="shrink-0 transition-transform duration-300 group-hover:scale-110"
                        />
                        <span className="truncate">مشروع فلل تبوك</span>
                      </NavLink>
                    </div>
                  )}

                  {/* ================================================= */}
                  {/* Dynamic Buildings Submenu */}
                  {/* ================================================= */}

                  {isBuildings && buildingsOpen && (
                    <div
                      className="
                        mr-5
                        ml-2
                        border-r
                        border-white/25
                        pr-3
                        space-y-2
                      "
                    >
                      {buildings.length > 0 ? (
                        buildings.map((building) => (
                          <NavLink
                            key={building.id}
                            to={`/buildings/${building.id}`}
                            onClick={handleMobileNavigate}
                            className={({ isActive }) =>
                              `
                              group
                              flex
                              min-h-[48px]
                              items-center
                              gap-3
                              rounded-xl
                              border
                              px-4
                              py-3
                              text-sm
                              transition-all
                              duration-300
                              ${
                                isActive
                                  ? `
                                    border-[#D4AD4D]
                                    bg-gradient-to-r
                                    from-[#145B46]
                                    to-[#073529]
                                    text-[#F6D878]
                                    font-bold
                                    shadow-md
                                  `
                                  : `
                                    border-transparent
                                    text-white/90
                                    hover:border-[#C49A3A]/35
                                    hover:bg-black/[0.10]
                                    hover:text-white
                                    hover:translate-x-1
                                  `
                              }
                            `
                            }
                          >
                            <Building2
                              size={19}
                              className="
                                shrink-0
                                transition-transform
                                duration-300
                                group-hover:scale-110
                              "
                            />

                            <span className="truncate">
                              {building.name}
                            </span>
                          </NavLink>
                        ))
                      ) : (
                        <div
                          className="
                            rounded-xl
                            border
                            border-white/10
                            bg-black/[0.08]
                            px-4
                            py-3
                            text-sm
                            text-white/70
                          "
                        >
                          لا توجد عمائر مضافة حاليًا
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ===================================================== */}
        {/* Footer */}
        {/* ===================================================== */}

        <div
          className="
            border-t
            border-white/20
            p-4
            space-y-3
          "
        >
          <div
            className="
              rounded-2xl
              bg-black/[0.10]
              border
              border-white/20
              p-4
            "
          >
            <p className="text-xs text-white/70">
              النظام
            </p>

            <h4 className="font-semibold mt-1 text-white">
              AQARY SMART ERP
            </h4>

            <p className="text-xs text-white/70 mt-2">
              Version 1.0.0
            </p>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="
              w-full
              min-h-[52px]
              rounded-2xl
              bg-red-500/[0.08]
              hover:bg-red-500
              border
              border-red-500/25
              py-3
              flex
              items-center
              justify-center
              gap-3
              text-red-100
              hover:text-white
              transition-all
              duration-300
              cursor-pointer
            "
          >
            <LogOut size={20} />

            تسجيل الخروج
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;