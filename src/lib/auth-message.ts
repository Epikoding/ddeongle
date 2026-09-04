// GoTrue가 주는 영어 오류를 로그인 화면에서 읽을 수 있는 한국말로 바꾼다.
// 모르는 문구는 감추지 않고 그대로 보여준다 — 원인을 알 수 없는 실패에 "다시 시도해 주세요"만
// 남기면 사용자도 우리도 무엇이 막혔는지 알 방법이 없다.
export function authMessage(raw: string): string {
  // 초대 트리거가 auth.users insert를 막으면 GoTrue는 그 예외를 'Database error …'로 싸서 준다
  if (/not_invited|Database error/i.test(raw)) return '초대가 필요합니다. 가족 관리자에게 이메일 등록을 부탁하세요.'
  if (/rate limit/i.test(raw)) return '메일 발송 한도에 걸렸습니다. 잠시 후 다시 시도해 주세요.'
  // 이 한 줄이 /expired/보다 먼저 와야 한다 — GoTrue는 틀린 코드와 만료된 코드에 같은 문구를 주는데,
  // 6자리를 손으로 옮겨 적는 흐름에서 흔한 쪽은 오타다. '만료'로 읽으면 오타를 고치는 대신 재발송을 누르게 된다.
  if (/Token has expired or is invalid/i.test(raw)) return '코드가 맞지 않습니다. 다시 확인해 주세요.'
  if (/expired/i.test(raw)) return '코드가 만료됐습니다. 다시 보내 주세요.'
  if (/invalid|not found/i.test(raw)) return '코드가 맞지 않습니다. 다시 확인해 주세요.'
  return raw
}
