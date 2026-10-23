import { useCallback, useEffect, useRef, useState } from 'react';

interface FsDoc extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}
interface FsEl extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

/**
 * Layar penuh untuk sebuah elemen. Mencoba API asli (termasuk versi berawalan webkit di Safari lama);
 * bila tidak ada (iPhone), ditolak browser, atau tidak benar-benar masuk layar penuh,
 * memakai "layar penuh buatan": elemen dibuat fixed menutupi layar. Esc menutup layar penuh buatan
 * tanpa menutup modal di belakangnya.
 *
 * Pemakai menerapkan kelas ukuran sendiri: `pseudo` -> fixed inset-0, `native` -> isi layar.
 */
export function useFullscreen<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [native, setNative] = useState<boolean>(false);
  const [pseudo, setPseudo] = useState<boolean>(false);

  useEffect(() => {
    const d = document as FsDoc;
    const onChange = () => setNative(!!(d.fullscreenElement || d.webkitFullscreenElement));
    d.addEventListener('fullscreenchange', onChange);
    d.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      d.removeEventListener('fullscreenchange', onChange);
      d.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  useEffect(() => {
    if (!pseudo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setPseudo(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [pseudo]);

  const toggle = useCallback(async () => {
    const d = document as FsDoc;
    const el = ref.current as (T & FsEl) | null;
    if (!el) return;
    if (pseudo) {
      setPseudo(false);
      return;
    }
    if (d.fullscreenElement || d.webkitFullscreenElement) {
      try {
        if (d.exitFullscreen) await d.exitFullscreen();
        else await d.webkitExitFullscreen?.();
      } catch {
        /* abaikan */
      }
      return;
    }
    const request = el.requestFullscreen
      ? () => el.requestFullscreen()
      : el.webkitRequestFullscreen
        ? () => el.webkitRequestFullscreen!()
        : null;
    if (!request) {
      setPseudo(true);
      return;
    }
    try {
      await request();
      // Versi berawalan tidak mengembalikan promise: pastikan benar-benar masuk layar penuh
      window.setTimeout(() => {
        if (!(d.fullscreenElement || d.webkitFullscreenElement)) setPseudo(true);
      }, 500);
    } catch {
      setPseudo(true);
    }
  }, [pseudo]);

  return { ref, native, pseudo, active: native || pseudo, toggle };
}
