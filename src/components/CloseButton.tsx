interface CloseButtonProps {
  onClick: () => void;
  ariaLabel?: string;
  className?: string;
}

export default function CloseButton({ onClick, ariaLabel = "סגור חלון", className = "" }: CloseButtonProps) {
  return (
    <button
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={`modal-close-button ${className} focus-visible:outline-3 focus-visible:outline-blue-600 focus-visible:outline-offset-2`}
      aria-label={ariaLabel}
    >
      <svg
        className="modal-close-icon"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
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

