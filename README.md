# 똥글 (ddeongle)

설사 유발요인을 찾는 가족용 기록 PWA. 앱은 LLM을 호출하지 않는다 — 사용자가 프롬프트를 복사해 자기 LLM에 붙여넣고 결과 JSON을 앱에 붙여넣는다.

- 명세: `docs/superpowers/specs/2026-09-03-gut-log-design.md`, 리디자인 `docs/superpowers/specs/2026-09-03-gut-log-redesign-design.md`
- 프롬프트 정본: `prompts/parse-ko.md`

## 로컬

1. `open -a Docker && supabase start`
2. `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase start 출력의 anon key>`
3. `supabase/seed.sql`의 이메일을 본인 것으로 두고 `supabase db reset`
4. `npm run dev` → http://localhost:3000 → 로그인 링크는 http://127.0.0.1:54324 (Mailpit)

## 테스트

`npm test` · `supabase test db` · `npm run build` · `npm run test:e2e`

## 배포 (개인 계정)

| 구성 | 값 |
|---|---|
| GitHub | `Epikoding/ddeongle` (비공개). push는 `dj-wishket`(collaborator)이 하되 **커밋 작성자는 이 저장소의 로컬 git config대로 Epikoding** — Vercel Hobby는 연결된 GitHub 계정이 작성한 커밋만 배포한다 |
| Supabase | 프로젝트 `ddeongle` (ref `ufhaasemnmaowjefcisd`), 리전 Seoul, 조직 Epikoding's Org |
| Vercel | 프로젝트 `ddeongle` (팀 dongjae-lees-projects), 프로덕션 https://ddeongle.vercel.app (별칭 gut-log-weld.vercel.app도 유지) |
| Auth | Site URL = https://ddeongle.vercel.app, Redirect = `/auth/callback` 다섯 패턴(ddeongle · weld · 팀 별칭 2 · 프리뷰 와일드카드 2) |

절차:
1. `supabase link --project-ref ufhaasemnmaowjefcisd` → `supabase db push`
2. 초대: `supabase db query --linked "insert into public.invites(email) values ('<이메일>') on conflict do nothing"`
3. `vercel link` → `vercel env add NEXT_PUBLIC_SUPABASE_URL production` / `NEXT_PUBLIC_SUPABASE_ANON_KEY production` → `vercel --prod`
4. Vercel이 GitHub `Epikoding/ddeongle`에 연결돼 있어 `git push origin main`이면 자동으로 프로덕션 배포된다(다른 브랜치는 프리뷰). 첫 배포 때만 3번을 손으로 돌렸다.

알아 둘 것:
- 로그인 링크는 **요청한 기기·브라우저에서 열어야** 한다(PKCE). 기본 발송기라 이메일 템플릿을 token_hash 방식으로 못 바꾼다 — 커스텀 SMTP를 붙이면 바꿀 수 있다.
- 기본 발송기는 시간당 발송 수 제한이 있다(가족 몇 명 규모면 충분).
- DB 비밀번호·anon 키는 `.work/deploy/secrets.env`(git 제외).
