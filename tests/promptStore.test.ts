/**
 * 프롬프트 저장소 검증.
 *
 * 호스팅을 옮길 때 가장 먼저 깨지는 게 파일 쓰기다. 그래서 보관 방식을 인터페이스 뒤로
 * 숨겼는데, 그 교체가 실제로 되는지와 **저장이 오래 남지 않을 때 그 사실을 숨기지 않는지**를
 * 확인한다. 조용히 성공으로 처리하면 관리자는 반영된 줄 알고 나갔다가 나중에 되돌아간 걸 본다.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  FilePromptStore,
  MemoryPromptStore,
  setPromptStore,
  type PromptStore,
} from '@/lib/promptStore';
import { loadDefaultPrompt, loadPrompt, resetPrompt, savePrompt, promptStorageInfo } from '@/lib/prompt';

const dirs: string[] = [];
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'imsaju-prompt-'));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  setPromptStore(null);
  delete process.env.SAJU_PROMPT_READING;
  delete process.env.SAJU_PROMPT;
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('FilePromptStore', () => {
  it('쓴 값을 그대로 읽어 온다', async () => {
    const store = new FilePromptStore(tempDir());
    await store.write('reading', '테스트 템플릿');
    expect(await store.read('reading')).toBe('테스트 템플릿');
  });

  it('종류별로 따로 보관한다', async () => {
    const store = new FilePromptStore(tempDir());
    await store.write('reading', '개인');
    await store.write('compatibility', '궁합');
    expect(await store.read('reading')).toBe('개인');
    expect(await store.read('compatibility')).toBe('궁합');
  });

  it('없으면 null 을 준다', async () => {
    expect(await new FilePromptStore(tempDir()).read('reading')).toBeNull();
  });

  it('지우면 사라진다', async () => {
    const dir = tempDir();
    const store = new FilePromptStore(dir);
    await store.write('reading', '지울 것');
    await store.clear('reading');
    expect(await store.read('reading')).toBeNull();
    expect(existsSync(join(dir, 'prompt-reading.md'))).toBe(false);
  });

  it('kind 개념 이전의 파일도 읽어 준다', async () => {
    // 예전 버전에서 저장해 둔 data/prompt.md 가 있으면 잃지 않는다.
    const dir = tempDir();
    const store = new FilePromptStore(dir);
    await store.write('reading', '새 경로');
    rmSync(join(dir, 'prompt-reading.md'));
    const { writeFileSync } = await import('node:fs');
    writeFileSync(join(dir, 'prompt.md'), '옛 경로', 'utf8');
    expect(await store.read('reading')).toBe('옛 경로');
  });

  it('durable 이다', () => {
    expect(new FilePromptStore(tempDir()).durable).toBe(true);
  });
});

describe('MemoryPromptStore', () => {
  it('값은 보관하되 durable 이 아니라고 밝힌다', async () => {
    const store = new MemoryPromptStore();
    await store.write('reading', '임시');
    expect(await store.read('reading')).toBe('임시');
    expect(store.durable).toBe(false);
  });
});

describe('저장소를 갈아끼울 수 있다', () => {
  it('구현만 바꾸면 prompt.ts 는 그대로 동작한다', async () => {
    // 나중에 KV·Redis·DB 로 옮길 때 이 모양이면 된다는 확인.
    const written = new Map<string, string>();
    const fake: PromptStore = {
      name: '가짜 원격 저장소',
      durable: true,
      async read(kind) {
        return written.get(kind) ?? null;
      },
      async write(kind, text) {
        written.set(kind, text);
      },
      async clear(kind) {
        written.delete(kind);
      },
    };
    setPromptStore(fake);

    const result = await savePrompt('reading', '원격에 저장된 템플릿');
    expect(result.persisted).toBe(true);
    expect(await loadPrompt('reading')).toBe('원격에 저장된 템플릿');
    expect(promptStorageInfo().name).toBe('가짜 원격 저장소');

    await resetPrompt('reading');
    expect(await loadPrompt('reading')).toBe(loadDefaultPrompt('reading'));
  });
});

describe('오래 남지 않는 저장을 성공으로 뭉뚱그리지 않는다', () => {
  it('메모리 저장소면 persisted=false 와 안내를 함께 준다', async () => {
    setPromptStore(new MemoryPromptStore());
    const result = await savePrompt('reading', '임시 템플릿');

    expect(result.persisted).toBe(false);
    expect(result.note).toMatch(/재시작|인스턴스/);
    expect(result.note).toContain('SAJU_PROMPT_READING');

    // 값 자체는 이번 실행 동안 살아 있어야 한다.
    expect(await loadPrompt('reading')).toBe('임시 템플릿');
  });

  it('쓰기가 실패해도 예외를 던지지 않고 알린다', async () => {
    setPromptStore({
      name: '고장난 저장소',
      durable: true,
      async read() {
        return null;
      },
      async write() {
        throw new Error('EROFS');
      },
      async clear() {},
    });

    const result = await savePrompt('reading', '무엇이든');
    expect(result.persisted).toBe(false);
    expect(result.note).toContain('SAJU_PROMPT_READING');
  });
});

describe('환경변수가 저장소보다 우선한다', () => {
  it('서버리스에서 확실히 반영하는 유일한 방법이므로 맨 위에 둔다', async () => {
    setPromptStore(new MemoryPromptStore());
    await savePrompt('reading', '저장소에 넣은 값');
    process.env.SAJU_PROMPT_READING = '환경변수 값';

    expect(await loadPrompt('reading')).toBe('환경변수 값');
  });

  it('예전 SAJU_PROMPT 도 개인 사주풀이에 계속 먹힌다', async () => {
    process.env.SAJU_PROMPT = '레거시 값';
    expect(await loadPrompt('reading')).toBe('레거시 값');
    // 궁합에는 적용되지 않아야 한다.
    expect(await loadPrompt('compatibility')).toBe(loadDefaultPrompt('compatibility'));
  });
});

describe('저장소가 비면 레포의 기본값으로 돌아간다', () => {
  it('reading', async () => {
    setPromptStore(new MemoryPromptStore());
    expect(await loadPrompt('reading')).toBe(loadDefaultPrompt('reading'));
  });

  it('compatibility', async () => {
    setPromptStore(new MemoryPromptStore());
    expect(await loadPrompt('compatibility')).toBe(loadDefaultPrompt('compatibility'));
  });

  it('기본값 파일은 항상 읽을 수 있다 (번들에 포함돼야 한다)', () => {
    for (const kind of ['reading', 'compatibility'] as const) {
      expect(loadDefaultPrompt(kind).length).toBeGreaterThan(200);
    }
    // 실제 파일이 레포에 있는지도 확인 — 빌드에서 빠지면 프로덕션이 통째로 죽는다.
    for (const file of ['prompts/default.md', 'prompts/compatibility.md']) {
      expect(readFileSync(file, 'utf8').length).toBeGreaterThan(200);
    }
  });
});
