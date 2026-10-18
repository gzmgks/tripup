// Small wording helpers for the settle-up screens (calm voice: "You owe Maya €20").

import { memberName } from '../../components/names'
import { formatEUR } from '../../domain/money'
import type { Cents, MemberId } from '../../domain/types'

/** Pronouns as the Figma copy uses them ("Maya confirms she received it", "Ren pays his €25 share"). */
const PRONOUNS: Partial<Record<MemberId, { subject: string; possessive: string }>> = {
  maya: { subject: 'she', possessive: 'her' },
  ren: { subject: 'he', possessive: 'his' },
}

export const subjectOf = (m: MemberId) => PRONOUNS[m]?.subject ?? 'they'
export const possessiveOf = (m: MemberId) => PRONOUNS[m]?.possessive ?? 'their'

/** "You" for the logged-in user, the name for everyone else. */
export const who = (m: MemberId, me: MemberId) => (m === me ? 'You' : memberName(m))

/** Amounts inside sentences drop a trailing .00, as in Figma ("the group owes you €136 for it"). */
export const prose = (cents: Cents) => formatEUR(cents, { decimals: 'auto' })

/** "owes €20.00" · "is owed €100.00" · "all square". Never red, never "outstanding". */
export function balanceWords(cents: Cents): string {
  if (cents < 0) return `owes ${formatEUR(-cents)}`
  if (cents > 0) return `is owed ${formatEUR(cents)}`
  return 'all square'
}

/** "Lisbon with the crew" → "Lisbon" (for "Lisbon trip balance", "Lisbon is squared up"). */
export const tripPlace = (tripName: string) => tripName.split(' with ')[0]
