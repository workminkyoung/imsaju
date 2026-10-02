/**
 * 헬스체크.
 *
 * Railway·Render·Fly·쿠버네티스 같은 호스팅은 이 엔드포인트로 살아 있는지 확인한다.
 *
 * "ok" 를 그냥 적어 두지 않는다. 실제로 계산을 한 번 돌려 보고 그 결과를 말한다.
 * 그러지 않으면 엔진이 죽어 있어도 헬스체크는 초록불을 켠다 — 배포 사고를 놓치는
 * 가장 흔한 방식이다.
 *
 * 비밀은 담지 않는다. 키가 "설정됐는지"만 알리고 값은 내보내지 않는다.
 */

import { NextResponse } from 'next/server';
import { isConfigured } from '@/lib/gemini';
import { promptStorageInfo } from '@/lib/prompt';
import { profileStorageInfo } from '@/lib/profileStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 한 가지를 실제로 실행해 보고 결과를 남긴다. */
async function probe(run: () => unknown | Promise<unknown>): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await run();
    return { ok: true };
  } catch (error) {
    // 배포 환경에서만 터지는 문제는 메시지가 없으면 영영 못 잡는다.
    const err = error as { name?: string; message?: string; code?: string };
    return {
      ok: false,
      error: [err?.name, err?.code, err?.message].filter(Boolean).join(' / ') || String(error),
    };
  }
}

export async function GET() {
  // 모듈을 동적으로 부른다. 로딩 자체가 실패해도 헬스체크는 살아서 이유를 알려야 한다.
  const checks = {
    // 표준시 이력 — ICU 타임존 데이터가 없는 런타임에서는 여기서 터진다.
    timezone: await probe(() => {
      const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', hourCycle: 'h23' });
      return fmt.format(new Date());
    }),
    // 절기 — astronomy-engine 로딩과 실제 계산
    solarTerms: await probe(async () => {
      const { solarTermsForYear } = await import('@/lib/saju/solarTerms');
      return solarTermsForYear(2000).length;
    }),
    // 음력 변환
    lunar: await probe(async () => {
      const { solarToLunar } = await import('@/lib/lunar');
      return solarToLunar(1990, 3, 15);
    }),
    // 전체 파이프라인
    chart: await probe(async () => {
      const { computeSaju } = await import('@/lib/saju');
      const chart = computeSaju({
        name: 'health', calendar: 'solar', year: 1990, month: 3, day: 15,
        hour: 13, minute: 20, gender: 'male', city: '서울',
      });
      return chart.pillars.day.ganji;
    }),
  };

  const healthy = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    {
      ok: healthy,
      checks,
      gemini: isConfigured() ? 'configured' : 'missing-key',
      adminConfigured: Boolean(process.env.ADMIN_PASSWORD),
      promptStorage: promptStorageInfo(),
      profileStorage: profileStorageInfo(),
      node: process.version,
      time: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 },
  );
}
