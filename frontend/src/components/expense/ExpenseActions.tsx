type ExpenseActionsProps = {

  onCancel: () => void;

  onSave: () => void;

  onSaveAndNew: () => void;

};

export default function ExpenseActions({

  onCancel,

  onSave,

  onSaveAndNew,

}: ExpenseActionsProps) {

  return (

    <div className="expense-actions">

      <button

        type="button"

        className="cancel-button"

        onClick={onCancel}

      >

        إلغاء

      </button>

      <button

        type="button"

        className="save-button"

        onClick={onSave}

      >

        💾 حفظ

      </button>

      <button

        type="button"

        className="save-new-button"

        onClick={onSaveAndNew}

      >

        💾➕

        حفظ وإضافة مصروف آخر

      </button>

    </div>

  );

}