import {
  CommonsMediaItem,
  CommonsPage,
  GalleryFilterState,
  MediaType,
  CuratedTopic,
  CommonsCategoryItem,
  CuratedTopicGroup,
} from '../types/wikimedia';
import {
  cleanCommonsTitle,
  categorizeLicense,
  stripHtml
} from '../utils/licenseUtils';

// ---------------------------------------------------------------------------
// Fetch wrapper: cache singkat + dedupe request kembar + retry otomatis saat 429/503
// (Wikimedia membatasi laju request anonim; tanpa ini klik cepat / buka-tutup modal
// mudah memicu "429 Too Many Requests").
// ---------------------------------------------------------------------------
const FETCH_CACHE_TTL_MS = 60_000;
const FETCH_MAX_RETRIES = 3;
const fetchCache = new Map<string, { time: number; promise: Promise<Response> }>();

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await fetch(url, init);
    if ((res.status === 429 || res.status === 503) && attempt < FETCH_MAX_RETRIES) {
      const retryAfter = Number(res.headers.get('Retry-After'));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 8000)
        : Math.min(1000 * 2 ** attempt, 6000) + Math.random() * 400;
      attempt += 1;
      await wait(delay);
      continue;
    }
    return res;
  }
}

async function commonsFetch(url: string, init?: RequestInit): Promise<Response> {
  const now = Date.now();
  const hit = fetchCache.get(url);
  if (hit && now - hit.time < FETCH_CACHE_TTL_MS) {
    try {
      const cached = await hit.promise;
      if (cached.ok) return cached.clone();
    } catch {
      /* abaikan, lanjut fetch baru */
    }
  }
  const promise = fetchWithRetry(url, init);
  fetchCache.set(url, { time: now, promise });
  if (fetchCache.size > 200) {
    const oldest = fetchCache.keys().next().value;
    if (oldest !== undefined) fetchCache.delete(oldest);
  }
  try {
    const res = await promise;
    if (!res.ok) fetchCache.delete(url);
    return res.clone();
  } catch (e) {
    fetchCache.delete(url);
    throw e;
  }
}


const COMMONS_API_BASE = 'https://commons.wikimedia.org/w/api.php';

export const CURATED_TOPIC_GROUPS: { id: CuratedTopicGroup; labelEn: string; labelId: string }[] = [
  { id: 'media_type', labelEn: 'Media Formats', labelId: 'Format Media' },
  { id: 'culture', labelEn: 'Culture & Nusantara', labelId: 'Budaya & Nusantara' },
  { id: 'nature_science', labelEn: 'Nature & Science', labelId: 'Alam & Sains' },
  { id: 'history', labelEn: 'World History', labelId: 'Sejarah Dunia' },
  { id: 'geography', labelEn: 'Geography & Places', labelId: 'Geografi & Tempat' },
  { id: 'arts', labelEn: 'Fine Arts & Design', labelId: 'Seni Rupa & Desain' },
];

// Curated topics for instant discovery, comprehensively grouped by type
export const CURATED_TOPICS: CuratedTopic[] = [
  // 1. Format Media (media_type)
  {
    id: 'photographs',
    label: 'Foto & Fotografi',
    categoryName: 'Photographs',
    query: 'Photographs high resolution documentary portrait',
    mediaType: 'image',
    description: 'Koleksi karya fotografi historis dan modern definisi tinggi.',
    group: 'media_type',
  },
  {
    id: 'vintage-posters',
    label: 'Poster & Ilustrasi',
    categoryName: 'Vintage posters',
    query: 'Vintage poster art nouveau illustration lithograph advertising',
    mediaType: 'image',
    description: 'Karya ilustrasi, litografi, dan poster klasik beresolusi tinggi.',
    group: 'media_type',
  },
  {
    id: 'classical-audio',
    label: 'Audio & Musik Klasik',
    categoryName: 'Audio files of classical music',
    query: 'filetype:audio classical music nature sounds instrument orchestral',
    mediaType: 'audio',
    description: 'Rekaman audio musik klasik, suara alam, dan fonoteka terbuka.',
    group: 'media_type',
  },
  {
    id: 'historic-video',
    label: 'Video Arsip Bersejarah',
    categoryName: 'Historical videos',
    query: 'filetype:video historical documentary archive science film',
    mediaType: 'video',
    description: 'Arsip rekaman video bersejarah, eksperimen sains, dan dokumenter alam.',
    group: 'media_type',
  },
  {
    id: 'manuscripts-docs',
    label: 'Manuskrip & Dokumen Kuno',
    categoryName: 'Manuscripts',
    query: 'filetype:pdf manuscript historical treaty charter naskah scroll',
    mediaType: 'document',
    description: 'Arsip naskah berharga, dokumen piagam bersejarah, dan manuskrip langka.',
    group: 'media_type',
  },
  {
    id: 'historical-maps',
    label: 'Peta Kuno & Kartografi',
    categoryName: 'Old maps',
    query: 'Historic map vintage cartography world atlas nautical chart',
    mediaType: 'image',
    description: 'Peta antik abad ke-16 hingga ke-19 berlisensi Domain Publik.',
    group: 'media_type',
  },
  {
    id: 'diagrams-science',
    label: 'Diagram & Infografik',
    categoryName: 'Diagrams',
    query: 'Diagram schematic anatomical technical drawing infographic vector',
    mediaType: 'image',
    description: 'Diagram teknis, skema anatomi, dan gambar penjelasan ilmiah.',
    group: 'media_type',
  },

  // 2. Budaya & Nusantara (culture)
  {
    id: 'indonesia-heritage',
    label: 'Budaya',
    categoryName: 'Culture of Indonesia',
    query: 'Indonesian culture traditions heritage',
    mediaType: 'image',
    description: 'Dokumentasi budaya, kearifan lokal, warisan sejarah, dan tradisi Nusantara.',
    group: 'culture',
  },
  {
    id: 'batik-textiles',
    label: 'Batik & Tekstil Nusantara',
    categoryName: 'Batik',
    query: 'Batik Indonesian textile pattern fabric tenun ikat',
    mediaType: 'image',
    description: 'Kain batik tradisional, motif tenun ikat, dan tekstil warisan budaya.',
    group: 'culture',
  },
  {
    id: 'wayang-puppet',
    label: 'Wayang & Seni Tradisi',
    categoryName: 'Wayang',
    query: 'Wayang shadow puppet leather puppetry Java Bali performance',
    mediaType: 'image',
    description: 'Koleksi wayang kulit, wayang golek, dan seni pertunjukan panggung.',
    group: 'culture',
  },
  {
    id: 'candi-heritage',
    label: 'Candi & Arkeologi RI',
    categoryName: 'Candi in Indonesia',
    query: 'Candi Borobudur Prambanan temple Indonesia archaeology stone relief',
    mediaType: 'image',
    description: 'Situs candi bersejarah, arca batu, dan peninggalan arkeologi Nusantara.',
    group: 'culture',
  },
  {
    id: 'traditional-arch-id',
    label: 'Rumah Adat Nusantara',
    categoryName: 'Traditional architecture of Indonesia',
    query: 'Rumah adat Indonesia traditional vernacular architecture tongkonan gadang',
    mediaType: 'image',
    description: 'Arsitektur vernakular rumah adat dari berbagai suku di Indonesia.',
    group: 'culture',
  },
  {
    id: 'indonesian-heroes',
    label: 'Pahlawan & Tokoh Nasional',
    categoryName: 'National Heroes of Indonesia',
    query: 'National Heroes of Indonesia Pahlawan Nasional portrait historical',
    mediaType: 'image',
    description: 'Potret dan dokumentasi perjuangan pahlawan serta tokoh bangsa.',
    group: 'culture',
  },
  {
    id: 'indonesian-cuisine',
    label: 'Kuliner Tradisional',
    categoryName: 'Cuisine of Indonesia',
    query: 'Cuisine of Indonesia traditional street food spice culinary heritage',
    mediaType: 'image',
    description: 'Ragam rempah, hidangan otentik, dan kuliner tradisional Nusantara.',
    group: 'culture',
  },

  // 3. Alam & Sains (nature_science)
  {
    id: 'astronomy',
    label: 'Astronomi & Antariksa',
    categoryName: 'Astronomy',
    query: 'Hubble James Webb galaxy nebula telescope cosmos stellar',
    mediaType: 'image',
    description: 'Citra kosmos definisi tinggi dari teleskop antariksa berlisensi publik.',
    group: 'nature_science',
  },
  {
    id: 'wildlife',
    label: 'Satwa Liar & Fauna',
    categoryName: 'Fauna',
    query: 'Wildlife mammal bird ocean underwater wild animals predator biodiversity',
    mediaType: 'image',
    description: 'Dokumentasi satwa liar dan keanekaragaman hayati dari penjuru dunia.',
    group: 'nature_science',
  },
  {
    id: 'botany-flora',
    label: 'Flora & Ilustrasi Botani',
    categoryName: 'Flora',
    query: 'Botanical illustration flora medicinal plant flowers orchid botany tree',
    mediaType: 'image',
    description: 'Karya ilustrasi botani klasik dan keanekaragaman tanaman dunia.',
    group: 'nature_science',
  },
  {
    id: 'marine-life',
    label: 'Biologi Laut & Bahari',
    categoryName: 'Marine life',
    query: 'Marine life coral reef deep sea underwater fishes cetacean ocean',
    mediaType: 'image',
    description: 'Kehidupan bawah laut, terumbu karang, dan hewan laut.',
    group: 'nature_science',
  },
  {
    id: 'volcanoes-geology',
    label: 'Gunung Api & Geologi',
    categoryName: 'Volcanoes',
    query: 'Volcano eruption crater caldera lava geological formation mineral strata',
    mediaType: 'image',
    description: 'Gunung berapi, kaldera, dan lapisan batuan.',
    group: 'nature_science',
  },
  {
    id: 'microscopy',
    label: 'Mikroskopi & Seluler',
    categoryName: 'Microscopy',
    query: 'Microscopy electron microscope cells crystal virus bacteria microscopic',
    mediaType: 'image',
    description: 'Struktur sel, mikroorganisme, dan visualisasi mikroskopis presisi.',
    group: 'nature_science',
  },
  {
    id: 'weather-phenomena',
    label: 'Meteorologi & Cuaca',
    categoryName: 'Weather phenomena',
    query: 'Lightning aurora borealis tornado thunderstorm rainbow clouds meteorological',
    mediaType: 'image',
    description: 'Aurora, petir, badai, dan fenomena cuaca lain.',
    group: 'nature_science',
  },

  // 4. Sejarah Dunia (history)
  {
    id: 'ancient-egypt',
    label: 'Mesir Kuno & Hieroglif',
    categoryName: 'Ancient Egypt',
    query: 'Ancient Egypt pharaoh pyramid hieroglyphs sphinx sarcophagus temple Nile',
    mediaType: 'image',
    description: 'Peninggalan firaun, piramida, hieroglif, dan artefak peradaban Nil.',
    group: 'history',
  },
  {
    id: 'classical-antiquity',
    label: 'Yunani & Romawi Kuno',
    categoryName: 'Classical antiquity',
    query: 'Ancient Greece Roman Empire Colosseum Parthenon marble classical antiquity',
    mediaType: 'image',
    description: 'Peninggalan arsitektur marmer dan peradaban klasik Mediterania.',
    group: 'history',
  },
  {
    id: 'renaissance-era',
    label: 'Renaisans Eropa',
    categoryName: 'Renaissance art',
    query: 'Renaissance art Florence painting fresco Leonardo Michelangelo master',
    mediaType: 'image',
    description: 'Karya seni, arsitektur, dan penemuan zaman keemasan Renaisans Eropa.',
    group: 'history',
  },
  {
    id: 'world-wars',
    label: 'Arsip Perang Dunia',
    categoryName: 'World War II',
    query: 'World War military historical photography archive 1914 1945 documentary',
    mediaType: 'image',
    description: 'Dokumentasi fotografi dan arsip bersejarah Perang Dunia I & II.',
    group: 'history',
  },
  {
    id: 'illuminated-manuscripts',
    label: 'Naskah Beriluminasi',
    categoryName: 'Illuminated manuscripts',
    query: 'Illuminated manuscript medieval vellum gold leaf calligraphy parchment',
    mediaType: 'document',
    description: 'Naskah abad pertengahan dengan hiasan emas dan kaligrafi artistik.',
    group: 'history',
  },
  {
    id: 'maritime-history',
    label: 'Sejarah Maritim Dunia',
    categoryName: 'Maritime history',
    query: 'Maritime history tall ship galleon navigation voyage explorer naval sea',
    mediaType: 'image',
    description: 'Kapal layar tinggi, peta laut, dan pelayaran terkenal.',
    group: 'history',
  },

  // 5. Geografi & Tempat (geography)
  {
    id: 'unesco-heritage',
    label: 'Warisan Dunia UNESCO',
    categoryName: 'World Heritage Sites',
    query: 'UNESCO World Heritage site monuments ancient landmark protected',
    mediaType: 'image',
    description: 'Situs keajaiban dunia dan cagar budaya yang dilindungi UNESCO.',
    group: 'geography',
  },
  {
    id: 'castles-palaces',
    label: 'Kastil & Istana',
    categoryName: 'Castles',
    query: 'Historic castle fortress citadel palace royal chateau medieval architecture',
    mediaType: 'image',
    description: 'Benteng abad pertengahan, istana kerajaan, dan kastil.',
    group: 'geography',
  },
  {
    id: 'mountains-alpine',
    label: 'Pegunungan & Lembah',
    categoryName: 'Mountains',
    query: 'Mountain peak Himalayas Alps Andes glacier panoramic valley summits',
    mediaType: 'image',
    description: 'Puncak gunung tertinggi, gletser purba, dan lanskap pegunungan dunia.',
    group: 'geography',
  },
  {
    id: 'historic-towns',
    label: 'Kota Kuno Bersejarah',
    categoryName: 'Historic towns',
    query: 'Historic town cobblestone medieval streets old quarter timber framed',
    mediaType: 'image',
    description: 'Pusat kota bersejarah, jalan berbatu antik, dan tata kota klasik.',
    group: 'geography',
  },
  {
    id: 'historic-bridges',
    label: 'Jembatan & Akuaduk',
    categoryName: 'Bridges',
    query: 'Historic bridge stone arch aqueduct suspension viaduct landmark',
    mediaType: 'image',
    description: 'Jembatan batu, saluran air Romawi, dan karya rekayasa kuno.',
    group: 'geography',
  },

  // 6. Seni Rupa & Desain (arts)
  {
    id: 'masterpiece-paintings',
    label: 'Mahakarya Seni Lukis',
    categoryName: 'Paintings',
    query: 'Famous oil paintings fine art Rembrandt Monet Van Gogh Vermeer oil on canvas',
    mediaType: 'image',
    description: 'Lukisan cat minyak terkenal dan seni rupa koleksi museum.',
    group: 'arts',
  },
  {
    id: 'sculptures-statues',
    label: 'Seni Patung & Relief',
    categoryName: 'Sculptures',
    query: 'Classical sculptures marble bronze statues monument relief carving',
    mediaType: 'image',
    description: 'Karya pahatan marmer klasik, patung perunggu, dan relief monumen.',
    group: 'arts',
  },
  {
    id: 'calligraphy-arts',
    label: 'Kaligrafi & Tipografi',
    categoryName: 'Calligraphy',
    query: 'Calligraphy ornamental lettering Arabic Chinese manuscript script artistic lettering',
    mediaType: 'image',
    description: 'Keindahan seni menulis huruf, kaligrafi Timur, dan ornamen aksara.',
    group: 'arts',
  },
  {
    id: 'drawings-sketches',
    label: 'Sketsa & Gambar Tangan',
    categoryName: 'Drawings',
    query: 'Vintage drawings sketch architectural etching ink line art engraving',
    mediaType: 'image',
    description: 'Sketsa arsitektur, gambar goresan tinta, dan teknik etsa klasik.',
    group: 'arts',
  },
];


/**
 * Determine media type from mime string and title
 */
function resolveMediaType(mime: string, title: string): 'image' | 'audio' | 'video' | 'document' | '3d' {
  const m = (mime || '').toLowerCase();
  const t = (title || '').toLowerCase();

  // Model 3D (STL): Commons memberi tipe application/sla
  if (m === 'application/sla' || m.startsWith('model/') || t.endsWith('.stl')) {
    return '3d';
  }

  // Document check (PDF, DjVu, etc.)
  if (
    m.includes('pdf') ||
    m.includes('djvu') ||
    m.includes('postscript') ||
    m.includes('document') ||
    t.endsWith('.pdf') ||
    t.endsWith('.djvu')
  ) {
    return 'document';
  }

  if (m.startsWith('audio/') || t.endsWith('.ogg') || t.endsWith('.oga') || t.endsWith('.mp3') || t.endsWith('.flac') || t.endsWith('.wav') || t.endsWith('.mid')) {
    return 'audio';
  }
  if (m.startsWith('video/') || t.endsWith('.ogv') || t.endsWith('.webm') || t.endsWith('.mp4')) {
    return 'video';
  }
  return 'image';
}

/**
 * Deteksi panorama dari data yang sudah ada saat pencarian (tanpa permintaan tambahan):
 * 'sphere' bila berkas masuk kategori panorama 360° atau photosphere, 'wide' bila sangat lebar.
 * Kepastian proyeksi equirectangular dicek lagi dari metadata XMP saat modal dibuka.
 */
function detectPanorama(
  mediaType: string,
  categories: string[],
  width: number,
  height: number,
  mime: string
): 'sphere' | 'wide' | undefined {
  if (mediaType !== 'image') return undefined;
  if (categories.some((c) => /360°\s*panorama|photospheres?/i.test(c))) return 'sphere';
  if (height > 0 && width >= 2000 && width / height >= 2.5 && /^image\/(jpeg|png|tiff)$/i.test(mime)) return 'wide';
  return undefined;
}

/**
 * Parse raw Commons Page data into typed CommonsMediaItem
 */
function parseCommonsPage(page: CommonsPage): CommonsMediaItem | null {
  if (!page.imageinfo || page.imageinfo.length === 0) return null;
  const info = page.imageinfo[0];
  const meta = info.extmetadata || {};

  const cleanTitle = cleanCommonsTitle(page.title);
  const mediaType = resolveMediaType(info.mime, page.title);

  const licenseShort = meta.LicenseShortName?.value || meta.License?.value || '';
  const usageTerms = meta.UsageTerms?.value || '';
  const licenseUrl = meta.LicenseUrl?.value || '';
  const licenseCategory = categorizeLicense(licenseShort, usageTerms, licenseUrl);

  const authorRaw = meta.Artist?.value || meta.Credit?.value || '';
  const author = stripHtml(authorRaw);

  const descRaw = meta.ImageDescription?.value || meta.ObjectName?.value || '';
  const description = cleanCommonsHtml(descRaw);

  let categories: string[] = [];
  if (meta.Categories?.value) {
    categories = meta.Categories.value
      .split('|')
      .map((c) => c.trim().replace(/^Category:/i, ''))
      .filter(Boolean);
  }
  if ((page as any).categories && Array.isArray((page as any).categories)) {
    const fromPage = (page as any).categories
      .map((c: any) => (c.title || '').replace(/^Category:/i, '').trim())
      .filter(Boolean);
    categories = [...categories, ...fromPage];
  }
  // Deduplicate and keep up to 25 descriptive categories
  categories = Array.from(new Set(categories)).filter(Boolean).slice(0, 25);

  const lat = meta.GPSLatitude?.value ? parseFloat(meta.GPSLatitude.value) : undefined;
  const lng = meta.GPSLongitude?.value ? parseFloat(meta.GPSLongitude.value) : undefined;

  // Fallback thumbnail if thumburl not provided
  const thumbnailUrl = info.thumburl || info.url;

  return {
    id: page.pageid,
    title: page.title,
    cleanTitle: cleanTitle || page.title,
    pageUrl: info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`,
    fileUrl: info.url,
    thumbnailUrl,
    mimeType: info.mime || 'application/octet-stream',
    mediaType,
    panorama: detectPanorama(mediaType, categories, info.width || 0, info.height || 0, info.mime || ''),
    fileSize: info.size || 0,
    width: info.width || 0,
    height: info.height || 0,
    author: author || 'Wikimedia Commons',
    authorHtml: authorRaw,
    description: description || cleanTitle,
    descriptionHtml: descRaw,
    date: cleanCommonsHtml(meta.DateTimeOriginal?.value || meta.DateTime?.value || ''),
    licenseShort: licenseShort || 'Lisensi Terbuka',
    licenseFull: usageTerms || licenseShort || 'Bebas digunakan dengan ketentuan',
    licenseUrl,
    licenseCategory,
    attributionRequired: meta.AttributionRequired?.value === 'true',
    categories,
    credit: stripHtml(meta.Credit?.value || ''),
    latitude: !isNaN(lat as number) ? lat : undefined,
    longitude: !isNaN(lng as number) ? lng : undefined,
  };
}

/**
 * Build search query with media type qualifiers
 */
function buildSearchQuery(query: string, mediaType: MediaType): string {
  let q = query.trim();
  // Strip redundant Category: or Kategori: prefix so file search finds matching media
  q = q.replace(/^(Category|Kategori)\s*:\s*/i, '').trim();
  if (!q && mediaType !== '3d' && mediaType !== 'panorama') {
    q = 'Featured pictures';
  }

  // Add specific filetype prefix if user selected specific media type
  if (mediaType === 'audio' && !q.includes('filetype:audio')) {
    q = `filetype:audio ${q}`;
  } else if (mediaType === 'video' && !q.includes('filetype:video')) {
    q = `filetype:video ${q}`;
  } else if (mediaType === 'document' && !q.includes('filetype:')) {
    q = `filetype:pdf|djvu ${q}`;
  } else if (mediaType === 'image' && !q.includes('filetype:')) {
    q = `filetype:bitmap|drawing ${q}`;
  } else if (mediaType === '3d' && !q.includes('filetype:')) {
    q = `filetype:3d ${q}`.trim();
  } else if (mediaType === 'panorama' && !q.includes('incategory:')) {
    q = `incategory:"360° panoramas" ${q}`.trim();
  }

  return q;
}

export interface SearchResult {
  items: CommonsMediaItem[];
  nextOffset: number | null;
  totalHits?: number;
  continueToken?: string;
  isLatestUploads?: boolean;
}

/**
 * Fetch media from Wikimedia Commons with pagination and filter support.
 * If query is empty, calls the live Wikimedia Commons Latest Uploads API (allimages sorted by timestamp desc).
 */
export async function searchCommonsMedia(
  filter: GalleryFilterState,
  offset = 0,
  limit = 24,
  continueToken?: string
): Promise<SearchResult> {
  const isLatestUploads = !filter.query || filter.query.trim().length === 0;

  // 1. LATEST UPLOADS API CALL (When search is empty)
  if (isLatestUploads) {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      origin: '*',
      generator: 'allimages',
      gaisort: 'timestamp',
      gaidir: 'older',
      gailimit: String(limit),
      ...(filter.username && filter.username.trim() ? { gaiuser: filter.username.trim().replace(/^(User|Pengguna):/i, '').replace(/_/g, ' ') } : {}),
      prop: 'imageinfo|info',
      iiprop: 'url|size|mime|extmetadata|dimensions|timestamp',
      iiurlwidth: '800',
      iiurlheight: '1200',
    });

    if (continueToken) {
      params.set('gaicontinue', continueToken);
      params.set('continue', 'gaicontinue||');
    }

    try {
      const response = await commonsFetch(`${COMMONS_API_BASE}?${params.toString()}`, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Wikimedia API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.query || !data.query.pages) {
        return {
          items: [],
          nextOffset: null,
          isLatestUploads: true,
        };
      }

      const pages: CommonsPage[] = Object.values(data.query.pages);
      // Sort newest uploads first based on MediaWiki timestamp
      pages.sort((a, b) => {
        const timeA = a.imageinfo?.[0]?.timestamp ? new Date(a.imageinfo[0].timestamp).getTime() : 0;
        const timeB = b.imageinfo?.[0]?.timestamp ? new Date(b.imageinfo[0].timestamp).getTime() : 0;
        return timeB - timeA;
      });

      let items: CommonsMediaItem[] = [];
      for (const page of pages) {
        const item = parseCommonsPage(page);
        if (item) {
          items.push(item);
        }
      }

      // Filter by mediaType if specified
      if (filter.mediaType === 'panorama') {
        items = items.filter((item) => item.panorama === 'sphere');
      } else if (filter.mediaType !== 'all') {
        items = items.filter((item) => item.mediaType === filter.mediaType);
      }

      // Apply client-side license filter if active
      if (filter.license !== 'all') {
        items = items.filter((item) => item.licenseCategory === filter.license);
      }

      const nextToken = data.continue?.gaicontinue || null;
      const nextOffset = nextToken ? offset + limit : null;

      return {
        items,
        nextOffset,
        continueToken: nextToken,
        isLatestUploads: true,
      };
    } catch (error) {
      console.error('Failed to fetch latest uploads from Wikimedia Commons:', error);
      throw error;
    }
  }

  // 2. REGULAR SEARCH API CALL
  const gsrSearch = buildSearchQuery(filter.query, filter.mediaType);

  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'search',
    gsrsearch: gsrSearch,
    gsrnamespace: '6', // File: namespace
    gsrlimit: String(limit),
    gsroffset: String(offset),
    list: 'search',
    srsearch: gsrSearch,
    srnamespace: '6',
    srlimit: '1',
    prop: 'imageinfo|info|categories',
    cllimit: '50',
    iiprop: 'url|size|mime|extmetadata|dimensions|timestamp',
    iiurlwidth: '800',
    iiurlheight: '1200',
  });

  if (filter.sort === 'newest') {
    params.set('gsrsort', 'create_timestamp_desc');
  }

  try {
    const response = await commonsFetch(`${COMMONS_API_BASE}?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Wikimedia API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.query || !data.query.pages) {
      return {
        items: [],
        nextOffset: null,
        isLatestUploads: false,
      };
    }

    const pages: CommonsPage[] = Object.values(data.query.pages);
    // Sort pages by index if available
    pages.sort((a, b) => (a.index || 0) - (b.index || 0));

    let items: CommonsMediaItem[] = [];
    for (const page of pages) {
      const item = parseCommonsPage(page);
      if (item) {
        items.push(item);
      }
    }

    // Apply client-side license filter if active
    if (filter.license !== 'all') {
      items = items.filter((item) => item.licenseCategory === filter.license);
    }

    // Next offset handling
    const continueOffset = data.continue?.gsroffset;
    const nextOffset = continueOffset ? parseInt(continueOffset, 10) : null;
    const totalHits =
      data.query.searchinfo?.totalhits !== undefined
        ? data.query.searchinfo.totalhits
        : nextOffset !== null
        ? offset + items.length + 1
        : undefined;

    return {
      items,
      nextOffset,
      totalHits,
      isLatestUploads: false,
    };
  } catch (error) {
    console.error('Failed to search Wikimedia Commons:', error);
    throw error;
  }
}

/**
 * Fetch single media details by file title
 */
export async function fetchMediaDetailByTitle(title: string): Promise<CommonsMediaItem | null> {
  const normalizedTitle = title.startsWith('File:') ? title : `File:${title}`;
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    titles: normalizedTitle,
    prop: 'imageinfo|info|categories',
    cllimit: '50',
    iiprop: 'url|size|mime|extmetadata|dimensions',
    iiurlwidth: '1280',
  });

  try {
    const response = await commonsFetch(`${COMMONS_API_BASE}?${params.toString()}`);
    if (!response.ok) throw new Error('Network error');
    const data = await response.json();
    const pages: CommonsPage[] = Object.values(data.query?.pages || {});
    if (pages.length === 0 || !pages[0].imageinfo) return null;
    return parseCommonsPage(pages[0]);
  } catch (err) {
    console.error('Error fetching file detail:', err);
    return null;
  }
}

export interface WikiGlobalUsageItem {
  title: string;
  wiki: string;
  url: string;
}

/**
 * Fetch where this file is used across Wikimedia projects (Wikipedia, Wikivoyage, etc.)
 */
export async function fetchFileGlobalUsage(title: string): Promise<WikiGlobalUsageItem[]> {
  const fileTitle = title.startsWith('File:') ? title : `File:${title}`;
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    titles: fileTitle,
    prop: 'globalusage',
    gulimit: '25',
  });

  try {
    const response = await commonsFetch(`${COMMONS_API_BASE}?${params.toString()}`);
    if (!response.ok) return [];
    const data = await response.json();
    const pages = Object.values(data?.query?.pages || {}) as Array<{
      globalusage?: Array<{ title: string; wiki: string; url: string }>;
    }>;
    if (pages.length === 0 || !pages[0].globalusage) return [];
    return pages[0].globalusage.map((item) => ({
      title: (item.title || '').replace(/_/g, ' '),
      wiki: item.wiki || '',
      url: item.url || `https://${item.wiki}/wiki/${encodeURIComponent(item.title || '')}`,
    }));
  } catch (err) {
    console.warn('Failed to fetch file global usage:', err);
    return [];
  }
}

/**
 * Fetch nearby media from Wikimedia Commons given latitude, longitude, and radius (in meters)
 */
export async function fetchNearbyCommonsMedia(
  lat: number,
  lng: number,
  radiusMeters = 10000,
  limit = 50
): Promise<CommonsMediaItem[]> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'geosearch',
    ggscoord: `${lat}|${lng}`,
    ggsradius: String(Math.min(radiusMeters, 10000)), // max 10000 for Commons geosearch
    ggsnamespace: '6', // File namespace
    ggslimit: String(limit),
    prop: 'imageinfo|info|coordinates|categories',
    cllimit: '50',
    iiprop: 'url|size|mime|extmetadata|dimensions',
    iiurlwidth: '800',
    iiurlheight: '800',
  });

  try {
    const response = await commonsFetch(`${COMMONS_API_BASE}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Wikimedia geosearch error: ${response.status}`);
    }
    const data = await response.json();
    if (!data.query || !data.query.pages) {
      return [];
    }

    const pages: CommonsPage[] = Object.values(data.query.pages);
    const results: CommonsMediaItem[] = [];

    for (const page of pages) {
      const item = parseCommonsPage(page);
      if (item) {
        // Also check if coordinates are in page.coordinates array if not in extmetadata
        if ((item.latitude === undefined || item.longitude === undefined) && (page as any).coordinates?.length > 0) {
          const coord = (page as any).coordinates[0];
          item.latitude = coord.lat;
          item.longitude = coord.lon;
        }
        results.push(item);
      }
    }

    return results;
  } catch (err) {
    console.error('Failed to fetch nearby Commons media:', err);
    throw err;
  }
}

/**
 * Clean a category name by removing 'Category:' prefix and underscores
 */
export function normalizeCategoryName(raw: string): string {
  if (!raw) return '';
  return raw
    .trim()
    .replace(/^(Category|Kategori)\s*:\s*/i, '')
    .replace(/_/g, ' ')
    .trim();
}

/**
 * Fetch subcategories of a category from Wikimedia Commons
 */
export async function fetchCategorySubcategories(
  categoryName: string,
  limit = 50
): Promise<CommonsCategoryItem[]> {
  const cleanCat = normalizeCategoryName(categoryName);
  if (!cleanCat) return [];

  const catTitle = `Category:${cleanCat}`;

  try {
    // 1. Try generator=categorymembers with prop=categoryinfo
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      origin: '*',
      generator: 'categorymembers',
      gcmtitle: catTitle,
      gcmtype: 'subcat',
      gcmlimit: String(limit),
      prop: 'categoryinfo|info',
    });

    const res = await commonsFetch(`${COMMONS_API_BASE}?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();

    if (data.query?.pages) {
      const pages = Object.values(data.query.pages) as Array<{
        pageid: number;
        title: string;
        categoryinfo?: {
          size?: number;
          pages?: number;
          files?: number;
          subcats?: number;
          hidden?: string;
        };
      }>;

      // Filter out hidden maintenance categories and map
      const subcats: CommonsCategoryItem[] = pages
        .filter((p) => p.categoryinfo?.hidden === undefined)
        .map((p) => ({
          id: p.pageid,
          title: p.title,
          cleanName: normalizeCategoryName(p.title),
          filesCount: p.categoryinfo?.files ?? 0,
          subcatsCount: p.categoryinfo?.subcats ?? 0,
          totalSize: p.categoryinfo?.size ?? 0,
        }))
        .sort((a, b) => ((b.filesCount || 0) + (b.subcatsCount || 0)) - ((a.filesCount || 0) + (a.subcatsCount || 0)));

      if (subcats.length > 0) {
        return subcats;
      }
    }

    // 2. Fallback: If no direct subcategories found, search for categories matching the query in namespace 14
    return await searchCategories(cleanCat, limit);
  } catch (err) {
    console.error('Failed to fetch subcategories:', err);
    return await searchCategories(cleanCat, limit);
  }
}

/**
 * Fetch parent categories of a category from Wikimedia Commons
 */
export async function fetchCategoryParents(
  categoryName: string,
  limit = 40
): Promise<CommonsCategoryItem[]> {
  const cleanCat = normalizeCategoryName(categoryName);
  if (!cleanCat) return [];

  const catTitle = `Category:${cleanCat}`;

  try {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      origin: '*',
      titles: catTitle,
      prop: 'categories',
      clshow: '!hidden', // Filter out hidden / tracking categories
      cllimit: String(limit),
    });

    const res = await commonsFetch(`${COMMONS_API_BASE}?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();

    const pages = Object.values(data?.query?.pages || {}) as Array<{
      pageid?: number;
      categories?: Array<{ ns: number; title: string }>;
    }>;

    if (!pages.length || !pages[0].categories || pages[0].categories.length === 0) {
      // If the query was not an exact category, search categories in ns 14
      return await searchCategories(cleanCat, limit);
    }

    const parentTitles = pages[0].categories
      .map((c) => c.title)
      .filter((t) => t.startsWith('Category:'));

    if (parentTitles.length === 0) return [];

    // Batch fetch categoryinfo for parents to get file and subcat counts
    const batchInfoParams = new URLSearchParams({
      action: 'query',
      format: 'json',
      origin: '*',
      titles: parentTitles.slice(0, 30).join('|'),
      prop: 'categoryinfo',
    });

    const infoRes = await commonsFetch(`${COMMONS_API_BASE}?${batchInfoParams.toString()}`);
    const infoData = await infoRes.json();
    const infoPages: Record<string, any> = infoData?.query?.pages || {};

    const items: CommonsCategoryItem[] = [];
    for (const p of Object.values(infoPages)) {
      if (p.categoryinfo?.hidden !== undefined) continue;
      items.push({
        id: p.pageid,
        title: p.title,
        cleanName: normalizeCategoryName(p.title),
        filesCount: p.categoryinfo?.files ?? 0,
        subcatsCount: p.categoryinfo?.subcats ?? 0,
        totalSize: p.categoryinfo?.size ?? 0,
      });
    }

    return items.sort((a, b) => ((b.filesCount || 0) + (b.subcatsCount || 0)) - ((a.filesCount || 0) + (a.subcatsCount || 0)));
  } catch (err) {
    console.error('Failed to fetch parent categories:', err);
    return [];
  }
}

/**
 * Search category namespace 14
 */
export async function searchCategories(
  query: string,
  limit = 40
): Promise<CommonsCategoryItem[]> {
  const cleanQ = normalizeCategoryName(query);
  if (!cleanQ) return [];

  try {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      origin: '*',
      list: 'search',
      srnamespace: '14', // Category namespace
      srsearch: cleanQ,
      srlimit: String(limit),
    });

    const res = await commonsFetch(`${COMMONS_API_BASE}?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();

    const searchHits = data.query?.search || [];
    return searchHits.map((hit: any) => ({
      id: hit.pageid,
      title: hit.title,
      cleanName: normalizeCategoryName(hit.title),
      totalSize: hit.size || 0,
      filesCount: undefined,
      subcatsCount: undefined,
    }));
  } catch (err) {
    console.error('Search categories failed:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Detail tambahan untuk tab "Unduh & Info": data EXIF kamera + Depicts (SDC)
// ---------------------------------------------------------------------------
export interface MediaExtraDetail {
  exif: { key: string; value: string }[];
  depicts: string[];
  /** Ada bila berkas memakai proyeksi equirectangular (panorama 360°), dari metadata XMP GPano */
  panorama?: {
    projection: string;
    fullW: number;
    fullH: number;
    croppedW: number;
    croppedH: number;
    left: number;
    top: number;
  };
}

const exifScalar = (raw: unknown): string => {
  if (raw === null || raw === undefined) return '';
  if (Array.isArray(raw)) return exifScalar(raw[0]);
  if (typeof raw === 'object') return '';
  return String(raw).trim();
};

const exifNumber = (raw: string): number | null => {
  if (!raw) return null;
  const frac = raw.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (frac) {
    const d = parseFloat(frac[2]);
    return d === 0 ? null : parseFloat(frac[1]) / d;
  }
  const n = parseFloat(raw);
  return isNaN(n) ? null : n;
};

export async function fetchMediaExtraDetail(pageId: number, title: string): Promise<MediaExtraDetail> {
  const result: MediaExtraDetail = { exif: [], depicts: [] };

  const exifPromise = (async () => {
    try {
      const params = new URLSearchParams({
        action: 'query',
        format: 'json',
        origin: '*',
        titles: title,
        prop: 'imageinfo',
        iiprop: 'metadata',
      });
      const res = await commonsFetch(`${COMMONS_API_BASE}?${params.toString()}`);
      if (!res.ok) return;
      const json = await res.json();
      const pages = json?.query?.pages ? Object.values(json.query.pages) as any[] : [];
      const meta: { name: string; value: unknown }[] = pages[0]?.imageinfo?.[0]?.metadata || [];
      const get = (name: string) => exifScalar(meta.find((x) => x.name === name)?.value);

      const make = get('Make');
      const model = get('Model');
      const exposure = exifNumber(get('ExposureTime'));
      const fnum = exifNumber(get('FNumber'));
      const iso = get('ISOSpeedRatings') || get('PhotographicSensitivity');
      const dt = get('DateTimeOriginal') || get('DateTime');
      const focal = exifNumber(get('FocalLength'));
      const lens = get('LensModel');

      if (get('ProjectionType').toLowerCase() === 'equirectangular') {
        const num = (n: string) => Number(get(n)) || 0;
        result.panorama = {
          projection: 'equirectangular',
          fullW: num('FullPanoWidthPixels'),
          fullH: num('FullPanoHeightPixels'),
          croppedW: num('CroppedAreaImageWidthPixels'),
          croppedH: num('CroppedAreaImageHeightPixels'),
          left: num('CroppedAreaLeftPixels'),
          top: num('CroppedAreaTopPixels'),
        };
      }

      if (make) result.exif.push({ key: 'make', value: make });
      if (model) result.exif.push({ key: 'model', value: model });
      if (lens) result.exif.push({ key: 'lens', value: lens });
      if (exposure) {
        result.exif.push({
          key: 'exposure',
          value: exposure >= 1 ? `${Math.round(exposure * 10) / 10} sec` : `1/${Math.round(1 / exposure)} sec`,
        });
      }
      if (fnum) result.exif.push({ key: 'fnumber', value: `f/${Math.round(fnum * 10) / 10}` });
      if (iso) result.exif.push({ key: 'iso', value: iso });
      if (dt) result.exif.push({ key: 'datetime', value: dt });
      if (focal) result.exif.push({ key: 'focal', value: `${Math.round(focal * 10) / 10} mm` });
    } catch (err) {
      console.warn('EXIF fetch failed', err);
    }
  })();

  const depictsPromise = (async () => {
    try {
      const params = new URLSearchParams({
        action: 'wbgetentities',
        format: 'json',
        origin: '*',
        ids: `M${pageId}`,
        props: 'claims',
      });
      const res = await commonsFetch(`${COMMONS_API_BASE}?${params.toString()}`);
      if (!res.ok) return;
      const json = await res.json();
      const ent = json?.entities?.[`M${pageId}`];
      const claims = ent?.statements || ent?.claims || {};
      const ids: string[] = (claims['P180'] || [])
        .map((c: any) => c?.mainsnak?.datavalue?.value?.id)
        .filter(Boolean)
        .slice(0, 20);
      if (ids.length === 0) return;
      const lp = new URLSearchParams({
        action: 'wbgetentities',
        format: 'json',
        origin: '*',
        ids: ids.join('|'),
        props: 'labels',
        languages: 'id|en',
      });
      const lr = await commonsFetch(`https://www.wikidata.org/w/api.php?${lp.toString()}`);
      if (!lr.ok) return;
      const lj = await lr.json();
      result.depicts = ids
        .map((id) => lj?.entities?.[id]?.labels?.id?.value || lj?.entities?.[id]?.labels?.en?.value || '')
        .filter(Boolean);
    } catch (err) {
      console.warn('Depicts fetch failed', err);
    }
  })();

  await Promise.all([exifPromise, depictsPromise]);
  return result;
}

// ---------------------------------------------------------------------------
// Halaman pembicaraan (Talk Page) & riwayat versi berkas
// ---------------------------------------------------------------------------
export interface TalkPageResult {
  exists: boolean;
  html: string;
  url: string;
  title: string;
}

const wikiPageUrl = (title: string) =>
  `https://commons.wikimedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_')).replace(/%3A/g, ':').replace(/%2F/g, '/')}`;

/** Bersihkan HTML hasil parse MediaWiki agar aman dirender (tanpa script/gambar/atribut event). */
export function sanitizeWikiHtml(html: string): string {
  if (typeof DOMParser === 'undefined') return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc
    .querySelectorAll('script,style,iframe,object,embed,form,input,button,select,textarea,img,link,meta,noscript,video,audio,source,svg,.mw-editsection,.noprint,.mw-empty-elt')
    .forEach((el) => el.remove());
  doc.querySelectorAll('*').forEach((el) => {
    Array.from(el.attributes).forEach((a) => {
      const n = a.name.toLowerCase();
      if (n.startsWith('on') || n === 'style' || n === 'srcset') el.removeAttribute(a.name);
    });
  });
  doc.querySelectorAll('a').forEach((a) => {
    let h = a.getAttribute('href') || '';
    if (h.startsWith('//')) h = 'https:' + h;
    else if (h.startsWith('/')) h = 'https://commons.wikimedia.org' + h;
    if (/^https?:\/\//i.test(h)) {
      a.setAttribute('href', h);
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    } else {
      a.removeAttribute('href');
    }
  });
  return doc.body.innerHTML;
}

export async function fetchTalkPage(title: string): Promise<TalkPageResult> {
  const params = new URLSearchParams({
    action: 'parse',
    format: 'json',
    formatversion: '2',
    origin: '*',
    page: title,
    prop: 'text',
    redirects: '1',
    disableeditsection: '1',
    disablelimitreport: '1',
  });
  const res = await commonsFetch(`${COMMONS_API_BASE}?${params.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json?.error) {
    if (json.error.code === 'missingtitle' || json.error.code === 'invalidtitle') {
      return { exists: false, html: '', url: wikiPageUrl(title), title };
    }
    throw new Error(json.error.info || 'Gagal memuat halaman pembicaraan');
  }
  return {
    exists: true,
    html: sanitizeWikiHtml(json?.parse?.text || ''),
    url: wikiPageUrl(json?.parse?.title || title),
    title: json?.parse?.title || title,
  };
}

export interface FileVersionEntry {
  timestamp: string;
  user: string;
  comment: string;
  width: number;
  height: number;
  size: number;
  url: string;
  thumb: string;
}

export interface PageEditEntry {
  revid: number;
  timestamp: string;
  user: string;
  comment: string;
  size: number;
}

export async function fetchFileHistory(title: string): Promise<{ versions: FileVersionEntry[]; edits: PageEditEntry[] }> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    origin: '*',
    titles: title,
    prop: 'imageinfo|revisions',
    iilimit: '30',
    iiprop: 'timestamp|user|comment|size|url|dimensions',
    iiurlwidth: '160',
    rvlimit: '20',
    rvprop: 'timestamp|user|comment|ids|size',
  });
  const res = await commonsFetch(`${COMMONS_API_BASE}?${params.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const page = json?.query?.pages?.[0] || {};
  const versions: FileVersionEntry[] = (page.imageinfo || []).map((i: any) => ({
    timestamp: i.timestamp || '',
    user: i.user || '',
    comment: i.comment || '',
    width: i.width || 0,
    height: i.height || 0,
    size: i.size || 0,
    url: i.url || '',
    thumb: i.thumburl || '',
  }));
  const edits: PageEditEntry[] = (page.revisions || []).map((r: any) => ({
    revid: r.revid,
    timestamp: r.timestamp || '',
    user: r.user || '',
    comment: r.comment || '',
    size: r.size || 0,
  }));
  return { versions, edits };
}


// ---------------------------------------------------------------------------
// Link proyek Wikimedia terkait (Wikipedia ID/EN, Wikivoyage, Wikidata)
// ---------------------------------------------------------------------------
export interface RelatedWikiLink {
  project: string;
  title: string;
  url: string;
  description?: string;
}

const RELATED_WIKI_HOSTS: { host: string; label: string }[] = [
  { host: 'id.wikipedia.org', label: 'Wikipedia (ID)' },
  { host: 'en.wikipedia.org', label: 'Wikipedia (EN)' },
  { host: 'en.wikivoyage.org', label: 'Wikivoyage' },
];

const stripHtml = (s: string) => s.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

// Bersihkan HTML metadata Commons: buang elemen tersembunyi/markup Wikidata (QS:), ikon edit, label bahasa; pilih blok bahasa id/en bila ada.
const cleanCommonsHtml = (html: string): string => {
  if (!html) return '';
  let text = '';
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script,style,.noprint,.mw-editsection,[style*="display: none"],[style*="display:none"],[hidden]').forEach((e) => e.remove());
    const blocks = Array.from(doc.querySelectorAll('div.description[lang]'));
    if (blocks.length > 1) {
      const pick = ['id', 'en'].map((l) => blocks.find((b) => (b.getAttribute('lang') || '').toLowerCase().startsWith(l))).find(Boolean) || blocks[0];
      doc.body.innerHTML = '';
      doc.body.appendChild(pick as Element);
    }
    doc.querySelectorAll('span.language').forEach((e) => e.remove());
    doc.querySelectorAll('br').forEach((e) => e.replaceWith('\n'));
    doc.querySelectorAll('p,div,li,tr,dd,dt,h1,h2,h3,h4').forEach((e) => e.append('\n'));
    text = doc.body.textContent || '';
  } catch {
    text = html.replace(/<[^>]*>/g, ' ');
  }
  text = text.replace(/(?:title|label)?\s*QS:[\s\S]*$/, '');
  return text.replace(/[ \t\u00a0]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
};


// Token sederhana (huruf kecil, tanpa aksen) untuk menilai relevansi judul terhadap istilah pencarian
const normTokens = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);

// Relevan bila judul hampir seluruhnya terdapat pada istilah, atau istilah seluruhnya terdapat pada judul
function isRelevantTitle(title: string, term: string): boolean {
  const tt = normTokens(term);
  const ti = normTokens(title.replace(/\(.*?\)/g, ' '));
  if (tt.length === 0 || ti.length === 0) return false;
  const inTerm = ti.filter((t) => tt.includes(t)).length / ti.length;
  const inTitle = tt.filter((t) => ti.includes(t)).length / tt.length;
  return inTerm >= 0.75 || inTitle >= 1;
}

async function searchWikiHost(host: string, label: string, term: string): Promise<RelatedWikiLink[]> {
  try {
    const p = new URLSearchParams({
      action: 'query', list: 'search', srsearch: term, srlimit: '6', srprop: 'snippet', format: 'json', origin: '*',
    });
    const res = await commonsFetch('https://' + host + '/w/api.php?' + p.toString());
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.query?.search || [])
      .filter((r: any) => isRelevantTitle(String(r.title), term))
      .slice(0, 2)
      .map((r: any) => ({
        project: label,
        title: r.title,
        url: 'https://' + host + '/wiki/' + encodeURIComponent(String(r.title).replace(/ /g, '_')),
        description: stripHtml(r.snippet || '').slice(0, 140),
      }));
  } catch {
    return [];
  }
}

type GeoLink = RelatedWikiLink & { qid?: string };

async function geoSearchWikiHost(host: string, label: string, lat: number, lon: number, radius: number): Promise<GeoLink[]> {
  try {
    const p = new URLSearchParams({
      action: 'query', list: 'geosearch', gscoord: lat + '|' + lon, gsradius: String(Math.min(radius, 10000)),
      gslimit: '4', format: 'json', origin: '*',
    });
    const res = await commonsFetch('https://' + host + '/w/api.php?' + p.toString());
    if (!res.ok) return [];
    const data = await res.json();
    const rows: any[] = data?.query?.geosearch || [];
    const out: GeoLink[] = rows.map((r) => ({
      project: label,
      title: r.title,
      url: 'https://' + host + '/wiki/' + encodeURIComponent(String(r.title).replace(/ /g, '_')),
      description: r.dist != null ? Math.round(r.dist) + ' m dari pusat peta' : undefined,
    }));
    // Ambil ID Wikidata dari artikel-artikel terdekat (relevan karena berbasis lokasi)
    if (rows.length > 0 && host.endsWith('wikipedia.org')) {
      const pp = new URLSearchParams({
        action: 'query', prop: 'pageprops', ppprop: 'wikibase_item',
        pageids: rows.map((r) => r.pageid).join('|'), format: 'json', origin: '*',
      });
      const pr = await commonsFetch('https://' + host + '/w/api.php?' + pp.toString());
      if (pr.ok) {
        const pd = await pr.json();
        const pages = pd?.query?.pages || {};
        rows.forEach((r, i) => {
          const q = pages[String(r.pageid)]?.pageprops?.wikibase_item;
          if (q) out[i].qid = q;
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}

async function searchWikidata(term: string): Promise<RelatedWikiLink[]> {
  try {
    const p = new URLSearchParams({
      action: 'wbsearchentities', search: term, language: 'id', uselang: 'id', limit: '6', format: 'json', origin: '*',
    });
    const res = await commonsFetch('https://www.wikidata.org/w/api.php?' + p.toString());
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.search || [])
      .filter((r: any) => isRelevantTitle(String(r.label || ''), term))
      .slice(0, 2)
      .map((r: any) => ({
        project: 'Wikidata',
        title: (r.label || r.id) + ' (' + r.id + ')',
        url: 'https://www.wikidata.org/wiki/' + r.id,
        description: r.description || undefined,
      }));
  } catch {
    return [];
  }
}

export async function fetchRelatedWikimediaLinks(opts: {
  terms: string[];
  lat?: number;
  lon?: number;
  radius?: number;
}): Promise<RelatedWikiLink[]> {
  const hasGeo = typeof opts.lat === 'number' && typeof opts.lon === 'number';

  // Mode area: hanya berbasis lokasi (geosearch) agar tidak muncul nama jalan/tokoh yang kebetulan mirip
  if (hasGeo) {
    const radius = Math.min(opts.radius || 2000, 2500);
    const geo = (await Promise.all(
      RELATED_WIKI_HOSTS.map((h) => geoSearchWikiHost(h.host, h.label, opts.lat as number, opts.lon as number, radius))
    )).flat();
    const wikidata: RelatedWikiLink[] = [];
    const seenQ = new Set<string>();
    for (const g of geo) {
      if (g.qid && !seenQ.has(g.qid) && wikidata.length < 4) {
        seenQ.add(g.qid);
        wikidata.push({ project: 'Wikidata', title: g.title + ' (' + g.qid + ')', url: 'https://www.wikidata.org/wiki/' + g.qid });
      }
    }
    const links: RelatedWikiLink[] = geo.map(({ qid, ...rest }) => rest);
    const seen = new Set<string>();
    return [...links.slice(0, 18), ...wikidata].filter((l) => (seen.has(l.url) ? false : (seen.add(l.url), true)));
  }

  // Mode berkas: pencarian kata kunci dengan penyaringan relevansi judul
  const terms = Array.from(new Set(opts.terms.map((t) => t.trim()).filter((t) => t.length > 2))).slice(0, 2);
  const jobs: Promise<RelatedWikiLink[]>[] = [];
  for (const term of terms) {
    for (const h of RELATED_WIKI_HOSTS.slice(0, 2)) jobs.push(searchWikiHost(h.host, h.label, term));
    jobs.push(searchWikidata(term));
  }
  const all = (await Promise.all(jobs)).flat();
  const seen = new Set<string>();
  return all.filter((l) => (seen.has(l.url) ? false : (seen.add(l.url), true)));
}


// Mode Acak: ambil berkas media Commons secara acak (namespace File) tanpa kata kunci
export async function fetchRandomCommonsMedia(limit = 24): Promise<SearchResult> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'random',
    grnnamespace: '6',
    grnfilterredir: 'nonredirects',
    grnlimit: String(Math.min(limit * 2, 50)),
    prop: 'imageinfo|info',
    iiprop: 'url|size|mime|extmetadata|dimensions|timestamp',
    iiurlwidth: '800',
    iiurlheight: '1200',
    rnd: String(Date.now()),
  });
  const response = await commonsFetch(`${COMMONS_API_BASE}?${params.toString()}`, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Wikimedia API error: ${response.status} ${response.statusText}`);
  const data = await response.json();
  const pages: CommonsPage[] = data?.query?.pages ? Object.values(data.query.pages) : [];
  const items: CommonsMediaItem[] = [];
  for (const page of pages) {
    const item = parseCommonsPage(page);
    if (item) items.push(item);
  }
  // Acak urutan agar tidak mengikuti urutan page id
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  // 20 halaman 'virtual': setiap halaman memuat batch acak baru
  return { items: items.slice(0, limit), nextOffset: null, totalHits: limit * 20, isLatestUploads: false };
}
