
import {
  Building2,
  Hammer,
  CheckCircle2,
  PauseCircle,
} from "lucide-react";

type Props = {
  total: number;
  active: number;
  completed: number;
  stopped: number;
};

export default function ProjectStats({
  total,
  active,
  completed,
  stopped,
}: Props) {
  const stats = [
    {
      title: "إجمالي المشاريع",
      value: total,
      icon: Building2,
      color: "text-[#F6D878]",
      bg: "bg-[#C49A3A]/10",
      border: "border-[#C49A3A]/30",
      glow: "group-hover:shadow-[#C49A3A]/10",
    },
    {
      title: "قيد التنفيذ",
      value: active,
      icon: Hammer,
      color: "text-[#F6D878]",
      bg: "bg-[#C49A3A]/10",
      border: "border-[#C49A3A]/30",
      glow: "group-hover:shadow-[#C49A3A]/10",
    },
    {
      title: "مكتمل",
      value: completed,
      icon: CheckCircle2,
      color: "text-emerald-300",
      bg: "bg-emerald-400/10",
      border: "border-emerald-400/25",
      glow: "group-hover:shadow-emerald-400/10",
    },
    {
      title: "متوقف",
      value: stopped,
      icon: PauseCircle,
      color: "text-red-300",
      bg: "bg-red-400/10",
      border: "border-red-400/25",
      glow: "group-hover:shadow-red-400/10",
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((item) => {
        const Icon = item.icon;

        return (
          <div
            key={item.title}
            className={`
              group
              relative
              overflow-hidden
              rounded-2xl
              border
              ${item.border}
              bg-gradient-to-br
              from-[#0B4537]
              via-[#073529]
              to-[#05261F]
              p-6
              text-center
              shadow-lg
              transition-all
              duration-300
              hover:-translate-y-1
              hover:shadow-xl
              ${item.glow}
            `}
          >

            {/* Decorative Background Glow */}

            <div
              className="
                pointer-events-none
                absolute
                -right-10
                -top-10
                h-32
                w-32
                rounded-full
                bg-[#C49A3A]/[0.04]
                blur-3xl
              "
            />

            {/* Card Content */}

            <div className="relative z-10 flex flex-col items-center justify-center gap-4">

              {/* Icon */}

              <div
                className={`
                  flex
                  h-14
                  w-14
                  items-center
                  justify-center
                  rounded-2xl
                  border
                  ${item.border}
                  ${item.bg}
                  transition-transform
                  duration-300
                  group-hover:scale-110
                `}
              >

                <Icon
                  size={28}
                  className={item.color}
                />

              </div>

              {/* Title */}

              <p className="text-sm font-medium text-[#B4CEC5]">
                {item.title}
              </p>

              {/* Value */}

              <h2 className="text-4xl font-bold leading-none text-white">
                {item.value}
              </h2>

            </div>

            {/* Decorative Bottom Line */}

            <div
              className={`
                absolute
                bottom-0
                left-1/2
                h-1
                w-0
                -translate-x-1/2
                rounded-full
                bg-[#D4AD4D]
                transition-all
                duration-300
                group-hover:w-1/3
              `}
            />

          </div>
        );
      })}
    </div>
  );
}