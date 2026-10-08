import {
  FolderPlus,
  Receipt,
  Building2,
  FileText,
  UserPlus,
  ArrowLeft,
} from "lucide-react";

const activities = [
  {
    id: 1,
    title: "تم إنشاء مشروع جديد",
    description: "فلل تبوك",
    user: "علي نصر",
    time: "منذ 5 دقائق",
    color: "bg-green-500",
    icon: FolderPlus,
  },
  {
    id: 2,
    title: "تم تسجيل مصروف",
    description: "شراء مواد بناء",
    user: "محمد أحمد",
    time: "منذ 18 دقيقة",
    color: "bg-yellow-500",
    icon: Receipt,
  },
  {
    id: 3,
    title: "تم تحديث بيانات عقار",
    description: "عمارة سنتر",
    user: "أحمد سالم",
    time: "منذ ساعة",
    color: "bg-blue-500",
    icon: Building2,
  },
  {
    id: 4,
    title: "تم إنشاء تقرير",
    description: "التقرير المالي",
    user: "النظام",
    time: "اليوم",
    color: "bg-purple-500",
    icon: FileText,
  },
  {
    id: 5,
    title: "تم إضافة مستخدم",
    description: "Supervisor",
    user: "Admin",
    time: "اليوم",
    color: "bg-pink-500",
    icon: UserPlus,
  },
];

export default function ActivitiesSection() {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#081B33] p-7">

      <div className="mb-8 flex items-center justify-between">

        <div>

          <h2 className="text-2xl font-bold">
            آخر الأنشطة
          </h2>

          <p className="mt-2 text-gray-400">
            جميع العمليات التي تمت داخل النظام
          </p>

        </div>

        <button className="flex items-center gap-2 rounded-xl bg-[#16375D] px-5 py-2 transition hover:bg-[#224D80]">

          عرض الكل

          <ArrowLeft size={18} />

        </button>

      </div>

      <div className="space-y-5">

        {activities.map((activity) => {
          const Icon = activity.icon;

          return (
            <div
              key={activity.id}
              className="flex gap-5 rounded-2xl border border-white/5 bg-[#102947] p-5 transition hover:border-yellow-400/30"
            >

              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl ${activity.color}`}
              >
                <Icon size={24} className="text-white" />
              </div>

              <div className="flex-1">

                <div className="flex items-center justify-between">

                  <h3 className="font-bold text-white">
                    {activity.title}
                  </h3>

                  <span className="text-xs text-gray-500">
                    {activity.time}
                  </span>

                </div>

                <p className="mt-2 text-gray-400">
                  {activity.description}
                </p>

                <p className="mt-3 text-sm text-yellow-400">
                  بواسطة: {activity.user}
                </p>

              </div>

            </div>
          );
        })}

      </div>

    </section>
  );
}