import { test, expect } from '@playwright/test'
import { loginUrlFor, removeInvite } from './helpers'

// 실행일에 묶이지 않게 어제 날짜를 실행 시각에서 뽑는다.
// 앱의 하루 경계는 프로필 시간대(profiles.timezone 기본 'Asia/Seoul')이므로 KST로 계산하고
// 오프셋도 +09:00으로 적는다(한국은 서머타임이 없어 늘 같다).
function kstDateStr(offsetDays: number): string {
  return new Date(Date.now() + 9 * 3600_000 + offsetDays * 24 * 3600_000).toISOString().slice(0, 10)
}
const YESTERDAY = kstDateStr(-1)
const at = (hhmm: string) => `${YESTERDAY}T${hhmm}:00+09:00`

const pasted = JSON.stringify({
  entries: [
    { kind: 'sleep', occurred_at: at('07:00'), time_precision: 'approx', source_text: '어제는 잠을 잘 못 잤어', data: { quality: 3, hours: null, note: '잠을 잘 못 잤어' } },
    { kind: 'meal', occurred_at: at('12:00'), time_precision: 'exact', source_text: '어제 12시에 김치찌개랑 공깃밥 먹었고', data: { meal_type: '점심', foods: [{ name: '김치찌개', ingredients: ['김치', '돼지고기', '두부', '마늘', '파', '고춧가루'], amount: null }, { name: '공깃밥', ingredients: ['쌀'], amount: null }], eating_pattern: [] } },
    { kind: 'symptom', occurred_at: at('19:45'), time_precision: 'exact', source_text: '저녁엔 배가 좀 아팠어', data: { type: '복통', severity: 3, note: '배가 좀 아팠어' } },
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
  await page.getByTestId('input-text').fill('어제 12시에 김치찌개랑 공깃밥 먹었고 어제는 잠을 잘 못 잤어 저녁엔 배가 좀 아팠어')
  await page.getByTestId('copy-prompt').click()
  await page.getByTestId('paste-text').fill('```json\n' + pasted + '\n```')
  await page.getByTestId('submit-paste').click()

  const sheet = page.getByTestId('confirm-sheet')
  await expect(sheet).toBeVisible()
  await expect(sheet.getByText('김치찌개, 공깃밥')).toBeVisible()
  await expect(sheet.getByText('수면 질 3/10')).toBeVisible()
  await page.getByTestId('save-entries').click()
  await expect(sheet).toBeHidden()

  // 저장한 세 건은 모두 어제 것이다 — 달력에서 특정 날짜를 고르면 실행일에 묶이므로
  // 헤더의 '하루 전'으로 하루만 물러나 확인한다.
  await page.getByRole('button', { name: '하루 전' }).click()
  await expect(page.getByText('김치찌개, 공깃밥')).toBeVisible()
  await expect(page.getByText('복통 · 강도 3/10')).toBeVisible()
  await expect(page.getByText('수면 질 3/10')).toBeVisible()

  // 달력은 열리는지만 본다 — 날짜 칸을 고르는 단정은 실행일에 묶인다.
  // react-day-picker 10은 달 표를 role="grid"로 그린다(DayPicker.js의 MonthGrid).
  await page.getByTestId('calendar-button').click()
  await expect(page.getByRole('grid')).toBeVisible()
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
  await page.getByRole('radio', { name: '7 물' }).click()
  await page.getByRole('button', { name: '급했음' }).click()
  await page.getByTestId('form-save').click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByText('변 굳기 7 · 급함')).toBeVisible()
})
