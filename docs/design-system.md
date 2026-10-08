# 픽셀 디자인 시스템

카드(`public/cards/cardBase.png`), 카드 칸(`cardPlace.png`), 궁합보기 버튼(`btn*.png`)
이미지에서 실제 픽셀 색을 뽑아 정한 규칙이다. 토큰은 `src/app/globals.css` 맨 위
`--px-*` 에 있다. 새 화면 요소는 이 토큰만 쓴다.

## 색

| 토큰 | 값 | 쓰임 |
|---|---|---|
| `--px-bg` | `#548463` | 페이지 배경 (사이트 전체, 라이트·다크 공통) |
| `--px-on-bg` | `#ffffff` | 배경 위 글자 — 버튼 글씨와 같은 흰색 |
| `--px-on-bg-muted` | `rgb(255 255 255 / 0.72)` | 배경 위 보조 글자 |
| `--px-cream` | `#e0d8b0` | 카드·칸 테두리 크림, 배경 위 링크 hover, 포커스 외곽선 |
| `--px-cream-ink` | `#f3ecd0` | 짙은 초록(카드·칸) 위 글자 |
| `--px-deep` | `#133829` | 카드 바탕 |
| `--px-panel` | `#1d4e39` | 카드 안 패널 |
| `--px-line` | `#408058` | 카드 안 테두리선 |
| `--px-slot` | `#456d53` | 빈 칸 바탕 |
| `--px-outline` | `#282020` | 픽셀 외곽선 |
| `--px-btn` | `#507f61` | 버튼 기본 |
| `--px-btn-hover` | `#88b382` | 버튼 hover |
| `--px-btn-pressed` | `#375a43` | 버튼 누름 |
| `--px-btn-disabled` | `#818d81` | 버튼 비활성 |

### 오행색 (짙은 초록 위)

| 목 | 화 | 토 | 금 | 수 |
|---|---|---|---|---|
| `--px-wood` `#5fd18a` | `--px-fire` `#ff6b6b` | `--px-earth` `#e8b85a` | `--px-metal` `#cfd4dc` | `--px-water` `#5aa2ff` |

패널이 모두 짙은 초록이라 UI 공통 오행색(`--wood` 등)도 이 값을 가리킨다.

### 화면용 토큰 → 픽셀 토큰

컴포넌트는 예전부터 쓰던 화면용 토큰을 그대로 쓰고, 그 토큰이 픽셀 토큰을 가리킨다.
라이트·다크 구분 없이 한 벌이다(`color-scheme: dark`).

| 화면용 토큰 | 가리키는 값 | 쓰임 |
|---|---|---|
| `--surface` | `--px-panel` | `.card` · `.surface` 패널 바탕 |
| `--surface-sunken` | `--px-deep` | 패널 안 한 단계 낮은 칸, `.field` 바탕 |
| `--border` | `--px-line` | 패널·표 테두리 |
| `--panel-text` / `--panel-text-muted` | `--px-cream-ink` / 그 68% | 패널 안 글자 |
| `--accent` | `--px-cream` | 제목·강조 글자, 막대, 포커스 |
| `--accent-soft` | `--px-slot` | 선택된 칸, 안내 띠 바탕 |
| `--on-accent` | `--px-deep` | 크림(`--accent`) 바탕 위 글자 |

## 글자색 규칙

- **배경 위**: 흰색. 루트의 `--text` / `--text-muted` 가 `--px-on-bg` / `--px-on-bg-muted` 다.
- **패널 안**: `.card` · `.surface` · `.field` 가 `--text` / `--text-muted` 를 패널용(`--panel-text*`)으로
  되돌린다. `.card` 가 아닌 곳에 패널 바탕을 칠하면 그 요소에 `surface` 클래스를 붙인다.
- **짙은 초록(카드·칸) 위**: `--px-cream-ink`.

## 픽셀 이미지 규칙

- 늘려 쓸 때는 반드시 `image-rendering: pixelated` (`.pixelated` 클래스).
- 배율은 정수배가 가장 깔끔하다. 1.5배까지는 허용. 궁합보기 버튼은 원본(86×40) 그대로 쓴다.
- 글씨가 든 이미지 버튼은 상태별 그림(기본·hover·누름·비활성)만 바꾸고, 글자는 `sr-only` 로 남긴다.
  예: `.px-btn-compat`.
- 그림자는 흐린 그림자보다 딱딱한 오프셋 그림자가 어울린다. `.card` 는 `3px 3px 0 --px-outline`.

## 버튼

- 글씨가 고정인 대표 버튼(궁합보기)은 이미지 버튼 `.px-btn-compat`.
- 글씨가 바뀌는 버튼(로딩 문구, 다시 생성 등)은 `.px-btn` — 이미지 버튼의 4상태 색
  (`--px-btn` · `-hover` · `-pressed` · `-disabled`)을 CSS 로 옮긴 것. 글자는 흰색.
- 보조 버튼은 테두리만 있는 버튼(크림 테두리·글자)으로 둔다.

## 이미지 목록

| 파일 | 크기 | 쓰임 |
|---|---|---|
| `cardBase.png` | 1065×1476 | 카드 앞면 배경 |
| `cardSample.png` | 1065×1476 | 앞면 배치 참고용(화면에 안 씀) |
| `cardPlace.png` | 160×222 | 궁합 A/B 칸 |
| `btnDefault/Hover/Pressed/Disabled.png` | 86×40 | 궁합보기 버튼 4상태 |
