'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { preload } from 'react-dom';
import { useRouter } from 'next/navigation';
import { CardFan } from './CardFan';
import { DropSlots, type Landing } from './DropSlots';
import { CardFront } from './TableCard';
import { FanTuner } from './FanTuner';
import { TableHelp } from './TableHelp';
import {
  CARD_BASE_H,
  DEFAULT_FAN_CONFIG,
  FanConfigProvider,
  TUNER_ENABLED,
  cardSize,
  loadFanConfig,
  saveFanConfig,
  type FanConfig,
  type FanLimits,
  type FanMetrics,
} from './fanConfig';
import { ProfileEditor } from '@/components/ProfileEditor';
import {
  createProfile,
  deleteProfile,
  getProfile,
  listProfiles,
  toPublic,
  updateProfile,
  type PublicProfile,
  type StoredProfile,
} from '@/lib/profiles';
import type { SajuInput } from '@/lib/saju/types';

type EditState =
  | { mode: 'none' }
  | { mode: 'new' }
  | { mode: 'edit'; profile: StoredProfile };

interface Drag {
  profile: PublicProfile;
  x: number;
  y: number;
}

export function CardTable() {
  const router = useRouter();

  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [flippedId, setFlippedId] = useState<string | null>(null);
  const [slots, setSlots] = useState<(PublicProfile | null)[]>([null, null]);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [landing, setLanding] = useState<Landing | null>(null);
  const [edit, setEdit] = useState<EditState>({ mode: 'none' });

  // 버튼 상태 그림은 처음 바뀔 때 깜빡이지 않게 미리 받아 둔다.
  for (const state of ['Default', 'Hover', 'Pressed', 'Disabled']) {
    preload(`/cards/btn${state}.png`, { as: 'image' });
  }

  /*
   * 카드 테이블의 생김새. 기본값으로 먼저 그리고, 브라우저에 저장해 둔 값이 있으면
   * 올라온 뒤에 덮어쓴다(서버가 그린 화면과 첫 렌더가 어긋나지 않게).
   */
  const [config, setConfig] = useState<FanConfig>(DEFAULT_FAN_CONFIG);
  const [metrics, setMetrics] = useState<FanMetrics | null>(null);

  useEffect(() => {
    if (!TUNER_ENABLED) return;
    setConfig(loadFanConfig());
  }, []);

  const changeConfig = useCallback((next: FanConfig) => {
    setConfig(next);
    saveFanConfig(next);
  }, []);

  /*
   * 튜너 슬라이더에 걸 범위.
   *
   * 카드 크기의 상한은 고정값이 아니라 "지금 영역에 들어가는가"로 정해진다. 영역 설정이나
   * 칸 크기를 만지면 영역이 달라지므로, 그려진 결과(metrics)에서 거꾸로 끌어와 매번 새로 잡는다.
   * 아직 한 번도 안 그려졌으면 비워 두고 FAN_FIELDS 의 기본 범위를 쓴다.
   */
  const limits = useMemo<FanLimits>(() => {
    if (!metrics) return {};
    /*
     * 칸을 키우면 키운 만큼 아래 카드 영역이 줄어든다. 부채꼴이 자동 축소 하한으로도
     * 들어갈 높이는 남겨 두어야 하므로, 남은 여유만큼만 더 키울 수 있다.
     */
    const slack = metrics.available - metrics.height * Math.min(config.minScale, 1);
    return {
      cardScale: { min: 0.3, max: round2(metrics.maxCardScale) },
      slotScale: {
        min: 0.3,
        max: round2(Math.max(0.3, config.slotScale + slack / CARD_BASE_H)),
      },
    };
  }, [metrics, config.minScale, config.slotScale]);

  const slotRefs = useRef<(HTMLDivElement | null)[]>([null, null]);

  // 카드는 브라우저에만 있으므로 서버가 그린 첫 화면에는 없다. 올라온 뒤에 읽는다.
  const reload = useCallback(() => {
    setProfiles(listProfiles().map(toPublic));
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // ── 드래그 ──
  /** 포인터가 어느 슬롯 위에 있는지. 없으면 null. */
  const slotAt = useCallback((x: number, y: number): number | null => {
    for (let i = 0; i < slotRefs.current.length; i++) {
      const rect = slotRefs.current[i]?.getBoundingClientRect();
      if (!rect) continue;
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return i;
    }
    return null;
  }, []);

  useEffect(() => {
    if (!drag) return;

    const move = (event: PointerEvent) => {
      setDrag((prev) => (prev ? { ...prev, x: event.clientX, y: event.clientY } : prev));
      setHovered(slotAt(event.clientX, event.clientY));
    };

    const up = (event: PointerEvent) => {
      const index = slotAt(event.clientX, event.clientY);
      if (index !== null) {
        setSlots((prev) => {
          // 같은 카드가 두 슬롯에 들어가지 않게 다른 슬롯에서는 빼낸다.
          const next = prev.map((p) => (p?.id === drag.profile.id ? null : p));
          next[index] = drag.profile;
          return next;
        });
        setLanding({
          index,
          x: event.clientX,
          y: event.clientY,
          scale: metrics?.scale ?? 1,
          key: Date.now(),
        });
        setFlippedId(null);
      }
      setDrag(null);
      setHovered(null);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [drag, slotAt, metrics]);

  function startDrag(profile: PublicProfile, event: React.PointerEvent) {
    setFlippedId(null);
    setDrag({ profile, x: event.clientX, y: event.clientY });
  }

  // ── 카드 관리 ──
  async function saveNew(input: SajuInput, memo?: string) {
    createProfile(input, memo);
    setEdit({ mode: 'none' });
    reload();
  }

  async function saveEdit(state: Extract<EditState, { mode: 'edit' }>, input: SajuInput, memo?: string) {
    const updated = toPublic(updateProfile(state.profile.id, input, memo));
    // 궁합 칸에 올라가 있던 카드도 고친 내용으로 바꾼다.
    setSlots((prev) => prev.map((p) => (p?.id === updated.id ? updated : p)));
    setEdit({ mode: 'none' });
    reload();
  }

  async function removeCard(state: Extract<EditState, { mode: 'edit' }>) {
    deleteProfile(state.profile.id);
    setSlots((prev) => prev.map((p) => (p?.id === state.profile.id ? null : p)));
    setEdit({ mode: 'none' });
    reload();
  }

  function openEditor(id: string) {
    const profile = getProfile(id);
    if (!profile) {
      setError('카드를 찾을 수 없습니다. 오래 쓰지 않아 지워졌을 수 있습니다.');
      reload();
      return;
    }
    setError('');
    setEdit({ mode: 'edit', profile });
  }

  if (edit.mode === 'new' || edit.mode === 'edit') {
    return (
      <div className="page-top page-shell space-y-4 pb-12">
        <ProfileEditor
          editing={edit.mode === 'edit' ? edit.profile : undefined}
          onSave={
            edit.mode === 'edit'
              ? (input, memo) => saveEdit(edit, input, memo)
              : (input, memo) => saveNew(input, memo)
          }
          onDelete={edit.mode === 'edit' ? () => removeCard(edit) : undefined}
          onCancel={() => setEdit({ mode: 'none' })}
        />
      </div>
    );
  }

  const bothPlaced = Boolean(slots[0] && slots[1]);

  return (
    <FanConfigProvider value={config}>
      <div className="relative flex flex-1 flex-col">
        {/* 위쪽 — 궁합 슬롯과 안내. 여기까지는 가운데 폭을 지킨다. */}
        <div className="page-shell">
          {/*
            넓은 화면에서는 바깥 틀이 위를 비우지 않으므로(layout.tsx) 칸이 천장에 붙는다.
            그래서 여기서 숨 쉴 자리를 둔다. 좁은 화면은 바깥 틀이 이미 비워 두었다.
          */}
          <section className="pt-2 sm:pt-10">
            <DropSlots
              slots={slots}
              hovered={hovered}
              onClear={(i) => setSlots((prev) => prev.map((p, j) => (j === i ? null : p)))}
              slotRefs={slotRefs}
              landing={landing}
            />

            <div className="mt-5 flex flex-col items-center gap-2">
              {/* 글씨까지 든 픽셀 이미지 버튼. 상태별 그림은 globals.css 의 .px-btn-compat */}
              <button
                type="button"
                disabled={!bothPlaced}
                onClick={() => router.push(`/compatibility?a=${slots[0]!.id}&b=${slots[1]!.id}`)}
                className="px-btn-compat"
              >
                <span className="sr-only">궁합보기</span>
              </button>
              {/*
                비어 있을 때의 안내는 도움말(?)로 옮겼다 — 늘 떠 있으면 카드보다 글이 먼저 보인다.
                두 장을 올린 뒤의 이름 표시는 방금 한 일의 결과라 그대로 둔다.
              */}
              {bothPlaced && (
                <p className="text-xs text-[var(--text-muted)]">
                  {slots[0]!.label} ↔ {slots[1]!.label}
                </p>
              )}
            </div>
          </section>

          {error && (
            <div
              className="surface mt-4 rounded-lg border p-3 text-sm"
              style={{ borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--surface)' }}
            >
              {error}
            </div>
          )}

        </div>

        {/*
        아래쪽 — 카드 부채꼴.
        좌우는 화면 끝까지, 아래는 페이지 맨 끝까지 쓴다. 남는 높이는 위에만 두어
        뒤집힌 카드가 잘리지 않게 하고, 부채꼴 자체는 가운데에 둔다.
      */}
        <section
          className="flex min-h-0 flex-1 justify-center"
          style={{
            alignItems:
              config.areaAlign === 'end'
                ? 'flex-end'
                : config.areaAlign === 'start'
                  ? 'flex-start'
                  : 'center',
            marginTop: config.areaGapTop,
            paddingBottom: config.areaPadBottom,
          }}
        >
          {loading ? (
            <p className="w-full py-16 text-center text-sm text-[var(--text-muted)]">
              카드를 불러오는 중…
            </p>
          ) : (
            <CardFan
              profiles={profiles}
              flippedId={flippedId}
              placedIds={slots.filter(Boolean).map((p) => p!.id)}
              onFlip={(id) => setFlippedId((prev) => (prev === id ? null : id))}
              onAdd={() => setEdit({ mode: 'new' })}
              onViewSaju={(id) => router.push(`/saju/${id}`)}
              onEdit={(profile) => openEditor(profile.id)}
              onDragStart={startDrag}
              onMetrics={setMetrics}
            />
          )}
        </section>

        {/*
          드래그 중 따라다니는 카드. 부채꼴과 같은 배율로 줄여야 손에 쥐는 순간
          카드가 커져 보이지 않는다.
        */}
        {drag && (
          <div
            className="table-card-face pointer-events-none fixed z-[60] overflow-hidden rounded-xl"
            style={{
              left: drag.x,
              top: drag.y,
              width: cardSize(config.cardScale).w,
              height: cardSize(config.cardScale).h,
              transform: `translate(-50%, -50%) scale(${metrics?.scale ?? 1}) rotate(-4deg)`,
            }}
          >
            <CardFront profile={drag.profile} />
          </div>
        )}

        {/* 오른쪽 위 ? — 안내 문구는 여기 접어 둔다 */}
        <TableHelp />

        {/* 개발용 — 생김새를 화면에서 바로 돌려 보는 패널 */}
        {TUNER_ENABLED && (
          <FanTuner
            config={config}
            onChange={changeConfig}
            metrics={metrics}
            limits={limits}
          />
        )}
      </div>
    </FanConfigProvider>
  );
}

/** 배율은 0.01 단위로 다루므로 상한도 같은 자리에서 끊는다. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
