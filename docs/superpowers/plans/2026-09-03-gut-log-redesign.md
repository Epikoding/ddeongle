# gut-log 리디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** MVP(main 5ddd225 이후, 명세 커밋 a7ed007)의 화면 전부를 "차분한 건강 일기"(P3 회백·라벤더, 하단 탭 3개, shadcn/ui, 탭형 폼, 막대 분석)로 다시 입힌다.

**Architecture:** 데이터·RPC·붙여넣기 검증·큐 로직은 손대지 않는다. `globals.css`에 토큰 두 벌(밝음·다크)을 CSS 변수로 두고 Tailwind v4 `@theme`로 노출한다. shadcn/ui를 프로젝트 안에 복사해 토큰에 매핑하고, 자체 부품(`src/components/ui/*`)을 만든 뒤 화면을 라우트 그룹 `(app)`·`(auth)`로 나눠 다시 그린다. 달력 점을 위한 DB 함수 `day_marks` 하나만 추가한다.

**Tech Stack:** Next.js 16.3, React 19, Tailwind v4, shadcn/ui 4.x(radix-ui, class-variance-authority, lucide-react, react-day-picker, date-fns), vitest 4, Playwright, Supabase CLI(pgTAP).

**Spec:** `/Users/dj/dev/gut-log/docs/superpowers/specs/2026-09-03-gut-log-redesign-design.md` (목업 원본: `/Users/dj/dev/gut-log/.work/visual/.superpowers/brainstorm/83381-1788441318/content/`)

## Global Constraints

- 토큰 9개 이름·값은 명세 2절 표 그대로: `--bg --card --ink --mute --accent --accent-soft --warn --warn-soft --line`. 클래스는 `bg-bg text-ink border-line bg-accent …`.
- 다크는 `@media (prefers-color-scheme: dark) { :root:not(.light) }` + `:root.dark`. 컴포넌트에서 `dark:` 유틸리티를 쓰지 않는다 — 변수만 바뀌게 한다.
- 글꼴 Pretendard Variable, `public/fonts/PretendardVariable.woff2` 동봉. 크기 단계 12·14·16·20·24.
- 모서리: 카드 16px(`rounded-2xl`), 버튼·입력 12px(`rounded-xl`), 알약 `rounded-full`, 아이콘 타일 10px(`rounded-[10px]`). 화면 좌우 16px, 카드 사이 8px. 그림자는 시트만.
- 이모지 아이콘 금지. `KIND_ICON`(문자열)은 삭제하고 `KindIcon` 컴포넌트만 쓴다.
- 유지할 공개 함수: `summarizeEntry`, `timeLabel`(EntryCard) · `formatRatio`, `GRP_LABEL`(RankingTable) · `toLocalInput`, `fromLocalInput`, `blankEntry`, `KindPicker`, `EntryEditor`(EntryForm). 기존 유닛 테스트 파일 12개는 수정 없이 통과해야 한다.
- 유지할 `data-testid`: `input-text copy-prompt paste-text submit-paste confirm-sheet save-entries kind-<kind> edit-time form-save ranking-row food-name food-remove tag-input pattern-<p>`. 새로 추가: `open-input`(입력 바 마이크 영역), `open-form`(입력 바 ＋), `calendar-button`.
- ConfirmSheet의 상태·`save()` 로직(재검증·보류·client_id 회전·큐)은 한 글자도 바꾸지 않는다. JSX만 교체.
- 커밋 메시지에 attribution 줄을 넣지 않는다. 브랜치 `feature/redesign`.
- 부산물은 `/Users/dj/dev/gut-log/.work/`. 검증은 `npm test && supabase test db && npm run build && npm run test:e2e`를 `&&` 체인 그대로.
- 로컬 Supabase·Docker가 떠 있어야 한다(`open -a Docker; supabase start`).

---

## 파일 구조

```
src/app/
├── globals.css                     토큰 두 벌 + shadcn 변수 매핑 + @font-face   (Task 1)
├── layout.tsx                      폰트·theme-color 두 벌·SwRegister              (Task 1)
├── (auth)/login/page.tsx           로그인 재작성                                 (Task 9)
├── (auth)/auth/callback/route.ts   이동만                                        (Task 3)
├── (app)/layout.tsx                TabBar 포함                                   (Task 3)
├── (app)/page.tsx                  오늘                                          (Task 5)
├── (app)/entries/new/page.tsx      폼 페이지                                     (Task 7)
├── (app)/entries/[id]/page.tsx     수정 페이지                                   (Task 7)
├── (app)/analysis/page.tsx         분석                                          (Task 8)
├── (app)/settings/page.tsx         설정(+내보내기)                               (Task 9)
└── export/page.tsx                 redirect('/settings#export')                  (Task 3)
src/components/
├── ui/                             shadcn 산출(button sheet select popover calendar badge input textarea) (Task 1)
├── ui/KindIcon.tsx                                                               (Task 1)
├── ui/Chip.tsx · Segment10.tsx · BristolScale.tsx · QuickTime.tsx · TagEditor.tsx · EmptyState.tsx · PageHeader.tsx (Task 2)
├── TabBar.tsx                                                                    (Task 3)
├── EntryCard.tsx                   재작성(summarizeEntry·timeLabel 유지)          (Task 5)
├── DayPicker.tsx                   달력 Popover                                  (Task 5)
├── InputBar.tsx                    알약 한 줄(트리거만)                            (Task 5)
├── InputSheet.tsx                  3단계 시트(옛 InputBar 로직 이관)               (Task 6)
├── ConfirmSheet.tsx                JSX 교체                                      (Task 6)
├── PendingBanner.tsx               재스킨                                        (Task 5)
├── EntryForm.tsx                   재작성(exports 유지)                           (Task 7)
└── RankingTable.tsx                RankingBars로 재작성(formatRatio·GRP_LABEL 유지) (Task 8)
src/lib/
├── quick-time.ts                   빠른 시각 순수 함수                            (Task 2)
├── baseline.ts                     baselineOf                                    (Task 8)
└── db.ts                           dayMarks 추가                                 (Task 4)
supabase/migrations/20260903001000_day_marks.sql · supabase/tests/009_day_marks.test.sql (Task 4)
public/fonts/PretendardVariable.woff2 (Task 1)
tests/unit/kind-icon.test.ts · quick-time.test.ts · bristol.test.ts · baseline.test.ts (Task 1·2·8)
e2e/flow.spec.ts · e2e/helpers.ts 갱신 (Task 10)
```

---

### Task 1: 토큰·폰트·shadcn 초기화·KindIcon

**Files:**
- Modify: `src/app/globals.css`(전체 교체), `src/app/layout.tsx`(전체 교체), `package.json`(shadcn이 추가), `.gitignore`(변경 없음 확인)
- Create: `components.json`(shadcn), `src/components/ui/{button,sheet,select,popover,calendar,badge,input,textarea}.tsx`(shadcn), `src/lib/utils.ts`(shadcn `cn`), `src/components/ui/KindIcon.tsx`, `public/fonts/PretendardVariable.woff2`, `tests/unit/kind-icon.test.ts`

**Interfaces:**
- Produces: 토큰 클래스(`bg-bg` 등), `cn()`, shadcn 부품, `KindIcon`:
  ```ts
  export const KIND_LUCIDE: Record<Kind, LucideIcon>
  export function KindIcon({ kind, size = 32, className }: { kind: Kind; size?: 24 | 32 | 40; className?: string }): JSX.Element
  // 타일: rounded-[10px], 배경 bg-accent-soft(기본) / 배변·증상은 bg-warn-soft, 아이콘 크기 size*0.5, 색 text-ink
  ```
- Consumes: `Kind`, `KINDS` from `@/lib/schemas`.

- [ ] **Step 1: 브랜치와 shadcn 초기화**

```bash
cd /Users/dj/dev/gut-log && git checkout -b feature/redesign
npx --yes shadcn@latest init --yes --defaults --base-color neutral --css-variables
npx --yes shadcn@latest add button sheet select popover calendar badge input textarea --yes --overwrite
npm install lucide-react
ls src/components/ui && cat components.json | head -20
```
Expected: `components.json`의 `aliases.components`가 `@/components`, `utils`가 `@/lib/utils`. `src/components/ui/`에 8개 파일. `tw-animate-css`가 devDependencies에 추가됨.

- [ ] **Step 2: 폰트 동봉**

```bash
cd /Users/dj/dev/gut-log && mkdir -p public/fonts && curl -sSL -o public/fonts/PretendardVariable.woff2 https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/web/variable/woff2/PretendardVariable.woff2 && ls -la public/fonts
```
Expected: 약 2MB 파일. (서브셋은 범위 밖 — 서비스워커가 `/fonts/`도 캐시하도록 Task 3에서 `sw.js` 목록에 추가한다.)

- [ ] **Step 3: 실패 테스트**

`tests/unit/kind-icon.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { KindIcon, KIND_LUCIDE } from '@/components/ui/KindIcon'
import { KINDS } from '@/lib/schemas'

describe('KindIcon', () => {
  it('9종 전부 lucide 아이콘이 있다', () => {
    for (const k of KINDS) expect(KIND_LUCIDE[k], k).toBeTypeOf('object')
  })
  it('svg를 그리고 이모지가 없다', () => {
    const html = renderToStaticMarkup(createElement(KindIcon, { kind: 'meal' }))
    expect(html).toContain('<svg')
    expect(html).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u)
  })
  it('배변·증상은 경고 타일', () => {
    expect(renderToStaticMarkup(createElement(KindIcon, { kind: 'bowel' }))).toContain('bg-warn-soft')
    expect(renderToStaticMarkup(createElement(KindIcon, { kind: 'sleep' }))).toContain('bg-accent-soft')
  })
})
```

- [ ] **Step 4: 실패 확인**

```bash
cd /Users/dj/dev/gut-log && npm test
```
Expected: kind-icon.test.ts FAIL(모듈 없음).

- [ ] **Step 5: globals.css 전체 교체**

`src/app/globals.css`:
```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@font-face {
  font-family: "Pretendard Variable";
  src: url("/fonts/PretendardVariable.woff2") format("woff2-variations");
  font-weight: 45 920;
  font-style: normal;
  font-display: swap;
}

/* ── gut-log 토큰 (명세 §2) ── */
:root {
  --bg: #f4f3f8;
  --card: #ffffff;
  --ink: #26243a;
  --mute: #6c6a80;
  --accent: #6b5fc7;
  --accent-soft: #e9e6f9;
  --warn: #c85a4a;
  --warn-soft: #f9e3df;
  --line: #e3e1ee;
  --radius: 0.75rem;
}
@media (prefers-color-scheme: dark) {
  :root:not(.light) {
    --bg: #171622; --card: #22212f; --ink: #ebe9f5; --mute: #9d9ab5;
    --accent: #a89cf0; --accent-soft: #2e2a4a; --warn: #ee8a78; --warn-soft: #40241f; --line: #33314a;
  }
}
:root.dark {
  --bg: #171622; --card: #22212f; --ink: #ebe9f5; --mute: #9d9ab5;
  --accent: #a89cf0; --accent-soft: #2e2a4a; --warn: #ee8a78; --warn-soft: #40241f; --line: #33314a;
}

/* ── shadcn 변수 → 토큰 매핑 ── */
:root, :root.dark, :root:not(.light) {
  --background: var(--bg);
  --foreground: var(--ink);
  --card-foreground: var(--ink);
  --popover: var(--card);
  --popover-foreground: var(--ink);
  --primary: var(--accent);
  --primary-foreground: #ffffff;
  --secondary: var(--accent-soft);
  --secondary-foreground: var(--ink);
  --muted: var(--line);
  --muted-foreground: var(--mute);
  --accent-shadcn: var(--accent-soft);
  --destructive: var(--warn);
  --border: var(--line);
  --input: var(--line);
  --ring: var(--accent);
}

@theme inline {
  --font-sans: "Pretendard Variable", -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;

  --color-bg: var(--bg);
  --color-card: var(--card);
  --color-ink: var(--ink);
  --color-mute: var(--mute);
  --color-accent: var(--accent);
  --color-accent-soft: var(--accent-soft);
  --color-warn: var(--warn);
  --color-warn-soft: var(--warn-soft);
  --color-line: var(--line);

  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  --radius-sm: 0.5rem;
  --radius-md: 0.75rem;
  --radius-lg: 1rem;
  --radius-xl: 1.25rem;
}

@layer base {
  * { @apply border-line; }
  html { color-scheme: light dark; }
  body { @apply bg-bg text-ink font-sans antialiased; font-size: 14px; }
}
```

주의: shadcn init이 만든 `globals.css`의 `--accent` 변수는 우리 토큰 이름과 충돌한다. 위 파일에서 shadcn의 accent는 `--accent-shadcn`으로 바꿨으므로, shadcn 부품 안의 `bg-accent`·`text-accent-foreground`는 우리 라벤더를 쓰게 된다(호버 배경이 진해지는 정도라 허용). `--color-accent-foreground`는 정의하지 않아 `text-accent-foreground`가 무시된다 — `src/components/ui/select.tsx`·`popover.tsx`·`calendar.tsx`에서 `text-accent-foreground`를 `text-ink`로, `bg-accent`(호버 항목)를 `bg-accent-soft`로 치환한다:
```bash
cd /Users/dj/dev/gut-log && sed -i '' -e 's/text-accent-foreground/text-ink/g' -e 's/focus:bg-accent /focus:bg-accent-soft /g' -e 's/hover:bg-accent /hover:bg-accent-soft /g' -e 's/data-\[state=open\]:bg-accent /data-[state=open]:bg-accent-soft /g' src/components/ui/select.tsx src/components/ui/calendar.tsx src/components/ui/button.tsx
grep -n 'bg-accent\b' src/components/ui/*.tsx || echo "no bare bg-accent left"
```

- [ ] **Step 6: layout.tsx 전체 교체**

`src/app/layout.tsx`:
```tsx
import type { Metadata, Viewport } from 'next'
import { SwRegister } from '@/components/SwRegister'
import './globals.css'

export const metadata: Metadata = { title: '장 기록', description: '설사 유발요인을 찾는 일기' }
export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f3f8' },
    { media: '(prefers-color-scheme: dark)', color: '#171622' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-dvh"><SwRegister />{children}</body>
    </html>
  )
}
```

- [ ] **Step 7: KindIcon**

`src/components/ui/KindIcon.tsx`:
```tsx
import { UtensilsCrossed, Droplets, Moon, Activity, Zap, Footprints, Pill, CircleDot, StickyNote, type LucideIcon } from 'lucide-react'
import type { Kind } from '@/lib/schemas'
import { cn } from '@/lib/utils'

export const KIND_LUCIDE: Record<Kind, LucideIcon> = {
  meal: UtensilsCrossed, bowel: Droplets, sleep: Moon, symptom: Activity, stress: Zap,
  exercise: Footprints, medication: Pill, cycle: CircleDot, note: StickyNote,
}

const WARN_KINDS: Kind[] = ['bowel', 'symptom']

export function KindIcon({ kind, size = 32, className }: { kind: Kind; size?: 24 | 32 | 40; className?: string }) {
  const Icon = KIND_LUCIDE[kind]
  const tile = WARN_KINDS.includes(kind) ? 'bg-warn-soft' : 'bg-accent-soft'
  return (
    <span aria-hidden className={cn('inline-flex shrink-0 items-center justify-center rounded-[10px] text-ink', tile, className)}
      style={{ width: size, height: size }}>
      <Icon size={Math.round(size * 0.5)} strokeWidth={1.75} />
    </span>
  )
}
```

`src/lib/schemas.ts`에서 `KIND_ICON` 선언(맨 아래 `export const KIND_ICON: Record<Kind, string> = {...}` 블록)을 삭제한다. 이 시점에 `EntryCard.tsx`·`EntryForm.tsx`가 `KIND_ICON`을 import하므로 빌드가 깨진다 — 두 파일에서 import만 `KindIcon`으로 바꾸고 사용처를 `<KindIcon kind={...} size={24} />`로 바꿔 임시로 통과시킨다(Task 5·7에서 어차피 재작성).

- [ ] **Step 8: 통과 확인**

```bash
cd /Users/dj/dev/gut-log && npm test && npm run build
```
Expected: 유닛 66(기존 63 + 3), 빌드 성공. `npm run dev`로 열면 바탕이 `#f4f3f8`, 글꼴이 Pretendard로 바뀌어 있어야 한다(개발자 도구 computed font-family).

- [ ] **Step 9: Commit**

```bash
cd /Users/dj/dev/gut-log && git add -A && git commit -m "feat(ui): 디자인 토큰, Pretendard, shadcn 초기화, KindIcon"
```

---

### Task 2: 자체 부품 7개와 빠른 시각 함수

**Files:**
- Create: `src/lib/quick-time.ts`, `src/components/ui/Chip.tsx`, `src/components/ui/Segment10.tsx`, `src/components/ui/BristolScale.tsx`, `src/components/ui/QuickTime.tsx`, `src/components/ui/TagEditor.tsx`, `src/components/ui/EmptyState.tsx`, `src/components/ui/PageHeader.tsx`, `tests/unit/quick-time.test.ts`, `tests/unit/bristol.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // quick-time.ts
  export type QuickPreset = 'now' | 'morning' | 'lunch' | 'evening'
  export const QUICK_LABEL: Record<QuickPreset, string>   // 지금·아침·점심·저녁
  export function quickTimeIso(preset: QuickPreset, now: Date, tz: string): { iso: string; precision: 'exact' | 'approx' }
  //   now → now.toISOString(), exact. morning 08:00 / lunch 12:30 / evening 19:00 (오늘, tz 기준), approx.
  export function presetOf(iso: string, now: Date, tz: string): QuickPreset | 'custom'   // 역매핑(±1분 이내 now, 정확히 08:00/12:30/19:00)

  // Chip
  export function Chip(props: { selected?: boolean; tone?: 'default' | 'warn' | 'accent'; onClick?: () => void; onRemove?: () => void; children: ReactNode; className?: string; 'data-testid'?: string })
  // Segment10
  export function Segment10({ value, onChange, labels }: { value: number | null; onChange: (v: number | null) => void; labels?: [string, string] })
  // BristolScale
  export const BRISTOL: { n: 1|2|3|4|5|6|7; label: string }[]   // 딱딱·울퉁·금간·매끈·무른·죽·물
  export function BristolScale({ value, onChange }: { value: number | null; onChange: (v: number | null) => void })
  // QuickTime
  export function QuickTime({ iso, precision, tz, onChange }: { iso: string; precision: Entry['time_precision']; tz: string; onChange: (iso: string, precision: Entry['time_precision']) => void })
  //   내부에서 toLocalInput/fromLocalInput(EntryForm에서 import하지 않도록 같은 구현을 src/lib/time.ts로 옮긴다 — 아래 Step 5)
  // TagEditor
  export function TagEditor({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void })
  // EmptyState
  export function EmptyState({ icon, title, hint }: { icon: LucideIcon; title: string; hint?: string })
  // PageHeader
  export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode })
  ```

- [ ] **Step 1: 실패 테스트**

`tests/unit/quick-time.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { quickTimeIso, presetOf } from '@/lib/quick-time'

const now = new Date('2026-09-03T10:45:00Z') // 19:45 KST
describe('quickTimeIso', () => {
  it('지금은 exact', () => {
    expect(quickTimeIso('now', now, 'Asia/Seoul')).toEqual({ iso: now.toISOString(), precision: 'exact' })
  })
  it('아침·점심·저녁은 오늘의 고정 시각, approx', () => {
    expect(quickTimeIso('morning', now, 'Asia/Seoul')).toEqual({ iso: '2026-09-02T23:00:00.000Z', precision: 'approx' })
    expect(quickTimeIso('lunch', now, 'Asia/Seoul')).toEqual({ iso: '2026-09-03T03:30:00.000Z', precision: 'approx' })
    expect(quickTimeIso('evening', now, 'Asia/Seoul')).toEqual({ iso: '2026-09-03T10:00:00.000Z', precision: 'approx' })
  })
  it('UTC 시간대', () => {
    expect(quickTimeIso('lunch', now, 'UTC').iso).toBe('2026-09-03T12:30:00.000Z')
  })
})
describe('presetOf', () => {
  it('역매핑', () => {
    expect(presetOf(now.toISOString(), now, 'Asia/Seoul')).toBe('now')
    expect(presetOf('2026-09-03T03:30:00.000Z', now, 'Asia/Seoul')).toBe('lunch')
    expect(presetOf('2026-09-03T05:00:00.000Z', now, 'Asia/Seoul')).toBe('custom')
  })
})
```

`tests/unit/bristol.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { BRISTOL, BristolScale } from '@/components/ui/BristolScale'

describe('BristolScale', () => {
  it('7칸, 6·7은 경고 라벨', () => {
    expect(BRISTOL.map((b) => b.n)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(BRISTOL.map((b) => b.label)).toEqual(['딱딱', '울퉁', '금간', '매끈', '무른', '죽', '물'])
  })
  it('선택된 칸에 aria-pressed', () => {
    const html = renderToStaticMarkup(createElement(BristolScale, { value: 7, onChange: () => {} }))
    expect(html.match(/aria-pressed="true"/g)?.length).toBe(1)
    expect(html.match(/<svg/g)?.length).toBe(7)
  })
})
```

- [ ] **Step 2: 실패 확인**

```bash
cd /Users/dj/dev/gut-log && npm test
```
Expected: 두 파일 FAIL.

- [ ] **Step 3: quick-time.ts**

`src/lib/quick-time.ts`:
```ts
import { toLocalDateStr } from './time'

export type QuickPreset = 'now' | 'morning' | 'lunch' | 'evening'
export const QUICK_LABEL: Record<QuickPreset, string> = { now: '지금', morning: '아침', lunch: '점심', evening: '저녁' }
const FIXED: Record<Exclude<QuickPreset, 'now'>, string> = { morning: '08:00', lunch: '12:30', evening: '19:00' }

function offsetAt(d: Date, tz: string): string {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' }).formatToParts(d).find((x) => x.type === 'timeZoneName')!.value
  return name === 'GMT' ? '+00:00' : name.replace('GMT', '')
}

/** 지역 날짜+시각 문자열("2026-09-03T12:30") → UTC ISO. 서머타임 전환일은 실제 오프셋으로 한 번 더 잡는다. */
export function localToIso(local: string, tz: string, sample: Date): string {
  const guess = new Date(`${local}:00${offsetAt(sample, tz)}`)
  const actual = offsetAt(guess, tz)
  return (actual === offsetAt(sample, tz) ? guess : new Date(`${local}:00${actual}`)).toISOString()
}

export function quickTimeIso(preset: QuickPreset, now: Date, tz: string): { iso: string; precision: 'exact' | 'approx' } {
  if (preset === 'now') return { iso: now.toISOString(), precision: 'exact' }
  return { iso: localToIso(`${toLocalDateStr(now, tz)}T${FIXED[preset]}`, tz, now), precision: 'approx' }
}

export function presetOf(iso: string, now: Date, tz: string): QuickPreset | 'custom' {
  const t = new Date(iso).getTime()
  if (Math.abs(t - now.getTime()) <= 60_000) return 'now'
  for (const p of ['morning', 'lunch', 'evening'] as const) {
    if (quickTimeIso(p, now, tz).iso === new Date(iso).toISOString()) return p
  }
  return 'custom'
}
```

- [ ] **Step 4: Chip · Segment10 · BristolScale**

`src/components/ui/Chip.tsx`:
```tsx
'use client'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export function Chip({ selected = false, tone = 'default', onClick, onRemove, children, className, ...rest }:
  { selected?: boolean; tone?: 'default' | 'warn' | 'accent'; onClick?: () => void; onRemove?: () => void; children: ReactNode; className?: string; 'data-testid'?: string }) {
  const base = 'inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[13px] leading-none transition-colors select-none'
  const look = selected
    ? tone === 'warn' ? 'border-warn bg-warn-soft text-warn font-semibold' : 'border-accent bg-accent text-white font-semibold'
    : tone === 'warn' ? 'border-warn/60 bg-warn-soft/60 text-warn' : 'border-line bg-card text-ink'
  const Tag = onClick ? 'button' : 'span'
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} aria-pressed={onClick ? selected : undefined}
      className={cn(base, look, onClick && 'active:scale-[0.97]', className)} {...rest}>
      {children}
      {onRemove && <button type="button" aria-label="빼기" onClick={(e) => { e.stopPropagation(); onRemove() }} className="-mr-1 rounded-full p-0.5 opacity-70 hover:opacity-100"><X size={12} /></button>}
    </Tag>
  )
}
```

`src/components/ui/Segment10.tsx`:
```tsx
'use client'
import { cn } from '@/lib/utils'

export function Segment10({ value, onChange, labels }: { value: number | null; onChange: (v: number | null) => void; labels?: [string, string] }) {
  return (
    <div>
      <div className="grid grid-cols-11 gap-1" role="radiogroup">
        {Array.from({ length: 11 }, (_, i) => (
          <button key={i} type="button" role="radio" aria-checked={value === i} onClick={() => onChange(value === i ? null : i)}
            className={cn('h-9 rounded-lg border text-[12px] tabular-nums', value === i ? 'border-accent bg-accent font-bold text-white' : 'border-line bg-card text-ink')}>
            {i}
          </button>
        ))}
      </div>
      {labels && <div className="mt-1 flex justify-between text-[11px] text-mute"><span>{labels[0]}</span><span>{labels[1]}</span></div>}
    </div>
  )
}
```

`src/components/ui/BristolScale.tsx`:
```tsx
'use client'
import { cn } from '@/lib/utils'

export const BRISTOL: { n: 1 | 2 | 3 | 4 | 5 | 6 | 7; label: string }[] = [
  { n: 1, label: '딱딱' }, { n: 2, label: '울퉁' }, { n: 3, label: '금간' }, { n: 4, label: '매끈' },
  { n: 5, label: '무른' }, { n: 6, label: '죽' }, { n: 7, label: '물' },
]

const SHAPES: Record<number, string> = {
  1: '<circle cx="6" cy="12" r="3"/><circle cx="12" cy="9" r="3"/><circle cx="17" cy="14" r="3"/>',
  2: '<rect x="3" y="8" width="18" height="8" rx="4"/><circle cx="8" cy="12" r="1.6" fill="rgba(0,0,0,.25)"/><circle cx="15" cy="12" r="1.6" fill="rgba(0,0,0,.25)"/>',
  3: '<rect x="3" y="9" width="18" height="6" rx="3"/><path d="M8 9v6M13 9v6" stroke="rgba(0,0,0,.25)" stroke-width="1"/>',
  4: '<rect x="2" y="9" width="20" height="6" rx="3"/>',
  5: '<ellipse cx="7" cy="12" rx="4" ry="3"/><ellipse cx="16" cy="11" rx="4" ry="3"/>',
  6: '<path d="M4 14c3-5 6-5 8-2s5 3 8-1v6H4z"/>',
  7: '<path d="M3 15c4-4 6 2 9-1s5-2 9 1v4H3z"/>',
}

export function BristolScale({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="grid grid-cols-7 gap-1" role="radiogroup" aria-label="브리스톨 척도">
      {BRISTOL.map(({ n, label }) => {
        const on = value === n
        const warn = n >= 6
        return (
          <button key={n} type="button" aria-pressed={on} aria-label={`${n} ${label}`} onClick={() => onChange(on ? null : n)}
            className={cn('flex aspect-[1/1.35] flex-col items-center justify-center gap-0.5 rounded-[10px] border text-[10px]',
              on ? (warn ? 'border-warn bg-warn-soft text-warn' : 'border-accent bg-accent-soft text-accent') : 'border-line bg-card text-mute')}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill={on && warn ? 'var(--warn)' : on ? 'var(--accent)' : 'var(--mute)'}
              dangerouslySetInnerHTML={{ __html: SHAPES[n] }} />
            <b className={cn('text-[13px]', on ? '' : 'text-ink')}>{n}</b>
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 5: QuickTime · TagEditor · EmptyState · PageHeader**

`src/components/ui/QuickTime.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { Clock } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Chip } from '@/components/ui/Chip'
import { QUICK_LABEL, quickTimeIso, presetOf, localToIso, type QuickPreset } from '@/lib/quick-time'
import type { Entry } from '@/lib/schemas'

function toLocal(iso: string, tz: string): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso)).replace(' ', 'T')
}

export function QuickTime({ iso, precision, tz, onChange }:
  { iso: string; precision: Entry['time_precision']; tz: string; onChange: (iso: string, precision: Entry['time_precision']) => void }) {
  const [open, setOpen] = useState(false)
  const now = new Date()
  const current = precision === 'unknown' ? 'custom' : presetOf(iso, now, tz)
  const local = toLocal(iso, tz)
  const [date, time] = local.split('T')
  return (
    <div className="flex flex-wrap gap-1.5">
      {(Object.keys(QUICK_LABEL) as QuickPreset[]).map((p) => (
        <Chip key={p} selected={current === p} onClick={() => { const r = quickTimeIso(p, new Date(), tz); onChange(r.iso, r.precision) }}>{QUICK_LABEL[p]}</Chip>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Chip selected={current === 'custom'} onClick={() => setOpen(true)}><Clock size={14} />{current === 'custom' ? local.replace('T', ' ') : '직접'}</Chip>
        </PopoverTrigger>
        <PopoverContent className="w-auto space-y-2 p-3">
          <label className="block text-[12px] text-mute">날짜
            <input type="date" value={date} onChange={(e) => { if (e.target.value) onChange(localToIso(`${e.target.value}T${time}`, tz, new Date(iso)), 'exact') }} className="mt-1 block rounded-lg border border-line bg-card p-2 text-ink" />
          </label>
          <label className="block text-[12px] text-mute">시각
            <input type="time" value={time} data-testid="edit-time" onChange={(e) => { if (e.target.value) onChange(localToIso(`${date}T${e.target.value}`, tz, new Date(iso)), 'exact') }} className="mt-1 block rounded-lg border border-line bg-card p-2 text-ink" />
          </label>
        </PopoverContent>
      </Popover>
      {precision === 'approx' && <span className="self-center text-[11px] text-warn">대략</span>}
    </div>
  )
}
```

`src/components/ui/TagEditor.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { Chip } from '@/components/ui/Chip'
import { normalizeTag } from '@/lib/schemas'
import { WATCH_INGREDIENTS, isWatched } from '@/lib/watch-ingredients'

export function TagEditor({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [draft, setDraft] = useState('')
  function add(raw: string) { const t = normalizeTag(raw); if (t && !tags.includes(t)) onChange([...tags, t]); setDraft('') }
  const suggestions = WATCH_INGREDIENTS.filter((w) => !tags.includes(w) && (draft === '' || w.includes(draft))).slice(0, 8)
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((t) => <Chip key={t} tone={isWatched(t) ? 'warn' : 'default'} selected={isWatched(t)} onRemove={() => onChange(tags.filter((x) => x !== t))}>{t}</Chip>)}
        <input value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); add(draft) } }}
          placeholder="+ 재료" className="h-8 w-24 rounded-full border border-dashed border-line bg-transparent px-3 text-[13px]" data-testid="tag-input" />
      </div>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {suggestions.map((s) => <button key={s} type="button" onClick={() => add(s)} className="rounded-full bg-warn-soft/50 px-2 py-0.5 text-[11px] text-warn">+ {s}</button>)}
        </div>
      )}
    </div>
  )
}
```

`src/components/ui/EmptyState.tsx`:
```tsx
import type { LucideIcon } from 'lucide-react'
export function EmptyState({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent"><Icon size={22} /></span>
      <p className="text-[16px] font-semibold">{title}</p>
      {hint && <p className="text-[13px] text-mute">{hint}</p>}
    </div>
  )
}
```

`src/components/ui/PageHeader.tsx`:
```tsx
import type { ReactNode } from 'react'
export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <header className="flex items-start justify-between px-4 pt-4 pb-2">
      <div>
        <h1 className="text-[24px] font-bold tracking-[-0.01em]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[13px] text-mute">{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-1">{right}</div>}
    </header>
  )
}
```

- [ ] **Step 6: 통과 확인**

```bash
cd /Users/dj/dev/gut-log && npm test && npx tsc --noEmit
```
Expected: 유닛 전부 통과(66 + 7), 타입 오류 없음.

- [ ] **Step 7: Commit**

```bash
cd /Users/dj/dev/gut-log && git add -A && git commit -m "feat(ui): Chip·Segment10·BristolScale·QuickTime·TagEditor·EmptyState·PageHeader, 빠른 시각 함수"
```

---

### Task 3: 골격 — 라우트 그룹, TabBar, /export 리다이렉트

**Files:**
- Create: `src/components/TabBar.tsx`, `src/app/(app)/layout.tsx`
- Move: `src/app/page.tsx → src/app/(app)/page.tsx`, `src/app/analysis/ → src/app/(app)/analysis/`, `src/app/settings/ → src/app/(app)/settings/`, `src/app/entries/ → src/app/(app)/entries/`, `src/app/login/ → src/app/(auth)/login/`, `src/app/auth/ → src/app/(auth)/auth/`
- Modify: `src/app/export/page.tsx`(전체 교체), `public/sw.js`(폰트 캐시 추가), `src/lib/supabase/middleware.ts`(PUBLIC에 `/fonts/` 추가)

**Interfaces:**
- Produces: `<TabBar />`(경로 기반 활성, 높이 64px + 안전 영역), `(app)` 레이아웃이 `pb-20`을 준다. 오늘 화면은 자기 본문에 `pb-[152px]`를 따로 준다(Task 5).

- [ ] **Step 1: 이동**

```bash
cd /Users/dj/dev/gut-log && mkdir -p 'src/app/(app)' 'src/app/(auth)' && \
git mv src/app/page.tsx 'src/app/(app)/page.tsx' && git mv src/app/analysis 'src/app/(app)/analysis' && git mv src/app/settings 'src/app/(app)/settings' && git mv src/app/entries 'src/app/(app)/entries' && git mv src/app/login 'src/app/(auth)/login' && git mv src/app/auth 'src/app/(auth)/auth'
```
`src/app/(app)/settings/page.tsx`의 `import template from '../../../prompts/parse-ko.md'`는 깊이가 하나 늘었으므로 `'../../../../prompts/parse-ko.md'`로 고친다.

- [ ] **Step 2: TabBar와 (app) 레이아웃**

`src/components/TabBar.tsx`:
```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarCheck, BarChart3, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/', label: '오늘', icon: CalendarCheck, match: (p: string) => p === '/' || p.startsWith('/entries') },
  { href: '/analysis', label: '분석', icon: BarChart3, match: (p: string) => p.startsWith('/analysis') },
  { href: '/settings', label: '설정', icon: Settings, match: (p: string) => p.startsWith('/settings') },
] as const

export function TabBar() {
  const path = usePathname()
  return (
    <nav aria-label="주 메뉴" className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-line bg-card pb-[env(safe-area-inset-bottom)]">
      <ul className="flex h-16 items-stretch">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const on = match(path)
          return (
            <li key={href} className="flex-1">
              <Link href={href} aria-current={on ? 'page' : undefined}
                className={cn('flex h-full flex-col items-center justify-center gap-0.5 text-[11px]', on ? 'font-bold text-accent' : 'text-mute')}>
                <Icon size={22} strokeWidth={on ? 2.25 : 1.75} />{label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
```

`src/app/(app)/layout.tsx`:
```tsx
import { TabBar } from '@/components/TabBar'
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-md pb-20">
      {children}
      <TabBar />
    </div>
  )
}
```

- [ ] **Step 3: /export 리다이렉트, 서비스워커·미들웨어**

`src/app/export/page.tsx`(전체 교체):
```tsx
import { redirect } from 'next/navigation'
export default function ExportRedirect() { redirect('/settings#export') }
```

`public/sw.js`의 `SHELL` 배열에 `'/fonts/PretendardVariable.woff2'`를 추가하고, fetch 핸들러의 캐시-우선 분기 조건에 `|| url.pathname.startsWith('/fonts/')`를 덧붙인다. `CACHE` 이름을 `'gutlog-shell-v2'`로 올린다.

`src/lib/supabase/middleware.ts`의 `isPublic` 계산에 `|| path.startsWith('/fonts/')`를 추가한다.

- [ ] **Step 4: 확인**

```bash
cd /Users/dj/dev/gut-log && npm test && npm run build
```
Expected: 빌드 성공, 라우트 목록에 `/`, `/analysis`, `/settings`, `/entries/new`, `/entries/[id]`, `/login`, `/auth/callback`, `/export`. `npm run dev`에서 `/`·`/analysis`·`/settings`에 탭바가 뜨고 활성 탭이 라벤더, `/login`에는 탭바가 없고, `/export`가 설정으로 튕긴다.

- [ ] **Step 5: Commit**

```bash
cd /Users/dj/dev/gut-log && git add -A && git commit -m "feat(ui): 라우트 그룹과 하단 탭바, /export→설정"
```

---

### Task 4: `day_marks` RPC와 `dayMarks()`

**Files:**
- Create: `supabase/migrations/20260903001000_day_marks.sql`, `supabase/tests/009_day_marks.test.sql`
- Modify: `src/lib/db.ts`(함수·타입 추가)

**Interfaces:**
- Produces: `public.day_marks(p_from date, p_to date) returns table(day date, has_entry boolean, has_target boolean)`; `export type DayMark = { day: string; has_entry: boolean; has_target: boolean }`; `export async function dayMarks(sb, fromDate: string, toDate: string): Promise<DayMark[]>` (날짜 문자열 `YYYY-MM-DD`).

- [ ] **Step 1: 실패 테스트**

`supabase/tests/009_day_marks.test.sql`:
```sql
begin;
select plan(4);
insert into public.invites(email) values ('a@test.local');
insert into auth.users (id, email, instance_id, aud, role) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

select public.save_entries(null, '[
  {"kind":"note","occurred_at":"2026-09-01T10:00:00+09:00","time_precision":"exact","source_text":null,"data":{"text":"기록만"}},
  {"kind":"bowel","occurred_at":"2026-09-02T23:30:00+09:00","time_precision":"exact","source_text":null,"data":{"bristol":7,"urgency":false,"nocturnal":false,"blood":null,"note":null}}
]'::jsonb);

create temp table m as select * from public.day_marks('2026-09-01', '2026-09-03');
select is((select count(*) from m), 3::bigint, '기간 3일 전부 반환');
select is((select has_entry from m where day = '2026-09-01'), true, '09-01 기록 있음');
select is((select has_target from m where day = '2026-09-02'), true, '09-02 23:30 KST 설사 → 서울 날짜로 09-02');
select is((select has_entry from m where day = '2026-09-03'), false, '09-03 없음');
select * from finish();
rollback;
```

- [ ] **Step 2: 실패 확인**

```bash
cd /Users/dj/dev/gut-log && supabase test db
```
Expected: 009 FAIL.

- [ ] **Step 3: 마이그레이션**

`supabase/migrations/20260903001000_day_marks.sql`:
```sql
create or replace function public.day_marks(p_from date, p_to date)
returns table(day date, has_entry boolean, has_target boolean)
language sql stable security invoker as $$
with me as (
  select auth.uid() as uid,
         coalesce((select timezone from public.profiles where user_id = auth.uid()), 'Asia/Seoul') as tz
),
days as (select d::date as day from generate_series(p_from, p_to, interval '1 day') d),
rows_ as (
  select (e.occurred_at at time zone me.tz)::date as day,
         (e.kind = 'bowel' and jsonb_typeof(e.data->'bristol') = 'number' and (e.data->>'bristol')::numeric >= 6) as is_target
  from public.entries e, me
  where e.user_id = me.uid and e.deleted_at is null
    and e.occurred_at >= (p_from::timestamp at time zone me.tz) - interval '1 day'
    and e.occurred_at <  (p_to::timestamp + interval '1 day') at time zone me.tz + interval '1 day'
)
select d.day, exists (select 1 from rows_ r where r.day = d.day) as has_entry,
       exists (select 1 from rows_ r where r.day = d.day and r.is_target) as has_target
from days d order by d.day;
$$;
```

- [ ] **Step 4: db.ts에 추가**

`src/lib/db.ts` 끝에:
```ts
export type DayMark = { day: string; has_entry: boolean; has_target: boolean }
export async function dayMarks(sb: SupabaseClient, fromDate: string, toDate: string): Promise<DayMark[]> {
  return must(await sb.rpc('day_marks', { p_from: fromDate, p_to: toDate })) as DayMark[]
}
```

- [ ] **Step 5: 통과 확인**

```bash
cd /Users/dj/dev/gut-log && supabase db reset && supabase test db && npm test
```
Expected: pgTAP 9 파일 통과(48 + 4), 유닛 통과.

- [ ] **Step 6: Commit**

```bash
cd /Users/dj/dev/gut-log && git add -A && git commit -m "feat(db): day_marks 달력 점 RPC"
```

---

### Task 5: 오늘 화면 — 헤더·달력·카드·입력 바·배너

**Files:**
- Modify: `src/components/EntryCard.tsx`(전체 교체), `src/components/InputBar.tsx`(전체 교체 — 옛 내용은 Task 6의 InputSheet로 옮기므로 이 Task에서는 `git show HEAD:src/components/InputBar.tsx > .work/old-InputBar.tsx`로 보관해 둔다), `src/components/PendingBanner.tsx`(JSX만), `src/app/(app)/page.tsx`(전체 교체)
- Create: `src/components/DayPicker.tsx`

**Interfaces:**
- Consumes: `KindIcon`, `EmptyState`, `dayMarks`, `Popover`, `Calendar`, `Badge`.
- Produces:
  ```ts
  export function EntryCard({ entry, tz, onClick, tone }: { entry: Entry; tz: string; onClick?: () => void; tone?: 'normal'|'warn'|'error' })
  export function InputBar({ onOpenInput, onOpenForm }: { onOpenInput: () => void; onOpenForm: () => void })
  export function DayPicker({ date, tz, onPick }: { date: string; tz: string; onPick: (d: string) => void })   // date = 'YYYY-MM-DD'
  ```
  `page.tsx`는 이 Task에서 `InputSheet`를 아직 안 쓰고, `onOpenInput`이 임시로 옛 InputBar를 시트 대신 아래에 펼치는 대신 **Task 6 전까지는 `/entries/new`로 보내는 폼 버튼만 동작**하게 둔다. 즉 이 Task 끝에서 텍스트 입력 경로는 잠시 끊긴다(Task 6에서 복구). E2E는 Task 10에서 갱신하므로 이 Task에서는 `npm run test:e2e`를 돌리지 않는다.

- [ ] **Step 1: EntryCard 전체 교체**

`src/components/EntryCard.tsx`:
```tsx
import { KIND_LABEL, type Entry } from '@/lib/schemas'
import { isWatched } from '@/lib/watch-ingredients'
import { KindIcon } from '@/components/ui/KindIcon'
import { cn } from '@/lib/utils'

export function summarizeEntry(e: Entry): string {
  switch (e.kind) {
    case 'meal': return e.data.foods.map((f) => f.name).join(', ') || '(음식 없음)'
    case 'symptom': return `${e.data.type}${e.data.severity != null ? ` · 강도 ${e.data.severity}/10` : ''}`
    case 'bowel': {
      const parts = [e.data.bristol != null ? `브리스톨 ${e.data.bristol}` : '배변']
      if (e.data.urgency) parts.push('급함')
      if (e.data.nocturnal) parts.push('야간')
      if (e.data.blood) parts.push('혈변')
      return parts.join(' · ')
    }
    case 'sleep': return e.data.quality != null ? `수면 질 ${e.data.quality}/10` : '수면'
    case 'stress': return e.data.level != null ? `스트레스 ${e.data.level}/10${e.data.cause ? ` · ${e.data.cause}` : ''}` : '스트레스'
    case 'exercise': return `${e.data.type}${e.data.minutes != null ? ` ${e.data.minutes}분` : ''}${e.data.intensity ? ` · ${e.data.intensity}` : ''}`
    case 'medication': return `${e.data.name}${e.data.dose ? ` ${e.data.dose}` : ''}`
    case 'cycle': return `월경 ${e.data.event}`
    case 'note': return e.data.text
  }
}

export function timeLabel(iso: string, tz: string, precision: Entry['time_precision']): string {
  const t = new Intl.DateTimeFormat('ko-KR', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso))
  return precision === 'exact' ? t : precision === 'approx' ? `${t} · 대략` : '시각 없음'
}

function subLabel(e: Entry): string {
  const base = KIND_LABEL[e.kind]
  if (e.kind === 'meal' && e.data.meal_type) return `${base} · ${e.data.meal_type}`
  return base
}

export function EntryCard({ entry, tz, onClick, tone = 'normal' }:
  { entry: Entry; tz: string; onClick?: () => void; tone?: 'normal' | 'warn' | 'error' }) {
  const ring = tone === 'error' ? 'border-warn ring-2 ring-warn/25' : tone === 'warn' ? 'border-warn/70 ring-2 ring-warn/15' : 'border-line'
  const time = new Intl.DateTimeFormat('ko-KR', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(entry.occurred_at))
  const tags = entry.kind === 'meal' ? [...new Set(entry.data.foods.flatMap((f) => f.ingredients))] : []
  return (
    <div onClick={onClick} className={cn('flex gap-3 rounded-2xl border bg-card p-3', ring, onClick && 'cursor-pointer active:bg-accent-soft/40')}>
      <KindIcon kind={entry.kind} size={32} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-[16px] font-semibold leading-tight">{summarizeEntry(entry)}</p>
          <span className="flex shrink-0 items-center gap-1 text-[12px] text-mute tabular-nums">
            {entry.time_precision === 'unknown' ? <span className="rounded-full bg-warn-soft px-1.5 text-warn">시각 없음</span> : time}
            {entry.time_precision === 'approx' && <span className="rounded-full bg-warn-soft px-1.5 text-[11px] text-warn">대략</span>}
          </span>
        </div>
        <p className="mt-0.5 text-[12px] text-mute">{subLabel(entry)}</p>
        {tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {tags.map((t) => (
              <span key={t} className={cn('rounded-full px-2 py-0.5 text-[11px]', isWatched(t) ? 'bg-warn-soft text-warn' : 'bg-line text-ink')}>{t}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: DayPicker**

`src/components/DayPicker.tsx`:
```tsx
'use client'
import { useEffect, useState } from 'react'
import { ko } from 'date-fns/locale'
import { CalendarDays } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { createClient } from '@/lib/supabase/client'
import { dayMarks, type DayMark } from '@/lib/db'

function ymd(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

export function DayPicker({ date, onPick }: { date: string; tz: string; onPick: (d: string) => void }) {
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState<Date>(new Date(`${date}T12:00:00`))
  const [marks, setMarks] = useState<Record<string, DayMark>>({})

  useEffect(() => {
    if (!open) return
    const first = new Date(month.getFullYear(), month.getMonth(), 1)
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0)
    let alive = true
    dayMarks(createClient(), ymd(first), ymd(last))
      .then((rows) => { if (alive) setMarks(Object.fromEntries(rows.map((r) => [r.day, r]))) })
      .catch(() => { if (alive) setMarks({}) })
    return () => { alive = false }
  }, [open, month])

  const entryDays = Object.values(marks).filter((m) => m.has_entry && !m.has_target).map((m) => new Date(`${m.day}T12:00:00`))
  const targetDays = Object.values(marks).filter((m) => m.has_target).map((m) => new Date(`${m.day}T12:00:00`))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label="달력" data-testid="calendar-button" className="rounded-full p-2 text-mute hover:bg-accent-soft"><CalendarDays size={22} /></button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-2">
        <Calendar mode="single" locale={ko} weekStartsOn={1} month={month} onMonthChange={setMonth}
          selected={new Date(`${date}T12:00:00`)}
          onSelect={(d) => { if (d) { onPick(ymd(d)); setOpen(false) } }}
          modifiers={{ entry: entryDays, target: targetDays }}
          modifiersClassNames={{ entry: 'gl-dot-entry', target: 'gl-dot-target' }} />
        <p className="px-2 pb-1 text-[11px] text-mute"><span className="inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle" /> 기록 <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-warn align-middle" /> 설사</p>
      </PopoverContent>
    </Popover>
  )
}
```

`src/app/globals.css` 끝에 점 스타일 추가:
```css
.gl-dot-entry, .gl-dot-target { position: relative; }
.gl-dot-entry::after, .gl-dot-target::after { content: ""; position: absolute; left: 50%; bottom: 3px; width: 5px; height: 5px; border-radius: 9999px; transform: translateX(-50%); }
.gl-dot-entry::after { background: var(--accent); }
.gl-dot-target::after { background: var(--warn); }
```

- [ ] **Step 3: InputBar(트리거)와 PendingBanner 재스킨**

```bash
cd /Users/dj/dev/gut-log && mkdir -p .work && git show HEAD:src/components/InputBar.tsx > .work/old-InputBar.tsx
```

`src/components/InputBar.tsx`(전체 교체):
```tsx
'use client'
import { Mic, Plus } from 'lucide-react'

export function InputBar({ onOpenInput, onOpenForm }: { onOpenInput: () => void; onOpenForm: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-16 z-20 mx-auto max-w-md px-4 pb-3 pt-6 bg-gradient-to-t from-bg via-bg/90 to-transparent">
      <div className="pointer-events-auto flex h-12 items-center rounded-full border border-line bg-card pl-4 pr-1.5 shadow-[0_4px_14px_rgba(0,0,0,.06)]">
        <button type="button" onClick={onOpenInput} data-testid="open-input" className="flex h-full flex-1 items-center gap-2 text-left text-[14px] text-mute">
          <Mic size={18} className="text-accent" /> 말로 적기…
        </button>
        <button type="button" onClick={onOpenForm} data-testid="open-form" aria-label="폼으로 적기" className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white active:scale-95">
          <Plus size={20} />
        </button>
      </div>
    </div>
  )
}
```

`src/components/PendingBanner.tsx`의 return JSX만 교체(로직·훅은 그대로):
```tsx
  return (
    <div className="mx-4 mb-2 flex items-center justify-between rounded-xl border border-warn/60 bg-warn-soft px-3 py-2 text-[13px] text-warn">
      <span>보내지 못한 기록 {items.length}건이 있습니다.</span>
      <button onClick={flush} disabled={busy} className="font-semibold underline disabled:opacity-50">다시 보내기</button>
    </div>
  )
```

- [ ] **Step 4: 오늘 페이지 전체 교체**

`src/app/(app)/page.tsx`:
```tsx
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Mic } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getProfile, listEntriesForDay, listFoods, type EntryRow, type RawInput } from '@/lib/db'
import { toLocalDateStr } from '@/lib/time'
import { EntryCard } from '@/components/EntryCard'
import { InputBar } from '@/components/InputBar'
import { DayPicker } from '@/components/DayPicker'
import { PendingBanner } from '@/components/PendingBanner'
import { EmptyState } from '@/components/ui/EmptyState'
import type { PasteResult } from '@/lib/parse-paste'
import type { FoodHint } from '@/lib/prompt'

function dayTitle(date: string, tz: string): { title: string; rel: string | null } {
  const d = new Date(`${date}T12:00:00Z`)
  const title = new Intl.DateTimeFormat('ko-KR', { timeZone: 'UTC', month: 'long', day: 'numeric', weekday: 'short' }).format(d)
  const today = toLocalDateStr(new Date(), tz)
  const y = new Date(`${today}T12:00:00Z`); y.setUTCDate(y.getUTCDate() - 1)
  const rel = date === today ? '오늘' : date === y.toISOString().slice(0, 10) ? '어제' : null
  return { title, rel }
}

export default function HomePage() {
  const router = useRouter()
  const [tz, setTz] = useState('Asia/Seoul')
  const [date, setDate] = useState<string>('')
  const [entries, setEntries] = useState<EntryRow[]>([])
  const [foods, setFoods] = useState<FoodHint[]>([])
  const [sheet, setSheet] = useState<{ result: Extract<PasteResult, { ok: true }>; raw: RawInput } | null>(null)
  const [inputOpen, setInputOpen] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [inputKey, setInputKey] = useState(0)
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const loading = !date || loadedKey !== `${date}|${tz}|${reloadKey}`

  useEffect(() => {
    const sb = createClient()
    getProfile(sb)
      .then((p) => { setTz(p.timezone); setDate(toLocalDateStr(new Date(), p.timezone)) })
      .catch(() => { setTz('Asia/Seoul'); setDate(toLocalDateStr(new Date(), 'Asia/Seoul')) })
    listFoods(sb).then(setFoods).catch(() => {})
  }, [])

  useEffect(() => {
    if (!date) return
    const sb = createClient()
    let alive = true
    listEntriesForDay(sb, date, tz)
      .then((rows) => { if (alive) { setEntries(rows); setLoadError(null) } })
      .catch(() => { if (alive) { setEntries([]); setLoadError('기록을 불러오지 못했습니다.') } })
      .finally(() => { if (alive) setLoadedKey(`${date}|${tz}|${reloadKey}`) })
    return () => { alive = false }
  }, [date, tz, reloadKey])

  function shift(days: number) {
    if (!date) return
    const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days)
    setDate(d.toISOString().slice(0, 10))
  }

  const { title, rel } = date ? dayTitle(date, tz) : { title: '', rel: null }
  const subtitle = [rel, loading ? null : `기록 ${entries.length}건`].filter(Boolean).join(' · ')

  return (
    <main className="pb-[152px]">
      <header className="flex items-start justify-between px-4 pt-4 pb-2">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-0.01em]">{title || ' '}</h1>
          <p className="mt-0.5 text-[13px] text-mute">{subtitle || ' '}</p>
        </div>
        <div className="flex items-center">
          <button type="button" onClick={() => shift(-1)} disabled={!date} aria-label="하루 전" className="rounded-full p-2 text-mute hover:bg-accent-soft disabled:opacity-40"><ChevronLeft size={22} /></button>
          <button type="button" onClick={() => shift(1)} disabled={!date} aria-label="하루 뒤" className="rounded-full p-2 text-mute hover:bg-accent-soft disabled:opacity-40"><ChevronRight size={22} /></button>
          {date && <DayPicker date={date} tz={tz} onPick={setDate} />}
        </div>
      </header>

      <PendingBanner onFlushed={() => setReloadKey((k) => k + 1)} />

      <section className="space-y-2 px-4">
        {loading ? <p className="py-8 text-center text-[13px] text-mute">불러오는 중…</p> :
          loadError ? <p role="alert" className="rounded-xl bg-warn-soft p-3 text-[13px] text-warn">{loadError}</p> :
          entries.length === 0 ? <EmptyState icon={Mic} title="아직 기록이 없어요" hint="아래에서 말로 적어 보세요" /> :
          entries.map((e) => <Link key={e.id} href={`/entries/${e.id}`} className="block"><EntryCard entry={e} tz={tz} /></Link>)}
      </section>

      <InputBar onOpenInput={() => setInputOpen(true)} onOpenForm={() => router.push('/entries/new')} />
      {/* Task 6에서 <InputSheet>와 <ConfirmSheet>를 여기에 붙인다. inputOpen·sheet·foods·inputKey·setSheet는 그때 쓴다. */}
      {inputOpen && null}
      {sheet && null}
      {foods && null}
      {inputKey && null}
    </main>
  )
}
```

- [ ] **Step 5: 확인**

```bash
cd /Users/dj/dev/gut-log && npm test && npm run build
```
Expected: 통과·빌드 성공. 빌드에서 미사용 변수 lint 경고가 나면 `{inputOpen && null}` 같은 임시 참조가 있는지 확인. `npm run dev`에서: 큰 날짜 헤더, 달력 버튼 → 월 보기에 점, 카드에 lucide 아이콘, 빈 날 EmptyState, 알약 입력 바(＋ → /entries/new).

- [ ] **Step 6: Commit**

```bash
cd /Users/dj/dev/gut-log && git add -A && git commit -m "feat(ui): 오늘 화면 — 날짜 헤더, 달력 점, 카드 재작성, 알약 입력 바"
```

---

### Task 6: 입력 시트(3단계)와 확인 시트 재스킨

**Files:**
- Create: `src/components/InputSheet.tsx`
- Modify: `src/components/ConfirmSheet.tsx`(return JSX만), `src/app/(app)/page.tsx`(Task 5의 임시 참조 4줄을 실제 마운트로 교체)
- Delete: `.work/old-InputBar.tsx`(이관 후)

**Interfaces:**
- Produces: `export function InputSheet({ open, onOpenChange, tz, foods, onParsed }: { open: boolean; onOpenChange: (o: boolean) => void; tz: string; foods: FoodHint[]; onParsed: (result: Extract<PasteResult, { ok: true }>, raw: RawInput) => void })`. 내부 상태(text·paste·referenceAt·copied)는 시트를 닫아도 유지된다(컴포넌트가 언마운트되지 않도록 `open`이 false여도 렌더 트리에 남긴다 — shadcn Sheet는 닫혀도 컴포넌트 자체는 살아 있으므로 상태를 `InputSheet` 함수 컴포넌트 안에 두면 된다).

- [ ] **Step 1: InputSheet**

`src/components/InputSheet.tsx`(옛 InputBar의 `copyPrompt`·`submitPaste` 로직을 그대로 옮긴다):
```tsx
'use client'
import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { buildPrompt, type FoodHint } from '@/lib/prompt'
import { parsePaste, type PasteResult } from '@/lib/parse-paste'
import type { RawInput } from '@/lib/db'
import { newId } from '@/lib/queue'
import { cn } from '@/lib/utils'

const STEPS = ['1 말하기', '2 프롬프트 복사', '3 결과 붙여넣기'] as const

export function InputSheet({ open, onOpenChange, tz, foods, onParsed }:
  { open: boolean; onOpenChange: (o: boolean) => void; tz: string; foods: FoodHint[]; onParsed: (result: Extract<PasteResult, { ok: true }>, raw: RawInput) => void }) {
  const [text, setText] = useState('')
  const [referenceAt, setReferenceAt] = useState<Date | null>(null)
  const [paste, setPaste] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<'no' | 'yes' | 'manual'>('no')
  const [promptText, setPromptText] = useState('')
  const step = copied === 'no' ? 0 : paste.trim() ? 2 : 1

  async function copyPrompt() {
    if (!text.trim()) return
    const now = new Date()
    const p = buildPrompt({ text, referenceAt: now, tz, foods })
    setReferenceAt(now); setPromptText(p)
    try { await navigator.clipboard.writeText(p); setCopied('yes') } catch { setCopied('manual') }
  }

  function submitPaste() {
    const r = parsePaste(paste)
    if (!r.ok) { setError(r.message); return }
    setError(null)
    onParsed(r, { text, source: 'voice', reference_at: (referenceAt ?? new Date()).toISOString(), pasted_json: JSON.parse(paste.slice(paste.indexOf('{'), paste.lastIndexOf('}') + 1)), client_id: newId() })
    setPaste('')
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[90dvh] max-w-md overflow-y-auto rounded-t-[22px] border-line bg-card px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <SheetHeader className="px-0 pt-3 pb-2"><SheetTitle className="text-[18px] font-bold">말로 적기</SheetTitle></SheetHeader>
        <ol className="mb-3 grid grid-cols-3 gap-1.5 text-[11px]">
          {STEPS.map((s, i) => <li key={s} className={cn('rounded-lg py-1.5 text-center', i === step ? 'bg-accent-soft font-bold text-accent' : i < step ? 'bg-line text-mute line-through' : 'bg-bg text-mute')}>{s}</li>)}
        </ol>
        <Textarea value={text} onChange={(e) => { setText(e.target.value); setReferenceAt(null); setCopied('no') }} rows={3} autoFocus
          placeholder="키보드 마이크를 누르고 말하세요. 예: 아까 12시에 김치찌개 먹었고 지금 배가 좀 아파"
          className="rounded-xl border-line bg-bg text-[14px]" data-testid="input-text" />
        <Button onClick={copyPrompt} disabled={!text.trim()} className="mt-2 h-11 w-full rounded-xl text-[14px] font-bold" data-testid="copy-prompt">
          {copied === 'yes' ? '복사됨 ✓ 자기 LLM에 붙여넣기' : '프롬프트 복사'}
        </Button>
        {copied === 'manual' && (
          <details open className="mt-2 rounded-xl border border-line bg-bg p-2 text-[12px]"><summary>복사가 막혔습니다. 아래를 길게 눌러 복사하세요.</summary><pre className="whitespace-pre-wrap">{promptText}</pre></details>
        )}
        <div className={cn('mt-3 transition-opacity', copied === 'no' && 'opacity-50')}>
          <Textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={3}
            placeholder="LLM 답변(JSON)을 여기에 붙여넣기" className="rounded-xl border-line bg-bg font-mono text-[12px]" data-testid="paste-text" />
          {error && <p role="alert" className="mt-2 rounded-xl bg-warn-soft p-2.5 text-[13px] text-warn">{error}</p>}
          <Button variant="outline" onClick={submitPaste} disabled={!paste.trim()} className="mt-2 h-11 w-full rounded-xl border-accent text-[14px] font-bold text-accent" data-testid="submit-paste">
            확인 시트로
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: ConfirmSheet JSX 교체**

`src/components/ConfirmSheet.tsx`: import에 `import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'`, `import { Button } from '@/components/ui/button'`를 추가하고, **`return (` 이후만** 아래로 교체한다(위의 상태·`save()`는 그대로):
```tsx
  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="bottom" className="mx-auto flex max-h-[90dvh] max-w-md flex-col rounded-t-[22px] border-line bg-card p-0" data-testid="confirm-sheet">
        <SheetHeader className="px-4 pt-3 pb-2"><SheetTitle className="text-[20px] font-bold">확인 후 저장</SheetTitle></SheetHeader>
        <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-2">
          {result.questions.length > 0 && (
            <div className="rounded-xl bg-accent-soft p-3 text-[13px] text-ink">{result.questions.map((q) => <div key={q}>{q}</div>)}</div>
          )}
          {result.invalid.length > 0 && (
            <div className="rounded-xl bg-warn-soft p-3 text-[13px] text-warn">
              항목 {result.invalid.length}개는 모양이 틀려 뺐습니다: {result.invalid.map((i) => i.reason).join(' / ')}
            </div>
          )}
          {entries.map((e, i) => (
            <div key={i}>
              <EntryCard entry={e} tz={tz} onClick={() => setEditing(editing === i ? null : i)}
                tone={e.time_precision === 'unknown' || problems[i] !== undefined ? 'error' : e.time_precision === 'approx' || isFuture(e.occurred_at, reference) ? 'warn' : 'normal'} />
              {problems[i] !== undefined && <p role="alert" className="mt-1 text-[12px] text-warn">모양이 틀려 저장하지 않았습니다: {problems[i]}</p>}
              {isFuture(e.occurred_at, reference) && <p className="mt-1 text-[12px] text-warn">기준 시각보다 뒤의 시각입니다.</p>}
              {editing === i && (
                <EntryEditor value={e} tz={tz}
                  onChange={(v) => {
                    setEntries(entries.map((x, j) => (j === i ? v : x)))
                    setProblems((p) => { const next = { ...p }; delete next[i]; return next })
                  }}
                  onRemove={() => { setEntries(entries.filter((_, j) => j !== i)); setProblems({}); setEditing(null) }} />
              )}
            </div>
          ))}
          {msg && <p role="alert" className="rounded-xl bg-warn-soft p-2.5 text-[13px] text-warn">{msg}</p>}
          {showRaw && <pre className="whitespace-pre-wrap rounded-xl bg-bg p-2 text-[12px] text-mute">{raw.text}</pre>}
        </div>
        <div className="border-t border-line bg-card px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button onClick={save} disabled={busy || entries.length - blocked === 0} className="h-12 w-full rounded-xl text-[15px] font-bold" data-testid="save-entries">
            저장 ({entries.length - blocked}건){blocked ? ` · ${blocked}건 보류` : ''}
          </Button>
          <button type="button" onClick={() => setShowRaw(!showRaw)} className="mt-2 w-full py-1 text-[13px] text-mute underline">원문 보기</button>
        </div>
      </SheetContent>
    </Sheet>
  )
```
`onChange`·`onRemove` 안의 로직은 기존 코드와 글자 단위로 같아야 한다(주석만 빠짐). diff로 확인:
```bash
cd /Users/dj/dev/gut-log && git diff src/components/ConfirmSheet.tsx | grep -E '^[-+]' | grep -vE 'className|import|Sheet|Button|^\+\s*</?div|^-\s*</?div' | head -40
```
Expected: 로직 줄의 삭제·추가가 대칭(같은 내용)이거나 없음.

- [ ] **Step 3: 오늘 페이지에 마운트**

`src/app/(app)/page.tsx`에서 import 추가 `import { InputSheet } from '@/components/InputSheet'`, `import { ConfirmSheet } from '@/components/ConfirmSheet'`. 임시 참조 4줄(`{inputOpen && null}` … `{inputKey && null}`)과 그 위 주석을 아래로 교체:
```tsx
      <InputSheet key={inputKey} open={inputOpen} onOpenChange={setInputOpen} tz={tz} foods={foods}
        onParsed={(result, raw) => setSheet({ result, raw })} />
      {sheet && <ConfirmSheet result={sheet.result} raw={sheet.raw} tz={tz}
        onSaved={(remaining) => {
          setReloadKey((k) => k + 1)
          listFoods(createClient()).then(setFoods).catch(() => {})
          if (remaining === 0) { setSheet(null); setInputKey((k) => k + 1) }
        }}
        onClose={() => setSheet(null)} />}
```

```bash
rm -f /Users/dj/dev/gut-log/.work/old-InputBar.tsx
```

- [ ] **Step 4: 확인**

```bash
cd /Users/dj/dev/gut-log && npm test && npm run build
```
`npm run dev`: 입력 바 마이크 → 시트 → 문장 입력 → 프롬프트 복사(단계 표시 2로) → `prompts/parse-ko.md` 예시 JSON 붙여넣기(단계 3) → 확인 시트로 → 카드 3장 → 저장 → 타임라인. 잘못된 텍스트 → 붙여넣기 칸 아래 흙빛 문구. 시트를 닫았다 열어도 입력값 유지.

- [ ] **Step 5: Commit**

```bash
cd /Users/dj/dev/gut-log && git add -A && git commit -m "feat(ui): 3단계 입력 시트, 확인 시트 재스킨"
```

---

### Task 7: 폼 재작성과 새 기록·수정 페이지

**Files:**
- Modify: `src/components/EntryForm.tsx`(전체 교체, exports 유지), `src/app/(app)/entries/new/page.tsx`(전체 교체), `src/app/(app)/entries/[id]/page.tsx`(JSX만)

**Interfaces:**
- Produces(유지): `toLocalInput`, `fromLocalInput`, `blankEntry`, `KindPicker({ onPick })`, `EntryEditor({ value, tz, onChange, onRemove? })`.
- Consumes: `QuickTime`, `Chip`, `Segment10`, `BristolScale`, `TagEditor`, `KindIcon`, `Input`, `Textarea`.

- [ ] **Step 1: EntryForm 전체 교체**

`src/components/EntryForm.tsx`:
```tsx
'use client'
import { KINDS, KIND_LABEL, type Entry, type Kind } from '@/lib/schemas'
import { KindIcon } from '@/components/ui/KindIcon'
import { Chip } from '@/components/ui/Chip'
import { Segment10 } from '@/components/ui/Segment10'
import { BristolScale } from '@/components/ui/BristolScale'
import { QuickTime } from '@/components/ui/QuickTime'
import { TagEditor } from '@/components/ui/TagEditor'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export function toLocalInput(iso: string, tz: string): string {
  const p = new Intl.DateTimeFormat('sv-SE', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso))
  return p.replace(' ', 'T')
}
function offsetAt(d: Date, tz: string): string {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' }).formatToParts(d).find((x) => x.type === 'timeZoneName')!.value
  return name === 'GMT' ? '+00:00' : name.replace('GMT', '')
}
export function fromLocalInput(v: string, tz: string, sampleIso: string): string {
  const sample = offsetAt(new Date(sampleIso), tz)
  const guess = new Date(`${v}:00${sample}`)
  const actual = offsetAt(guess, tz)
  return (actual === sample ? guess : new Date(`${v}:00${actual}`)).toISOString()
}

export function blankEntry(kind: Kind, nowIso: string): Entry {
  const base = { occurred_at: nowIso, time_precision: 'exact' as const, source_text: null }
  switch (kind) {
    case 'meal': return { kind, ...base, data: { meal_type: null, foods: [{ name: '', ingredients: [], amount: null }], eating_pattern: [] } }
    case 'symptom': return { kind, ...base, data: { type: '복통', severity: null, note: null } }
    case 'bowel': return { kind, ...base, data: { bristol: null, urgency: null, nocturnal: false, blood: null, note: null } }
    case 'sleep': return { kind, ...base, data: { quality: null, hours: null, note: null } }
    case 'stress': return { kind, ...base, data: { level: null, cause: null } }
    case 'exercise': return { kind, ...base, data: { type: '걷기', minutes: null, intensity: null } }
    case 'medication': return { kind, ...base, data: { name: '', dose: null } }
    case 'cycle': return { kind, ...base, data: { event: '시작' } }
    case 'note': return { kind, ...base, data: { text: '' } }
  }
}

const MEAL_TYPES = ['아침', '점심', '저녁', '간식'] as const
const AMOUNTS = ['적게', '보통', '많이'] as const
const EATING_PATTERNS = ['급하게', '거른 끼니 후', '과식', '찬 음료', '기름진'] as const
const SYMPTOMS = ['복통', '팽만', '가스', '오심', '속쓰림', '두통', '피로', '기타'] as const
const EXERCISES = ['걷기', '달리기', '자전거', '수영', '근력', '요가', '기타'] as const
const INTENSITY = ['낮음', '중간', '높음'] as const
const CYCLE = ['시작', '진행중', '종료', '배란 추정'] as const

export function KindPicker({ onPick }: { onPick: (k: Kind) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2 px-4">
      {KINDS.map((k) => (
        <button key={k} type="button" onClick={() => onPick(k)} data-testid={`kind-${k}`}
          className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-card py-4 text-[13px] font-semibold active:bg-accent-soft/40">
          <KindIcon kind={k} size={40} />{KIND_LABEL[k]}
        </button>
      ))}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="mb-1.5 text-[11px] font-semibold tracking-wide text-mute">{label}</p>{children}</div>
}
function ChipRow<T extends string>({ options, value, onChange, tone }: { options: readonly T[]; value: T | null; onChange: (v: T | null) => void; tone?: 'default' | 'warn' }) {
  return <div className="flex flex-wrap gap-1.5">{options.map((o) => <Chip key={o} tone={tone} selected={value === o} onClick={() => onChange(value === o ? null : o)}>{o}</Chip>)}</div>
}
function ChipMulti<T extends string>({ options, value, onChange, testid }: { options: readonly T[]; value: T[]; onChange: (v: T[]) => void; testid?: (o: T) => string }) {
  return <div className="flex flex-wrap gap-1.5">{options.map((o) => <Chip key={o} selected={value.includes(o)} data-testid={testid?.(o)} onClick={() => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o])}>{o}</Chip>)}</div>
}
function NumInput({ value, onChange, placeholder, max }: { value: number | null; onChange: (v: number | null) => void; placeholder: string; max: number }) {
  return <Input type="number" inputMode="numeric" min={0} max={max} value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} className="h-10 w-28 rounded-xl border-line bg-card" />
}

export function EntryEditor({ value, tz, onChange, onRemove }:
  { value: Entry; tz: string; onChange: (v: Entry) => void; onRemove?: () => void }) {
  const set = (data: Entry['data']) => onChange({ ...value, data } as Entry)
  return (
    <div className="mt-1 space-y-4 rounded-2xl border border-line bg-bg p-3 text-[14px]">
      <Field label="언제">
        <QuickTime iso={value.occurred_at} precision={value.time_precision} tz={tz} onChange={(iso, precision) => onChange({ ...value, occurred_at: iso, time_precision: precision })} />
      </Field>

      {value.kind === 'meal' && (<>
        <Field label="끼니"><ChipRow options={MEAL_TYPES} value={value.data.meal_type} onChange={(v) => set({ ...value.data, meal_type: v })} /></Field>
        {value.data.foods.map((f, i) => (
          <div key={i} className="space-y-2 rounded-xl border border-line bg-card p-3">
            <Input value={f.name} placeholder="음식 이름" data-testid="food-name" onChange={(e) => set({ ...value.data, foods: value.data.foods.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} className="h-10 rounded-xl border-line" />
            <TagEditor tags={f.ingredients} onChange={(t) => set({ ...value.data, foods: value.data.foods.map((x, j) => (j === i ? { ...x, ingredients: t } : x)) })} />
            <div className="flex items-center justify-between">
              <ChipRow options={AMOUNTS} value={f.amount} onChange={(v) => set({ ...value.data, foods: value.data.foods.map((x, j) => (j === i ? { ...x, amount: v } : x)) })} />
              <button type="button" onClick={() => set({ ...value.data, foods: value.data.foods.filter((_, j) => j !== i) })} className="text-[12px] text-warn" data-testid="food-remove">이 음식 빼기</button>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => set({ ...value.data, foods: [...value.data.foods, { name: '', ingredients: [], amount: null }] })} className="text-[13px] font-semibold text-accent">+ 음식 추가</button>
        <Field label="어떻게 먹었나"><ChipMulti options={EATING_PATTERNS} value={value.data.eating_pattern} onChange={(v) => set({ ...value.data, eating_pattern: v })} testid={(p) => `pattern-${p}`} /></Field>
      </>)}

      {value.kind === 'symptom' && (<>
        <Field label="종류"><ChipRow options={SYMPTOMS} value={value.data.type} onChange={(v) => set({ ...value.data, type: v ?? '복통' })} /></Field>
        <Field label="강도"><Segment10 value={value.data.severity} onChange={(v) => set({ ...value.data, severity: v })} labels={['없음', '못 견딤']} /></Field>
      </>)}

      {value.kind === 'bowel' && (<>
        <Field label="모양 (브리스톨)"><BristolScale value={value.data.bristol} onChange={(v) => set({ ...value.data, bristol: v })} /></Field>
        <Field label="함께">
          <div className="flex flex-wrap gap-1.5">
            <Chip tone="warn" selected={!!value.data.urgency} onClick={() => set({ ...value.data, urgency: !value.data.urgency })}>급했음</Chip>
            <Chip tone="warn" selected={value.data.nocturnal} onClick={() => set({ ...value.data, nocturnal: !value.data.nocturnal })}>야간</Chip>
            <Chip tone="warn" selected={!!value.data.blood} onClick={() => set({ ...value.data, blood: !value.data.blood })}>혈변</Chip>
          </div>
        </Field>
      </>)}

      {value.kind === 'sleep' && (<>
        <Field label="잘 잤다"><Segment10 value={value.data.quality} onChange={(v) => set({ ...value.data, quality: v })} labels={['전혀', '푹']} /></Field>
        <Field label="잔 시간"><NumInput value={value.data.hours} onChange={(v) => set({ ...value.data, hours: v })} placeholder="시간" max={24} /></Field>
      </>)}

      {value.kind === 'stress' && (<>
        <Field label="스트레스"><Segment10 value={value.data.level} onChange={(v) => set({ ...value.data, level: v })} labels={['없음', '극심']} /></Field>
        <Field label="원인"><Input value={value.data.cause ?? ''} placeholder="한 마디" onChange={(e) => set({ ...value.data, cause: e.target.value || null })} className="h-10 rounded-xl border-line bg-card" /></Field>
      </>)}

      {value.kind === 'exercise' && (<>
        <Field label="종류"><ChipRow options={EXERCISES} value={value.data.type} onChange={(v) => set({ ...value.data, type: v ?? '걷기' })} /></Field>
        <div className="flex gap-4">
          <Field label="분"><NumInput value={value.data.minutes} onChange={(v) => set({ ...value.data, minutes: v })} placeholder="분" max={1440} /></Field>
          <Field label="강도"><ChipRow options={INTENSITY} value={value.data.intensity} onChange={(v) => set({ ...value.data, intensity: v })} /></Field>
        </div>
      </>)}

      {value.kind === 'medication' && (<>
        <Field label="약 이름"><Input value={value.data.name} placeholder="예: 메트포르민" onChange={(e) => set({ ...value.data, name: e.target.value })} className="h-10 rounded-xl border-line bg-card" /></Field>
        <Field label="용량"><Input value={value.data.dose ?? ''} placeholder="예: 500mg" onChange={(e) => set({ ...value.data, dose: e.target.value || null })} className="h-10 rounded-xl border-line bg-card" /></Field>
      </>)}

      {value.kind === 'cycle' && (
        <Field label="월경"><ChipRow options={CYCLE} value={value.data.event} onChange={(v) => set({ ...value.data, event: v ?? '시작' })} /></Field>
      )}

      {value.kind === 'note' && (
        <Field label="메모"><Textarea value={value.data.text} rows={3} onChange={(e) => set({ ...value.data, text: e.target.value })} className="rounded-xl border-line bg-card" /></Field>
      )}

      {onRemove && <button type="button" onClick={onRemove} className="text-[13px] text-warn">이 항목 빼기</button>}
    </div>
  )
}
```

- [ ] **Step 2: 새 기록 페이지 전체 교체**

`src/app/(app)/entries/new/page.tsx`:
```tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getProfile, saveEntries } from '@/lib/db'
import { entrySchema, KIND_LABEL, type Entry, type Kind } from '@/lib/schemas'
import { KindPicker, blankEntry, EntryEditor } from '@/components/EntryForm'
import { KindIcon } from '@/components/ui/KindIcon'
import { Button } from '@/components/ui/button'

export default function NewEntryPage() {
  const router = useRouter()
  const [tz, setTz] = useState('Asia/Seoul')
  const [entry, setEntry] = useState<Entry | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => { getProfile(createClient()).then((p) => setTz(p.timezone)).catch(() => {}) }, [])

  async function save() {
    if (!entry) return
    const r = entrySchema.safeParse(entry)
    if (!r.success) { setErr(r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')); return }
    try { await saveEntries(createClient(), null, [r.data]); router.push('/') }
    catch (e) { setErr((e as Error).message) }
  }

  return (
    <main className="pb-6">
      <header className="flex items-center gap-1 px-2 pt-3 pb-2">
        <button type="button" onClick={() => (entry ? setEntry(null) : router.back())} aria-label="뒤로" className="rounded-full p-2 text-mute"><ChevronLeft size={22} /></button>
        {entry ? <span className="flex items-center gap-2 text-[18px] font-bold"><KindIcon kind={entry.kind} size={24} />{KIND_LABEL[entry.kind]}</span> : <span className="text-[18px] font-bold">무엇을 적을까요?</span>}
      </header>
      {!entry ? <KindPicker onPick={(k: Kind) => setEntry(blankEntry(k, new Date().toISOString()))} /> : (
        <div className="px-4">
          <EntryEditor value={entry} tz={tz} onChange={setEntry} />
          {err && <p role="alert" className="mt-2 rounded-xl bg-warn-soft p-2.5 text-[13px] text-warn">{err}</p>}
          <Button onClick={save} className="mt-4 h-12 w-full rounded-xl text-[15px] font-bold" data-testid="form-save">저장</Button>
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 3: 수정 페이지 JSX 교체**

`src/app/(app)/entries/[id]/page.tsx`의 마지막 `return (` 블록만 교체(상태·`save`·`remove`·오류 분기는 그대로). import에 `KindIcon`, `Button`, `ChevronLeft`, `KIND_LABEL` 추가:
```tsx
  return (
    <main className="pb-6">
      <header className="flex items-center gap-1 px-2 pt-3 pb-2">
        <button type="button" onClick={() => router.back()} aria-label="뒤로" className="rounded-full p-2 text-mute"><ChevronLeft size={22} /></button>
        <span className="flex items-center gap-2 text-[18px] font-bold"><KindIcon kind={entry.kind} size={24} />{KIND_LABEL[entry.kind]} 수정</span>
      </header>
      <div className="px-4">
        <EntryEditor value={entry} tz={tz} onChange={(v) => setEntry({ ...entry, ...v } as EntryRow)} />
        {raw && <details className="mt-3 text-[13px] text-mute"><summary>원문 보기</summary><pre className="mt-1 whitespace-pre-wrap rounded-xl bg-card p-2 text-[12px]">{raw}</pre></details>}
        {err && <p role="alert" className="mt-2 rounded-xl bg-warn-soft p-2.5 text-[13px] text-warn">{err}</p>}
        <Button onClick={save} className="mt-4 h-12 w-full rounded-xl text-[15px] font-bold">저장</Button>
        <button type="button" onClick={remove} className="mt-2 w-full rounded-xl border border-warn/60 py-2.5 text-[13px] text-warn">삭제</button>
      </div>
    </main>
  )
```
로딩·오류 분기의 `<main className="p-4 …">`는 `px-4 pt-4`로, 문구 색은 `text-mute`/`text-warn`으로 바꾼다.

- [ ] **Step 4: 확인**

```bash
cd /Users/dj/dev/gut-log && npm test && npm run build
```
Expected: entry-form.test.ts 포함 전부 통과. `npm run dev`: ＋ → 3×3 격자 → 배변 → 브리스톨 그림 7칸, 칩 3개, 빠른 시각 → 저장 → 카드 → 탭 → 수정 화면.

- [ ] **Step 5: Commit**

```bash
cd /Users/dj/dev/gut-log && git add -A && git commit -m "feat(ui): 탭형 폼(브리스톨 그림·칩·세그먼트·빠른 시각), 새 기록·수정 화면"
```

---

### Task 8: 분석 화면 — 가로 막대와 기준선

**Files:**
- Create: `src/lib/baseline.ts`, `tests/unit/baseline.test.ts`
- Modify: `src/components/RankingTable.tsx`(전체 교체, `formatRatio`·`GRP_LABEL` 유지), `src/app/(app)/analysis/page.tsx`(전체 교체)

**Interfaces:**
- Produces: `export function baselineOf(r: RankingRow): number | null` (분모 0이면 null); `export function ratioTone(r: RankingRow): 'warn' | 'accent' | 'mute'` (≥2 warn, ≥1 accent, 그 외 mute; enough=false·ratio null은 mute); `export function RankingBars({ rows, pickedKey, onPick, detail, detailError, tz }: {...})` — 행 탭 시 아래로 상세 펼침. `RankingTable` 이름의 export는 삭제(호출처는 analysis 페이지뿐).

- [ ] **Step 1: 실패 테스트**

`tests/unit/baseline.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { baselineOf, ratioTone } from '@/lib/baseline'

const row = { candidate: '마늘', grp: 'ingredient', exposed_n: 10, exposed_hits: 6, control_n: 20, control_hits: 3, ratio: 4, enough: true }
describe('baselineOf', () => {
  it('(6+3)/(10+20) = 0.3', () => expect(baselineOf(row)).toBeCloseTo(0.3))
  it('분모 0이면 null', () => expect(baselineOf({ ...row, exposed_n: 0, control_n: 0 })).toBeNull())
})
describe('ratioTone', () => {
  it('2 이상 warn', () => expect(ratioTone(row)).toBe('warn'))
  it('1~2 accent', () => expect(ratioTone({ ...row, ratio: 1.3 })).toBe('accent'))
  it('1 미만·부족·null은 mute', () => {
    expect(ratioTone({ ...row, ratio: 0.9 })).toBe('mute')
    expect(ratioTone({ ...row, enough: false })).toBe('mute')
    expect(ratioTone({ ...row, ratio: null })).toBe('mute')
  })
})
```

- [ ] **Step 2: 실패 확인**

```bash
cd /Users/dj/dev/gut-log && npm test
```

- [ ] **Step 3: baseline.ts와 RankingBars**

`src/lib/baseline.ts`:
```ts
import type { RankingRow } from './db'
export function baselineOf(r: RankingRow): number | null {
  const n = r.exposed_n + r.control_n
  return n > 0 ? (r.exposed_hits + r.control_hits) / n : null
}
export function ratioTone(r: RankingRow): 'warn' | 'accent' | 'mute' {
  if (!r.enough || r.ratio == null) return 'mute'
  if (r.ratio >= 2) return 'warn'
  if (r.ratio >= 1) return 'accent'
  return 'mute'
}
```

`src/components/RankingTable.tsx`(전체 교체):
```tsx
'use client'
import type { RankingRow, DetailRow } from '@/lib/db'
import { isWatched } from '@/lib/watch-ingredients'
import { baselineOf, ratioTone } from '@/lib/baseline'
import { cn } from '@/lib/utils'

export const GRP_LABEL: Record<string, string> = {
  ingredient: '재료', food: '음식', pattern: '식사 패턴', sleep: '수면', stress: '스트레스', exercise: '운동', medication: '약',
}
const DAY_GROUPS = ['sleep', 'stress', 'exercise', 'medication']

export function formatRatio(r: RankingRow): string {
  if (!r.enough) return '자료 부족'
  if (r.ratio == null) return '비교 불가'
  return `${r.ratio.toFixed(1)}배`
}

export function rowKey(r: RankingRow): string { return `${r.grp}:${r.candidate}` }

export function RankingBars({ rows, pickedKey, onPick, detail, detailError, tz }:
  { rows: RankingRow[]; pickedKey: string | null; onPick: (r: RankingRow) => void; detail: DetailRow[]; detailError: string | null; tz: string }) {
  const fmt = (iso: string) => new Intl.DateTimeFormat('ko-KR', { timeZone: tz, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso))
  return (
    <ul className="divide-y divide-line">
      {rows.map((r) => {
        const pct = r.exposed_n ? (r.exposed_hits / r.exposed_n) * 100 : 0
        const base = baselineOf(r)
        const tone = ratioTone(r)
        const bar = tone === 'warn' ? 'bg-warn' : tone === 'accent' ? 'bg-accent/60' : 'bg-line'
        const num = tone === 'warn' ? 'text-warn' : tone === 'accent' ? 'text-accent' : 'text-mute'
        const isDay = DAY_GROUPS.includes(r.grp)
        const open = pickedKey === rowKey(r)
        return (
          <li key={rowKey(r)} className={cn(!r.enough && 'opacity-40')}>
            <button type="button" onClick={() => onPick(r)} data-testid="ranking-row" aria-expanded={open}
              className="grid w-full grid-cols-[84px_1fr_52px] items-center gap-2 py-2.5 text-left">
              <div className="text-right">
                <p className="truncate text-[12px] font-semibold">{r.candidate}{r.grp === 'ingredient' && isWatched(r.candidate) && <span className="ml-1 rounded-full bg-warn-soft px-1 text-[9px] text-warn">감시</span>}</p>
                <p className="text-[9px] text-mute">{GRP_LABEL[r.grp] ?? r.grp} · {r.exposed_n}{isDay ? '일' : '번'}{isDay && <span className="ml-1 rounded bg-line px-1">날 기준</span>}</p>
              </div>
              <div className="relative h-4 rounded bg-card">
                <div className={cn('absolute inset-y-0 left-0 rounded', bar)} style={{ width: `${pct}%` }} />
                {base != null && <div className="absolute -inset-y-0.5 w-0.5 bg-ink" style={{ left: `${base * 100}%` }} aria-hidden />}
              </div>
              <p className={cn('text-right text-[14px] font-bold tabular-nums', num, !r.enough && 'text-[10px] font-normal')}>{formatRatio(r)}</p>
            </button>
            {open && (
              <div className="mb-2 rounded-xl bg-card p-3 text-[12px]">
                {detailError && <p role="alert" className="text-warn">{detailError}</p>}
                {!detailError && detail.length === 0 && <p className="text-mute">불러오는 중…</p>}
                <ul className="space-y-1">
                  {detail.map((d) => (
                    <li key={d.exposure_id} className="flex justify-between">
                      <span>{fmt(d.exposure_at)}</span>
                      <span className={d.hit ? 'text-warn' : 'text-mute'}>{d.hit && d.target_at ? `→ ${fmt(d.target_at)} 발생` : '없음'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
```

- [ ] **Step 4: 분석 페이지 전체 교체**

`src/app/(app)/analysis/page.tsx`(상태·조회·경쟁 가드 로직은 기존과 같고, `picked`를 키 문자열로 바꿈):
```tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getProfile, suspectRanking, suspectDetail, type RankingRow, type DetailRow } from '@/lib/db'
import { RankingBars, rowKey } from '@/components/RankingTable'
import { baselineOf } from '@/lib/baseline'
import { toLocalDateStr, dayRange } from '@/lib/time'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart3 } from 'lucide-react'

const TARGETS = [['diarrhea', '설사'], ['urgency', '급박 배변'], ['pain', '복통'], ['bloating', '팽만']] as const
const WINDOWS = [2, 4, 8, 24] as const
const DAYS = [14, 30, 60, 90] as const

export default function AnalysisPage() {
  const [tz, setTz] = useState('Asia/Seoul')
  const [days, setDays] = useState<(typeof DAYS)[number]>(30)
  const [windowHours, setWindowHours] = useState<(typeof WINDOWS)[number]>(8)
  const [target, setTarget] = useState<(typeof TARGETS)[number][0]>('diarrhea')
  const [rows, setRows] = useState<RankingRow[]>([])
  const [pickedKey, setPickedKey] = useState<string | null>(null)
  const [detail, setDetail] = useState<DetailRow[]>([])
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const tokenRef = useRef(0)
  const loadKey = `${tz}|${days}|${windowHours}|${target}`
  const loading = loadedKey !== loadKey

  function range() {
    const today = toLocalDateStr(new Date(), tz)
    const start = new Date(`${today}T12:00:00Z`); start.setUTCDate(start.getUTCDate() - (days - 1))
    return { from: dayRange(start.toISOString().slice(0, 10), tz).from, to: dayRange(today, tz).to }
  }

  useEffect(() => { getProfile(createClient()).then((p) => setTz(p.timezone)).catch(() => {}) }, [])
  useEffect(() => {
    const sb = createClient()
    let alive = true
    tokenRef.current += 1
    suspectRanking(sb, { ...range(), windowHours, target })
      .then((rs) => { if (alive) { setRows(rs); setPickedKey(null); setLoadError(null) } })
      .catch(() => { if (alive) { setRows([]); setPickedKey(null); setLoadError('순위표를 불러오지 못했습니다.') } })
      .finally(() => { if (alive) setLoadedKey(loadKey) })
    return () => { alive = false }
  }, [tz, days, windowHours, target]) // eslint-disable-line react-hooks/exhaustive-deps

  async function pick(r: RankingRow) {
    const key = rowKey(r)
    if (pickedKey === key) { setPickedKey(null); return }
    setPickedKey(key); setDetail([]); setDetailError(null)
    const t = ++tokenRef.current
    try {
      const d = await suspectDetail(createClient(), { ...range(), windowHours, target, grp: r.grp, candidate: r.candidate })
      if (t === tokenRef.current) setDetail(d)
    } catch {
      if (t === tokenRef.current) setDetailError('상세를 불러오지 못했습니다.')
    }
  }

  const targetLabel = TARGETS.find(([v]) => v === target)![1]
  const mealBase = rows.find((r) => ['ingredient', 'food', 'pattern'].includes(r.grp))
  const basePct = mealBase ? baselineOf(mealBase) : null
  const allShort = rows.length > 0 && rows.every((r) => !r.enough)
  const pill = 'h-8 rounded-full border-line bg-card px-3 text-[12px] text-mute'

  return (
    <main>
      <PageHeader title="용의자 순위" subtitle={`${targetLabel} · 최근 ${days}일 · ${windowHours}시간 창`} />
      <div className="flex gap-1.5 px-4 pb-3">
        <Select value={target} onValueChange={(v) => setTarget(v as typeof target)}>
          <SelectTrigger className={pill}><SelectValue /></SelectTrigger>
          <SelectContent>{TARGETS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v) as typeof days)}>
          <SelectTrigger className={pill}><SelectValue /></SelectTrigger>
          <SelectContent>{DAYS.map((d) => <SelectItem key={d} value={String(d)}>최근 {d}일</SelectItem>)}</SelectContent>
        </Select>
        <Select value={String(windowHours)} onValueChange={(v) => setWindowHours(Number(v) as typeof windowHours)}>
          <SelectTrigger className={pill}><SelectValue /></SelectTrigger>
          <SelectContent>{WINDOWS.map((w) => <SelectItem key={w} value={String(w)}>{w}시간 창</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="px-4">
        {loading ? <p className="py-8 text-center text-[13px] text-mute">계산 중…</p> :
          loadError ? <p role="alert" className="rounded-xl bg-warn-soft p-3 text-[13px] text-warn">{loadError}</p> :
          rows.length === 0 ? <EmptyState icon={BarChart3} title="기간 안에 기록이 없어요" hint="기록이 쌓이면 여기에 순위가 나옵니다" /> : (
          <>
            <p className="mb-1 flex items-center gap-3 text-[11px] text-mute">
              <span><i className="mr-1 inline-block h-2 w-3 rounded-sm bg-warn align-middle" />먹은 뒤 {targetLabel} 비율</span>
              {basePct != null && <span><i className="mr-1 inline-block h-2.5 w-0.5 bg-ink align-middle" />평소 비율 {Math.round(basePct * 100)}%</span>}
            </p>
            {allShort && <p className="mb-2 rounded-xl bg-accent-soft p-2.5 text-[12px] text-ink">노출이 3번 이상 쌓이면 배수가 나옵니다.</p>}
            <RankingBars rows={rows} pickedKey={pickedKey} onPick={pick} detail={detail} detailError={detailError} tz={tz} />
          </>)}
        <p className="mt-4 text-[11px] text-mute">연관은 가설입니다. 확인은 한 가지씩 3일 재도입으로.</p>
      </div>
    </main>
  )
}
```

- [ ] **Step 5: 확인**

```bash
cd /Users/dj/dev/gut-log && npm test && npm run build
```
Expected: ranking-table.test.ts(`formatRatio`)와 baseline.test.ts 통과. `npm run dev`: 알약 필터 3개, 범례, 막대+기준선, 행 탭 → 상세 펼침, 자료 부족 반투명.

- [ ] **Step 6: Commit**

```bash
cd /Users/dj/dev/gut-log && git add -A && git commit -m "feat(ui): 분석 화면 가로 막대·기준선·상세 펼침"
```

---

### Task 9: 설정(내보내기 통합)과 로그인

**Files:**
- Modify: `src/app/(app)/settings/page.tsx`(전체 교체), `src/app/(auth)/login/page.tsx`(JSX만), `e2e/helpers.ts`(정리 함수 추가)

**Interfaces:**
- Produces: `e2e/helpers.ts`에 `export async function removeInvite(email: string): Promise<void>`.

- [ ] **Step 1: 설정 페이지 전체 교체**

`src/app/(app)/settings/page.tsx`:
```tsx
'use client'
import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getProfile, listInvites, addInvite, updateTimezone, exportRows } from '@/lib/db'
import { entriesToCsv } from '@/lib/csv'
import { dayRange, toLocalDateStr } from '@/lib/time'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import template from '../../../../prompts/parse-ko.md'

const TZS = ['Asia/Seoul', 'Asia/Tokyo', 'America/Los_Angeles', 'America/New_York', 'Europe/London', 'UTC']
function toMsg(err: unknown): string {
  const m = err instanceof Error ? err.message : String(err)
  return m === 'not_found' || m === 'profile_missing' ? '프로필을 찾지 못했습니다.' : m
}
function Card({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return <section id={id} className="mx-4 mb-3 rounded-2xl border border-line bg-card p-4"><h2 className="mb-3 text-[16px] font-semibold">{title}</h2>{children}</section>
}

export default function SettingsPage() {
  const [userId, setUserId] = useState('')
  const [tz, setTz] = useState('Asia/Seoul')
  const [invites, setInvites] = useState<{ email: string; created_at: string }[]>([])
  const [email, setEmail] = useState('')
  const [inviteMsg, setInviteMsg] = useState<string | null>(null)
  const [tzMsg, setTzMsg] = useState<string | null>(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [exportMsg, setExportMsg] = useState<string | null>(null)

  const load = useCallback(() => {
    const sb = createClient()
    getProfile(sb).then((p) => p.timezone).catch(() => 'Asia/Seoul').then((zone) => {
      setTz(zone)
      const today = toLocalDateStr(new Date(), zone)
      const d = new Date(`${today}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - 29)
      setFrom(d.toISOString().slice(0, 10)); setTo(today)
    })
    getProfile(sb).then((p) => setUserId(p.user_id)).catch(() => {})
    listInvites(sb).then(setInvites).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  async function invite(e: React.FormEvent) {
    e.preventDefault()
    try { await addInvite(createClient(), email, userId); setEmail(''); setInviteMsg('초대했습니다.'); load() }
    catch (err) { setInviteMsg(toMsg(err)) }
  }
  async function changeTz(v: string) {
    const prev = tz; setTz(v); setTzMsg(null)
    try { await updateTimezone(createClient(), userId, v) } catch (err) { setTz(prev); setTzMsg(toMsg(err)) }
  }
  async function download() {
    setExportMsg(null)
    try {
      const rows = await exportRows(createClient(), dayRange(from, tz).from, dayRange(to, tz).to)
      const blob = new Blob(['﻿' + entriesToCsv(rows, tz)], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `gut-log_${from}_${to}.csv`
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) { setExportMsg('내보내지 못했습니다. ' + toMsg(err)) }
  }
  async function signOut() { await createClient().auth.signOut(); window.location.href = '/login' }
  const fmtDate = (iso: string) => new Intl.DateTimeFormat('ko-KR', { timeZone: tz, month: 'numeric', day: 'numeric' }).format(new Date(iso))

  return (
    <main className="pb-6">
      <PageHeader title="설정" />
      <Card title="초대 이메일">
        <form onSubmit={invite} className="flex gap-2">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="가족 이메일" className="h-10 flex-1 rounded-xl border-line bg-bg" />
          <Button type="submit" className="h-10 rounded-xl px-4 font-semibold">추가</Button>
        </form>
        {inviteMsg && <p className="mt-2 text-[13px] text-mute">{inviteMsg}</p>}
        <ul className="mt-3 divide-y divide-line text-[13px]">
          {invites.map((i) => <li key={i.email} className="flex justify-between py-2"><span>{i.email}</span><span className="text-mute">{fmtDate(i.created_at)}</span></li>)}
        </ul>
      </Card>
      <Card title="시간대">
        <Select value={tz} onValueChange={changeTz}>
          <SelectTrigger className="h-10 rounded-xl border-line bg-bg"><SelectValue /></SelectTrigger>
          <SelectContent>{TZS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
        {tzMsg && <p className="mt-2 text-[13px] text-warn">{tzMsg}</p>}
      </Card>
      <Card title="내보내기" id="export">
        <div className="flex items-center gap-2 text-[13px]">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 flex-1 rounded-xl border border-line bg-bg px-2" />
          <span className="text-mute">~</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 flex-1 rounded-xl border border-line bg-bg px-2" />
        </div>
        <Button onClick={download} disabled={!from || !to} className="mt-3 h-10 w-full rounded-xl font-semibold">CSV 내려받기</Button>
        {exportMsg && <p role="alert" className="mt-2 text-[13px] text-warn">{exportMsg}</p>}
      </Card>
      <details className="mx-4 mb-3 rounded-2xl border border-line bg-card p-4 text-[13px]">
        <summary className="cursor-pointer font-semibold">프롬프트 원문</summary>
        <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-bg p-2 text-[12px] text-mute">{template}</pre>
      </details>
      <div className="px-4"><Button variant="outline" onClick={signOut} className="h-10 w-full rounded-xl border-line">로그아웃</Button></div>
    </main>
  )
}
```

- [ ] **Step 2: 로그인 JSX 교체**

`src/app/(auth)/login/page.tsx`의 `return (` 블록만 교체(상태·`submit`·`LinkErrorNotice`는 유지하되 `LinkErrorNotice`의 `<p>` 클래스를 `rounded-xl bg-warn-soft p-3 text-[13px] text-warn`로). import에 `Button`, `Input` 추가:
```tsx
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 pb-16">
      <h1 className="text-[24px] font-bold tracking-[-0.01em]">장 기록</h1>
      <p className="mt-1 mb-8 text-[14px] text-mute">설사 유발요인을 찾는 일기</p>
      {state === 'sent' ? (
        <p className="rounded-xl bg-accent-soft p-4 text-[14px]">로그인 링크를 보냈습니다. 이메일을 열어 링크를 눌러 주세요.</p>
      ) : (
        <>
          <Suspense fallback={null}><LinkErrorNotice /></Suspense>
          <form onSubmit={submit} className="space-y-3">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일" autoComplete="email" className="h-12 rounded-xl border-line bg-card text-[16px]" />
            <Button type="submit" disabled={state === 'sending'} className="h-12 w-full rounded-xl text-[15px] font-bold">로그인 링크 받기</Button>
            {(state === 'not_invited' || state === 'error') && (
              <p role="alert" className="rounded-xl bg-warn-soft p-3 text-[13px] text-warn">{message}</p>
            )}
          </form>
        </>
      )}
    </main>
  )
```

- [ ] **Step 3: 테스트 잔재 정리와 helpers**

```bash
cd /Users/dj/dev/gut-log && supabase db query "delete from public.invites where email like '%@test.local'" --local 2>/dev/null || psql "$(supabase status -o json | jq -r '.DB_URL')" -c "delete from public.invites where email like '%@test.local'"
```

`e2e/helpers.ts` 끝에:
```ts
export async function removeInvite(email: string): Promise<void> {
  const { url, service } = localKeys()
  const admin = createClient(url, service, { auth: { persistSession: false } })
  await admin.from('invites').delete().eq('email', email)
}
```

- [ ] **Step 4: 확인**

```bash
cd /Users/dj/dev/gut-log && npm test && npm run build
```
`npm run dev`: 설정에 카드 3개 + 프롬프트 접기 + 로그아웃, `/export` → 설정 내보내기 카드로 스크롤, 로그인 화면 가운데 정렬.

- [ ] **Step 5: Commit**

```bash
cd /Users/dj/dev/gut-log && git add -A && git commit -m "feat(ui): 설정 카드(초대·시간대·내보내기), 로그인 재작성"
```

---

### Task 10: E2E 갱신, 전체 검증, 검토 게이트

**Files:**
- Modify: `e2e/flow.spec.ts`(전체 교체)

- [ ] **Step 1: E2E 전체 교체**

`e2e/flow.spec.ts`:
```ts
import { test, expect } from '@playwright/test'
import { loginUrlFor, removeInvite } from './helpers'

const pasted = JSON.stringify({
  entries: [
    { kind: 'sleep', occurred_at: '2026-09-03T07:00:00+09:00', time_precision: 'approx', source_text: '어제는 잠을 잘 못 잤어', data: { quality: 3, hours: null, note: '잠을 잘 못 잤어' } },
    { kind: 'meal', occurred_at: '2026-09-03T12:00:00+09:00', time_precision: 'exact', source_text: '아까 12시에 김치찌개랑 공깃밥 먹었고', data: { meal_type: '점심', foods: [{ name: '김치찌개', ingredients: ['김치', '돼지고기', '두부', '마늘', '파', '고춧가루'], amount: null }, { name: '공깃밥', ingredients: ['쌀'], amount: null }], eating_pattern: [] } },
    { kind: 'symptom', occurred_at: '2026-09-03T19:45:00+09:00', time_precision: 'exact', source_text: '지금 배가 좀 아파', data: { type: '복통', severity: 3, note: '배가 좀 아파' } },
  ],
  questions: [],
})

let email = ''
test.beforeEach(async ({ page }) => {
  email = `e2e-${Date.now()}@test.local`
  await page.goto(await loginUrlFor(email))
  await expect(page).toHaveURL(/\/$/)
})
test.afterEach(async () => { await removeInvite(email) })

test('입력 시트 → 확인 → 저장 → 타임라인', async ({ page }) => {
  await page.getByTestId('open-input').click()
  await page.getByTestId('input-text').fill('아까 12시에 김치찌개랑 공깃밥 먹었고 어제는 잠을 잘 못 잤어 지금 배가 좀 아파')
  await page.getByTestId('copy-prompt').click()
  await page.getByTestId('paste-text').fill('```json\n' + pasted + '\n```')
  await page.getByTestId('submit-paste').click()

  const sheet = page.getByTestId('confirm-sheet')
  await expect(sheet).toBeVisible()
  await expect(sheet.getByText('김치찌개, 공깃밥')).toBeVisible()
  await expect(sheet.getByText('수면 질 3/10')).toBeVisible()
  await page.getByTestId('save-entries').click()
  await expect(sheet).toBeHidden()

  await page.getByTestId('calendar-button').click()
  await page.getByRole('button', { name: /9월 3일|3일/ }).first().click()
  await expect(page.getByText('김치찌개, 공깃밥')).toBeVisible()
  await expect(page.getByText('복통 · 강도 3/10')).toBeVisible()
  await expect(page.getByText('수면 질 3/10')).toBeVisible()
})

test('JSON이 아니면 흙빛 문구', async ({ page }) => {
  await page.getByTestId('open-input').click()
  await page.getByTestId('input-text').fill('x')
  await page.getByTestId('paste-text').fill('네, 정리해 드릴게요! 식사는 ...')
  await page.getByTestId('submit-paste').click()
  await expect(page.getByRole('alert').filter({ hasText: 'JSON을 찾지 못했습니다' })).toBeVisible()
})

test('폼으로 배변 저장', async ({ page }) => {
  await page.getByTestId('open-form').click()
  await page.getByTestId('kind-bowel').click()
  await page.getByRole('button', { name: '7 물' }).click()
  await page.getByRole('button', { name: '급했음' }).click()
  await page.getByTestId('form-save').click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByText('브리스톨 7 · 급함')).toBeVisible()
})
```
달력에서 날짜 버튼 이름은 react-day-picker 버전에 따라 `"2026년 9월 3일 목요일"` 등으로 다르다. 첫 실행에서 실패하면 `await page.getByTestId('calendar-button').click()` 뒤에 `console.log(await page.locator('button[name]').allInnerTexts())`로 확인해 정규식을 맞춘다.

- [ ] **Step 2: 전체 검증**

```bash
cd /Users/dj/dev/gut-log && npm test && supabase test db && npm run build && npm run test:e2e
```
Expected: 전부 exit 0(유닛 ≈ 73, pgTAP 52, E2E 3).

- [ ] **Step 3: 종합 리뷰 게이트**

`better-interface` 스킬을 호출해 오늘·입력 시트·확인 시트·폼·분석·설정·로그인 7화면을 검토시키고, 결과를 `.work/review-better-interface.md`에 받는다. 항목마다 고침/보류를 원장에 판정하고, 고칠 것은 이 Task 안에서 fix round로 처리한다.

- [ ] **Step 4: 사용자 게이트 — 실기기 손검사**

사용자에게 요청: iOS Safari 홈화면 앱에서 ① 다크 모드 전환 시 색 ② 하단 탭바가 홈 인디케이터에 안 가리는지 ③ 입력 시트에서 키보드 올라올 때 붙여넣기 칸이 보이는지 ④ 달력 Popover가 화면 안에 들어오는지. 결과를 받아 필요하면 fix round.

- [ ] **Step 5: Commit과 마무리**

```bash
cd /Users/dj/dev/gut-log && git add -A && git commit -m "test: E2E를 새 골격에 맞춰 갱신, 초대 정리"
```
그 뒤 `superpowers:finishing-a-development-branch`로 main 병합 판단.

---

## 자체 검토 결과

- **명세 대조**: §2 토큰·글꼴·모서리 → T1. §3 shadcn·자체 부품 9개(KindIcon T1, 나머지 7 T2, TabBar T3) → T1·T2·T3. §4 라우트 그룹·/export·탭바 높이 → T3. §5.1 오늘(헤더·달력·카드·빈 상태·입력 바·배너) → T5. §5.2 입력 시트 → T6. §5.3 확인 시트 → T6. §5.4 폼·편집기·new·[id] → T7. §5.5 분석 → T8. §5.6 설정·잔재 정리 → T9. §5.7 로그인 → T9. §6 day_marks → T4. §7 테스트(새 유닛 3종: quick-time·bristol·baseline, pgTAP 009, E2E 갱신, 실기기 게이트, better-interface) → T1·T2·T4·T8·T10. §8 범위 밖은 어느 Task에도 없음.
- **자리표시자**: 없음. E2E 달력 버튼 이름만 "첫 실행에서 확인" 절차를 명시.
- **이름 일치**: `quickTimeIso/presetOf/localToIso`(T2 정의, QuickTime 사용), `dayMarks/DayMark`(T4 정의, DayPicker 사용), `InputBar({onOpenInput,onOpenForm})`(T5 정의·사용), `InputSheet` props(T6 정의, page 사용), `RankingBars/rowKey`(T8 정의·사용), `baselineOf/ratioTone`(T8), `removeInvite`(T9 정의, T10 사용), `data-testid` 목록은 Global Constraints와 각 컴포넌트 코드가 일치.
