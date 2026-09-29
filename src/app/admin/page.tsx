'use client';

import { useCallback, useEffect, useState } from 'react';
import { Markdown } from '@/components/Markdown';

interface PromptData {
  kind: string;
  kinds: ReadonlyArray<{ id: string; label: string }>;
  template: string;
  defaultTemplate: string;
  systemInstruction: string;
  variables: ReadonlyArray<{ key: string; description: string }>;
  envOverride: boolean;
}

type Tab = 'edit' | 'preview' | 'test';

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  /** 편집 중인 프롬프트 종류 (개인 사주풀이 / 궁합 풀이) */
  const [kind, setKind] = useState('reading');
  const [data, setData] = useState<PromptData | null>(null);
  const [template, setTemplate] = useState('');
  const [tab, setTab] = useState<Tab>('edit');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const [rendered, setRendered] = useState('');
  const [unknownVariables, setUnknownVariables] = useState<string[]>([]);
  const [testResult, setTestResult] = useState('');
  const [testModel, setTestModel] = useState('');

  const load = useCallback(async (which: string) => {
    const response = await fetch(`/api/admin/prompt?kind=${which}`);
    if (response.status === 401) {
      setAuthed(false);
      return;
    }
    const json = (await response.json()) as PromptData;
    setData(json);
    setTemplate(json.template);
    setAuthed(true);
    // 종류를 바꾸면 이전 종류의 미리보기·테스트 결과가 남아 헷갈린다.
    setRendered('');
    setTestResult('');
    setTestModel('');
    setUnknownVariables([]);
    setMessage('');
    setTab('edit');
  }, []);

  useEffect(() => {
    void load(kind);
  }, [load, kind]);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setLoginError('');
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      const json = (await response.json()) as { error?: string };
      setLoginError(json.error ?? '로그인에 실패했습니다.');
      return;
    }
    setPassword('');
    await load(kind);
  }

  async function save() {
    setBusy(true);
    setMessage('');
    const response = await fetch('/api/admin/prompt', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ template, kind }),
    });
    const json = (await response.json()) as { persisted?: boolean; note?: string; error?: string };
    setMessage(
      json.error ??
        (json.persisted ? '저장했습니다.' : `저장했습니다. ${json.note ?? ''}`),
    );
    setBusy(false);
  }

  async function reset() {
    if (!confirm('프롬프트를 기본값으로 되돌립니다. 지금 편집 중인 내용은 사라집니다.')) return;
    setBusy(true);
    const response = await fetch(`/api/admin/prompt?kind=${kind}`, { method: 'DELETE' });
    const json = (await response.json()) as { template?: string };
    if (json.template) setTemplate(json.template);
    setMessage('기본값으로 되돌렸습니다.');
    setBusy(false);
  }

  async function preview(run: boolean) {
    setBusy(true);
    setMessage('');
    if (run) {
      setTestResult('');
      setTestModel('');
    }
    const response = await fetch('/api/admin/prompt', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ template, run, kind }),
    });
    const json = (await response.json()) as {
      rendered?: string;
      unknownVariables?: string[];
      result?: string;
      model?: string;
      interrupted?: string | null;
      error?: string;
    };
    if (json.rendered) setRendered(json.rendered);
    setUnknownVariables(json.unknownVariables ?? []);
    if (json.error) setMessage(json.error);
    if (json.result) {
      setTestResult(json.result);
      setTestModel(json.model ?? '');
      setMessage(
        json.interrupted
          ? `주의: 결과가 끝까지 나오지 않았습니다 (${json.interrupted}). 아래 내용은 잘린 것입니다.`
          : '',
      );
    }
    setTab(run ? 'test' : 'preview');
    setBusy(false);
  }

  if (!authed) {
    return (
      <main className="mx-auto max-w-sm">
        <form onSubmit={login} className="card">
          <h2 className="text-base font-semibold">관리자 로그인</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            사주풀이 프롬프트를 편집하려면 비밀번호가 필요합니다.
          </p>
          <input
            type="password"
            className="field mt-4"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            autoFocus
          />
          {loginError && (
            <p className="mt-2 text-xs" style={{ color: 'var(--accent)' }}>{loginError}</p>
          )}
          <button
            type="submit"
            className="mt-4 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
            style={{ background: 'var(--accent)' }}
          >
            로그인
          </button>
          <p className="mt-3 text-[11px] leading-relaxed text-[var(--text-muted)]">
            비밀번호는 서버의 <code>ADMIN_PASSWORD</code> 환경변수로 설정합니다.
          </p>
        </form>
      </main>
    );
  }

  return (
    <main className="space-y-4">
      <section className="card">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">프롬프트 편집</h2>
          <span className="text-xs text-[var(--text-muted)]">
            {template.length.toLocaleString()}자
          </span>
        </div>

        {/* 어느 프롬프트를 고치는지 항상 보이게 둔다 */}
        <div className="mt-3 flex gap-2">
          {data?.kinds.map((item) => {
            const active = item.id === kind;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setKind(item.id)}
                disabled={busy}
                className="flex-1 rounded-lg border px-3 py-2 text-sm transition disabled:opacity-50"
                style={{
                  borderColor: active ? 'var(--accent)' : 'var(--border)',
                  background: active ? 'var(--accent-soft)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text-muted)',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {data?.envOverride && (
          <p className="mt-2 rounded-lg p-2.5 text-xs leading-relaxed"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            현재 <code>SAJU_PROMPT</code> 환경변수가 설정돼 있어 그 값이 우선 적용됩니다.
            여기서 저장해도 반영되지 않습니다.
          </p>
        )}

        <div className="mt-3 flex gap-1.5 text-xs">
          {([
            ['edit', '편집'],
            ['preview', '미리보기 결과'],
            ['test', '테스트 결과'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className="rounded-md px-3 py-1.5 transition"
              style={{
                background: tab === value ? 'var(--accent-soft)' : 'transparent',
                color: tab === value ? 'var(--accent)' : 'var(--text-muted)',
                fontWeight: tab === value ? 600 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'edit' && (
          <>
            <textarea
              className="field mt-3 min-h-[28rem] font-mono text-xs leading-relaxed"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              spellCheck={false}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={save}
                disabled={busy}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: 'var(--accent)' }}
              >
                저장
              </button>
              <button
                type="button"
                onClick={() => preview(false)}
                disabled={busy}
                className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
                style={{ borderColor: 'var(--border)' }}
              >
                치환 미리보기
              </button>
              <button
                type="button"
                onClick={() => preview(true)}
                disabled={busy}
                className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
                style={{ borderColor: 'var(--border)' }}
              >
                {busy ? '실행 중…' : '샘플 사주로 테스트 실행'}
              </button>
              <button
                type="button"
                onClick={reset}
                disabled={busy}
                className="ml-auto rounded-lg px-3 py-2 text-xs text-[var(--text-muted)] disabled:opacity-50"
              >
                기본값 복원
              </button>
            </div>
            {message && <p className="mt-2.5 text-xs" style={{ color: 'var(--accent)' }}>{message}</p>}
          </>
        )}

        {tab === 'preview' && (
          <>
            {unknownVariables.length > 0 && (
              <p className="mt-3 rounded-lg p-2.5 text-xs" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                치환되지 않은 변수가 있습니다: {unknownVariables.map((v) => `{{${v}}}`).join(', ')} — 오타일 수 있습니다.
              </p>
            )}
            <pre className="mt-3 max-h-[32rem] overflow-auto rounded-lg border p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap"
              style={{ borderColor: 'var(--border)', background: 'var(--surface-sunken)' }}>
              {rendered || '「치환 미리보기」를 눌러 주세요.'}
            </pre>
          </>
        )}

        {tab === 'test' && (
          <div className="mt-3">
            {testResult ? (
              <>
                {message && (
                  <p className="mb-3 rounded-lg p-2.5 text-xs"
                    style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                    {message}
                  </p>
                )}
                <Markdown text={testResult} className="reading text-sm" />
                {testModel && (
                  <p className="mt-5 border-t pt-3 text-[11px] text-[var(--text-muted)]"
                    style={{ borderColor: 'var(--border)' }}>
                    {testModel} 이 생성했습니다.
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">
                {message || '「샘플 사주로 테스트 실행」을 눌러 주세요. 실제 Gemini를 호출합니다.'}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="card">
        <h3 className="text-sm font-semibold">사용 가능한 변수</h3>
        <dl className="mt-3 space-y-1.5">
          {data?.variables.map((v) => (
            <div key={v.key} className="grid grid-cols-[9rem_1fr] gap-2 text-xs">
              <dt className="font-mono" style={{ color: 'var(--accent)' }}>{`{{${v.key}}}`}</dt>
              <dd className="text-[var(--text-muted)]">{v.description}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="card">
        <h3 className="text-sm font-semibold">고정 시스템 지시</h3>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          모든 요청에 항상 함께 전달되며 여기서 수정할 수 없습니다.
        </p>
        <pre className="mt-3 overflow-auto rounded-lg border p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap"
          style={{ borderColor: 'var(--border)', background: 'var(--surface-sunken)' }}>
          {data?.systemInstruction}
        </pre>
      </section>
    </main>
  );
}
