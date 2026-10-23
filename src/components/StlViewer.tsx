import React, { useEffect, useRef, useState } from 'react';
import { Box, Download, Loader2, Pause, Play, RotateCcw } from 'lucide-react';
import { Language } from '../i18n/translations';

interface StlViewerProps {
  url: string;
  thumbnailUrl?: string;
  /** Ukuran berkas dalam byte (0 bila tidak diketahui) */
  fileSize: number;
  title: string;
  language: Language;
  className?: string;
}

type Phase = 'idle' | 'loading' | 'ready' | 'error' | 'toolarge';

// Di bawah batas ini model dimuat otomatis; di atasnya pengguna memilih sendiri agar hemat data
const AUTO_LOAD_LIMIT = 12 * 1024 * 1024;
// Di atas batas ini model tidak dimuat di browser (berisiko kehabisan memori)
const MAX_LOAD_LIMIT = 120 * 1024 * 1024;

const formatMb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;

interface ViewerApi {
  reset: () => void;
  setAutoRotate: (on: boolean) => void;
  setWireframe: (on: boolean) => void;
}

/**
 * Penampil model 3D (STL) interaktif: putar, zoom, geser.
 * three.js dan loadernya dimuat dengan import() hanya saat model benar-benar dimuat.
 */
export const StlViewer: React.FC<StlViewerProps> = ({ url, thumbnailUrl, fileSize, title, language, className = '' }) => {
  const en = language === 'en';
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<ViewerApi | null>(null);

  const tooLarge = fileSize > MAX_LOAD_LIMIT;
  const [loadRequested, setLoadRequested] = useState<boolean>(!tooLarge && fileSize <= AUTO_LOAD_LIMIT);
  const [phase, setPhase] = useState<Phase>(tooLarge ? 'toolarge' : loadRequested ? 'loading' : 'idle');
  const [progress, setProgress] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [autoRotate, setAutoRotateState] = useState<boolean>(true);
  const [wireframe, setWireframeState] = useState<boolean>(false);
  const [attempt, setAttempt] = useState<number>(0);

  useEffect(() => {
    if (!loadRequested || tooLarge) return;
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    const abort = new AbortController();
    let teardown: (() => void) | null = null;

    setPhase('loading');
    setProgress(0);
    setErrorMsg('');

    (async () => {
      try {
        const [THREE, { STLLoader }, { OrbitControls }] = await Promise.all([
          import('three'),
          import('three/examples/jsm/loaders/STLLoader.js'),
          import('three/examples/jsm/controls/OrbitControls.js'),
        ]);
        if (disposed) return;

        const res = await fetch(url, { signal: abort.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        // Baca bertahap agar progres terlihat
        const total = Number(res.headers.get('content-length')) || fileSize || 0;
        let buffer: ArrayBuffer;
        if (res.body && total > 0) {
          const reader = res.body.getReader();
          const chunks: Uint8Array[] = [];
          let received = 0;
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            received += value.length;
            if (!disposed) setProgress(Math.min(1, received / total));
          }
          const merged = new Uint8Array(received);
          let offset = 0;
          for (const c of chunks) {
            merged.set(c, offset);
            offset += c.length;
          }
          buffer = merged.buffer;
        } else {
          buffer = await res.arrayBuffer();
        }
        if (disposed) return;

        const geometry = new STLLoader().parse(buffer);
        if (!geometry.attributes.position || geometry.attributes.position.count === 0) {
          throw new Error(en ? 'The file has no 3D geometry.' : 'Berkas tidak berisi geometri 3D.');
        }
        // STL umumnya sumbu Z ke atas; three.js memakai Y ke atas
        geometry.rotateX(-Math.PI / 2);
        geometry.center();
        if (!geometry.attributes.normal) geometry.computeVertexNormals();
        geometry.computeBoundingSphere();
        const radius = geometry.boundingSphere?.radius || 1;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        const canvas = renderer.domElement;
        canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none';
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', en ? `${title}, interactive 3D model` : `${title}, model 3D interaktif`);
        host.appendChild(canvas);

        const scene = new THREE.Scene();
        const material = new THREE.MeshStandardMaterial({ color: 0xa9bad6, roughness: 0.55, metalness: 0.12 });
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        scene.add(new THREE.HemisphereLight(0xffffff, 0x445066, 0.9));
        const key = new THREE.DirectionalLight(0xffffff, 1.6);
        key.position.set(radius * 2, radius * 3, radius * 2);
        scene.add(key);
        const fill = new THREE.DirectionalLight(0x9db4ff, 0.6);
        fill.position.set(-radius * 2, -radius, -radius * 2);
        scene.add(fill);

        const fov = 40;
        const camera = new THREE.PerspectiveCamera(fov, 1, radius / 100, radius * 100);
        const distance = (radius / Math.sin(THREE.MathUtils.degToRad(fov / 2))) * 1.05;
        const initialPosition = new THREE.Vector3(1, 0.7, 1).normalize().multiplyScalar(distance);
        camera.position.copy(initialPosition);
        camera.lookAt(0, 0, 0);

        const controls = new OrbitControls(camera, canvas);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.5;
        controls.minDistance = radius * 0.3;
        controls.maxDistance = radius * 10;
        controls.addEventListener('start', () => {
          controls.autoRotate = false;
          setAutoRotateState(false);
        });

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

        let raf = 0;
        const loop = () => {
          raf = requestAnimationFrame(loop);
          controls.update();
          renderer.render(scene, camera);
        };
        loop();

        apiRef.current = {
          reset: () => {
            camera.position.copy(initialPosition);
            controls.target.set(0, 0, 0);
            controls.update();
          },
          setAutoRotate: (on) => {
            controls.autoRotate = on;
          },
          setWireframe: (on) => {
            material.wireframe = on;
          },
        };

        teardown = () => {
          cancelAnimationFrame(raf);
          ro.disconnect();
          controls.dispose();
          geometry.dispose();
          material.dispose();
          renderer.dispose();
          renderer.forceContextLoss();
          if (canvas.parentNode === host) host.removeChild(canvas);
          apiRef.current = null;
        };

        if (disposed) {
          teardown();
          teardown = null;
          return;
        }
        setPhase('ready');
      } catch (err) {
        if (disposed || (err instanceof Error && err.name === 'AbortError')) return;
        console.error('STL viewer error:', err);
        const msg = err instanceof Error ? err.message : '';
        setErrorMsg(
          /webgl/i.test(msg)
            ? en ? 'This browser could not start 3D rendering (WebGL).' : 'Browser ini tidak bisa memulai render 3D (WebGL).'
            : en ? 'Could not load this 3D model.' : 'Model 3D ini tidak bisa dimuat.'
        );
        setPhase('error');
      }
    })();

    return () => {
      disposed = true;
      abort.abort();
      if (teardown) teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, loadRequested, attempt]);

  const toggleAutoRotate = () => {
    const next = !autoRotate;
    setAutoRotateState(next);
    apiRef.current?.setAutoRotate(next);
  };
  const toggleWireframe = () => {
    const next = !wireframe;
    setWireframeState(next);
    apiRef.current?.setWireframe(next);
  };
  const resetView = () => {
    apiRef.current?.reset();
  };

  const btn =
    'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-white/15 bg-black/50 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60';

  return (
    <div className={`relative w-full min-h-[240px] overflow-hidden rounded-lg bg-stone-900/70 ring-1 ring-white/10 ${className}`}>
      {/* Kanvas three.js dipasang di sini */}
      <div ref={hostRef} className="absolute inset-0" />

      {phase !== 'ready' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
          {thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt=""
              aria-hidden="true"
              referrerPolicy="no-referrer"
              className="pointer-events-none absolute inset-0 h-full w-full object-contain opacity-40"
            />
          )}
          <div className="relative z-10 flex max-w-xs flex-col items-center gap-3 text-white">
            {phase === 'loading' && (
              <div role="status" aria-live="polite" className="flex flex-col items-center gap-2">
                <Loader2 className="h-7 w-7 animate-spin text-accent-300" />
                <span className="text-sm font-medium">
                  {en ? 'Loading 3D model…' : 'Memuat model 3D…'}
                  {progress > 0 && progress < 1 ? ` ${Math.round(progress * 100)}%` : ''}
                </span>
              </div>
            )}
            {phase === 'idle' && (
              <>
                <Box className="h-8 w-8 text-accent-300" />
                <p className="text-sm leading-relaxed text-stone-200">
                  {en
                    ? `This model is large (${formatMb(fileSize)}). Load it to rotate and zoom.`
                    : `Model ini besar (${formatMb(fileSize)}). Muat untuk memutar dan memperbesarnya.`}
                </p>
                <button type="button" onClick={() => setLoadRequested(true)} className={`${btn} bg-accent-600 hover:bg-accent-700`}>
                  <Box className="h-4 w-4" />
                  {en ? 'Load interactive 3D' : 'Muat 3D interaktif'}
                </button>
              </>
            )}
            {phase === 'toolarge' && (
              <>
                <Box className="h-8 w-8 text-stone-300" />
                <p className="text-sm leading-relaxed text-stone-200">
                  {en
                    ? `This model is too large to view here (${formatMb(fileSize)}). Download the file to open it in a 3D app.`
                    : `Model ini terlalu besar untuk dilihat di sini (${formatMb(fileSize)}). Unduh berkasnya untuk dibuka di aplikasi 3D.`}
                </p>
                <a href={url} target="_blank" rel="noopener noreferrer" className={btn}>
                  <Download className="h-4 w-4" />
                  {en ? 'Open file' : 'Buka berkas'}
                </a>
              </>
            )}
            {phase === 'error' && (
              <div role="alert" className="flex flex-col items-center gap-3">
                <p className="text-sm leading-relaxed text-stone-100">{errorMsg}</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button type="button" onClick={() => setAttempt((n) => n + 1)} className={btn}>
                    <RotateCcw className="h-4 w-4" />
                    {en ? 'Try again' : 'Coba lagi'}
                  </button>
                  <a href={url} target="_blank" rel="noopener noreferrer" className={btn}>
                    <Download className="h-4 w-4" />
                    {en ? 'Open file' : 'Buka berkas'}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {phase === 'ready' && (
        <>
          <div className="absolute bottom-2 left-2 flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={resetView} className={btn} title={en ? 'Reset view' : 'Atur ulang tampilan'}>
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{en ? 'Reset' : 'Atur ulang'}</span>
            </button>
            <button type="button" onClick={toggleAutoRotate} aria-pressed={autoRotate} className={btn}>
              {autoRotate ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              <span>{en ? 'Auto-rotate' : 'Putar otomatis'}</span>
            </button>
            <button type="button" onClick={toggleWireframe} aria-pressed={wireframe} className={btn}>
              <Box className="h-3.5 w-3.5" />
              <span>{en ? 'Wireframe' : 'Kerangka'}</span>
            </button>
          </div>
          <p className="pointer-events-none absolute right-2 top-2 hidden rounded bg-black/40 px-2 py-1 text-xs text-stone-300 sm:block">
            {en ? 'Drag to rotate · scroll to zoom · right-drag to pan' : 'Seret untuk memutar · gulir untuk zoom · seret kanan untuk menggeser'}
          </p>
        </>
      )}
    </div>
  );
};
