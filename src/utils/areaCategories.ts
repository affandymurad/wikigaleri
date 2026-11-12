/**
 * Kategori di area ini: kategori Commons dihitung dari berkas bergeotag di sebuah area peta.
 * Kategori Commons umumnya tidak punya koordinat, jadi hasilnya perkiraan (disimpulkan dari foto).
 * Semua fungsi di sini murni (tanpa jaringan/DOM) agar mudah diuji.
 */

/**
 * Sisi terpanjang tampilan peta (meter) yang masih boleh dicari: 6 km = radius 3 km dari titik tengah.
 * Berlaku untuk foto, kategori ber-koordinat, dan Wikidata; di atas ini pengguna diminta memperbesar peta.
 */
export const AREA_MAX_SPAN_M = 6000;

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

/** Batas area untuk Wikidata; sama dengan batas foto dan kategori */
export const WIKIDATA_MAX_SPAN_M = AREA_MAX_SPAN_M;

/** Batas waktu kueri SPARQL (milidetik) sebelum dianggap gagal */
export const WIKIDATA_TIMEOUT_MS = 15000;

/** Item Wikidata bertitik koordinat (P625) di area; image diisi bila item punya gambar (P18) */
export interface WikidataAreaItem {
  qid: string;
  label: string;
  description?: string;
  lat: number;
  lng: number;
  /** URL thumbnail gambar P18 (Special:FilePath); kosong bila item belum punya gambar */
  image?: string;
  /** Nama kategori Commons item ini (dari P373 atau sitelink commonswiki), tanpa "Category:"; kosong bila tidak ada */
  category?: string;
}

/** Jumlah baris maksimum untuk daftar item Wikidata di area */
export const WIKIDATA_ITEMS_LIMIT = 1000;

/** Kategori Commons yang halamannya sendiri punya koordinat (template atau infobox Wikidata) */
export interface CoordCategory {
  /** Nama kategori tanpa awalan "Category:" */
  name: string;
  lat: number;
  lng: number;
}

/** Jumlah kategori ber-koordinat maksimum per permintaan geosearch */
export const COORD_CATEGORY_LIMIT = 500;
