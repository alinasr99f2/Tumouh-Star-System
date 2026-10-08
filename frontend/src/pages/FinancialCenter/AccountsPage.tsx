import { useState } from "react";
import {
  RefreshCw,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  ChevronDown,
} from "lucide-react";


const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const downloadBlob = (content: BlobPart, fileName: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const getAccountFundingRows = (funding: any[], accountId: number) =>
  funding
    .filter((item) => Number(item?.account_id) === Number(accountId))
    .slice()
    .sort((a, b) => {
      const ad = new Date(a?.funding_date ?? a?.date ?? a?.created_at ?? 0).getTime();
      const bd = new Date(b?.funding_date ?? b?.date ?? b?.created_at ?? 0).getTime();
      return bd - ad || Number(b?.id ?? 0) - Number(a?.id ?? 0);
    });

const formatExportDate = (value: any) => {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("ar-SA");
};

const getExportRef = (item: any) =>
  item?.reference_number ?? item?.reference ?? item?.ref_number ?? item?.voucher_number ?? item?.id ?? "-";
const getExportPayment = (item: any) => item?.payment_method ?? item?.method ?? item?.source ?? "-";
const getExportDescription = (item: any) => item?.description ?? item?.notes ?? "-";

type Account = {
  id: number;
  name: string;
  type: string;
  currentBalance: number;
  totalFunding: number;
  totalExpenses: number;
  operationsCount: number;
};

type Props = {
  accounts: Account[];
  funding: any[];

  // إضافة عهدة جديدة
onAddAccount: () => void;

// تعديل العهدة
onEditAccount: (account: Account) => void;

// حذف العهدة
onDeleteAccount: (account: Account) => void;

// فتح صفحة التغذية مع اختيار العهدة تلقائيًا
onAddFunding: (accountId: number) => void;

// فتح ملخص حركات العهدة
onViewAccount: (account: Account) => void;
};
export default function AccountsPage({
  accounts,
  funding,
  onAddAccount,
  onEditAccount,
  onDeleteAccount,
  onAddFunding,
  onViewAccount,
}: Props) {
  const [selectedAccountForView, setSelectedAccountForView] =
    useState<Account | null>(null);
  const [openExportAccountId, setOpenExportAccountId] = useState<number | null>(null);

  const openFundingModal = (account: Account) => {
    setSelectedAccountForView(account);
    onViewAccount(account);
  };


  const closeFundingModal = () =>
    setSelectedAccountForView(null);

  const exportAccount = (account: Account, mode: "excel" | "print") => {
    const rows = getAccountFundingRows(funding, account.id);
    const title = `تقرير عهدة - ${account.name}`;

    if (mode === "excel") {
      const body = rows.map((item) => `
        <tr>
          <td>${escapeHtml(formatExportDate(item?.created_at))}</td>
          <td>${escapeHtml(formatExportDate(item?.funding_date ?? item?.date))}</td>
          <td>${escapeHtml(account.name)}</td>
          <td>${escapeHtml(getExportRef(item))}</td>
          <td>${Number(item?.amount ?? 0)}</td>
          <td>${escapeHtml(getExportPayment(item))}</td>
          <td>${escapeHtml(getExportDescription(item))}</td>
        </tr>`).join("");

      const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;direction:rtl}h1{text-align:center}table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:8px;text-align:right}th{background:#e8eef7}</style></head><body><h1>${escapeHtml(title)}</h1><table><thead><tr><th>تاريخ الإدخال</th><th>تاريخ التغذية</th><th>العهدة</th><th>رقم المرجع</th><th>مبلغ التغذية</th><th>طريقة الدفع</th><th>الوصف</th></tr></thead><tbody>${body}</tbody></table></body></html>`;
      downloadBlob(html, `${title}.xls`, "application/vnd.ms-excel;charset=utf-8");
    } else {
      const body = rows.map((item) => `
        <tr>
          <td>${escapeHtml(formatExportDate(item?.created_at))}</td>
          <td>${escapeHtml(formatExportDate(item?.funding_date ?? item?.date))}</td>
          <td>${escapeHtml(account.name)}</td>
          <td>${escapeHtml(getExportRef(item))}</td>
          <td>${Number(item?.amount ?? 0).toLocaleString()} ريال</td>
          <td>${escapeHtml(getExportPayment(item))}</td>
          <td>${escapeHtml(getExportDescription(item))}</td>
        </tr>`).join("");

      const win = window.open("", "_blank", "width=1200,height=800");
      if (!win) {
        alert("يرجى السماح بالنوافذ المنبثقة حتى يمكن إنشاء التقرير.");
        return;
      }
      win.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;padding:25px;color:#111}h1{text-align:center}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #aaa;padding:7px;text-align:right}th{background:#eee}</style></head><body><h1>${escapeHtml(title)}</h1><p style="text-align:center">الرصيد الحالي: ${Number(account.currentBalance ?? 0).toLocaleString()} ريال</p><table><thead><tr><th>تاريخ الإدخال</th><th>تاريخ التغذية</th><th>العهدة</th><th>رقم المرجع</th><th>مبلغ التغذية</th><th>طريقة الدفع</th><th>الوصف</th></tr></thead><tbody>${body}</tbody></table><script>window.onload=function(){window.print();}</script></body></html>`);
      win.document.close();
    }
    setOpenExportAccountId(null);
  };

  const getFundingDate = (item: any) => {
    const value =
      item?.funding_date ??
      item?.date ??
      item?.created_at;

    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString("ar-SA");
  };

  const getFundingSource = (item: any) =>
    item?.source ??
    item?.payment_method ??
    item?.method ??
    "-";

  const getFundingDescription = (item: any) =>
    item?.description ??
    item?.notes ??
    item?.reference ??
    "-";

  return (
    <div className="space-y-8">

      {/* ================= Header ================= */}

      <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">

        <div>
          <h2 className="text-3xl font-bold text-white">
            العهد المالية
          </h2>

          <p className="mt-2 text-base text-gray-400">
            إدارة جميع العهد والأرصدة والحركات المالية.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">

          {/* إجمالي العهد */}

          <div
            className="
              flex items-center gap-3
              rounded-2xl
              border border-yellow-400/20
              bg-[#081B33]
              px-5 py-3
            "
          >
            <div
              className="
                flex h-11 w-11
                items-center justify-center
                rounded-xl
                border border-yellow-400/30
                bg-yellow-400/10
                text-2xl
              "
            >
              💼
            </div>

            <div>
              <p className="text-xs text-gray-400">
                إجمالي العهد
              </p>

              <p className="text-xl font-bold text-white">
                {accounts.length}
              </p>
            </div>
          </div>

          {/* تحديث */}

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-2xl
              border
              border-white/10
              bg-[#102947]
              text-gray-300
              transition-all
              hover:border-cyan-400/40
              hover:bg-cyan-500/10
              hover:text-cyan-400
            "
            title="تحديث البيانات"
          >
            <RefreshCw size={20} />
          </button>

          {/* إضافة عهدة */}

          <button
            type="button"
            onClick={onAddAccount}
            className="
              flex min-h-14 w-full items-center justify-center gap-2 sm:w-auto
              rounded-2xl
              border border-green-400/30
              bg-green-500/10
              px-5
              text-base font-bold
              text-green-400
              transition-all
              hover:border-green-400
              hover:bg-green-500
              hover:text-white
            "
          >
            <span className="text-2xl font-bold leading-none">
              +
            </span>

            إضافة عهدة
          </button>

        </div>

      </div>


    {/* ================= Accounts ================= */}

{accounts.length > 0 && (
  <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">

    {accounts.map((account) => (

      <div
        key={account.id}
        className="
          group
          overflow-hidden
          rounded-3xl
          border border-white/10
          bg-[#081B33]
          shadow-lg
          transition-all
          duration-300
          hover:-translate-y-1
          hover:border-yellow-400/30
          hover:shadow-2xl
        "
      >

        <div className="p-4 sm:p-6">

          {/* ================= Card Header ================= */}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

            <div className="min-w-0 flex-1">

              <p className="mb-2 text-sm font-medium text-gray-400">
                عهدة مالية
              </p>

              <h3
                className="
                  text-xl
                  font-extrabold
                  leading-relaxed
                  text-white
                "
              >
                {account.name}
              </h3>

            </div>

            <div className="flex flex-wrap items-center gap-2">

              {/* تعديل */}
              <button
                type="button"
                onClick={() => onEditAccount(account)}
                title="تعديل العهدة"
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-blue-400/30
                  bg-blue-400/10
                  text-lg
                  transition
                  hover:border-blue-400
                  hover:bg-blue-400/20
                "
              >
                ✏️
              </button>

              {/* حذف */}
              <button
                type="button"
                onClick={() => onDeleteAccount(account)}
                title="حذف العهدة"
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-red-400/30
                  bg-red-400/10
                  text-lg
                  transition
                  hover:border-red-400
                  hover:bg-red-400/20
                "
              >
                🗑️
              </button>

              {/* تصدير العهدة */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenExportAccountId((v) => v === account.id ? null : account.id)}
                  title="تصدير العهدة"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-green-400/30 bg-green-400/10 text-lg transition hover:border-green-400 hover:bg-green-400/20"
                >
                  📤
                </button>
                {openExportAccountId === account.id && (
                  <div className="absolute right-0 top-12 z-50 w-48 overflow-hidden rounded-2xl border border-white/10 bg-[#102947] p-1 shadow-2xl">
                    <button type="button" onClick={() => exportAccount(account, "excel")} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-right text-sm text-white hover:bg-white/10"><FileSpreadsheet size={17} className="text-green-400" /> Excel</button>
                    <button type="button" onClick={() => exportAccount(account, "print")} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-right text-sm text-white hover:bg-white/10"><FileText size={17} className="text-red-400" /> PDF / حفظ PDF</button>
                    <button type="button" onClick={() => exportAccount(account, "print")} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-right text-sm text-white hover:bg-white/10"><Printer size={17} className="text-sky-400" /> طباعة</button>
                  </div>
                )}
              </div>

              {/* أيقونة العهدة */}
              <div
                className="
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-2xl
                  border
                  border-yellow-400/30
                  bg-yellow-400/10
                  text-3xl
                  shadow-inner
                "
              >
                💼
              </div>

            </div>

          </div>
                {/* ================= Balance ================= */}

                <div className="mt-6">

                  <p className="text-sm text-gray-400">
                    الرصيد الحالي
                  </p>

                  <div className="mt-1 flex items-baseline gap-2">

                    <span className="text-3xl font-extrabold text-yellow-400">
                      {Number(
                        account.currentBalance || 0
                      ).toLocaleString()}
                    </span>

                    <span className="text-sm font-medium text-gray-400">
                      ريال
                    </span>

                  </div>

                </div>


                {/* ================= Statistics ================= */}

                <div
                  className="
                    mt-6
                    grid
                    grid-cols-3
                    divide-x
                    divide-x-reverse
                    divide-white/10
                    rounded-2xl
                    border
                    border-white/10
                    bg-[#102947]/70
                    py-4
                  "
                >

                  {/* العمليات */}

                  <div className="px-3 text-center">

                    <p className="text-xs text-gray-400">
                      عدد العمليات
                    </p>

                    <p className="mt-2 text-xl font-bold text-sky-400">
                      {account.operationsCount ?? 0}
                    </p>

                  </div>


                  {/* التغذية */}

                  <div className="px-3 text-center">

                    <p className="text-xs text-gray-400">
                      التغذية
                    </p>

                    <p className="mt-2 text-xl font-bold text-green-400">
                      {Number(
                        account.totalFunding || 0
                      ).toLocaleString()}
                    </p>

                  </div>


                  {/* المصروفات */}

                  <div className="px-3 text-center">

                    <p className="text-xs text-gray-400">
                      المصروفات
                    </p>

                    <p className="mt-2 text-xl font-bold text-red-400">
                      {Number(
                        account.totalExpenses || 0
                      ).toLocaleString()}
                    </p>

                  </div>

                </div>


                {/* ================= Actions ================= */}

                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">

                  {/* عرض */}

                  <button
                    type="button"
                    onClick={() => openFundingModal(account)}
                    className="
                      flex
                      h-12
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      border
                      border-sky-400/30
                      bg-sky-500/10
                      text-base
                      font-bold
                      text-sky-400
                      transition-all
                      hover:border-sky-400
                      hover:bg-sky-500
                      hover:text-white
                    "
                  >
                    <span className="text-xl">
                      👁
                    </span>

                    عرض
                  </button>

                  {/* تغذية */}

                  <button
                    type="button"
                    onClick={() => onAddFunding(account.id)}
                    className="
                      flex
                      h-12
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      border
                      border-green-400/30
                      bg-green-500/10
                      text-base
                      font-bold
                      text-green-400
                      transition-all
                      hover:border-green-400
                      hover:bg-green-500
                      hover:text-white
                    "
                  >
                    <span className="text-2xl font-bold leading-none">
                      +
                    </span>

                    تغذية
                  </button>

                </div>



              </div>

            </div>

          ))}

        </div>
      )}


      {/* ================= Funding Modal ================= */}
      {selectedAccountForView && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={closeFundingModal}
        >
          <div
            className="w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-[#081B33] shadow-2xl"
            dir="rtl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <h3 className="text-xl font-extrabold text-white">
                  عمليات تغذية العهدة — {selectedAccountForView.name}
                </h3>
                <p className="mt-1 text-xs text-gray-400">
                  جميع معاملات التغذية المرتبطة بهذه العهدة
                </p>
              </div>
              <button
                type="button"
                onClick={closeFundingModal}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xl text-gray-300 hover:bg-red-500/20 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto p-3 sm:p-4">
              {(() => {
                const rows = funding
                  .filter((item) => Number(item?.account_id) === Number(selectedAccountForView.id))
                  .slice()
                  .sort((a, b) => {
                    const ad = new Date(a?.funding_date ?? a?.date ?? a?.created_at ?? 0).getTime();
                    const bd = new Date(b?.funding_date ?? b?.date ?? b?.created_at ?? 0).getTime();
                    return bd - ad || Number(b?.id ?? 0) - Number(a?.id ?? 0);
                  });

                const formatDate = (value: any) => {
                  if (!value) return "-";
                  const d = new Date(value);
                  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("ar-SA");
                };

                const getRef = (item: any) => item?.reference_number ?? item?.reference ?? item?.ref_number ?? item?.voucher_number ?? item?.id ?? "-";
                const getPayment = (item: any) => item?.payment_method ?? item?.method ?? item?.source ?? "-";
                const getDescription = (item: any) => item?.description ?? item?.notes ?? "-";
                const getAttachments = (item: any) => {
                  const raw = item?.attachments ?? item?.attachment ?? item?.files ?? item?.file_url ?? item?.receipt_url;
                  if (!raw) return [];
                  if (Array.isArray(raw)) return raw;
                  if (typeof raw === "string") {
                    try {
                      const parsed = JSON.parse(raw);
                      return Array.isArray(parsed) ? parsed : [parsed];
                    } catch {
                      return raw.split(",").map((v: string) => v.trim()).filter(Boolean);
                    }
                  }
                  return [raw];
                };

                if (!rows.length) {
                  return <div className="py-16 text-center text-sm text-gray-400">لا توجد عمليات تغذية لهذه العهدة حتى الآن.</div>;
                }

                return (
                  <div className="overflow-x-auto rounded-2xl border border-white/10">
                    <table className="min-w-[1150px] w-full text-sm">
                      <thead className="bg-[#102947] text-gray-300">
                        <tr>
                          <th className="px-4 py-3 text-right">تاريخ الإدخال</th>
                          <th className="px-4 py-3 text-right">تاريخ التغذية</th>
                          <th className="px-4 py-3 text-right">العهدة</th>
                          <th className="px-4 py-3 text-right">رقم المرجع</th>
                          <th className="px-4 py-3 text-right">مبلغ التغذية</th>
                          <th className="px-4 py-3 text-right">طريقة الدفع</th>
                          <th className="px-4 py-3 text-right">الوصف</th>
                          <th className="px-4 py-3 text-center">المرفقات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {rows.map((item: any) => {
                          const attachments = getAttachments(item);
                          return (
                            <tr key={item?.id} className="bg-[#081B33] hover:bg-[#102947]/60">
                              <td className="px-4 py-3 text-gray-300">{formatDate(item?.created_at)}</td>
                              <td className="px-4 py-3 text-gray-300">{formatDate(item?.funding_date ?? item?.date)}</td>
                              <td className="px-4 py-3 font-bold text-white">{selectedAccountForView.name}</td>
                              <td className="px-4 py-3 text-gray-300">{String(getRef(item))}</td>
                              <td className="px-4 py-3 font-extrabold text-green-400">{Number(item?.amount ?? 0).toLocaleString()} ريال</td>
                              <td className="px-4 py-3 text-gray-300">{getPayment(item)}</td>
                              <td className="max-w-[280px] whitespace-normal break-words px-4 py-3 text-gray-300">{getDescription(item)}</td>
                              <td className="px-4 py-3 text-center">
                                {attachments.length ? (
                                  <details className="inline-block">
                                    <summary className="cursor-pointer rounded-lg border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-sky-400 hover:bg-sky-500 hover:text-white">📎 {attachments.length}</summary>
                                    <div className="mt-2 min-w-[220px] rounded-xl border border-white/10 bg-[#102947] p-2 text-right shadow-xl">
                                      {attachments.map((file: any, index: number) => {
                                        const url = typeof file === "string" ? file : file?.url ?? file?.file_url ?? file?.path;
                                        const name = typeof file === "string" ? file.split("/").pop() : file?.name ?? `مرفق ${index + 1}`;
                                        return url ? (
                                          <a key={`${item?.id}-${index}`} href={url} target="_blank" rel="noreferrer" className="block rounded-lg px-3 py-2 text-sm text-sky-300 hover:bg-white/5 hover:text-white">{name}</a>
                                        ) : (
                                          <div key={`${item?.id}-${index}`} className="px-3 py-2 text-sm text-gray-300">{name}</div>
                                        );
                                      })}
                                    </div>
                                  </details>
                                ) : (
                                  <span className="text-xs text-gray-500">لا يوجد</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ================= Empty State ================= */}

      {accounts.length === 0 && (

        <div
          className="
            rounded-3xl
            border border-white/10
            bg-[#081B33]
            py-20
            text-center
          "
        >

          <div className="text-5xl">
            💼
          </div>

          <h3 className="mt-4 text-xl font-bold text-white">
            لا توجد عهد مالية
          </h3>

          <p className="mt-2 text-gray-400">
            لم يتم إنشاء أي عهد مالية حتى الآن.
          </p>

          <button
            type="button"
            onClick={onAddAccount}
            className="
              mx-auto
              mt-6
              flex
              h-12
              items-center
              gap-2
              rounded-xl
              border
              border-green-400/30
              bg-green-500/10
              px-6
              text-base
              font-bold
              text-green-400
              transition-all
              hover:border-green-400
              hover:bg-green-500
              hover:text-white
            "
          >
            <span className="text-2xl">
              +
            </span>

            إضافة أول عهدة
          </button>

        </div>

      )}

    </div>
  );
}
