import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";

import Sidebar from "../components/sidebar/Sidebar";
import Topbar from "../components/topbar/Topbar";
import { supabase } from "../utils/supabase";

function MainLayout() {
  const navigate = useNavigate();

  const [showLogoutModal, setShowLogoutModal] =
    useState(false);

  const [loggingOut, setLoggingOut] =
    useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);

      // ==========================================
      // تسجيل خروج حقيقي من Supabase
      // يجب تنفيذ تسجيل الخروج في جميع البيئات
      // ==========================================
      const { error } =
        await supabase.auth.signOut();

      if (error) {
        console.error(
          "خطأ أثناء تسجيل الخروج:",
          error
        );

        alert(
          "حدث خطأ أثناء تسجيل الخروج، حاول مرة أخرى"
        );

        return;
      }

      setShowLogoutModal(false);

      navigate("/login", {
        replace: true,
      });

    } catch (error) {
      console.error(
        "خطأ غير متوقع أثناء تسجيل الخروج:",
        error
      );

      alert(
        "حدث خطأ أثناء تسجيل الخروج، حاول مرة أخرى"
      );

    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div
      className="
        flex
        h-screen
        w-full
        min-w-0
        max-w-full
        overflow-hidden
        bg-[#031F1B]
      "
      dir="rtl"
    >

      {/* ==========================================
          SIDEBAR
      ========================================== */}

      <div className="shrink-0">
        <Sidebar
          onLogout={() => setShowLogoutModal(true)}
        />
      </div>

      {/* ==========================================
          MAIN CONTENT
      ========================================== */}

      <div
        className="
          flex
          min-w-0
          max-w-full
          flex-1
          flex-col
          overflow-hidden
        "
      >

        {/* Top Navigation */}

        <div className="min-w-0 max-w-full shrink-0">
          <Topbar />
        </div>

        {/* ==========================================
            PAGE CONTENT
        ========================================== */}

        <main
          className="
            relative
            flex-1
            min-w-0
            max-w-full
            overflow-x-hidden
            overflow-y-auto
            bg-[#031F1B]
            p-3
            sm:p-4
            md:p-6
          "
        >

          {/* ==========================================
              AQARY SMART BACKGROUND
          ========================================== */}

          <div
            className="
              pointer-events-none
              absolute
              inset-0
              overflow-hidden
            "
            aria-hidden="true"
          >

            {/* Main Dark Green Gradient */}

            <div
              className="
                absolute
                inset-0
                bg-gradient-to-br
                from-[#062D27]
                via-[#031F1B]
                to-[#011412]
              "
            />

            {/* Golden Glow */}

            <div
              className="
                absolute
                -right-40
                -top-40
                h-[500px]
                w-[500px]
                rounded-full
                bg-[#C49A3A]/[0.035]
                blur-[130px]
              "
            />

            {/* Green Glow */}

            <div
              className="
                absolute
                -bottom-40
                -left-40
                h-[600px]
                w-[600px]
                rounded-full
                bg-emerald-400/[0.04]
                blur-[150px]
              "
            />

            {/* ==========================================
                AQARY SMART WATERMARK
            ========================================== */}

            <div
              className="
                absolute
                bottom-[-40px]
                left-1/2
                w-[600px]
                max-w-[90%]
                -translate-x-1/2
                opacity-[0.055]
                sm:w-[750px]
              "
            >

              <img
                src="/aqar-smart-logo.png"
                alt=""
                aria-hidden="true"
                className="
                  h-auto
                  w-full
                  object-contain
                  grayscale
                "
              />

            </div>

            {/* Decorative Golden Line */}

            <div
              className="
                absolute
                bottom-8
                left-[-10%]
                h-px
                w-[120%]
                rotate-[-8deg]
                bg-gradient-to-r
                from-transparent
                via-[#C49A3A]/20
                to-transparent
              "
            />

          </div>

          {/* ==========================================
              PAGE CONTENT
          ========================================== */}

          <div
            className="
              relative
              z-10
              mx-auto
              min-h-full
              w-full
              min-w-0
              max-w-[1700px]
            "
          >

            <Outlet />

          </div>

        </main>

      </div>

      {/* ==========================================
          LOGOUT CONFIRMATION MODAL
      ========================================== */}

      {showLogoutModal && (
        <div
          className="
            fixed
            inset-0
            z-[9999]
            flex
            items-center
            justify-center
            overflow-y-auto
            bg-black/60
            p-4
            sm:p-6
            backdrop-blur-md
          "
          onClick={() => {
            if (!loggingOut) {
              setShowLogoutModal(false);
            }
          }}
        >

          {/* Modal */}

          <div
            className="
              w-full
              max-w-md
              max-h-[calc(100vh-2rem)]
              overflow-y-auto
              rounded-[24px]
              sm:rounded-[28px]
              border
              border-[#C49A3A]/20
              bg-[#062D27]
              p-5
              sm:p-8
              text-center
              shadow-2xl
            "
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* Logout Icon */}

            <div
              className="
                mx-auto
                mb-5
                flex
                h-16
                w-16
                sm:h-20
                sm:w-20
                items-center
                justify-center
                rounded-3xl
                border
                border-red-400/20
                bg-red-500/10
                text-red-400
              "
            >

              <svg
                width="38"
                height="38"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >

                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />

                <path d="M16 17l5-5-5-5" />

                <path d="M21 12H9" />

              </svg>

            </div>

            {/* Title */}

            <h2
              className="
                text-xl
                font-black
                text-white
                sm:text-2xl
              "
            >
              تسجيل الخروج
            </h2>

            {/* Message */}

            <p
              className="
                mt-3
                leading-7
                text-gray-400
              "
            >
              هل أنت متأكد من رغبتك في تسجيل الخروج؟
            </p>

            {/* Buttons */}

            <div
              className="
                mt-6
                grid
                grid-cols-1
                gap-3
                sm:mt-8
                sm:grid-cols-2
                sm:gap-4
              "
            >

              {/* Cancel */}

              <button
                type="button"
                disabled={loggingOut}
                onClick={() =>
                  setShowLogoutModal(false)
                }
                className="
                  min-h-12
                  rounded-2xl
                  border
                  border-white/10
                  bg-white/5
                  px-5
                  py-3
                  font-bold
                  text-gray-300
                  transition-all
                  duration-300
                  hover:bg-white/10
                  hover:text-white
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                لا، إلغاء
              </button>

              {/* Confirm Logout */}

              <button
                type="button"
                disabled={loggingOut}
                onClick={handleLogout}
                className="
                  min-h-12
                  rounded-2xl
                  bg-red-500
                  px-5
                  py-3
                  font-bold
                  text-white
                  transition-all
                  duration-300
                  hover:bg-red-600
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                {loggingOut
                  ? "جاري تسجيل الخروج..."
                  : "نعم، تسجيل الخروج"}
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default MainLayout;
