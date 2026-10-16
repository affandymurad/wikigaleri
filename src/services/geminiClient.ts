import { CommonsMediaItem } from '../types/wikimedia';
import { getLicenseInfo } from '../utils/licenseUtils';
import { GEMINI_MODELS, GeminiError, extractJsonObject, generateJson } from './geminiCore';
import { buildAnalyzePrompt, buildAreaPrompt, type Prompt } from './prompts';
import { FIREBASE_AI_READY } from './firebaseConfig';

// Two ways to reach Gemini, picked at build time with VITE_AI_MODE:
// - "firebase": Firebase AI Logic. Firebase holds the Gemini credentials, so nobody enters a key and no
//   key is in the browser. This is the default once the Firebase web config is filled in.
// - "direct": the browser calls Gemini with a key the user enters and keeps in their own browser.
//   Default until Firebase is configured.
type AiMode = 'firebase' | 'direct';
const requestedMode = import.meta.env.VITE_AI_MODE as string | undefined;
export const AI_MODE: AiMode =
  requestedMode === 'direct' || requestedMode === 'firebase'
    ? requestedMode
    : FIREBASE_AI_READY
    ? 'firebase'
    : 'direct';
export const AI_NEEDS_KEY = AI_MODE === 'direct';
const MODELS_LIST_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

export interface GeminiAnalysisResult {
  text: string;
  source: 'gemini';
  timestamp: number;
}

// Setelah API membalas 429 (terlalu cepat, kuota Gemini, atau batas harian), analisis otomatis berhenti memanggil API untuk sementara
let geminiBlockedUntil = 0;
let geminiBlockMessage = '';

const BLOCK_MS: Record<string, number> = {
  quota: 90 * 1000,
};

function uiIsEnglish(): boolean {
  return typeof document !== 'undefined' && document.documentElement.lang === 'en';
}

function apiErrorMessage(code?: string): string {
  const en = uiIsEnglish();
  switch (code) {
    case 'quota':
      return en
        ? 'The Gemini quota is used up for now (429). Try again in a few minutes.'
        : 'Kuota Gemini sedang habis (429). Coba lagi beberapa menit lagi.';
    case 'invalid_key':
      return en
        ? 'Google rejected the Gemini key. Open the key settings in the top bar and check it.'
        : 'Google menolak kunci Gemini. Buka pengaturan kunci di bilah atas lalu periksa kuncinya.';
    default:
      return en
        ? 'Could not get an answer from Gemini right now. Please try again.'
        : 'Belum bisa mendapat jawaban dari Gemini saat ini. Silakan coba lagi.';
  }
}

/** Direct mode: asks Gemini from the browser with the user's own key and returns the JSON text */
async function callDirect(apiKey: string, prompt: Prompt): Promise<string> {
  try {
    const result = await generateJson(apiKey.trim(), prompt);
    lastGeminiModel = result.model;
    return result.json;
  } catch (err) {
    const rejected = err instanceof GeminiError && [400, 401, 403].includes(err.status ?? 0);
    const code = err instanceof GeminiError && err.kind === 'quota' ? 'quota' : rejected ? 'invalid_key' : undefined;
    const message = apiErrorMessage(code);
    if (code === 'quota') {
      geminiBlockedUntil = Date.now() + BLOCK_MS.quota;
      geminiBlockMessage = message;
    }
    throw new Error(message);
  }
}

/** Firebase mode: asks Gemini through Firebase AI Logic, trying each model of the chain once */
async function callFirebase(prompt: Prompt): Promise<string> {
  const { getFirebaseModel } = await import('./firebase');
  let sawQuota = false;

  for (const name of GEMINI_MODELS) {
    try {
      const model = getFirebaseModel(name, prompt.system);
      if (!model) break;
      const result = await Promise.race([
        model.generateContent(prompt.user),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 25000)),
      ]);
      const json = extractJsonObject(result.response.text());
      if (json) {
        lastGeminiModel = name;
        return json;
      }
    } catch (err) {
      console.error(`Firebase AI Logic (${name}):`, err);
      const status = (err as { customErrorData?: { status?: number } }).customErrorData?.status;
      if (status === 429) sawQuota = true;
    }
  }

  const message = apiErrorMessage(sawQuota ? 'quota' : undefined);
  if (sawQuota) {
    geminiBlockedUntil = Date.now() + BLOCK_MS.quota;
    geminiBlockMessage = message;
  }
  throw new Error(message);
}

/** One entry point for both modes */
function callAi(apiKey: string, prompt: Prompt): Promise<string> {
  return AI_MODE === 'firebase' ? callFirebase(prompt) : callDirect(apiKey, prompt);
}

/** Direct mode: checks a key with the models list, which does not run a model or use generate quota */
export async function testGeminiApiKey(apiKey: string): Promise<{ valid: boolean; message?: string }> {
  const en = uiIsEnglish();
  const key = apiKey.trim();
  if (key.length < 10) {
    return { valid: false, message: en ? 'The key is empty or its format is not valid.' : 'Kunci API kosong atau format tidak valid.' };
  }

  try {
    const res = await fetch(`${MODELS_LIST_ENDPOINT}?pageSize=1`, {
      headers: { 'x-goog-api-key': key },
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) return { valid: true };
    if (res.status === 429) {
      return { valid: true, message: en ? 'Key accepted, but the Gemini quota is limited right now.' : 'Kunci diterima, tetapi kuota Gemini sedang terbatas.' };
    }
    if ([400, 401, 403].includes(res.status)) {
      const errData = await res.json().catch(() => ({}));
      return { valid: false, message: errData?.error?.message || `HTTP ${res.status}` };
    }
    return { valid: false, message: en ? 'Gemini could not check the key right now. Try again in a moment.' : 'Gemini belum bisa memeriksa kunci saat ini. Coba lagi sebentar lagi.' };
  } catch {
    return {
      valid: false,
      message: en
        ? 'Could not reach Gemini to check the key. Check your connection or turn off ad blockers.'
        : 'Tidak bisa terhubung ke Gemini untuk memeriksa kunci. Periksa koneksi atau matikan pemblokir iklan.',
    };
  }
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
  return Date.now() < geminiBlockedUntil ? geminiBlockMessage : null;
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
 * Answered in the active interface language, by the browser (direct mode) or the WikiGaleri API.
 */
export async function generateUnifiedMediaAnalysis(
  apiKey: string,
  item: CommonsMediaItem,
  liveWikiUsage?: Array<{ title: string; wiki: string }>,
  lang: 'en' | 'id' = 'id'
): Promise<UnifiedMediaAiAnalysis> {
  const isEn = lang === 'en';
  const disclaimerText = isEn ? AI_DISCLAIMER_TEXT_EN : AI_DISCLAIMER_TEXT_ID;

  const usages = (liveWikiUsage || []).slice(0, 10);
  const promptItem = {
    id: item.id,
    title: item.title,
    cleanTitle: item.cleanTitle,
    description: item.description,
    author: item.author,
    credit: item.credit,
    date: item.date,
    mediaType: item.mediaType,
    mimeType: item.mimeType,
    fileSize: item.fileSize,
    width: item.width,
    height: item.height,
    latitude: item.latitude ?? null,
    longitude: item.longitude ?? null,
    licenseShort: item.licenseShort,
    licenseFull: item.licenseFull,
    licenseUrl: item.licenseUrl,
    attributionRequired: item.attributionRequired,
    categories: item.categories,
    pageUrl: item.pageUrl,
  };

  const raw = await callAi(apiKey, buildAnalyzePrompt(promptItem, usages, lang));

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
 * into a strictly factual curatorial summary written by Gemini.
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

  if (force) geminiBlockedUntil = 0;
  if (Date.now() < geminiBlockedUntil) {
    throw new Error(geminiBlockMessage);
  }

  try {
    const samples = photos.slice(0, 15).map((p) => ({
      cleanTitle: p.cleanTitle,
      licenseShort: p.licenseShort,
      author: p.author,
    }));
    const raw = await callAi(apiKey, buildAreaPrompt(lat, lng, address, samples, photos.length, lang));
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

