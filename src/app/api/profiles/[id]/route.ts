/**
 * 카드 수정·삭제.
 *
 * 둘 다 생년월일을 다시 받아 확인한다. 토큰을 발급해 들고 다니게 하면 서버리스에서
 * 인스턴스마다 비밀이 달라지는 문제가 생기고, 토큰이 새면 그걸로 끝이다.
 * 매번 확인하는 쪽이 단순하고 상태도 없다.
 */

import { NextResponse } from 'next/server';
import { verifyErrorMessage, verifyProfileOwner } from '@/lib/profileAuth';
import { getProfileStore, toPublic } from '@/lib/profileStore';
import { ValidationError, parseSajuInput } from '@/lib/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

async function authorize(id: string, body: Record<string, unknown>) {
  const result = await verifyProfileOwner(id, body.birthDate);
  if (result.ok) return { profile: result.profile };
  const status = result.reason === 'throttled' ? 429 : 401;
  return {
    response: NextResponse.json({ error: verifyErrorMessage(result.reason) }, { status }),
  };
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const auth = await authorize(id, body);
  if (auth.response) return auth.response;

  try {
    const input = parseSajuInput(body.input ?? {});
    const label = (typeof body.label === 'string' ? body.label.trim() : '') || input.name || '이름 없음';
    const memo = typeof body.memo === 'string' ? body.memo.trim().slice(0, 40) : undefined;

    const updated = {
      ...auth.profile!,
      label: label.slice(0, 40),
      memo: memo || undefined,
      input: { ...input, name: label.slice(0, 40) },
      updatedAt: Date.now(),
    };
    await getProfileStore().put(updated);
    return NextResponse.json({ profile: toPublic(updated) });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : '카드를 수정하지 못했습니다.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const auth = await authorize(id, body);
  if (auth.response) return auth.response;

  await getProfileStore().remove(id);
  return NextResponse.json({ ok: true });
}
