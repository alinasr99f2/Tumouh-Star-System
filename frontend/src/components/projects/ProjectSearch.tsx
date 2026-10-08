
import { Search } from "lucide-react";

type ProjectSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function ProjectSearch({
  value,
  onChange,
}: ProjectSearchProps) {
  return (
    <div className="group relative">
      <Search
        size={20}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ABDB0] transition-colors duration-300 group-focus-within:text-[#D4AD4D]"
      />

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="ابحث عن مشروع..."
        className="
          w-full rounded-2xl
          border border-[#C49A3A]/25
          bg-gradient-to-r from-[#0B4537] via-[#073529] to-[#05261F]
          py-3 pl-12 pr-4
          text-white placeholder:text-[#8FAFA4]
          shadow-lg shadow-black/10
          outline-none
          transition-all duration-300
          hover:border-[#C49A3A]/45
          focus:border-[#D4AD4D]
          focus:ring-2 focus:ring-[#D4AD4D]/20
          focus:shadow-lg focus:shadow-[#C49A3A]/10
        "
      />
    </div>
  );
}