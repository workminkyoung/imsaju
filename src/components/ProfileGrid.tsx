'use client';

import type { PublicProfile, StorageInfo } from '@/lib/profiles';

interface Props {
  profiles: PublicProfile[];
  /** 고른 순서대로. [0]=A, [1]=B */
  selected: string[];
  onToggle: (id: string) => void;
  /** 「내 카드 수정하기」 — 생년월일 확인 창을 연다 */
  onRequestEdit: (profile: PublicProfile) => void;
  onAdd: () => void;
  storage: StorageInfo | null;
  loading: boolean;
}

export function ProfileGrid({
  profiles,
  selected,
  onToggle,
  onRequestEdit,
  onAdd,
  storage,
  loading,
}: Props) {
  return (
    <section className="card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">사람 카드</h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            두 장을 고르세요. 먼저 고른 쪽이 A, 나중이 B입니다.
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-lg border px-3 py-1.5 text-xs font-medium transition"
          style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
        >
          + 카드 추가
        </button>
      </div>

      {storage && !storage.durable && (
        <p
          className="mt-3 rounded-lg p-2.5 text-xs leading-relaxed"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
        >
          이 서버는 카드를 오래 보관하지 못합니다(<strong>{storage.name}</strong>). 재시작하면
          사라지니, 운영에는 저장소를 연결해 주세요.
        </p>
      )}

      {loading ? (
        <p className="mt-6 text-center text-sm text-[var(--text-muted)]">카드를 불러오는 중…</p>
      ) : profiles.length === 0 ? (
        <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
          카드가 없습니다. 「+ 카드 추가」로 두 명을 등록해 주세요.
        </p>
      ) : (
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {profiles.map((profile) => {
            const order = selected.indexOf(profile.id);
            const picked = order >= 0;
            return (
              <div
                key={profile.id}
                className="rounded-lg border p-3 transition"
                style={{
                  borderColor: picked ? 'var(--accent)' : 'var(--border)',
                  background: picked ? 'var(--accent-soft)' : 'transparent',
                }}
              >
                <button
                  type="button"
                  onClick={() => onToggle(profile.id)}
                  className="block w-full text-left"
                  aria-pressed={picked}
                >
                  <div className="flex items-center gap-2">
                    {picked && (
                      <span
                        className="flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-[var(--on-accent)]"
                        style={{ background: 'var(--accent)' }}
                      >
                        {order === 0 ? 'A' : 'B'}
                      </span>
                    )}
                    <span className="truncate text-sm font-medium">{profile.label}</span>
                  </div>
                  {profile.memo && (
                    <p className="mt-1 truncate text-[11px] text-[var(--text-muted)]">
                      {profile.memo}
                    </p>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onRequestEdit(profile)}
                  className="mt-2.5 text-[11px] text-[var(--text-muted)] underline-offset-2 transition hover:text-[var(--accent)] hover:underline"
                >
                  내 카드 수정하기
                </button>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-[var(--text-muted)]">
        카드에는 이름만 표시되고 생년월일은 서버에만 보관합니다. 수정·삭제는 본인 생년월일을
        입력해야 할 수 있습니다.
        {storage && ` 마지막 사용 후 ${storage.ttlDays}일이 지나면 자동으로 삭제됩니다.`}
      </p>
    </section>
  );
}
