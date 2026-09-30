/**
 * 헬스체크.
 *
 * Railway·Render·Fly·쿠버네티스 같은 호스팅은 이 엔드포인트로 살아 있는지 확인한다.
 * Vercel 에는 필요 없지만, 나중에 옮길 때 없으면 그때 가서 만들어야 한다.
 *
 * 비밀은 담지 않는다 — 키가 "설정됐는지"만 알리고 값은 내보내지 않는다.
 */

import { NextResponse } from 'next/server';
import { isConfigured } from '@/lib/gemini';
import { promptStorageInfo } from '@/lib/prompt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    // 계산 엔진은 외부 의존이 없어 항상 동작한다. 풀이만 키에 달려 있다.
    manseryeok: 'ok',
    gemini: isConfigured() ? 'configured' : 'missing-key',
    adminConfigured: Boolean(process.env.ADMIN_PASSWORD),
    promptStorage: promptStorageInfo(),
    time: new Date().toISOString(),
  });
}
