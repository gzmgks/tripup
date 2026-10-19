import { useEffect, useRef, useState } from 'react'
import { useApp } from '../../store/app'
import { greeting, isStartOver, notUnderstood, parseRequest, respond } from './agent'
import type { AgentTurn, Answers, Choice, Question } from './agent'
import { agentContext } from './tonight'

export interface ChatMessage {
  id: number
  from: 'agent' | 'me'
  lines: string[]
  ask?: Question
  ids?: string[]
}

export interface AgentChat {
  log: ChatMessage[]
  answers: Answers
  /** The agent is "typing" its reply. */
  typing: boolean
  /** How Ari last answered: a tapped chip hands focus on to the reply, typing keeps it in the field. */
  via: 'chip' | 'text'
  choose: (question: Question, choice: Choice) => void
  ask: (text: string) => void
  restart: () => void
}

/** A short pause, so a reply reads as a reply (the same with reduced motion: nothing moves). */
const REPLY_MS = 650

/**
 * The Explore chat: Ari's answers go in at once, the agent's turn follows after the pause,
 * worked out from the story state at that moment (src/screens/explore/agent.ts).
 * Lives in ExploreSheet, so switching to a list and back keeps the conversation.
 */
export function useAgentChat(): AgentChat {
  const name = useApp((s) => s.data.members.find((m) => m.id === s.data.trip.me)?.name ?? '')
  // Message ids: the greeting is 0, the rest count up from the handlers.
  const ids = useRef(0)
  const [log, setLog] = useState<ChatMessage[]>(() => [{ id: 0, from: 'agent', ...greeting(name) }])
  const [answers, setAnswers] = useState<Answers>({})
  const [typing, setTyping] = useState(false)
  const [via, setVia] = useState<'chip' | 'text'>('chip')
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const send = (text: string, next: Answers, reply: (a: Answers) => AgentTurn, how: 'chip' | 'text') => {
    window.clearTimeout(timer.current)
    setLog((l) => [...l, { id: ++ids.current, from: 'me', lines: [text] }])
    setAnswers(next)
    setVia(how)
    setTyping(true)
    timer.current = window.setTimeout(() => {
      setTyping(false)
      setLog((l) => [...l, { id: ++ids.current, from: 'agent', ...reply(next) }])
    }, REPLY_MS)
  }
  const context = () => agentContext(useApp.getState())

  const restart = () => {
    window.clearTimeout(timer.current)
    setTyping(false)
    setAnswers({})
    setVia('chip')
    setLog([{ id: ++ids.current, from: 'agent', ...greeting(name) }])
  }

  return {
    log,
    answers,
    typing,
    via,
    // The chip's own words become Ari's message; its value is one of that question's answers.
    choose: (question, choice) => send(choice.label, { ...answers, [question]: choice.value } as Answers, (a) => respond(a, context()), 'chip'),
    ask: (text) => {
      if (isStartOver(text)) {
        restart()
        setVia('text')
        return
      }
      // Whatever it recognises fills in (or changes) those answers; the rest is asked as usual.
      const heard = parseRequest(text)
      const understood = Object.keys(heard).length > 0
      send(text, understood ? { ...answers, ...heard } : answers, (a) => (understood ? respond(a, context()) : notUnderstood(a)), 'text')
    },
    restart,
  }
}
