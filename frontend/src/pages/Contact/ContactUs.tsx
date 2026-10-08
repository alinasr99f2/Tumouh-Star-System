import { Headset, Mail, MessageCircle, PhoneCall } from "lucide-react";

export default function ContactUs() {
  const items = [
    ["البريد الإلكتروني", Mail, "راسل فريق الدعم"],
    ["واتساب", MessageCircle, "تواصل معنا عبر واتساب"],
    ["اتصال مباشر", PhoneCall, "تواصل مع فريق الدعم"],
  ] as const;

  return (
    <div dir="rtl" className="min-h-full w-full p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 rounded-3xl border border-sky-400/20 bg-gradient-to-br from-sky-400/10 via-[#082b27]/80 to-[#071d25]/95 p-6 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl border border-sky-300/30 bg-sky-400/10 text-sky-100">
            <Headset size={42} />
          </div>
          <h1 className="text-3xl font-black text-white">تواصل معنا</h1>
          <p className="mt-2 text-gray-400">
            تواصل مع فريق عقاري سمارت للحصول على المساعدة والدعم.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {items.map(([title, Icon, description]) => (
            <div
              key={title}
              className="rounded-3xl border border-sky-400/20 bg-white/[0.03] p-6 text-center shadow-xl backdrop-blur-xl"
            >
              <Icon className="mx-auto mb-4 text-sky-200" size={36} />
              <h2 className="text-xl font-black text-white">{title}</h2>
              <p className="mt-2 text-sm text-gray-400">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
