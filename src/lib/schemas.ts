import { z } from 'zod'

export const KINDS = ['meal', 'symptom', 'bowel', 'sleep', 'stress', 'exercise', 'medication', 'cycle', 'note'] as const
export type Kind = (typeof KINDS)[number]

export function normalizeTag(s: string): string {
  return s.trim().replace(/\s+/g, ' ')
}

const nullableInt = (min: number, max: number) => z.number().int().min(min).max(max).nullable()

export const mealDataSchema = z.object({
  meal_type: z.enum(['아침', '점심', '저녁', '간식']).nullable().default(null),
  foods: z.array(z.object({
    name: z.string().min(1),
    ingredients: z.array(z.string()).default([]).transform((a) => a.map(normalizeTag).filter((t) => t !== '')),
    amount: z.enum(['적게', '보통', '많이']).nullable().default(null),
  })).default([]),
  eating_pattern: z.array(z.enum(['급하게', '거른 끼니 후', '과식', '찬 음료', '기름진'])).default([]),
})
export const symptomDataSchema = z.object({
  type: z.enum(['복통', '팽만', '가스', '오심', '속쓰림', '두통', '피로', '기타']),
  severity: nullableInt(0, 10).default(null),
  note: z.string().nullable().default(null),
})
export const bowelDataSchema = z.object({
  bristol: nullableInt(1, 7).default(null),
  urgency: z.boolean().nullable().default(null),
  nocturnal: z.boolean().default(false),
  blood: z.boolean().nullable().default(null),
  note: z.string().nullable().default(null),
})
export const sleepDataSchema = z.object({
  quality: nullableInt(0, 10).default(null),
  hours: z.number().min(0).max(24).nullable().default(null),
  note: z.string().nullable().default(null),
})
export const stressDataSchema = z.object({
  level: nullableInt(0, 10).default(null),
  cause: z.string().nullable().default(null),
})
export const exerciseDataSchema = z.object({
  type: z.enum(['걷기', '달리기', '자전거', '수영', '근력', '요가', '기타']),
  minutes: z.number().int().min(0).nullable().default(null),
  intensity: z.enum(['낮음', '중간', '높음']).nullable().default(null),
})
export const medicationDataSchema = z.object({
  name: z.string().min(1),
  dose: z.string().nullable().default(null),
})
export const cycleDataSchema = z.object({
  event: z.enum(['시작', '진행중', '종료', '배란 추정']),
})
export const noteDataSchema = z.object({ text: z.string().min(1) })

export type MealData = z.infer<typeof mealDataSchema>
export type SymptomData = z.infer<typeof symptomDataSchema>
export type BowelData = z.infer<typeof bowelDataSchema>
export type SleepData = z.infer<typeof sleepDataSchema>
export type StressData = z.infer<typeof stressDataSchema>
export type ExerciseData = z.infer<typeof exerciseDataSchema>
export type MedicationData = z.infer<typeof medicationDataSchema>
export type CycleData = z.infer<typeof cycleDataSchema>
export type NoteData = z.infer<typeof noteDataSchema>

const base = {
  occurred_at: z.string().datetime({ offset: true }),
  time_precision: z.enum(['exact', 'approx', 'unknown']).default('exact'),
  source_text: z.string().nullable().default(null),
}

export const entrySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('meal'), ...base, data: mealDataSchema }),
  z.object({ kind: z.literal('symptom'), ...base, data: symptomDataSchema }),
  z.object({ kind: z.literal('bowel'), ...base, data: bowelDataSchema }),
  z.object({ kind: z.literal('sleep'), ...base, data: sleepDataSchema }),
  z.object({ kind: z.literal('stress'), ...base, data: stressDataSchema }),
  z.object({ kind: z.literal('exercise'), ...base, data: exerciseDataSchema }),
  z.object({ kind: z.literal('medication'), ...base, data: medicationDataSchema }),
  z.object({ kind: z.literal('cycle'), ...base, data: cycleDataSchema }),
  z.object({ kind: z.literal('note'), ...base, data: noteDataSchema }),
])
export type Entry = z.infer<typeof entrySchema>

export const parsedResultSchema = z.object({
  entries: z.array(z.unknown()),
  questions: z.array(z.string()).default([]),
})
export type ParsedResult = { entries: Entry[]; questions: string[] }

export const KIND_LABEL: Record<Kind, string> = {
  meal: '식사', symptom: '증상', bowel: '배변', sleep: '수면', stress: '스트레스',
  exercise: '운동', medication: '약', cycle: '월경', note: '메모',
}
