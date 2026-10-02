'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BirthDateGate } from '@/components/BirthDateGate';
import { CompatibilityResult } from '@/components/CompatibilityResult';
import { ManseTable } from '@/components/ManseTable';
import { ProfileEditor } from '@/components/ProfileEditor';
import { ProfileGrid } from '@/components/ProfileGrid';
import { ReadingPanel } from '@/components/ReadingPanel';
import { RelationshipPicker } from '@/components/RelationshipPicker';
import {
  createProfile,
  deleteProfile,
  fetchProfiles,
  migrateLegacyProfiles,
  updateProfile,
  type FullProfile,
  type PublicProfile,
  type StorageInfo,
} from '@/lib/profiles';
import { DEFAULT_RELATIONSHIP, type RelationshipId } from '@/lib/relationship';
import type { PublicChart } from '@/lib/compatibilityRequest';
import type { CompatibilityResult as Result } from '@/lib/saju/compatibility';

interface ApiResponse {
  chartA: PublicChart;
  chartB: PublicChart;
  names: { a: string; b: string };
  compatibility: Result;
  error?: string;
}

/** 수정 흐름의 단계 — 확인 창 → 편집기 */
type EditState =
  | { mode: 'none' }
  | { mode: 'new' }
  | { mode: 'gate'; profile: PublicProfile }
  | { mode: 'edit'; profile: FullProfile; birthDate: string };

export default function CompatibilityPage() {
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [relationship, setRelationship] = useState<RelationshipId>(DEFAULT_RELATIONSHIP);

  const [edit, setEdit] = useState<EditState>({ mode: 'none' });
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const reload = useCallback(async () => {
    try {
      const data = await fetchProfiles();
      setProfiles(data.profiles);
      setStorage(data.storage);
      setError('');
    } catch (err) {
      setError((err as Error)?.message ?? '카드를 불러오지 못했습니다.');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    // 예전 브라우저 저장분이 있으면 먼저 서버로 올리고 목록을 받는다.
    void (async () => {
      const moved = await migrateLegacyProfiles();
      if (moved > 0) setNotice(`이 브라우저에 있던 카드 ${moved}장을 서버로 옮겼습니다.`);
      await reload();
    })();
  }, [reload]);

  const a = profiles.find((p) => p.id === selected[0]);
  const b = profiles.find((p) => p.id === selected[1]);
  const ready = Boolean(a && b);

  function toggle(id: string) {
    setResult(null);
    setError('');
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return prev.length >= 2 ? [prev[1], id] : [...prev, id];
    });
  }

  async function calculate() {
    if (!a || !b) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/compatibility', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ aId: a.id, bId: b.id, relationship }),
      });
      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.compatibility) {
        setError(data.error ?? '궁합을 계산하지 못했습니다.');
        setResult(null);
        return;
      }
      setResult(data);
      requestAnimationFrame(() => {
        document.getElementById('result')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch {
      setError('서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  // ── 카드 편집 ──
  async function saveNew(input: Parameters<typeof createProfile>[0], memo?: string) {
    await createProfile(input, memo);
    setEdit({ mode: 'none' });
    setResult(null);
    await reload();
  }

  async function saveEdit(
    state: Extract<EditState, { mode: 'edit' }>,
    input: Parameters<typeof createProfile>[0],
    memo?: string,
  ) {
    await updateProfile(state.profile.id, state.birthDate, input, memo);
    setEdit({ mode: 'none' });
    setResult(null);
    await reload();
  }

  async function removeCard(state: Extract<EditState, { mode: 'edit' }>) {
    await deleteProfile(state.profile.id, state.birthDate);
    setSelected((prev) => prev.filter((x) => x !== state.profile.id));
    setEdit({ mode: 'none' });
    setResult(null);
    await reload();
  }

  if (edit.mode === 'new') {
    return (
      <main className="space-y-4">
        <BackLink />
        <ProfileEditor onSave={saveNew} onCancel={() => setEdit({ mode: 'none' })} />
      </main>
    );
  }

  if (edit.mode === 'edit') {
    return (
      <main className="space-y-4">
        <BackLink />
        <ProfileEditor
          editing={edit.profile}
          onSave={(input, memo) => saveEdit(edit, input, memo)}
          onDelete={() => removeCard(edit)}
          onCancel={() => setEdit({ mode: 'none' })}
        />
      </main>
    );
  }

  return (
    <main className="space-y-4">
      <BackLink />

      {notice && (
        <p
          className="rounded-lg p-2.5 text-xs leading-relaxed"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
        >
          {notice}
        </p>
      )}

      <ProfileGrid
        profiles={profiles}
        selected={selected}
        onToggle={toggle}
        onRequestEdit={(profile) => setEdit({ mode: 'gate', profile })}
        onAdd={() => setEdit({ mode: 'new' })}
        storage={storage}
        loading={listLoading}
      />

      {edit.mode === 'gate' && (
        <BirthDateGate
          profile={edit.profile}
          onVerified={(full, birthDate) => setEdit({ mode: 'edit', profile: full, birthDate })}
          onCancel={() => setEdit({ mode: 'none' })}
        />
      )}

      {ready && (
        <>
          <RelationshipPicker
            aName={a!.label}
            bName={b!.label}
            value={relationship}
            onChange={(id) => {
              setRelationship(id);
              setResult(null);
            }}
          />

          <button
            type="button"
            onClick={calculate}
            disabled={loading}
            className="w-full rounded-lg px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
          >
            {loading ? '계산 중…' : `${a!.label} ↔ ${b!.label} 궁합 보기`}
          </button>
        </>
      )}

      {!ready && !listLoading && profiles.length > 0 && (
        <p className="text-center text-sm text-[var(--text-muted)]">
          카드를 {2 - selected.length}장 더 골라 주세요.
        </p>
      )}

      {error && (
        <div className="card text-sm" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
          {error}
        </div>
      )}

      {result && a && b && (
        <div id="result" className="space-y-4 pt-2">
          <CompatibilityResult
            result={result.compatibility}
            aName={result.names.a}
            bName={result.names.b}
            strengthA={result.chartA.analysis.strength.verdict}
            strengthB={result.chartB.analysis.strength.verdict}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-medium text-[var(--text-muted)]">
                {result.names.a} 원국
              </h3>
              <ManseTable chart={result.chartA} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium text-[var(--text-muted)]">
                {result.names.b} 원국
              </h3>
              <ManseTable chart={result.chartB} />
            </div>
          </div>

          <ReadingPanel
            endpoint="/api/compatibility/reading"
            body={{ aId: a.id, bId: b.id, relationship }}
            title="궁합 풀이"
            description="위 궁합 계산을 그대로 근거 삼아 풀이해 드려요. 이 단계에서만 AI를 씁니다."
            actionLabel="궁합 풀이 생성"
          />
        </div>
      )}
    </main>
  );
}

function BackLink() {
  return (
    <Link
      href="/"
      className="inline-block text-xs text-[var(--text-muted)] transition hover:text-[var(--accent)]"
    >
      ← 처음으로
    </Link>
  );
}
