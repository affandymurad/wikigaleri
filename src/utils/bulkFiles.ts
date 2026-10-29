/**
 * Daftar nama berkas untuk tab Massal (Bulk): satu nama per baris.
 * Pengecekan duplikat mengikuti MedWiki No Image: nama dinormalkan (garis bawah = spasi, huruf pertama kapital),
 * tiap nama hanya diperiksa sekali, dan yang tercantum lebih dari sekali dilaporkan beserta nomor barisnya.
 */

export interface BulkEntry {
  /** Teks baris seperti diketik (kemunculan pertama) */
  keyword: string;
  /** Nama berkas tanpa awalan "File:" */
  name: string;
  /** Nomor baris (mulai 1) tempat nama ini tercantum */
  lines: number[];
}

export interface BulkParse {
  entries: BulkEntry[];
  /** Entri yang tercantum lebih dari sekali */
  duplicates: BulkEntry[];
  /** Jumlah baris berisi nama (tanpa baris kosong) */
  total: number;
}

const FILE_PREFIX = /^(?:file|image|berkas|gambar)\s*:\s*/i;

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Nama berkas dari satu baris; tautan Commons, [[File:...|label]], dan awalan File: ikut dibersihkan */
export function bulkNameOf(line: string): string {
  let s = line.trim();
  if (!s) return '';
  const url = s.match(/^https?:\/\/[^\s]*?\/wiki\/([^\s?#]+)/i) ?? s.match(/^https?:\/\/[^\s]*?[?&]title=([^\s&#]+)/i);
  if (url) {
    try {
      s = decodeURIComponent(url[1]);
    } catch {
      s = url[1];
    }
  }
  s = s.replace(/^\[\[:?/, '').replace(/\]\]$/, '').replace(/^:/, '');
  s = s.replace(/\|.*$/, '');
  s = s.replace(/^(?:commons)\s*:\s*/i, '');
  s = s.replace(FILE_PREFIX, '');
  s = s.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  return capitalize(s);
}

export function parseBulkList(text: string): BulkParse {
  const map = new Map<string, BulkEntry>();
  let total = 0;
  text.split(/\r?\n/).forEach((raw, i) => {
    const keyword = raw.trim();
    const name = bulkNameOf(keyword);
    if (!name) return;
    total++;
    const e = map.get(name);
    if (e) e.lines.push(i + 1);
    else map.set(name, { keyword, name, lines: [i + 1] });
  });
  const entries = [...map.values()];
  return { entries, duplicates: entries.filter((e) => e.lines.length > 1), total };
}

/** Ekstensi berkas yang diizinkan di Commons; dipakai untuk mengenali nama yang sudah berekstensi */
const KNOWN_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'tif', 'tiff', 'bmp', 'xcf', 'ico', 'webm', 'ogv', 'ogg', 'oga', 'opus', 'mp3', 'wav', 'flac', 'mid', 'midi', 'mp4', 'pdf', 'djvu', 'stl', 'apng', 'avif', 'jp2', 'jxl', 'srt', 'tab', 'map', 'gpx', 'glb', 'gltf', 'obj', 'mpg', 'mpeg', 'm4a',
]);

/** Ekstensi (huruf kecil) bila nama berakhir dengan ekstensi Commons yang dikenal, selain itu string kosong */
export function extensionOf(name: string): string {
  const m = name.match(/\.([A-Za-z0-9]{2,5})$/);
  return m && KNOWN_EXTENSIONS.has(m[1].toLowerCase()) ? m[1].toLowerCase() : '';
}
