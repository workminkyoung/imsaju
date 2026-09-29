'use client';

import { describeProfile, type Profile } from '@/lib/profiles';

interface Props {
  profiles: Profile[];
  /** 고른 순서대로. [0]=A, [1]=B */
  selected: string[];
  onToggle: (id: string) => void;
  onEdit: (profile: Profile) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  /** localStorage 저장이 막힌 환경이면 경고를 띄운다. */
  storageBlocked: boolean;
}

export function ProfileGrid({
  profiles,
  selected,
  onToggle,
  onEdit,
  onDelete,
  onAdd,
  storageBlocked,
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

      {storageBlocked && (
        <p
          className="mt-3 rounded-lg p-2.5 text-xs leading-relaxed"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
        >
          이 브라우저에 카드를 저장하지 못했습니다(시크릿 모드이거나 저장이 차단된 상태). 지금 만든
          카드는 새로고침하면 사라집니다.
        </p>
      )}

      {profiles.length === 0 ? (
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
                className="relative rounded-lg border p-3 transition"
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
                        className="flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                        style={{ background: 'var(--accent)' }}
                      >
                        {order === 0 ? 'A' : 'B'}
                      </span>
                    )}
                    <span className="truncate text-sm font-medium">{profile.label}</span>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--text-muted)]">
                    {describeProfile(profile)}
                  </p>
                  {profile.memo && (
                    <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{profile.memo}</p>
                  )}
                </button>

                <div className="mt-2.5 flex gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => onEdit(profile)}
                    className="text-[var(--text-muted)] underline-offset-2 transition hover:text-[var(--accent)] hover:underline"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(profile.id)}
                    className="text-[var(--text-muted)] underline-offset-2 transition hover:text-[var(--accent)] hover:underline"
                  >
                    삭제
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-[var(--text-muted)]">
        카드는 이 브라우저에만 저장됩니다. 만세력을 계산할 때만 서버로 보내고 서버에는 남기지 않습니다.
      </p>
    </section>
  );
}
