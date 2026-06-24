// Shared hook for draggable + resizable modals (#165 / #166).
// Returns:
//   transformStyle — apply to the modal element
//   dragHandleProps — spread onto the header element (onPointerDown + cursor hint)
//
// Modal must also carry the .modal--draggable CSS class to get the
// resize handle in the bottom-right corner + drag cursor on the header.

import { useRef, useState } from "react";

export function useDraggableModal() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef({ active: false, startX: 0, startY: 0, baseX: 0, baseY: 0 });

  function onPointerDown(e) {
    // Skip when the user clicked a button/input inside the header (don't
    // hijack Close / minimize / form clicks).
    if (e.target.closest("button, input, select, textarea, a")) return;
    drag.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      baseX: pos.x,
      baseY: pos.y,
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
  }
  function onPointerMove(e) {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    setPos({ x: drag.current.baseX + dx, y: drag.current.baseY + dy });
  }
  function onPointerUp() {
    drag.current.active = false;
    window.removeEventListener("pointermove", onPointerMove);
  }

  return {
    transformStyle: { transform: `translate(${pos.x}px, ${pos.y}px)` },
    dragHandleProps: {
      onPointerDown,
      title: "Drag to reposition · Drag the bottom-right corner to resize",
      className: "modal-head--drag-handle",
    },
  };
}
