import { useEffect } from "react";
import { ShieldAlert, X, ArrowRight } from "lucide-react";

type PermissionDeniedModalProps = {
  open: boolean;
  message: string;
  onClose: () => void;
  redirectTo?: string;
};

export default function PermissionDeniedModal({
  open,
  message,
  onClose,
  redirectTo,
}: PermissionDeniedModalProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleClose = () => {
    onClose();

    if (redirectTo) {
      window.location.href = redirectTo;
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#022c22]/70 px-4 backdrop-blur-md"
      onClick={handleClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="
          relative
          w-full
          max-w-[440px]
          overflow-hidden
          rounded-[30px]
          border
          border-emerald-800/20
          bg-gradient-to-br
          from-[#f8fffc]
          via-white
          to-[#eef8f3]
          shadow-[0_30px_100px_rgba(2,44,34,0.35)]
        "
      >
        {/* الخط العلوي */}
        <div className="h-[6px] bg-gradient-to-l from-[#064e3b] via-[#059669] to-[#d4af37]" />

        {/* زخرفة خلفية */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-52 w-52 rounded-full bg-emerald-700/10 blur-2xl" />

        <div className="pointer-events-none absolute -bottom-24 -left-24 h-52 w-52 rounded-full bg-amber-400/10 blur-2xl" />

        {/* زر الإغلاق */}
        <button
          type="button"
          onClick={handleClose}
          className="
            absolute
            left-5
            top-5
            z-10
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-full
            border
            border-emerald-900/10
            bg-white/80
            text-emerald-900/60
            shadow-sm
            backdrop-blur
            transition
            duration-200
            hover:bg-emerald-50
            hover:text-emerald-900
            hover:shadow-md
          "
          aria-label="إغلاق"
        >
          <X size={19} />
        </button>

        <div className="relative px-7 pb-8 pt-9 text-center">
          {/* منطقة اللوجو */}
          <div className="relative mx-auto mb-6 h-[92px] w-[92px]">
            {/* الهالة */}
            <div className="absolute inset-0 rounded-[28px] bg-emerald-700/10 blur-xl" />

            {/* صندوق اللوجو */}
            <div
              className="
                relative
                flex
                h-[92px]
                w-[92px]
                items-center
                justify-center
                rounded-[28px]
                border
                border-emerald-800/15
                bg-gradient-to-br
                from-white
                to-emerald-50
                shadow-[0_12px_35px_rgba(6,78,59,0.16)]
              "
            >
              <img
                src="/aqar-smart-logo.png"
                alt="AQARY SMART"
                className="h-[68px] w-[68px] object-contain"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />

              {/* أيقونة التنبيه */}
              <div
                className="
                  absolute
                  -bottom-2
                  -left-2
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-full
                  border-[3px]
                  border-white
                  bg-gradient-to-br
                  from-amber-400
                  to-amber-600
                  text-white
                  shadow-lg
                "
              >
                <ShieldAlert size={19} strokeWidth={2.4} />
              </div>
            </div>
          </div>

          {/* العنوان */}
          <h2
            className="
              mb-2
              text-[24px]
              font-extrabold
              tracking-tight
              text-[#064e3b]
            "
          >
            عذرًا، غير مسموح
          </h2>

          {/* خط ذهبي صغير */}
          <div className="mx-auto mb-5 h-[3px] w-14 rounded-full bg-gradient-to-r from-amber-400 to-amber-600" />

          {/* الرسالة */}
          <p
            className="
              mx-auto
              max-w-[350px]
              text-[15px]
              font-medium
              leading-8
              text-slate-600
            "
          >
            {message}
          </p>

          {/* تنبيه الصلاحية */}
          <div
            className="
              mx-auto
              mt-6
              flex
              max-w-[350px]
              items-center
              gap-3
              rounded-2xl
              border
              border-emerald-900/10
              bg-emerald-50/80
              px-4
              py-3
              text-right
            "
          >
            <div
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-emerald-900
                text-white
                shadow-sm
              "
            >
              <ShieldAlert size={18} />
            </div>

            <div>
              <div className="text-[12px] font-bold text-emerald-900">
                مستوى الوصول
              </div>

              <div className="mt-0.5 text-[11px] leading-5 text-emerald-900/60">
                لا تملك الصلاحية المطلوبة لهذه الصفحة
              </div>
            </div>
          </div>

          {/* اسم البرنامج */}
          <div className="mt-6">
            <div className="text-[12px] font-extrabold tracking-[0.22em] text-[#064e3b]">
              AQARY SMART
            </div>

            <div className="mt-1 text-[10px] font-medium tracking-wide text-emerald-900/40">
              REAL ESTATE MANAGEMENT SYSTEM
            </div>
          </div>

          {/* زر الإغلاق / العودة */}
          <button
            type="button"
            onClick={handleClose}
            className="
              mt-7
              flex
              w-full
              items-center
              justify-center
              gap-2
              rounded-2xl
              bg-gradient-to-l
              from-[#022c22]
              via-[#064e3b]
              to-[#087f5b]
              px-5
              py-4
              text-sm
              font-bold
              text-white
              shadow-[0_10px_30px_rgba(6,78,59,0.25)]
              transition
              duration-200
              hover:-translate-y-[1px]
              hover:shadow-[0_14px_35px_rgba(6,78,59,0.32)]
              active:translate-y-0
            "
          >
            {redirectTo ? "العودة إلى الصفحة السابقة" : "حسنًا، فهمت"}

            {redirectTo && (
              <ArrowRight
                size={18}
                className="rotate-180"
              />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}