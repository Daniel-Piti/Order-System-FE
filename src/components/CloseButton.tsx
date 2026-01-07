interface CloseButtonProps {
  onClick: () => void;
  ariaLabel?: string;
  className?: string;
}

export default function CloseButton({ onClick, ariaLabel = "Close modal", className = "" }: CloseButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`modal-close-button ${className}`}
      aria-label={ariaLabel}
    >
      <svg
        className="modal-close-icon"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  );
}

