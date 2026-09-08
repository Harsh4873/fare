import { useRef, useState, type ReactNode } from 'react';
import { Trash2 } from 'lucide-react';

export function SwipeRow({ children, name, onDelete }: { children: ReactNode; name: string; onDelete: () => void }) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<{ pointerId: number; x: number; y: number; start: number; axis?: 'x' | 'y' }>();
  const suppressClick = useRef(false);

  return <div className="swipe-row" onKeyDown={(event) => {
    if (event.key === 'Escape') setOffset(0);
  }} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOffset(0);
  }}>
    <button type="button" className="swipe-row__delete" tabIndex={offset < -35 ? 0 : -1}
      aria-hidden={offset >= -35} aria-label={`Delete ${name}`} onClick={onDelete}>
      <Trash2 size={19} /> Delete
    </button>
    <div className={`swipe-row__content${dragging ? ' is-dragging' : ''}`}
      style={{ transform: `translateX(${offset}px)` }}
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0) return;
        gesture.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, start: offset };
        suppressClick.current = false;
      }}
      onPointerMove={(event) => {
        const current = gesture.current;
        if (!current || current.pointerId !== event.pointerId) return;
        const dx = event.clientX - current.x;
        const dy = event.clientY - current.y;
        if (!current.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 10) {
          current.axis = Math.abs(dx) > Math.abs(dy) * 1.3 ? 'x' : 'y';
          if (current.axis === 'x') {
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragging(true);
            suppressClick.current = true;
          }
        }
        if (current.axis === 'x') setOffset(Math.max(-88, Math.min(0, current.start + dx)));
      }}
      onPointerUp={(event) => {
        const current = gesture.current;
        if (!current || current.pointerId !== event.pointerId) return;
        if (current.axis === 'x') {
          const end = Math.max(-88, Math.min(0, current.start + event.clientX - current.x));
          setOffset(end < -35 ? -88 : 0);
        }
        gesture.current = undefined;
        setDragging(false);
      }}
      onPointerCancel={() => { gesture.current = undefined; setDragging(false); setOffset(0); }}
      onClickCapture={(event) => {
        if (suppressClick.current) {
          event.preventDefault(); event.stopPropagation(); suppressClick.current = false;
        } else if (offset !== 0) {
          event.preventDefault(); event.stopPropagation(); setOffset(0);
        }
      }}>
      {children}
    </div>
  </div>;
}
