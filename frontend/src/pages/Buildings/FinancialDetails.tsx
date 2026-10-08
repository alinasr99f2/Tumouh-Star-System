
import { BarChart3 } from "lucide-react";

function FinancialDetails() {
  return (
    <div
      dir="rtl"
      className="
        relative
        min-h-screen
        overflow-hidden
        bg-gradient-to-br
        from-[#061F19]
        via-[#073529]
        to-[#031711]
        p-6
        text-white
        md:p-8
      "
    >
      {/* Background Glow */}
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#C49A3A]/[0.06] blur-3xl" />

      <div className="pointer-events-none absolute -bottom-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-emerald-400/[0.04] blur-3xl" />

      {/* Subtle Background Pattern */}
      <div
        className="
          pointer-events-none
          absolute
          inset-0
          opacity-[0.025]
        "
        style={{
          backgroundImage:
            "linear-gradient(rgba(212,173,77,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(212,173,77,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Page Header */}
        <div
          className="
            mb-8
            flex
            items-center
            gap-4
            rounded-3xl
            border
            border-[#C49A3A]/20
            bg-gradient-to-br
            from-[#0B4537]
            via-[#073529]
            to-[#05261F]
            p-5
            shadow-lg
            shadow-black/10
          "
        >
          {/* Icon */}
          <div
            className="
              flex
              h-14
              w-14
              shrink-0
              items-center
              justify-center
              rounded-2xl
              border
              border-[#C49A3A]/30
              bg-[#C49A3A]/10
              shadow-inner
            "
          >
            <BarChart3
              size={27}
              strokeWidth={2}
              className="text-[#F6D878]"
            />
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl font-extrabold text-white md:text-3xl">
              التفاصيل المالية
            </h1>

            <p className="mt-1 text-sm text-[#B4CEC5] md:text-base">
              تفاصيل الحركات المالية الخاصة بالعمائر
            </p>
          </div>
        </div>

        {/* Page Content */}
        <div
          className="
            relative
            overflow-hidden
            rounded-3xl
            border
            border-[#C49A3A]/20
            bg-gradient-to-br
            from-[#0B4537]
            via-[#073529]
            to-[#05261F]
            p-8
            text-center
            shadow-xl
            shadow-black/10
            transition-all
            duration-300
            hover:border-[#C49A3A]/35
          "
        >
          {/* Decorative Glow */}
          <div className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-[#C49A3A]/[0.05] blur-3xl" />

          <div className="relative z-10">
            <h2 className="text-xl font-bold text-white md:text-2xl">
              صفحة التفاصيل المالية
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#B4CEC5] md:text-base">
              هذه الصفحة جاهزة لبناء تقارير المستحقات والتحصيلات والحركات
              المالية.
            </p>
          </div>

          {/* Bottom Accent */}
          <div
            className="
              absolute
              bottom-0
              left-1/2
              h-1
              w-24
              -translate-x-1/2
              rounded-full
              bg-gradient-to-r
              from-transparent
              via-[#D4AD4D]
              to-transparent
            "
          />
        </div>
      </div>
    </div>
  );
}

export default FinancialDetails;