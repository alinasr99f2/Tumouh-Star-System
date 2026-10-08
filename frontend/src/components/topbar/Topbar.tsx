import {
  Bell,
  CalendarDays,
  Search,
  Moon,
  Globe,
  ChevronDown,
} from "lucide-react";
import { useEffect, useState } from "react";

import { supabase } from "../../utils/supabase";

type CurrentUser = {
  name: string;
  role: string;
  avatar_url: string | null;
};

function Topbar() {
  const [currentUser, setCurrentUser] = useState<CurrentUser>({
    name: "المستخدم",
    role: "موظف",
    avatar_url: null,
  });

  const [currentDate, setCurrentDate] = useState("");

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

        // احتياطي في حالة عدم العثور على السجل في جدول users.
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

    const updateDate = () => {
      const now = new Date();

      setCurrentDate(
        now.toLocaleDateString("ar-SA", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      );
    };

    void loadCurrentUser();
    updateDate();

    // تحديث التاريخ تلقائيًا لو ظل البرنامج مفتوحًا حتى اليوم التالي.
    const dateTimer = window.setInterval(updateDate, 60 * 1000);

    return () => {
      mounted = false;
      window.clearInterval(dateTimer);
    };
  }, []);

  const userInitial = currentUser.name.trim().charAt(0) || "م";

  return (
    <header
      className="
        flex
        h-16
        min-w-0
        w-full
        items-center
        justify-between
        gap-2
        overflow-hidden
        border-b
        border-white/10
        bg-[#062B24]
        px-3
        sm:h-20
        sm:px-5
        lg:px-8
      "
    >
      {/* Left */}

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <button
          type="button"
          aria-label="الإشعارات"
          className="
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-xl
            bg-[#0B4034]
            transition
            hover:bg-[#145545]
            sm:h-11
            sm:w-11
          "
        >
          <Bell size={19} />
        </button>

        <button
          type="button"
          aria-label="الوضع الليلي"
          className="
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-xl
            bg-[#0B4034]
            transition
            hover:bg-[#145545]
            sm:h-11
            sm:w-11
          "
        >
          <Moon size={17} />
        </button>

        <button
          type="button"
          aria-label="اللغة"
          className="
            hidden
            h-11
            w-11
            shrink-0
            items-center
            justify-center
            rounded-xl
            bg-[#0B4034]
            transition
            hover:bg-[#145545]
            sm:flex
          "
        >
          <Globe size={18} />
        </button>
      </div>

      {/* Center */}

      <div
        className="
          flex
          min-w-0
          flex-1
          justify-center
          px-2
          sm:px-4
        "
      >
        <div className="relative hidden w-full max-w-[450px] sm:block">
          <Search
            size={18}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-200/70"
          />

          <input
            type="text"
            placeholder="ابحث داخل النظام..."
            className="
              h-11
              w-full
              rounded-2xl
              border
              border-white/10
              bg-[#0B4034]
              pl-4
              pr-12
              text-white
              outline-none
              placeholder:text-emerald-100/50
              transition
              focus:border-yellow-400
              sm:h-12
            "
          />
        </div>
      </div>

      {/* Right */}

      <div
        className="
          flex
          shrink-0
          items-center
          gap-2
          sm:gap-5
        "
      >
        <div className="hidden text-left sm:block">
          <h3 className="font-semibold">
            {currentUser.name}
          </h3>

          <p className="text-xs text-emerald-200/70">
            {currentUser.role}
          </p>
        </div>

        <div
          className="
            h-10
            w-10
            shrink-0
            overflow-hidden
            rounded-full
            border-2
            border-[#F6D878]/70
            bg-gradient-to-br
            from-yellow-400
            to-yellow-600
            shadow-lg
            sm:h-12
            sm:w-12
          "
        >
          {currentUser.avatar_url ? (
            <img
              src={currentUser.avatar_url}
              alt={currentUser.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-bold text-[#062B24] sm:text-base">
              {userInitial}
            </div>
          )}
        </div>

        <ChevronDown
          size={18}
          className="hidden text-emerald-200/70 sm:block"
        />

        <div
          className="
            hidden
            items-center
            gap-2
            text-emerald-100/80
            sm:flex
            sm:mr-2
            lg:mr-6
          "
        >
          <CalendarDays size={18} />

          <span className="whitespace-nowrap text-sm">
            {currentDate}
          </span>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
