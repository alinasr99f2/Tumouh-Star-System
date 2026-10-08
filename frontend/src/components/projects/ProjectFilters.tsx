
const filters = [
  "الكل",
  "قيد التنفيذ",
  "مكتمل",
  "متوقف",
] as const;

type Filter = (typeof filters)[number];

type ProjectFiltersProps = {
  active: Filter;
  onChange: (filter: Filter) => void;
};

export default function ProjectFilters({
  active,
  onChange,
}: ProjectFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {filters.map((filter) => {
        const isActive = active === filter;

        return (
          <button
            key={filter}
            onClick={() => onChange(filter)}
            className={`
              rounded-xl
              border
              px-5 py-2
              font-semibold
              shadow-sm
              transition-all duration-300
              ${
                isActive
                  ? "border-[#D4AD4D] bg-gradient-to-r from-[#D4AD4D] to-[#B88B2D] text-[#06261F] shadow-md shadow-[#C49A3A]/20 hover:from-[#E2C36B] hover:to-[#C49A3A]"
                  : "border-[#C49A3A]/25 bg-gradient-to-r from-[#0B4537] to-[#05261F] text-[#BBD2C8] hover:-translate-y-0.5 hover:border-[#D4AD4D] hover:bg-[#0B4537] hover:text-[#F6D878] hover:shadow-md hover:shadow-[#C49A3A]/10"
              }
            `}
          >
            {filter}
          </button>
        );
      })}
    </div>
  );
}