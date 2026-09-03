import { test, expect } from '@playwright/test'
import { loginUrlFor } from './helpers'

const pasted = JSON.stringify({
  entries: [
    { kind: 'sleep', occurred_at: '2026-09-03T07:00:00+09:00', time_precision: 'approx', source_text: '어제는 잠을 잘 못 잤어', data: { quality: 3, hours: null, note: '잠을 잘 못 잤어' } },
    { kind: 'meal', occurred_at: '2026-09-03T12:00:00+09:00', time_precision: 'exact', source_text: '아까 12시에 김치찌개랑 공깃밥 먹었고', data: { meal_type: '점심', foods: [{ name: '김치찌개', ingredients: ['김치', '돼지고기', '두부', '마늘', '파', '고춧가루'], amount: null }, { name: '공깃밥', ingredients: ['쌀'], amount: null }], eating_pattern: [] } },
    { kind: 'symptom', occurred_at: '2026-09-03T19:45:00+09:00', time_precision: 'exact', source_text: '지금 배가 좀 아파', data: { type: '복통', severity: 3, note: '배가 좀 아파' } },
  ],
  questions: [],
})

test('붙여넣기 → 확인 → 저장 → 타임라인', async ({ page }) => {
  const email = `e2e-${Date.now()}@test.local`
  await page.goto(await loginUrlFor(email))
  await expect(page).toHaveURL(/\/$/)

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
  await page.locator('input[type=date]').fill('2026-09-03')
  await expect(page.getByText('김치찌개, 공깃밥')).toBeVisible()
  await expect(page.getByText('복통 · 강도 3/10')).toBeVisible()
  await expect(page.getByText('수면 질 3/10')).toBeVisible()
})

test('JSON이 아니면 빨간 문구', async ({ page }) => {
  const email = `e2e-${Date.now()}@test.local`
  await page.goto(await loginUrlFor(email))
  await page.getByTestId('paste-text').fill('네, 정리해 드릴게요! 식사는 ...')
  await page.getByTestId('submit-paste').click()
  await expect(page.getByRole('alert').filter({ hasText: 'JSON을 찾지 못했습니다' })).toBeVisible()
})
