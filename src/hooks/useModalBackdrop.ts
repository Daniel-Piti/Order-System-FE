import { useRef } from 'react';

/**
 * Hook to handle modal backdrop clicks properly.
 * Prevents modal from closing when user long-presses inside and releases outside.
 * Only closes when clicking directly on the backdrop.
 */
export function useModalBackdrop(onClose: () => void) {
  const mousedownOnBackdropRef = useRef(false);

  const backdropProps = {
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => {
      // Track if mousedown started on the backdrop
      if (e.target === e.currentTarget) {
        mousedownOnBackdropRef.current = true;
      } else {
        mousedownOnBackdropRef.current = false;
      }
    },
    onClick: (e: React.MouseEvent<HTMLDivElement>) => {
      // Only close if clicking directly on the backdrop AND mousedown started on backdrop
      if (e.target === e.currentTarget && mousedownOnBackdropRef.current) {
        onClose();
      }
      // Reset the flag after click
      mousedownOnBackdropRef.current = false;
    },
  };

  const contentProps = {
    onClick: (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
    },
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      // Clear the backdrop flag if mousedown is on modal content
      mousedownOnBackdropRef.current = false;
    },
  };

  return { backdropProps, contentProps };
}
