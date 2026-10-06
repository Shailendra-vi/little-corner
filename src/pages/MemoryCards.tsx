import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, RotateCcw, Sparkles } from 'lucide-react'
import GameAmbience from '../components/GameAmbience'

const faces = ['✦', '◉', '⌁', '◆', '✧', '⬡', '☼', '⌘']
type Card = { id: number; face: string }
type GameState = 'idle' | 'playing' | 'done'

function shuffledDeck(): Card[] {
  const deck = [...faces, ...faces].map((face, id) => ({ id, face }))
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1))
    ;[deck[index], deck[other]] = [deck[other], deck[index]]
  }
  return deck
}

function formatTime(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000)
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}

export default function MemoryCards({ onBack }: { onBack: () => void }) {
  const [deck, setDeck] = useState<Card[]>([])
  const [state, setState] = useState<GameState>('idle')
  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<number[]>([])
  const [moves, setMoves] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const startedAt = useRef<number | null>(null)
  const flipTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const locked = useRef(false)

  useEffect(() => () => { if (flipTimer.current) clearTimeout(flipTimer.current) }, [])

  useEffect(() => {
    if (state !== 'playing') return
    const interval = setInterval(() => {
      if (startedAt.current !== null) setElapsed(Date.now() - startedAt.current)
    }, 250)
    return () => clearInterval(interval)
  }, [state])

  function startGame() {
    if (flipTimer.current) clearTimeout(flipTimer.current)
    setDeck(shuffledDeck())
    setFlipped([])
    setMatched([])
    setMoves(0)
    setElapsed(0)
    locked.current = false
    startedAt.current = Date.now()
    setState('playing')
  }

  function flipCard(id: number) {
    if (state !== 'playing' || locked.current || flipped.includes(id) || matched.includes(id)) return
    if (flipped.length === 0) {
      setFlipped([id])
      return
    }

    const firstId = flipped[0]
    const firstCard = deck.find(card => card.id === firstId)
    const secondCard = deck.find(card => card.id === id)
    if (!firstCard || !secondCard) return
    setMoves(current => current + 1)
    setFlipped([firstId, id])

    if (firstCard.face === secondCard.face) {
      const nextMatched = [...matched, firstId, id]
      setMatched(nextMatched)
      setFlipped([])
      if (nextMatched.length === deck.length) {
        setElapsed(startedAt.current === null ? elapsed : Date.now() - startedAt.current)
        setState('done')
      }
      return
    }

    locked.current = true
    flipTimer.current = setTimeout(() => {
      setFlipped([])
      locked.current = false
    }, 820)
  }

  return (
    <main className="explore-page game-page memory-page">
      <div className="explore-glow" aria-hidden="true" />
      <GameAmbience kind="fireworks" />
      <header className="explore-header">
        <button className="back-button" onClick={onBack} type="button"><ArrowLeft size={16} /><span>Back to games</span></button>
        <div className="brand-mark"><Sparkles size={14} /><span>PLAY / 02</span></div>
      </header>

      <section className="game-content memory-content" aria-labelledby="memory-title">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4 }}>
          <div className="eyebrow"><span className="memory-eyebrow-icon">✳</span> MEMORY CARDS</div>
          <h1 id="memory-title" className="game-title">Find the<br /><span>matching pairs.</span></h1>
          <p className="explore-intro">Flip two at a time. Remember what you’ve seen. Match all eight pairs to finish.</p>
          <p className="firework-cue"><Sparkles size={15} /><span>Tap anywhere outside the cards to launch a Diwali firework</span><span className="firework-cue-pulse" aria-hidden="true" /></p>
        </motion.div>

        <div className="memory-layout">
          <div className={`memory-board ${state === 'idle' ? 'board-idle' : ''}`} aria-label="Memory card board" data-game-surface>
            {deck.map((card, index) => {
              const isOpen = flipped.includes(card.id) || matched.includes(card.id)
              return (
                <button
                  key={card.id}
                  type="button"
                  className={`memory-tile ${isOpen ? 'tile-open' : ''} ${matched.includes(card.id) ? 'tile-matched' : ''}`}
                  onClick={() => flipCard(card.id)}
                  disabled={state !== 'playing' || locked.current || matched.includes(card.id) || flipped.includes(card.id)}
                  aria-label={isOpen ? `Card ${index + 1}: ${card.face}${matched.includes(card.id) ? ', matched' : ''}` : `Card ${index + 1}, face down`}
                  aria-pressed={isOpen}
                >
                  <span className="tile-face" aria-hidden="true">{isOpen ? card.face : '✳'}</span>
                </button>
              )
            })}
            {state === 'idle' && <div className="board-overlay"><span>Ready to play?</span><button type="button" onClick={startGame}>Deal the cards <span aria-hidden="true">↗</span></button></div>}
          </div>

          <aside className="score-panel memory-stats" aria-label="Game stats">
            <div className="score-heading">YOUR RUN</div>
            <div className="memory-stat-main">{state === 'done' ? 'Nicely done.' : state === 'idle' ? 'A fresh deck.' : 'Keep going.'}</div>
            <div className="score-row"><span>Pairs</span><strong>{Math.floor(matched.length / 2)} / 8</strong></div>
            <div className="score-row"><span>Turns</span><strong>{moves}</strong></div>
            <div className="score-row"><span>Time</span><strong>{formatTime(elapsed)}</strong></div>
            {state === 'done' && (
              <button className="memory-restart" type="button" onClick={startGame}><RotateCcw size={14} /> {state === 'done' ? 'Shuffle & play again' : 'Start a new game'}</button>
            )}
            {state === 'playing' && <p className="memory-tip">A turn is two cards. Find every pair at your own pace.</p>}
          </aside>
        </div>
        <p className="game-disclaimer">Cards are shuffled on your device. Your run isn’t saved.</p>
      </section>
    </main>
  )
}
