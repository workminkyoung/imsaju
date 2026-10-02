/**
 * 카드 주인 확인.
 *
 * 생년월일이 맞으면 수정 화면을 채울 수 있도록 전체 카드를 돌려준다.
 * 틀리면 왜 틀렸는지는 알려 주되, 어떤 값이 맞는지 짐작할 단서는 주지 않는다.
 */

import { NextResponse } from 'next/server';
import { verifyErrorMessage, verifyProfileOwner } from '@/lib/profileAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: '카드를 지정해 주세요.' }, { status: 400 });

  const result = await verifyProfileOwner(id, body.birthDate);
  if (!result.ok) {
    // 횟수 초과는 429 로 구분해 클라이언트가 안내를 달리할 수 있게 한다.
    const status = result.reason === 'throttled' ? 429 : 401;
    return NextResponse.json({ error: verifyErrorMessage(result.reason) }, { status });
  }

  return NextResponse.json({
    profile: {
      id: result.profile.id,
      label: result.profile.label,
      memo: result.profile.memo,
      input: result.profile.input,
    },
  });
}
