import type { Villa } from "../data/villas";

type VillaDetailsModalProps = {
  villa: Villa | null;
  onClose: () => void;
  onEdit: (villa: Villa) => void;
  onDelete: (villa: Villa) => void;
};

function VillaDetailsModal({
  villa,
  onClose,
  onEdit,
  onDelete,
}: VillaDetailsModalProps) {
  if (!villa) {
    return null;
  }

  const statusArabic = (status: Villa["status"]) => {
    switch (status) {
      case "Not Started":
        return "لم تبدأ";

      case "Under Construction":
        return "تحت التنفيذ";

      case "Finishing":
        return "مرحلة التشطيبات";

      case "Completed":
        return "مكتملة";

      case "Reserved":
        return "محجوزة";

      case "Sold":
        return "مباعة";

      case "Rented":
        return "مؤجرة";

      case "Maintenance":
        return "تحت الصيانة";

      default:
        return status;
    }
  };

  const categoryArabic = (
    category: Villa["category"]
  ) => {
    switch (category) {
      case "Large":
        return "كبيرة";

      case "Medium":
        return "متوسطة";

      case "Small":
        return "صغيرة";

      default:
        return category;
    }
  };

  const money = (value: number) => {
    if (value <= 0) {
      return "غير مدخل";
    }

    return `${value.toLocaleString()} ريال`;
  };

  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="villa-details-modal"
        dir="rtl"
      >

        {/* HEADER */}

        <div className="villa-details-header">

          <div>
            <span className="modal-label">
              مشروع فلل تبوك
            </span>

            <h2>
              الفيلا {villa.code}
            </h2>

            <p>
              الملف الكامل للفيلا
            </p>
          </div>

          <button
            type="button"
            className="modal-close"
            onClick={onClose}
          >
            ×
          </button>

        </div>


        {/* TOP SUMMARY */}

        <div className="villa-details-summary">

          <div className="villa-detail-main-card">
            <span>رقم الفيلا</span>
            <strong>{villa.code}</strong>
          </div>

          <div className="villa-detail-main-card">
            <span>الفئة</span>
            <strong>
              {categoryArabic(villa.category)}
            </strong>
          </div>

          <div className="villa-detail-main-card">
            <span>الحالة</span>
            <strong>
              {statusArabic(villa.status)}
            </strong>
          </div>

          <div className="villa-detail-main-card">
            <span>نسبة الإنجاز</span>
            <strong>
              {villa.progress}%
            </strong>
          </div>

        </div>


        {/* PROGRESS */}

        <div className="villa-progress-section">

          <div className="villa-progress-title">
            <span>نسبة إنجاز الفيلا</span>

            <strong>
              {villa.progress}%
            </strong>
          </div>

          <div className="villa-progress-bar">
            <div
              className="villa-progress-fill"
              style={{
                width: `${Math.min(
                  Math.max(villa.progress, 0),
                  100
                )}%`,
              }}
            />
          </div>

        </div>


        <div className="villa-details-content">

          {/* BASIC DATA */}

          <section className="villa-details-section">

            <h3>
              بيانات الفيلا
            </h3>

            <div className="villa-details-grid">

              <div className="villa-info-item">
                <span>المشروع</span>
                <strong>
                  {villa.projectId}
                </strong>
              </div>

              <div className="villa-info-item">
                <span>البلوك</span>
                <strong>
                  {villa.block || "—"}
                </strong>
              </div>

              <div className="villa-info-item">
                <span>مساحة الأرض</span>
                <strong>
                  {villa.plotArea.toLocaleString()} م²
                </strong>
              </div>

              <div className="villa-info-item">
                <span>مساحة البناء</span>
                <strong>
                  {villa.builtUpArea > 0
                    ? `${villa.builtUpArea.toLocaleString()} م²`
                    : "غير مدخلة"}
                </strong>
              </div>

              <div className="villa-info-item">
                <span>عدد الأدوار</span>
                <strong>
                  {villa.floors || "—"}
                </strong>
              </div>

              <div className="villa-info-item">
                <span>غرف النوم</span>
                <strong>
                  {villa.bedrooms || "—"}
                </strong>
              </div>

              <div className="villa-info-item">
                <span>الحمامات</span>
                <strong>
                  {villa.bathrooms || "—"}
                </strong>
              </div>

              <div className="villa-info-item">
                <span>تاريخ التسليم</span>
                <strong>
                  {villa.deliveryDate || "غير محدد"}
                </strong>
              </div>

            </div>

          </section>


          {/* FINANCIAL DATA */}

          <section className="villa-details-section">

            <h3>
              البيانات المالية
            </h3>

            <div className="villa-financial-grid">

              <div className="financial-detail-card">
                <span>
                  التكلفة التقديرية
                </span>

                <strong>
                  {money(villa.estimatedCost)}
                </strong>
              </div>

              <div className="financial-detail-card">
                <span>
                  التكلفة الفعلية
                </span>

                <strong>
                  {money(villa.actualCost)}
                </strong>
              </div>

              <div className="financial-detail-card">
                <span>
                  سعر البيع
                </span>

                <strong>
                  {money(villa.sellingPrice)}
                </strong>
              </div>

            </div>

          </section>


          {/* CUSTOMER */}

          <section className="villa-details-section">

            <h3>
              بيانات العميل
            </h3>

            <div className="villa-details-grid">

              <div className="villa-info-item">
                <span>اسم العميل</span>

                <strong>
                  {villa.customerName ||
                    "لا يوجد عميل"}
                </strong>
              </div>

              <div className="villa-info-item">
                <span>حالة الفيلا</span>

                <strong>
                  {statusArabic(villa.status)}
                </strong>
              </div>

            </div>

          </section>


          {/* NOTES */}

          <section className="villa-details-section">

            <h3>
              الملاحظات
            </h3>

            <div className="villa-notes-box">
              {villa.notes ||
                "لا توجد ملاحظات مسجلة لهذه الفيلا."}
            </div>

          </section>

        </div>


        {/* ACTIONS */}

        <div className="villa-details-actions">
            

          <button
            type="button"
            className="details-close-button"
            onClick={onClose}
          >
            إغلاق
          </button>

         <button
  type="button"
  className="details-edit-button"
  onClick={() => onEdit(villa)}
>
  تعديل بيانات الفيلا
</button>
<button
  type="button"
  className="details-delete-button"
  onClick={() => onDelete(villa)}
>
  حذف الفيلا
</button>
        </div>

      </div>
    </div>
  );
}

export default VillaDetailsModal;