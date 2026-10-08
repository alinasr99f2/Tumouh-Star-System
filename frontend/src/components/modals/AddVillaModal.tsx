import { useState } from "react";
import type {
  Villa,
  VillaCategory,
  VillaStatus,
} from "../../data/villas";

type AddVillaModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onAddVilla: (villa: Villa) => boolean;
};

function AddVillaModal({
  isOpen,
  onClose,
  onAddVilla,
}: AddVillaModalProps) {
  const [villaCode, setVillaCode] = useState("");
  const [plotArea, setPlotArea] = useState("");
  const [builtUpArea, setBuiltUpArea] = useState("");

  const [category, setCategory] =
    useState<VillaCategory>("Medium");

  const [status, setStatus] =
    useState<VillaStatus>("Not Started");

  const [floors, setFloors] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");

  const [estimatedCost, setEstimatedCost] = useState("");
  const [actualCost, setActualCost] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [progress, setProgress] = useState("");
  const [notes, setNotes] = useState("");

  if (!isOpen) {
    return null;
  }

  const resetForm = () => {
    setVillaCode("");
    setPlotArea("");
    setBuiltUpArea("");
    setCategory("Medium");
    setStatus("Not Started");
    setFloors("");
    setBedrooms("");
    setBathrooms("");
    setEstimatedCost("");
    setActualCost("");
    setSellingPrice("");
    setCustomerName("");
    setDeliveryDate("");
    setProgress("");
    setNotes("");
  };

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const cleanCode = villaCode
      .trim()
      .toUpperCase();

    if (!cleanCode) {
      alert("من فضلك أدخل رقم الفيلا");
      return;
    }

    if (Number(plotArea) <= 0) {
      alert("من فضلك أدخل مساحة أرض صحيحة");
      return;
    }

    const newVilla: Villa = {
      code: cleanCode,

      projectId: 1,

      block: cleanCode.charAt(0),

      plotArea: Number(plotArea) || 0,

      builtUpArea:
        Number(builtUpArea) || 0,

      category: category,

      floors:
        Number(floors) || 0,

      bedrooms:
        Number(bedrooms) || 0,

      bathrooms:
        Number(bathrooms) || 0,

      currentStageId: null,

      villaStatusId: 1,

      status: status,

      estimatedCost:
        Number(estimatedCost) || 0,

      actualCost:
        Number(actualCost) || 0,

      sellingPrice:
        Number(sellingPrice) || 0,

      customerName:
        customerName.trim(),

      deliveryDate: deliveryDate,

      progress:
        Number(progress) || 0,

      notes:
        notes.trim(),
    };

    const added = onAddVilla(newVilla);

    if (!added) {
      return;
    }

    resetForm();
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
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

            <h2>إضافة فيلا جديدة</h2>

            <p>
              أدخل البيانات الأساسية والمالية للفيلا
            </p>
          </div>

          <button
            type="button"
            className="modal-close"
            onClick={handleClose}
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
              <label>رقم الفيلا *</label>

              <input
                type="text"
                placeholder="مثال: A4"
                value={villaCode}
                onChange={(event) =>
                  setVillaCode(event.target.value)
                }
                required
              />
            </div>

            <div className="form-field">
              <label>
                مساحة الأرض (م²) *
              </label>

              <input
                type="number"
                min="1"
                placeholder="مثال: 400"
                value={plotArea}
                onChange={(event) =>
                  setPlotArea(event.target.value)
                }
                required
              />
            </div>

            <div className="form-field">
              <label>
                مساحة البناء (م²)
              </label>

              <input
                type="number"
                min="0"
                placeholder="0"
                value={builtUpArea}
                onChange={(event) =>
                  setBuiltUpArea(event.target.value)
                }
              />
            </div>

            <div className="form-field">
              <label>فئة الفيلا *</label>

              <select
                value={category}
                onChange={(event) => {
                  const value =
                    event.target.value;

                  if (
                    value === "Large" ||
                    value === "Medium" ||
                    value === "Small"
                  ) {
                    setCategory(value);
                  }
                }}
              >
                <option value="Large">
                  كبيرة - Large
                </option>

                <option value="Medium">
                  متوسطة - Medium
                </option>

                <option value="Small">
                  صغيرة - Small
                </option>
              </select>
            </div>

            <div className="form-field">
              <label>حالة الفيلا *</label>

              <select
                value={status}
                onChange={(event) => {
                  const value =
                    event.target.value;

                  if (
                    value === "Not Started" ||
                    value === "Under Construction" ||
                    value === "Finishing" ||
                    value === "Completed" ||
                    value === "Reserved" ||
                    value === "Sold" ||
                    value === "Rented" ||
                    value === "Maintenance"
                  ) {
                    setStatus(value);
                  }
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
                placeholder="0"
                value={progress}
                onChange={(event) =>
                  setProgress(event.target.value)
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
                value={floors}
                onChange={(event) =>
                  setFloors(event.target.value)
                }
              />
            </div>

            <div className="form-field">
              <label>عدد غرف النوم</label>

              <input
                type="number"
                min="0"
                value={bedrooms}
                onChange={(event) =>
                  setBedrooms(event.target.value)
                }
              />
            </div>

            <div className="form-field">
              <label>عدد الحمامات</label>

              <input
                type="number"
                min="0"
                value={bathrooms}
                onChange={(event) =>
                  setBathrooms(event.target.value)
                }
              />
            </div>

            <div className="form-field">
              <label>تاريخ التسليم</label>

              <input
                type="date"
                value={deliveryDate}
                onChange={(event) =>
                  setDeliveryDate(event.target.value)
                }
              />
            </div>

          </div>

          <div className="form-section-title">
            البيانات المالية
          </div>

          <div className="form-grid">

            <div className="form-field">
              <label>
                التكلفة التقديرية
              </label>

              <input
                type="number"
                min="0"
                placeholder="0 ريال"
                value={estimatedCost}
                onChange={(event) =>
                  setEstimatedCost(event.target.value)
                }
              />
            </div>

            <div className="form-field">
              <label>
                التكلفة الفعلية
              </label>

              <input
                type="number"
                min="0"
                placeholder="0 ريال"
                value={actualCost}
                onChange={(event) =>
                  setActualCost(event.target.value)
                }
              />
            </div>

            <div className="form-field">
              <label>سعر البيع</label>

              <input
                type="number"
                min="0"
                placeholder="0 ريال"
                value={sellingPrice}
                onChange={(event) =>
                  setSellingPrice(event.target.value)
                }
              />
            </div>

            <div className="form-field">
              <label>اسم العميل</label>

              <input
                type="text"
                placeholder="اختياري"
                value={customerName}
                onChange={(event) =>
                  setCustomerName(event.target.value)
                }
              />
            </div>

          </div>

          <div className="form-field form-field-full">
            <label>ملاحظات</label>

            <textarea
              rows={4}
              placeholder="اكتب أي ملاحظات عن الفيلا..."
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
            />
          </div>

          <div className="modal-actions">

            <button
              type="button"
              className="cancel-button"
              onClick={handleClose}
            >
              إلغاء
            </button>

            <button
              type="submit"
              className="save-villa-button"
            >
              ＋ حفظ الفيلا
            </button>

          </div>

        </form>
      </div>
    </div>
  );
}

export default AddVillaModal;