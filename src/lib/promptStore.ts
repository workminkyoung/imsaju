/**
 * 관리자가 수정한 프롬프트를 어디에 보관할지.
 *
 * 호스팅을 옮길 때 가장 먼저 깨지는 게 파일 쓰기다. 로컬과 도커에서는 디스크가 멀쩡하지만
 * 서버리스(Vercel 등)에서는 읽기 전용이고, /tmp 는 인스턴스마다 따로라 저장해도 다음 요청이
 * 다른 인스턴스로 가면 사라진다.
 *
 * 그래서 보관 방식을 인터페이스 뒤로 숨긴다. 나중에 KV·Redis·DB 로 바꿀 때
 * 이 파일에 구현 하나를 더하고 고르기만 하면 되고, 부르는 쪽은 손대지 않는다.
 *
 * 읽기·쓰기를 async 로 둔 것도 같은 이유다. 지금은 동기 파일 IO 로 충분하지만,
 * 네트워크 저장소로 바꾸는 순간 시그니처를 바꿔야 하면 호출부를 전부 다시 고쳐야 한다.
 */

import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PromptKind } from './promptKind';

export interface PromptStore {
  /** 화면에 표시할 이름 */
  readonly name: string;
  /**
   * 프로세스가 재시작되거나 인스턴스가 바뀌어도 값이 남는가.
   * false 면 관리자 화면에서 "이번 실행 동안만 적용된다"고 알려야 한다.
   */
  readonly durable: boolean;
  read(kind: PromptKind): Promise<string | null>;
  write(kind: PromptKind, text: string): Promise<void>;
  clear(kind: PromptKind): Promise<void>;
}

// ── 파일 ──────────────────────────────────────────────────────────────────

/** 디스크가 쓰기 가능한 환경(로컬 개발·도커·VM)에서 쓴다. */
export class FilePromptStore implements PromptStore {
  readonly name: string;
  readonly durable = true;

  constructor(private readonly dir: string) {
    this.name = `파일 (${dir})`;
  }

  /** kind 개념이 생기기 전 경로. 로컬 수정본이 날아가지 않게 읽기만 지원한다. */
  private legacyPath(kind: PromptKind): string | null {
    return kind === 'reading' ? join(this.dir, 'prompt.md') : null;
  }

  private path(kind: PromptKind): string {
    return join(this.dir, `prompt-${kind}.md`);
  }

  async read(kind: PromptKind): Promise<string | null> {
    for (const path of [this.path(kind), this.legacyPath(kind)]) {
      if (!path || !existsSync(path)) continue;
      try {
        return readFileSync(path, 'utf8');
      } catch {
        // 읽기 실패는 기본값으로 넘어간다.
      }
    }
    return null;
  }

  async write(kind: PromptKind, text: string): Promise<void> {
    mkdirSync(this.dir, { recursive: true });
    writeFileSync(this.path(kind), text, 'utf8');
  }

  async clear(kind: PromptKind): Promise<void> {
    for (const path of [this.path(kind), this.legacyPath(kind)]) {
      if (!path || !existsSync(path)) continue;
      try {
        unlinkSync(path);
      } catch {
        // 지우지 못해도 기본값 로드에는 영향이 없도록 둔다.
      }
    }
  }
}

// ── 메모리 ────────────────────────────────────────────────────────────────

/**
 * 디스크에 쓸 수 없을 때의 대체품.
 *
 * 값을 잃는다는 사실을 숨기지 않는다. durable=false 라서 관리자 화면이
 * "영구 저장되지 않는다"고 알릴 수 있다.
 */
export class MemoryPromptStore implements PromptStore {
  readonly name = '메모리 (이번 실행 동안만)';
  readonly durable = false;
  private readonly map = new Map<PromptKind, string>();

  async read(kind: PromptKind): Promise<string | null> {
    return this.map.get(kind) ?? null;
  }

  async write(kind: PromptKind, text: string): Promise<void> {
    this.map.set(kind, text);
  }

  async clear(kind: PromptKind): Promise<void> {
    this.map.delete(kind);
  }
}

// ── 고르기 ────────────────────────────────────────────────────────────────

/**
 * 어떤 저장소를 쓸지 정한다.
 *
 * `PROMPT_STORE` 환경변수로 못박을 수 있고, 지정하지 않으면 디스크에 실제로 쓸 수
 * 있는지 한 번 시험해 보고 고른다. 서버리스에서는 자연스럽게 메모리로 떨어진다.
 *
 * 새 백엔드를 붙일 때는 여기에 분기 하나만 추가하면 된다.
 */
function createStore(): PromptStore {
  const dir = process.env.PROMPT_DATA_DIR ?? join(process.cwd(), 'data');
  const choice = process.env.PROMPT_STORE?.trim().toLowerCase();

  if (choice === 'memory') return new MemoryPromptStore();
  if (choice === 'file') return new FilePromptStore(dir);

  // auto — 실제로 써 보고 판단한다. 권한이나 읽기 전용 여부를 추측하지 않는다.
  try {
    mkdirSync(dir, { recursive: true });
    const probe = join(dir, '.write-probe');
    writeFileSync(probe, 'ok', 'utf8');
    unlinkSync(probe);
    return new FilePromptStore(dir);
  } catch {
    return new MemoryPromptStore();
  }
}

let store: PromptStore | null = null;

export function getPromptStore(): PromptStore {
  store ??= createStore();
  return store;
}

/** 테스트에서 저장소를 갈아끼울 때 쓴다. */
export function setPromptStore(next: PromptStore | null): void {
  store = next;
}
