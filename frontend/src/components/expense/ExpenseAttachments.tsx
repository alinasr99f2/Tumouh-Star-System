type ExpenseAttachmentsProps = {

  attachments: File[];

  onFilesChange: (
    files: File[]
  ) => void;

};

export default function ExpenseAttachments({

  attachments,

  onFilesChange,

}: ExpenseAttachmentsProps) {

  return (

    <>

      <div className="form-section-title">

        المرفقات

      </div>

      <div className="attachments-upload-box">

        <input

          type="file"

          multiple

          accept=".pdf,.jpg,.jpeg,.png,.webp"

          onChange={(event)=>{

            const files =
              Array.from(
                event.target.files ?? []
              );

            onFilesChange(files);

          }}

        />

        <div className="attachments-upload-text">

          <strong>

            📎 اسحب الملفات هنا

          </strong>

          <span>

            أو اضغط لاختيار ملفات

          </span>

          <small>

            PDF - JPG - PNG - WEBP

          </small>

        </div>

      </div>

      <div className="attachments-list">

        {attachments.length === 0 ? (

          <div className="attachments-empty">

            لا توجد مرفقات

          </div>

        ) : (

          attachments.map((file,index)=>(

            <div

              key={index}

              className="attachment-card"

            >

              <div>

                📄 {file.name}

              </div>

              <small>

                {(file.size/1024).toFixed(1)} KB

              </small>

            </div>

          ))

        )}

      </div>

    </>

  );

}
