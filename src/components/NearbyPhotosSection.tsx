import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

// Explicitly register MapLibre Web Worker URL for Vite bundler
if (typeof (maplibregl as { setWorkerUrl?: (url: string) => void }).setWorkerUrl === 'function') {
  (maplibregl as { setWorkerUrl: (url: string) => void }).setWorkerUrl(maplibreWorkerUrl);
}
import mlcontour from 'maplibre-contour';

// Sumber elevasi (Terrarium) dan protokol kontur didaftarkan sekali untuk seluruh aplikasi.
let contourDemSource: InstanceType<typeof mlcontour.DemSource> | null = null;
function getContourDemSource() {
  if (!contourDemSource) {
    contourDemSource = new mlcontour.DemSource({
      url: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
      encoding: 'terrarium',
      maxzoom: 15,
      worker: true,
    });
    contourDemSource.setupMaplibre(maplibregl as never);
  }
  return contourDemSource;
}
import { CommonsMediaItem } from '../types/wikimedia';
import { fetchNearbyCommonsMedia, fetchWikidataAreaItems, fetchCoordinateCategories } from '../services/wikimediaApi';
import {
  AREA_MAX_SPAN_M,
  WIKIDATA_MAX_SPAN_M,
  AreaBounds,
  WikidataAreaItem,
  WIKIDATA_ITEMS_LIMIT,
  CoordCategory,
  COORD_CATEGORY_LIMIT,
  areaCacheKey,
  areaSpanMeters,
} from '../utils/areaCategories';
import { getFileExtension } from '../utils/licenseUtils';
import { Translations, Language } from '../i18n/translations';
import { DEFAULT_NEARBY_VIEW, parseNearbyView, withNearbyView, parseNearbyList, withNearbyList, categorySearchHref, detailPath, type NearbyList } from '../utils/urlState';
import {
  MapPin,
  LocateFixed,
  Search,
  ExternalLink,
  AlertCircle,
  Eye,
  X,
  CheckCircle2,
  Navigation,
  Tag,
  Image as ImageIcon,
  Info,
  ChevronLeft,
  ChevronRight,
  Box,
  Ruler,
  Mountain,
  Loader2,
  Copy,
  Check,
  ArrowRight,
} from 'lucide-react';

interface NearbyPhotosSectionProps {
  language: Language;
  t: Translations;
}

// Cluster grouped coordinate representation
interface PhotoCluster {
  id: string;
  lat: number;
  lng: number;
  items: CommonsMediaItem[];
}

const PREVIEW_PAGE_SIZE = 18;
const WD_PAGE_SIZE = 12;
const COORD_PAGE_SIZE = 12;

// Gaya peta Sekitar disamakan dengan WikiAbstrak: palet krem hangat dengan pil bulat dan kartu membulat.
// Mode gelap memakai nilai HSL dari palet gelap WikiAbstrak.
const MAP_CARD =
  'bg-[#FFFDF9]/95 dark:bg-[hsl(40_7%_12.5%)]/95 border border-[#E8E2D6] dark:border-[hsl(40_17%_24%)] text-[#4A4338] dark:text-[hsl(37_11%_75.6%)] shadow-sm';
const MAP_HOVER = 'hover:bg-[#F2EDE2] dark:hover:bg-[hsl(41_7%_17%)]';
const MAP_MUTED = 'text-[#8A7E6C] dark:text-[hsl(37_10%_63%)]';
const MAP_DARK_BTN =
  'bg-[#4A4338] text-[#FFFDF9] border-[#4A4338] hover:bg-[#383229] dark:bg-[hsl(37_11%_75.6%)] dark:text-[hsl(40_7%_12.5%)] dark:border-[hsl(37_11%_75.6%)] dark:hover:bg-[hsl(37_11%_85%)]';
const mapToolBtn = (on: boolean) =>
  `p-2 rounded-full border shadow-sm transition-colors cursor-pointer ${on ? MAP_DARK_BTN : `${MAP_CARD} ${MAP_HOVER}`}`;

// Beberapa berkas Commons mengulang nama pembuat dua kali ("AB" + "AB"); tampilkan sekali saja
const dedupAuthor = (author?: string): string => {
  const raw = (author || 'Commons').trim();
  const half = raw.length / 2;
  return Number.isInteger(half) && half > 0 && raw.slice(0, half) === raw.slice(half) ? raw.slice(0, half) : raw;
};

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const id = window.setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      window.clearTimeout(id);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });

// Alamat titik tengah peta (Nominatim). Tidak semua titik punya alamat sampai tingkat jalan (zoom 18), jadi dicoba lagi
// dengan cakupan lebih luas (zoom 14 lalu 10); jeda 1,1 detik menghormati batas 1 permintaan per detik.
async function reverseGeocode(lat: number, lon: number, lang: string, signal: AbortSignal): Promise<string> {
  for (const zoom of [18, 14, 10]) {
    if (zoom !== 18) await sleep(1100, signal);
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=${zoom}&accept-language=${lang}`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    if (data.display_name) return data.display_name as string;
    if (data.error && data.error !== 'Unable to geocode') throw new Error(data.error);
  }
  throw new Error('Unable to geocode');
}

type LatLng = { lat: number; lng: number };

/** Jarak dua titik dalam meter (haversine) */
const distanceMeters = (a: LatLng, b: LatLng): number => {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const fmtCoord = (c: LatLng) => `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`;

// Aksi ke mode lain di situs yang sama (galeri kategori, detail berkas) dibuka di tab baru,
// supaya hasil pencarian dan posisi peta Sekitar tidak hilang.
const NEW_TAB = { target: '_blank', rel: 'noopener noreferrer' } as const;

export const NearbyPhotosSection: React.FC<NearbyPhotosSectionProps> = ({
  language = 'id',
  t,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  // Terisi bila peta tidak bisa dibuat (mis. WebGL2 mati atau tidak didukung browser)
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const centerPinRef = useRef<maplibregl.Marker | null>(null);

  // States
  // Titik awal dan zoom bisa diatur lewat URL (?lat=&lon=&zoom=); bawaannya Monumen Nasional (Monas), Jakarta
  const [initialView] = useState(() => parseNearbyView(window.location.search) ?? DEFAULT_NEARBY_VIEW);
  const [mapCenter, setMapCenter] = useState<[number, number]>([initialView.lat, initialView.lng]); // [lat, lng]
  // Titik tengah tampilan peta saat ini (hanya berubah setelah peta berhenti digeser)
  const [viewCenter, setViewCenter] = useState<LatLng>({ lat: initialView.lat, lng: initialView.lng });
  // Pusat peta yang dipakai untuk penanda "peta bergeser": hanya berubah oleh geseran/zoom pengguna, bukan oleh
  // gerakan kamera otomatis saat sebuah foto dipilih (klik foto atau penanda), supaya penanda tidak muncul terus
  const [shiftCenter, setShiftCenter] = useState<LatLng>({ lat: initialView.lat, lng: initialView.lng });
  const ignoreMoveRef = useRef<boolean>(false);
  // Lebar peta dalam meter (dasar ambang "peta bergeser") dan titik pusat pencarian terakhir
  const [mapSpanM, setMapSpanM] = useState<number>(0);
  const [searchOrigin, setSearchOrigin] = useState<LatLng | null>(null);
  const [nearbyPhotos, setNearbyPhotos] = useState<CommonsMediaItem[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<CommonsMediaItem | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<PhotoCluster | null>(null);
  const [selectedClusterItemIndex, setSelectedClusterItemIndex] = useState<number>(0);
  const [isLoadingNearby, setIsLoadingNearby] = useState<boolean>(false);
  const [isLocatingUser, setIsLocatingUser] = useState<boolean>(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  // Pesan "tidak ada berkas" hanya relevan untuk posisi pencarian; hilang begitu peta digeser pengguna
  const emptyNoticeRef = useRef<boolean>(false);

  // Pagination state for preview strip
  const [previewPage, setPreviewPage] = useState<number>(1);


  // 3D Map Mode State (Kemiringan kamera + Gedung 3D fill-extrusion)
  const [is3DMode, setIs3DMode] = useState<boolean>(false);
  const is3DModeRef = useRef<boolean>(false);
  is3DModeRef.current = is3DMode;

  // Lapisan skala (ScaleControl) dan kontur/topo (raster OpenTopoMap) yang bisa dinyalakan seperti 3D
  const [isScaleOn, setIsScaleOn] = useState<boolean>(false);
  const [isTopoOn, setIsTopoOn] = useState<boolean>(false);
  const isTopoOnRef = useRef<boolean>(false);
  isTopoOnRef.current = isTopoOn;
  const scaleControlRef = useRef<maplibregl.ScaleControl | null>(null);

  // Petunjuk Mode 3D hanya tampil beberapa detik setelah mode dinyalakan
  const [show3DHint, setShow3DHint] = useState<boolean>(false);
  useEffect(() => {
    if (!is3DMode) {
      setShow3DHint(false);
      return;
    }
    setShow3DHint(true);
    const id = window.setTimeout(() => setShow3DHint(false), 6000);
    return () => window.clearTimeout(id);
  }, [is3DMode]);

  // Alamat dan koordinat titik tengah peta, dengan tombol salin
  // Alamat tidak dimuat otomatis (menghindari galat 429 dari Nominatim): pengguna menekan tombol "Tampilkan alamat",
  // dan hasilnya disimpan per koordinat sehingga kembali ke titik yang sama tidak meminta ulang.
  const [addr, setAddr] = useState<{ status: 'idle' | 'loading' | 'ok' | 'none' | 'error' | 'limited'; text: string }>({ status: 'idle', text: '' });
  const [copied, setCopied] = useState<'coord' | 'addr' | null>(null);
  const addrCacheRef = useRef(new Map<string, string>());
  const addrAbortRef = useRef<AbortController | null>(null);
  const addrKey = (c: LatLng) => `${c.lat.toFixed(4)},${c.lng.toFixed(4)},${language}`;

  // Peta bergeser: batalkan permintaan yang berjalan dan kembali ke tombol (atau alamat dari cache)
  useEffect(() => {
    addrAbortRef.current?.abort();
    const cached = addrCacheRef.current.get(addrKey(viewCenter));
    setAddr(cached ? { status: 'ok', text: cached } : { status: 'idle', text: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewCenter.lat, viewCenter.lng, language]);
  useEffect(() => () => addrAbortRef.current?.abort(), []);

  const loadAddress = async () => {
    addrAbortRef.current?.abort();
    const ctrl = new AbortController();
    addrAbortRef.current = ctrl;
    const center = viewCenter;
    setAddr({ status: 'loading', text: '' });
    try {
      const text = await reverseGeocode(center.lat, center.lng, language === 'en' ? 'en' : 'id', ctrl.signal);
      addrCacheRef.current.set(addrKey(center), text);
      setAddr({ status: 'ok', text });
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return;
      const msg = (e as Error)?.message || '';
      setAddr({ status: msg === 'Unable to geocode' ? 'none' : /429/.test(msg) ? 'limited' : 'error', text: '' });
    }
  };

  const copyText = async (kind: 'coord' | 'addr', value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(kind);
    window.setTimeout(() => setCopied((c) => (c === kind ? null : c)), 1500);
  };

  // Kategori di area ini: hasil di-cache per area/zoom selama sesi; permintaan lama dibatalkan saat area berubah
  const [areaCat, setAreaCat] = useState<{
    status: 'idle' | 'loading' | 'ok' | 'toowide' | 'error';
    /** 'ok' = Wikidata ikut dimuat, 'skipped' = area terlalu luas untuk Wikidata, 'failed' = galat/timeout */
    wikidata: 'ok' | 'skipped' | 'failed';
  }>({ status: 'idle', wikidata: 'skipped' });
  // Daftar kategori di panel samping: halaman dan pilihan seperti daftar foto
  // Daftar samping aktif disimpan di URL (?list=photos|categories|catcoords|wikidata)
  const [sideTab, setSideTab] = useState<NearbyList>(() => parseNearbyList(window.location.search));
  const changeSideTab = (id: NearbyList) => {
    setSideTab(id);
    try {
      const next = withNearbyList(window.location.search, id);
      if (window.location.pathname === '/' && next !== window.location.search) {
        window.history.replaceState(window.history.state, '', '/' + next);
      }
    } catch { /* abaikan */ }
  };
  const [areaWdItems, setAreaWdItems] = useState<WikidataAreaItem[]>([]);
  const [wdPage, setWdPage] = useState<number>(1);
  const [selectedWdItem, setSelectedWdItem] = useState<string | null>(null);
  useEffect(() => {
    setWdPage(1);
    setSelectedWdItem(null);
  }, [areaWdItems]);
  // Kategori Commons ber-koordinat (geosearch namespace Category)
  const [areaCoordCats, setAreaCoordCats] = useState<CoordCategory[]>([]);
  const [coordFailed, setCoordFailed] = useState<boolean>(false);
  const [coordPage, setCoordPage] = useState<number>(1);
  const [selectedCoordCat, setSelectedCoordCat] = useState<string | null>(null);
  useEffect(() => {
    setCoordPage(1);
    setSelectedCoordCat(null);
  }, [areaCoordCats]);
  const areaCatCacheRef = useRef(new Map<string, { wikidata: 'ok' | 'skipped'; noPhoto: WikidataAreaItem[]; coordCats: CoordCategory[] }>());
  const areaCatAbortRef = useRef<AbortController | null>(null);
  useEffect(() => () => areaCatAbortRef.current?.abort(), []);

  const findAreaCategories = async () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const b = map.getBounds();
    const bounds: AreaBounds = { west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() };
    const span = areaSpanMeters(bounds);
    if (span > AREA_MAX_SPAN_M) {
      areaCatAbortRef.current?.abort();
      setAreaWdItems([]);
      setAreaCoordCats([]);
      setCoordFailed(false);
      setAreaCat({ status: 'toowide', wikidata: 'skipped' });
      return;
    }
    const key = areaCacheKey(bounds, map.getZoom());
    const cached = areaCatCacheRef.current.get(key);
    if (cached) {
      const { noPhoto, coordCats, ...rest } = cached;
      setAreaWdItems(noPhoto);
      setAreaCoordCats(coordCats);
      setCoordFailed(false);
      setAreaCat({ status: 'ok', ...rest });
      return;
    }
    areaCatAbortRef.current?.abort();
    const ctrl = new AbortController();
    areaCatAbortRef.current = ctrl;
    setAreaWdItems([]);
    setAreaCoordCats([]);
    setCoordFailed(false);
    setAreaCat({ status: 'loading', wikidata: 'skipped' });
    const useWikidata = span <= WIKIDATA_MAX_SPAN_M;
    try {
      // Kategori ber-koordinat dan item Wikidata diminta bersamaan; kegagalan satu tidak membatalkan yang lain
      const [npRes, ccRes] = await Promise.allSettled([
        useWikidata ? fetchWikidataAreaItems(bounds, ctrl.signal) : Promise.resolve([]),
        fetchCoordinateCategories(bounds, ctrl.signal),
      ]);
      if (ctrl.signal.aborted) return;
      if (npRes.status === 'rejected' && ccRes.status === 'rejected') throw ccRes.reason;
      const wikidata: 'ok' | 'skipped' | 'failed' = !useWikidata ? 'skipped' : npRes.status === 'fulfilled' ? 'ok' : 'failed';
      if (npRes.status === 'rejected') console.warn('Wikidata items failed:', npRes.reason);
      if (ccRes.status === 'rejected') console.warn('Categories with coordinates failed:', ccRes.reason);
      const noPhoto = npRes.status === 'fulfilled' ? npRes.value : [];
      const coordCats = ccRes.status === 'fulfilled' ? ccRes.value : [];
      // Hasil dengan Wikidata atau kategori ber-koordinat gagal tidak di-cache supaya percobaan berikutnya mencoba lagi
      if (wikidata !== 'failed' && ccRes.status === 'fulfilled') areaCatCacheRef.current.set(key, { wikidata, noPhoto, coordCats });
      setAreaWdItems(noPhoto);
      setAreaCoordCats(coordCats);
      setCoordFailed(ccRes.status === 'rejected');
      setAreaCat({ status: 'ok', wikidata });
    } catch (e) {
      if (ctrl.signal.aborted || (e as { name?: string })?.name === 'AbortError') return;
      console.error('Failed to load area categories:', e);
      setAreaCat({ status: 'error', wikidata: 'skipped' });
    }
  };

// State placeholder foto preview
const [loadedPreviewId, setLoadedPreviewId] = useState<string | number | null>(null);
const [failedPreviewId, setFailedPreviewId] = useState<string | number | null>(null);
const [previewRetry, setPreviewRetry] = useState<number>(0);

// Resize peta saat container berubah ukuran (layout dua kolom / rotasi tablet)
useEffect(() => {
const el = mapContainerRef.current;
if (!el || typeof ResizeObserver === 'undefined') return;
const ro = new ResizeObserver(() => { mapInstanceRef.current?.resize(); });
ro.observe(el);
return () => ro.disconnect();
}, []);

  // Initialize MapLibre GL Map dengan style vektor Positron (OpenFreeMap) & fill-extrusion 3D
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    let created: maplibregl.Map | null = null;
    try {
      created = new maplibregl.Map({
      container: mapContainerRef.current,
      // Gaya peta vektor terang (OpenFreeMap Positron): abu-abu netral, jalan putih, taman hijau pucat, label mengikuti jalan
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [mapCenter[1], mapCenter[0]], // MapLibre takes [lng, lat]
      zoom: initialView.zoom,
      maxZoom: 19, // Prevent zooming beyond OpenStreetMap tile limits
      pitch: 0,
      maxPitch: 85,
      attributionControl: false,
      });
    } catch (err) {
      // MapLibre 6 butuh WebGL2; tanpa itu konstruktor melempar galat. Tampilkan pesan, jangan merusak halaman.
      console.warn('MapLibre could not start:', err);
      setMapUnavailable(true);
      return;
    }
    const map = created;

    // Gracefully handle any non-fatal tile fetch errors or network hiccups
    map.on('error', (e) => {
      const msg = e?.error?.message || '';
      if (msg.includes('tile.openstreetmap.org') || msg.includes('openfreemap.org') || msg.includes('Failed to fetch') || msg.includes('404')) {
        // Suppress non-fatal tile fetch notices
        return;
      }
      console.warn('MapLibre notice:', e?.error || e);
    });

    // Kontur: garis ketinggian dihitung di browser dari tile elevasi (maplibre-contour) dan digambar
    // di atas peta dasar Positron, disembunyikan sampai tombol Kontur dinyalakan.
    const ensureTopoLayer = () => {
      try {
        const demSource = getContourDemSource();
        const visibility = isTopoOnRef.current ? 'visible' : 'none';
        if (!map.getSource('contour-source')) {
          map.addSource('contour-source', {
            type: 'vector',
            tiles: [
              demSource.contourProtocolUrl({
                // Interval garis [minor, major] dalam meter per zoom: makin dekat makin rapat
                thresholds: {
                  8: [500, 2000],
                  10: [200, 1000],
                  12: [100, 500],
                  13: [50, 250],
                  14: [25, 100],
                  15: [20, 100],
                  16: [10, 50],
                },
                contourLayer: 'contours',
                elevationKey: 'ele',
                levelKey: 'level',
                extent: 4096,
                buffer: 2,
              }),
            ],
            maxzoom: 16,
            attribution: 'Elevation: Mapzen / AWS Terrain Tiles (SRTM, NED, GMTED)',
          });
        }
        if (!map.getLayer('contour-lines')) {
          map.addLayer({
            id: 'contour-lines',
            type: 'line',
            source: 'contour-source',
            'source-layer': 'contours',
            layout: { visibility, 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#a0622d',
              'line-opacity': 0.7,
              // level 1 = garis utama (indeks), level 0 = garis biasa; makin tebal saat zoom mendekat
              'line-width': [
                'interpolate', ['linear'], ['zoom'],
                10, ['match', ['get', 'level'], 1, 1, 0.4],
                16, ['match', ['get', 'level'], 1, 1.8, 0.8],
              ],
            },
          });
        }
        if (!map.getLayer('contour-labels')) {
          map.addLayer({
            id: 'contour-labels',
            type: 'symbol',
            source: 'contour-source',
            'source-layer': 'contours',
            filter: ['>', ['get', 'level'], 0],
            layout: {
              visibility,
              'symbol-placement': 'line',
              'text-field': ['concat', ['to-string', ['get', 'ele']], ' m'],
              'symbol-spacing': 300,
              'text-max-angle': 30,
              'text-font': ['Noto Sans Regular'],
              'text-size': 10,
            },
            paint: {
              'text-color': '#7a4a22',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1.5,
            },
          });
        }
      } catch (err) {
        console.warn('Failed to initialize topo contour layer:', err);
      }
    };

    // Add OpenMapTiles vector source and MapLibre native fill-extrusion 3D buildings on style load
    map.on('load', () => {
      ensureTopoLayer();
      // 1. Add OpenMapTiles vector source for 3D buildings (OpenFreeMap planet vector tiles)
      try {
        if (!map.getSource('openmaptiles-buildings')) {
          map.addSource('openmaptiles-buildings', {
            type: 'vector',
            url: 'https://tiles.openfreemap.org/planet',
          });
        }

        // 2. Add MapLibre native 3D building layer using fill-extrusion (default hidden in 2D)
        if (!map.getLayer('3d-buildings')) {
          map.addLayer({
            id: '3d-buildings',
            type: 'fill-extrusion',
            source: 'openmaptiles-buildings',
            'source-layer': 'building',
            minzoom: 13,
            layout: {
              visibility: is3DModeRef.current ? 'visible' : 'none',
            },
            paint: {
              // Realistis: Bangunan rendah lebih cerah, gedung bertingkat/pencakar langit lebih kontras
              'fill-extrusion-color': [
                'interpolate',
                ['linear'],
                ['coalesce', ['get', 'render_height'], 15],
                0, '#dde2e9',
                20, '#c5ccd7',
                50, '#98a2b3',
                100, '#6b7687',
                200, '#4f5a6b',
              ],
              // Tinggi ekstrusi 3D dengan transisi halus saat zoom
              'fill-extrusion-height': [
                'interpolate',
                ['linear'],
                ['zoom'],
                13, 0,
                14, ['coalesce', ['get', 'render_height'], 15],
              ],
              // Ketinggian dasar (base) jika ada tingkat gantung atau min_height
              'fill-extrusion-base': [
                'interpolate',
                ['linear'],
                ['zoom'],
                13, 0,
                14, ['coalesce', ['get', 'render_min_height'], 0],
              ],
              'fill-extrusion-opacity': 0.88,
              'fill-extrusion-vertical-gradient': true,
            },
          });

          // Set directional 3D light for realistic architectural depth
          map.setLight({
            anchor: 'viewport',
            color: '#ffffff',
            intensity: 0.4,
          });
        }
      } catch (err) {
        console.warn('Failed to initialize 3D fill-extrusion buildings:', err);
      }
    });

    // Re-apply 3D building visibility when style is reloaded (e.g. theme toggle)
    map.on('style.load', () => {
      ensureTopoLayer();
      try {
        if (map.getLayer('3d-buildings')) {
          map.setLayoutProperty('3d-buildings', 'visibility', is3DModeRef.current ? 'visible' : 'none');
        }
      } catch (err) {
        console.warn('Style reload 3D buildings notice:', err);
      }
    });

    // Add navigation controls (zoom & pitch/bearing compass)
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    // Atribusi ringkas di kiri bawah (skala menumpuk di atasnya), seperti WikiAbstrak
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    mapInstanceRef.current = map;

    // ?list=categories|nophoto: jalankan pencarian sekali sesaat setelah peta dibuat (tanpa menunggu tile selesai dimuat)
    if (!autoSearchedRef.current && parseNearbyList(window.location.search) !== 'photos') {
      autoSearchedRef.current = true;
      window.setTimeout(() => setAutoSearchTick(1), 400);
    }

    // Track map center on moveend
    map.on('moveend', (e) => {
      const c = map.getCenter();
      setMapCenter([c.lat, c.lng]);
      setViewCenter({ lat: c.lat, lng: c.lng });
      // Posisi peta ikut ditulis ke URL (replaceState, tanpa menambah riwayat) agar tautannya bisa dibagikan
      try {
        const next = withNearbyView(window.location.search, { lat: c.lat, lng: c.lng, zoom: map.getZoom() });
        if (window.location.pathname === '/' && next !== window.location.search) {
          window.history.replaceState(window.history.state, '', '/' + next);
        }
      } catch { /* abaikan */ }
      // originalEvent hanya ada pada gerakan oleh pengguna (geser, zoom, gulir)
      const byUser = !!(e as { originalEvent?: unknown }).originalEvent;
      // Peta digeser/di-zoom pengguna saat kategori dimuat: batalkan permintaan karena areanya sudah berbeda.
      // Gerakan otomatis (muat awal, ubah ukuran, terbang ke foto) tidak membatalkan.
      if (byUser && areaCatAbortRef.current && !areaCatAbortRef.current.signal.aborted) {
        areaCatAbortRef.current.abort();
        setAreaCat((cur) => (cur.status === 'loading' ? { status: 'idle', wikidata: 'skipped' } : cur));
      }
      if (byUser && emptyNoticeRef.current) {
        emptyNoticeRef.current = false;
        setLocationError(null);
      }
      if (byUser || !ignoreMoveRef.current) setShiftCenter({ lat: c.lat, lng: c.lng });
      ignoreMoveRef.current = false;
      const b = map.getBounds();
      setMapSpanM(distanceMeters({ lat: c.lat, lng: b.getWest() }, { lat: c.lat, lng: b.getEast() }));
    });

    return () => {
      // Clean up markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (centerPinRef.current) {
        centerPinRef.current.remove();
        centerPinRef.current = null;
      }
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Tautan dengan ?list=categories|nophoto langsung menjalankan pencarian satu kali setelah peta siap.
  // Peta memberi sinyal lewat state (autoSearchTick) agar pencarian memakai closure terbaru.
  const [autoSearchTick, setAutoSearchTick] = useState<number>(0);
  const autoSearchedRef = useRef<boolean>(false);
  useEffect(() => {
    if (autoSearchTick > 0) void handleFindNearbyCommons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSearchTick]);

  // Spatial clustering algorithm
  const clusterPhotos = useCallback(
    (photos: CommonsMediaItem[], zoomLevel: number): PhotoCluster[] => {
      const clusterRadiusDeg = 80 / Math.pow(2, zoomLevel);
      const clusters: PhotoCluster[] = [];

      for (const photo of photos) {
        if (typeof photo.latitude !== 'number' || typeof photo.longitude !== 'number') continue;
        const lat = photo.latitude;
        const lng = photo.longitude;

        const matchedCluster = clusters.find((c) => {
          const dLat = c.lat - lat;
          const dLng = c.lng - lng;
          return Math.sqrt(dLat * dLat + dLng * dLng) < clusterRadiusDeg;
        });

        if (matchedCluster) {
          matchedCluster.items.push(photo);
        } else {
          clusters.push({
            id: `cluster-${lat.toFixed(5)}-${lng.toFixed(5)}-${photo.id}`,
            lat,
            lng,
            items: [photo],
          });
        }
      }

      return clusters;
    },
    []
  );

  // Re-render markers whenever nearbyPhotos, selectedPhoto, or zoom changes
  const updateMapMarkers = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove existing photo markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const currentZoom = map.getZoom();
    const clusters = clusterPhotos(nearbyPhotos, currentZoom);

    clusters.forEach((cluster) => {
      const isMulti = cluster.items.length > 1;
      const isSelected = selectedPhoto
        ? cluster.items.some((item) => item.id === selectedPhoto.id)
        : false;

      const markerEl = document.createElement('div');
      markerEl.style.cursor = 'pointer';
      markerEl.style.transition = 'background-color 0.2s ease, width 0.2s ease, height 0.2s ease';

      if (isSelected) {
        markerEl.style.zIndex = '50';
      }

      if (isMulti) {
        // Kluster seperti WikiAbstrak: lingkaran #4A4338 (85%) bercincin krem, diameter naik menurut jumlah foto;
        // kluster yang memuat foto terpilih berwarna biru seperti titik terpilih
        const n = cluster.items.length;
        const diameter = n >= 200 ? 56 : n >= 50 ? 46 : n >= 10 ? 36 : 28;

        markerEl.className = 'maplibre-cluster-marker';
        markerEl.style.width = `${diameter}px`;
        markerEl.style.height = `${diameter}px`;
        markerEl.style.borderRadius = '50%';
        markerEl.style.backgroundColor = isSelected ? '#2F6FDE' : 'rgba(74, 67, 56, 0.85)';
        markerEl.style.color = '#FFFDF9';
        markerEl.style.display = 'flex';
        markerEl.style.alignItems = 'center';
        markerEl.style.justifyContent = 'center';
        markerEl.style.fontSize = '12px';
        markerEl.style.border = '2px solid #FFFDF9';
        // transform dibiarkan untuk MapLibre
        markerEl.style.userSelect = 'none';
        markerEl.textContent = String(n);
      } else {
        // Titik tunggal seperti WikiAbstrak: #9E4235 berukuran 12 px, terpilih #2F6FDE berukuran 20 px
        markerEl.className = 'maplibre-single-marker';
        markerEl.style.width = isSelected ? '20px' : '12px';
        markerEl.style.height = isSelected ? '20px' : '12px';
        markerEl.style.borderRadius = '50%';
        markerEl.style.backgroundColor = isSelected ? '#2F6FDE' : '#9E4235';
        markerEl.style.border = '2px solid #FFFDF9';
        // transform dibiarkan untuk MapLibre
      }

      markerEl.addEventListener('click', (ev) => {
        ev.stopPropagation();
        setSelectedCluster(cluster);
        setSelectedClusterItemIndex(0);
        setSelectedPhoto(cluster.items[0]);
        ignoreMoveRef.current = true;
        map.easeTo({ center: [cluster.lng, cluster.lat], duration: 400 });
      });

      const marker = new maplibregl.Marker({
        element: markerEl,
        pitchAlignment: 'viewport',
        anchor: 'center',
      })
        .setLngLat([cluster.lng, cluster.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [nearbyPhotos, selectedPhoto, clusterPhotos]);

  // Ref selalu menunjuk versi terbaru updateMapMarkers (hindari closure basi yang membuat pin hijau kembali biru)
  const updateMapMarkersRef = useRef(updateMapMarkers);
  updateMapMarkersRef.current = updateMapMarkers;

  useEffect(() => {
    updateMapMarkers();
  }, [updateMapMarkers]);

// Sinkronkan foto terpilih dengan item aktif di popup (‹ ›) agar penanda hijau konsisten
useEffect(() => {
if (!selectedCluster) return;
const activeItem = selectedCluster.items[selectedClusterItemIndex];
if (activeItem && activeItem.id !== selectedPhoto?.id) {
setSelectedPhoto(activeItem);
}
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedCluster, selectedClusterItemIndex]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleZoomEnd = () => {
      updateMapMarkers();
    };

    map.on('zoomend', handleZoomEnd);
    return () => {
      map.off('zoomend', handleZoomEnd);
    };
  }, [updateMapMarkers]);

  // Place or update user location pin
  const updateUserPin = (lat: number, lng: number, tooltipText?: string) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat([lng, lat]);
    } else {
      const userEl = document.createElement('div');
      userEl.style.width = '18px';
      userEl.style.height = '18px';
      userEl.style.backgroundColor = '#4A4338';
      userEl.style.border = '3px solid #FFFDF9';
      userEl.style.borderRadius = '50%';
      userEl.style.boxShadow = '0 1px 4px rgba(41, 36, 30, 0.4)';

      if (tooltipText) {
        userEl.title = tooltipText;
      }

      const marker = new maplibregl.Marker({
        element: userEl,
        pitchAlignment: 'viewport',
        anchor: 'bottom',
      })
        .setLngLat([lng, lat])
        .addTo(map);
      userMarkerRef.current = marker;
    }
  };

  // Helper to fallback to Network/IP geolocation if GPS is blocked or unavailable
  const fallbackToNetworkLocation = async () => {
    try {
      const ipRes = await fetch('https://get.geojs.io/v1/ip/geo.json');
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        const lat = parseFloat(ipData.latitude);
        const lng = parseFloat(ipData.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          setMapCenter([lat, lng]);
          const map = mapInstanceRef.current;
          if (map) {
            map.flyTo({ center: [lng, lat], zoom: 15, duration: 1200 });
            updateUserPin(lat, lng, `${ipData.city || 'Network'}, ${ipData.country || ''}`);
          }
          const cityLabel = ipData.city ? `${ipData.city}, ${ipData.country || ''}` : ipData.country;
          setLocationNotice(t.nearby.ipLocationFallbackNotice(cityLabel));
          setLocationError(null);
          return true;
        }
      }
    } catch (err) {
      console.warn('Network location fallback failed:', err);
    }
    return false;
  };

  // 1. Locate User Button Click Handler (Resilient GPS with automatic IP fallback)
  const handleLocateUser = () => {
    setIsLocatingUser(true);
    setLocationError(null);
    setLocationNotice(null);

    // If browser lacks geolocation API
    if (!navigator.geolocation) {
      fallbackToNetworkLocation().finally(() => setIsLocatingUser(false));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMapCenter([lat, lng]);

        const map = mapInstanceRef.current;
        if (map) {
          map.flyTo({ center: [lng, lat], zoom: 14, duration: 1200 });
          updateUserPin(lat, lng, t.nearby.locationBtn);
        }
        setIsLocatingUser(false);
      },
      async (err) => {
        console.warn('GPS Geolocation returned error:', err.code, err.message);
        // Automatic fallback to network approximate location
        const fallbackSuccess = await fallbackToNetworkLocation();
        if (!fallbackSuccess) {
          setLocationError(
            language === 'en'
              ? 'GPS permission is blocked in browser/iframe. You can pan or click on the map to choose a location.'
              : 'Izin lokasi GPS dibatasi di peramban/iframe. Anda dapat menggeser atau mengklik langsung pada peta untuk menentukan lokasi.'
          );
        }
        setIsLocatingUser(false);
      },
      { timeout: 15000, enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  // Peta dianggap bergeser bila pusat tampilan menjauh dari titik pencarian lebih dari 20% lebar peta (minimal 250 m)
  const shiftMeters = searchOrigin ? distanceMeters(shiftCenter, searchOrigin) : 0;
  const isShifted = hasSearched && !!searchOrigin && shiftMeters > Math.max(250, mapSpanM * 0.2);
  const fmtDistance = (m: number) =>
    m < 1000
      ? `${Math.round(m / 10) * 10} m`
      : `${(m / 1000).toLocaleString(language === 'en' ? 'en-GB' : 'id-ID', { maximumFractionDigits: 1 })} km`;

  const handleSearchThisArea = () => {
    void handleFindNearbyCommons();
  };

  const handleBackToSearchPoint = () => {
    const map = mapInstanceRef.current;
    if (map && searchOrigin) map.flyTo({ center: [searchOrigin.lng, searchOrigin.lat], duration: 900 });
  };

  // 2. Find Nearby Commons Button Click Handler (foto bergeotag + kategori di area ini)
  const photoReqRef = useRef<number>(0);
  const handleFindNearbyCommons = async () => {
    const reqId = ++photoReqRef.current;
    setIsLoadingNearby(true);
    setLocationError(null);
    emptyNoticeRef.current = false;
    setHasSearched(true);
    // Cari ulang: kosongkan semua hasil lama (foto, kategori, Wikidata, pilihan) agar hanya hasil baru yang tampil
    areaCatAbortRef.current?.abort();
    setNearbyPhotos([]);
    setAreaWdItems([]);
    setAreaCoordCats([]);
    setCoordFailed(false);
    setSelectedCoordCat(null);
    setCoordPage(1);
    setAreaCat({ status: 'idle', wikidata: 'skipped' });
    setSelectedWdItem(null);
    setWdPage(1);
    setSelectedPhoto(null);
    setSelectedCluster(null);
    setSelectedClusterItemIndex(0);
    setPreviewPage(1);

    const map = mapInstanceRef.current;
    // Pencarian selalu memakai titik tengah peta (garis silang), sama dengan koordinat di kartu Map Center
    const currentCenter = map ? map.getCenter() : { lng: mapCenter[1], lat: mapCenter[0] };
    setSearchOrigin({ lat: currentCenter.lat, lng: currentCenter.lng });
    setShiftCenter({ lat: currentCenter.lat, lng: currentCenter.lng });

    // Foto, kategori, dan Wikidata memakai area yang sama: tampilan peta saat ini (maksimal AREA_MAX_SPAN_M)
    const b = map?.getBounds();
    const bounds: AreaBounds | undefined = b ? { west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() } : undefined;
    // Kategori dan Wikidata dicari bersamaan dengan foto (satu tombol); fungsi ini juga menandai area terlalu luas
    void findAreaCategories();
    if (bounds && areaSpanMeters(bounds) > AREA_MAX_SPAN_M) {
      setNearbyPhotos([]);
      setLocationError(t.nearby.areaCatTooWide(AREA_MAX_SPAN_M / 1000));
      setIsLoadingNearby(false);
      return;
    }

    try {
      const results = await fetchNearbyCommonsMedia(currentCenter.lat, currentCenter.lng, 10000, 50, bounds);
      if (reqId !== photoReqRef.current) return; // pencarian yang lebih baru sudah berjalan
      setNearbyPhotos(results);
      setPreviewPage(1);
      setHasSearched(true);
      setSelectedPhoto(null);
      setSelectedCluster(null);
      setSelectedClusterItemIndex(0);

      if (results.length === 0) {
        setLocationError(t.nearby.noPhotosFound);
        emptyNoticeRef.current = true;
      }
    } catch (err) {
      if (reqId !== photoReqRef.current) return;
      console.error('Failed to search nearby commons:', err);
      setLocationError(err instanceof Error ? err.message : 'Error fetching nearby commons');
    } finally {
      if (reqId === photoReqRef.current) setIsLoadingNearby(false);
    }
  };

  // 4. Combined Mode 3D + Gedung 3D (fill-extrusion) Handler
  const toggle3D = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const next3D = !is3DMode;
    setIs3DMode(next3D);
    is3DModeRef.current = next3D;

    if (next3D) {
      try {
        if (map.getLayer('3d-buildings')) {
          map.setLayoutProperty('3d-buildings', 'visibility', 'visible');
        }
      } catch (err) {
        console.warn('3D buildings activation notice:', err);
      }
      map.easeTo({
        pitch: 60,
        bearing: -20,
        duration: 800,
      });
    } else {
      try {
        if (map.getLayer('3d-buildings')) {
          map.setLayoutProperty('3d-buildings', 'visibility', 'none');
        }
      } catch (err) {
        console.warn('3D buildings hide notice:', err);
      }
      map.easeTo({
        pitch: 0,
        bearing: 0,
        duration: 800,
      });
    }
  };

  // Skala jarak (m/km) di kiri bawah peta
  const toggleScale = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (scaleControlRef.current) {
      map.removeControl(scaleControlRef.current);
      scaleControlRef.current = null;
      setIsScaleOn(false);
    } else {
      const ctrl = new maplibregl.ScaleControl({ maxWidth: 110, unit: 'metric' });
      map.addControl(ctrl, 'bottom-left');
      scaleControlRef.current = ctrl;
      setIsScaleOn(true);
    }
  };

  // Kontur: tampilkan atau sembunyikan lapisan topografi
  const toggleTopo = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const next = !isTopoOn;
    setIsTopoOn(next);
    isTopoOnRef.current = next;
    try {
      ['contour-lines', 'contour-labels'].forEach((id) => {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', next ? 'visible' : 'none');
      });
    } catch (err) {
      console.warn('Topo layer toggle notice:', err);
    }
  };

  // 5. Focus photo on map when clicked from quick preview strip
  const focusPhotoOnMap = (photo: CommonsMediaItem) => {
    const map = mapInstanceRef.current;
    if (typeof photo.latitude !== 'number' || typeof photo.longitude !== 'number') {
      setSelectedPhoto(photo);
      return;
    }

    // Scroll to map on smaller screens so the user immediately sees the pinpoint
    if (window.innerWidth < 768) {
      mapContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (!map) {
      setSelectedPhoto(photo);
      setSelectedCluster({
        id: `single-${photo.id}`,
        lat: photo.latitude,
        lng: photo.longitude,
        items: [photo],
      });
      setSelectedClusterItemIndex(0);
      return;
    }

    // Select the photo immediately
    setSelectedPhoto(photo);
    setSelectedCluster({
      id: `single-${photo.id}`,
      lat: photo.latitude,
      lng: photo.longitude,
      items: [photo],
    });
    setSelectedClusterItemIndex(0);

    // Fly camera smoothly to the pinpoint coordinates [lng, lat]
    ignoreMoveRef.current = true;
    map.flyTo({
      center: [photo.longitude, photo.latitude],
      zoom: Math.max(map.getZoom(), 17),
      speed: 1.4,
      essential: true,
    });

    // When fly ends, check if photo is in a cluster at this zoom level and select inside cluster
    map.once('moveend', () => {
      const zoom = map.getZoom();
      const clusters = clusterPhotos(nearbyPhotos, zoom);
      const targetCluster = clusters.find((c) => c.items.some((item) => item.id === photo.id));

      if (targetCluster) {
        const itemIdx = targetCluster.items.findIndex((item) => item.id === photo.id);
        setSelectedCluster(targetCluster);
        setSelectedClusterItemIndex(itemIdx >= 0 ? itemIdx : 0);
      }
      updateMapMarkersRef.current();
    });
  };


  // Active photo being previewed in popup
  const activeClusterPhoto =
    selectedCluster && selectedCluster.items[selectedClusterItemIndex]
      ? selectedCluster.items[selectedClusterItemIndex]
      : selectedPhoto;

  // Pagination calculation for preview strip
  const totalPreviewPages = Math.ceil(nearbyPhotos.length / PREVIEW_PAGE_SIZE);
  const currentPreviewSlice = nearbyPhotos.slice(
    (previewPage - 1) * PREVIEW_PAGE_SIZE,
    previewPage * PREVIEW_PAGE_SIZE
  );
  const sideHasContent = hasSearched || nearbyPhotos.length > 0 || areaCat.status !== 'idle';
  const sideTabActive: NearbyList = sideHasContent && !isLoadingNearby && sideTab === 'photos' && nearbyPhotos.length === 0 ? 'catcoords' : sideTab;
  const totalWdPages = Math.max(1, Math.ceil(areaWdItems.length / WD_PAGE_SIZE));
  const currentWdSlice = areaWdItems.slice((wdPage - 1) * WD_PAGE_SIZE, wdPage * WD_PAGE_SIZE);
  const wdStart = (wdPage - 1) * WD_PAGE_SIZE + 1;
  const wdEnd = Math.min(wdPage * WD_PAGE_SIZE, areaWdItems.length);
  // Pilih item Wikidata tanpa foto: tandai di daftar dan peta, tutup kartu foto Commons, lalu terbang ke titiknya
  const selectWdItem = (it: WikidataAreaItem, toggle: boolean) => {
    if (toggle && selectedWdItem === it.qid) {
      setSelectedWdItem(null);
      return;
    }
    setSelectedWdItem(it.qid);
    setSelectedCoordCat(null);
    setSelectedPhoto(null);
    setSelectedCluster(null);
    setSelectedClusterItemIndex(0);
    const idx = areaWdItems.findIndex((x) => x.qid === it.qid);
    if (idx >= 0) setWdPage(Math.floor(idx / WD_PAGE_SIZE) + 1);
    const map = mapInstanceRef.current;
    if (!map) return;
    if (window.innerWidth < 768) mapContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    ignoreMoveRef.current = true;
    map.flyTo({ center: [it.lng, it.lat], zoom: Math.max(map.getZoom(), 17), speed: 1.4, essential: true });
  };
  const focusWdItem = (it: WikidataAreaItem) => selectWdItem(it, true);

  // Pilih kategori ber-koordinat: tandai di daftar dan peta, tutup kartu lain, lalu terbang ke titiknya
  const selectCoordCat = (it: CoordCategory, toggle: boolean) => {
    if (toggle && selectedCoordCat === it.name) {
      setSelectedCoordCat(null);
      return;
    }
    setSelectedCoordCat(it.name);
    setSelectedWdItem(null);
    setSelectedPhoto(null);
    setSelectedCluster(null);
    setSelectedClusterItemIndex(0);
    const idx = areaCoordCats.findIndex((x) => x.name === it.name);
    if (idx >= 0) setCoordPage(Math.floor(idx / COORD_PAGE_SIZE) + 1);
    const map = mapInstanceRef.current;
    if (!map) return;
    if (window.innerWidth < 768) mapContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    ignoreMoveRef.current = true;
    map.flyTo({ center: [it.lng, it.lat], zoom: Math.max(map.getZoom(), 17), speed: 1.4, essential: true });
  };
  const activeCoordCat = selectedCoordCat ? areaCoordCats.find((x) => x.name === selectedCoordCat) ?? null : null;
  const totalCoordPages = Math.max(1, Math.ceil(areaCoordCats.length / COORD_PAGE_SIZE));
  const currentCoordSlice = areaCoordCats.slice((coordPage - 1) * COORD_PAGE_SIZE, coordPage * COORD_PAGE_SIZE);
  const coordStart = (coordPage - 1) * COORD_PAGE_SIZE + 1;
  const coordEnd = Math.min(coordPage * COORD_PAGE_SIZE, areaCoordCats.length);

  // Pin kategori ber-koordinat (ungu, terpilih jingga). Hanya tampil saat daftar ini aktif.
  const coordMarkersRef = useRef<maplibregl.Marker[]>([]);
  useEffect(() => {
    const map = mapInstanceRef.current;
    coordMarkersRef.current.forEach((m) => m.remove());
    coordMarkersRef.current = [];
    if (!map || sideTabActive !== 'catcoords') return;
    areaCoordCats.forEach((it) => {
      const isSel = it.name === selectedCoordCat;
      const el = document.createElement('div');
      el.className = 'maplibre-catcoord-marker';
      el.style.cursor = 'pointer';
      el.style.width = isSel ? '20px' : '12px';
      el.style.height = isSel ? '20px' : '12px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = isSel ? '#E08A00' : '#7B4FBF';
      el.style.border = '2px solid #FFFDF9';
      el.style.zIndex = isSel ? '60' : '40';
      el.title = it.name;
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        selectCoordCat(it, false);
      });
      coordMarkersRef.current.push(
        new maplibregl.Marker({ element: el, pitchAlignment: 'viewport', anchor: 'center' }).setLngLat([it.lng, it.lat]).addTo(map)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaCoordCats, selectedCoordCat, sideTabActive]);
  useEffect(() => () => { coordMarkersRef.current.forEach((m) => m.remove()); coordMarkersRef.current = []; }, []);
  const activeWdItem = selectedWdItem ? areaWdItems.find((x) => x.qid === selectedWdItem) ?? null : null;

  // Pin item Wikidata tanpa foto di peta (warna beda dari foto Commons): hijau, terpilih jingga dan lebih besar.
  // Hanya tampil saat daftar "Wikidata tanpa foto" aktif.
  const wdMarkersRef = useRef<maplibregl.Marker[]>([]);
  useEffect(() => {
    const map = mapInstanceRef.current;
    wdMarkersRef.current.forEach((m) => m.remove());
    wdMarkersRef.current = [];
    if (!map || sideTabActive !== 'wikidata') return;
    areaWdItems.forEach((it) => {
      const isSel = it.qid === selectedWdItem;
      const el = document.createElement('div');
      el.className = 'maplibre-wikidata-marker';
      el.style.cursor = 'pointer';
      el.style.width = isSel ? '20px' : '12px';
      el.style.height = isSel ? '20px' : '12px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = isSel ? '#E08A00' : it.image ? '#4B7BA8' : '#2E8B57';
      el.style.border = '2px solid #FFFDF9';
      el.style.zIndex = isSel ? '60' : '40';
      el.title = it.image ? it.label : `${it.label} (${t.nearby.wdNoPhotoBadge})`;
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        selectWdItem(it, false);
      });
      wdMarkersRef.current.push(
        new maplibregl.Marker({ element: el, pitchAlignment: 'viewport', anchor: 'center' }).setLngLat([it.lng, it.lat]).addTo(map)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaWdItems, selectedWdItem, sideTabActive]);
  useEffect(() => () => { wdMarkersRef.current.forEach((m) => m.remove()); wdMarkersRef.current = []; }, []);

  // Memilih foto Commons membatalkan pilihan item Wikidata (hanya satu kartu di peta)
  useEffect(() => {
    if (selectedPhoto) {
      setSelectedWdItem(null);
      setSelectedCoordCat(null);
    }
  }, [selectedPhoto]);
  const previewStart = (previewPage - 1) * PREVIEW_PAGE_SIZE + 1;
  const previewEnd = Math.min(previewPage * PREVIEW_PAGE_SIZE, nearbyPhotos.length);

  return (
    <section className="relative isolate w-full space-y-4 pt-2" aria-label="Nearby Photos Map">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent-600 text-white flex items-center justify-center shadow-2xs">
              <MapPin className="w-4 h-4" />
            </div>
            <h2 className="font-display text-base sm:text-lg font-bold text-stone-900 dark:text-white tracking-tight">
              {t.nearby.title}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400">
            {t.nearby.subtitle}
          </p>
        </div>

      </div>

      {/* Helpful Location Notice (e.g. Switched to Network Location) */}
      {locationNotice && (
        <div className="p-3 bg-accent-50 dark:bg-accent-950/40 border border-accent-200 dark:border-accent-900 rounded-lg text-accent-900 dark:text-accent-200 text-xs flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-accent-600 shrink-0" />
            <span>{locationNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setLocationNotice(null)}
            className="text-accent-700 hover:text-accent-900 dark:text-accent-400 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error or Notice Alert */}
      {locationError && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-medium">{locationError}</span>
          </div>
          <button
            type="button"
            onClick={() => setLocationError(null)}
            className="text-amber-700 hover:text-amber-900 dark:text-amber-400 p-1 rounded-md cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

<div className="flex flex-col lg:flex-row gap-4 items-stretch">
<div className="flex-1 min-w-0 space-y-4">
      {/* MAPLIBRE GL MAP CONTAINER: gaya disamakan dengan peta Sekitar WikiAbstrak */}
      <div className="relative isolate z-0 w-full h-[460px] sm:h-[500px] lg:h-[620px] rounded-2xl overflow-hidden border border-[#E8E2D6] dark:border-[hsl(40_17%_24%)] bg-[#F2EDE2] dark:bg-[hsl(41_7%_17%)]">
        {/* MapLibre DOM container */}
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {mapUnavailable && (
          <div role="alert" className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-6">
            <div className={`max-w-sm rounded-xl px-4 py-3 text-sm text-center ${MAP_CARD}`}>
              <AlertCircle className="mx-auto mb-2 h-5 w-5 text-amber-600" aria-hidden="true" />
              {t.nearby.mapUnavailable}
            </div>
          </div>
        )}

        {/* Penanda titik tengah yang dipakai untuk koordinat dan alamat */}
        {!mapUnavailable && <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 z-10" aria-hidden="true">
          <div className="absolute left-1/2 top-0 h-full w-px bg-[#4A4338]/60 dark:bg-[hsl(37_11%_75.6%)]/60" />
          <div className="absolute top-1/2 left-0 w-full h-px bg-[#4A4338]/60 dark:bg-[hsl(37_11%_75.6%)]/60" />
        </div>}

        {/* Kolom overlay kiri-atas: status, tombol aksi, kartu titik tengah, dan petunjuk 3D */}
        <div className="absolute top-3 left-3 right-14 z-20 flex flex-col items-start gap-2 pointer-events-none">
          <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
            {(isLoadingNearby || (hasSearched && nearbyPhotos.length > 0)) && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${MAP_CARD}`}>
                {isLoadingNearby ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{t.nearby.searching}</span>
                  </>
                ) : (
                  <span>{t.nearby.foundPhotos(nearbyPhotos.length)}</span>
                )}
              </div>
            )}

            {/* Cari Commons Terdekat */}
            <button
              type="button"
              onClick={handleFindNearbyCommons}
              disabled={isLoadingNearby}
              title={language === 'en' ? 'Search geotagged photos on Wikimedia Commons near the current coordinates' : 'Cari foto bergeotag di Wikimedia Commons pada koordinat geotag saat ini'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${
                !hasSearched || isShifted ? MAP_DARK_BTN : `${MAP_CARD} ${MAP_HOVER}`
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>{t.nearby.findCommonsBtn}</span>
            </button>
          </div>

          {/* Kartu titik tengah: koordinat, alamat, dan penanda "peta bergeser" */}
          <div className={`${activeClusterPhoto ? 'hidden min-[1300px]:block' : ''} pointer-events-auto max-w-full sm:max-w-sm px-3 py-2 rounded-xl text-xs space-y-1.5 ${MAP_CARD}`}>
            <div className={`text-[10px] uppercase tracking-wide ${MAP_MUTED}`}>
              {language === 'en' ? 'Map Center' : 'Titik Tengah Peta'}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono">{`${viewCenter.lat.toFixed(6)}, ${viewCenter.lng.toFixed(6)}`}</span>
              <button
                type="button"
                onClick={() => copyText('coord', `${viewCenter.lat.toFixed(6)}, ${viewCenter.lng.toFixed(6)}`)}
                title={language === 'en' ? 'Copy' : 'Salin'}
                aria-label={`${language === 'en' ? 'Copy' : 'Salin'}: ${viewCenter.lat.toFixed(6)}, ${viewCenter.lng.toFixed(6)}`}
                className={`p-1 rounded-md shrink-0 cursor-pointer text-[#7A7060] dark:text-[hsl(37_10%_63%)] ${MAP_HOVER}`}
              >
                {copied === 'coord' ? <Check className="w-3.5 h-3.5 text-[#3E5C39] dark:text-[hsl(111_19%_73%)]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="flex items-start gap-2">
              {addr.status === 'loading' ? (
                <span className={`flex items-center gap-1.5 ${MAP_MUTED}`}>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {language === 'en' ? 'Loading address…' : 'Memuat alamat…'}
                </span>
              ) : addr.status === 'ok' ? (
                <>
                  <span className="leading-snug">{addr.text}</span>
                  <button
                    type="button"
                    onClick={() => copyText('addr', addr.text)}
                    title={language === 'en' ? 'Copy' : 'Salin'}
                    aria-label={`${language === 'en' ? 'Copy' : 'Salin'}: ${addr.text}`}
                    className={`p-1 -mt-0.5 rounded-md shrink-0 cursor-pointer text-[#7A7060] dark:text-[hsl(37_10%_63%)] ${MAP_HOVER}`}
                  >
                    {copied === 'addr' ? <Check className="w-3.5 h-3.5 text-[#3E5C39] dark:text-[hsl(111_19%_73%)]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </>
              ) : addr.status === 'idle' ? (
                <button
                  type="button"
                  onClick={loadAddress}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium cursor-pointer ${MAP_CARD} ${MAP_HOVER}`}
                >
                  <MapPin className="w-3 h-3" />
                  {language === 'en' ? 'Show address' : 'Tampilkan alamat'}
                </button>
              ) : (
                <span className={MAP_MUTED}>
                  {addr.status === 'none'
                    ? (language === 'en' ? 'No address for this point' : 'Tidak ada alamat untuk titik ini')
                    : addr.status === 'limited'
                      ? (language === 'en' ? 'Too many requests, try again in a moment' : 'Terlalu banyak permintaan, coba lagi sebentar')
                      : (language === 'en' ? 'Could not load the address' : 'Alamat tidak dapat dimuat')}
                  {(addr.status === 'error' || addr.status === 'limited') && (
                    <button
                      type="button"
                      onClick={loadAddress}
                      className="ml-1.5 underline font-medium text-[#4A4338] dark:text-[hsl(37_11%_75.6%)] cursor-pointer"
                    >
                      {language === 'en' ? 'Retry' : 'Coba lagi'}
                    </button>
                  )}
                </span>
              )}
            </div>

            {/* Peta bergeser dari titik pencarian terakhir */}
            {isShifted && searchOrigin && (
              <div role="status" className="-mx-3 -mb-2 mt-1 px-3 py-2 rounded-b-xl border-t border-[#E6CF8F] bg-[#FFF6E0] text-[#5C4410] dark:border-amber-800 dark:bg-amber-950/70 dark:text-amber-100 space-y-1.5">
                <div className="font-semibold">
                  {language === 'en'
                    ? `Map moved ${fmtDistance(shiftMeters)} from the search point`
                    : `Peta bergeser ${fmtDistance(shiftMeters)} dari titik pencarian`}
                </div>
                <div className="font-mono text-[11px] leading-snug opacity-90">
                  {language === 'en' ? 'Results are for' : 'Hasil untuk'} {fmtCoord(searchOrigin)}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={handleSearchThisArea}
                    disabled={isLoadingNearby}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[#8A5F0F] px-2.5 py-1 font-semibold text-[#FFFDF9] transition-colors hover:bg-[#6E4C0C] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5" />
                    {language === 'en' ? 'Search this area' : 'Cari di area ini'}
                  </button>
                  <button
                    type="button"
                    onClick={handleBackToSearchPoint}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#D6B65A] px-2.5 py-1 font-medium transition-colors hover:bg-[#F7E8BE] dark:border-amber-700 dark:hover:bg-amber-900/60 cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    {language === 'en' ? 'Back to search point' : 'Kembali ke titik pencarian'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Petunjuk Mode 3D: tampil beberapa detik setelah mode dinyalakan */}
          {is3DMode && show3DHint && (
            <div className="pointer-events-none max-w-full sm:max-w-sm flex items-start gap-2 px-3 py-1.5 rounded-lg bg-[#4A4338]/90 text-[#FFFDF9] text-[11px] leading-snug shadow-sm">
              <Box className="w-3.5 h-3.5 shrink-0 mt-px" />
              <span>
                {language === 'en'
                  ? '3D Mode: 3D buildings • Right-click drag / Ctrl+drag to tilt & rotate'
                  : 'Mode 3D: Gedung 3D • Klik kanan / Ctrl+geser untuk kemiringan & rotasi'}
              </span>
            </div>
          )}
        </div>

        {/* Kartu foto terpilih (kiri bawah): mendukung beberapa foto pada satu titik lewat tombol ‹ › */}
        {activeClusterPhoto && (
          <div className={`absolute left-3 right-3 ${isScaleOn ? 'bottom-16' : 'bottom-8'} sm:left-auto sm:right-14 sm:bottom-3 sm:w-80 z-30 p-3 rounded-xl bg-[#FFFDF9] dark:bg-[hsl(40_7%_12.5%)] border border-[#E8E2D6] dark:border-[hsl(40_17%_24%)] shadow-lg space-y-2 text-xs animate-fadeIn`}>
            <button
              type="button"
              onClick={() => {
                setSelectedPhoto(null);
                setSelectedCluster(null);
                setSelectedClusterItemIndex(0);
              }}
              aria-label={t.nearby.dismiss}
              title={t.nearby.dismiss}
              className={`absolute top-2 right-2 z-10 p-1 rounded-full cursor-pointer text-[#7A7060] dark:text-[hsl(37_10%_63%)] ${MAP_HOVER}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="pr-6">
              <div className="font-display text-base font-semibold text-[#29241E] dark:text-[hsl(33_12%_84%)] leading-snug line-clamp-2">
                {activeClusterPhoto.cleanTitle}
              </div>
              <div className="text-[11px] font-mono text-[#7A7060] dark:text-[hsl(37_10%_63%)] truncate">
                {dedupAuthor(activeClusterPhoto.author)}
                {activeClusterPhoto.licenseShort ? ` • ${activeClusterPhoto.licenseShort}` : ''}
              </div>
            </div>

            {/* Thumbnail Image */}
            <div className="relative h-28 sm:h-auto sm:aspect-video rounded-lg bg-[#F2EDE2] dark:bg-[hsl(41_7%_17%)] overflow-hidden">
              {loadedPreviewId !== activeClusterPhoto.id && failedPreviewId !== activeClusterPhoto.id && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#F2EDE2] dark:bg-[hsl(41_7%_17%)] animate-pulse" role="status" aria-live="polite">
                  <div className="w-6 h-6 rounded-full border-2 border-[#C9BFAE] border-t-[#6B6151] animate-spin" />
                  <span className={`text-xs ${MAP_MUTED}`}>{language === 'en' ? 'Loading photo…' : 'Memuat foto…'}</span>
                </div>
              )}
              {failedPreviewId === activeClusterPhoto.id && (
                <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#F2EDE2] dark:bg-[hsl(41_7%_17%)] ${MAP_MUTED}`}>
                  <ImageIcon className="w-6 h-6" />
                  <span className="text-xs">{language === 'en' ? 'Photo failed to load' : 'Foto gagal dimuat'}</span>
                  <button type="button" onClick={() => { setFailedPreviewId(null); setPreviewRetry((n) => n + 1); }} className={`px-2 py-1 text-xs font-semibold rounded-md cursor-pointer ${MAP_CARD} ${MAP_HOVER}`}>{language === 'en' ? 'Retry' : 'Coba lagi'}</button>
                </div>
              )}
              <img
                key={`${activeClusterPhoto.id}-${previewRetry}`}
                src={activeClusterPhoto.thumbnailUrl || activeClusterPhoto.fileUrl}
                alt={activeClusterPhoto.cleanTitle}
                className={`w-full h-full object-cover transition-opacity duration-200 ${loadedPreviewId === activeClusterPhoto.id ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setLoadedPreviewId(activeClusterPhoto.id)}
                onError={() => setFailedPreviewId(activeClusterPhoto.id)}
              />

              {/* Navigasi kluster bila ada beberapa foto pada titik ini */}
              {selectedCluster && selectedCluster.items.length > 1 && (
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between text-white text-xs">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedClusterItemIndex((prev) =>
                        prev > 0 ? prev - 1 : selectedCluster.items.length - 1
                      );
                    }}
                    className="p-1 rounded-full bg-white/20 hover:bg-white/40 transition-colors cursor-pointer"
                    title={language === 'en' ? 'Previous photo' : 'Foto sebelumnya'}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <span className="font-mono text-xs tracking-wider">
                    {selectedClusterItemIndex + 1} / {selectedCluster.items.length}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedClusterItemIndex((prev) =>
                        prev < selectedCluster.items.length - 1 ? prev + 1 : 0
                      );
                    }}
                    className="p-1 rounded-full bg-white/20 hover:bg-white/40 transition-colors cursor-pointer"
                    title={language === 'en' ? 'Next photo' : 'Foto selanjutnya'}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <p className="text-xs text-[#695F4F] dark:text-[hsl(37_11%_68%)] line-clamp-2">
              {activeClusterPhoto.description || (language === 'en' ? 'Geotagged photo file from Wikimedia Commons' : 'Berkas foto bergeotag dari Wikimedia Commons')}
            </p>

            <div className="flex items-center gap-2">
              <a
                href={detailPath(activeClusterPhoto)}
                {...NEW_TAB}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${MAP_DARK_BTN}`}
              >
                <span>{t.nearby.viewInModal}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
              <a
                href={activeClusterPhoto.pageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`p-2 rounded-lg border border-[#E8E2D6] dark:border-[hsl(40_17%_24%)] text-[#4A4338] dark:text-[hsl(37_11%_75.6%)] transition-colors ${MAP_HOVER}`}
                title={language === 'en' ? 'View on Wikimedia Commons' : 'Lihat di Wikimedia Commons'}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* Kartu item Wikidata (kiri bawah/kanan bawah, seperti kartu foto Commons) */}
        {activeWdItem && !activeClusterPhoto && (
          <div className={`absolute left-3 right-3 ${isScaleOn ? 'bottom-16' : 'bottom-8'} sm:left-auto sm:right-14 sm:bottom-3 sm:w-80 z-30 p-3 rounded-xl bg-[#FFFDF9] dark:bg-[hsl(40_7%_12.5%)] border border-[#E8E2D6] dark:border-[hsl(40_17%_24%)] shadow-lg space-y-2 text-xs animate-fadeIn`}>
            <button
              type="button"
              onClick={() => setSelectedWdItem(null)}
              aria-label={t.nearby.dismiss}
              title={t.nearby.dismiss}
              className={`absolute top-2 right-2 z-10 p-1 rounded-full cursor-pointer text-[#7A7060] dark:text-[hsl(37_10%_63%)] ${MAP_HOVER}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="pr-6 space-y-0.5">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#2E8B57]">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#E08A00] border border-[#FFFDF9]" />
                {t.nearby.tabNoPhoto}
                {!activeWdItem.image && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200 text-[10px] font-semibold">
                    {t.nearby.wdNoPhotoBadge}
                  </span>
                )}
              </div>
              <div className="font-display text-base font-semibold text-[#29241E] dark:text-[hsl(33_12%_84%)] leading-snug">
                {activeWdItem.label}
              </div>
              {activeWdItem.description && (
                <div className="text-[#695F4F] dark:text-[hsl(37_11%_68%)]">{activeWdItem.description}</div>
              )}
              <div className="text-[11px] font-mono text-[#7A7060] dark:text-[hsl(37_10%_63%)]">
                {activeWdItem.qid} • {activeWdItem.lat.toFixed(5)}, {activeWdItem.lng.toFixed(5)}
              </div>
            </div>
            {activeWdItem.image ? (
              <img
                src={activeWdItem.image}
                alt={activeWdItem.label}
                loading="lazy"
                className="w-full h-28 sm:h-36 rounded-lg object-cover bg-[#F2EDE2] dark:bg-[hsl(41_7%_17%)]"
              />
            ) : (
              <p className="text-[#695F4F] dark:text-[hsl(37_11%_68%)]">{t.nearby.noPhotoCardHint}</p>
            )}
            <div className="flex items-center gap-2">
              {activeWdItem.category && (
                <a
                  href={categorySearchHref(activeWdItem.category)}
                  {...NEW_TAB}
                  title={activeWdItem.category}
                  className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${MAP_DARK_BTN}`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{t.nearby.areaCatSearchIn}</span>
                </a>
              )}
              <a
                href={`https://www.wikidata.org/wiki/${activeWdItem.qid}`}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  activeWdItem.category
                    ? `p-2 rounded-lg border border-[#E8E2D6] dark:border-[hsl(40_17%_24%)] text-[#4A4338] dark:text-[hsl(37_11%_75.6%)] transition-colors ${MAP_HOVER}`
                    : `w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${MAP_DARK_BTN}`
                }
                title={t.nearby.noPhotoOpen}
                aria-label={t.nearby.noPhotoOpen}
              >
                {!activeWdItem.category && <span>{t.nearby.noPhotoOpen}</span>}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* Kartu kategori ber-koordinat */}
        {activeCoordCat && !activeClusterPhoto && (
          <div className={`absolute left-3 right-3 ${isScaleOn ? 'bottom-16' : 'bottom-8'} sm:left-auto sm:right-14 sm:bottom-3 sm:w-80 z-30 p-3 rounded-xl bg-[#FFFDF9] dark:bg-[hsl(40_7%_12.5%)] border border-[#E8E2D6] dark:border-[hsl(40_17%_24%)] shadow-lg space-y-2 text-xs animate-fadeIn`}>
            <button
              type="button"
              onClick={() => setSelectedCoordCat(null)}
              aria-label={t.nearby.dismiss}
              title={t.nearby.dismiss}
              className={`absolute top-2 right-2 z-10 p-1 rounded-full cursor-pointer text-[#7A7060] dark:text-[hsl(37_10%_63%)] ${MAP_HOVER}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="pr-6 space-y-0.5">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#7B4FBF]">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#E08A00] border border-[#FFFDF9]" />
                {t.nearby.tabCoordCats}
              </div>
              <div className="font-display text-base font-semibold text-[#29241E] dark:text-[hsl(33_12%_84%)] leading-snug break-words">
                {activeCoordCat.name}
              </div>
              <div className="text-[11px] font-mono text-[#7A7060] dark:text-[hsl(37_10%_63%)]">
                {fmtCoord({ lat: activeCoordCat.lat, lng: activeCoordCat.lng })}
              </div>
            </div>
            <p className="text-[#695F4F] dark:text-[hsl(37_11%_68%)]">{t.nearby.coordCatsCardHint}</p>
            <div className="flex items-center gap-2">
              <a
                href={categorySearchHref(activeCoordCat.name)}
                {...NEW_TAB}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${MAP_DARK_BTN}`}
              >
                <span>{t.nearby.areaCatSearchIn}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
              <a
                href={`https://commons.wikimedia.org/wiki/Category:${encodeURIComponent(activeCoordCat.name.replace(/ /g, '_'))}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`p-2 rounded-lg border border-[#E8E2D6] dark:border-[hsl(40_17%_24%)] text-[#4A4338] dark:text-[hsl(37_11%_75.6%)] transition-colors ${MAP_HOVER}`}
                title={t.nearby.coordCatsOpenCommons}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* Tombol alat di kanan atas: lokasi saya, 3D, kontur, skala */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={handleLocateUser}
            disabled={isLocatingUser}
            aria-label={t.nearby.locationBtn}
            title={t.nearby.locationBtn}
            className={`p-2 rounded-full border shadow-sm transition-colors cursor-pointer disabled:opacity-60 ${MAP_CARD} ${MAP_HOVER}`}
          >
            <LocateFixed className={`w-4 h-4 ${isLocatingUser ? 'animate-spin' : ''}`} />
          </button>

          {/* Mode 3D (kemiringan kamera + gedung 3D) */}
          <button
            type="button"
            onClick={toggle3D}
            aria-pressed={is3DMode}
            aria-label={language === 'en' ? '3D mode' : 'Mode 3D'}
            title={
              is3DMode
                ? (language === 'en' ? 'Disable 3D Mode' : 'Nonaktifkan Mode 3D')
                : (language === 'en' ? 'Enable 3D Mode' : 'Aktifkan Mode 3D')
            }
            className={`${mapToolBtn(is3DMode)} flex items-center justify-center`}
          >
            <span className="w-4 h-4 flex items-center justify-center text-[11px] font-extrabold tracking-tight leading-none">3D</span>
          </button>

          {/* Kontur (garis ketinggian dari data elevasi) */}
          <button
            type="button"
            onClick={toggleTopo}
            aria-pressed={isTopoOn}
            aria-label={language === 'en' ? 'Contour lines' : 'Kontur'}
            title={
              isTopoOn
                ? (language === 'en' ? 'Hide contour lines' : 'Sembunyikan kontur')
                : (language === 'en' ? 'Show contour lines' : 'Tampilkan garis kontur')
            }
            className={mapToolBtn(isTopoOn)}
          >
            <Mountain className="w-4 h-4" />
          </button>

          {/* Skala */}
          <button
            type="button"
            onClick={toggleScale}
            aria-pressed={isScaleOn}
            aria-label={language === 'en' ? 'Scale bar' : 'Skala'}
            title={
              isScaleOn
                ? (language === 'en' ? 'Hide scale bar' : 'Sembunyikan skala')
                : (language === 'en' ? 'Show scale bar' : 'Tampilkan skala')
            }
            className={mapToolBtn(isScaleOn)}
          >
            <Ruler className="w-4 h-4" />
          </button>
        </div>
      </div>

</div>

      {/* Horizontal Strip of Found Photos with Pagination */}
      {(
<div className="relative w-full lg:w-[340px] xl:w-[380px] lg:shrink-0 lg:min-h-[320px]">
<div className="space-y-3 pt-2 lg:pt-0 lg:px-3 lg:pb-3 lg:absolute lg:inset-0 lg:overflow-y-auto lg:rounded-lg lg:border lg:border-stone-200 dark:lg:border-stone-800 lg:bg-white dark:lg:bg-stone-900/60">
          {/* Panel samping dan chip tab selalu ada; isinya kosong sampai pencarian pertama dijalankan */}
          {/* Tab daftar samping: Foto | Kategori */}
          <div role="tablist" className="flex flex-wrap gap-1.5 lg:pt-3">
            {([
              ['photos', t.nearby.tabPhotos, hasSearched ? nearbyPhotos.length : null],
              ['catcoords', t.nearby.tabCoordCats, areaCat.status === 'ok' && !coordFailed ? areaCoordCats.length : null],
              ['wikidata', t.nearby.tabNoPhoto, areaCat.status === 'ok' && areaCat.wikidata !== 'skipped' ? areaWdItems.length : null],
            ] as const).map(([id, label, n]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={sideTabActive === id}
                onClick={() => changeSideTab(id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium cursor-pointer transition-colors ${
                  sideTabActive === id ? MAP_DARK_BTN : `${MAP_CARD} ${MAP_HOVER}`
                }`}
              >
                {id !== 'photos' && areaCat.status === 'loading' ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                <span>{label}</span>
                {n !== null && <span className="font-mono tabular-nums opacity-80">{n}</span>}
              </button>
            ))}
          </div>

          {!sideHasContent && (
            <p className="flex items-start gap-2 text-xs sm:text-sm leading-snug text-stone-500 dark:text-stone-400">
              <Search className="w-4 h-4 shrink-0 mt-px" />
              <span>{t.nearby.sideEmptyHint}</span>
            </p>
          )}

          {sideHasContent && (<>
          {sideTabActive === 'photos' && nearbyPhotos.length === 0 && (
            isLoadingNearby ? (
              <div role="status" aria-live="polite" className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {t.nearby.searching}
              </div>
            ) : (
              <p className="text-xs text-stone-600 dark:text-stone-400">{t.nearby.noPhotosFound}</p>
            )
          )}
          {sideTabActive === 'catcoords' && (
            <div className="space-y-3">
              <p className="flex items-start gap-2 text-xs sm:text-sm leading-snug text-stone-600 dark:text-stone-400">
                <Info className="w-4 h-4 shrink-0 mt-px" />
                <span>{t.nearby.coordCatsNote}</span>
              </p>

              {areaCat.status === 'loading' && (
                <div role="status" aria-live="polite" className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {t.nearby.areaCatLoading}
                </div>
              )}
              {areaCat.status === 'toowide' && (
                <div role="status" className="flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>{t.nearby.areaCatTooWide(AREA_MAX_SPAN_M / 1000)}</span>
                </div>
              )}
              {areaCat.status === 'error' && (
                <div role="alert" className="flex flex-wrap items-center gap-2 text-xs text-amber-900 dark:text-amber-200">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>{t.nearby.areaCatError}</span>
                  <button type="button" onClick={findAreaCategories} className="underline font-medium cursor-pointer">
                    {t.nearby.areaCatRetry}
                  </button>
                </div>
              )}
              {areaCat.status === 'ok' && coordFailed && (
                <p className="text-xs text-amber-900 dark:text-amber-200">{t.nearby.coordCatsFailed}</p>
              )}
              {areaCat.status === 'ok' && !coordFailed && areaCoordCats.length === 0 && (
                <p className="text-xs text-stone-600 dark:text-stone-400">{t.nearby.coordCatsEmpty}</p>
              )}
              {areaCat.status === 'ok' && areaCoordCats.length > 0 && (
                <>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between lg:flex-col lg:items-stretch lg:sticky lg:top-0 lg:z-20 lg:-mx-3 lg:px-4 lg:pt-3 lg:pb-3 lg:bg-white dark:lg:bg-stone-900 lg:border-b lg:border-stone-200 dark:lg:border-stone-800 lg:shadow-[0_6px_10px_-8px_rgba(24,30,41,0.25)] lg:rounded-t-lg text-xs text-stone-600 dark:text-stone-400 px-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0">
                      <span className="font-semibold text-stone-800 dark:text-stone-200">{t.nearby.coordCatsTitle}</span>
                      <span className="font-mono text-xs text-stone-500 dark:text-stone-400">
                        ({t.nearby.coordCatsRange(coordStart, coordEnd, areaCoordCats.length)})
                      </span>
                    </div>
                    {totalCoordPages > 1 && (
                      <div className="flex items-center gap-1.5 shrink-0 lg:self-end">
                        <button
                          type="button"
                          onClick={() => setCoordPage((p) => Math.max(1, p - 1))}
                          disabled={coordPage === 1}
                          className="p-2 rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-800 disabled:opacity-40 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                          title={t.nearby.previewPrev}
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-mono px-1.5 tabular-nums whitespace-nowrap">
                          {coordPage} / {totalCoordPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCoordPage((p) => Math.min(totalCoordPages, p + 1))}
                          disabled={coordPage === totalCoordPages}
                          className="p-2 rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-800 disabled:opacity-40 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                          title={t.nearby.previewNext}
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  {areaCoordCats.length >= COORD_CATEGORY_LIMIT && (
                    <div className="text-xs text-stone-500 dark:text-stone-400 px-1">{t.nearby.coordCatsTruncated}</div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                    {currentCoordSlice.map((it) => {
                      const isSelected = selectedCoordCat === it.name;
                      return (
                        <div
                          key={it.name}
                          onClick={() => selectCoordCat(it, true)}
                          className={`relative rounded-lg border bg-white dark:bg-stone-900 cursor-pointer transition-colors p-2.5 space-y-2 ${
                            isSelected
                              ? 'border-accent-600 dark:border-accent-400 ring-2 ring-accent-600/40 dark:ring-accent-400/40'
                              : 'border-stone-300 dark:border-stone-800 hover:border-accent-600 dark:hover:border-accent-400'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium leading-snug text-stone-900 dark:text-white break-words" title={it.name}>
                              {it.name}
                            </p>
                            {isSelected && (
                              <div className="w-5 h-5 shrink-0 rounded-full bg-accent-600 text-white flex items-center justify-center">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-mono text-stone-500 dark:text-stone-400">{fmtCoord({ lat: it.lat, lng: it.lng })}</span>
                            <a
                              href={categorySearchHref(it.name)}
                              {...NEW_TAB}
                              onClick={(e) => e.stopPropagation()}
                              title={t.nearby.areaCatSearchIn}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-stone-300 dark:border-stone-700 text-[11px] font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                            >
                              <Search className="w-3 h-3" />
                              {t.nearby.areaCatSearchIn}
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {sideTabActive === 'wikidata' && (
            <div className="space-y-3">
              <p className="flex items-start gap-2 text-xs sm:text-sm leading-snug text-stone-600 dark:text-stone-400">
                <Info className="w-4 h-4 shrink-0 mt-px" />
                <span>{t.nearby.noPhotoNote}</span>
              </p>

              {areaCat.status === 'loading' && (
                <div role="status" aria-live="polite" className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {t.nearby.areaCatLoading}
                </div>
              )}
              {areaCat.status === 'toowide' && (
                <div role="status" className="flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>{t.nearby.areaCatTooWide(AREA_MAX_SPAN_M / 1000)}</span>
                </div>
              )}
              {areaCat.status === 'error' && (
                <div role="alert" className="flex flex-wrap items-center gap-2 text-xs text-amber-900 dark:text-amber-200">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>{t.nearby.areaCatError}</span>
                  <button type="button" onClick={findAreaCategories} className="underline font-medium cursor-pointer">
                    {t.nearby.areaCatRetry}
                  </button>
                </div>
              )}
              {areaCat.status === 'ok' && areaCat.wikidata === 'skipped' && (
                <p className="text-xs text-stone-600 dark:text-stone-400">{t.nearby.noPhotoSkipped}</p>
              )}
              {areaCat.status === 'ok' && areaCat.wikidata === 'failed' && areaWdItems.length === 0 && (
                <p className="text-xs text-amber-900 dark:text-amber-200">{t.nearby.areaCatWikidataFailed}</p>
              )}
              {areaCat.status === 'ok' && areaCat.wikidata === 'ok' && areaWdItems.length === 0 && (
                <p className="text-xs text-stone-600 dark:text-stone-400">{t.nearby.noPhotoEmpty}</p>
              )}
              {areaCat.status === 'ok' && areaWdItems.length > 0 && (
                <>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between lg:flex-col lg:items-stretch lg:sticky lg:top-0 lg:z-20 lg:-mx-3 lg:px-4 lg:pt-3 lg:pb-3 lg:bg-white dark:lg:bg-stone-900 lg:border-b lg:border-stone-200 dark:lg:border-stone-800 lg:shadow-[0_6px_10px_-8px_rgba(24,30,41,0.25)] lg:rounded-t-lg text-xs text-stone-600 dark:text-stone-400 px-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0">
                      <span className="font-semibold text-stone-800 dark:text-stone-200">{t.nearby.noPhotoTitle}</span>
                      <span className="font-mono text-xs text-stone-500 dark:text-stone-400">
                        ({t.nearby.noPhotoRange(wdStart, wdEnd, areaWdItems.length)})
                      </span>
                    </div>
                    {totalWdPages > 1 && (
                      <div className="flex items-center gap-1.5 shrink-0 lg:self-end">
                        <button
                          type="button"
                          onClick={() => setWdPage((p) => Math.max(1, p - 1))}
                          disabled={wdPage === 1}
                          className="p-2 rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-800 disabled:opacity-40 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                          title={t.nearby.previewPrev}
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-mono px-1.5 tabular-nums whitespace-nowrap">
                          {wdPage} / {totalWdPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setWdPage((p) => Math.min(totalWdPages, p + 1))}
                          disabled={wdPage === totalWdPages}
                          className="p-2 rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-800 disabled:opacity-40 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                          title={t.nearby.previewNext}
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-stone-500 dark:text-stone-400 px-1">
                    {t.nearby.wdSummary(areaWdItems.filter((x) => !x.image).length, areaWdItems.length)}
                    {areaWdItems.length >= WIKIDATA_ITEMS_LIMIT ? ` — ${t.nearby.wdTruncated}` : ''}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                    {currentWdSlice.map((it) => {
                      const isSelected = selectedWdItem === it.qid;
                      return (
                        <div
                          key={it.qid}
                          onClick={() => focusWdItem(it)}
                          className={`relative rounded-lg border bg-white dark:bg-stone-900 cursor-pointer transition-colors p-2.5 space-y-2 ${
                            isSelected
                              ? 'border-accent-600 dark:border-accent-400 ring-2 ring-accent-600/40 dark:ring-accent-400/40'
                              : 'border-stone-300 dark:border-stone-800 hover:border-accent-600 dark:hover:border-accent-400'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            {it.image && (
                              <img
                                src={it.image}
                                alt=""
                                loading="lazy"
                                className="w-16 h-16 shrink-0 rounded-md object-cover bg-stone-100 dark:bg-stone-800"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium leading-snug text-stone-900 dark:text-white break-words" title={it.label}>
                                  {it.label}
                                </p>
                                {isSelected && (
                                  <div className="w-5 h-5 shrink-0 rounded-full bg-accent-600 text-white flex items-center justify-center">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </div>
                                )}
                              </div>
                              {it.description && (
                                <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2">{it.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs font-mono text-stone-500 dark:text-stone-400">{it.qid}</span>
                              {!it.image && (
                                <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200 text-[10px] font-semibold whitespace-nowrap">
                                  {t.nearby.wdNoPhotoBadge}
                                </span>
                              )}
                            </span>
                            <span className="flex items-center gap-1.5 shrink-0">
                              {it.category && (
                                <a
                                  href={categorySearchHref(it.category)}
                                  {...NEW_TAB}
                                  onClick={(e) => e.stopPropagation()}
                                  title={`${t.nearby.areaCatSearchIn}: ${it.category}`}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-stone-300 dark:border-stone-700 text-[11px] font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                                >
                                  <Search className="w-3 h-3" />
                                  {t.nearby.areaCatSearchIn}
                                </a>
                              )}
                              <a
                                href={`https://www.wikidata.org/wiki/${it.qid}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                title={t.nearby.noPhotoOpen}
                                aria-label={t.nearby.noPhotoOpen}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-stone-300 dark:border-stone-700 text-[11px] font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                              >
                                <ExternalLink className="w-3 h-3" />
                                {it.category ? '' : t.nearby.noPhotoOpen}
                              </a>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {sideTabActive === 'photos' && nearbyPhotos.length > 0 && (<>
          {/* Baris Kontrol Strip: Jumlah foto & Navigasi Pagination */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between lg:flex-col lg:items-stretch lg:sticky lg:top-0 lg:z-20 lg:-mx-3 lg:px-4 lg:pt-3 lg:pb-3 lg:bg-white dark:lg:bg-stone-900 lg:border-b lg:border-stone-200 dark:lg:border-stone-800 lg:shadow-[0_6px_10px_-8px_rgba(24,30,41,0.25)] lg:rounded-t-lg text-xs text-stone-600 dark:text-stone-400 px-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0">
              <span className="font-semibold text-stone-800 dark:text-stone-200">
                {t.nearby.previewTitle}
              </span>
              <span className="font-mono text-xs text-stone-500 dark:text-stone-400">
                ({t.nearby.previewRange(previewStart, previewEnd, nearbyPhotos.length)})
              </span>
            </div>

            {/* Kontrol Pagination Strip */}
            {totalPreviewPages > 1 && (
              <div className="flex items-center gap-1.5 shrink-0 lg:self-end">
                <button
                  type="button"
                  onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                  disabled={previewPage === 1}
                  className="p-2 rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-800 disabled:opacity-40 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                  title={t.nearby.previewPrev}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <span className="text-xs font-mono px-1.5 tabular-nums whitespace-nowrap">
                  {previewPage} / {totalPreviewPages}
                </span>

                <button
                  type="button"
                  onClick={() => setPreviewPage((p) => Math.min(totalPreviewPages, p + 1))}
                  disabled={previewPage === totalPreviewPages}
                  className="p-2 rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-800 disabled:opacity-40 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                  title={t.nearby.previewNext}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Grid Preview Cards */}
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-2 gap-3">
            {currentPreviewSlice.map((photo) => {
              const isSelected = selectedPhoto?.id === photo.id;
              const ext = getFileExtension(photo.title);
              const rawAuthor = (photo.author || 'Commons').trim();
              const half = rawAuthor.length / 2;
              const authorLabel = Number.isInteger(half) && half > 0 && rawAuthor.slice(0, half) === rawAuthor.slice(half) ? rawAuthor.slice(0, half) : rawAuthor;

              return (
                <div
                  key={photo.id}
                  onClick={() => focusPhotoOnMap(photo)}
                  className={`group relative rounded-lg overflow-hidden border bg-white dark:bg-stone-900 cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-accent-600 dark:border-accent-400 ring-2 ring-accent-600/40 dark:ring-accent-400/40'
                      : 'border-stone-300 dark:border-stone-800 hover:border-accent-600 dark:hover:border-accent-400'
                  }`}
                >
                  {/* Aspect Ratio Container */}
                  <div className="relative aspect-[4/3] bg-stone-100 dark:bg-stone-800 overflow-hidden">
                    <img
                      src={photo.thumbnailUrl || photo.fileUrl}
                      alt={photo.cleanTitle}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />

                    {/* Badge Ekstensi */}
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-stone-900/80 text-white font-mono text-xs uppercase">
                      {ext}
                    </span>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-accent-600 text-white flex items-center justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  {/* Metadata Ringkas */}
                  <div className="p-2.5 space-y-1">
                    <p className="text-sm font-medium leading-snug text-stone-900 dark:text-white line-clamp-2" title={photo.cleanTitle}>
                      {photo.cleanTitle}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400 truncate" title={authorLabel}>
                      {authorLabel}
                    </p>
                    {photo.licenseShort && (
                      <span className="inline-block max-w-full truncate rounded bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 text-xs font-medium text-stone-600 dark:text-stone-300 align-top">
                        {photo.licenseShort}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </>)}
          </>)}
        </div>
</div>
      )}
</div>

    </section>
  );
};
