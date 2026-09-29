/**
 * 0단계 검증: Gemini 무료 API 키가 실제로 동작하는지 확인하고,
 *             이 키로 실제 쓸 수 있는 모델 폴백 체인을 결정한다.
 *
 *   npm run check:gemini
 *
 * 무료 티어에서는 모델별 가용성이 크게 갈린다(Pro=429, 최신 flash=503 빈발).
 * 그래서 "모델 목록에 있다"가 아니라 "지금 실제로 응답하는가"를 직접 때려서 확인한다.
 */

import { readFileSync } from 'node:fs';
import { GoogleGenAI } from '@google/genai';

const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const bad = (m) => console.log(`  \x1b[31m✗\x1b[0m ${m}`);
const info = (m) => console.log(`    ${m}`);
const step = (n, m) => console.log(`\n\x1b[1m[${n}] ${m}\x1b[0m`);

/** .env.local 을 process.env 에 로드한다. 키 값은 어디에도 출력하지 않는다. */
function loadEnvLocal() {
  try {
    for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const value = m[2].replace(/^['"]|['"]$/g, '').trim();
      if (value) process.env[m[1]] ??= value;
    }
    return true;
  } catch {
    return false;
  }
}

/** API 에러를 사람이 읽을 수 있는 원인으로 바꾼다. */
function classify(err) {
  const msg = String(err?.message ?? err);
  const code = Number(msg.match(/"code":\s*(\d+)/)?.[1] ?? err?.status ?? 0);
  if (code === 400) return { code, why: '요청오류', hint: '키가 무효할 수 있습니다. AI Studio에서 재발급하세요.' };
  if (code === 403) return { code, why: '권한없음', hint: '지역 제한이거나 이 키로 접근할 수 없는 모델입니다.' };
  if (code === 404) return { code, why: '사용불가', hint: '신규 사용자에게 종료된 모델입니다.' };
  if (code === 429) return { code, why: '한도초과', hint: '무료 티어 할당량 밖입니다(Pro 계열은 대개 여기 걸립니다).' };
  if (code === 503) return { code, why: '과부하', hint: '무료 티어 혼잡. 일시적이지만 자주 발생합니다.' };
  if (/fetch failed|ENOTFOUND|ETIMEDOUT/i.test(msg)) return { code: 0, why: '네트워크', hint: '프록시/방화벽을 확인하세요.' };
  if (/overload|high demand|UNAVAILABLE/i.test(msg)) return { code: 503, why: '과부하', hint: '무료 티어 혼잡.' };
  if (/quota|RESOURCE_EXHAUSTED/i.test(msg)) return { code: 429, why: '한도초과', hint: '무료 티어 할당량 밖입니다.' };
  return { code, why: '기타오류', hint: msg.split(String.fromCharCode(10)).join(' ').slice(0, 160) };
}

// ── 1. 키 인식 ────────────────────────────────────────────────────────────
step(1, '환경변수 확인');

info(loadEnvLocal() ? '.env.local 파일 읽음' : '.env.local 파일 없음 (셸 환경변수만 사용)');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  bad('GEMINI_API_KEY 가 설정되지 않았습니다.');
  info('.env.local 에 한 줄 추가하세요:  GEMINI_API_KEY=<키>');
  info('발급: https://aistudio.google.com/apikey');
  process.exit(1);
}
ok(`GEMINI_API_KEY 설정됨 (길이 ${apiKey.length}자)`);
if (process.env.GEMINI_MODEL) info(`GEMINI_MODEL 지정됨 = ${process.env.GEMINI_MODEL}`);

const ai = new GoogleGenAI({ apiKey });

// ── 2. 모델 목록 ──────────────────────────────────────────────────────────
step(2, '키로 조회되는 모델 목록');

let listed = [];
try {
  for await (const m of await ai.models.list()) listed.push(m);
  const gen = listed
    .filter((m) => (m.supportedActions ?? m.supportedGenerationMethods ?? []).includes('generateContent'))
    .map((m) => m.name.replace(/^models\//, ''))
    .filter((n) => n.startsWith('gemini-') && !/image|tts|embedding|live|transcribe|robotics|computer-use/.test(n));
  ok(`전체 ${listed.length}개 중 텍스트 생성용 Gemini ${gen.length}개`);
  info(gen.sort().join(', '));
} catch (err) {
  const { why, hint } = classify(err);
  bad(`모델 목록 조회 실패: ${why} — ${hint}`);
  process.exit(1);
}

// ── 3. 실제 가용성 확인 ───────────────────────────────────────────────────
// 목록에 있어도 무료 티어에서 실제로는 못 쓰는 모델이 많다. 스트리밍으로 직접 확인한다.
step(3, '실제 응답 가능 여부 (스트리밍으로 직접 호출)');

const CANDIDATES = [
  'gemini-3.1-pro-preview',
  'gemini-pro-latest',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3-flash-preview',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
];
const PROBE = '사주 원국 庚午/己卯/甲子/辛未 남자. 성격을 300자로 풀이해줘.';

console.log();
console.log('    ' + '모델'.padEnd(26) + '결과'.padStart(8) + '첫글자'.padStart(10) + '총시간'.padStart(10));
console.log('    ' + '-'.repeat(54));

const alive = [];
for (const model of CANDIDATES) {
  try {
    const t0 = Date.now();
    let ttfc = null;
    for await (const ch of await ai.models.generateContentStream({ model, contents: PROBE })) {
      if (ch.text) ttfc ??= Date.now() - t0;
    }
    const total = Date.now() - t0;
    alive.push({ model, ttfc, total });
    console.log('    ' + model.padEnd(26) + '성공'.padStart(8) + `${ttfc}ms`.padStart(10) + `${total}ms`.padStart(10));
  } catch (err) {
    const { why } = classify(err);
    console.log('    ' + model.padEnd(26) + why.padStart(8));
  }
}

if (alive.length === 0) {
  console.log();
  bad('응답 가능한 모델이 하나도 없습니다.');
  info('무료 티어 혼잡(503)이라면 잠시 후 다시 실행해 보세요.');
  process.exit(1);
}

// ── 4. 폴백 체인 권고 ─────────────────────────────────────────────────────
// 사주풀이는 긴 창작 텍스트라 품질이 중요하지만, 503 하나로 서비스가 멈추면 안 된다.
// 품질 높은 순으로 시도하고 실패하면 아래로 내려가는 체인을 만든다.
step(4, '권장 폴백 체인');

const rank = (n) =>
  (n.includes('pro') ? 300 : 0) +
  (n.includes('lite') ? -100 : 0) +
  (/-(preview|exp)/.test(n) ? -20 : 0) +
  parseFloat(n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? '0') * 10;

const chain = [...alive].sort((a, b) => rank(b.model) - rank(a.model));
const fastest = [...alive].sort((a, b) => a.ttfc - b.ttfc)[0];

chain.forEach((c, i) => info(`${i + 1}순위  ${c.model.padEnd(26)} 첫 글자 ${c.ttfc}ms`));
console.log();
info(`가장 빠른 모델: \x1b[1m${fastest.model}\x1b[0m (${fastest.ttfc}ms)`);

console.log(`\n\x1b[1m\x1b[32m0단계 통과\x1b[0m — 이 키로 사주풀이 생성이 가능합니다.`);
console.log(`\nsrc/lib/gemini.ts 의 MODEL_CHAIN 기본값:\n`);
console.log(`  ${JSON.stringify(chain.map((c) => c.model))}\n`);
