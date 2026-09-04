import { describe, it, expect } from 'vitest'
import { authMessage } from '@/lib/auth-message'

describe('authMessage', () => {
  it('초대되지 않은 이메일은 초대 안내로', () => {
    expect(authMessage('Database error saving new user')).toBe('초대가 필요합니다. 가족 관리자에게 이메일 등록을 부탁하세요.')
    expect(authMessage('not_invited')).toBe('초대가 필요합니다. 가족 관리자에게 이메일 등록을 부탁하세요.')
  })

  it('발송 한도는 잠시 후 다시', () => {
    expect(authMessage('Email rate limit exceeded')).toBe('메일 발송 한도에 걸렸습니다. 잠시 후 다시 시도해 주세요.')
  })

  it('만료는 다시 보내라고', () => {
    expect(authMessage('otp_expired')).toBe('코드가 만료됐습니다. 다시 보내 주세요.')
  })

  it('틀린 코드는 다시 확인하라고', () => {
    expect(authMessage('Invalid token')).toBe('코드가 맞지 않습니다. 다시 확인해 주세요.')
    expect(authMessage('User not found')).toBe('코드가 맞지 않습니다. 다시 확인해 주세요.')
  })

  // GoTrue는 틀린 코드에도 이 문구를 준다 — 여기서 '만료'로 새면 사용자는 오타를 고치는 대신 재발송을 누른다
  it('만료·오타를 겸하는 GoTrue 문구는 오타 쪽으로 읽는다', () => {
    expect(authMessage('Token has expired or is invalid')).toBe('코드가 맞지 않습니다. 다시 확인해 주세요.')
  })

  it('모르는 문구는 원문 그대로', () => {
    expect(authMessage('boom')).toBe('boom')
  })
})
