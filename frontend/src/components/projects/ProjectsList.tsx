
import ProjectCard from "./ProjectCard";
import type { Project } from "../../types/project";

type Props = {
  projects: Project[];
};

export default function ProjectsList({
  projects,
}: Props) {
  if (projects.length === 0) {
    return (
      <div
        className="
          relative
          overflow-hidden
          rounded-3xl
          border
          border-dashed
          border-[#C49A3A]/30
          bg-gradient-to-br
          from-[#0B4537]
          via-[#073529]
          to-[#05261F]
          p-10
          text-center
          shadow-lg
          shadow-black/10
          transition-all
          duration-300
          hover:border-[#D4AD4D]/50
          hover:shadow-[#C49A3A]/10
        "
      >
        {/* Background Glow */}
        <div
          className="
            pointer-events-none
            absolute
            -right-16
            -top-16
            h-40
            w-40
            rounded-full
            bg-[#C49A3A]/[0.06]
            blur-3xl
          "
        />

        <div
          className="
            pointer-events-none
            absolute
            -bottom-20
            -left-16
            h-44
            w-44
            rounded-full
            bg-emerald-300/[0.04]
            blur-3xl
          "
        />

        {/* Content */}
        <div className="relative z-10">
          <div
            className="
              mx-auto
              flex
              h-16
              w-16
              items-center
              justify-center
              rounded-2xl
              border
              border-[#C49A3A]/25
              bg-[#C49A3A]/10
              text-[#F6D878]
            "
          >
            <span className="text-2xl">⌂</span>
          </div>

          <h2 className="mt-5 text-xl font-bold text-white">
            لا توجد مشاريع
          </h2>

          <p className="mt-2 text-sm leading-7 text-[#B4CEC5]">
            لا توجد مشاريع تطابق البحث الحالي.
          </p>
        </div>

        {/* Bottom Accent */}
        <div
          className="
            absolute
            bottom-0
            left-1/2
            h-1
            w-24
            -translate-x-1/2
            rounded-full
            bg-gradient-to-r
            from-transparent
            via-[#D4AD4D]
            to-transparent
          "
        />
      </div>
    );
  }

  return (
    <div
      className="
        grid
        grid-cols-1
        gap-8
        lg:grid-cols-2
        2xl:grid-cols-3
      "
    >
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
        />
      ))}
    </div>
  );
}