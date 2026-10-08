
import {
  Building2,
  Users,
  Wallet,
} from "lucide-react";

export default function DashboardHero() {
  return (
    <section
      className="
        relative
        overflow-hidden
        rounded-3xl
        border
        border-white/10
        bg-[#073F35]
        p-5
        sm:p-6
        lg:p-8
      "
    >

      {/* Background Glow */}

      <div
        className="
          pointer-events-none
          absolute
          -left-20
          -top-20
          h-72
          w-72
          rounded-full
          bg-yellow-400/10
          blur-3xl
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          -bottom-20
          -right-20
          h-72
          w-72
          rounded-full
          bg-blue-500/10
          blur-3xl
        "
      />

      <div className="relative z-10">

        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between xl:gap-8">

          {/* Right */}

          <div className="min-w-0 flex-1 text-right">

            <span
              className="
                inline-flex
                rounded-full
                border
                border-yellow-400/30
                bg-yellow-400/10
                px-3
                py-1
                text-xs
                font-medium
                text-yellow-300
                sm:px-4
                sm:text-sm
              "
            >
              AQARY SMART ERP
            </span>

            <h1 className="mt-4 text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-4xl">
              صباح الخير، علي 👋
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-300 sm:text-base lg:text-lg">
              مرحبًا بك في نظام عقاري سمارت ، يمكنك متابعة المشاريع،
              الإيرادات، المصروفات، والاستثمارات من مكان واحد.
            </p>

          </div>

          {/* Left Statistics */}

          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:w-[360px] xl:shrink-0">

            <HeroCard
              icon={<Building2 size={24} />}
              title="المشاريع"
              value="0"
            />

            <HeroCard
              icon={<Wallet size={24} />}
              title="الأصول"
              value="0"
            />

            <HeroCard
              icon={<Users size={24} />}
              title="الموظفين"
              value="0"
            />

            <HeroCard
              icon={<Building2 size={24} />}
              title="العقارات"
              value="0"
            />

          </div>

        </div>

      </div>

    </section>
  );
}

type HeroCardProps = {
  icon: React.ReactNode;
  title: string;
  value: string;
};

function HeroCard({
  icon,
  title,
  value,
}: HeroCardProps) {
  return (
    <div
      className="
        min-w-0
        rounded-2xl
        border
        border-white/10
        bg-white/5
        p-3
        text-center
        backdrop-blur-md
        transition-all
        duration-300
        hover:bg-white/10
        sm:p-4
      "
    >

      <div
        className="
          mx-auto
          mb-3
          flex
          h-10
          w-10
          items-center
          justify-center
          rounded-xl
          bg-yellow-400
          text-[#081B33]
          sm:h-11
          sm:w-11
        "
      >
        {icon}
      </div>

      <p className="text-xs text-gray-400 sm:text-sm">
        {title}
      </p>

      <h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
        {value}
      </h2>

    </div>
  );
}