
import {
  Building2,
  MapPin,
  CalendarDays,
} from "lucide-react";

import { Link } from "react-router-dom";

import type { Project } from "../../types/project";

type Props = {
  project: Project;
};

export default function ProjectCard({
  project,
}: Props) {
  const statusColor =
    project.status === "مكتمل"
      ? "bg-emerald-400/10 text-emerald-300 border-emerald-400/25"
      : project.status === "متوقف"
      ? "bg-red-400/10 text-red-300 border-red-400/25"
      : "bg-[#C49A3A]/10 text-[#F6D878] border-[#C49A3A]/30";

  return (
    <Link
      to={`/projects/${project.id}`}
      className="
        group
        relative
        block
        min-h-[300px]
        overflow-hidden
        rounded-3xl
        border
        border-[#C49A3A]/20
        bg-gradient-to-br
        from-[#0B4537]
        via-[#073529]
        to-[#05261F]
        p-7
        text-center
        shadow-lg
        shadow-black/10
        transition-all
        duration-300
        hover:-translate-y-1
        hover:border-[#D4AD4D]/60
        hover:shadow-2xl
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
          bg-[#C49A3A]/[0.04]
          blur-3xl
          transition-all
          duration-500
          group-hover:bg-[#C49A3A]/[0.09]
        "
      />

      {/* Watermark */}
      <Building2
        size={210}
        strokeWidth={1}
        className="
          pointer-events-none
          absolute
          -bottom-16
          -left-10
          rotate-12
          text-white/[0.025]
          transition-all
          duration-500
          group-hover:scale-110
          group-hover:text-[#D4AD4D]/[0.06]
        "
      />

      {/* Top Section */}
      <div className="relative z-10 flex flex-col items-center gap-4">
        {/* Main Icon */}
        <div
          className="
            flex
            h-16
            w-16
            items-center
            justify-center
            rounded-2xl
            border
            border-[#C49A3A]/30
            bg-[#C49A3A]/10
            shadow-inner
            transition-transform
            duration-300
            group-hover:scale-105
          "
        >
          <Building2
            size={32}
            className="text-[#F6D878]"
          />
        </div>

        {/* Status */}
        <span
          className={`
            rounded-full
            border
            px-4
            py-1.5
            text-sm
            font-bold
            ${statusColor}
          `}
        >
          {project.status}
        </span>
      </div>

      {/* Project Name */}
      <div className="relative z-10 mt-5">
        <h3
          className="
            text-2xl
            font-bold
            leading-relaxed
            text-white
          "
        >
          {project.name}
        </h3>

        <div
          className="
            mt-2
            flex
            items-center
            justify-center
            gap-2
            text-[#B4CEC5]
          "
        >
          <MapPin
            size={17}
            className="text-[#D4AD4D]"
          />

          <span>{project.city}</span>
        </div>
      </div>

      {/* Progress Section */}
      <div className="relative z-10 mt-8">
        <div
          className="
            mb-3
            flex
            items-center
            justify-between
            text-sm
            text-[#B4CEC5]
          "
        >
          <span>نسبة الإنجاز</span>

          <span className="font-bold text-[#F6D878]">
            {project.progress}%
          </span>
        </div>

        {/* Progress Background */}
        <div
          className="
            h-3
            overflow-hidden
            rounded-full
            border
            border-white/[0.04]
            bg-[#123D32]
          "
        >
          {/* Progress Value */}
          <div
            className="
              h-full
              rounded-full
              bg-gradient-to-r
              from-[#A9822F]
              via-[#D4AD4D]
              to-[#F6D878]
              shadow-[0_0_12px_rgba(212,173,77,0.25)]
              transition-all
              duration-500
            "
            style={{
              width: `${project.progress}%`,
            }}
          />
        </div>
      </div>

      {/* Bottom Information */}
      <div
        className="
          relative
          z-10
          mt-8
          flex
          items-center
          justify-between
          border-t
          border-white/10
          pt-5
          text-[#B4CEC5]
        "
      >
        {/* Units */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-[#8EADA2]">
            الوحدات
          </span>

          <span className="font-semibold text-white">
            {project.units} وحدة
          </span>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-white/10" />

        {/* Year */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-[#8EADA2]">
            السنة
          </span>

          <div className="flex items-center gap-2">
            <CalendarDays
              size={16}
              className="text-[#D4AD4D]"
            />

            <span className="font-semibold text-white">
              2026
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Accent */}
      <div
        className="
          absolute
          bottom-0
          left-1/2
          h-1
          w-0
          -translate-x-1/2
          rounded-full
          bg-gradient-to-r
          from-[#A9822F]
          to-[#F6D878]
          transition-all
          duration-300
          group-hover:w-1/3
        "
      />
    </Link>
  );
}