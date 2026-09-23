import { useRef, useCallback } from "react";

/**
 * Hook to prevent accidental modal/drawer closes when users select or drag text
 * inside a modal and release the mouse over the overlay backdrop.
 */
export function useSafeBackdropClose(onClose?: () => void) {
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    mouseDownTargetRef.current = e.target;
  }, []);

  const onClick = useCallback((e: React.MouseEvent) => {
    if (onClose && e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) {
      onClose();
    }
    mouseDownTargetRef.current = null;
  }, [onClose]);

  return { onMouseDown, onClick };
}
