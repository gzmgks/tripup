import { arrowKeys } from '../../components/arrowKeys'
import { Avatar } from '../../components/Avatar'
import { memberName } from '../../components/names'
import { OptionCard } from '../../components/OptionCard'
import { Sheet } from '../../components/Sheet'
import { useApp } from '../../store/app'
import { useShallow } from 'zustand/react/shallow'
import styles from './PaidByPicker.module.css'

/** "Paid by ▾" (07): pick who paid. Only crew can pay a group bill; a guest's share goes to the payer. */
export function PaidByPicker({ onClose }: { onClose: () => void }) {
  const { data, bill, setPaidBy } = useApp(useShallow((s) => ({ data: s.data, bill: s.bill, setPaidBy: s.setPaidBy })))
  const me = data.trip.me
  if (!bill) return null

  return (
    <Sheet title="Who paid?" onClose={onClose}>
      {/* Picking closes the picker, so arrow keys only move focus here; Space or Enter picks. */}
      <div className={styles.list} role="radiogroup" aria-label="Who paid?" onKeyDown={arrowKeys({ select: false })}>
        {data.crew.map((m) => (
          <OptionCard
            key={m}
            title={m === me ? `${memberName(m)} (you)` : memberName(m)}
            selected={bill.paidBy === m}
            onSelect={() => {
              setPaidBy(m)
              onClose()
            }}
            leading={<Avatar member={m} size={36} labelled={false} />}
          />
        ))}
      </div>
    </Sheet>
  )
}
