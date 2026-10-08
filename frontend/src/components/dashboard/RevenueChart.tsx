import { useState } from "react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  Tooltip,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
} from "lucide-react";

const chartData = [
  { month: "يناير", income: 120000, expense: 80000 },
  { month: "فبراير", income: 180000, expense: 95000 },
  { month: "مارس", income: 240000, expense: 120000 },
  { month: "أبريل", income: 290000, expense: 135000 },
  { month: "مايو", income: 360000, expense: 170000 },
  { month: "يونيو", income: 430000, expense: 210000 },
];

const periods = [
  "30 يوم",
  "6 أشهر",
  "سنة",
];

export default function RevenueChart() {
  const [selected, setSelected] = useState("6 أشهر");

  return (
    <section className="rounded-3xl border border-white/10 bg-[#081B33] p-7">

      {/* Header */}

      <div className="mb-8 flex items-center justify-between">

        <div>

          <h2 className="text-2xl font-bold text-white">
            الإيرادات والمصروفات
          </h2>

          <p className="mt-2 text-gray-400">
            تحليل الأداء المالي
          </p>

        </div>

        <div className="flex gap-2">

          {periods.map((period) => (
            <button
              key={period}
              onClick={() => setSelected(period)}
              className={`rounded-xl px-4 py-2 transition ${
                selected === period
                  ? "bg-yellow-400 text-[#081B33] font-bold"
                  : "bg-[#112C4A] text-gray-300 hover:bg-[#17385d]"
              }`}
            >
              {period}
            </button>
          ))}

        </div>

      </div>

      {/* Summary */}

      <div className="mb-8 grid gap-5 md:grid-cols-3">

        <SummaryCard
          title="إجمالي الإيرادات"
          value="4.86M"
          color="text-green-400"
          icon={<TrendingUp size={22} />}
        />

        <SummaryCard
          title="إجمالي المصروفات"
          value="1.42M"
          color="text-red-400"
          icon={<TrendingDown size={22} />}
        />

        <SummaryCard
          title="صافي الربح"
          value="3.44M"
          color="text-yellow-400"
          icon={<Wallet size={22} />}
        />

      </div>

      {/* Legend */}

      <div className="mb-5 flex gap-6 text-sm">

        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-yellow-400" />
          <span className="text-gray-300">الإيرادات</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-blue-500" />
          <span className="text-gray-300">المصروفات</span>
        </div>

      </div>

      {/* Chart */}

      <div className="h-[380px]">

        <ResponsiveContainer width="100%" height="100%">

          <AreaChart data={chartData}>

            <defs>

              <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FACC15" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#FACC15" stopOpacity={0} />
              </linearGradient>

              <linearGradient id="expense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>

            </defs>

            <CartesianGrid
              stroke="#1E3A5C"
              vertical={false}
            />

            <XAxis
              dataKey="month"
              stroke="#94A3B8"
            />

            <Tooltip
              contentStyle={{
                background: "#0E223D",
                border: "none",
                borderRadius: 14,
                color: "#fff",
              }}
            />

            <Area
              type="monotone"
              dataKey="income"
              stroke="#FACC15"
              strokeWidth={3}
              fill="url(#income)"
            />

            <Area
              type="monotone"
              dataKey="expense"
              stroke="#3B82F6"
              strokeWidth={3}
              fill="url(#expense)"
            />

          </AreaChart>

        </ResponsiveContainer>

      </div>

    </section>
  );
}

type SummaryCardProps = {
  title: string;
  value: string;
  color: string;
  icon: React.ReactNode;
};

function SummaryCard({
  title,
  value,
  color,
  icon,
}: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#102947] p-5">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-sm text-gray-400">
            {title}
          </p>

          <h3 className={`mt-3 text-3xl font-bold ${color}`}>
            {value}
          </h3>

        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5">
          {icon}
        </div>

      </div>

    </div>
  );
}