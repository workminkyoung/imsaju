/**
 * 관리자 인증.
 *
 * 프롬프트 편집만 막으면 되는 1인 운영 수준이라 환경변수 비밀번호 하나로 충분하다.
 * 쿠키에는 비밀번호가 아니라 그것에서 유도한 토큰을 담는다.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const ADMIN_COOKIE = 'imsaju_admin';

export class AdminNotConfiguredError extends Error {
  constructor() {
    super('ADMIN_PASSWORD 환경변수가 설정되지 않아 관리자 페이지를 쓸 수 없습니다.');
    this.name = 'AdminNotConfiguredError';
  }
}

function adminPassword(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new AdminNotConfiguredError();
  return password;
}

/** 비밀번호에서 쿠키에 넣을 토큰을 만든다. 비밀번호 자체는 브라우저로 나가지 않는다. */
function sessionToken(): string {
  return createHmac('sha256', adminPassword()).update('imsaju-admin-session').digest('hex');
}

/** 길이가 달라도 안전하게 비교한다. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function verifyPassword(candidate: string): boolean {
  return safeEqual(candidate, adminPassword());
}

export function issueToken(): string {
  return sessionToken();
}

export async function isAuthenticated(): Promise<boolean> {
  try {
    const value = (await cookies()).get(ADMIN_COOKIE)?.value;
    return Boolean(value) && safeEqual(value!, sessionToken());
  } catch {
    return false;
  }
}

/** 비밀번호가 설정되어 있는지 (관리자 페이지에서 안내 문구 표시용) */
export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}
