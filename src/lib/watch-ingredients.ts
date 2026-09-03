export const WATCH_INGREDIENTS: readonly string[] = [
  '양파', '마늘', '파', '밀', '우유', '치즈', '요거트', '버터', '콩', '두부',
  '사과', '배', '수박', '버섯', '양배추', '고추', '고춧가루', '기름', '커피', '술',
  '탄산', '인공감미료', '꿀', '견과',
]

export function isWatched(tag: string): boolean {
  return WATCH_INGREDIENTS.includes(tag.trim())
}
