import { useEffect, useState } from "react";
import type {
  Villa,
  VillaCategory,
  VillaStatus,
} from "../../data/villas";

type EditVillaModalProps = {
  villa: Villa | null;
  onClose: () => void;
  onSave: (villa: Villa) => void;
};

function EditVillaModal({
  villa,
  onClose,
  onSave,
}: EditVillaModalProps) {

  const [formData, setFormData] =
    useState<Villa | null>(villa);

  useEffect(() => {
    setFormData(villa);
  }, [villa]);

  if (!villa || !formData) {
    return null;
  }

  const handleTextChange = (
    field: keyof Villa,
    value: string
  ) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  const handleNumberChange = (
    field: keyof Villa,
    value: string
  ) => {
    setFormData({
      ...formData,
      [field]: Number(value) || 0,
    });
  };

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    onSave(formData);
    onClose();
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
        className="villa-modal"
        dir="rtl"
      >

        <div className="modal-header">

          <div>
            <span className="modal-label">
              مشروع فلل تبوك
            </span>

            <h2>
              تعديل الفيلا {villa.code}
            </h2>

            <p>
              تعديل البيانات الأساسية والمالية للفيلا
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

        <form
          className="villa-form"
          onSubmit={handleSubmit}
        >

          <div className="form-section-title">
            بيانات الفيلا
          </div>

          <div className="form-grid">

            <div className="form-field">
              <label>رقم الفيلا</label>

              <input
                type="text"
                value={formData.code}
                disabled
              />
            </div>

            <div className="form-field">
              <label>البلوك</label>

              <input
                type="text"
                value={formData.block}
                onChange={(event) =>
                  handleTextChange(
                    "block",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="form-field">
              <label>مساحة الأرض (م²)</label>

              <input
                type="number"
                min="1"
                value={formData.plotArea}
                onChange={(event) =>
                  handleNumberChange(
                    "plotArea",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="form-field">
              <label>مساحة البناء (م²)</label>

              <input
                type="number"
                min="0"
                value={formData.builtUpArea}
                onChange={(event) =>
                  handleNumberChange(
                    "builtUpArea",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="form-field">
              <label>فئة الفيلا</label>

              <select
                value={formData.category}
                onChange={(event) => {
                  const value =
                    event.target.value as VillaCategory;

                  setFormData({
                    ...formData,
                    category: value,
                  });
                }}
              >
                <option value="Large">
                  كبيرة
                </option>

                <option value="Medium">
                  متوسطة
                </option>

                <option value="Small">
                  صغيرة
                </option>
              </select>
            </div>

            <div className="form-field">
              <label>حالة الفيلا</label>

              <select
                value={formData.status}
                onChange={(event) => {
                  const value =
                    event.target.value as VillaStatus;

                  setFormData({
                    ...formData,
                    status: value,
                  });
                }}
              >
                <option value="Not Started">
                  لم تبدأ
                </option>

                <option value="Under Construction">
                  تحت التنفيذ
                </option>

                <option value="Finishing">
                  مرحلة التشطيبات
                </option>

                <option value="Completed">
                  مكتملة
                </option>

                <option value="Reserved">
                  محجوزة
                </option>

                <option value="Sold">
                  مباعة
                </option>

                <option value="Rented">
                  مؤجرة
                </option>

                <option value="Maintenance">
                  تحت الصيانة
                </option>
              </select>
            </div>

            <div className="form-field">
              <label>نسبة الإنجاز %</label>

              <input
                type="number"
                min="0"
                max="100"
                value={formData.progress}
                onChange={(event) =>
                  handleNumberChange(
                    "progress",
                    event.target.value
                  )
                }
              />
            </div>

          </div>


          <div className="form-section-title">
            تفاصيل الفيلا
          </div>

          <div className="form-grid">

            <div className="form-field">
              <label>عدد الأدوار</label>

              <input
                type="number"
                min="0"
                value={formData.floors}
                onChange={(event) =>
                  handleNumberChange(
                    "floors",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="form-field">
              <label>عدد غرف النوم</label>

              <input
                type="number"
                min="0"
                value={formData.bedrooms}
                onChange={(event) =>
                  handleNumberChange(
                    "bedrooms",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="form-field">
              <label>عدد الحمامات</label>

              <input
                type="number"
                min="0"
                value={formData.bathrooms}
                onChange={(event) =>
                  handleNumberChange(
                    "bathrooms",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="form-field">
              <label>تاريخ التسليم</label>

              <input
                type="date"
                value={formData.deliveryDate}
                onChange={(event) =>
                  handleTextChange(
                    "deliveryDate",
                    event.target.value
                  )
                }
              />
            </div>

          </div>


          <div className="form-section-title">
            البيانات المالية
          </div>

          <div className="form-grid">

            <div className="form-field">
              <label>التكلفة التقديرية</label>

              <input
                type="number"
                min="0"
                value={formData.estimatedCost}
                onChange={(event) =>
                  handleNumberChange(
                    "estimatedCost",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="form-field">
              <label>التكلفة الفعلية</label>

              <input
                type="number"
                min="0"
                value={formData.actualCost}
                onChange={(event) =>
                  handleNumberChange(
                    "actualCost",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="form-field">
              <label>سعر البيع</label>

              <input
                type="number"
                min="0"
                value={formData.sellingPrice}
                onChange={(event) =>
                  handleNumberChange(
                    "sellingPrice",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="form-field">
              <label>اسم العميل</label>

              <input
                type="text"
                value={formData.customerName}
                onChange={(event) =>
                  handleTextChange(
                    "customerName",
                    event.target.value
                  )
                }
              />
            </div>

          </div>


          <div className="form-field form-field-full">

            <label>ملاحظات</label>

            <textarea
              rows={4}
              value={formData.notes}
              onChange={(event) =>
                handleTextChange(
                  "notes",
                  event.target.value
                )
              }
            />

          </div>


          <div className="modal-actions">

            <button
              type="button"
              className="cancel-button"
              onClick={onClose}
            >
              إلغاء
            </button>

            <button
              type="submit"
              className="save-villa-button"
            >
              حفظ التعديلات
            </button>

          </div>

        </form>

      </div>
    </div>
  );
}

export default EditVillaModal;