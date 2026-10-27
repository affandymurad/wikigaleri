import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';

const MIN_SCALE = 1;
const MAX_SCALE = 8;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_ZOOM = 2.5;

type Pt = { x: number; y: number };

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/**
 * Zoom + geser untuk satu elemen gambar: cubit (2 jari), roda mouse/trackpad, ketuk atau klik dua kali,
 * seret saat diperbesar, serta tombol +/-. `resetKey` mengembalikan zoom saat berkas berganti.
 * Koordinat dihitung relatif ke pusat gambar (transform-origin: center).
 */
export function useImageZoom<T extends HTMLElement>(resetKey: string | number, forceNoScroll = false) {
  const ref = useRef<T | null>(null);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const [dragging, setDragging] = useState(false);

  const pointers = useRef(new Map<number, Pt>());
  const pinch = useRef<{ d0: number; s0: number; t0: Pt; m0: Pt } | null>(null);
  const pan = useRef<{ p: Pt; t: Pt } | null>(null);
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null);
  const moved = useRef(false);

  // Pusat gambar tanpa transformasi, dalam koordinat layar
  const origin = useCallback((): Pt => {
    const el = ref.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    const v = viewRef.current;
    return { x: r.left + r.width / 2 - v.x, y: r.top + r.height / 2 - v.y };
  }, []);

  const rel = useCallback((cx: number, cy: number): Pt => {
    const o = origin();
    return { x: cx - o.x, y: cy - o.y };
  }, [origin]);

  const apply = useCallback((scale: number, x: number, y: number) => {
    const el = ref.current;
    const s = clamp(scale, MIN_SCALE, MAX_SCALE);
    if (s <= MIN_SCALE + 0.001) return setView({ scale: 1, x: 0, y: 0 });
    const mx = ((el?.offsetWidth ?? 0) * (s - 1)) / 2;
    const my = ((el?.offsetHeight ?? 0) * (s - 1)) / 2;
    setView({ scale: s, x: clamp(x, -mx, mx), y: clamp(y, -my, my) });
  }, []);

  // Zoom ke skala baru dengan titik p (relatif pusat) tetap di tempatnya
  const zoomAt = useCallback((next: number, p: Pt) => {
    const v = viewRef.current;
    const s2 = clamp(next, MIN_SCALE, MAX_SCALE);
    const k = s2 / v.scale;
    apply(s2, p.x - (p.x - v.x) * k, p.y - (p.y - v.y) * k);
  }, [apply]);

  const reset = useCallback(() => setView({ scale: 1, x: 0, y: 0 }), []);
  const zoomIn = useCallback(() => zoomAt(viewRef.current.scale * 1.5, { x: 0, y: 0 }), [zoomAt]);
  const zoomOut = useCallback(() => zoomAt(viewRef.current.scale / 1.5, { x: 0, y: 0 }), [zoomAt]);

  useEffect(() => {
    reset();
    pointers.current.clear();
    pinch.current = null;
    pan.current = null;
    lastTap.current = null;
  }, [resetKey, reset]);

  // Roda mouse / trackpad (cubit trackpad datang sebagai wheel + ctrlKey). Harus non-passive.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : 1;
      const factor = Math.exp(-e.deltaY * unit * (e.ctrlKey ? 0.01 : 0.0015));
      zoomAt(viewRef.current.scale * factor, rel(e.clientX, e.clientY));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

  const onPointerDown = (e: ReactPointerEvent<T>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = pointers.current.size > 1;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const v = viewRef.current;
      pinch.current = {
        d0: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        s0: v.scale,
        t0: { x: v.x, y: v.y },
        m0: rel((a.x + b.x) / 2, (a.y + b.y) / 2),
      };
      pan.current = null;
    } else if (pointers.current.size === 1 && viewRef.current.scale > 1) {
      pan.current = { p: { x: e.clientX, y: e.clientY }, t: { x: viewRef.current.x, y: viewRef.current.y } };
      setDragging(true);
    }
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* abaikan */ }
  };

  const onPointerMove = (e: ReactPointerEvent<T>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const p = pinch.current;
      const s2 = clamp(p.s0 * (Math.hypot(a.x - b.x, a.y - b.y) / p.d0), MIN_SCALE, MAX_SCALE);
      const m = rel((a.x + b.x) / 2, (a.y + b.y) / 2);
      const k = s2 / p.s0;
      // titik gambar di bawah jari (m0) harus mengikuti titik tengah jari sekarang (m)
      apply(s2, m.x - (p.m0.x - p.t0.x) * k, m.y - (p.m0.y - p.t0.y) * k);
      moved.current = true;
    } else if (pan.current) {
      const dx = e.clientX - pan.current.p.x;
      const dy = e.clientY - pan.current.p.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved.current = true;
      apply(viewRef.current.scale, pan.current.t.x + dx, pan.current.t.y + dy);
    }
  };

  const endPointer = (e: ReactPointerEvent<T>, cancelled = false) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* abaikan */ }
    pinch.current = null;
    if (pointers.current.size === 1 && viewRef.current.scale > 1) {
      const [rest] = [...pointers.current.values()];
      pan.current = { p: rest, t: { x: viewRef.current.x, y: viewRef.current.y } };
    } else {
      pan.current = null;
      setDragging(false);
    }
    // Ketuk dua kali (sentuh) atau klik dua kali (mouse): zoom masuk / kembali
    if (!cancelled && pointers.current.size === 0 && !moved.current) {
      const now = Date.now();
      const lt = lastTap.current;
      if (lt && now - lt.time < DOUBLE_TAP_MS && Math.hypot(e.clientX - lt.x, e.clientY - lt.y) < 30) {
        lastTap.current = null;
        if (viewRef.current.scale > 1) reset();
        else zoomAt(DOUBLE_TAP_ZOOM, rel(e.clientX, e.clientY));
      } else {
        lastTap.current = { time: now, x: e.clientX, y: e.clientY };
      }
    }
  };

  const zoomed = view.scale > 1;
  const style: CSSProperties = {
    transform: zoomed ? `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})` : undefined,
    transformOrigin: 'center center',
    transition: dragging || pointers.current.size > 0 ? 'none' : 'transform 120ms ease-out',
    // Saat diperbesar atau layar penuh, semua gestur milik kita; pada skala 1 halaman tetap bisa digulir vertikal
    touchAction: zoomed || forceNoScroll ? 'none' : 'pan-y',
    cursor: zoomed ? (dragging ? 'grabbing' : 'grab') : 'zoom-in',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  };

  return {
    ref,
    scale: view.scale,
    zoomed,
    style,
    zoomIn,
    zoomOut,
    reset,
    canZoomIn: view.scale < MAX_SCALE - 0.01,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (e: ReactPointerEvent<T>) => endPointer(e),
      onPointerCancel: (e: ReactPointerEvent<T>) => endPointer(e, true),
      onDragStart: (e: { preventDefault: () => void }) => e.preventDefault(),
    },
  };
}
