# Gemini 무료 API 연결 검증 결과 (0단계)

검증일: 2026-09-29 · 재현: `npm run check:gemini`

## 결론

무료 API 키로 사주풀이 생성이 **가능하다**. 다만 단일 모델 고정은 불가능하고
**폴백 체인이 필수**다.

## 1. 키·호출 검증

| 항목 | 결과 |
|---|---|
| `GEMINI_API_KEY` 인식 | 정상 |
| 모델 목록 조회 (`models.list`) | 61개 (텍스트 생성용 Gemini 18개) |
| `generateContent` 단발 호출 | 정상 (4.2초, 한국어 응답) |
| `generateContentStream` 스트리밍 | 정상 (청크 순차 수신) |

## 2. 무료 티어의 실제 지형 — 중요

"모델 목록에 있다"와 "실제로 쓸 수 있다"가 전혀 다르다. 목록에 나온 모델을
실제로 호출해 본 결과:

| 모델 | 결과 | 첫 글자까지 |
|---|---|---|
| `gemini-3.1-pro-preview` | **429 한도초과** | — |
| `gemini-pro-latest` | **429 한도초과** | — |
| `gemini-3.8-flash` | **503 과부하** (5회 연속 전부 실패) | — |
| `gemini-3.7-flash` | 503 과부하 | — |
| `gemini-3.6-flash` | 503 과부하 | — |
| `gemini-3.5-flash` | 측정마다 성공/실패 갈림 | 8.0초 |
| `gemini-3-flash-preview` | 성공 | 5.1~5.4초 |
| `gemini-3.5-flash-lite` | **성공 (5/5 안정)** | 0.7~1.5초 |
| `gemini-flash-lite-latest` | **성공 (안정)** | 0.8~1.3초 |

- **Pro 계열은 무료 티어에서 사실상 사용 불가** (429).
- **최신 flash 계열(3.6~3.8)은 503이 상시적**이다. 일시적 현상이라는 안내와 달리
  5회 연속 전부 실패했다.
- **lite 계열만 안정적**이고 빠르다 (첫 글자 1초 내외).

## 3. 종료된 모델

`gemini-2.5-flash` / `gemini-2.5-pro` 는 목록에는 남아 있으나 호출하면 404:

> This model models/gemini-2.5-flash is no longer available to new users.
> Please update your code to use models/gemini-3.8-flash

목록에 있다고 쓸 수 있는 게 아니라는 또 하나의 증거. 하드코딩 금지.

## 4. 설계에 반영할 것

1. **모델 폴백 체인** — `src/lib/gemini.ts` 에 품질 높은 순으로 배열을 두고,
   429/503 이면 다음 모델로 내려간다. 마지막 칸은 항상 lite (가용성 보험).

   ```ts
   const MODEL_CHAIN = [
     'gemini-3.8-flash',        // 품질 최우선, 자주 503
     'gemini-3.5-flash',
     'gemini-3-flash-preview',
     'gemini-3.5-flash-lite',   // 안정 · 빠름
     'gemini-flash-lite-latest',
   ];
   ```

2. **실패 모델 쿨다운** — 503 난 모델을 60초간 건너뛴다(in-memory). 그러지 않으면
   모든 요청이 앞단 실패 대기 비용을 반복해서 문다.

3. **환경변수 우선** — `GEMINI_MODEL` 이 지정되면 체인을 무시하고 그것만 쓴다.

4. **사용자 안내** — 체인이 전부 실패하면 "지금 Gemini 무료 티어가 혼잡합니다.
   만세력은 정상 계산됐으니 잠시 후 풀이만 다시 생성해 주세요" + 재시도 버튼.
   만세력은 LLM과 무관하게 계산되므로 풀이 실패가 페이지 전체를 죽이면 안 된다.

5. **스트리밍 필수** — 상위 모델은 첫 글자까지 5~8초가 걸린다. 스트리밍이 아니면
   수십 초 백지 화면이 된다.
