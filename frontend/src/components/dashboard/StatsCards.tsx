
import {
  Building2,
  Wallet,
  TrendingUp,
  CircleDollarSign,
} from "lucide-react";

const stats = [
  {
    title: "إجمالي المشاريع",
    value: "0",
    icon: Building2,
  },
  {
    title: "إجمالي الأصول",
    value: "0",
    icon: Wallet,
  },
  {
    title: "الإيرادات",
    value: "0",
    icon: TrendingUp,
  },
  {
    title: "المصروفات",
    value: "0",
    icon: CircleDollarSign,
  },
];

export default function StatsCards() {
  return (
    <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

      {stats.map((item) => {
        const Icon = item.icon;

        return (
          <div
            key={item.title}
            className="
              group
              relative
              min-h-[165px]
              overflow-hidden
              rounded-2xl
              border
              border-[#c49a3a]/25
              bg-gradient-to-br
              from-[#123d32]
              via-[#0b342b]
              to-[#08271f]
              p-5
              shadow-[0_12px_30px_rgba(6,78,59,0.12)]
              transition-all
              duration-300
              hover:-translate-y-1
              hover:border-[#c49a3a]/75
              hover:shadow-[0_18px_38px_rgba(6,78,59,0.20)]
            "
          >

            {/* اللمعة الداخلية */}

            <div
              className="
                pointer-events-none
                absolute
                -right-10
                -top-10
                h-28
                w-28
                rounded-full
                bg-[#c49a3a]/10
                blur-2xl
              "
            />

            <div className="relative z-10 flex items-start justify-between gap-4">

              <div className="min-w-0">

                <p className="text-sm font-medium text-[#d8dfd9]">
                  {item.title}
                </p>

                <h2 className="mt-4 text-3xl font-bold text-white">
                  {item.value}
                </h2>

              </div>

              <div
                className="
                  flex
                  h-12
                  w-12
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-[#c49a3a]/60
                  bg-[#c49a3a]/15
                  text-[#f6d878]
                  shadow-[0_0_20px_rgba(196,154,58,0.08)]
                  transition-transform
                  duration-300
                  group-hover:scale-105
                "
              >
                <Icon size={25} strokeWidth={1.8} />
              </div>

            </div>

            <div className="relative z-10 mt-6 border-t border-white/10 pt-3">

              <span className="text-xs text-[#aebfb6]">
                لا توجد بيانات حتى الآن
              </span>

            </div>

          </div>
        );
      })}

    </section>
  );
}