
import DashboardHero from "../../components/dashboard/DashboardHero";
import StatsCards from "../../components/dashboard/StatsCards";
import ProjectsSection from "../../components/dashboard/ProjectsSection";

export default function CompanyDashboard() {
  return (
    <div className="aqar-home-page relative min-h-screen overflow-hidden">
      {/* ========================= */}
      {/* محتوى لوحة التحكم */}
      {/* ========================= */}

      <div className="relative z-10 space-y-8 px-3 pb-8 sm:px-5 lg:px-6">
        {/* الترحيب */}
        <DashboardHero />

        {/* الإحصائيات الرئيسية */}
        <StatsCards />

        {/* المشاريع النشطة */}
        <ProjectsSection />
      </div>
    </div>
  );
}