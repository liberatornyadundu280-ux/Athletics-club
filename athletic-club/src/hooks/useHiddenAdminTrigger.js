import { useCallback, useRef } from 'react';

function useHiddenAdminTrigger(onActivate) {
  const longPressTimer = useRef(null);

  const activate = useCallback(() => {
    if (typeof onActivate === 'function') {
      onActivate();
    }
  }, [onActivate]);

  const handleClick = (event) => {
    if (event.detail === 3) {
      activate();
    }
  };

  const handlePointerDown = () => {
    longPressTimer.current = window.setTimeout(activate, 850);
  };

  const clearLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return {
    onClick: handleClick,
    onPointerDown: handlePointerDown,
    onPointerUp: clearLongPress,
    onPointerLeave: clearLongPress,
    onPointerCancel: clearLongPress,
  };
}

export default useHiddenAdminTrigger;
