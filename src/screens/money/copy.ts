// Small wording helpers for the settle-up screens (calm voice: "You owe Maya €20").

import { memberName } from '../../components/names'
import { formatEUR } from '../../domain/money'
import type { Cents, MemberId } from '../../domain/types'
import { guestOwedTo } from '../../store/selectors'
import type { MoneyView, SettleRow } from '../../store/selectors'

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

/** "Ren owes you €25" · "Ren owes €25" (in someone else's row): guest shares still open to one person. */
export function guestOwesWords(rows: SettleRow[], you: boolean): string | null {
  if (!rows.length) return null
  const names = [...new Set(rows.map((r) => memberName(r.transfer.from)))]
  const total = rows.reduce((sum, r) => sum + r.transfer.amountCents, 0)
  return `${names.join(' and ')} ${names.length === 1 ? 'owes' : 'owe'}${you ? ' you' : ''} ${prose(total)}`
}

/**
 * Your standing at €0 with the group. A guest pays their share to you directly, outside the
 * group balance, so while it's open it is said too: ["You’re square with the group", "Ren owes you €25"].
 * Joined with " · " on one line, stacked where there's no room.
 */
export function squareParts(view: MoneyView, me: MemberId): string[] {
  const guests = guestOwesWords(guestOwedTo(view, me), true)
  return guests ? ['You’re square with the group', guests] : ['You’re all square']
}

/** " (incl. Ren)": the guest's own payment counts among the trip's payments ("1 of 4 payments (incl. Ren)"). */
export function inclGuests(view: MoneyView): string {
  const names = [...new Set(view.rows.filter((r) => r.guest).map((r) => memberName(r.transfer.from)))]
  return names.length ? ` (incl. ${names.join(' and ')})` : ''
}

/** "Lisbon with the crew" → "Lisbon" (for "Lisbon trip balance", "Lisbon is squared up"). */
export const tripPlace = (tripName: string) => tripName.split(' with ')[0]
