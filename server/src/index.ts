import { createHash } from 'node:crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import { GeminiError, generateJson } from './gemini.js';
import { RateLimiter } from './limits.js';
import {
  buildAnalyzePrompt,
  buildAreaPrompt,
  type AreaPhoto,
  type Lang,
  type Prompt,
  type PromptItem,
  type WikiUsage,
} from './prompts.js';
import { createStore } from './store.js';

const PORT = Number(process.env.PORT) || 8080;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
// Hard ceiling on real Gemini calls per UTC day. Cache hits do not count.
const DAILY_LIMIT = Number(process.env.DAILY_GEMINI_LIMIT) || 300;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
// Bump when a prompt changes so old cached answers are not reused
const PROMPT_VERSION = 'v1';

const store = createStore();
const perIpLimiter = new RateLimiter(10, 60_000);
const globalLimiter = new RateLimiter(60, 60_000);

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(express.json({ limit: '32kb' }));

type ErrorCode = 'bad_request' | 'forbidden' | 'rate_limited' | 'daily_limit' | 'quota' | 'upstream' | 'not_configured';

function fail(res: Response, status: number, error: ErrorCode): void {
  res.status(status).json({ error });
}

function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
  return first || req.ip || 'unknown';
}

// Browsers always send Origin on POST. Requiring a known one keeps other sites from using this API.
function checkOrigin(req: Request, res: Response, next: NextFunction): void {
  if (ALLOWED_ORIGINS.length === 0) return next();
  const origin = req.headers.origin;
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) return fail(res, 403, 'forbidden');
  next();
}

function checkRate(req: Request, res: Response, next: NextFunction): void {
  if (!globalLimiter.allow('all') || !perIpLimiter.allow(clientIp(req))) {
    res.setHeader('Retry-After', '60');
    return fail(res, 429, 'rate_limited');
  }
  next();
}

function str(v: unknown, max: number): string {
  return typeof v === 'string' ? v.slice(0, max) : '';
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function coord(v: unknown, limit: number): number | null {
  return typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= limit ? v : null;
}

function lang(v: unknown): Lang {
  return v === 'en' ? 'en' : 'id';
}

function strList(v: unknown, maxItems: number, maxLen: number): string[] {
  return Array.isArray(v) ? v.slice(0, maxItems).map((s) => str(s, maxLen)).filter(Boolean) : [];
}

function parseItem(raw: unknown): (PromptItem & { id: string }) | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === 'number' || typeof r.id === 'string' ? String(r.id).slice(0, 40) : '';
  const title = str(r.title, 300);
  if (!id || !title) return null;
  return {
    id,
    title,
    cleanTitle: str(r.cleanTitle, 300) || title,
    description: str(r.description, 2000),
    author: str(r.author, 300),
    credit: str(r.credit, 300),
    date: str(r.date, 100),
    mediaType: str(r.mediaType, 30),
    mimeType: str(r.mimeType, 80),
    fileSize: num(r.fileSize),
    width: num(r.width),
    height: num(r.height),
    latitude: coord(r.latitude, 90),
    longitude: coord(r.longitude, 180),
    licenseShort: str(r.licenseShort, 100),
    licenseFull: str(r.licenseFull, 300),
    licenseUrl: str(r.licenseUrl, 500),
    attributionRequired: r.attributionRequired === true,
    categories: strList(r.categories, 8, 150),
    pageUrl: str(r.pageUrl, 500),
  };
}

function parseUsages(raw: unknown): WikiUsage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 10)
    .map((u) => {
      const r = (u && typeof u === 'object' ? u : {}) as Record<string, unknown>;
      return { title: str(r.title, 200), wiki: str(r.wiki, 80) };
    })
    .filter((u) => u.title);
}

function parsePhotos(raw: unknown): AreaPhoto[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 15).map((p) => {
    const r = (p && typeof p === 'object' ? p : {}) as Record<string, unknown>;
    return { cleanTitle: str(r.cleanTitle, 200), licenseShort: str(r.licenseShort, 100), author: str(r.author, 200) };
  });
}

function cacheId(...parts: Array<string | number>): string {
  return createHash('sha256').update([PROMPT_VERSION, ...parts].join('|')).digest('hex');
}

/** Cache first, then the daily budget, then Gemini. Successful answers are cached. */
async function answer(res: Response, id: string, prompt: Prompt): Promise<void> {
  const hit = await store.getCached(id);
  if (hit) {
    res.json({ text: hit.json, model: hit.model, cached: true });
    return;
  }

  if (!GEMINI_API_KEY) return fail(res, 503, 'not_configured');
  if (!(await store.reserveCall(DAILY_LIMIT))) return fail(res, 429, 'daily_limit');

  try {
    const result = await generateJson(GEMINI_API_KEY, prompt);
    await store.setCached(id, { json: result.json, model: result.model });
    res.json({ text: result.json, model: result.model, cached: false });
  } catch (err) {
    if (err instanceof GeminiError && err.kind === 'quota') return fail(res, 429, 'quota');
    fail(res, 502, 'upstream');
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/analyze', checkOrigin, checkRate, async (req, res) => {
  const item = parseItem(req.body?.item);
  if (!item) return fail(res, 400, 'bad_request');
  const l = lang(req.body?.lang);
  const prompt = buildAnalyzePrompt(item, parseUsages(req.body?.usages), l);
  await answer(res, cacheId('analyze', item.id, l), prompt);
});

app.post('/api/area', checkOrigin, checkRate, async (req, res) => {
  const lat = coord(req.body?.lat, 90);
  const lng = coord(req.body?.lng, 180);
  if (lat === null || lng === null) return fail(res, 400, 'bad_request');
  const l = lang(req.body?.lang);
  const address = str(req.body?.address, 300);
  const photos = parsePhotos(req.body?.photos);
  const total = Math.min(Math.max(Math.trunc(num(req.body?.photosTotal)), photos.length), 1000);
  const prompt = buildAreaPrompt(lat, lng, address, photos, total, l);
  // About 100 m grid: nearby taps on the map share one cached answer
  await answer(res, cacheId('area', lat.toFixed(3), lng.toFixed(3), l), prompt);
});

app.use('/api', (_req, res) => fail(res, 400, 'bad_request'));

// Malformed JSON and oversized bodies land here
app.use((_err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  fail(res, 400, 'bad_request');
});

app.listen(PORT, () => {
  console.log(`wikigaleri-api listening on ${PORT}`);
});
