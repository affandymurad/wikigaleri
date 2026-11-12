/**
 * Kategori di area ini: kategori Commons dihitung dari berkas bergeotag di sebuah area peta.
 * Kategori Commons umumnya tidak punya koordinat, jadi hasilnya perkiraan (disimpulkan dari foto).
 * Semua fungsi di sini murni (tanpa jaringan/DOM) agar mudah diuji.
 */

/** Berkas beserta kategorinya (tanpa awalan "Category:") */
export interface AreaFileCategories {
  title: string;
  categories: string[];
}

export interface AreaCategoryCount {
  /** Nama kategori tanpa awalan "Category:" dan tanpa garis bawah */
  name: string;
  /** Jumlah foto di area yang memakai kategori ini */
  count: number;
}

/** Sisi terpanjang area (meter) yang masih boleh dicari; di atas ini pengguna diminta memperbesar peta */
export const AREA_MAX_SPAN_M = 10000;

/** Jumlah berkas maksimum per permintaan geosearch Commons (batas pengguna biasa) */
export const AREA_FILE_LIMIT = 500;

/** Batas halaman lanjutan clcontinue agar jumlah permintaan tidak naik tajam */
export const AREA_MAX_CONTINUE_PAGES = 6;

/** Kategori yang hanya dipakai satu foto dibuang bila area berisi setidaknya sebanyak ini foto */
export const AREA_MIN_FILES_FOR_SINGLETON_FILTER = 8;

/** Ambang minimum jumlah foto per kategori saat penyaringan tunggal berlaku */
export const AREA_MIN_CATEGORY_COUNT = 2;

/** Jumlah kategori maksimum yang ditampilkan */
export const AREA_MAX_RESULTS = 60;

/** Pola nama kategori pemeliharaan/teknis yang dibuang (tidak mewakili tempat atau topik) */
export const MAINTENANCE_CATEGORY_PATTERNS: RegExp[] = [
  /^taken with/i,
  /^uploaded/i,
  /\buploaded (by|with|via)\b/i,
  /^cc[- ]/i,
  /^cc0\b/i,
  /^self[- ]published work/i,
  /^files by\b/i,
  /^files from\b/i,
  /^files uploaded/i,
  /^media (needing|missing|lacking)/i,
  /^pages with\b/i,
  /^images from\b/i,
  /^photographs by\b/i,
  /^pd[- ]/i,
  /^gfdl\b/i,
  /^license/i,
  /^wiki loves\b.*\b(images|files|photos)\b/i,
  /\bwith (geotag|coordinates)\b/i,
  /^location (not|missing)/i,
  /^featured pictures?\b/i,
  /^quality images?\b/i,
  /^valued images?\b/i,
  /^(jpg|jpeg|png|tiff?) files?\b/i,
  /^unidentified\b/i,
];

/** Normalisasi nama kategori: buang awalan Category:/Kategori:, garis bawah, spasi ganda */
export function normalizeAreaCategoryName(raw: string): string {
  return (raw || '')
    .replace(/^(Category|Kategori)\s*:\s*/i, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Benar bila nama kategori cocok dengan pola pemeliharaan */
export function isMaintenanceCategory(name: string, patterns: RegExp[] = MAINTENANCE_CATEGORY_PATTERNS): boolean {
  return patterns.some((p) => p.test(name));
}

/**
 * Hitung berapa foto memakai tiap kategori. Satu foto dihitung sekali per kategori
 * (kategori ganda pada foto yang sama diabaikan). Urut dari terbanyak, lalu abjad.
 */
export function countCategories(files: AreaFileCategories[]): AreaCategoryCount[] {
  const counts = new Map<string, number>();
  for (const file of files) {
    const seen = new Set<string>();
    for (const raw of file.categories) {
      const name = normalizeAreaCategoryName(raw);
      if (!name || seen.has(name)) continue;
      seen.add(name);
      counts.set(name, (counts.get(name) || 0) + 1);
    }
  }
  return Array.from(counts, ([name, count]) => ({ name, count })).sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name)
  );
}

export interface FilterOptions {
  patterns?: RegExp[];
  minFilesForSingletonFilter?: number;
  minCategoryCount?: number;
  maxResults?: number;
}

/**
 * Saring daftar hitungan: buang kategori pemeliharaan, lalu (bila area berisi banyak foto)
 * buang kategori yang hanya muncul di satu foto. Hasil dipotong sampai maxResults.
 */
export function filterAreaCategories(
  counts: AreaCategoryCount[],
  totalFiles: number,
  options: FilterOptions = {}
): AreaCategoryCount[] {
  const {
    patterns = MAINTENANCE_CATEGORY_PATTERNS,
    minFilesForSingletonFilter = AREA_MIN_FILES_FOR_SINGLETON_FILTER,
    minCategoryCount = AREA_MIN_CATEGORY_COUNT,
    maxResults = AREA_MAX_RESULTS,
  } = options;
  const dropSingletons = totalFiles >= minFilesForSingletonFilter;
  return counts
    .filter((c) => !isMaintenanceCategory(c.name, patterns))
    .filter((c) => !dropSingletons || c.count >= minCategoryCount)
    .slice(0, maxResults);
}

/** Gabungan hitung + saring untuk satu daftar berkas */
export function inferAreaCategories(files: AreaFileCategories[], options?: FilterOptions): AreaCategoryCount[] {
  return filterAreaCategories(countCategories(files), files.length, options);
}

export interface AreaBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

/** Sisi terpanjang area dalam meter (perkiraan; cukup untuk pemeriksaan ambang) */
export function areaSpanMeters(b: AreaBounds): number {
  const midLat = ((b.north + b.south) / 2) * (Math.PI / 180);
  const heightM = Math.abs(b.north - b.south) * 111320;
  const widthM = Math.abs(b.east - b.west) * 111320 * Math.cos(midLat);
  return Math.max(heightM, widthM);
}

/** Kunci cache per area: batas dibulatkan agar geseran sangat kecil memakai hasil yang sama */
export function areaCacheKey(b: AreaBounds, zoom: number): string {
  const r = (n: number) => n.toFixed(3);
  return `${r(b.west)},${r(b.south)},${r(b.east)},${r(b.north)}@${Math.round(zoom)}`;
}

// ---------------------------------------------------------------------------
// Sumber tambahan: Wikidata (item ber-P625 di dalam area yang punya P373 atau sitelink commonswiki ke Category:)
// ---------------------------------------------------------------------------

/** Sisi terpanjang area (meter) agar Wikidata ikut dicari; di atas ini Wikidata dilewati (kueri SPARQL berat) */
export const WIKIDATA_MAX_SPAN_M = 3000;

/** Batas waktu kueri SPARQL (milidetik) sebelum dianggap gagal */
export const WIKIDATA_TIMEOUT_MS = 15000;

/** Jumlah baris maksimum yang diminta dari SPARQL */
export const WIKIDATA_MAX_ROWS = 200;

export interface WikidataCategory {
  /** Nama kategori Commons tanpa awalan "Category:" */
  name: string;
  /** Label item Wikidata (bila ada) */
  label?: string;
}

export interface AreaCategoryEntry {
  name: string;
  /** Jumlah foto di area yang memakai kategori; 0 bila hanya berasal dari Wikidata */
  count: number;
  fromPhotos: boolean;
  fromWikidata: boolean;
  wikidataLabel?: string;
}

/** Kunci pembanding judul kategori: huruf kecil, tanpa awalan, spasi seragam */
export function categoryKey(name: string): string {
  return normalizeAreaCategoryName(name).toLowerCase();
}

/**
 * Gabungkan hasil inferensi foto dan Wikidata. Duplikat dibuang berdasarkan judul kategori;
 * kategori yang ada di keduanya mendapat kedua lencana. Urutan: yang punya foto (terbanyak dulu),
 * lalu yang hanya dari Wikidata (abjad).
 */
export function mergeAreaCategories(photo: AreaCategoryCount[], wikidata: WikidataCategory[]): AreaCategoryEntry[] {
  const map = new Map<string, AreaCategoryEntry>();
  for (const p of photo) {
    map.set(categoryKey(p.name), { name: p.name, count: p.count, fromPhotos: true, fromWikidata: false });
  }
  for (const w of wikidata) {
    const name = normalizeAreaCategoryName(w.name);
    if (!name) continue;
    const key = categoryKey(name);
    const hit = map.get(key);
    if (hit) {
      hit.fromWikidata = true;
      hit.wikidataLabel = hit.wikidataLabel || w.label;
    } else {
      map.set(key, { name, count: 0, fromPhotos: false, fromWikidata: true, wikidataLabel: w.label });
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name)
  );
}

/** Item Wikidata bertitik koordinat di area yang belum punya gambar (P18) */
export interface WikidataNoPhotoItem {
  qid: string;
  label: string;
  description?: string;
  lat: number;
  lng: number;
}
