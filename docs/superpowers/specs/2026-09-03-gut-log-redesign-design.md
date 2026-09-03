# gut-log 리디자인 명세 (2026-09-03)

MVP(main 5ddd225)의 화면을 "차분한 건강 일기" 결로 전면 재설계한다. 데이터 구조·RPC·붙여넣기 검증 로직은 손대지 않는다. 바뀌는 것은 `src/app`, `src/components`, `src/app/globals.css`, `src/app/layout.tsx`, 그리고 새 DB 함수 `day_marks` 하나다.

선행 명세: `docs/superpowers/specs/2026-09-03-gut-log-design.md`. 시각 결정의 목업 원본: `.work/visual/.superpowers/brainstorm/83381-1788441318/content/`(layout-v2 · palette P3 · analysis 안 2 · form 안 A).

## 1. 확정된 결정

| 항목 | 결정 |
|---|---|
| 분위기 | 차분한 건강 일기. 여백 넓고, 포인트 색 하나, 경고 색 하나 |
| 팔레트 | P3 회백·라벤더. 경고는 흙빛 |
| 다크 모드 | `prefers-color-scheme`로 자동. `.dark` 클래스도 같이 받는다(토글 UI는 범위 밖) |
| 골격 | 하단 탭 3개(오늘·분석·설정). 오늘 탭에서만 탭바 위에 한 줄 입력 바 |
| 달력 | 오늘 화면 헤더의 버튼 → Popover 월 보기 |
| 부품 | shadcn/ui(프로젝트 안 복사) + lucide-react |
| 분석 | 가로 막대 + 평소 비율 기준선 |
| 폼 | 탭 선택형: 빠른 시각 버튼, 브리스톨 7칸 그림, 칩, 11칸 세그먼트 |
| 아이콘 | lucide 선 아이콘 9개 고정 |
| 범위 | 전체 화면 한 번에 |

## 2. 디자인 토큰

`src/app/globals.css`에 CSS 변수로 두 벌을 정의하고 Tailwind v4 `@theme inline`으로 노출한다. 클래스는 `bg-bg`, `text-ink`, `border-line`, `bg-accent` 식으로 쓴다.

| 토큰 | 밝음 | 다크 | 용도 |
|---|---|---|---|
| `--bg` | `#f4f3f8` | `#171622` | 화면 바탕 |
| `--card` | `#ffffff` | `#22212f` | 카드·시트·탭바 |
| `--ink` | `#26243a` | `#ebe9f5` | 본문 글자 |
| `--mute` | `#6c6a80` | `#9d9ab5` | 보조 글자·아이콘 |
| `--accent` | `#6b5fc7` | `#a89cf0` | 주 버튼·선택 상태·탭 활성 |
| `--accent-soft` | `#e9e6f9` | `#2e2a4a` | 아이콘 타일·질문 띠·순위 배지 |
| `--warn` | `#c85a4a` | `#ee8a78` | 설사·감시 재료·시각 확인·오류·배수 2 이상 |
| `--warn-soft` | `#f9e3df` | `#40241f` | 경고 띠·감시 칩 배경 |
| `--line` | `#e3e1ee` | `#33314a` | 1px 선·비활성 막대 |

다크 적용: `@media (prefers-color-scheme: dark) { :root:not(.light) {...} }` 와 `:root.dark {...}` 두 블록. `<meta name="theme-color">`도 두 벌(`media` 속성).

글꼴: Pretendard Variable woff2를 `public/fonts/`에 동봉하고 `@font-face`(display: swap). 대체 `-apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`. 크기 단계 12·14·16·20·24px, 본문 14, 카드 제목 16(semibold), 화면 제목 20(bold), 날짜 헤더 24(bold, letter-spacing -0.01em).

모서리: 카드 16px, 버튼·입력 12px, 알약 999px, 아이콘 타일 10px. 여백: 화면 좌우 16px, 카드 사이 8px, 절 사이 24px. 그림자 없음, 선 1px `--line`. 시트만 위쪽 그림자 `0 -10px 30px rgba(0,0,0,.15)`.

## 3. 부품

### shadcn/ui
`npx shadcn@latest init`(Tailwind v4, CSS variables, base color neutral) 뒤 다음만 추가: `button`, `sheet`, `tabs`(사용 안 하면 제거), `select`, `popover`, `calendar`, `badge`, `input`, `textarea`. shadcn 기본 변수(`--primary` 등)는 2절 토큰에 매핑한다(`--primary: var(--accent)`, `--destructive: var(--warn)`, `--background: var(--bg)`, `--card: var(--card)`, `--muted-foreground: var(--mute)`, `--border: var(--line)`).

### 자체 부품 (`src/components/ui/` 아래)
| 부품 | 역할 |
|---|---|
| `KindIcon` | kind → lucide 아이콘 + 타일 배경. 식사 `UtensilsCrossed`, 배변 `Droplets`, 수면 `Moon`, 증상 `Activity`, 스트레스 `Zap`, 운동 `Footprints`, 약 `Pill`, 월경 `CircleDot`, 메모 `StickyNote`. `KIND_ICON`(이모지 문자열)은 제거 |
| `Chip` | 선택 가능한 알약. `tone: default \| warn \| accent`, `selected` |
| `Segment10` | 0~10 열한 칸. `value: number \| null`, `onChange` |
| `BristolScale` | 1~7 그림 칸. 각 칸 SVG + 숫자 + 한 글자 설명(딱딱·울퉁·금간·매끈·무른·죽·물). 6·7은 흙빛 |
| `QuickTime` | 지금·아침(08:00)·점심(12:30)·저녁(19:00)·직접. "직접"은 Popover(달력 + `<input type=time>`). 선택 결과는 ISO와 `time_precision`(빠른 버튼은 `approx`, 지금·직접은 `exact`) |
| `TagEditor` | 기존 것을 Chip 기반으로 교체. 감시 재료 자동완성을 위에 먼저 |
| `TabBar` | 하단 3탭. `usePathname`으로 활성. 안전 영역 `pb-[env(safe-area-inset-bottom)]` |
| `PageHeader` | 화면 제목 + 오른쪽 액션 슬롯 |
| `EmptyState` | 아이콘 + 한 줄 + 보조 한 줄 |

## 4. 골격과 라우팅

- `src/app/layout.tsx`: `<body class="bg-bg text-ink">`, 폰트 클래스, `<TabBar>`는 `(app)` 그룹 레이아웃에서만. 라우트 그룹: `src/app/(app)/{page,analysis,settings,entries}` 와 `src/app/(auth)/{login,auth/callback}`.
- `/export`는 `/settings#export`로 `redirect()`.
- 탭바 높이 64px. 오늘 화면의 본문 `pb-[152px]`(입력 바 + 탭바), 다른 화면 `pb-[80px]`.

## 5. 화면

### 5.1 오늘(`/`)
- 헤더: 큰 날짜 `9월 3일 목`(24px bold) + 부제 `오늘 · 기록 4건` / `어제` / `9월 1일`(오늘·어제만 말로, 나머지는 날짜). 오른쪽에 `‹` `›` 아이콘 버튼과 `CalendarDays` 버튼.
- 달력 Popover: shadcn Calendar(ko 로케일, 월요일 시작). 날짜 아래 점: 기록 있음 = accent, 설사 있음 = warn(둘 다면 warn). 데이터는 `day_marks(p_from, p_to)` RPC(6절). 날짜 선택 → 그 날로 이동, Popover 닫힘.
- 카드(`EntryCard` 재작성): `[KindIcon 32px] [본문 16 semibold / 보조 12 mute] [시각 12 mute]`. 시각 뒤 `대략`은 `Badge` warn-soft. 재료 칩은 감시만 warn, 나머지 line. 카드 전체가 `<Link>`.
- 빈 상태: `EmptyState`(아이콘 `Mic`, "아직 기록이 없어요", "아래에서 말로 적어 보세요").
- 입력 바: 탭바 위 12px, 알약. 왼쪽 `Mic` 아이콘 + "말로 적기…"(mute), 오른쪽 accent 원형 `Plus`. 왼쪽 영역 탭 → 입력 시트, `Plus` → 폼 시트. `PendingBanner`는 헤더 아래.

### 5.2 입력 시트 (`InputSheet`, 기존 `InputBar` 대체)
- shadcn Sheet(side bottom, 높이 최대 90dvh, 드래그 핸들).
- 상단 단계 표시: `1 말하기` `2 프롬프트 복사` `3 결과 붙여넣기` 세 칸. 현재 단계 accent-soft.
- 1: 텍스트 영역(placeholder 유지, `data-testid=input-text`), 자동 포커스.
- 2: `[프롬프트 복사]` accent 버튼(`data-testid=copy-prompt`). 복사 성공 시 문구 `복사됨 ✓ 자기 LLM에 붙여넣기`로 4초, 그리고 3단계 영역 펼침. 복사 실패 시 프롬프트 전문 접기 표시(기존 동작).
- 3: 붙여넣기 텍스트 영역(`data-testid=paste-text`, mono 12px) + `[확인 시트로]`(`data-testid=submit-paste`). 오류는 이 칸 바로 아래 warn 띠(`role=alert`).
- 시트를 닫아도 1·3의 입력값은 유지(컴포넌트 상태를 부모에 둔다).

### 5.3 확인 시트 (`ConfirmSheet`)
- 같은 Sheet. 제목 `확인 후 저장`(20 bold). 질문 띠 accent-soft, 무효 항목 띠 warn-soft.
- 카드는 `EntryCard`와 같은 부품에 `tone`만(`warn` 테두리 = approx 또는 미래 시각, `error` = unknown).
- 카드 탭 → 아래로 `EntryEditor` 펼침(기존 동작). 편집기 부품은 5.4의 것.
- 하단 고정: `[저장 (N건)]` accent, 보류 있으면 `· N건 보류`. `[원문 보기]` 텍스트 버튼.
- `data-testid=confirm-sheet`, `save-entries` 유지.

### 5.4 폼 시트와 편집기 (`EntryForm`)
- 종류 고르기: 3×3 격자, 각 칸 `KindIcon` 40px + 라벨. `data-testid=kind-<kind>` 유지.
- 편집기 공통: 맨 위 `QuickTime`. `data-testid=edit-time`은 "직접" Popover 안의 시간 입력에 붙인다.
- 식사: 끼니 Chip 4개(단일 선택), 음식 카드(이름 입력 + `TagEditor`), `+ 음식`, 식사 패턴 Chip 5개(복수).
- 증상: 종류 Chip 8개, 강도 `Segment10`.
- 배변: `BristolScale`, Chip 3개(급했음·야간·혈변, 복수).
- 수면: 질 `Segment10`, 시간 숫자 입력(선택).
- 스트레스: `Segment10`, 원인 입력.
- 운동: 종류 Chip 7개, 분 숫자 입력, 강도 Chip 3개.
- 약: 이름·용량 입력. 월경: Chip 4개. 메모: 텍스트 영역.
- 하단 `[저장]` accent. `/entries/new`와 `/entries/[id]`는 이 편집기를 페이지 안에 그대로 쓴다(시트 아님). `data-testid=form-save` 유지.

### 5.5 분석(`/analysis`)
- `PageHeader` `용의자 순위`, 부제 `설사 · 최근 30일 · 8시간 창`.
- 필터 알약 세 개(각각 Select 트리거): 표적 4종, 기간 14·30·60·90, 창 2·4·8·24.
- 범례 한 줄: `■ 먹은 뒤 설사 비율 · │ 평소 비율 NN%`. 행의 기준선 = `baselineOf(row) = (exposed_hits + control_hits) / (exposed_n + control_n)`. 이 값은 식사 행끼리는 전부 같고(전체 식사 중 hit 비율) 날 행끼리도 전부 같다(전체 날 중 hit 비율). 범례의 NN%는 식사 행 기준선을 쓰고, 날 단위 행은 행 옆에 `날 기준` 작은 배지를 붙인다.
- 행: `[이름 12 semibold / N번 먹음 9 mute] [막대: 폭 = exposed_hits/exposed_n, 색 = 배수 ≥2 warn, 1~2 accent 60%, <1 line; 기준선 = 위 비율 위치에 2px ink] [배수 14 bold]`. `enough=false`는 40% 투명 + `자료 부족`. `ratio=null`은 `비교 불가`.
- 행 탭 → 아래로 상세 펼침(노출 시각 → 표적 시각/없음 목록). 한 번에 하나만 펼침.
- 빈 상태: `기간 안에 기록이 없습니다`. 전부 자료 부족이면 상단에 `노출이 3번 이상 쌓이면 배수가 나옵니다` 안내(mute).
- 하단 고정 문구 유지: `연관은 가설입니다. 확인은 한 가지씩 3일 재도입으로.`
- `data-testid=ranking-row` 유지.

### 5.6 설정(`/settings`)
- 절 카드 3개: `초대 이메일`(입력 + 추가, 목록은 이메일·초대일), `시간대`(Select), `내보내기`(`id=export`, 기간 두 개 + `[CSV 내려받기]`). 그 아래 `프롬프트 원문` 접기, `[로그아웃]` 테두리 버튼.
- 초대 목록의 `@test.local` 잔재는 로컬 DB에서 지운다(`delete from invites where email like '%@test.local'`). E2E는 실행 뒤 자기 초대를 지우도록 `helpers.ts`에 정리 함수 추가.

### 5.7 로그인(`/login`)
- 세로 가운데. 앱 이름 `장 기록`(24 bold) + `설사 유발요인을 찾는 일기`(14 mute). 이메일 입력 + `[로그인 링크 받기]` accent. 발송 후 accent-soft 띠. 실패·미초대는 warn-soft 띠(`role=alert`). `?error=link` 안내 유지.

## 6. DB 추가

```sql
create or replace function public.day_marks(p_from date, p_to date)
returns table(day date, has_entry boolean, has_target boolean)
```
사용자 시간대(`profiles.timezone`)로 날짜를 묶어 기간 안 각 날의 기록 유무와 설사(bristol ≥ 6) 유무를 돌려준다. RLS는 `auth.uid()`. pgTAP 테스트 1파일(시드 3일: 기록만 있는 날, 설사 있는 날, 없는 날).

## 7. 테스트

- 기존 유닛 63·pgTAP 48은 수정 없이 통과. `summarizeEntry`·`formatRatio`·`entriesToCsv` 테스트가 참조하는 함수 이름은 유지.
- 새 유닛: `QuickTime`이 돌려주는 ISO·precision(빠른 버튼 4개 + 지금), `BristolScale` 값 매핑, 분석 기준선 계산 함수 `baselineOf(row)`.
- pgTAP: `day_marks` 1파일.
- E2E: 기존 두 시나리오를 새 골격에 맞춰 갱신(입력 바 탭 → 시트 → 3단계). `data-testid`는 위 목록대로 유지·이관.
- 손검사(사용자 게이트): iOS Safari 홈화면 앱에서 다크 모드, 하단 안전 영역, 키보드 올라올 때 시트, 달력 Popover.
- 완성 뒤 `better-interface`로 종합 리뷰 1회, 나온 항목은 판정 후 반영.

## 8. 범위 밖
- 애니메이션 정교화(시트 열림 기본 트랜지션만), 수동 다크 토글 UI, 온보딩, 위젯·알림, 분석 상세의 그래프화, 데이터 구조·RPC 변경(`day_marks` 제외).
