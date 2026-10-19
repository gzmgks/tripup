import { AnimatePresence } from 'framer-motion'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { arrowKeys } from '../../components/arrowKeys'
import { FullScreen } from '../../components/FullScreen'
import type { ListId } from '../../data/explore'
import type { Place } from '../../domain/types'
import { useApp } from '../../store/app'
import { ChatComposer, ExploreChat } from '../explore/ExploreChat'
import { ExploreIdeas, ExploreLists } from '../explore/ExploreLists'
import { PlaceActions } from '../explore/PlaceActions'
import { exploreStart, resetExploreStart } from '../explore/startView'
import { useAgentChat } from '../explore/useAgentChat'
import shared from './sheets.module.css'
import styles from './ExploreSheet.module.css'

type View = 'ai' | 'lists' | 'ideas'

/**
 * Explore, trip-wide (02 callout 129:4, grown into a full-screen view): an AI travel agent
 * that asks what, where, when and budget; curated lists of real Lisbon places; and the
 * group's Ideas. Every place can go to Ideas, a slot of tonight's plan, or the dinner poll.
 */
export function ExploreSheet() {
  const closeSheet = useApp((s) => s.closeSheet)
  const ideas = useApp((s) => s.ideas.length)
  const chat = useAgentChat()

  // Where it opens: the agent, or a list / Ideas when the opener asked (startView.ts).
  const [start] = useState(exploreStart)
  useEffect(() => resetExploreStart(), [])
  const [view, setView] = useState<View>(start === 'ai' || start === 'ideas' ? start : 'lists')
  const [list, setList] = useState<ListId>(start === 'ai' || start === 'ideas' ? 'top10' : start)
  const [adding, setAdding] = useState<Place | null>(null)

  // A new view starts at its top, not at the last view's scroll offset (FullScreen's body scrolls).
  const panel = useRef<HTMLDivElement>(null)
  const shownView = useRef(view)
  useLayoutEffect(() => {
    if (shownView.current === view) return
    shownView.current = view
    panel.current?.parentElement?.scrollTo({ top: 0 })
  }, [view])

  const views: { id: View; label: string }[] = [
    { id: 'ai', label: 'Ask AI' },
    { id: 'lists', label: 'Lists' },
    { id: 'ideas', label: `Your Ideas · ${ideas}` },
  ]

  return (
    <FullScreen title="Explore" onClose={closeSheet} footer={view === 'ai' ? <ChatComposer onSend={chat.ask} /> : undefined}>
      {/* The segmented control as tabs: Lime = the view you're in. It stays put while the view scrolls. */}
      <div className={styles.top} data-sticky>
        <div className={shared.segmented} role="tablist" aria-label="Explore" onKeyDown={arrowKeys()}>
          {views.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              id={`explore-tab-${v.id}`}
              aria-selected={view === v.id}
              aria-controls="explore-panel"
              tabIndex={view === v.id ? 0 : -1}
              className={`${shared.segment} ${view === v.id ? shared.segmentOn : ''}`}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div id="explore-panel" ref={panel} className={styles.panel} role="tabpanel" aria-labelledby={`explore-tab-${view}`}>
        {view === 'ai' && (
          <ExploreChat
            chat={chat}
            onAdd={setAdding}
            onBrowse={(id) => {
              setList(id)
              setView('lists')
            }}
          />
        )}
        {view === 'lists' && <ExploreLists list={list} onList={setList} onAdd={setAdding} />}
        {view === 'ideas' && <ExploreIdeas onAdd={setAdding} />}
      </div>

      <AnimatePresence>{adding && <PlaceActions key={adding.id} place={adding} onClose={() => setAdding(null)} />}</AnimatePresence>
    </FullScreen>
  )
}
