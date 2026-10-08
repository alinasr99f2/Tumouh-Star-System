import { useMemo, useState } from "react";
import ProjectSearch from "../../components/projects/ProjectSearch";
import ProjectFilters from "../../components/projects/ProjectFilters";
import ProjectStats from "../../components/projects/ProjectStats";
import ProjectsList from "../../components/projects/ProjectsList";
import AddProjectModal from "../../components/projects/AddProjectModal";

import { projects as projectsData } from "../../data/projects";

import type { Project, ProjectStatus } from "../../types/project";
import { WalletCards } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePermissions } from "../../utils/permissions";

type Filter = "الكل" | ProjectStatus;

export default function Projects() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canAddProject = hasPermission("projects_add");
  const canViewFinancial = hasPermission("financial_view");

  const [projects] = useState<Project[]>(projectsData);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("الكل");
  const [openModal, setOpenModal] = useState(false);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch =
        project.name.toLowerCase().includes(search.toLowerCase()) ||
        project.city.toLowerCase().includes(search.toLowerCase());

      const matchesFilter =
        filter === "الكل" || project.status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [projects, search, filter]);

  return (
    <>
      <div className="space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              المشاريع
            </h1>

            <p className="mt-2 text-gray-400">
              إدارة جميع مشاريع شركة طموح ستار.
            </p>
          </div>

          {canAddProject && (
          <button
            onClick={() => setOpenModal(true)}
            className="
              rounded-xl
              bg-yellow-400
              px-6
              py-3
              font-bold
              text-[#081B33]
              transition
              hover:bg-yellow-500
            "
          >
            + مشروع جديد
          </button>
          )}
        </div>

        <ProjectSearch
          value={search}
          onChange={setSearch}
        />

        <ProjectFilters
          active={filter}
          onChange={setFilter}
        />

        <ProjectStats
          total={filteredProjects.length}
          active={
            filteredProjects.filter(
              (p) => p.status === "قيد التنفيذ"
            ).length
          }
          completed={
            filteredProjects.filter(
              (p) => p.status === "مكتمل"
            ).length
          }
          stopped={
            filteredProjects.filter(
              (p) => p.status === "متوقف"
            ).length
          }
        />

        {/* المركز المالي للمشاريع */}
        {canViewFinancial && (
        <div
          onClick={() => navigate("/projects/financial")}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              navigate("/projects/financial");
            }
          }}
          className="
            group
            relative
            cursor-pointer
            overflow-hidden
            rounded-3xl
            border
            border-yellow-400/50
            bg-gradient-to-br
            from-[#3d3820]
            via-[#28351f]
            to-[#0b4034]
            p-5
            shadow-lg
            transition-all
            duration-300
            hover:-translate-y-1
            hover:border-yellow-300
            hover:shadow-xl
            hover:shadow-yellow-500/20
            focus:outline-none
            focus:ring-2
            focus:ring-yellow-400
            sm:p-6
          "
        >
          <div
            className="
              pointer-events-none
              absolute
              -right-16
              -top-16
              h-40
              w-40
              rounded-full
              bg-yellow-400/10
              blur-3xl
            "
          />

          <div className="relative flex min-h-[235px] flex-col items-center text-center">

            <div
              className="
                flex
                h-20
                w-20
                items-center
                justify-center
                rounded-2xl
                border
                border-yellow-400/40
                bg-yellow-500/10
                text-yellow-300
                shadow-lg
                transition
                duration-300
                group-hover:scale-105
                group-hover:bg-yellow-500/20
              "
            >
              <WalletCards size={42} strokeWidth={1.8} />
            </div>

            <h2 className="mt-4 text-2xl font-black text-white">
              المركز المالي
            </h2>

            <p className="mt-2 max-w-[280px] text-sm leading-6 text-gray-300">
              إدارة المصروفات والأرباح والحسابات المالية الخاصة بالمشاريع
            </p>

            <div
              className="
                mt-auto
                flex
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                border
                border-yellow-400
                bg-transparent
                py-2.5
                text-sm
                font-bold
                text-white
                transition
                duration-300
                group-hover:bg-yellow-400
                group-hover:text-[#062B24]
                sm:w-[220px]
              "
            >
              <span>الدخول إلى القسم</span>
              <span className="text-lg transition-transform duration-300 group-hover:-translate-x-1">
                ←
              </span>
            </div>
          </div>
        </div>
        )}

        <ProjectsList
          projects={filteredProjects}
        />
      </div>

      <AddProjectModal
        open={openModal}
        onClose={() => setOpenModal(false)}
      />
    </>
  );
}
