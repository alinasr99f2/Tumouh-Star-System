type ExpenseNotesProps = {

  notes: string;

  onNotesChange: (
    value: string
  ) => void;

};

export default function ExpenseNotes({

  notes,

  onNotesChange,

}: ExpenseNotesProps) {

  return (

    <>

      <div className="form-section-title">

        الملاحظات

      </div>

      <div className="form-field form-field-full">

        <textarea

          rows={6}

          maxLength={1000}

          value={notes}

          placeholder="أي ملاحظات خاصة بالمصروف..."

          onChange={(e)=>

            onNotesChange(
              e.target.value
            )

          }

        />

        <small>

          {notes.length} / 1000

        </small>

      </div>

    </>

  );

}