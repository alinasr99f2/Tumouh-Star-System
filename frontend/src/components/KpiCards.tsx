import type { Villa } from "../data/villas";

type KpiCardsProps = {
  villas: Villa[];
};

function KpiCards({ villas }: KpiCardsProps) {

  const totalVillas = villas.length;

  const largeVillas = villas.filter(
    (villa) => villa.category === "Large"
  ).length;

  const mediumVillas = villas.filter(
    (villa) => villa.category === "Medium"
  ).length;

  const smallVillas = villas.filter(
    (villa) => villa.category === "Small"
  ).length;


  // =========================
  // AREAS
  // =========================

  const areas = villas.map(
    (villa) => villa.plotArea
  );

  const largestArea =
    areas.length > 0
      ? Math.max(...areas)
      : 0;

  const smallestArea =
    areas.length > 0
      ? Math.min(...areas)
      : 0;

  const totalArea = areas.reduce(
    (total, area) => total + area,
    0
  );

  const averageArea =
    totalVillas > 0
      ? totalArea / totalVillas
      : 0;


  // =========================
  // MONEY
  // =========================

  const totalEstimatedCost = villas.reduce(
    (total, villa) =>
      total + villa.estimatedCost,
    0
  );

  const totalActualCost = villas.reduce(
    (total, villa) =>
      total + villa.actualCost,
    0
  );

  const totalSellingPrice = villas.reduce(
    (total, villa) =>
      total + villa.sellingPrice,
    0
  );


  // =========================
  // STATUS
  // =========================

  const notStarted = villas.filter(
    (villa) =>
      villa.status === "Not Started"
  ).length;

  const underConstruction = villas.filter(
    (villa) =>
      villa.status === "Under Construction"
  ).length;

  const finishing = villas.filter(
    (villa) =>
      villa.status === "Finishing"
  ).length;

  const completed = villas.filter(
    (villa) =>
      villa.status === "Completed"
  ).length;

  const reserved = villas.filter(
    (villa) =>
      villa.status === "Reserved"
  ).length;

  const sold = villas.filter(
    (villa) =>
      villa.status === "Sold"
  ).length;

  const rented = villas.filter(
    (villa) =>
      villa.status === "Rented"
  ).length;

  const maintenance = villas.filter(
    (villa) =>
      villa.status === "Maintenance"
  ).length;


  // =========================
  // SALES %
  // =========================

  const salesPercentage =
    totalVillas > 0
      ? (sold / totalVillas) * 100
      : 0;


  // =========================
  // KPI DATA
  // =========================

  const kpis = [

    {
      title: "إجمالي الفلل",
      value: totalVillas,
      icon: "◆",
      className: "total",
    },

    {
      title: "الفلل الكبيرة",
      value: largeVillas,
      icon: "L",
      className: "large-kpi",
    },

    {
      title: "الفلل المتوسطة",
      value: mediumVillas,
      icon: "M",
      className: "medium-kpi",
    },

    {
      title: "الفلل الصغيرة",
      value: smallVillas,
      icon: "S",
      className: "small-kpi",
    },

    {
      title: "إجمالي التكلفة التقديرية",
      value: `${totalEstimatedCost.toLocaleString()} ريال`,
      icon: "◈",
      className: "money",
    },

    {
      title: "التكلفة الفعلية",
      value: `${totalActualCost.toLocaleString()} ريال`,
      icon: "◉",
      className: "money",
    },

    {
      title: "إجمالي قيمة البيع",
      value: `${totalSellingPrice.toLocaleString()} ريال`,
      icon: "↗",
      className: "sales",
    },

    {
      title: "لم تبدأ",
      value: notStarted,
      icon: "○",
      className: "not-started",
    },

    {
      title: "تحت التنفيذ",
      value: underConstruction,
      icon: "⚒",
      className: "construction",
    },

    {
      title: "مرحلة التشطيبات",
      value: finishing,
      icon: "◇",
      className: "finishing",
    },

    {
      title: "مكتملة",
      value: completed,
      icon: "✓",
      className: "completed",
    },

    {
      title: "محجوزة",
      value: reserved,
      icon: "◆",
      className: "reserved",
    },

    {
      title: "مباعة",
      value: sold,
      icon: "✓",
      className: "sold",
    },

    {
      title: "مؤجرة",
      value: rented,
      icon: "⌂",
      className: "rented",
    },

    {
      title: "تحت الصيانة",
      value: maintenance,
      icon: "⚙",
      className: "maintenance",
    },

    {
      title: "أكبر مساحة",
      value: `${largestArea.toLocaleString()} م²`,
      icon: "↗",
      className: "area",
    },

    {
      title: "أصغر مساحة",
      value: `${smallestArea.toLocaleString()} م²`,
      icon: "↘",
      className: "area",
    },

    {
      title: "متوسط المساحة",
      value: `${averageArea.toFixed(2)} م²`,
      icon: "□",
      className: "area",
    },

    {
      title: "نسبة البيع",
      value: `${salesPercentage.toFixed(1)}%`,
      icon: "%",
      className: "percentage",
    },

  ];


  return (

    <section className="kpi-section">

      <div className="section-heading">

        <div>

          <span className="section-label">
            نظرة عامة
          </span>

          <h2>
            مؤشرات مشروع فلل تبوك
          </h2>

        </div>


        <div className="villa-count-badge">
          {totalVillas} فيلا
        </div>

      </div>


      <div className="kpi-grid">

        {kpis.map((kpi) => (

          <div
            className={`kpi-card ${kpi.className}`}
            key={kpi.title}
          >

            <div className="kpi-icon">
              {kpi.icon}
            </div>

            <div className="kpi-content">

              <span className="kpi-title">
                {kpi.title}
              </span>

              <strong className="kpi-value">
                {kpi.value}
              </strong>

            </div>

          </div>

        ))}

      </div>

    </section>

  );

}

export default KpiCards;