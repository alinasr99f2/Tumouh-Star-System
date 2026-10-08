import {
  CalendarClock,
  FileWarning,
  Receipt,
  Building2,
  CheckCircle2,
} from "lucide-react";

const tasks = [
  {
    title: "مراجعة عقد مشروع تبوك",
    description: "ينتهي خلال يومين",
    icon: FileWarning,
    color: "text-red-400",
    bg: "bg-red-500/10",
  },
  {
    title: "اعتماد مصروفات الأسبوع",
    description: "بانتظار موافقة الإدارة",
    icon: Receipt,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
  },
  {
    title: "اجتماع متابعة مشروع الرياض",
    description: "اليوم - 3:00 مساءً",
    icon: CalendarClock,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    title: "تحديث بيانات الوحدات",
    description: "مشروع فلل تبوك",
    icon: Building2,
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
];

export default function UpcomingTasks() {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#081B33] p-7">

      <div className="mb-6 flex items-center justify-between">

        <div>

          <h2 className="text-2xl font-bold">
            المهام القادمة
          </h2>

          <p className="mt-2 text-gray-400">
            أهم المهام التي تحتاج إلى متابعة.
          </p>

        </div>

        <span className="rounded-full bg-yellow-500/10 px-4 py-2 text-sm font-semibold text-yellow-400">
          {tasks.length} مهام
        </span>

      </div>

      <div className="space-y-4">

        {tasks.map((task) => {
          const Icon = task.icon;

          return (
            <div
              key={task.title}
              className="group flex items-center gap-5 rounded-2xl border border-white/5 bg-[#102947] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-yellow-400/30"
            >
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl ${task.bg}`}
              >
                <Icon
                  size={26}
                  className={task.color}
                />
              </div>

              <div className="flex-1">

                <h3 className="font-semibold text-white">
                  {task.title}
                </h3>

                <p className="mt-1 text-sm text-gray-400">
                  {task.description}
                </p>

              </div>

              <CheckCircle2
                size={22}
                className="text-green-400"
              />

            </div>
          );
        })}

      </div>

    </section>
  );
}