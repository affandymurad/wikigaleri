import type { Prompt } from './prompts.js';

// Flash-Lite only (cheap): 3.1 is primary, 3.5 is the fallback when the primary is missing, busy or out of quota
export const GEMINI_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'];
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const ATTEMPT_TIMEOUT_MS = 18000;
const MAX_OUTPUT_TOKENS = 2048;

export type GeminiFailure = 'quota' | 'unavailable' | 'bad_output';

export class GeminiError extends Error {
  constructor(public readonly kind: GeminiFailure, message: string, public readonly status?: number) {
    super(message);
  }
}

export interface GeminiResult {
  /** Valid JSON text (object) produced by the model */
  json: string;
  model: string;
}

/**
 * Calls Gemini once per model until one answers. The key travels in a header, never in the URL,
 * and nothing about the request or response is logged.
 */
export async function generateJson(apiKey: string, prompt: Prompt): Promise<GeminiResult> {
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: prompt.system }] },
    contents: [{ parts: [{ text: prompt.user }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      responseMimeType: 'application/json',
    },
  });

  let sawQuota = false;
  let sawBadOutput = false;

  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body,
        signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
      });

      if (!res.ok) {
        // 429 quota, 503 busy, 404 model missing: try the next model. Anything else will not get better.
        if (res.status === 429) sawQuota = true;
        if ([429, 503, 404, 500].includes(res.status)) continue;
        throw new GeminiError('unavailable', `Gemini returned HTTP ${res.status}`, res.status);
      }

      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const json = text ? extractJsonObject(text) : null;
      if (!json) {
        sawBadOutput = true;
        continue;
      }
      return { json, model };
    } catch (err) {
      if (err instanceof GeminiError) throw err;
      // Timeout or network error: try the next model
    }
  }

  if (sawQuota) throw new GeminiError('quota', 'Gemini quota reached');
  if (sawBadOutput) throw new GeminiError('bad_output', 'Gemini returned unreadable output');
  throw new GeminiError('unavailable', 'Gemini is unavailable');
}

/** Pulls the first JSON object out of the model's text, or null when there is none */
export function extractJsonObject(raw: string): string | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? match[0] : null;
  } catch {
    return null;
  }
}
