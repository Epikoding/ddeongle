import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { updateEntry, deleteEntry, updateTimezone, getProfile } from '@/lib/db'

type Result = { data: unknown; error: { message: string } | null }

type Builder = {
  select: (cols?: string) => Builder
  update: (patch: unknown) => Builder
  delete: () => Builder
  insert: (rows: unknown) => Builder
  eq: (col: string, value: unknown) => Builder
  is: (col: string, value: unknown) => Builder
  single: () => Builder
  maybeSingle: () => Builder
  then: (onOk: (v: Result) => unknown, onErr?: (e: unknown) => unknown) => Promise<unknown>
}

function makeBuilder(result: Result, calls: string[]): Builder {
  const b: Builder = {
    select: (cols) => { calls.push(`select(${cols ?? ''})`); return b },
    update: () => { calls.push('update'); return b },
    delete: () => { calls.push('delete'); return b },
    insert: () => { calls.push('insert'); return b },
    eq: () => { calls.push('eq'); return b },
    is: () => { calls.push('is'); return b },
    single: () => { calls.push('single'); return b },
    maybeSingle: () => { calls.push('maybeSingle'); return b },
    then: (onOk, onErr) => Promise.resolve(result).then(onOk, onErr),
  }
  return b
}

/** 모든 from()이 같은 결과를 돌려주는 최소 가짜 클라이언트. */
function fakeClient(result: Result) {
  const calls: string[] = []
  const sb = { from: (table: string) => { calls.push(`from(${table})`); return makeBuilder(result, calls) } }
  return { sb: sb as unknown as SupabaseClient, calls }
}

const NONE: Result = { data: [], error: null }
const ONE: Result = { data: [{ id: 'x', user_id: 'u' }], error: null }

describe('0행 갱신 검출', () => {
  it('updateEntry: 갱신된 행이 없으면 not_found', async () => {
    const { sb } = fakeClient(NONE)
    await expect(updateEntry(sb, 'missing', { occurred_at: '2026-09-03T01:00:00+09:00' })).rejects.toThrow('not_found')
  })

  it('updateEntry: 한 행이 갱신되면 통과', async () => {
    const { sb, calls } = fakeClient(ONE)
    await expect(updateEntry(sb, 'x', { occurred_at: '2026-09-03T01:00:00+09:00' })).resolves.toBeUndefined()
    expect(calls).toContain('from(entries)')
  })

  it('deleteEntry: 지울 행이 없으면 not_found', async () => {
    const { sb } = fakeClient(NONE)
    await expect(deleteEntry(sb, 'missing')).rejects.toThrow('not_found')
  })

  it('deleteEntry: 한 행이 지워지면 통과', async () => {
    const { sb } = fakeClient(ONE)
    await expect(deleteEntry(sb, 'x')).resolves.toBeUndefined()
  })

  it('updateTimezone: 갱신된 행이 없으면 not_found', async () => {
    const { sb } = fakeClient(NONE)
    await expect(updateTimezone(sb, 'missing', 'Asia/Seoul')).rejects.toThrow('not_found')
  })

  it('updateTimezone: 한 행이 갱신되면 통과', async () => {
    const { sb } = fakeClient(ONE)
    await expect(updateTimezone(sb, 'u', 'Asia/Seoul')).resolves.toBeUndefined()
  })
})

describe('getProfile', () => {
  it('프로필 행이 없으면 profile_missing', async () => {
    const { sb } = fakeClient({ data: null, error: null })
    await expect(getProfile(sb)).rejects.toThrow('profile_missing')
  })

  it('행이 있으면 그대로 돌려준다', async () => {
    const { sb } = fakeClient({ data: { user_id: 'u', display_name: null, timezone: 'Asia/Seoul', is_admin: false }, error: null })
    await expect(getProfile(sb)).resolves.toEqual({ user_id: 'u', display_name: null, timezone: 'Asia/Seoul', is_admin: false })
  })

  // 설정 화면이 초대 폼을 보일지 말지를 이 값 하나로 정한다 — 빠뜨리면 관리자에게도 폼이 사라진다
  it('is_admin도 함께 읽어 온다', async () => {
    const { sb, calls } = fakeClient({ data: { user_id: 'u', display_name: null, timezone: 'Asia/Seoul', is_admin: true }, error: null })
    await expect(getProfile(sb)).resolves.toMatchObject({ is_admin: true })
    expect(calls).toContain('select(user_id, display_name, timezone, is_admin)')
  })

  it('에러는 메시지 그대로 올린다', async () => {
    const { sb } = fakeClient({ data: null, error: { message: 'boom' } })
    await expect(getProfile(sb)).rejects.toThrow('boom')
  })
})
