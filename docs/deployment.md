# 배포

이 앱은 **특정 호스팅에 묶여 있지 않다.** Vercel 전용 API를 쓰지 않고, 표준 Next.js 로만
만들었다. 옮길 때 고려할 것은 아래 세 가지뿐이다.

| 고려할 것 | 왜 |
| --- | --- |
| 환경변수 | 키와 비밀번호를 전부 여기로 받는다 |
| 프롬프트 저장 | 디스크에 쓸 수 있는 환경인지에 따라 달라진다 |
| 함수 실행시간 | 풀이 스트리밍이 최대 2분까지 간다 |

---

## 환경변수

| 이름 | 필수 | 설명 |
| --- | --- | --- |
| `GEMINI_API_KEY` | 예 | [Google AI Studio](https://aistudio.google.com/apikey) 키. 없으면 만세력은 되고 풀이만 안 된다 |
| `ADMIN_PASSWORD` | 예 | `/admin` 프롬프트 편집 비밀번호 |
| `GEMINI_MODEL` | 아니오 | 모델 고정. 비우면 폴백 체인을 쓴다 ([gemini-findings.md](gemini-findings.md)) |
| `SAJU_PROMPT_READING` | 아니오 | 개인 사주풀이 프롬프트를 통째로 덮어쓴다 |
| `SAJU_PROMPT_COMPATIBILITY` | 아니오 | 궁합 풀이 프롬프트를 통째로 덮어쓴다 |
| `PROMPT_STORE` | 아니오 | `file` \| `memory` \| (비움 = 자동 판별) |
| `PROMPT_DATA_DIR` | 아니오 | 프롬프트 수정본을 둘 디렉터리. 기본 `./data` |
| `UPSTASH_REDIS_REST_URL` | 서버리스면 예 | 사람 카드 저장소. Vercel 마켓플레이스에서 Upstash 를 붙이면 자동 주입된다 |
| `UPSTASH_REDIS_REST_TOKEN` | 서버리스면 예 | 위와 한 쌍. `KV_REST_API_*` 이름으로 와도 받는다 |
| `PROFILE_STORE` | 아니오 | `redis` \| `file` \| `memory` \| (비움 = 자동 판별) |
| `PROFILE_DATA_DIR` | 아니오 | 파일 저장소를 쓸 때의 디렉터리. 기본 `./data` |

`.env.example` 을 복사해서 채우면 된다.

---

## 프롬프트 저장 — 호스팅마다 다른 지점

관리자가 `/admin` 에서 고친 프롬프트를 어디에 둘지는 `src/lib/promptStore.ts` 가 정한다.
따로 지정하지 않으면 **디스크에 실제로 써 보고** 되면 파일, 안 되면 메모리를 쓴다.

| 환경 | 저장소 | 결과 |
| --- | --- | --- |
| 로컬 개발 | 파일 (`./data`) | 재시작해도 남는다 |
| 도커 (볼륨 있음) | 파일 | 남는다 |
| 도커 (볼륨 없음) | 파일 | 컨테이너를 지우면 사라진다 |
| **Vercel 등 서버리스** | **메모리** | **재시작·인스턴스 교체 시 사라진다** |

서버리스에서는 파일시스템이 읽기 전용이고 `/tmp` 는 인스턴스마다 따로라, 저장해도 다음 요청이
다른 인스턴스로 가면 예전 값이 나온다. 그래서 **관리자 화면이 이 사실을 먼저 알려 준다** —
저장 버튼을 눌러도 "이번 실행 동안만 적용된다"고 표시된다.

서버리스에서 프롬프트를 확실히 바꾸는 방법은 둘이다.

1. `prompts/default.md` · `prompts/compatibility.md` 를 고쳐서 **커밋**한다 (권장)
2. `SAJU_PROMPT_READING` / `SAJU_PROMPT_COMPATIBILITY` **환경변수**에 전문을 넣는다

두 번째가 급할 때 쓰기 좋다. 환경변수는 저장소보다 우선한다.

### 나중에 KV·DB 로 바꾸려면

`promptStore.ts` 에 `PromptStore` 구현 하나를 더하고 `createStore()` 에 분기를 추가하면
끝이다. 읽기·쓰기가 이미 `async` 라서 부르는 쪽은 손대지 않아도 된다.

```ts
class KvPromptStore implements PromptStore {
  readonly name = 'KV';
  readonly durable = true;
  async read(kind) { /* … */ }
  async write(kind, text) { /* … */ }
  async clear(kind) { /* … */ }
}
```

---

## 사람 카드 저장 — 개인정보가 들어간다

궁합 화면의 사람 카드는 **서버**에 저장된다. 여기에는 타인의 생년월일이 담기므로
다루는 방식을 분명히 해 둔다.

| 무엇을 | 어떻게 |
| --- | --- |
| 카드 목록 | **이름과 메모만** 내보낸다. 생년월일은 서버 밖으로 나가지 않는다 |
| 수정·삭제 | 생년월일(YYMMDD)을 맞혀야 한다. 시도는 10분에 8번으로 제한 |
| 궁합 결과 | 입력 원문·계산 근거·대운·세운·생년을 모두 뺀 축소본만 보낸다 |
| 보관 기간 | 마지막 사용 후 **30일**이 지나면 자동 삭제 (Redis TTL) |

**완전히 감춰지지는 않는다.** 사주 네 기둥 자체가 태어난 해와 날짜를 상당히 좁혀 준다.
만세력을 보여 주는 이상 피할 수 없고, 생년월일로 거는 잠금도 경우의 수가 3만 남짓이라
횟수 제한이 없으면 뚫린다. 그래서 제한을 두는 쪽에 무게를 뒀다.

저장소는 `src/lib/profileStore.ts` 가 고른다. Upstash 자격증명이 있으면 Redis,
없으면 디스크에 써 보고, 그것도 안 되면 메모리로 떨어진다.

### Vercel 에서 Upstash 붙이기

1. 프로젝트 → **Storage** → **Marketplace** → Upstash Redis 생성
2. 프로젝트에 연결하면 `UPSTASH_REDIS_REST_URL`·`UPSTASH_REDIS_REST_TOKEN` 이 자동으로 들어온다
3. 재배포

붙이지 않으면 서버리스에서는 메모리로 떨어져 **재시작할 때마다 카드가 사라진다.**
그 상태를 화면과 `/api/health` 가 알려 준다.

### 다른 저장소로 바꾸려면

`profileStore.ts` 에 `ProfileStore` 구현을 하나 더하고 `createStore()` 에 분기를 넣으면 된다.
읽기·쓰기가 이미 `async` 라서 부르는 쪽은 손대지 않아도 된다.

---

## Vercel

저장소가 이미 GitHub 에 있으므로 대시보드에서 연결하는 쪽이 가장 간단하다. 이후 `main` 에
푸시할 때마다 자동 배포된다.

1. [vercel.com/new](https://vercel.com/new) → `workminkyoung/imsaju` 가져오기
2. 프레임워크는 **Next.js** 로 자동 인식된다. 빌드 설정은 건드릴 것이 없다
3. **Environment Variables** 에 `GEMINI_API_KEY` 와 `ADMIN_PASSWORD` 를 넣는다
4. Deploy

CLI 로 하려면:

```bash
npx vercel login
npx vercel link
npx vercel env add GEMINI_API_KEY production
npx vercel env add ADMIN_PASSWORD production
npx vercel --prod
```

`vercel.json` 은 일부러 두지 않았다. 벤더 설정 파일이 생기면 옮길 때 짐이 된다.
함수 실행시간은 각 라우트의 `maxDuration` 으로 지정하는데, 이건 Next.js 표준 문법이라
다른 호스팅에서도 무시될 뿐 문제를 일으키지 않는다.

> Vercel Hobby 플랜의 함수 실행시간 상한은 300초라 지금 설정(120초)은 그대로 쓸 수 있다.

---

## 도커 (Railway · Render · Fly · 직접 운영)

```bash
docker build -t imsaju .
docker run -p 3000:3000 --env-file .env.local -v imsaju-data:/app/data imsaju
```

볼륨(`-v imsaju-data:/app/data`)을 붙이면 관리자가 고친 프롬프트가 재시작 후에도 남는다.

`BUILD_STANDALONE=1` 은 Dockerfile 안에서 켜진다. Next.js 의 standalone 출력이라
실행 이미지에 `node_modules` 를 통째로 넣지 않아도 된다.

헬스체크는 `GET /api/health`. 키가 설정됐는지, 프롬프트 저장소가 무엇인지 알려 주되
**값은 내보내지 않는다.**

```json
{
  "ok": true,
  "manseryeok": "ok",
  "gemini": "configured",
  "adminConfigured": true,
  "promptStorage": { "name": "파일 (/app/data)", "durable": true }
}
```

---

## 옮긴 뒤 확인할 것

1. `GET /api/health` 가 `gemini: "configured"` 를 주는지
2. `/saju` 에서 만세력이 나오는지 — **Gemini 키 없이도 되어야 한다**
3. 「사주풀이 생성」이 스트리밍되는지 (첫 글자까지 몇 초 걸릴 수 있다)
4. `/compatibility` 에서 카드 선택 → 궁합 → 풀이
5. `/admin` 로그인 → 저장소 경고 문구가 그 환경에 맞게 뜨는지
6. 풀이가 중간에 끊기면 안내가 뜨는지 (무료 티어에서는 실제로 종종 끊긴다)
