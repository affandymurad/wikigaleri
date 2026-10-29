import { REPORT_LANGUAGES } from '../i18n/reportLanguages';
import type { CategorySearchMode, CommonsMediaItem, LicenseCategory, MediaType, SortOrder } from '../types/wikimedia';

/**
 * Pemetaan state pencarian <-> URL.
 *
 *   /                                    beranda (kata kunci bawaan)
 *   /?q=batik&type=image&license=pd      kata kunci + filter jenis media + lisensi
 *   /?user=Affandy_Murad&view=talk       unggahan atau halaman pembicaraan pengguna
 *   /?mode=categories&q=Batik&cat=subcategories | parents | wikivoyage | wikipedia
 *   /?mode=categories&q=Batik&cat=wikipedia&lang=de        bahasa/edisi pada tab Wikivoyage dan Wikipedia
 *   /?mode=nearby | live | random | bookmarks
 *   /?mode=nearby&lat=-6.1753924&lon=106.8271528&zoom=14   titik tengah dan zoom peta Sekitar
 *   /file/Waterworks_Museum_(85472)bw.jpg  detail berkas (nama berkas seperti di Commons)
 *   /file/Nama.svg?tab=license             tab detail: download | cats | license | history | talk (ai = bawaan)
 */

export const DEFAULT_QUERY = 'Wikilokal';

export type UrlMode = 'keywords' | 'nearby' | 'categories' | 'live' | 'random' | 'bookmarks';

export interface UrlSearchState {
  mode: UrlMode;
  query: string;
  mediaType: MediaType;
  license: LicenseCategory;
  sort: SortOrder;
  userMode: boolean;
  userView: 'uploads' | 'talk';
  categoryView: CategorySearchMode;
}

const MODES: UrlMode[] = ['keywords', 'nearby', 'categories', 'live', 'random', 'bookmarks'];
const TYPES: MediaType[] = ['all', 'image', 'audio', 'video', 'document', '3d', 'panorama'];
const LICENSES: LicenseCategory[] = ['all', 'pd', 'cc_by', 'cc_by_sa', 'gfdl', 'other'];
const CATEGORY_VIEWS: Record<string, CategorySearchMode> = {
  media: 'media',
  subcategories: 'subcategories',
  parents: 'parent_categories',
  wikivoyage: 'wikivoyage',
  wikipedia: 'wikipedia',
};
const CATEGORY_VIEW_PARAM: Record<string, string> = {
  media: 'media',
  subcategories: 'subcategories',
  parent_categories: 'parents',
  wikivoyage: 'wikivoyage',
  wikipedia: 'wikipedia',
};

/** Spasi ditulis sebagai garis bawah di URL, seperti di Commons */
const toUrlText = (s: string) => s.trim().replace(/ /g, '_');
const fromUrlText = (s: string) => s.replace(/_/g, ' ').trim();

export function buildSearch(s: UrlSearchState): string {
  const p = new URLSearchParams();
  if (s.mode !== 'keywords') p.set('mode', s.mode);

  if (s.mode === 'keywords') {
    if (s.userMode) {
      p.set('user', toUrlText(s.query));
      if (s.userView === 'talk') p.set('view', 'talk');
    } else {
      const others =
        s.mediaType !== 'all' || s.license !== 'all' || s.sort !== 'relevance';
      if (s.query !== DEFAULT_QUERY || others) p.set('q', s.query);
      if (s.mediaType !== 'all') p.set('type', s.mediaType);
      if (s.license !== 'all') p.set('license', s.license);
      if (s.sort !== 'relevance') p.set('sort', s.sort);
    }
  } else if (s.mode === 'categories') {
    p.set('q', s.query);
    if (s.categoryView !== 'media') p.set('cat', CATEGORY_VIEW_PARAM[s.categoryView]);
    if (s.categoryView === 'media') {
      if (s.license !== 'all') p.set('license', s.license);
      if (s.sort !== 'relevance') p.set('sort', s.sort);
    }
  }

  // URLSearchParams menulis spasi sebagai "+", tetap terbaca benar saat di-parse
  const str = p.toString().replace(/%2F/gi, '/').replace(/%3A/gi, ':');
  return str ? `?${str}` : '';
}

export function parseSearch(search: string): UrlSearchState {
  const p = new URLSearchParams(search);
  const rawMode = p.get('mode') as UrlMode | null;
  const user = p.get('user');
  const mode: UrlMode = rawMode && MODES.includes(rawMode) ? rawMode : 'keywords';

  const type = p.get('type') as MediaType | null;
  const license = p.get('license') as LicenseCategory | null;
  const sort = p.get('sort');
  const cat = CATEGORY_VIEWS[p.get('cat') ?? ''] ?? 'media';
  const hasOther = ['mode', 'user', 'type', 'license', 'sort', 'view', 'cat'].some((k) => p.has(k));

  const base: UrlSearchState = {
    mode,
    query: DEFAULT_QUERY,
    mediaType: type && TYPES.includes(type) ? type : 'all',
    license: license && LICENSES.includes(license) ? license : 'all',
    sort: sort === 'newest' ? 'newest' : 'relevance',
    userMode: false,
    userView: 'uploads',
    categoryView: 'media',
  };

  if (mode === 'keywords') {
    if (user !== null) {
      return { ...base, query: fromUrlText(user), userMode: true, userView: p.get('view') === 'talk' ? 'talk' : 'uploads', mediaType: 'all' };
    }
    return { ...base, query: p.has('q') ? (p.get('q') ?? '').trim() : hasOther ? '' : DEFAULT_QUERY };
  }
  if (mode === 'categories') {
    return { ...base, query: (p.get('q') ?? '').trim(), mediaType: 'all', categoryView: cat };
  }
  return { ...base, mediaType: 'all', license: 'all', sort: 'relevance' };
}

// ---------------------------------------------------------------------------
// Detail berkas
// ---------------------------------------------------------------------------

/** Path detail seperti URL Commons: /file/Nama_berkas.jpg (tanpa awalan "File:") */
export function detailPath(item: Pick<CommonsMediaItem, 'id' | 'title'>): string {
  const name = (item.title || '').replace(/^File:/i, '');
  if (!name) return `/file/${item.id}`;
  const enc = encodeURIComponent(name.replace(/ /g, '_')).replace(/%2C/gi, ',').replace(/%3A/gi, ':').replace(/%40/g, '@');
  return `/file/${enc}`;
}

export type DetailRef = { kind: 'title'; title: string } | { kind: 'id'; id: number };

/** Baca detail berkas dari path; angka murni dianggap pageid (tautan lama /file/<id>) */
export function parseDetailPath(pathname: string): DetailRef | null {
  const m = pathname.match(/^\/file\/(.+?)\/?$/);
  if (!m) return null;
  let raw = m[1];
  try {
    raw = decodeURIComponent(raw);
  } catch {
    /* pakai apa adanya */
  }
  if (/^\d+$/.test(raw)) return { kind: 'id', id: Number(raw) };
  const name = fromUrlText(raw).replace(/^File:/i, '');
  return name ? { kind: 'title', title: `File:${name}` } : null;
}

// ---------------------------------------------------------------------------
// Tampilan peta Sekitar
// ---------------------------------------------------------------------------

export interface NearbyView {
  lat: number;
  lng: number;
  zoom: number;
}

export const DEFAULT_NEARBY_VIEW: NearbyView = { lat: -6.1753924, lng: 106.8271528, zoom: 14 };

/** Baca ?lat=&lon=&zoom=; null bila lat/lon tidak ada atau di luar rentang. Zoom opsional (bawaan 14). */
export function parseNearbyView(search: string): NearbyView | null {
  const p = new URLSearchParams(search);
  const latRaw = p.get('lat');
  const lonRaw = p.get('lon') ?? p.get('lng');
  if (latRaw === null || lonRaw === null || latRaw.trim() === '' || lonRaw.trim() === '') return null;
  const lat = Number(latRaw);
  const lng = Number(lonRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  const zoomRaw = p.get('zoom');
  const z = zoomRaw !== null && zoomRaw.trim() !== '' ? Number(zoomRaw) : NaN;
  const zoom = Number.isFinite(z) ? Math.min(19, Math.max(1, z)) : DEFAULT_NEARBY_VIEW.zoom;
  return { lat, lng, zoom };
}

/** Salin lat/lon/zoom dari query yang ada ke query baru (dipakai saat mode lain menulis ulang URL) */
export function withNearbyView(search: string, view: NearbyView | null): string {
  const p = new URLSearchParams(search);
  p.delete('lat');
  p.delete('lon');
  p.delete('lng');
  p.delete('zoom');
  if (view) {
    p.set('lat', view.lat.toFixed(6));
    p.set('lon', view.lng.toFixed(6));
    p.set('zoom', String(Math.round(view.zoom * 10) / 10));
  }
  const str = p.toString().replace(/%2F/gi, '/').replace(/%3A/gi, ':');
  return str ? `?${str}` : '';
}

// ---------------------------------------------------------------------------
// Tab pada halaman detail berkas
// ---------------------------------------------------------------------------

export type DetailTab = 'download' | 'cats' | 'license' | 'history' | 'talk' | 'ai';
export const DEFAULT_DETAIL_TAB: DetailTab = 'ai';
const DETAIL_TABS: DetailTab[] = ['ai', 'download', 'cats', 'license', 'history', 'talk'];

/** Baca ?tab= pada URL detail; nilai tidak dikenal atau kosong menjadi tab bawaan */
export function parseDetailTab(search: string): DetailTab {
  const tab = new URLSearchParams(search).get('tab') as DetailTab | null;
  return tab && DETAIL_TABS.includes(tab) ? tab : DEFAULT_DETAIL_TAB;
}

/** Tulis ?tab= ke query yang ada; tab bawaan tidak ditulis agar URL tetap bersih */
export function withDetailTab(search: string, tab: DetailTab): string {
  const p = new URLSearchParams(search);
  if (tab === DEFAULT_DETAIL_TAB) p.delete('tab');
  else p.set('tab', tab);
  const str = p.toString();
  return str ? `?${str}` : '';
}

// ---------------------------------------------------------------------------
// Bahasa (edisi) pada tab Wikivoyage dan Wikipedia
// ---------------------------------------------------------------------------

/** Baca ?lang= dan terima hanya kode bahasa yang didukung laporan; null bila tidak ada atau tidak dikenal */
export function parseReportLang(search: string): string | null {
  const lang = new URLSearchParams(search).get('lang');
  return lang && REPORT_LANGUAGES.some((l) => l.code === lang) ? lang : null;
}

/** Tulis atau hapus ?lang= pada query yang ada */
export function withReportLang(search: string, lang: string | null): string {
  const p = new URLSearchParams(search);
  if (lang) p.set('lang', lang);
  else p.delete('lang');
  const str = p.toString().replace(/%2F/gi, '/').replace(/%3A/gi, ':');
  return str ? `?${str}` : '';
}
