import { CommonsMediaItem } from '../types/wikimedia';
import { getLicenseInfo, generateAttribution } from '../utils/licenseUtils';

// Hanya model Flash-Lite (hemat): 3.1 Flash-Lite sebagai utama, 3.5 Flash-Lite sebagai cadangan jika model utama tidak ditemukan atau sibuk
const PRIMARY_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent';
const SECONDARY_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent';
const MODELS_LIST_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

export interface GeminiAnalysisResult {
  text: string;
  source: 'gemini';
  timestamp: number;
}

/**
 * Helper to fetch with a timeout
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 25000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Validates a Gemini API Key with a lightweight test call
 */
export async function testGeminiApiKey(apiKey: string): Promise<{ valid: boolean; message?: string }> {
  if (!apiKey || apiKey.trim().length < 10) {
    return { valid: false, message: 'Kunci API kosong atau format tidak valid.' };
  }

  const cleanKey = apiKey.trim();

  // Cek utama: daftar model. Tidak menjalankan model, jadi cepat dan tidak kena beban atau kuota generate.
  try {
    const listRes = await fetchWithTimeout(
      `${MODELS_LIST_ENDPOINT}?pageSize=1&key=${encodeURIComponent(cleanKey)}`,
      { method: 'GET' },
      15000
    );
    if (listRes.ok) return { valid: true };
    if (listRes.status === 429) {
      return { valid: true, message: 'Kunci diterima, tetapi kuota Gemini sedang terbatas.' };
    }
    if (listRes.status === 400 || listRes.status === 401 || listRes.status === 403) {
      const errData = await listRes.json().catch(() => ({}));
      return { valid: false, message: errData?.error?.message || `HTTP ${listRes.status}: ${listRes.statusText}` };
    }
  } catch {
    // Jaringan lambat atau terblokir: lanjut ke uji generate sebagai cadangan
  }

  const endpoints = [PRIMARY_ENDPOINT, SECONDARY_ENDPOINT];
  // Kunci yang salah ditolak (400/403) sebelum cek kapasitas. Jadi 429/503 berarti kunci diterima Google.
  let keyAccepted = false;
  let timedOut = false;

  for (const endpoint of endpoints) {
    try {
      const url = `${endpoint}?key=${encodeURIComponent(cleanKey)}`;
      const response = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: 'Ping. Respond with OK.' }],
              },
            ],
          }),
        },
        12000
      );

      if (response.ok) {
        return { valid: true };
      }

      const errData = await response.json().catch(() => ({}));
      const msg = errData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;

      // 429 (kuota/laju) dan 503 (beban tinggi): kunci sudah lolos autentikasi, coba model berikutnya
      if (response.status === 429 || response.status === 503) {
        keyAccepted = true;
        continue;
      }
      // 404: model tidak tersedia di endpoint ini, coba model berikutnya
      if (response.status === 404) {
        continue;
      }

      return { valid: false, message: msg };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        timedOut = true;
        continue;
      }
      const errorMsg =
        error instanceof Error && error.message.includes('fetch')
          ? 'Gagal terhubung ke Gemini API (terblokir oleh ekstensi browser / adblock / CORS). Pastikan izin koneksi aktif.'
          : error instanceof Error
          ? error.message
          : 'Koneksi ke Gemini API gagal.';
      return { valid: false, message: errorMsg };
    }
  }

  if (keyAccepted) {
    return { valid: true, message: 'Kunci diterima. Model Gemini sedang sibuk atau kuotanya terbatas, jadi hasil AI mungkin tertunda sesaat.' };
  }
  if (timedOut) {
    return { valid: false, message: 'Koneksi ke Gemini terlalu lambat sehingga kunci belum bisa diuji. Periksa jaringan lalu coba lagi.' };
  }
  return { valid: false, message: 'Model Gemini tidak tersedia untuk kunci ini. Pastikan kunci berasal dari Google AI Studio dan fitur Gemini API aktif.' };
}

// Setelah kuota habis (429), analisis otomatis tidak memanggil Gemini lagi untuk sementara dan langsung menampilkan error kuota
let geminiQuotaBlockedUntil = 0;

function uiIsEnglish(): boolean {
  return typeof document !== 'undefined' && document.documentElement.lang === 'en';
}

function quotaErrorMessage(): string {
  return uiIsEnglish()
    ? 'Gemini API quota is used up or there were too many requests (429). Try again in a few minutes, or check your quota in Google AI Studio.'
    : 'Kuota Gemini API habis atau terlalu banyak permintaan (429). Coba lagi beberapa menit lagi, atau cek kuota di Google AI Studio.';
}

// Cache hasil analisis file di memori: bertahan sampai halaman dimuat ulang, hemat panggilan Gemini
const unifiedAnalysisCache = new Map<string, UnifiedMediaAiAnalysis>();

export function getCachedUnifiedAnalysis(itemId: string | number, lang: 'en' | 'id'): UnifiedMediaAiAnalysis | undefined {
  return unifiedAnalysisCache.get(`${itemId}|${lang}`);
}

export function setCachedUnifiedAnalysis(itemId: string | number, lang: 'en' | 'id', analysis: UnifiedMediaAiAnalysis): void {
  unifiedAnalysisCache.set(`${itemId}|${lang}`, analysis);
}

/** Pesan error kuota bila Gemini baru saja membalas 429 (untuk analisis otomatis), selain itu null */
export function getGeminiQuotaBlockMessage(): string | null {
  return Date.now() < geminiQuotaBlockedUntil ? quotaErrorMessage() : null;
}

/**
 * Ringkasan lokal tanpa Gemini: dibangun dari metadata Commons dan aturan lisensi.
 * Dipakai bila kunci API belum ada atau panggilan Gemini gagal.
 */
export function buildLocalMediaAnalysis(
  item: CommonsMediaItem,
  lang: 'en' | 'id' = 'id',
  usages: Array<{ title: string; wiki: string }> = []
): UnifiedMediaAiAnalysis {
  const isEn = lang === 'en';
  const info = getLicenseInfo(item);
  const description = (item.description || '').replace(/\s+/g, ' ').trim();
  const author = item.author || item.credit || 'Wikimedia Commons';
  const kindMap: Record<string, [string, string]> = {
    image: ['image', 'gambar'],
    audio: ['audio file', 'berkas audio'],
    video: ['video', 'video'],
    document: ['document', 'dokumen'],
  };
  const kind = (kindMap[item.mediaType] || ['file', 'berkas'])[isEn ? 0 : 1];
  const licenseName = item.licenseShort || info.label;

  const highlights = [
    item.cleanTitle,
    author,
    licenseName,
    item.width > 0 ? `${item.width}×${item.height} px` : '',
    ...(item.categories || []).slice(0, 3),
  ].filter(Boolean) as string[];

  const commercialUse = info.isFreeForCommercial
    ? (isEn ? 'Commercial use is allowed under this license.' : 'Pemakaian komersial diperbolehkan oleh lisensi ini.')
    : (isEn ? 'Commercial use may be restricted. Check the license page.' : 'Pemakaian komersial mungkin dibatasi. Cek halaman lisensinya.');

  const modificationRules = info.allowsRemix
    ? (info.requiresShareAlike
        ? (isEn ? 'Remixing is allowed, but share your changes under the same license (ShareAlike).' : 'Boleh diubah, tetapi bagikan hasilnya dengan lisensi yang sama (ShareAlike).')
        : (isEn ? 'Remixing and adapting are allowed.' : 'Boleh diubah dan diadaptasi.'))
    : (isEn ? 'Changes may not be allowed. Check the license page.' : 'Perubahan mungkin tidak diperbolehkan. Cek halaman lisensinya.');

  const attributionGuide = info.requiresAttribution
    ? generateAttribution(item, 'plain', lang)
    : (isEn ? 'The license does not require credit, but giving credit is good practice.' : 'Lisensi tidak mewajibkan kredit, tetapi sebaiknya tetap mencantumkannya.');

  return {
    objectDescription: {
      laymanSummary: description
        ? description.slice(0, 300) + (description.length > 300 ? '...' : '')
        : (isEn
            ? `"${item.cleanTitle}" is a ${kind} on Wikimedia Commons by ${author}.`
            : `"${item.cleanTitle}" adalah ${kind} di Wikimedia Commons oleh ${author}.`),
      detailedVisuals: description || (isEn ? 'The Commons metadata has no description for this file.' : 'Metadata Commons tidak memiliki deskripsi untuk berkas ini.'),
      keyHighlights: highlights,
    },
    licenseExplanation: {
      licenseName,
      shortSummary: item.licenseFull || licenseName,
      commercialUse,
      modificationRules,
      attributionGuide,
      watchOut: isEn
        ? 'This summary follows fixed rules applied to the metadata. It is not legal advice, so check the file page on Commons.'
        : 'Ringkasan ini mengikuti aturan tetap atas metadata. Bukan nasihat hukum, jadi cek halaman berkas di Commons.',
    },
    accessibilityWcag: {
      shortAltText: item.cleanTitle,
      extendedDescription: description || item.cleanTitle,
    },
    wikiUsage: {
      summary: usages.length > 0
        ? (isEn ? `This file is used on ${usages.length} Wikimedia pages.` : `Berkas ini dipakai di ${usages.length} halaman Wikimedia.`)
        : (isEn ? 'No Wikimedia page usage was loaded for this file.' : 'Pemakaian di halaman Wikimedia belum dimuat untuk berkas ini.'),
      projectRoles: usages.slice(0, 5).map((u) => ({
        wikiName: u.wiki,
        article: u.title,
        role: isEn ? 'A page that uses this file' : 'Halaman yang memakai berkas ini',
      })),
    },
    modelMeta: {
      assistantName: 'WikiGaleri',
      modelName: isEn ? 'Local summary' : 'Ringkasan lokal',
      modelVersion: 'local',
      disclaimer: isEn ? AI_LOCAL_DISCLAIMER_TEXT_EN : AI_LOCAL_DISCLAIMER_TEXT_ID,
      language: lang,
      source: 'local',
    },
  };
}

/**
 * Generic caller for Gemini with automatic model fallback and retry on transient spikes (503/429)
 */
async function callGemini(apiKey: string, prompt: string, systemInstruction?: string): Promise<string> {
  const cleanKey = apiKey.trim();
  const endpoints = [PRIMARY_ENDPOINT, SECONDARY_ENDPOINT];

  const payload: Record<string, unknown> = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
  };

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  let lastError: Error | null = null;

  for (const endpoint of endpoints) {
    const url = `${endpoint}?key=${encodeURIComponent(cleanKey)}`;

    // Try up to 2 attempts per endpoint for transient 503 / network spike
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetchWithTimeout(
          url,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          },
          25000
        );

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData?.error?.message || `Error ${response.status}: ${response.statusText}`;

          // If 503 (high demand) or 404 (model not found), fail over to next model/endpoint
if (response.status === 429) geminiQuotaBlockedUntil = Date.now() + 90 * 1000;
          if (response.status === 503 || response.status === 404 ) {
            lastError = new Error(errMsg);
            // Wait 1s before attempt 2 or next endpoint
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue;
          }

          const fatalErr = new Error(response.status === 429 ? quotaErrorMessage() : errMsg) as Error & { fatal?: boolean };
fatalErr.fatal = true;
throw fatalErr;
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          throw new Error('Tidak ada respon teks dari model Gemini.');
        }

        lastGeminiModel = endpoint.match(/models\/([^:]+):/)?.[1] || lastGeminiModel;
        return text.trim();
      } catch (err) {
if (err instanceof Error && (err as Error & { fatal?: boolean }).fatal) throw err;
        if (err instanceof Error && err.name === 'AbortError') {
          lastError = new Error('Permintaan ke Gemini API melebihi batas waktu (timeout). Silakan coba lagi.');
          continue;
        }
        if (err instanceof Error && err.message.includes('fetch')) {
          throw new Error(
            'Koneksi browser ke API Gemini terhalang (kemungkinan ad blocker atau pembatasan jaringan). Matikan shields atau periksa koneksi.'
          );
        }
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }
  }

  throw (
    lastError ||
    new Error(
      'Server model Gemini sedang mengalami lonjakan beban sementara (503/High Demand). Silakan klik coba lagi.'
    )
  );
}

export const GEMINI_ASSISTANT_NAME = 'Gemini';
export const GEMINI_MODEL_NAME = 'Gemini 3.1 Flash-Lite';
export const GEMINI_MODEL_VERSION = 'gemini-3.1-flash-lite';

// Model yang benar-benar menjawab pada panggilan terakhir (bisa model cadangan)
let lastGeminiModel = GEMINI_MODEL_VERSION;

export function getGeminiModelMeta(): { modelName: string; modelVersion: string } {
  const m = lastGeminiModel.match(/^gemini-(\d+(?:\.\d+)?)-flash(-lite)?$/);
  return {
    modelName: m ? `Gemini ${m[1]} Flash${m[2] ? '-Lite' : ''}` : `Gemini (${lastGeminiModel})`,
    modelVersion: lastGeminiModel,
  };
}

export const AI_DISCLAIMER_TEXT_ID =
  'Catatan: penjelasan ini ditulis otomatis oleh Google Gemini dari metadata Wikimedia Commons. Bisa saja ada yang keliru, jadi cek lagi sebelum dipakai untuk riset, urusan hukum, atau terbitan resmi.';

export const AI_DISCLAIMER_TEXT_EN =
  'Heads up: Google Gemini wrote this automatically from Wikimedia Commons metadata. It can get things wrong, so double-check before using it for research, legal matters, or publication.';

export const AI_LOCAL_DISCLAIMER_TEXT_ID =
  'Catatan: ringkasan ini dibuat otomatis oleh WikiGaleri dari judul dan metadata berkas, bukan ditulis oleh Gemini. Isinya terbatas dan bisa kurang tepat, jadi cek lagi sebelum dipakai untuk riset, urusan hukum, atau terbitan resmi.';

export const AI_LOCAL_DISCLAIMER_TEXT_EN =
  'Heads up: WikiGaleri built this summary automatically from file titles and metadata; it was not written by Gemini. It is limited and may be imprecise, so double-check before using it for research, legal matters, or publication.';

export const AI_DISCLAIMER_TEXT = AI_DISCLAIMER_TEXT_ID;

export interface UnifiedMediaAiAnalysis {
  objectDescription: {
    laymanSummary: string;
    detailedVisuals: string;
    keyHighlights: string[];
    usageIdeas?: string[];
  };
  licenseExplanation: {
    licenseName: string;
    shortSummary: string;
    commercialUse: string;
    modificationRules: string;
    attributionGuide: string;
    watchOut?: string;
  };
  accessibilityWcag: {
    shortAltText: string;
    extendedDescription: string;
  };
  wikiUsage: {
    summary: string;
    projectRoles: Array<{
      wikiName: string;
      article: string;
      role: string;
    }>;
  };
  modelMeta?: {
    assistantName: string;
    modelName: string;
    modelVersion: string;
    disclaimer: string;
    language?: 'en' | 'id';
    source?: 'gemini' | 'local';
  };
}

/**
 * Unified Gemini Media Assistance:
 * Generates an all-in-one comprehensive explanation of the media object for general/layman users,
 * licensing terms, WCAG accessibility alt-text, and Wikimedia projects usage context in clean JSON.
 * Follows the active user interface language (English or Indonesian).
 */
export async function generateUnifiedMediaAnalysis(
  apiKey: string,
  item: CommonsMediaItem,
  liveWikiUsage?: Array<{ title: string; wiki: string }>,
  lang: 'en' | 'id' = 'id'
): Promise<UnifiedMediaAiAnalysis> {
  const isEn = lang === 'en';
  const disclaimerText = isEn ? AI_DISCLAIMER_TEXT_EN : AI_DISCLAIMER_TEXT_ID;

  const usageContext =
    liveWikiUsage && liveWikiUsage.length > 0
      ? isEn
        ? `Wikimedia pages that currently use this file:\n${liveWikiUsage
            .slice(0, 10)
            .map((u) => `- ${u.wiki}: "${u.title}"`)
            .join('\n')}`
        : `Halaman Wikimedia yang saat ini memakai berkas ini:\n${liveWikiUsage
            .slice(0, 10)
            .map((u) => `- ${u.wiki}: "${u.title}"`)
            .join('\n')}`
      : isEn
      ? 'No Wikimedia page is recorded as using this file.'
      : 'Belum ada halaman Wikimedia yang tercatat memakai berkas ini.';

  const systemInstruction = isEn
    ? `You explain files from Wikimedia Commons to people who are not experts. Write like a well-read friend: plain words, short sentences, and no jargon unless you explain it right away.

Rules:
1. Use only what is in the metadata below or what can clearly be seen in the file. Never invent people, dates, places, creators or copyright status.
2. Be specific. Whenever the metadata has a name, date, place, number, or format, use it instead of a general statement.
3. If something is missing (photographer, exact date, place), say it is not recorded on Commons. Do not guess.
4. For the license, rely only on the one stated (${item.licenseShort || item.licenseFull || 'Creative Commons'}). If it requires credit (BY) or share-alike (SA), say so. Never call a file public domain unless its license says that.
5. Skip filler and hype. Avoid words like stunning, vibrant, rich, tapestry, testament, showcase, captivating and delve. Do not open with praise, and do not end with a sentence that repeats what you already said.
6. Return valid JSON only. No Markdown fences and no text before or after it.`
    : `Kamu menjelaskan berkas Wikimedia Commons kepada orang awam. Tulis seperti teman yang banyak membaca: kata sehari-hari, kalimat pendek, dan istilah teknis hanya kalau langsung dijelaskan.

Aturan:
1. Pakai hanya isi metadata di bawah atau hal yang jelas terlihat pada berkas. Jangan mengarang tokoh, tanggal, tempat, pembuat, atau status hak cipta.
2. Jelas dan spesifik. Kalau metadata punya nama, tanggal, tempat, angka, atau format, pakai itu, jangan diganti kalimat umum.
3. Kalau ada yang tidak tercatat (fotografer, tanggal pastinya, lokasi), bilang terus terang bahwa itu tidak tercatat di Commons. Jangan menebak.
4. Untuk lisensi, pegang hanya lisensi yang tertulis (${item.licenseShort || item.licenseFull || 'Creative Commons'}). Kalau lisensinya mewajibkan atribusi (BY) atau berbagi serupa (SA), sebutkan. Jangan bilang berkas ini domain publik kecuali lisensinya memang begitu.
5. Tanpa basa-basi dan tanpa kata promosi. Hindari kata seperti menakjubkan, memukau, menawan, kaya akan, sarat makna, dan mahakarya. Jangan buka dengan pujian, dan jangan tutup dengan kalimat yang mengulang isi sebelumnya.
6. Keluarkan JSON yang valid saja. Tanpa pagar kode Markdown dan tanpa teks di depan atau belakangnya.`;

  const sizeMb = item.fileSize ? (item.fileSize / 1048576).toFixed(1) + ' MB' : '';
  const dims = item.width && item.height ? item.width + ' x ' + item.height + ' px' : '';
  const geo = item.latitude != null && item.longitude != null ? item.latitude.toFixed(5) + ', ' + item.longitude.toFixed(5) : '';

  const prompt = isEn
    ? `Explain this Wikimedia Commons file and return JSON that follows the schema below.

FILE METADATA
- Title: ${item.cleanTitle} (${item.title})
- Description on Commons: ${item.description || 'None'}
- Creator: ${item.author || item.credit || 'Not recorded'}
- Date: ${item.date || 'Not recorded'}
- Media type: ${item.mediaType} (${item.mimeType})
- Size: ${[dims, sizeMb].filter(Boolean).join(', ') || 'Not recorded'}
- Coordinates: ${geo || 'Not recorded'}
- License: ${item.licenseShort} (${item.licenseFull})
- License page: ${item.licenseUrl || 'Not recorded'}
- Credit required: ${item.attributionRequired ? 'Yes' : 'No or not stated'}
- Commons categories: ${item.categories.slice(0, 8).join(', ') || 'None'}
- Source: ${item.pageUrl}
- ${usageContext}

JSON SCHEMA
{
  "objectDescription": {
    "laymanSummary": "Three or four plain sentences. Say what this is, who made or published it, when and where (only if recorded), and why it exists or why someone might care. Start with the subject itself.",
    "keyHighlights": [
      "4 to 6 short facts. Start each with a label, for example: Creator: ..., Date: ..., Place: ..., Format: ..., Event: ..., Subject: ... Leave out any label you have no data for."
    ],
    "usageIdeas": [
      "2 to 4 concrete ways someone could use this file, one short sentence each, for example: a slide for a class on local history. Keep them realistic for this license."
    ]
  },
  "licenseExplanation": {
    "licenseName": "${item.licenseShort}",
    "shortSummary": "Two or three plain sentences: what this license is and what it lets you do, in everyday words",
    "commercialUse": "Yes or no, then one sentence on any condition",
    "modificationRules": "Whether the file can be cropped, edited, or remixed, then one sentence on any condition",
    "watchOut": "One or two sentences on what to check besides the license, for example people shown in the file, logos, artworks or buildings visible in it, or details the metadata does not give. Name the specific thing for this file when you can.",
    "attributionGuide": "A ready-to-paste credit line using the real values above, in TASL order: Title, Author, Source (the file page URL), License (name and link)"
  }
}`
    : `Jelaskan berkas Wikimedia Commons ini dan kembalikan JSON sesuai skema di bawah.

METADATA BERKAS
- Judul: ${item.cleanTitle} (${item.title})
- Deskripsi di Commons: ${item.description || 'Tidak ada'}
- Pembuat: ${item.author || item.credit || 'Tidak tercatat'}
- Tanggal: ${item.date || 'Tidak tercatat'}
- Tipe media: ${item.mediaType} (${item.mimeType})
- Ukuran: ${[dims, sizeMb].filter(Boolean).join(', ') || 'Tidak tercatat'}
- Koordinat: ${geo || 'Tidak tercatat'}
- Lisensi: ${item.licenseShort} (${item.licenseFull})
- Halaman lisensi: ${item.licenseUrl || 'Tidak tercatat'}
- Wajib kredit: ${item.attributionRequired ? 'Ya' : 'Tidak atau tidak disebutkan'}
- Kategori Commons: ${item.categories.slice(0, 8).join(', ') || 'Tidak ada'}
- Sumber: ${item.pageUrl}
- ${usageContext}

SKEMA JSON
{
  "objectDescription": {
    "laymanSummary": "Tiga atau empat kalimat sederhana. Sebutkan ini apa, siapa yang membuat atau menerbitkannya, kapan dan di mana (hanya kalau tercatat), dan kenapa berkas ini ada atau kenapa orang mungkin tertarik. Mulai dari bendanya langsung.",
    "keyHighlights": [
      "4 sampai 6 fakta pendek. Awali tiap fakta dengan label, misalnya: Pembuat: ..., Tanggal: ..., Tempat: ..., Format: ..., Acara: ..., Isi: ... Lewati label yang datanya tidak ada."
    ],
    "usageIdeas": [
      "2 sampai 4 contoh pemakaian yang nyata, satu kalimat pendek tiap contoh, misalnya: slide untuk kelas sejarah lokal. Sesuaikan dengan lisensi berkas ini."
    ]
  },
  "licenseExplanation": {
    "licenseName": "${item.licenseShort}",
    "shortSummary": "Dua atau tiga kalimat sederhana: lisensi ini apa dan apa yang boleh Anda lakukan, dengan kata sehari-hari",
    "commercialUse": "Boleh atau tidak, lalu satu kalimat soal syaratnya",
    "modificationRules": "Boleh atau tidak dipotong, diedit, atau diolah ulang, lalu satu kalimat soal syaratnya",
    "watchOut": "Satu atau dua kalimat tentang hal yang perlu dicek selain lisensi, misalnya orang yang tampak di berkas, logo, karya seni atau bangunan yang terlihat, atau hal yang tidak dijelaskan metadata. Sebut hal spesifik untuk berkas ini kalau bisa.",
    "attributionGuide": "Teks kredit siap salin memakai nilai asli di atas, urutan TASL: Judul, Pembuat, Sumber (URL halaman berkas), Lisensi (nama dan tautan)"
  }
}`;

  const raw = await callGemini(apiKey, prompt, systemInstruction);

  try {
    // Clean potential markdown blocks
    const match = raw.match(/\{[\s\S]*\}/);
    const jsonStr = match ? match[0] : raw;
    const parsed = JSON.parse(jsonStr) as UnifiedMediaAiAnalysis;

    // Validate required fields exist with fallbacks
    return {
      objectDescription: {
        usageIdeas: Array.isArray(parsed.objectDescription?.usageIdeas) ? (parsed.objectDescription!.usageIdeas as string[]) : [],
        laymanSummary: parsed.objectDescription?.laymanSummary || (isEn ? `${item.cleanTitle} is a media file from Wikimedia Commons.` : `${item.cleanTitle} adalah berkas media dari Wikimedia Commons.`),
        detailedVisuals: parsed.objectDescription?.detailedVisuals || item.description || (isEn ? 'No further visual details are available.' : 'Belum ada keterangan visual tambahan.'),
        keyHighlights: Array.isArray(parsed.objectDescription?.keyHighlights) && parsed.objectDescription.keyHighlights.length > 0
          ? parsed.objectDescription.keyHighlights
          : [item.cleanTitle, item.licenseShort, item.author],
      },
      licenseExplanation: {
        watchOut: parsed.licenseExplanation?.watchOut || '',
        licenseName: parsed.licenseExplanation?.licenseName || item.licenseShort,
        shortSummary: parsed.licenseExplanation?.shortSummary || item.licenseFull,
        commercialUse: parsed.licenseExplanation?.commercialUse || (isEn ? 'Check the license terms before using it commercially.' : 'Cek ketentuan lisensinya dulu sebelum dipakai untuk keperluan komersial.'),
        modificationRules: parsed.licenseExplanation?.modificationRules || (isEn ? 'Check the license terms before editing or remixing it.' : 'Cek ketentuan lisensinya dulu sebelum mengedit atau mengolah ulang.'),
        attributionGuide: parsed.licenseExplanation?.attributionGuide || (isEn ? `Credit: ${item.cleanTitle} by ${item.author} (${item.licenseShort}).` : `Kredit: ${item.cleanTitle} oleh ${item.author} (${item.licenseShort}).`),
      },
      accessibilityWcag: {
        shortAltText: parsed.accessibilityWcag?.shortAltText || item.cleanTitle,
        extendedDescription: parsed.accessibilityWcag?.extendedDescription || item.description || item.cleanTitle,
      },
      wikiUsage: {
        summary: parsed.wikiUsage?.summary || (isEn ? 'No details on how this file is used were returned.' : 'Belum ada keterangan soal pemakaian berkas ini.'),
        projectRoles: Array.isArray(parsed.wikiUsage?.projectRoles) && parsed.wikiUsage.projectRoles.length > 0
          ? parsed.wikiUsage.projectRoles
          : [
              {
                wikiName: isEn ? 'Wikimedia Commons' : 'Wikimedia Commons',
                article: item.cleanTitle,
                role: isEn ? 'Open media file' : 'Berkas media terbuka',
              },
            ],
      },
      modelMeta: {
        assistantName: GEMINI_ASSISTANT_NAME,
        ...getGeminiModelMeta(),
        disclaimer: disclaimerText,
        language: lang,
      },
    };
  } catch (err) {
    console.error('Failed to parse Gemini JSON output:', err, raw);
    // Return a structured fallback based on the raw text
    return {
      objectDescription: {
        laymanSummary: raw.slice(0, 300) + '...',
        detailedVisuals: raw,
        keyHighlights: [item.cleanTitle, item.author, item.licenseShort],
      },
      licenseExplanation: {
        licenseName: item.licenseShort,
        shortSummary: item.licenseFull,
        commercialUse: isEn ? 'See the license page on Commons for the exact terms.' : 'Lihat halaman lisensi di Commons untuk ketentuan lengkapnya.',
        modificationRules: isEn ? 'See the license page on Commons for what you may change.' : 'Lihat halaman lisensi di Commons untuk batas pengeditan.',
        attributionGuide: (isEn ? `Credit: ${item.cleanTitle} by ${item.author} (${item.licenseShort}).` : `Kredit: ${item.cleanTitle} oleh ${item.author} (${item.licenseShort}).`),
      },
      accessibilityWcag: {
        shortAltText: item.cleanTitle,
        extendedDescription: item.description || item.cleanTitle,
      },
      wikiUsage: {
        summary: isEn ? 'This file is stored on Wikimedia Commons.' : 'Berkas ini tersimpan di Wikimedia Commons.',
        projectRoles: [
          {
            wikiName: 'Wikimedia Commons',
            article: item.title,
            role: isEn ? 'Open media repository' : 'Arsip media terbuka',
          },
        ],
      },
      modelMeta: {
        assistantName: GEMINI_ASSISTANT_NAME,
        ...getGeminiModelMeta(),
        disclaimer: disclaimerText,
        language: lang,
      },
    };
  }
}

/**
 * Compliance & Reuse Assistant:
 * Analyzes the media file license according to Wikimedia & Creative Commons legal rules.
 */
export async function analyzeLicenseCompliance(
  apiKey: string,
  item: CommonsMediaItem
): Promise<string> {
  const systemInstruction = `Anda adalah Asisten Hukum Terbuka & Atribusi Wikimedia Commons. 
Tugas Anda adalah memandu pengguna agar mematuhi 100% ketentuan lisensi terbuka (Creative Commons, Public Domain, GFDL) sesuai kebijakan Wikimedia Foundation.`;

  const prompt = `Analisis kepatuhan lisensi untuk berkas Wikimedia Commons berikut:
- Judul Berkas: ${item.cleanTitle} (${item.title})
- Pembuat / Seniman: ${item.author || item.credit || 'Tidak disebutkan'}
- Lisensi Resmi: ${item.licenseShort} (${item.licenseFull})
- URL Lisensi: ${item.licenseUrl || 'N/A'}
- Kategori Lisensi: ${item.licenseCategory}
- Atribusi Wajib: ${item.attributionRequired ? 'YA' : 'TIDAK'}
- Tautan Asli: ${item.pageUrl}

Berikan panduan langkah demi langkah yang jelas dan praktis bagi pengguna yang ingin menggunakan berkas ini tanpa melanggar ketentuan hukum atau etika Wikimedia.`;

  return callGemini(apiKey, prompt, systemInstruction);
}

/**
 * Historical & Educational Context Analysis:
 * Enriches the metadata with historical provenance, artistic style, or scientific context.
 */
export async function analyzeMediaContext(
  apiKey: string,
  item: CommonsMediaItem
): Promise<string> {
  const systemInstruction = `Anda adalah kurator dan pendidik Wikimedia Commons. 
Tugas Anda adalah menjelaskan nilai sejarah, ilmiah, artistik, atau kultural dari berkas media terbuka ini kepada pelajar dan peneliti umum.`;

  const prompt = `Berikan ringkasan kuratorial dan konteks mendalam untuk berkas Wikimedia Commons ini:
- Judul: ${item.cleanTitle}
- Deskripsi Asli: ${item.description || 'Tidak ada deskripsi'}
- Pembuat / Fotografer: ${item.author}
- Tanggal / Era: ${item.date || 'Tidak diketahui'}
- Format Berkas: ${item.mimeType} (${item.mediaType})
- Kategori Commons: ${item.categories.join(', ')}

Sajikan ringkasan latar belakang, komposisi visual, dan relevansi pengetahuan terbuka.`;

  return callGemini(apiKey, prompt, systemInstruction);
}

/**
 * Accessibility & Descriptive Alt-Text Generator:
 * Generates WCAG-compliant descriptive alt-text and structured audio/visual description.
 */
export async function generateAltTextAndAccessibility(
  apiKey: string,
  item: CommonsMediaItem
): Promise<string> {
  const systemInstruction = `Anda adalah pakar Aksesibilitas Web (WCAG 2.2). 
Tugas Anda adalah merumuskan alt-text ringkas (untuk pembaca layar / screen reader) serta deskripsi visual/audio rinci untuk berkas Wikimedia ini agar ramah bagi penyandang disabilitas penglihatan atau pendengaran.`;

  const prompt = `Buat panduan aksesibilitas untuk berkas media berikut:
- Judul: ${item.cleanTitle}
- Tipe Media: ${item.mediaType}
- Deskripsi: ${item.description}
- Kategori: ${item.categories.join(', ')}`;

  return callGemini(apiKey, prompt, systemInstruction);
}

/**
 * Smart Search Expander:
 * Expands a natural language concept into optimal Wikimedia Commons search syntax and categories.
 */
export async function suggestCommonsSearchKeywords(
  apiKey: string,
  userIdea: string
): Promise<{ query: string; suggestedCategories: string[]; explanation: string }> {
  const systemInstruction = `Kamu membantu orang mencari berkas di Wikimedia Commons. Ubah ide pencarian mereka menjadi kata kunci yang paling mungkin menemukan hasil di Commons, plus kategori yang cocok. Balas dengan JSON valid saja.`;

  const prompt = `Ide pencarian pengguna: "${userIdea}"

Balas dengan JSON ini:
{
  "query": "kata kunci terbaik untuk Commons, biasanya bahasa Inggris atau nama ilmiah",
  "suggestedCategories": ["Category:Contoh1", "Category:Contoh2"],
  "explanation": "satu atau dua kalimat sederhana, dalam bahasa yang sama dengan ide pengguna, tentang kenapa kata kunci ini lebih efektif"
}`;

  try {
    const raw = await callGemini(apiKey, prompt, systemInstruction);
    const cleanJson = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch {
    return {
      query: userIdea,
      suggestedCategories: [],
      explanation: 'Pencarian langsung sesuai kata kunci Anda.',
    };
  }
}

export interface NearbyAreaAiAnalysis {
  coordinates: {
    lat: number;
    lng: number;
  };
  address: string;
  photosCount: number;
  areaOverview: string;
  identifiedLandmarks: string[];
  photosSummary: string;
  curatorInsight: string;
  modelMeta: {
    assistantName: string;
    modelName: string;
    modelVersion: string;
    disclaimer: string;
    language: 'en' | 'id';
    source?: 'gemini' | 'local';
  };
}

/**
 * Nearby Area Analysis Assistant:
 * Synthesizes location coordinates, reverse-geocoded address, and geocoded photos list
 * into a rich, strictly factual curatorial summary.
 */
export async function generateNearbyAreaAnalysis(
  apiKey: string,
  lat: number,
  lng: number,
  address: string,
  photos: CommonsMediaItem[],
  lang: 'en' | 'id' = 'id',
force = false
): Promise<NearbyAreaAiAnalysis> {
  const isEn = lang === 'en';
  const disclaimerText = isEn ? AI_DISCLAIMER_TEXT_EN : AI_DISCLAIMER_TEXT_ID;
  const photoListText = photos
    .slice(0, 15)
    .map((p, i) => `${i + 1}. ${p.cleanTitle} (${p.licenseShort}, ${isEn ? 'by' : 'oleh'} ${p.author || 'Commons'})`)
    .join('\n');

  const systemInstruction = isEn
    ? `You describe places using Wikimedia Commons photos and an address. Write like a local guide who sticks to what is known: plain words, short sentences.

Rules:
1. Do not invent events, buildings, or people. Use only the address, the coordinates, and the photo list below.
2. If there is little to go on, say so plainly instead of filling the gap.
3. No hype. Avoid words like vibrant, rich, tapestry, testament, hidden gem and nestled.
4. Return valid JSON only, in the schema given.`
    : `Kamu menjelaskan sebuah tempat memakai foto Wikimedia Commons dan alamatnya. Tulis seperti pemandu lokal yang hanya bicara soal yang jelas: kata sehari-hari, kalimat pendek.

Aturan:
1. Jangan mengarang peristiwa, bangunan, atau tokoh. Pakai hanya alamat, koordinat, dan daftar foto di bawah.
2. Kalau bahan sedikit, katakan apa adanya. Jangan diisi-isi.
3. Tanpa kata promosi. Hindari kata seperti menakjubkan, memukau, kaya akan, sarat makna, dan permata tersembunyi.
4. Keluarkan JSON valid saja, sesuai skema.`;

  const prompt = isEn
    ? `Describe this area from its coordinates, address, and nearby Wikimedia Commons photos.
Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}
Address: ${address || 'Not available yet'}
Photos nearby: ${photos.length}
Sample files:
${photoListText || 'No sample files'}

Return JSON in this schema:
{
  "areaOverview": "Two or three plain sentences about this place and what it is known for, based only on the address and coordinates",
  "identifiedLandmarks": ["Place or topic 1", "Place or topic 2", "Place or topic 3"],
  "photosSummary": "What the nearby photos show, in a few plain sentences",
  "curatorInsight": "One or two sentences on what these photos add to Wikimedia for this area, or what seems to be missing"
}`
    : `Jelaskan area ini dari koordinat, alamat, dan foto Wikimedia Commons di sekitarnya.
Koordinat: Lintang ${lat.toFixed(5)}, Bujur ${lng.toFixed(5)}
Alamat: ${address || 'Belum tersedia'}
Jumlah foto di sekitar: ${photos.length}
Contoh berkas:
${photoListText || 'Tidak ada contoh berkas'}

Kembalikan JSON dengan skema ini:
{
  "areaOverview": "Dua atau tiga kalimat sederhana tentang tempat ini dan apa yang membuatnya dikenal, hanya berdasarkan alamat dan koordinat",
  "identifiedLandmarks": ["Tempat atau topik 1", "Tempat atau topik 2", "Tempat atau topik 3"],
  "photosSummary": "Apa yang tampak di foto-foto sekitar, dalam beberapa kalimat sederhana",
  "curatorInsight": "Satu atau dua kalimat tentang apa yang foto-foto ini tambahkan ke Wikimedia untuk area ini, atau apa yang masih kurang"
}`;

  // If no API key provided, produce a rich, strictly factual metadata synthesis immediately
  if (!apiKey || apiKey.trim().length === 0) {
    const landmarks = Array.from(
      new Set(
        photos
          .map((p) => p.cleanTitle.replace(/\.(jpg|jpeg|png|tif|tiff|webp|svg|gif)$/i, '').trim())
          .filter((t) => t.length > 2 && t.length < 50)
      )
    ).slice(0, 5);

    const addressParts = address.split(',').map((s) => s.trim()).filter(Boolean);
    const primaryLoc = addressParts.slice(0, 2).join(', ') || `Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}`;

    return {
      coordinates: { lat, lng },
      address: address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      photosCount: photos.length,
      areaOverview: isEn
        ? `This area is in ${primaryLoc}. Wikimedia contributors have uploaded geotagged photos from here.`
        : `Area ini ada di ${primaryLoc}. Kontributor Wikimedia sudah mengunggah foto bergeotag dari sini.`,
      identifiedLandmarks:
        landmarks.length > 0
          ? landmarks
          : [addressParts[0] || (isEn ? 'Geotagged area' : 'Area bergeotag')],
      photosSummary: isEn
        ? `${photos.length} files found near this point.`
        : `Ada ${photos.length} berkas di dekat titik ini.`,
      curatorInsight: apiKey && apiKey.trim().length > 0
        ? (isEn
            ? 'Gemini is on, but its quota was just reached, so this is a local summary built from file titles. Press "Gemini Assistant" to try again in a moment.'
            : 'Gemini aktif, tetapi kuotanya baru saja tercapai, jadi ini ringkasan lokal dari judul berkas. Tekan "Gemini Assistant" untuk mencoba lagi sebentar lagi.')
        : (isEn
            ? 'Local summary built from file titles only, not written by Gemini.'
            : 'Ringkasan lokal yang dibuat dari judul berkas saja, bukan tulisan Gemini.'),
      modelMeta: {
        assistantName: 'WikiGaleri',
        modelName: isEn ? 'Local summary' : 'Ringkasan lokal',
        modelVersion: 'local',
        disclaimer: isEn ? AI_LOCAL_DISCLAIMER_TEXT_EN : AI_LOCAL_DISCLAIMER_TEXT_ID,
        language: lang,
        source: 'local',
      },
    };
  }

  if (force) geminiQuotaBlockedUntil = 0;
  if (Date.now() < geminiQuotaBlockedUntil) {
    throw new Error(quotaErrorMessage());
  }

  try {
    const raw = await callGemini(apiKey, prompt, systemInstruction);
    const match = raw.match(/\{[\s\S]*\}/);
    const jsonStr = match ? match[0] : raw;
    const parsed = JSON.parse(jsonStr) as Partial<NearbyAreaAiAnalysis>;
    return {
      coordinates: { lat, lng },
      address: address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      photosCount: photos.length,
      areaOverview: parsed.areaOverview || address || (isEn ? `Area around coordinates ${lat.toFixed(4)}, ${lng.toFixed(4)}` : `Area di sekitar koordinat ${lat.toFixed(4)}, ${lng.toFixed(4)}`),
      identifiedLandmarks: Array.isArray(parsed.identifiedLandmarks) && parsed.identifiedLandmarks.length > 0
        ? parsed.identifiedLandmarks
        : [address.split(',')[0] || (isEn ? 'Mapped area' : 'Area terpetakan')],
      photosSummary: parsed.photosSummary || (isEn ? `${photos.length} openly licensed photos found nearby.` : `Ada ${photos.length} foto berlisensi terbuka di sekitar sini.`),
      curatorInsight: parsed.curatorInsight || (isEn ? 'No extra note was returned for this area.' : 'Belum ada catatan tambahan untuk area ini.'),
      modelMeta: {
        assistantName: GEMINI_ASSISTANT_NAME,
        ...getGeminiModelMeta(),
        disclaimer: disclaimerText,
        language: lang,
        source: 'gemini',
      },
    };
  } catch (err) {
    console.error('Nearby Area AI analysis failed:', err);
    if (err instanceof SyntaxError) {
      throw new Error(isEn ? 'Gemini returned an answer that could not be read. Please try again.' : 'Jawaban Gemini tidak bisa dibaca. Silakan coba lagi.');
    }
    throw err;
  }
}

