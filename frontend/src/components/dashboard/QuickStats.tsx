import {
  Building2,
  Home,
  Users,
  BriefcaseBusiness,
  FileCheck2,
  Wallet,
} from "lucide-react";

const stats = [
  {
    title: "المشاريع النشطة",
    value: 12,
    icon: Building2,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    title: "الوحدات",
    value: 248,
    icon: Home,
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
  {
    title: "العملاء",
    value: 84,
    icon: Users,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  },
  {
    title: "الموظفون",
    value: 47,
    icon: BriefcaseBusiness,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
  },
  {
    title: "العقود النشطة",
    value: 18,
    icon: FileCheck2,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  {
    title: "السيولة",
    value: "5.4M",
    icon: Wallet,
    color: "text-red-400",
    bg: "bg-red-500/10",
  },
];

export default function QuickStats() {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#081B33] p-7">

      <div className="mb-7">

        <h2 className="text-2xl font-bold">
          مؤشرات سريعة
        </h2>

        <p className="mt-2 text-gray-400">
          نظرة سريعة على أهم بيانات الشركة
        </p>

      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">

        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="group flex items-center gap-5 rounded-2xl border border-white/5 bg-[#102947] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-yellow-400/30"
            >
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-2xl ${item.bg}`}
              >
                <Icon
                  size={30}
                  className={item.color}
                />
              </div>

              <div className="flex-1">

                <p className="text-sm text-gray-400">
                  {item.title}
                </p>

                <h3 className="mt-2 text-3xl font-bold text-white">
                  {item.value}
                </h3>

              </div>

            </div>
          );
        })}

      </div>

    </section>
  );
}