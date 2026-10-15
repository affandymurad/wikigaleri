import { Firestore, Timestamp } from '@google-cloud/firestore';

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const USAGE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface CacheEntry {
  json: string;
  model: string;
}

/** Gemini result cache plus the daily call counter. Only the server touches it. */
export interface Store {
  getCached(id: string): Promise<CacheEntry | null>;
  setCached(id: string, entry: CacheEntry): Promise<void>;
  /** Takes one slot from today's budget. False when the daily limit is already used up. */
  reserveCall(dailyLimit: number): Promise<boolean>;
}

function dayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

class FirestoreStore implements Store {
  private db = new Firestore();

  async getCached(id: string): Promise<CacheEntry | null> {
    try {
      const snap = await this.db.collection('aiCache').doc(id).get();
      if (!snap.exists) return null;
      const expireAt = snap.get('expireAt') as Timestamp | undefined;
      if (expireAt && expireAt.toMillis() < Date.now()) return null;
      const json = snap.get('json');
      const model = snap.get('model');
      return typeof json === 'string' && typeof model === 'string' ? { json, model } : null;
    } catch (err) {
      console.error('cache read failed:', (err as Error).message);
      return null;
    }
  }

  async setCached(id: string, entry: CacheEntry): Promise<void> {
    try {
      await this.db.collection('aiCache').doc(id).set({
        ...entry,
        createdAt: Timestamp.now(),
        // Firestore TTL policy on this field removes old documents for free
        expireAt: Timestamp.fromMillis(Date.now() + CACHE_TTL_MS),
      });
    } catch (err) {
      console.error('cache write failed:', (err as Error).message);
    }
  }

  async reserveCall(dailyLimit: number): Promise<boolean> {
    const ref = this.db.collection('usage').doc(dayKey());
    try {
      return await this.db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const calls = snap.exists ? Number(snap.get('calls')) || 0 : 0;
        if (calls >= dailyLimit) return false;
        tx.set(ref, { calls: calls + 1, expireAt: Timestamp.fromMillis(Date.now() + USAGE_TTL_MS) }, { merge: true });
        return true;
      });
    } catch (err) {
      // Fail closed: if the counter is unreachable, do not spend Gemini quota
      console.error('usage counter failed:', (err as Error).message);
      return false;
    }
  }
}

/** Local development without Google Cloud credentials. Not shared between instances. */
class MemoryStore implements Store {
  private cache = new Map<string, CacheEntry>();
  private calls = new Map<string, number>();

  async getCached(id: string): Promise<CacheEntry | null> {
    return this.cache.get(id) ?? null;
  }

  async setCached(id: string, entry: CacheEntry): Promise<void> {
    this.cache.set(id, entry);
  }

  async reserveCall(dailyLimit: number): Promise<boolean> {
    const key = dayKey();
    const calls = this.calls.get(key) ?? 0;
    if (calls >= dailyLimit) return false;
    this.calls.set(key, calls + 1);
    return true;
  }
}

export function createStore(): Store {
  const backend = process.env.CACHE_BACKEND || (process.env.K_SERVICE ? 'firestore' : 'memory');
  return backend === 'firestore' ? new FirestoreStore() : new MemoryStore();
}
