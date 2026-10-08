
import {
  ArrowLeft,
  Building,
  Building2,
  LayoutDashboard,
  History,
  LayoutGrid,
  ShieldCheck,
  Headset,
  Sun,
  Moon,
  Sparkles,
} from "lucide-react";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../utils/supabase";

import "./Home.css";

export default function Home() {
  const navigate = useNavigate();

  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeName, setWelcomeName] = useState("بك");
  const [welcomeGreeting, setWelcomeGreeting] = useState("أهلاً بك");
  const [welcomeMessage, setWelcomeMessage] = useState(
    "نتمنى لك يومًا موفقًا ومليئًا بالإنجاز."
  );
  const [welcomeAvatarUrl, setWelcomeAvatarUrl] = useState<string | null>(null);
  const [welcomeIcon, setWelcomeIcon] = useState<"sun" | "moon" | "sparkles">(
    "sparkles"
  );

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const loadWelcome = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted || !user) return;

        const { data: profile } = await supabase
          .from("users")
          .select("name, avatar_url")
          .eq("email", user.email ?? "")
          .maybeSingle();

        const name = String(profile?.name ?? "").trim() || "بك";
        const hour = new Date().getHours();

        let greeting = "مساء الخير";
        let icon: "sun" | "moon" | "sparkles" = "moon";
        let message =
          "نتمنى لك مساءً هادئًا ومثمرًا، وبداية موفقة في كل أعمالك.";

        if (hour >= 5 && hour < 12) {
          greeting = "صباح الخير";
          icon = "sun";
          message =
            "نتمنى لك صباحًا موفقًا ومليئًا بالإنجاز، وبداية قوية ليومك.";
        } else if (hour >= 12 && hour < 17) {
          greeting = "أهلاً بك";
          icon = "sparkles";
          message =
            "نتمنى لك يومًا موفقًا ومليئًا بالإنجاز، وكل التوفيق في أعمالك.";
        }

        const loginStamp = user.last_sign_in_at ?? user.updated_at ?? "active";
        const welcomeKey = `aqar-smart-welcome-v4-${user.id}-${loginStamp}`;
        if (sessionStorage.getItem(welcomeKey)) return;

        setWelcomeName(name);
        setWelcomeGreeting(greeting);
        setWelcomeMessage(message);
        setWelcomeAvatarUrl(
          profile?.avatar_url ? String(profile.avatar_url).trim() || null : null,
        );
        setWelcomeIcon(icon);
        setShowWelcome(true);
        sessionStorage.setItem(welcomeKey, "1");

        timer = setTimeout(() => {
          if (mounted) setShowWelcome(false);
        }, 15000);
      } catch (error) {
        console.error("تعذر تحميل اسم المستخدم لرسالة الترحيب:", error);
      }
    };

    void loadWelcome();

    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const closeWelcome = () => setShowWelcome(false);

  const cards = [
    {
      title: "لوحة التحكم",
      description:
        "متابعة الأداء والإحصائيات والتقارير الرئيسية للنظام",
      icon: LayoutDashboard,
      path: "/dashboard",
      color: "blue",
    },
    {
      title: "المشاريع",
      description:
        "إدارة المشاريع ومتابعة التفاصيل والتواصل والمهام والتقدم",
      icon: Building2,
      path: "/projects",
      color: "green",
    },
    {
      title: "العمائر",
      description:
        "إدارة العمائر السكنية والتجارية ومتابعة الوحدات والإيجارات",
      icon: Building,
      path: "/buildings",
      color: "building",
    },
    
    {
      title: "الشقق المتاحة / المؤجرة",
      description:
        "إدارة الشقق المستقلة ومتابعة الشقق المتاحة والمؤجرة وتفاصيلها",
      icon: LayoutGrid,
      path: "/apartments",
      color: "green",
    },
    {
      title: "المستخدمين والصلاحيات",
      description:
        "إدارة المستخدمين وتحديد الصلاحيات والوصول إلى أقسام النظام",
      icon: ShieldCheck,
      path: "/users-permissions",
      color: "building",
    },
    {
  title: "سجل النشاط",
  description:
    "متابعة جميع العمليات والحركات التي تتم داخل النظام",
  icon: History,
  path: "/activity-log",
  color: "yellow",
},
    {
      title: "تواصل معنا",
      description:
        "تواصل مع فريق عقاري سمارت للحصول على المساعدة والدعم",
      icon: Headset,
      path: "/contact-us",
      color: "blue",
    },
  ];

  return (
    <>
      {showWelcome && (
  <div
    dir="rtl"
    className="
      fixed inset-0 z-[9999]
      flex items-center justify-center
      bg-[#020b09]/80
      px-4 py-6
      backdrop-blur-md
      animate-in fade-in duration-500
    "
    onClick={closeWelcome}
  >
    <div className="relative flex w-full max-w-[760px] items-center justify-center sm:max-w-[900px]">
      {/* صورة المستخدم الحالية — بجوار بطاقة الترحيب من الخارج */}
      <div
        className="
          absolute
          left-1/2
          top-full
          z-40
          mt-4
          -translate-x-1/2
          sm:left-0
          sm:top-1/2
          sm:mt-0
          sm:-translate-x-[calc(100%+24px)]
          sm:-translate-y-1/2
        "
      >
        <div
          className="
            h-[92px] w-[92px] overflow-hidden rounded-full
            border-2 border-yellow-300/80 bg-[#0a3b31] p-1
            shadow-[0_15px_45px_rgba(0,0,0,0.55)] ring-4 ring-[#f6c84a]/10
            sm:h-[112px] sm:w-[112px]
          "
        >
          {welcomeAvatarUrl ? (
            <img
              src={welcomeAvatarUrl}
              alt={`صورة ${welcomeName}`}
              className="h-full w-full rounded-full object-cover"
              onError={() => setWelcomeAvatarUrl(null)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-[#0d5a49] to-[#062b24] text-4xl font-black text-yellow-300 sm:text-5xl">
              {welcomeName.trim().charAt(0) || "؟"}
            </div>
          )}
        </div>
      </div>

      <div
      onClick={(event) => event.stopPropagation()}
      className="
        relative
        w-full
        max-w-[760px]
        overflow-hidden
        rounded-[30px]
        border
        border-yellow-300/60
        bg-[#062b24]
        shadow-[0_30px_100px_rgba(0,0,0,0.75)]
        animate-in
        zoom-in-95
        duration-500
      "
    >

      {/* =========================================
          الصورة الخلفية
      ========================================= */}
      <img
        src="/background for welcome.png"
        alt="عقاري سمارت"
        className="
          absolute
          inset-0
          h-full
          w-full
          object-cover
          object-center
        "
      />

      {/* =========================================
          طبقات التعتيم والتدرج
      ========================================= */}

      {/* تعتيم عام */}
      <div
        className="
          absolute
          inset-0
          bg-[#031b17]/25
        "
      />

      {/* تدرج قوي ناحية النص */}
      <div
        className="
          absolute
          inset-0
          bg-gradient-to-l
          from-[#03251f]/95
          via-[#06382e]/75
          via-[58%]
          to-transparent
        "
      />

      {/* تعتيم سفلي */}
      <div
        className="
          absolute
          inset-x-0
          bottom-0
          h-[42%]
          bg-gradient-to-t
          from-[#021b16]/95
          to-transparent
        "
      />

      {/* إضاءة ذهبية خفيفة */}
      <div
        className="
          pointer-events-none
          absolute
          -right-24
          -top-24
          h-72
          w-72
          rounded-full
          bg-yellow-400/10
          blur-[90px]
        "
      />

      {/* =========================================
          زر الإغلاق
      ========================================= */}
      <button
        type="button"
        onClick={closeWelcome}
        aria-label="إغلاق رسالة الترحيب"
        className="
          absolute
          left-5
          top-5
          z-30
          flex
          h-11
          w-11
          items-center
          justify-center
          rounded-full
          border
          border-white/20
          bg-black/25
          text-2xl
          font-light
          text-white
          backdrop-blur-md
          transition-all
          duration-300
          hover:border-yellow-300/60
          hover:bg-yellow-300/15
          hover:scale-105
        "
      >
        ×
      </button>

      {/* =========================================
          المحتوى
      ========================================= */}
      <div
        className="
          relative
          z-10
          min-h-[555px]
          flex
          flex-col
          justify-between
          px-7
          py-8
          sm:px-10
          sm:py-9
        "
      >

        {/* =========================================
            الشعار
        ========================================= */}
        <div
          className="
            flex
            justify-start
            pr-1
          "
        >
          <img
            src="/aqar-smart-logo.png"
            alt="عقاري سمارت"
            className="
              h-[82px]
              w-[82px]
              object-contain
              drop-shadow-[0_8px_20px_rgba(0,0,0,0.5)]
              sm:h-[95px]
              sm:w-[95px]
            "
          />
        </div>

        {/* =========================================
            النص الرئيسي
        ========================================= */}
        <div
          className="
            mt-[-10px]
            flex
            flex-1
            flex-col
            justify-center
            text-center
            sm:items-start
            sm:text-right
          "
        >

          {/* العلامة */}
          <div
            className="
              mb-4
              inline-flex
              items-center
              gap-2
              self-center
              rounded-full
              border
              border-yellow-300/30
              bg-yellow-300/10
              px-4
              py-1.5
              text-[10px]
              font-black
              tracking-[0.18em]
              text-yellow-300
              shadow-[0_8px_25px_rgba(231,191,67,0.10)]
              sm:self-start
            "
          >
            <span>✦</span>
            AQARY SMART
            <span>✦</span>
          </div>

          {/* التحية */}
          <div
            className="
              flex
              items-center
              justify-center
              gap-3
              sm:justify-end
            "
          >
            {welcomeIcon === "sun" ? (
              <Sun
                size={46}
                strokeWidth={2.1}
                className="text-yellow-300 drop-shadow-[0_0_14px_rgba(250,204,21,0.75)] sm:h-12 sm:w-12"
              />
            ) : welcomeIcon === "moon" ? (
              <Moon
                size={44}
                strokeWidth={2.1}
                className="text-yellow-200 drop-shadow-[0_0_14px_rgba(250,204,21,0.65)] sm:h-12 sm:w-12"
              />
            ) : (
              <Sparkles
                size={44}
                strokeWidth={2.1}
                className="text-yellow-300 drop-shadow-[0_0_14px_rgba(250,204,21,0.7)] sm:h-12 sm:w-12"
              />
            )}

            <h2
            className="
              text-[40px]
              font-black
              leading-[1.05]
              text-yellow-300
              drop-shadow-[0_5px_20px_rgba(0,0,0,0.45)]
              sm:text-[48px]
            "
          >
            {welcomeGreeting}
            </h2>
          </div>

          {/* الاسم */}
          <h3
            className="
              mt-2
              text-[38px]
              font-black
              leading-tight
              text-white
              drop-shadow-[0_5px_20px_rgba(0,0,0,0.5)]
              sm:text-[46px]
            "
          >
            {welcomeName}
          </h3>

          {/* الخط الذهبي */}
          <div
            className="
              mt-5
              h-[2px]
              w-28
              self-center
              bg-gradient-to-r
              from-transparent
              via-yellow-300
              to-transparent
              sm:self-end
              sm:bg-gradient-to-l
            "
          />

          {/* الرسالة */}
          <p
            className="
              mt-6
              max-w-[430px]
              text-[17px]
              font-semibold
              leading-[2]
              text-white/90
              drop-shadow-[0_3px_12px_rgba(0,0,0,0.5)]
              sm:text-[18px]
            "
          >
            {welcomeMessage}
          </p>

          {/* الفاصل الملكي */}
          <div
            className="
              mt-6
              flex
              items-center
              justify-center
              gap-3
              self-center
              sm:self-end
            "
          >
            <span className="h-px w-16 bg-gradient-to-l from-yellow-300/70 to-transparent" />

            <span className="text-xl text-yellow-300">
              ✦
            </span>

            <span className="text-lg text-yellow-200">
              ♕
            </span>

            <span className="text-xl text-yellow-300">
              ✦
            </span>

            <span className="h-px w-16 bg-gradient-to-r from-yellow-300/70 to-transparent" />
          </div>

        </div>

        {/* =========================================
            الجزء السفلي
        ========================================= */}
        <div className="mt-6">

          <div
            className="
              flex
              flex-col-reverse
              items-center
              gap-5
              sm:flex-row
              sm:items-end
              sm:justify-between
            "
          >

            {/* شريط الـ15 ثانية */}
            <div
              className="
                w-full
                max-w-[300px]
              "
            >
              <div
                className="
                  mb-2
                  flex
                  items-center
                  justify-between
                  text-[11px]
                  font-semibold
                  text-white/60
                "
              >
                <span>
                  سيتم الإغلاق تلقائيًا
                </span>

                <span className="text-yellow-300">
                  15 ثانية
                </span>
              </div>

              <div
                className="
                  h-2
                  w-full
                  overflow-hidden
                  rounded-full
                  border
                  border-yellow-300/30
                  bg-black/30
                "
              >
                <div
                  className="
                    h-full
                    w-full
                    origin-right
                    rounded-full
                    bg-gradient-to-l
                    from-yellow-200
                    via-yellow-400
                    to-yellow-500
                    shadow-[0_0_12px_rgba(245,200,70,0.45)]
                  "
                  style={{ animation: "welcomeProgress 15s linear forwards" }}
                />
              </div>
            </div>

            {/* زر المتابعة */}
            <button
              type="button"
              onClick={closeWelcome}
              className="
                flex
                min-w-[205px]
                items-center
                justify-center
                gap-3
                rounded-2xl
                border
                border-yellow-100/70
                bg-gradient-to-r
                from-[#e0ae38]
                via-[#f5d477]
                to-[#d8a932]
                px-7
                py-3.5
                text-lg
                font-black
                text-[#08251f]
                shadow-[0_12px_35px_rgba(217,173,47,0.28)]
                transition-all
                duration-300
                hover:-translate-y-1
                hover:brightness-110
                hover:shadow-[0_18px_45px_rgba(217,173,47,0.38)]
              "
            >
              <span>
                متابعة
              </span>

              <ArrowLeft
                size={23}
                strokeWidth={2.7}
              />
            </button>

          </div>

          <p
            className="
              mt-3
              text-center
              text-[10px]
              font-semibold
              text-white/35
            "
          >
            نتمنى لك يومًا موفقًا ومثمرًا
          </p>

        </div>

      </div>
      </div>
    </div>
  </div>
)}

<style>{`
  @keyframes welcomeProgress {
    from {
      transform: scaleX(1);
    }

    to {
      transform: scaleX(0);
    }
  }
`}</style>
    <div
      dir="rtl"
      className="
        relative
        min-h-full
        overflow-hidden
        w-full
        min-w-0
        max-w-full
        pb-10
        aqar-home-page
      "
    >
      {/* =========================================
          الخلفية
      ========================================= */}

      <div
        className="
          pointer-events-none
          absolute
          left-1/2
          top-[42%]
          z-0
          h-[420px]
          w-[420px]
          sm:h-[650px]
          sm:w-[650px]
          -translate-x-1/2
          -translate-y-1/2
          rounded-full
          bg-yellow-400/[0.025]
          blur-[100px]
        "
      />

      {/* =========================================
          المحتوى
      ========================================= */}

      <div
        className="
          relative
          z-10
          mx-auto
          flex
          w-full
          max-w-[1550px]
          min-w-0
          max-w-full
          flex-col
          items-center
          px-3
          pt-2
          sm:px-5
          lg:px-8
        "
      >
        {/* =====================================
            العنوان
        ===================================== */}

        <div
          className="
            mb-5
            flex
            flex-col
            items-center
            text-center
          "
        >
          <div
            className="
              aqar-home-badge
              mb-2
              rounded-full
              border
              border-yellow-400/30
              bg-yellow-400/10
              px-3
              py-1
              text-[11px]
              font-bold
              text-yellow-400
            "
          >
            AQARY SMART ERP

            <span className="mr-1">✦</span>
          </div>

          <h1
            className="
              aqar-home-title
              text-3xl
              font-extrabold
              leading-tight
              text-white
              sm:text-4xl
              md:text-5xl
            "
          >
            الشاشة الرئيسية
          </h1>

          <p
            className="
              aqar-home-description
              mt-2
              text-sm
              text-gray-400
              md:text-base
            "
          >
            مرحبًا بك في عقاري سمارت لإدارة العقارات
          </p>
        </div>

        {/* =====================================
            الكروت الأربعة
        ===================================== */}

        <div
          className="
            grid
            w-full
            min-w-0
            max-w-full
            grid-cols-1
            gap-4
            sm:gap-5
            md:grid-cols-2
            xl:grid-cols-4
            lg:gap-6
          "
        >
          {cards.map((card) => {
            const Icon = card.icon;

            const isYellow = card.color === "yellow";
            const isGreen = card.color === "green";
            const isBuilding = card.color === "building";

            return (
              <div
                key={card.title}
                className={`
                  aqar-feature-card
                  group
                  relative
                  flex
                  min-h-[340px]
                  w-full
                  min-w-0
                  max-w-full
                  flex-col
                  items-center
                  overflow-hidden
                  rounded-2xl
                  border
                  p-4
                  sm:rounded-[30px]
                  sm:p-7
                  text-center
                  shadow-2xl
                  backdrop-blur-xl
                  transition-all
                  duration-500
                  hover:-translate-y-2
                  ${
                    isYellow
                      ? `
                        border-yellow-400/30
                        bg-gradient-to-br
                        from-yellow-400/[0.20]
                        via-[#171914]/80
                        to-[#0b1420]/95
                        shadow-yellow-400/[0.06]
                        hover:border-yellow-400/60
                        hover:shadow-yellow-400/10
                      `
                      : isGreen
                      ? `
                        border-emerald-400/30
                        bg-gradient-to-br
                        from-emerald-400/[0.16]
                        via-[#082b27]/80
                        to-[#0b1420]/95
                        shadow-emerald-400/[0.05]
                        hover:border-emerald-400/60
                        hover:shadow-emerald-400/10
                      `
                      : isBuilding
                      ? `
                        border-[#D4AD4D]/40
                        bg-gradient-to-br
                        from-[#D4AD4D]/[0.16]
                        via-[#104638]/90
                        to-[#06251e]/95
                        shadow-[#D4AD4D]/[0.06]
                        hover:border-[#F6D878]/70
                        hover:shadow-[#D4AD4D]/15
                      `
                      : `
                        border-blue-400/30
                        bg-gradient-to-br
                        from-blue-400/[0.16]
                        via-[#09243d]/80
                        to-[#0b1420]/95
                        shadow-blue-400/[0.05]
                        hover:border-blue-400/60
                        hover:shadow-blue-400/10
                      `
                  }
                `}
              >
                {/* =================================
                    Glow
                ================================= */}

                <div
                  className={`
                    pointer-events-none
                    absolute
                    -top-24
                    left-1/2
                    h-48
                    w-48
                    -translate-x-1/2
                    rounded-full
                    blur-[70px]
                    opacity-20
                    ${
                      isYellow
                        ? "bg-yellow-400"
                        : isGreen
                        ? "bg-emerald-400"
                        : isBuilding
                        ? "bg-[#D4AD4D]"
                        : "bg-blue-400"
                    }
                  `}
                />

                {/* =================================
                    الأيقونة
                ================================= */}

                <div
                  className={`
                    relative
                    z-10
                    mb-4
                    flex
                    h-24
                    w-24
                    sm:mb-6
                    sm:h-[120px]
                    sm:w-[120px]
                    shrink-0
                    items-center
                    justify-center
                    rounded-[30px]
                    border
                    shadow-xl
                    transition-all
                    duration-500
                    group-hover:scale-105
                    ${
                      isYellow
                        ? `
                          border-yellow-300/30
                          bg-gradient-to-br
                          from-yellow-300/20
                          to-yellow-500/10
                          shadow-yellow-400/10
                        `
                        : isGreen
                        ? `
                          border-emerald-300/30
                          bg-gradient-to-br
                          from-emerald-300/20
                          to-emerald-500/10
                          shadow-emerald-400/10
                        `
                        : isBuilding
                        ? `
                          border-[#D4AD4D]/50
                          bg-gradient-to-br
                          from-[#D4AD4D]/25
                          to-[#0B4537]/40
                          shadow-[#D4AD4D]/15
                        `
                        : `
                          border-blue-300/30
                          bg-gradient-to-br
                          from-blue-300/20
                          to-blue-500/10
                          shadow-blue-400/10
                        `
                    }
                  `}
                >
                  <Icon
                    size={56}
                    strokeWidth={1.8}
                    className={`
                      h-12
                      w-12
                      sm:h-[62px]
                      sm:w-[62px]
                      aqar-card-icon
                      transition-transform
                      duration-500
                      group-hover:scale-110
                      ${
                        isYellow
                          ? "text-yellow-100"
                          : isGreen
                          ? "text-emerald-100"
                          : isBuilding
                          ? "text-[#F6D878]"
                          : "text-blue-100"
                      }
                    `}
                  />
                </div>

                {/* =================================
                    العنوان
                ================================= */}

                <h2
                  className="
                    aqar-card-title
                    relative
                    z-10
                    text-2xl
                    sm:text-[29px]
                    font-extrabold
                    leading-tight
                    text-white
                  "
                >
                  {card.title}
                </h2>

                {/* =================================
                    الوصف
                ================================= */}

                <p
                  className="
                    aqar-card-description
                    relative
                    z-10
                    mt-3
                    min-h-0
                    w-full
                    max-w-[340px]
                    break-words
                    text-sm
                    sm:mt-4
                    sm:min-h-[58px]
                    sm:text-[15px]
                    font-medium
                    leading-7
                    text-gray-300
                  "
                >
                  {card.description}
                </p>

                {/* =================================
                    زر الدخول
                ================================= */}

                <button
                  type="button"
                  onClick={() => navigate(card.path)}
                  className={`
                    aqar-card-button
                    relative
                    z-10
                    mt-auto
                    flex
                    w-full
                    min-w-0
                    max-w-full
                    items-center
                    sm:min-w-[210px]
                    justify-center
                    gap-3
                    rounded-full
                    border
                    px-4
                    py-3
                    sm:px-6
                    text-[15px]
                    font-bold
                    sm:text-[17px]
                    transition-all
                    duration-300
                    hover:scale-105
                    ${
                      isYellow
                        ? `
                          border-yellow-400/50
                          bg-yellow-400/5
                          text-white
                          hover:bg-yellow-400/10
                        `
                        : isGreen
                        ? `
                          border-emerald-400/50
                          bg-emerald-400/5
                          text-white
                          hover:bg-emerald-400/10
                        `
                        : isBuilding
                        ? `
                          border-[#D4AD4D]/60
                          bg-[#D4AD4D]/[0.06]
                          text-white
                          hover:border-[#F6D878]
                          hover:bg-[#D4AD4D]/15
                        `
                        : `
                          border-blue-400/50
                          bg-blue-400/5
                          text-white
                          hover:bg-blue-400/10
                        `
                    }
                  `}
                >
                  <span>الدخول إلى القسم</span>

                  <ArrowLeft
                    size={24}
                    strokeWidth={2.2}
                    className="
                      transition-transform
                      duration-300
                      group-hover:-translate-x-1
                    "
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
    </>
  );
}