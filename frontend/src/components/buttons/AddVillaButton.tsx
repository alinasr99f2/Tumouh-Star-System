type AddVillaButtonProps = {
  onClick: () => void;
};

function AddVillaButton({
  onClick,
}: AddVillaButtonProps) {
  return (
    <button
      type="button"
      className="add-villa-button"
      onClick={onClick}
    >
      <span className="add-villa-icon">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M3 11L12 4L21 11"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d="M5.5 10V20H18.5V10"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d="M12 13V18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />

          <path
            d="M9.5 15.5H14.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </span>

      <span className="add-villa-text">
        <strong>إضافة فيلا جديدة</strong>

        <small>
          تسجيل فيلا جديدة بالمشروع
        </small>
      </span>
    </button>
  );
}

export default AddVillaButton;