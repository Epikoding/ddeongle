# gut-log 설계 명세 (2026-09-03)

설사 등 IBS 증상의 유발요인을 찾기 위해 일상(식사·증상·배변·수면·스트레스·운동·약·월경)을 기록하고, 기록 사이의 시간 연관을 순위표로 보여 주는 개인·가족용 웹앱(PWA).

근거 문헌: 「IBS 유발요인 지도」(2026-08-26, claude.ai 아티팩트 059f6083). 특히 08장 "내 유발요인 찾기"의 기록 항목·지연 창·재도입 절차를 따른다.

## 1. 확정된 결정

| 항목 | 결정 |
|---|---|
| 사용자 | 본인 + 초대한 가족·지인 몇 명. 각자 자기 기록만 본다 |
| 로그인 | Supabase 이메일 매직링크. `invites` 표에 있는 이메일만 가입 가능(DB 트리거로 강제) |
| 입력 | ① 텍스트 입력창(폰 키보드 마이크로 받아쓰기) ② 종류별 수동 폼. 둘 다 정식 경로 |
| 구조화 | 앱이 LLM을 호출하지 않는다. 사용자가 [프롬프트 복사] → 자기 LLM → [결과 붙여넣기]로 JSON을 가져온다 |
| 확인 | 붙여넣은 결과는 항상 확인 시트를 거쳐 저장한다 |
| 분석 | 앱 안에서 자동 계산(용의자 순위표). 재도입 안내는 하지 않는다 |
| 스택 | Next.js(App Router) + TypeScript + Tailwind, Supabase(Auth·Postgres·RLS), Vercel 무료티어. 서버 라우트 핸들러 없음 |
| PWA | 매니페스트 + 얇은 서비스워커(앱 셸 캐시). 오프라인은 저장 실패분 재시도 큐까지만 |
| 위치 | `/Users/dj/dev/gut-log` (git). 원격은 개인 GitHub **Epikoding/gut-log**, `dj-wishket`을 collaborator로 |
| 계정 | 전부 개인 계정. Supabase·Vercel은 djlesque@gmail.com, GitHub는 Epikoding. 회사 계정 미사용 (2026-09-03) |

## 2. 전체 구조

```
브라우저(Next.js, PWA)
  ├─ Supabase Auth (매직링크)
  ├─ Supabase Postgres  ← supabase-js 직접 읽기·쓰기 (RLS)
  │     ├─ RPC save_entries(...)      트랜잭션 저장
  │     └─ RPC suspect_ranking(...)   분석
  └─ 클립보드 ↔ 사용자의 LLM 앱 (앱 밖)
```

- 서버 코드가 없다. API 키도 없다. 비용은 0.
- 분석은 Postgres 함수가 계산한다. 브라우저는 표만 그린다.

## 3. 데이터 구조

모든 표는 `user_id`로 RLS를 건다(본인 행만 select/insert/update/delete). `invites`는 로그인한 사용자만 select/insert. 미초대 판정은 조회가 아니라 트리거가 한다 — `signInWithOtp`가 사용자 행을 만들 때 트리거가 거부하면 그 오류를 "초대가 필요합니다"로 번역해 보여 준다.

### profiles
| 칸 | 타입 | 설명 |
|---|---|---|
| user_id | uuid PK (auth.users) | |
| display_name | text | |
| timezone | text | 기본 `Asia/Seoul` |
| created_at | timestamptz | |

### invites
| 칸 | 타입 | 설명 |
|---|---|---|
| email | citext PK | 소문자 비교 |
| invited_by | uuid | |
| created_at | timestamptz | |

트리거 `before insert on auth.users`: `new.email`이 `invites`에 없으면 `raise exception 'not_invited'`. 최초 관리자 1명은 마이그레이션 시드로 넣는다.

### raw_inputs
| 칸 | 타입 | 설명 |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | |
| text | text | 받아쓴 원문 |
| source | text | `voice` / `form` |
| reference_at | timestamptz | 프롬프트에 넣은 기준 시각 |
| pasted_json | jsonb | LLM이 돌려준 JSON 원본(정제 후) |
| created_at | timestamptz | |

### entries
| 칸 | 타입 | 설명 |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | |
| raw_input_id | uuid null | 폼 입력이면 null |
| kind | text | `meal` `symptom` `bowel` `sleep` `stress` `exercise` `medication` `cycle` `note` |
| occurred_at | timestamptz | |
| time_precision | text | `exact` / `approx` / `unknown` |
| source_text | text null | 근거 원문 조각 |
| data | jsonb | kind별 모양(아래) |
| created_at, updated_at | timestamptz | |
| deleted_at | timestamptz null | 소프트 삭제 |

인덱스: `(user_id, occurred_at)`, `(user_id, kind, occurred_at)`.

### entry_tags
| 칸 | 타입 | 설명 |
|---|---|---|
| entry_id | uuid FK | |
| tag | text | 정규화된 재료명(한글 기본형, trim) |
| PK | (entry_id, tag) | |

식사 항목 저장 시 foods[].ingredients를 평탄화해 넣는다. 분석은 이 표만 조인한다.

### foods (사용자별 음식 사전)
| 칸 | 타입 | 설명 |
|---|---|---|
| user_id | uuid | |
| name | text | |
| ingredients | text[] | |
| last_used_at | timestamptz | |
| PK | (user_id, name) | |

확인 시트에서 재료를 고친 음식은 여기에 upsert. 프롬프트 복사 시 최근 사용 50개를 "이 사용자의 등록 음식" 절로 덧붙인다.

### kind별 data 스키마 (zod로 코드에 고정)

```ts
meal:       { meal_type: '아침'|'점심'|'저녁'|'간식'|null,
              foods: { name: string, ingredients: string[], amount: '적게'|'보통'|'많이'|null }[],
              eating_pattern: ('급하게'|'거른 끼니 후'|'과식'|'찬 음료'|'기름진')[] }
symptom:    { type: '복통'|'팽만'|'가스'|'오심'|'속쓰림'|'두통'|'피로'|'기타', severity: 0..10|null, note: string|null }
bowel:      { bristol: 1..7|null, urgency: boolean|null, nocturnal: boolean, blood: boolean|null, note: string|null }
sleep:      { quality: 0..10|null, hours: number|null, note: string|null }      // occurred_at = 기상 시각
stress:     { level: 0..10|null, cause: string|null }
exercise:   { type: '걷기'|'달리기'|'자전거'|'수영'|'근력'|'요가'|'기타', minutes: number|null, intensity: '낮음'|'중간'|'높음'|null }
medication: { name: string, dose: string|null }
cycle:      { event: '시작'|'진행중'|'종료'|'배란 추정' }
note:       { text: string }
```

설사는 `symptom`이 아니라 `bowel.bristol >= 6`으로만 표현한다(프롬프트와 폼 둘 다).

## 4. 입력 흐름

### 4.1 텍스트(음성) 경로
1. 홈 입력창에 받아쓰기.
2. **[프롬프트 복사]**: `prompts/parse-ko.md`의 `{{기준_시각}}`에 현재 시각(사용자 시간대, 요일 포함, 오프셋 표기), `{{입력_문장}}`에 입력창 내용, 끝에 음식 사전 절을 채워 `navigator.clipboard.writeText`. 동시에 `raw_inputs`용 초안(text, reference_at)을 메모리에 둔다.
3. 사용자가 자기 LLM에 붙여넣고 답을 복사.
4. **[결과 붙여넣기]** 텍스트 영역에 붙여넣기 → 정제 → 검증 → 확인 시트.
5. **저장** → `save_entries` RPC.

### 4.2 정제·검증 규칙
- 정제: 첫 `{`부터 마지막 `}`까지만 취한다. 코드블록 기호·앞뒤 문장은 버린다.
- 전체 파싱 실패 → 빨간 배너 "JSON을 찾지 못했습니다. LLM 답변 전체를 다시 복사해 주세요." 입력창 원문은 유지, [프롬프트 다시 복사] 버튼.
- 항목 단위 검증(zod discriminated union). 실패한 항목만 빨간 카드 + 사유 문구. 나머지는 정상 카드. 빨간 카드는 고치기 전까지 저장에서 제외되고 버튼에 "N건 보류"로 표시.
- `time_precision`이 `approx`/`unknown`이면 노란 카드. `unknown`은 시각을 정해야 저장 가능.
- `occurred_at > 기준 시각 + 5분`이면 경고 문구(저장은 허용).
- `questions[]`는 시트 상단 노란 띠에 나열.

### 4.3 확인 시트
- 카드: 종류 아이콘·시각 배지(탭 → 날짜·시각 피커)·본문·재료 칩(식사만).
- 감시 재료 칩(양파·마늘·파·밀·우유·치즈·요거트·버터·콩·두부·사과·배·수박·버섯·양배추·고추·고춧가루·기름·커피·술·탄산·인공감미료·꿀·견과)은 노란 테두리.
- 칩 탭 → 삭제, [+ 재료] → 텍스트 입력(자동완성: entry_tags 기존 값).
- [원문 보기]로 raw text 표시.
- [저장 (N건)].

### 4.4 폼 경로
[+] → 종류 선택 → 종류별 짧은 폼(스키마와 1:1) → 바로 저장(확인 시트 없음, raw_input_id null).

### 4.5 저장 RPC `save_entries(raw jsonb|null, entries jsonb[])`
단일 트랜잭션: `raw_inputs` insert(있으면) → `entries` bulk insert → 식사 항목의 ingredients를 `entry_tags`로 → `foods` upsert(name, ingredients, last_used_at). 실패 시 전부 롤백. 반환: 생성된 entry id 목록.

## 5. 화면

1. `/login` 이메일 입력 → 링크 발송 안내. 미초대면 "초대가 필요합니다. 가족 관리자에게 이메일 등록을 부탁하세요."
2. `/` 오늘 타임라인(날짜 이동), 하단 고정 입력창 + [프롬프트 복사] + [결과 붙여넣기] + [+].
3. 확인 시트(바텀시트).
4. `/entries/[id]` 수정·삭제·원문 보기.
5. `/analysis` 용의자 순위표.
6. `/export` CSV(entries + entry_tags 평탄화, 기간 선택).
7. `/settings` 초대 이메일 추가·목록, 시간대, 프롬프트 원문 보기.

## 6. 분석

### 6.1 입력
- 기간(기본 최근 30일), 창 W ∈ {2, 4, 8, 24}시간(기본 8), 표적 T ∈ {설사(bristol≥6), 급박 배변(urgency), 복통, 팽만}(기본 설사).

### 6.2 노출 후보와 비교 단위
| 후보 | 노출 정의 | 비교 단위 |
|---|---|---|
| 재료 태그 | 해당 tag가 붙은 식사 | 식사: 그 태그 든 식사 vs 안 든 식사 |
| 음식 이름 | foods[].name 일치 식사 | 식사 |
| 식사 패턴 | eating_pattern 포함 식사 | 식사 |
| 나쁜 수면 | sleep.quality ≤ 4 (기상일 기준) | 날: 해당 날 vs 나머지 날 |
| 높은 스트레스 | stress.level ≥ 6 | 날 |
| 고강도 운동 | exercise.intensity = 높음 | 날 |
| 약 | medication.name | 날 |

### 6.3 계산
- 식사 단위: 식사 시각 t에 대해 `(t, t+W]` 안에 표적 항목이 존재하면 hit. `p_exposed = hits/식사수(노출)`, `p_control = hits/식사수(비노출)`, `ratio = p_exposed / p_control`(p_control=0이면 ratio는 null, "비교 불가").
- 날 단위: 사용자 시간대의 날짜로 묶고, 그 날에 표적이 존재하면 hit. 같은 식으로 ratio.
- 노출 건수 < 3 → 회색 "자료 부족", 정렬 맨 아래.
- 정렬: ratio 내림차순, 동률이면 노출 건수 내림차순.
- 구현: Postgres 함수 `suspect_ranking(p_from, p_to, p_window_hours, p_target)` → `(candidate, group, exposed_n, exposed_hits, control_n, control_hits, ratio)`. `auth.uid()`로 본인 데이터만.
- 행 탭 → 그 후보의 노출 사건 목록과 각 창 안 표적 사건(`suspect_detail`).

### 6.4 고정 문구
표 위: "연관은 가설입니다. 확인은 한 가지씩 3일 재도입으로."

## 7. 오류 처리
- 저장 RPC 실패(네트워크 포함): 확인 시트 내용을 `localStorage` 큐에 저장. 다음 로드 시 배너 "보내지 못한 기록 N건 · 다시 보내기". 성공 시 큐에서 제거.
- 클립보드 쓰기 실패(권한): 프롬프트 전문을 화면에 펼쳐 수동 복사 안내.
- 세션 만료: 로그인 화면으로, 입력창 내용은 `sessionStorage`에 보존.
- RLS 위반·not_invited는 사용자 문구로 번역해 표시.

## 8. 테스트
| 층 | 내용 |
|---|---|
| 유닛 | 정제·zod 검증: 정상 JSON, ``` 섞인 JSON, 앞뒤 설명 섞인 JSON, 깨진 JSON, 미래 시각, unknown 시각 |
| 유닛 | 프롬프트 채우기: 기준 시각 형식(요일·오프셋), 음식 사전 절 삽입 |
| DB | `save_entries` 트랜잭션: 중간 실패 시 raw_inputs도 안 남는지 |
| DB | `suspect_ranking`: 시드 20건으로 손계산 ratio와 일치, 자료 부족 회색, p_control=0 처리 |
| DB | RLS: 사용자 A 세션에서 B의 entries 0건 |
| DB | invites 트리거: 미등록 이메일 insert 거부 |
| E2E(Playwright 1개) | 로그인 우회 → 입력 → 결과 붙여넣기(예시 JSON) → 확인 시트 카드 3장 → 저장 → 타임라인 카드 3장 |

## 9. 범위 밖 (이번에 안 만드는 것)
- 앱 내 LLM 호출, 음성 인식 API
- 재도입 일정 안내
- 푸시 알림·리마인더
- 가족 간 기록 공유·열람
- iOS 단축어·Android 공유 시트 연동(복붙 마찰이 크면 다음 단계)
- 오프라인 전체 기능(로컬 우선 동기화)

## 10. 파일
- 프롬프트 정본: `prompts/parse-ko.md` (앱 빌드 시 문자열로 포함)
- 이 문서: `docs/superpowers/specs/2026-09-03-gut-log-design.md`
