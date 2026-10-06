import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, RotateCcw, Zap } from 'lucide-react'
import GameAmbience from '../components/GameAmbience'

type GameState = 'idle' | 'waiting' | 'go' | 'early' | 'intermission' | 'done'

export default function ReactionTime({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<GameState>('idle')
  const [scores, setScores] = useState<number[]>([])
  const [lastScore, setLastScore] = useState<number | null>(null)
  const [best, setBest] = useState<number | null>(null)
  const goAt = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const round = scores.length + 1
  const average = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  function beginRound() {
    if (timer.current) clearTimeout(timer.current)
    setState('waiting')
    timer.current = setTimeout(() => {
      goAt.current = performance.now()
      setState('go')
    }, 1400 + Math.random() * 2200)
  }

  function startGame() {
    setScores([])
    setLastScore(null)
    beginRound()
  }

  function handleTap() {
    if (state === 'idle' || state === 'done') {
      startGame()
      return
    }
    if (state === 'early') {
      beginRound()
      return
    }
    if (state === 'waiting') {
      if (timer.current) clearTimeout(timer.current)
      setState('early')
      return
    }
    if (state === 'intermission') {
      beginRound()
      return
    }
    if (state === 'go') {
      const score = Math.round(performance.now() - goAt.current)
      const next = [...scores, score]
      setScores(next)
      setLastScore(score)
      setBest(current => current === null || score < current ? score : current)
      setState(next.length === 3 ? 'done' : 'intermission')
    }
  }

  const panelCopy: Record<GameState, { title: string; detail: string }> = {
    idle: { title: 'Ready when you are', detail: 'Start a 3-round run. Wait for the signal, then tap as fast as you can.' },
    waiting: { title: 'Wait for it…', detail: 'Hold steady. Tapping early resets this round.' },
    go: { title: 'TAP NOW', detail: 'Nice and quick.' },
    early: { title: 'Too soon.', detail: 'The signal wasn’t up yet. Give it another try.' },
    intermission: { title: `Round ${scores.length} complete`, detail: 'Take a breath, then continue when you’re ready.' },
    done: { title: 'Run complete', detail: 'Three signals, one very unofficial reaction report.' },
  }

  const tone = state === 'go' ? 'signal-go' : state === 'waiting' ? 'signal-wait' : state === 'early' ? 'signal-early' : 'signal-idle'

  return (
    <main className="explore-page game-page reaction-page">
      <div className="explore-glow" aria-hidden="true" />
      <GameAmbience kind="balloons" />
      <header className="explore-header">
        <button className="back-button" onClick={onBack} type="button"><ArrowLeft size={16} /><span>Back to games</span></button>
        <div className="brand-mark"><Zap size={14} /><span>PLAY / 01</span></div>
      </header>

      <section className="game-content" aria-labelledby="game-title">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4 }}>
          <div className="eyebrow"><Zap size={14} /> REACTION TIME</div>
          <h1 id="game-title" className="game-title">How quick<br /><span>are you?</span></h1>
          <p className="explore-intro">A tiny test of timing. Three rounds, no pressure, highly unscientific. Pop a balloon for a little color, or hold and drag one anywhere.</p>
        </motion.div>

        <div className="game-layout">
          <div className="game-main">
            <button
              type="button"
              className={`signal-panel ${tone}`}
              onClick={handleTap}
              aria-label={state === 'go' ? 'Signal is green. Tap now.' : state === 'waiting' ? 'Waiting for the green signal. Do not tap yet.' : 'Reaction time game area'}
              aria-live="polite"
            >
              <span className="signal-orb" aria-hidden="true" />
              <span className="signal-title">{panelCopy[state].title}</span>
              <span className="signal-detail">{panelCopy[state].detail}</span>
              {(state === 'idle' || state === 'early' || state === 'done') && (
                <span className="signal-action">{state === 'done' ? <><RotateCcw size={15} /> Play again</> : 'Start round'} <span aria-hidden="true">↗</span></span>
              )}
              {state === 'intermission' && <span className="signal-action">Continue <span aria-hidden="true">↗</span></span>}
              {state === 'waiting' && <span className="wait-dots" aria-hidden="true"><i /><i /><i /></span>}
            </button>
            <p className="game-instruction">{state === 'waiting' ? 'Wait until the panel turns green.' : state === 'go' ? 'Tap anywhere on the panel.' : 'Each round starts with a different wait.'}</p>
          </div>

          <aside className="score-panel" aria-label="Run stats">
            <div className="score-heading">THIS RUN</div>
            <div className="round-dots" aria-label={`Round ${Math.min(round, 3)} of 3`}>
              {[0, 1, 2].map(index => <span key={index} className={index < scores.length ? 'round-dot is-complete' : index === scores.length && state !== 'done' ? 'round-dot is-current' : 'round-dot'} />)}
              <span className="round-label">{state === 'done' ? '3 ROUNDS' : `ROUND ${Math.min(round, 3)} / 3`}</span>
            </div>
            <div className="score-row"><span>Last</span><strong>{lastScore === null ? '—' : `${lastScore} ms`}</strong></div>
            <div className="score-row"><span>Average</span><strong>{average === null ? '—' : `${average} ms`}</strong></div>
            <div className="score-row"><span>Best</span><strong>{best === null ? '—' : `${best} ms`}</strong></div>
            {state === 'done' && <p className="score-note">{average !== null && average < 260 ? 'Quick hands. Suspiciously quick.' : 'A respectable little sprint.'}</p>}
          </aside>
        </div>
        <p className="game-disclaimer">Just for fun. Scores stay in this session.</p>
      </section>
    </main>
  )
}
