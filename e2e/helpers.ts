import { createClient } from '@supabase/supabase-js'
import { execSync } from 'node:child_process'

// `supabase status -o json`은 JSON 앞뒤에 "Stopped services: […]"·CLI 업데이트 안내 같은
// 사람용 줄을 섞어 내보낸다. 그래서 첫 `{`부터 마지막 `}`까지만 잘라 파싱한다.
function localKeys() {
  const out = execSync('supabase status -o json', { cwd: process.cwd() }).toString()
  const j = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1))
  const url = j.API_URL as string | undefined
  const service = (j.SERVICE_ROLE_KEY ?? j.SECRET_KEY) as string | undefined
  if (!url || !service) throw new Error(`supabase status에서 API_URL/SERVICE_ROLE_KEY를 찾지 못했습니다: ${Object.keys(j).join(', ')}`)
  return { url, service }
}

export async function loginUrlFor(email: string): Promise<string> {
  const { url, service } = localKeys()
  const admin = createClient(url, service, { auth: { persistSession: false } })
  const { error: inviteError } = await admin.from('invites').upsert({ email })
  if (inviteError) throw inviteError
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (error) throw error
  // 아직 가입되지 않은 이메일이면 GoTrue가 magiclink 요청에도 signup 링크를 내준다
  // (properties.verification_type === 'signup'). 그 값 그대로 verifyOtp에 넘겨야 검증된다.
  const type = data.properties.verification_type || 'magiclink'
  return `/auth/callback?token_hash=${data.properties.hashed_token}&type=${type}`
}

export async function removeInvite(email: string): Promise<void> {
  const { url, service } = localKeys()
  const admin = createClient(url, service, { auth: { persistSession: false } })
  await admin.from('invites').delete().eq('email', email)
}
