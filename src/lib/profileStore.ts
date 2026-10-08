/**
 * 사람 카드 서버 저장소.
 *
 * 프롬프트 저장소(promptStore.ts)와 같은 꼴로 만든다. 보관 방식을 인터페이스 뒤로 숨겨
 * 나중에 Postgres 든 다른 KV 든 구현 하나만 더하면 바뀌게 한다.
 *
 * 카드에는 **타인의 생년월일**이 들어간다. 그래서 두 가지를 지킨다.
 *   - 목록을 줄 때 이름과 메모만 내보내고 생년월일은 서버 밖으로 내지 않는다
 *   - 30일 동안 쓰이지 않은 카드는 자동으로 지운다 (남의 정보를 이유 없이 쌓지 않는다)
 */

import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Redis } from '@upstash/redis';
import { computeSaju } from './saju';
import { buildCardFace, type CardFace } from './saju/cardFace';
import type { SajuInput } from './saju/types';

/** 마지막으로 쓰인 뒤 이만큼 지나면 사라진다. */
export const PROFILE_TTL_DAYS = 30;
const TTL_SECONDS = PROFILE_TTL_DAYS * 24 * 60 * 60;

/** 서버에만 있는 전체 카드 */
export interface StoredProfile {
  id: string;
  label: string;
  memo?: string;
  input: SajuInput;
  createdAt: number;
  updatedAt: number;
}

/**
 * 브라우저로 내보내도 되는 부분. 생년월일은 들어 있지 않다.
 * 앞면 요약(face)에는 띠·연주·일주·오행 비율만 있고 날짜·시각은 없다.
 */
export interface PublicProfile {
  id: string;
  label: string;
  memo?: string;
  createdAt: number;
  face?: CardFace;
}

/** 계산이 실패해도 목록은 내보낸다. 그 카드는 이름만 보인다. */
function faceOf(profile: StoredProfile): CardFace | undefined {
  try {
    return buildCardFace(computeSaju(profile.input), profile.memo);
  } catch {
    return undefined;
  }
}

export function toPublic(profile: StoredProfile): PublicProfile {
  return {
    id: profile.id,
    label: profile.label,
    memo: profile.memo,
    createdAt: profile.createdAt,
    face: faceOf(profile),
  };
}

export interface ProfileStore {
  readonly name: string;
  /** 서버 재시작·인스턴스 교체 후에도 남는가 */
  readonly durable: boolean;
  list(): Promise<StoredProfile[]>;
  get(id: string): Promise<StoredProfile | null>;
  put(profile: StoredProfile): Promise<void>;
  remove(id: string): Promise<void>;
  /** 인증 시도 횟수를 센다. 허용치를 넘으면 false. */
  allowAttempt(key: string, limit: number, windowSeconds: number): Promise<boolean>;
}

// ── Upstash Redis ─────────────────────────────────────────────────────────

const PROFILE_KEY = (id: string) => `imsaju:profile:${id}`;
const INDEX_KEY = 'imsaju:profiles';

/**
 * Vercel 마켓플레이스에서 Upstash 를 붙이면 환경변수가 자동으로 들어온다.
 * 이름이 두 가지로 올 수 있어 둘 다 받는다.
 */
function redisCredentials(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

class RedisProfileStore implements ProfileStore {
  readonly name = 'Upstash Redis';
  readonly durable = true;
  private readonly redis: Redis;

  constructor(credentials: { url: string; token: string }) {
    this.redis = new Redis(credentials);
  }

  async list(): Promise<StoredProfile[]> {
    const ids = await this.redis.smembers<string[]>(INDEX_KEY);
    if (!ids?.length) return [];

    const found = await Promise.all(ids.map((id) => this.get(id)));
    // TTL 로 사라진 카드는 색인에만 남는다. 읽을 때 정리한다.
    const stale = ids.filter((id, i) => found[i] === null);
    if (stale.length) await this.redis.srem(INDEX_KEY, ...stale);

    return found
      .filter((p): p is StoredProfile => p !== null)
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  async get(id: string): Promise<StoredProfile | null> {
    return (await this.redis.get<StoredProfile>(PROFILE_KEY(id))) ?? null;
  }

  async put(profile: StoredProfile): Promise<void> {
    // 쓸 때마다 TTL 이 갱신되므로 꾸준히 쓰는 카드는 사라지지 않는다.
    await this.redis.set(PROFILE_KEY(profile.id), profile, { ex: TTL_SECONDS });
    await this.redis.sadd(INDEX_KEY, profile.id);
  }

  async remove(id: string): Promise<void> {
    await this.redis.del(PROFILE_KEY(id));
    await this.redis.srem(INDEX_KEY, id);
  }

  async allowAttempt(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const k = `imsaju:throttle:${key}`;
    const count = await this.redis.incr(k);
    if (count === 1) await this.redis.expire(k, windowSeconds);
    return count <= limit;
  }
}

// ── 파일 (로컬 개발·도커) ─────────────────────────────────────────────────

class FileProfileStore implements ProfileStore {
  readonly name: string;
  readonly durable = true;
  private readonly path: string;
  /** 파일 저장소에서는 시도 횟수를 메모리에 센다. 단일 프로세스라 그걸로 충분하다. */
  private readonly attempts = new Map<string, { count: number; until: number }>();

  constructor(dir: string) {
    this.path = join(dir, 'profiles.json');
    this.name = `파일 (${this.path})`;
    mkdirSync(dir, { recursive: true });
  }

  private readAll(): StoredProfile[] {
    if (!existsSync(this.path)) return [];
    try {
      const parsed: unknown = JSON.parse(readFileSync(this.path, 'utf8'));
      if (!Array.isArray(parsed)) return [];
      // 파일에는 TTL 이 없으므로 읽을 때 걸러 낸다.
      const cutoff = Date.now() - TTL_SECONDS * 1000;
      return (parsed as StoredProfile[]).filter((p) => p?.updatedAt >= cutoff);
    } catch {
      return [];
    }
  }

  private writeAll(profiles: StoredProfile[]): void {
    writeFileSync(this.path, JSON.stringify(profiles, null, 2), 'utf8');
  }

  async list(): Promise<StoredProfile[]> {
    return this.readAll().sort((a, b) => a.createdAt - b.createdAt);
  }

  async get(id: string): Promise<StoredProfile | null> {
    return this.readAll().find((p) => p.id === id) ?? null;
  }

  async put(profile: StoredProfile): Promise<void> {
    const all = this.readAll().filter((p) => p.id !== profile.id);
    all.push(profile);
    this.writeAll(all);
  }

  async remove(id: string): Promise<void> {
    const all = this.readAll().filter((p) => p.id !== id);
    if (all.length === 0 && existsSync(this.path)) {
      unlinkSync(this.path);
      return;
    }
    this.writeAll(all);
  }

  async allowAttempt(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const now = Date.now();
    const entry = this.attempts.get(key);
    if (!entry || entry.until < now) {
      this.attempts.set(key, { count: 1, until: now + windowSeconds * 1000 });
      return true;
    }
    entry.count += 1;
    return entry.count <= limit;
  }
}

// ── 메모리 (저장소가 없을 때) ─────────────────────────────────────────────

class MemoryProfileStore implements ProfileStore {
  readonly name = '메모리 (이번 실행 동안만)';
  readonly durable = false;
  private readonly map = new Map<string, StoredProfile>();
  private readonly attempts = new Map<string, { count: number; until: number }>();

  async list(): Promise<StoredProfile[]> {
    return [...this.map.values()].sort((a, b) => a.createdAt - b.createdAt);
  }
  async get(id: string): Promise<StoredProfile | null> {
    return this.map.get(id) ?? null;
  }
  async put(profile: StoredProfile): Promise<void> {
    this.map.set(profile.id, profile);
  }
  async remove(id: string): Promise<void> {
    this.map.delete(id);
  }
  async allowAttempt(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const now = Date.now();
    const entry = this.attempts.get(key);
    if (!entry || entry.until < now) {
      this.attempts.set(key, { count: 1, until: now + windowSeconds * 1000 });
      return true;
    }
    entry.count += 1;
    return entry.count <= limit;
  }
}

// ── 고르기 ────────────────────────────────────────────────────────────────

/**
 * Redis 자격증명이 있으면 그걸 쓰고, 없으면 디스크에 써 보고, 그것도 안 되면 메모리.
 * 추측하지 않고 실제로 시도해 본다.
 */
function createStore(): ProfileStore {
  const choice = process.env.PROFILE_STORE?.trim().toLowerCase();
  const dir = process.env.PROFILE_DATA_DIR ?? join(process.cwd(), 'data');

  if (choice === 'memory') return new MemoryProfileStore();

  const credentials = redisCredentials();
  if (choice === 'redis' || (choice !== 'file' && credentials)) {
    if (!credentials) {
      throw new Error('PROFILE_STORE=redis 인데 Upstash 환경변수가 없습니다.');
    }
    return new RedisProfileStore(credentials);
  }

  try {
    const probe = join(dir, '.write-probe');
    mkdirSync(dir, { recursive: true });
    writeFileSync(probe, 'ok', 'utf8');
    unlinkSync(probe);
    return new FileProfileStore(dir);
  } catch {
    return new MemoryProfileStore();
  }
}

let store: ProfileStore | null = null;

export function getProfileStore(): ProfileStore {
  store ??= createStore();
  return store;
}

/** 테스트에서 갈아끼울 때 쓴다. */
export function setProfileStore(next: ProfileStore | null): void {
  store = next;
}

export function profileStorageInfo(): { name: string; durable: boolean; ttlDays: number } {
  const current = getProfileStore();
  return { name: current.name, durable: current.durable, ttlDays: PROFILE_TTL_DAYS };
}
