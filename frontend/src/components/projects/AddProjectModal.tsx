import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function AddProjectModal({
  open,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">

      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#081B33] p-8">

        <div className="mb-8 flex items-center justify-between">

          <h2 className="text-3xl font-bold text-white">
            إضافة مشروع جديد
          </h2>

          <button
            onClick={onClose}
            className="rounded-xl bg-red-500/20 p-2 text-red-400 hover:bg-red-500/30"
          >
            <X size={22}/>
          </button>

        </div>

        <div className="grid gap-5 md:grid-cols-2">

          <input
            placeholder="اسم المشروع"
            className="rounded-xl bg-[#102947] p-4 text-white outline-none"
          />

          <input
            placeholder="المدينة"
            className="rounded-xl bg-[#102947] p-4 text-white outline-none"
          />

          <input
            type="number"
            placeholder="عدد الوحدات"
            className="rounded-xl bg-[#102947] p-4 text-white outline-none"
          />

          <input
            type="number"
            placeholder="نسبة الإنجاز"
            className="rounded-xl bg-[#102947] p-4 text-white outline-none"
          />

          <select className="rounded-xl bg-[#102947] p-4 text-white outline-none">

            <option>قيد التنفيذ</option>

            <option>مكتمل</option>

            <option>متوقف</option>

          </select>

        </div>

        <div className="mt-8 flex justify-end gap-4">

          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 px-6 py-3 text-white"
          >
            إلغاء
          </button>

          <button className="rounded-xl bg-yellow-400 px-6 py-3 font-bold text-[#081B33]">
            حفظ المشروع
          </button>

        </div>

      </div>

    </div>
  );
}