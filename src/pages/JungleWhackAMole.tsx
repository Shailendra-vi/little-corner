import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Leaf, RotateCcw, Sparkles, Timer } from 'lucide-react'
import GameAmbience from '../components/GameAmbience'

type GameState = 'ready' | 'playing' | 'done'
const ROUND_MS = 30_000

function MonkeyFace() {
  return (
    <svg className="mole-face" viewBox="0 0 72 72" aria-hidden="true">
      <circle cx="13" cy="34" r="13" fill="#75462f" /><circle cx="59" cy="34" r="13" fill="#75462f" />
      <circle cx="13" cy="34" r="7" fill="#d79e76" /><circle cx="59" cy="34" r="7" fill="#d79e76" />
      <ellipse cx="36" cy="39" rx="25" ry="28" fill="#9b6542" />
      <ellipse cx="36" cy="48" rx="17" ry="14" fill="#e4bd91" />
      <ellipse cx="27" cy="34" rx="3.2" ry="4" fill="#2b261f" /><ellipse cx="45" cy="34" rx="3.2" ry="4" fill="#2b261f" />
      <ellipse cx="36" cy="44" rx="4.8" ry="3.5" fill="#4a3027" />
      <path d="M31 53q5 5 10 0" fill="none" stroke="#75462f" strokeWidth="2" strokeLinecap="round" />
      <path d="M19 24q7-12 17-10" fill="none" stroke="#c99063" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export default function JungleWhackAMole({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<GameState>('ready')
  const [activeHole, setActiveHole] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [hits, setHits] = useState(0)
  const [misses, setMisses] = useState(0)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)
  const [remaining, setRemaining] = useState(ROUND_MS)
  const [hitEffect, setHitEffect] = useState(0)
  const [lastHitHole, setLastHitHole] = useState<number | null>(null)
  const gameStateRef = useRef<GameState>('ready')
  const activeRef = useRef<number | null>(null)
  const scoreRef = useRef(0)
  const hitsRef = useRef(0)
  const lastHitHoleRef = useRef<number | null>(null)
  const streakRef = useRef(0)
  const expiresAt = useRef(0)
  const nextSpawnAt = useRef(0)
  const deadline = useRef(0)

  function startGame() {
    activeRef.current = null
    scoreRef.current = 0
    hitsRef.current = 0
    streakRef.current = 0
    const firstHole = Math.floor(Math.random() * 9)
    activeRef.current = firstHole
    setActiveHole(firstHole)
    setScore(0)
    setHits(0)
    setMisses(0)
    setStreak(0)
    setRemaining(ROUND_MS)
    lastHitHoleRef.current = null
    setLastHitHole(null)
    const now = Date.now()
    deadline.current = now + ROUND_MS
    expiresAt.current = now + 1_100
    nextSpawnAt.current = now + 1_330
    gameStateRef.current = 'playing'
    setState('playing')
  }

  function whack(index: number) {
    if (gameStateRef.current !== 'playing') return
    if (activeRef.current === index) {
      activeRef.current = null
      setActiveHole(null)
      streakRef.current += 1
      const points = 10 + (streakRef.current > 0 && streakRef.current % 4 === 0 ? 5 : 0)
      scoreRef.current += points
      setScore(scoreRef.current)
      hitsRef.current += 1
      setHits(hitsRef.current)
      setStreak(streakRef.current)
      lastHitHoleRef.current = index
      setLastHitHole(index)
      setHitEffect(value => value + 1)
      nextSpawnAt.current = Date.now() + 240
    } else {
      streakRef.current = 0
      setStreak(0)
      setMisses(value => value + 1)
    }
  }

  useEffect(() => {
    if (hitEffect === 0) return
    const clearEffect = window.setTimeout(() => setLastHitHole(null), 540)
    return () => window.clearTimeout(clearEffect)
  }, [hitEffect])

  useEffect(() => {
    if (state !== 'playing') return
    const clock = window.setInterval(() => {
      const now = Date.now()
      const left = Math.max(0, deadline.current - now)
      setRemaining(left)
      if (left <= 0) {
        activeRef.current = null
        setActiveHole(null)
        setBest(value => Math.max(value, scoreRef.current))
        gameStateRef.current = 'done'
        setState('done')
        return
      }

      if (activeRef.current !== null && now >= expiresAt.current) {
        activeRef.current = null
        setActiveHole(null)
        streakRef.current = 0
        setStreak(0)
        setMisses(value => value + 1)
        nextSpawnAt.current = now + 150
      }

      if (activeRef.current === null && now >= nextSpawnAt.current) {
        let hole = Math.floor(Math.random() * 9)
        if (hole === lastHitHoleRef.current) hole = (hole + 1 + Math.floor(Math.random() * 8)) % 9
        activeRef.current = hole
        setActiveHole(hole)
        const lifespan = Math.max(700, 1_100 - hitsRef.current * 8)
        expiresAt.current = now + lifespan
        nextSpawnAt.current = now + lifespan + Math.max(170, 260 - hitsRef.current * 2)
      }
    }, 45)
    return () => window.clearInterval(clock)
  }, [state])

  const seconds = (remaining / 1000).toFixed(1)
  const accuracy = hits + misses === 0 ? 100 : Math.round(hits / (hits + misses) * 100)

  return (
    <main className="explore-page game-page jungle-page mole-page">
      <div className="explore-glow" aria-hidden="true" />
      <GameAmbience kind="jungle" />
      <header className="explore-header">
        <button className="back-button" onClick={onBack} type="button"><ArrowLeft size={16} /><span>Back to games</span></button>
        <div className="brand-mark"><Sparkles size={14} /><span>PLAY / 05</span></div>
      </header>

      <section className="game-content jungle-content" aria-labelledby="mole-title">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4 }}>
          <div className="eyebrow"><Leaf size={14} /> MONKEY BUSINESS</div>
          <h1 id="mole-title" className="game-title">Quick hands.<br /><span>Mischievous monkeys.</span></h1>
          <p className="explore-intro">Tap the cheeky monkeys before they duck back into the undergrowth.</p>
        </motion.div>

        <div className="mole-layout">
          <div className="mole-arcade">
            <div className="mole-scorebar">
              <div><span>SCORE</span><strong key={score} className="mole-score-pop">{score}</strong></div>
              <div className="mole-clock"><Timer size={14} /><span>{seconds}s</span></div>
              <div><span>STREAK</span><strong>{streak}{streak >= 4 && <small> · +5</small>}</strong></div>
            </div>
            <div className="mole-progress"><span style={{ width: `${remaining / ROUND_MS * 100}%` }} /></div>
            <div className={`mole-grid ${state === 'playing' ? 'mole-grid-playing' : ''}`} role="group" aria-label="Whack-a-monkey game board" data-game-surface>
              {Array.from({ length: 9 }, (_, index) => (
                <button key={index} type="button" className={`mole-hole ${activeHole === index ? 'mole-hole-active' : ''} ${lastHitHole === index && hitEffect > 0 ? 'mole-hole-hit' : ''}`} onPointerDown={event => { if (event.button === 0) { event.preventDefault(); whack(index) } }} onKeyDown={event => { if (!event.repeat && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); whack(index) } }} disabled={state !== 'playing'} aria-label={activeHole === index ? `Monkey in hole ${index + 1}, tap to score` : `Hole ${index + 1}`}>
                  <span className="mole-hole-rim" />
                  <span className="mole-pit" />
                  <AnimatePresence>
                    {activeHole === index && <motion.span key="monkey" className="mole-monkey" initial={{ y: 66, scale: .75 }} animate={{ y: 0, scale: 1 }} exit={{ y: 68, scale: .78 }} transition={{ type: 'spring', stiffness: 520, damping: 23 }}><MonkeyFace /></motion.span>}
                  </AnimatePresence>
                  {lastHitHole === index && hitEffect > 0 && <motion.span key={hitEffect} className="mole-points" initial={{ opacity: 0, y: 7, scale: .65 }} animate={{ opacity: 1, y: -25, scale: 1 }} transition={{ duration: .5 }} aria-hidden="true">+{streak > 0 && streak % 4 === 0 ? '15' : '10'}</motion.span>}
                </button>
              ))}
              {state !== 'playing' && (
                <div className="mole-overlay">
                  <span className="mole-overlay-mark"><Leaf size={19} /></span>
                  <strong>{state === 'ready' ? 'The monkeys are up to something.' : 'Time to head back to camp.'}</strong>
                  <span>{state === 'ready' ? 'Catch as many as you can in 30 seconds.' : `You scored ${score} points with ${accuracy}% accuracy.`}</span>
                  <button type="button" onClick={startGame}>{state === 'ready' ? 'Start the round' : <><RotateCcw size={14} /> Play again</>}</button>
                </div>
              )}
            </div>
            <p className="mole-instruction">Tap a monkey for 10 points. Keep a four-hit streak for a bonus.</p>
          </div>

          <aside className="score-panel jungle-stats" aria-label="Trail score">
            <div className="score-heading">TODAY’S TRAIL</div>
            <div className="jungle-stat-title">A nimble little run.</div>
            <div className="score-row"><span>Monkeys caught</span><strong>{hits}</strong></div>
            <div className="score-row"><span>Misses</span><strong>{misses}</strong></div>
            <div className="score-row"><span>Best score</span><strong>{best}</strong></div>
            <p className="jungle-tip">They pop up faster as your score climbs. Watch all nine holes.</p>
          </aside>
        </div>
        <p className="game-disclaimer">A quick jungle arcade run. Scores stay on this device for this visit.</p>
      </section>
    </main>
  )
}
