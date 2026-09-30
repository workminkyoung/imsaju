'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CompatibilityResult } from '@/components/CompatibilityResult';
import { ManseTable } from '@/components/ManseTable';
import { ProfileEditor } from '@/components/ProfileEditor';
import { ProfileGrid } from '@/components/ProfileGrid';
import { ReadingPanel } from '@/components/ReadingPanel';
import { RelationshipPicker } from '@/components/RelationshipPicker';
import { loadProfiles, saveProfiles, type Profile } from '@/lib/profiles';
import { DEFAULT_RELATIONSHIP, type RelationshipId } from '@/lib/relationship';
import type { CompatibilityResult as Result } from '@/lib/saju/compatibility';
import type { SajuChart } from '@/lib/saju/types';

interface ApiResponse {
  chartA: SajuChart;
  chartB: SajuChart;
  compatibility: Result;
  error?: string;
}

export default function CompatibilityPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [relationship, setRelationship] = useState<RelationshipId>(DEFAULT_RELATIONSHIP);

  const [editing, setEditing] = useState<Profile | 'new' | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // localStorage 는 서버에 없으므로 마운트 후에 읽는다.
  useEffect(() => {
    setProfiles(loadProfiles());
  }, []);

  const persist = useCallback((next: Profile[]) => {
    setProfiles(next);
    setStorageBlocked(!saveProfiles(next));
  }, []);

  const a = profiles.find((p) => p.id === selected[0]);
  const b = profiles.find((p) => p.id === selected[1]);
  const ready = Boolean(a && b);

  function toggle(id: string) {
    setResult(null);
    setError('');
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      // 이미 둘을 골랐으면 먼저 고른 것을 밀어낸다.
      return prev.length >= 2 ? [prev[1], id] : [...prev, id];
    });
  }

  function saveProfile(profile: Profile) {
    const exists = profiles.some((p) => p.id === profile.id);
    persist(exists ? profiles.map((p) => (p.id === profile.id ? profile : p)) : [...profiles, profile]);
    setEditing(null);
    setResult(null);
  }

  function deleteProfile(id: string) {
    const target = profiles.find((p) => p.id === id);
    if (!confirm(`「${target?.label}」 카드를 삭제할까요?`)) return;
    persist(profiles.filter((p) => p.id !== id));
    setSelected((prev) => prev.filter((x) => x !== id));
    setResult(null);
  }

  async function calculate() {
    if (!a || !b) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/compatibility', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ a: a.input, b: b.input, relationship }),
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

  if (editing) {
    return (
      <main className="space-y-4">
        <BackLink />
        <ProfileEditor
          editing={editing === 'new' ? undefined : editing}
          onSave={saveProfile}
          onCancel={() => setEditing(null)}
        />
      </main>
    );
  }

  return (
    <main className="space-y-4">
      <BackLink />

      <ProfileGrid
        profiles={profiles}
        selected={selected}
        onToggle={toggle}
        onEdit={(profile) => setEditing(profile)}
        onDelete={deleteProfile}
        onAdd={() => setEditing('new')}
        storageBlocked={storageBlocked}
      />

      {ready && (
        <>
          <RelationshipPicker
            aName={a!.label}
            bName={b!.label}
            value={relationship}
            onChange={(id) => {
              setRelationship(id);
              // 수치는 그대로지만 풀이 관점이 달라지므로 다시 계산하게 둔다.
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

      {!ready && profiles.length > 0 && (
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
            aName={a.label}
            bName={b.label}
            chartA={result.chartA}
            chartB={result.chartB}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-medium text-[var(--text-muted)]">{a.label} 원국</h3>
              <ManseTable chart={result.chartA} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium text-[var(--text-muted)]">{b.label} 원국</h3>
              <ManseTable chart={result.chartB} />
            </div>
          </div>

          <ReadingPanel
            endpoint="/api/compatibility/reading"
            body={{ a: a.input, b: b.input, relationship }}
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
