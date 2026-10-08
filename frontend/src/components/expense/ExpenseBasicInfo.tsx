type Stage = {
  id: number;
  name: string;
  active?: boolean;
};

type ExpenseBasicInfoProps = {
  operationNo: number;

  date: string;

  projectName: string;

  operationType: string;

  stageId: number | null;

  stages: Stage[];

  categoryId: string;

  classificationId: string;

  supplier: string;

  voucherNo: string;

  description: string;

  categories: {
    id: string;
    name: string;
  }[];

  classifications: {
    id: string;
    categoryId: string;
    name: string;
  }[];

  onDateChange: (value: string) => void;

  onOperationTypeChange: (
    value: string
  ) => void;

  onStageChange: (
    value: number | null
  ) => void;

  onCategoryChange: (
    value: string
  ) => void;

  onClassificationChange: (
    value: string
  ) => void;

  onSupplierChange: (
    value: string
  ) => void;

  onVoucherChange: (
    value: string
  ) => void;

  onDescriptionChange: (
    value: string
  ) => void;

  onAddCategory: () => void;

  onAddClassification: () => void;
};

export default function ExpenseBasicInfo({
  operationNo,
  date,
  projectName,
  operationType,
  stageId,
  stages,
  categoryId,
  classificationId,
  supplier,
  voucherNo,
  description,
  categories,
  classifications,
  onDateChange,
  onOperationTypeChange,
  onStageChange,
  onCategoryChange,
  onClassificationChange,
  onSupplierChange,
  onVoucherChange,
  onDescriptionChange,
  onAddCategory,
  onAddClassification,
}: ExpenseBasicInfoProps) {

  const availableClassifications =
    classifications.filter(
      (item) =>
        item.categoryId === categoryId
    );

  return (
    <>
      <div className="form-section-title">
        البيانات الأساسية
      </div>

      <div className="form-grid">

        {/* رقم العملية */}
        <div className="form-field">
          <label>
            رقم العملية
          </label>

          <input
            value={operationNo}
            readOnly
            className="readonly-input"
          />
        </div>

        {/* التاريخ */}
        <div className="form-field">
          <label>
            التاريخ
          </label>

          <input
            type="date"
            value={date}
            onChange={(e) =>
              onDateChange(
                e.target.value
              )
            }
          />
        </div>

        {/* المشروع */}
        <div className="form-field">
          <label>
            المشروع
          </label>

          <input
            value={projectName}
            readOnly
            className="readonly-input"
          />
        </div>

        {/* نوع العملية */}
        <div className="form-field">
          <label>
            نوع العملية
          </label>

          <select
            value={operationType}
            onChange={(e) =>
              onOperationTypeChange(
                e.target.value
              )
            }
          >
            <option value="">
              اختر نوع العملية
            </option>

            <option value="Purchase">
              شراء
            </option>

            <option value="Contractor">
              مقاول
            </option>

            <option value="Salary">
              رواتب
            </option>

            <option value="Rent">
              إيجار
            </option>

            <option value="Maintenance">
              صيانة
            </option>

            <option value="Transportation">
              نقل
            </option>

            <option value="Fuel">
              وقود
            </option>

            <option value="Utilities">
              خدمات
            </option>

            <option value="Furniture">
              أثاث
            </option>

            <option value="Equipment">
              معدات
            </option>

            <option value="Other">
              أخرى
            </option>
          </select>
        </div>

        {/* المرحلة */}
        <div className="form-field">
          <label>
            المرحلة
          </label>

          <select
            value={
              stageId === null
                ? ""
                : String(stageId)
            }
            onChange={(e) => {
              const value =
                e.target.value;

              onStageChange(
                value === ""
                  ? null
                  : Number(value)
              );
            }}
          >
            <option value="">
              اختر المرحلة
            </option>

            {stages
              .filter(
                (stage) =>
                  stage.active !== false
              )
              .map((stage) => (
                <option
                  key={stage.id}
                  value={stage.id}
                >
                  {stage.name}
                </option>
              ))}
          </select>
        </div>

        {/* الفئة */}
        <div className="form-field">

          <label>
            الفئة
          </label>

          <div className="input-with-button">

            <select
              value={categoryId}
              onChange={(e) =>
                onCategoryChange(
                  e.target.value
                )
              }
            >
              <option value="">
                اختر الفئة
              </option>

              {categories.map(
                (category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                )
              )}
            </select>

            <button
              type="button"
              className="small-add-button"
              title="إضافة فئة جديدة"
              onClick={onAddCategory}
            >
              +
            </button>

          </div>
        </div>

        {/* التصنيف */}
        <div className="form-field">

          <label>
            التصنيف
          </label>

          <div className="input-with-button">

            <select
              value={classificationId}
              onChange={(e) =>
                onClassificationChange(
                  e.target.value
                )
              }
            >
              <option value="">
                اختر التصنيف
              </option>

              {availableClassifications.map(
                (item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>
                )
              )}
            </select>

            <button
              type="button"
              className="small-add-button"
              title="إضافة تصنيف جديد"
              onClick={
                onAddClassification
              }
            >
              +
            </button>

          </div>
        </div>

        {/* المورد */}
        <div className="form-field">

          <label>
            المورد
          </label>

          <input
            value={supplier}
            autoComplete="off"
            onChange={(e) =>
              onSupplierChange(
                e.target.value
              )
            }
            placeholder="اسم المورد أو المقاول"
          />

        </div>

        {/* رقم السند */}
        <div className="form-field">

          <label>
            رقم السند
          </label>

          <input
            value={voucherNo}
            autoComplete="off"
            onChange={(e) =>
              onVoucherChange(
                e.target.value
              )
            }
            placeholder="رقم السند أو الفاتورة"
          />

        </div>

        {/* البيان */}
        <div className="form-field form-field-full">

          <label>
            البيان
          </label>

          <textarea
            rows={4}
            maxLength={500}
            value={description}
            onChange={(e) =>
              onDescriptionChange(
                e.target.value
              )
            }
            placeholder="اكتب وصف العملية أو تفاصيل المصروف"
          />

          <small className="field-hint">
            الحد الأقصى 500 حرف
          </small>

        </div>

      </div>
    </>
  );
}