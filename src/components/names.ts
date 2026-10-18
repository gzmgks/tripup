import type { MemberId } from '../domain/types'

const NAMES: Record<MemberId, string> = { ari: 'Ari', maya: 'Maya', theo: 'Theo', sam: 'Sam', nic: 'Nic', ren: 'Ren' }

export function memberName(member: MemberId): string {
  return NAMES[member]
}
