import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (funding: any) => void;
  selectedAccountId?: number | null;
};

type Account = {
  id: number;
  name: string;
  balance: number;
};

export default function FundingModal({
  open,
  onClose,
  onSave,
  selectedAccountId,
}: Props) {
  const today = new Date().toLocaleDateString("en-CA");

  const [entryDate] = useState(today);
  const [fundingDate, setFundingDate] = useState(today);

  const [accountId, setAccountId] = useState("");
  const [voucherNo, setVoucherNo] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [description, setDescription] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  const [accountList, setAccountList] = useState<Account[]>([]);

  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);

  // تحميل العهد من Supabase
  useEffect(() => {
    if (!open) return;

    const loadAccounts = async () => {
      setLoadingData(true);

      try {
        const { data, error } = await supabase
          .from("accounts")
          .select("id, name, balance")
          .order("id", { ascending: true });

        if (error) {
          console.error("خطأ تحميل العهد:", error);

          alert(
            `تعذر تحميل العهد:\n${error.message}`
          );

          return;
        }

        setAccountList(data || []);
        if (selectedAccountId !== null && selectedAccountId !== undefined) {
  setAccountId(String(selectedAccountId));
}

        console.log("ACCOUNTS:", data);
      } catch (error) {
        console.error("خطأ تحميل البيانات:", error);

        alert("حدث خطأ أثناء تحميل العهد.");
      } finally {
        setLoadingData(false);
      }
    };

    loadAccounts();
  }, [open]);

  const handleSave = async () => {
    // التأكد من اختيار العهدة
    if (!accountId) {
      alert("من فضلك اختر العهدة");
      return;
    }

    // التأكد من إدخال المبلغ
    if (!amount || Number(amount) <= 0) {
      alert("من فضلك أدخل مبلغ التغذية");
      return;
    }

    // التأكد من طريقة الدفع
    if (!paymentMethod) {
      alert("من فضلك اختر طريقة الدفع");
      return;
    }

    setSaving(true);

    try {
      const numericAmount = Number(amount);

      // تجهيز الوصف النهائي
      const finalDescription = voucherNo
        ? `رقم المرجع: ${voucherNo}${
            description ? ` - ${description}` : ""
          }`
        : description;

      // ==============================
// 1️⃣ رفع المرفق إن وجد
// ==============================

let attachmentUrl: string | null = null;

if (attachmentFile) {
  const fileExt = attachmentFile.name.split(".").pop();

  const fileName = `${Date.now()}-${Math.random()
    .toString(36)
    .substring(2)}.${fileExt}`;

  const filePath = `funding/${Number(accountId)}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("funding-attachments")
    .upload(filePath, attachmentFile);

  if (uploadError) {
    console.error(
      "خطأ رفع المرفق:",
      uploadError
    );

    alert(
      `حدث خطأ أثناء رفع المرفق:\n${uploadError.message}`
    );

    return;
  }

  // نحفظ مسار الملف فقط لأن الـ Bucket Private
attachmentUrl = filePath;
}

// ==============================
// 2️⃣ تسجيل التغذية
// ==============================

const { data: fundingData, error: fundingError } =
  await supabase
    .from("funding")
    .insert({
      account_id: Number(accountId),
      amount: numericAmount,
      funding_date: fundingDate,
      source: paymentMethod,
      description: finalDescription,
      attachment_url: attachmentUrl,
    })
    .select()
    .single();

if (fundingError) {
  console.error(
    "خطأ حفظ التغذية:",
    fundingError
  );

  alert(
    `حدث خطأ أثناء حفظ التغذية:\n${fundingError.message}`
  );

  return;
}

      // ==============================
      // 3️⃣ نجاح العملية
      // ==============================

      console.log(
        "تم حفظ التغذية:",
        fundingData
      );

      onSave(fundingData);

      // تنظيف النموذج
      setFundingDate(today);
      setAccountId("");
      setVoucherNo("");
      setAmount("");
      setPaymentMethod("");
      setDescription("");

      alert(
        "تم حفظ التغذية المالية بنجاح ✅"
      );

      onClose();

    } catch (error) {
      console.error(
        "خطأ غير متوقع:",
        error
      );

      alert(
        "حدث خطأ غير متوقع أثناء حفظ التغذية."
      );
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-4 md:p-6">

      <div className="my-3 w-full max-w-[950px] max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl sm:rounded-3xl border border-white/10 bg-[#081B33] p-4 pb-5 sm:p-6 sm:pb-6 md:p-8 md:pb-8 shadow-2xl">

        {/* Header */}

        <div className="mb-5 sm:mb-8 flex items-center justify-between gap-3">

          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
            إضافة تغذية مالية
          </h2>

          <button
            onClick={onClose}
            disabled={saving}
            className="text-2xl text-gray-400 hover:text-red-400"
          >
            ✕
          </button>

        </div>

        {/* Form */}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">

          {/* تاريخ الإدخال */}

          <Input
            label="تاريخ الإدخال"
            type="date"
            value={entryDate}
            readOnly
          />

          {/* تاريخ التغذية */}

          <Input
            label="تاريخ التغذية"
            type="date"
            value={fundingDate}
            onChange={setFundingDate}
          />

          {/* العهدة */}

          <Select
            label="العهدة"
            value={accountId}
            onChange={setAccountId}
            disabled={loadingData}
            options={accountList.map(
              (account) => ({
                value: account.id,
                label: `${account.name} (${Number(
                  account.balance || 0
                ).toLocaleString()} ريال)`,
              })
            )}
          />

          {/* رقم المرجع */}

          <Input
            label="رقم المرجع"
            value={voucherNo}
            onChange={setVoucherNo}
          />

          {/* مبلغ التغذية */}

          <Input
            label="مبلغ التغذية"
            type="number"
            value={amount}
            onChange={setAmount}
          />

          {/* طريقة الدفع */}

          <Select
            label="طريقة الدفع"
            value={paymentMethod}
            onChange={setPaymentMethod}
            options={[
              {
                value: "cash",
                label: "💵 نقدًا",
              },
              {
                value: "bank",
                label: "🏦 تحويل بنكي",
              },
              {
                value: "card",
                label: "💳 بطاقة",
              },
            ]}
          />

        </div>

        {/* Description */}

        <div className="mt-4 sm:mt-6">

          <label className="mb-2 block text-sm text-gray-300">
            الوصف
          </label>

          <textarea
            rows={4}
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
            className="w-full min-w-0 rounded-xl border border-white/10 bg-[#102947] p-3 sm:p-4 text-white outline-none focus:border-yellow-400"
          />

        </div>

        {/* Attachment */}

        <div className="mt-4 sm:mt-6">

          <label className="mb-2 block text-sm text-gray-300">
            إرفاق مستند
          </label>

          <input
  type="file"
  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
  onChange={(e) => {
    setAttachmentFile(e.target.files?.[0] ?? null);
  }}
  className="block w-full min-w-0 rounded-xl border border-white/10 bg-[#102947] p-3 text-white text-sm sm:text-base"
/>

{attachmentFile && (
  <p className="mt-2 text-sm text-sky-400">
    📎 {attachmentFile.name}
  </p>
)}

        </div>

        {/* Buttons */}

        <div className="mt-6 sm:mt-8 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-4">

          <button
            onClick={onClose}
            disabled={saving}
            className="w-full sm:w-auto rounded-xl border border-white/10 px-6 py-3 text-white hover:bg-white/5 text-center"
          >
            إلغاء
          </button>

          <button
            onClick={handleSave}
            disabled={saving || loadingData}
            className="w-full sm:w-auto rounded-xl bg-yellow-400 px-8 py-3 font-bold text-[#081B33] hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-50 text-center"
          >
            {saving
              ? "جاري الحفظ..."
              : "حفظ التغذية"}
          </button>

        </div>

      </div>

    </div>
  );
}


/* =========================
   Input
========================= */

type InputProps = {
  label: string;
  type?: string;
  value?: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
};

function Input({
  label,
  type = "text",
  value = "",
  readOnly = false,
  onChange,
}: InputProps) {
  return (
    <div>

      <label className="mb-2 block text-sm text-gray-300">
        {label}
      </label>

      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(e) =>
          onChange?.(e.target.value)
        }
        className="h-11 sm:h-12 w-full min-w-0 rounded-xl border border-white/10 bg-[#102947] px-3 sm:px-4 text-sm sm:text-base text-white outline-none focus:border-yellow-400"
      />

    </div>
  );
}


/* =========================
   Select
========================= */

type SelectOption = {
  value: number | string;
  label: string;
};

type SelectProps = {
  label: string;
  value?: string;
  options?: SelectOption[];
  onChange?: (value: string) => void;
  disabled?: boolean;
};

function Select({
  label,
  value = "",
  options = [],
  onChange,
  disabled = false,
}: SelectProps) {
  return (
    <div>

      <label className="mb-2 block text-sm text-gray-300">
        {label}
      </label>

      <select
        value={value}
        disabled={disabled}
        onChange={(e) =>
          onChange?.(e.target.value)
        }
        className="h-12 w-full rounded-xl border border-white/10 bg-[#102947] px-4 text-white outline-none focus:border-yellow-400 disabled:opacity-50"
      >

        <option value="">
          {disabled
            ? "جاري التحميل..."
            : "اختر..."}
        </option>

        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}

      </select>

    </div>
  );
}