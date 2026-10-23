import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Maximize2, Minimize2, Pause, Play, RotateCcw, Sparkles } from 'lucide-react';
import { Language } from '../i18n/translations';
import { useFullscreen } from '../hooks/useFullscreen';

/** Data proyeksi dari metadata XMP GPano (bila ada) */
export interface PanoInfo {
  fullW: number;
  fullH: number;
  croppedW: number;
  croppedH: number;
  left: number;
  top: number;
}

interface PanoramaViewerProps {
  fileUrl: string;
  thumbnailUrl?: string;
  width: number;
  fileSize: number;
  mimeType: string;
  title: string;
  language: Language;
  pano?: PanoInfo | null;
  className?: string;
}

type Phase = 'loading' | 'ready' | 'error';


// Tekstur dibatasi 3840 px: ukuran thumbnail baku Commons, aman untuk batas tekstur perangkat seluler (4096)
const PREVIEW_WIDTH = 3840;
const SMALL_ORIGINAL_BYTES = 12 * 1024 * 1024;
const HD_MAX_BYTES = 30 * 1024 * 1024;

interface ViewerApi {
  reset: () => void;
  setAutoRotate: (on: boolean) => void;
  loadHd: () => Promise<void>;
}

/** Pilih URL gambar untuk tekstur: asli bila cukup kecil, kalau tidak thumbnail baku Commons */
function pickTextureUrl(fileUrl: string, thumbnailUrl: string | undefined, width: number, fileSize: number, mime: string): string {
  const m = fileUrl.match(/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/([0-9a-f]\/[0-9a-f]{2})\/([^?#]+)/i);
  const canThumb = !!m && /^image\/(jpeg|png)$/i.test(mime);
  if (width > 0 && width <= PREVIEW_WIDTH && (fileSize <= SMALL_ORIGINAL_BYTES || !canThumb)) return fileUrl;
  if (canThumb && m) {
    const w = width > PREVIEW_WIDTH ? PREVIEW_WIDTH : width > 1920 ? 1920 : 0;
    if (w) return `https://thumb.wikimedia.org/wikipedia/commons/thumb/${m[1]}/${m[2]}/${w}px-${m[2]}`;
    return fileUrl;
  }
  return thumbnailUrl || fileUrl;
}

/**
 * Penampil panorama 360° (proyeksi equirectangular): seret untuk melihat sekeliling,
 * gulir atau cubit untuk zoom. three.js dimuat dengan import() hanya saat dipakai.
 */
export const PanoramaViewer: React.FC<PanoramaViewerProps> = ({
  fileUrl,
  thumbnailUrl,
  width,
  fileSize,
  mimeType,
  title,
  language,
  pano,
  className = '',
}) => {
  const en = language === 'en';
  const { ref: rootRef, native: isFullscreen, pseudo: pseudoFs, toggle: toggleFullscreen } = useFullscreen<HTMLDivElement>();
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<ViewerApi | null>(null);

  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [autoRotate, setAutoRotateState] = useState<boolean>(true);
  const [attempt, setAttempt] = useState<number>(0);
  const [hdState, setHdState] = useState<'none' | 'available' | 'loading' | 'done'>('none');

  const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let teardown: (() => void) | null = null;

    setPhase('loading');
    setErrorMsg('');
    setHdState('none');

    (async () => {
      try {
        const THREE = await import('three');
        if (disposed) return;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(0x0f131b, 1);
        const canvas = renderer.domElement;
        canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none;cursor:grab';
        canvas.tabIndex = 0;
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', en ? `${title}, interactive 360 degree panorama` : `${title}, panorama 360 derajat interaktif`);
        host.appendChild(canvas);

        const maxTex = renderer.capabilities.maxTextureSize;
        const maxAniso = renderer.capabilities.getMaxAnisotropy();

        // Geometri bola; untuk panorama parsial hanya sebagian bola yang dipetakan
        const full = !pano || !pano.fullW || !pano.fullH || !pano.croppedW || !pano.croppedH;
        const phiStart = full ? 0 : (Math.PI * 2 * pano!.left) / pano!.fullW;
        const phiLength = full ? Math.PI * 2 : (Math.PI * 2 * pano!.croppedW) / pano!.fullW;
        const thetaStart = full ? 0 : (Math.PI * pano!.top) / pano!.fullH;
        const thetaLength = full ? Math.PI : (Math.PI * pano!.croppedH) / pano!.fullH;
        const geometry = new THREE.SphereGeometry(500, 64, 40, phiStart, phiLength, thetaStart, thetaLength);
        geometry.scale(-1, 1, 1); // dilihat dari dalam bola, tanpa cermin

        const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const mesh = new THREE.Mesh(geometry, material);
        const scene = new THREE.Scene();
        scene.add(mesh);

        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1100);

        // Arah awal: tengah gambar yang tersedia
        const lon0 = THREE.MathUtils.radToDeg(phiStart + phiLength / 2);
        const lat0 = full ? 0 : 90 - THREE.MathUtils.radToDeg(thetaStart + thetaLength / 2);
        const fov0 = 75;
        let lon = lon0;
        let lat = lat0;
        let fov = fov0;
        let vLon = 0;
        let vLat = 0;
        let auto = true;

        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin('anonymous');
        const loadTexture = (url: string) =>
          new Promise<import('three').Texture>((resolve, reject) => {
            loader.load(url, resolve, undefined, () => reject(new Error('texture')));
          });
        const applyTexture = (tex: import('three').Texture) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = Math.min(8, maxAniso);
          const old = material.map;
          material.map = tex;
          material.needsUpdate = true;
          if (old) old.dispose();
        };

        const textureUrl = pickTextureUrl(fileUrl, thumbnailUrl, width, fileSize, mimeType);
        const tex = await loadTexture(textureUrl);
        if (disposed) {
          tex.dispose();
          renderer.dispose();
          if (canvas.parentNode === host) host.removeChild(canvas);
          return;
        }
        applyTexture(tex);

        const resize = () => {
          const w = host.clientWidth;
          const h = host.clientHeight;
          if (w === 0 || h === 0) return;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        };
        const ro = new ResizeObserver(resize);
        ro.observe(host);
        resize();

        const clampLat = () => {
          lat = Math.max(-85, Math.min(85, lat));
        };
        const clampFov = () => {
          fov = Math.max(30, Math.min(100, fov));
        };

        // Interaksi: mouse dan sentuhan lewat pointer events
        const pointers = new Map<number, { x: number; y: number }>();
        let pinchDist = 0;
        const stopAuto = () => {
          if (auto) {
            auto = false;
            setAutoRotateState(false);
          }
        };
        const onDown = (e: PointerEvent) => {
          canvas.setPointerCapture(e.pointerId);
          pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
          canvas.style.cursor = 'grabbing';
          vLon = 0;
          vLat = 0;
          stopAuto();
          if (pointers.size === 2) {
            const [a, b] = [...pointers.values()];
            pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
          }
        };
        const onMove = (e: PointerEvent) => {
          const prev = pointers.get(e.pointerId);
          if (!prev) return;
          const cur = { x: e.clientX, y: e.clientY };
          pointers.set(e.pointerId, cur);
          if (pointers.size === 1) {
            const degPerPx = fov / Math.max(1, host.clientHeight);
            const dLon = -(cur.x - prev.x) * degPerPx;
            const dLat = (cur.y - prev.y) * degPerPx;
            lon += dLon;
            lat += dLat;
            vLon = dLon;
            vLat = dLat;
            clampLat();
          } else if (pointers.size === 2) {
            const [a, b] = [...pointers.values()];
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            if (pinchDist > 0 && d > 0) {
              fov *= pinchDist / d;
              clampFov();
            }
            pinchDist = d;
          }
        };
        const onUp = (e: PointerEvent) => {
          pointers.delete(e.pointerId);
          if (pointers.size < 2) pinchDist = 0;
          if (pointers.size === 0) canvas.style.cursor = 'grab';
        };
        const onWheel = (e: WheelEvent) => {
          e.preventDefault();
          fov += e.deltaY * 0.05;
          clampFov();
          stopAuto();
        };
        const onKey = (e: KeyboardEvent) => {
          const step = fov / 12;
          let handled = true;
          if (e.key === 'ArrowLeft') lon -= step;
          else if (e.key === 'ArrowRight') lon += step;
          else if (e.key === 'ArrowUp') lat += step;
          else if (e.key === 'ArrowDown') lat -= step;
          else if (e.key === '+' || e.key === '=') fov -= 5;
          else if (e.key === '-') fov += 5;
          else handled = false;
          if (handled) {
            e.preventDefault();
            e.stopPropagation(); // jangan ikut memindahkan berkas di modal
            clampLat();
            clampFov();
            stopAuto();
          }
        };
        canvas.addEventListener('pointerdown', onDown);
        canvas.addEventListener('pointermove', onMove);
        canvas.addEventListener('pointerup', onUp);
        canvas.addEventListener('pointercancel', onUp);
        canvas.addEventListener('wheel', onWheel, { passive: false });
        canvas.addEventListener('keydown', onKey);

        let raf = 0;
        let last = performance.now();
        const loop = (now: number) => {
          raf = requestAnimationFrame(loop);
          const dt = Math.min(64, now - last);
          last = now;
          if (auto) {
            lon += dt * 0.012;
          } else if (pointers.size === 0 && (Math.abs(vLon) > 0.01 || Math.abs(vLat) > 0.01)) {
            // inersia setelah dilepas
            lon += vLon;
            lat += vLat;
            vLon *= 0.92;
            vLat *= 0.92;
            clampLat();
          }
          camera.fov = fov;
          camera.updateProjectionMatrix();
          const phi = THREE.MathUtils.degToRad(90 - lat);
          const theta = THREE.MathUtils.degToRad(lon);
          camera.lookAt(500 * Math.sin(phi) * Math.cos(theta), 500 * Math.cos(phi), 500 * Math.sin(phi) * Math.sin(theta));
          renderer.render(scene, camera);
        };
        raf = requestAnimationFrame(loop);

        const hdPossible =
          width > PREVIEW_WIDTH && width <= maxTex && fileSize > 0 && fileSize <= HD_MAX_BYTES && !coarse && textureUrl !== fileUrl;

        apiRef.current = {
          reset: () => {
            lon = lon0;
            lat = lat0;
            fov = fov0;
            vLon = 0;
            vLat = 0;
          },
          setAutoRotate: (on) => {
            auto = on;
          },
          loadHd: async () => {
            setHdState('loading');
            try {
              const hd = await loadTexture(fileUrl);
              if (disposed) {
                hd.dispose();
                return;
              }
              applyTexture(hd);
              setHdState('done');
            } catch {
              setHdState('available');
            }
          },
        };

        teardown = () => {
          cancelAnimationFrame(raf);
          ro.disconnect();
          canvas.removeEventListener('pointerdown', onDown);
          canvas.removeEventListener('pointermove', onMove);
          canvas.removeEventListener('pointerup', onUp);
          canvas.removeEventListener('pointercancel', onUp);
          canvas.removeEventListener('wheel', onWheel);
          canvas.removeEventListener('keydown', onKey);
          material.map?.dispose();
          material.dispose();
          geometry.dispose();
          renderer.dispose();
          renderer.forceContextLoss();
          if (canvas.parentNode === host) host.removeChild(canvas);
          apiRef.current = null;
        };

        setHdState(hdPossible ? 'available' : 'none');
        setPhase('ready');
      } catch (err) {
        if (disposed) return;
        console.error('Panorama viewer error:', err);
        const msg = err instanceof Error ? err.message : '';
        setErrorMsg(
          /webgl/i.test(msg)
            ? en ? 'This browser could not start 3D rendering (WebGL).' : 'Browser ini tidak bisa memulai render 3D (WebGL).'
            : en ? 'Could not load this panorama.' : 'Panorama ini tidak bisa dimuat.'
        );
        setPhase('error');
      }
    })();

    return () => {
      disposed = true;
      if (teardown) teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl, attempt]);


  const toggleAutoRotate = () => {
    const next = !autoRotate;
    setAutoRotateState(next);
    apiRef.current?.setAutoRotate(next);
  };

  const btn =
    'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-white/15 bg-black/50 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60';

  return (
    <div
      ref={rootRef}
      className={`min-h-[240px] overflow-hidden bg-stone-950 ring-1 ring-white/10 ${
        pseudoFs
          ? 'fixed inset-0 z-[300] h-dvh w-screen'
          : isFullscreen
            ? 'relative h-full w-full'
            : `relative w-full rounded-lg ${className}`
      }`}
    >
      <div ref={hostRef} className="absolute inset-0" />

      {phase !== 'ready' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
          {thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt=""
              aria-hidden="true"
              referrerPolicy="no-referrer"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30"
            />
          )}
          <div className="relative z-10 flex max-w-xs flex-col items-center gap-3 text-white">
            {phase === 'loading' && (
              <div role="status" aria-live="polite" className="flex flex-col items-center gap-2">
                <Loader2 className="h-7 w-7 animate-spin text-accent-300" />
                <span className="text-sm font-medium">{en ? 'Loading 360° panorama…' : 'Memuat panorama 360°…'}</span>
              </div>
            )}
            {phase === 'error' && (
              <div role="alert" className="flex flex-col items-center gap-3">
                <p className="text-sm leading-relaxed text-stone-100">{errorMsg}</p>
                <button type="button" onClick={() => setAttempt((n) => n + 1)} className={btn}>
                  <RotateCcw className="h-4 w-4" />
                  {en ? 'Try again' : 'Coba lagi'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {phase === 'ready' && (
        <>
          <div className="absolute bottom-2 left-2 right-2 flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={() => apiRef.current?.reset()} className={btn} title={en ? 'Reset view' : 'Atur ulang tampilan'}>
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{en ? 'Reset' : 'Atur ulang'}</span>
            </button>
            <button type="button" onClick={toggleAutoRotate} aria-pressed={autoRotate} className={btn}>
              {autoRotate ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              <span>{en ? 'Auto-rotate' : 'Putar otomatis'}</span>
            </button>
            {hdState !== 'none' && hdState !== 'done' && (
              <button type="button" onClick={() => void apiRef.current?.loadHd()} disabled={hdState === 'loading'} className={`${btn} disabled:opacity-60`}>
                {hdState === 'loading' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                <span>{en ? 'Full resolution' : 'Resolusi penuh'}</span>
              </button>
            )}
            {(
              <button type="button" onClick={() => void toggleFullscreen()} className={`${btn} ml-auto`} title={isFullscreen || pseudoFs ? (en ? 'Exit fullscreen' : 'Keluar layar penuh') : (en ? 'Fullscreen' : 'Layar penuh')}>
                {isFullscreen || pseudoFs ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                <span className="sr-only sm:not-sr-only">{isFullscreen || pseudoFs ? (en ? 'Exit' : 'Keluar') : (en ? 'Fullscreen' : 'Layar penuh')}</span>
              </button>
            )}
          </div>
          <p className="pointer-events-none absolute left-2 top-2 hidden rounded bg-black/40 px-2 py-1 text-xs text-stone-200 sm:block">
            {coarse
              ? en ? 'Drag to look around · pinch to zoom' : 'Seret untuk melihat sekeliling · cubit untuk zoom'
              : en ? 'Drag to look around · scroll to zoom' : 'Seret untuk melihat sekeliling · gulir untuk zoom'}
          </p>
        </>
      )}
    </div>
  );
};
