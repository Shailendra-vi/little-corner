import { useEffect, useRef, useState, type PointerEvent, type KeyboardEvent } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, MoveHorizontal, RotateCcw, Sparkles, Star } from 'lucide-react'
import StarfieldScene from '../components/StarfieldScene'
import GameAmbience from '../components/GameAmbience'

type GameState = 'ready' | 'playing' | 'done'
type FallingStar = { id: number; x: number; y: number; size: number; drift: number; rotation: number }

const ROUND_MS = 30_000
const CATCH_LINE = 87
const CATCHER_WIDTH = 84

const basketSlots = [
  { left: '32%', top: '9%' }, { left: '51%', top: '9%' },
  { left: '22%', top: '30%' }, { left: '40%', top: '30%' }, { left: '58%', top: '30%' }, { left: '77%', top: '30%' },
  { left: '31%', top: '54%' }, { left: '49%', top: '54%' }, { left: '67%', top: '54%' },
  { left: '41%', top: '73%' }, { left: '58%', top: '73%' },
]

export default function CatchStars({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<GameState>('ready')
  const [stars, setStars] = useState<FallingStar[]>([])
  const [score, setScore] = useState(0)
  const [missed, setMissed] = useState(0)
  const [best, setBest] = useState(0)
  const [seconds, setSeconds] = useState(30)
  const [startBurst, setStartBurst] = useState(0)
  const boardRef = useRef<HTMLDivElement>(null)
  const catcherRef = useRef<HTMLDivElement>(null)
  const starsRef = useRef<FallingStar[]>([])
  const basketRef = useRef(50)
  const scoreRef = useRef(0)
  const missedRef = useRef(0)
  const startedAt = useRef(0)
  const lastSpawnAt = useRef(0)
  const nextId = useRef(0)

  function startGame() {
    starsRef.current = []
    scoreRef.current = 0
    missedRef.current = 0
    basketRef.current = 50
    startedAt.current = Date.now()
    lastSpawnAt.current = startedAt.current - 500
    nextId.current = 0
    setStars([])
    catcherRef.current?.style.setProperty('--catcher-x', '50%')
    setScore(0)
    setMissed(0)
    setSeconds(30)
    setStartBurst(value => value + 1)
    setState('playing')
    requestAnimationFrame(() => boardRef.current?.focus())
  }

  useEffect(() => {
    if (state !== 'playing') return

    const interval = setInterval(() => {
      const now = Date.now()
      const remainingMs = ROUND_MS - (now - startedAt.current)
      if (remainingMs <= 0) {
        setSeconds(0)
        setBest(current => Math.max(current, scoreRef.current))
        starsRef.current = []
        setStars([])
        setState('done')
        return
      }

      setSeconds(Math.ceil(remainingMs / 1000))
      let caught = 0
      let dropped = 0
      const nextStars = starsRef.current.flatMap(star => {
        const y = star.y + 1.8 + Math.min(scoreRef.current * .015, .8)
        if (y >= CATCH_LINE) {
          const boardWidth = boardRef.current?.clientWidth ?? 1
          const starCenter = (star.x + star.drift) * boardWidth / 100 + star.size / 2
          const catcherCenter = basketRef.current * boardWidth / 100
          if (Math.abs(starCenter - catcherCenter) <= CATCHER_WIDTH / 2 + star.size / 2) caught += 1
          else dropped += 1
          return []
        }
        return [{ ...star, y }]
      })

      if (now - lastSpawnAt.current > Math.max(390, 760 - scoreRef.current * 5)) {
        nextStars.push({
          id: nextId.current++,
          x: 6 + Math.random() * 88,
          y: -4,
          size: 15 + Math.random() * 10,
          drift: (Math.random() - .5) * 3,
          rotation: Math.random() * 35 - 17,
        })
        lastSpawnAt.current = now
      }

      starsRef.current = nextStars
      setStars(nextStars)
      if (caught) {
        scoreRef.current += caught
        setScore(scoreRef.current)
      }
      if (dropped) {
        missedRef.current += dropped
        setMissed(missedRef.current)
      }
    }, 50)

    return () => clearInterval(interval)
  }, [state])

  function moveBasket(clientX: number) {
    const bounds = boardRef.current?.getBoundingClientRect()
    if (!bounds) return
    const x = Math.max(7, Math.min(93, ((clientX - bounds.left) / bounds.width) * 100))
    basketRef.current = x
    catcherRef.current?.style.setProperty('--catcher-x', `${x}%`)
  }

  function handlePointer(event: PointerEvent<HTMLDivElement>) {
    if (state !== 'playing') return
    if (event.type === 'pointerdown') {
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    moveBasket(event.clientX)
  }

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    if (state !== 'playing') return
    const direction = event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a' ? -1
      : event.key === 'ArrowRight' || event.key.toLowerCase() === 'd' ? 1 : 0
    if (!direction) return
    event.preventDefault()
    const x = Math.max(7, Math.min(93, basketRef.current + direction * 4))
    basketRef.current = x
    catcherRef.current?.style.setProperty('--catcher-x', `${x}%`)
  }

  const caughtLabel = score === 1 ? 'star' : 'stars'

  return (
    <main className="explore-page game-page stars-page">
      <div className="explore-glow" aria-hidden="true" />
      <StarfieldScene />
      <GameAmbience kind="cosmos" />
      {startBurst > 0 && (
        <div key={startBurst} className="stars-start-burst" aria-hidden="true">
          {Array.from({ length: 56 }, (_, index) => {
            const colors = ['#8feaff', '#bfa2ff', '#ff8dcc', '#ffd47b']
            return <i key={index} style={{ left: `${2 + (index * 37.37) % 96}%`, top: `${3 + (index * 61.73) % 94}%`, color: colors[index % colors.length], animationDelay: `${(index % 9) * 35}ms` }} />
          })}
        </div>
      )}
      <header className="explore-header">
        <button className="back-button" onClick={onBack} type="button"><ArrowLeft size={16} /><span>Back to games</span></button>
        <div className="brand-mark"><Sparkles size={14} /><span>PLAY / 03</span></div>
      </header>

      <section className="game-content stars-content" aria-labelledby="stars-title">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4 }}>
          <div className="eyebrow"><Star size={14} /> CATCH THE STARS</div>
          <h1 id="stars-title" className="game-title">Eyes up.<br /><span>Stars incoming.</span></h1>
          <p className="explore-intro">Slide your catcher under the falling stars. You have 30 seconds to gather a little constellation. Tap the open background to spark a burst.</p>
        </motion.div>

        <div className="stars-layout">
          <div className="stars-game-column">
            <div
              ref={boardRef}
              className={`stars-board ${state === 'playing' ? 'stars-board-active' : ''}`}
              data-game-surface
              role="group"
              aria-label="Catch the Stars play area. Move the catcher horizontally with your pointer or arrow keys."
              tabIndex={0}
              onPointerDown={handlePointer}
              onPointerMove={handlePointer}
              onKeyDown={handleKey}
            >
              <div className="starfield-lines" aria-hidden="true" />
              {stars.map(star => (
                <Star
                  key={star.id}
                  className="falling-star"
                  size={star.size}
                  fill="currentColor"
                  aria-hidden="true"
                  style={{ left: `${star.x + star.drift}%`, top: `${star.y}%`, color: ['#8feaff', '#bfa2ff', '#ff8dcc', '#ffd47b'][star.id % 4], transform: `rotate(${star.rotation}deg)` }}
                />
              ))}
              <div className="catcher-track" aria-hidden="true">
                <div ref={catcherRef} className="catcher-position">
                  <div className="star-catcher">
                    <span />
                    <div className="basket-fill">
                      {basketSlots.slice(0, Math.min(score, basketSlots.length)).map((slot, index) => (
                        <Star key={index} className="basket-filled-star" size={10} fill="currentColor" style={slot} />
                      ))}
                    </div>
                    <i /><b />
                  </div>
                </div>
              </div>
              {state !== 'playing' && (
                <div className="stars-overlay">
                  <span className="overlay-star"><Star size={19} /></span>
                  <strong>{state === 'ready' ? 'Ready to catch?' : 'Time’s up!'}</strong>
                  <span>{state === 'ready' ? 'Move with your pointer, touch, or ← → keys.' : `You caught ${score} ${caughtLabel}.`}</span>
                  <button type="button" onClick={startGame}>{state === 'ready' ? 'Start game' : <><RotateCcw size={14} /> Play again</>} <span aria-hidden="true">↗</span></button>
                </div>
              )}
              {state === 'playing' && <span className="stars-key-hint" aria-hidden="true"><MoveHorizontal size={12} /> DRAG OR USE ← →</span>}
            </div>
            <p className="game-instruction">Catch stars as they reach the lower edge. Let them go and they count as missed.</p>
          </div>

          <aside className="score-panel stars-stats" aria-label="Game stats">
            <div className="score-heading">THIS ROUND</div>
            <div className="stars-timer"><span>TIME</span><strong className={seconds <= 10 && state === 'playing' ? 'timer-urgent' : ''}>00:{String(seconds).padStart(2, '0')}</strong></div>
            <div className="stars-score" aria-live="polite"><Star size={18} fill="currentColor" /><div><strong>{score}</strong><span>{caughtLabel} caught</span></div></div>
            <div className="score-row"><span>Missed</span><strong>{missed}</strong></div>
            <div className="score-row"><span>Personal best</span><strong>{best}</strong></div>
            <p className="stars-tip">The stars pick up speed as your score grows.</p>
          </aside>
        </div>
        <p className="game-disclaimer">A tiny arcade break. Your score stays on this screen.</p>
      </section>
    </main>
  )
}
