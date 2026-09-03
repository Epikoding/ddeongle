import template from '../../prompts/parse-ko.md'
import { formatReference } from './time'

export type FoodHint = { name: string; ingredients: string[] }

function body(): string {
  const i = template.indexOf('\n---\n')
  return i === -1 ? template : template.slice(i + 5).trimStart()
}

export function buildPrompt(args: { text: string; referenceAt: Date; tz: string; foods?: FoodHint[] }): string {
  let out = body()
    .replace('{{기준_시각}}', formatReference(args.referenceAt, args.tz))
  if (args.foods && args.foods.length > 0) {
    const lines = args.foods.map((f) => `- ${f.name}: ${f.ingredients.join(', ')}`).join('\n')
    const section = `## 이 사용자의 등록 음식\n\n아래 음식은 이 사용자가 재료를 직접 정한 것이다. 이름이 나오면 이 재료 목록을 그대로 쓴다.\n\n${lines}\n\n`
    out = out.replace('## 변환할 문장', `${section}## 변환할 문장`)
  }
  // 마지막 --- 뒤의 "## 변환할 문장" 절에서 두 번째 {{입력_문장}}만 남아 있다
  out = out.replace('{{입력_문장}}', args.text.trim())
  return out
}
