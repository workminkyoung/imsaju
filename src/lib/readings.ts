/**
 * 만들어 둔 사주풀이 — 카드와 마찬가지로 이 브라우저에만 둔다.
 *
 * 풀이는 카드 한 장당 **한 번만** 만든다. 같은 만세력을 다시 넣어도 표현만 달라질 뿐
 * 근거가 바뀌지 않는데, 생성할 때마다 LLM 할당량이 나간다. 그래서 끝까지 받아 낸
 * 풀이는 저장해 두고 다음부터는 그대로 보여 준다.
 *
 * 저장은 **끝까지 성공한 풀이에만** 한다. 중간에 끊기거나 오류가 난 것은 남기지 않아야
 * 다시 만들 수 있다 — 반 토막 난 글이 "이미 만든 풀이"로 굳으면 손쓸 방법이 없다.
 *
 * 카드를 지우거나 보관 기간이 지나 사라지면 풀이도 함께 사라져야 한다(pruneReadings).
 */

const STORAGE_KEY = 'imsaju.readings.v1';

export interface StoredReading {
  /** 카드 id */
  id: string;
  text: string;
  /** 어느 모델이 썼는지. 화면 아래에 밝힌다. */
  model: string;
  createdAt: number;
}

/** localStorage 는 사생활 보호 모드 등에서 접근만 해도 던질 수 있다. */
function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function readAll(): StoredReading[] {
  const store = storage();
  if (!store) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(store.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  // 저장된 값은 사람이 고칠 수 있는 자리다. 모양이 맞는 것만 받아들인다.
  return (parsed as StoredReading[]).filter(
    (r) => typeof r?.id === 'string' && typeof r?.text === 'string' && r.text.length > 0,
  );
}

function writeAll(readings: StoredReading[]): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(readings));
  } catch {
    // 저장이 막혀 있어도 화면에 띄우는 것까지는 된다. 다음에 다시 만들면 그만이다.
  }
}

/** 이 카드의 풀이. 없으면 null. */
export function getReading(id: string): StoredReading | null {
  return readAll().find((r) => r.id === id) ?? null;
}

/** 끝까지 받아 낸 풀이만 넣는다. 같은 카드가 있으면 덮어쓴다. */
export function saveReading(id: string, text: string, model: string): StoredReading | null {
  if (!text.trim()) return null;
  const reading: StoredReading = { id, text, model, createdAt: Date.now() };
  writeAll([...readAll().filter((r) => r.id !== id), reading]);
  return reading;
}

export function deleteReading(id: string): void {
  const all = readAll();
  const left = all.filter((r) => r.id !== id);
  if (left.length !== all.length) writeAll(left);
}

/**
 * 남아 있는 카드의 풀이만 남긴다.
 *
 * 카드는 보관 기간이 지나면 조용히 사라지는데(PROFILE_TTL_DAYS) 그때 풀이까지 지울
 * 자리가 없다. 카드 목록을 읽는 쪽에서 한 번씩 불러 주인 없는 풀이를 걷어 낸다.
 */
export function pruneReadings(keepIds: readonly string[]): void {
  const keep = new Set(keepIds);
  const all = readAll();
  const left = all.filter((r) => keep.has(r.id));
  if (left.length !== all.length) writeAll(left);
}
