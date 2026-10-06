import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Check, Gem, RotateCcw, Sparkles, Timer, WandSparkles } from 'lucide-react'
import FashionCanvas from '../components/FashionCanvas'
import GameAmbience, { type FashionStudioSignals } from '../components/GameAmbience'
import { fashionCategories, fashionEvents, type FashionCategory, type FashionEvent, type FashionItem } from '../utils/fashion'

type GameState = 'ready' | 'playing' | 'done'
type Outfit = Partial<Record<FashionCategory, FashionItem>>
const ROUND_MS = 60_000

function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)) }

function FashionDoll({ outfit }: { outfit: Outfit }) {
  const color = (category: FashionCategory, fallback: string) => outfit[category]?.color ?? fallback
  return (
    <svg className="fashion-doll" viewBox="0 0 240 330" role="img" aria-label="Preview of the completed outfit">
      <defs><linearGradient id="doll-shadow" x1="0" x2="1"><stop stopColor="#28282e" /><stop offset="1" stopColor="#15161b" /></linearGradient></defs>
      <ellipse cx="120" cy="306" rx="62" ry="11" fill="rgba(0,0,0,.3)" />
      <path d="M82 102q-24 7-29 38l-10 67q-1 8 7 10l12 2 15-61 3 69h80l3-69 15 61 12-2q8-2 7-10l-10-67q-5-31-29-38l-16-8H98z" fill={color('Shirt', '#bca7a0')} stroke="#e8ddd0" strokeOpacity=".27" strokeWidth="2" />
      <path d="M91 210h58l17 84h-33l-13-60-11 60H76z" fill={color('Pants / skirt', '#827c89')} stroke="#eee2d3" strokeOpacity=".24" strokeWidth="2" />
      <path d="M76 294h35l-2 12H68q-7-4 8-12m57 0h33q13 8 6 12h-42z" fill={color('Shoes', '#d0b28d')} />
      <path d="M94 62q0-33 26-33t26 33l-5 42q-20 12-42 0z" fill="#c99370" />
      <path d="M91 61q-1-42 29-42 35 0 31 44l-10-19q-20-2-38-14z" fill={color('Hat', '#80676e')} />
      <path d="M85 99q35 12 70 0l12 17q-47 26-94 0z" fill={color('Accessories', '#bd9185')} opacity=".92" />
      <path d="M155 127q31 9 34 43l-8 38q-7 6-15-1l-8-43-17-17z" fill={color('Bag', '#a89079')} stroke="#eee2d3" strokeOpacity=".4" strokeWidth="2" />
      <g fill="none" stroke={color('Glasses', '#d8c38c')} strokeWidth="4"><circle cx="105" cy="68" r="10" /><circle cx="139" cy="68" r="10" /><path d="M115 68h14m-34-2-8-3m61 3 8-3" /></g>
      <circle cx="120" cy="87" r="5" fill={color('Jewelry', '#e7cf9d')} />
      <path d="M109 97q11 7 22 0" fill="none" stroke="#593e35" strokeWidth="2" />
      <text x="120" y="325" fill="#9d9ba1" textAnchor="middle" fontSize="8" letterSpacing="2">RUNWAY REPLICA</text>
    </svg>
  )
}

function ratingLine(score: number) {
  if (score < 20) return 'Please don’t leave the house.'
  if (score < 40) return 'Bold decision.'
  if (score < 60) return 'Not bad.'
  if (score < 80) return 'Okay, fashion detected.'
  return 'Main character energy.'
}

function randomEvent(previous?: string): FashionEvent {
  const options = fashionEvents.filter(event => event.id !== previous)
  return options[Math.floor(Math.random() * options.length)]
}

export default function FashionDisaster({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<GameState>('ready')
  const [event, setEvent] = useState<FashionEvent>(() => randomEvent())
  const [outfit, setOutfit] = useState<Outfit>({})
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [remaining, setRemaining] = useState(ROUND_MS)
  const [correctPicks, setCorrectPicks] = useState(0)
  const [wrongPicks, setWrongPicks] = useState(0)
  const [finalScore, setFinalScore] = useState<number | null>(null)
  const [roundId, setRoundId] = useState(0)
  const [selectionPulse, setSelectionPulse] = useState(0)
  const [distortion, setDistortion] = useState(0)
  const [selectedAccent, setSelectedAccent] = useState('#d0ad83')
  const [comboPulse, setComboPulse] = useState(0)
  const scoreRef = useRef(0)
  const comboRef = useRef(0)
  const maxComboRef = useRef(0)
  const correctRef = useRef(0)
  const wrongRef = useRef(0)
  const outfitRef = useRef<Outfit>({})
  const eventRef = useRef(event)
  const deadline = useRef(0)
  const signals: FashionStudioSignals = {
    score,
    combo,
    timeRatio: remaining / ROUND_MS,
    selection: selectionPulse,
    distortion,
    accent: Number.parseInt(selectedAccent.slice(1), 16),
    pulse: comboPulse,
  }

  function startGame() {
    const nextEvent = randomEvent(eventRef.current.id)
    eventRef.current = nextEvent
    setEvent(nextEvent)
    outfitRef.current = {}
    scoreRef.current = 0
    comboRef.current = 0
    maxComboRef.current = 0
    correctRef.current = 0
    wrongRef.current = 0
    setOutfit({})
    setScore(0)
    setCombo(0)
    setMaxCombo(0)
    setCorrectPicks(0)
    setWrongPicks(0)
    setFinalScore(null)
    setRemaining(ROUND_MS)
    setSelectionPulse(0)
    setDistortion(0)
    setSelectedAccent('#d0ad83')
    setComboPulse(0)
    setRoundId(value => value + 1)
    deadline.current = Date.now() + ROUND_MS
    setState('playing')
  }

  function collectItem(item: FashionItem) {
    if (state !== 'playing') return
    const nextOutfit = { ...outfitRef.current, [item.category]: item }
    outfitRef.current = nextOutfit
    setOutfit(nextOutfit)
    setSelectedAccent(item.color)
    setSelectionPulse(value => value + 1)
    if (eventRef.current.ideal.includes(item.id)) {
      comboRef.current += 1
      maxComboRef.current = Math.max(maxComboRef.current, comboRef.current)
      correctRef.current += 1
      const multiplier = 1 + Math.floor(comboRef.current / 3) * .25
      scoreRef.current = clamp(scoreRef.current + Math.round(8 * multiplier), 0, 100)
      setCombo(comboRef.current)
      setMaxCombo(maxComboRef.current)
      setCorrectPicks(correctRef.current)
      setScore(scoreRef.current)
      if (comboRef.current % 3 === 0) setComboPulse(value => value + 1)
    } else {
      comboRef.current = 0
      wrongRef.current += 1
      scoreRef.current = Math.max(0, scoreRef.current - 8)
      setCombo(0)
      setWrongPicks(wrongRef.current)
      setScore(scoreRef.current)
      setDistortion(value => value + 1)
    }
  }

  function finishGame() {
    const selected = Object.values(outfitRef.current).filter((item): item is FashionItem => Boolean(item))
    const correctOutfitItems = selected.filter(item => eventRef.current.ideal.includes(item.id)).length
    const attempts = correctRef.current + wrongRef.current
    const accuracy = attempts === 0 ? 0 : correctRef.current / attempts
    const rating = clamp(Math.round(correctOutfitItems / fashionCategories.length * 65 + scoreRef.current * .25 + accuracy * 10 + Math.min(maxComboRef.current, 10) * 1.5), 0, 100)
    setFinalScore(rating)
    setState('done')
  }

  useEffect(() => {
    if (state !== 'playing') return
    const clock = window.setInterval(() => {
      const left = Math.max(0, deadline.current - Date.now())
      setRemaining(left)
      if (left === 0) finishGame()
    }, 100)
    return () => window.clearInterval(clock)
  }, [state])

  const timeLabel = `${Math.floor(remaining / 1000).toString().padStart(2, '0')}:${Math.floor(remaining % 1000 / 10).toString().padStart(2, '0')}`
  const signalsForScene: FashionStudioSignals = signals
  const selectedItems = fashionCategories.map(category => outfit[category]).filter((item): item is FashionItem => Boolean(item))
  const accuracy = correctPicks + wrongPicks === 0 ? 0 : Math.round(correctPicks / (correctPicks + wrongPicks) * 100)

  return (
    <main className="explore-page game-page fashion-page">
      <GameAmbience kind="fashion" fashion={signalsForScene} />
      <header className="explore-header">
        <button className="back-button" onClick={onBack} type="button"><ArrowLeft size={16} /><span>Back to games</span></button>
        <div className="brand-mark"><Sparkles size={14} /><span>PLAY / 06</span></div>
      </header>

      <section className="game-content fashion-content" aria-labelledby="fashion-title">
        {state !== 'done' ? (
          <>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4 }}>
              <div className="eyebrow"><Gem size={14} /> FASHION DISASTER</div>
              <h1 id="fashion-title" className="game-title">Dress for the occasion.<br /><span>Trust your questionable taste.</span></h1>
              <p className="explore-intro">Catch pieces from the runway, build the look, and hope the event agrees.</p>
            </motion.div>

            <div className="fashion-layout">
              <div className={`fashion-stage-panel ${state === 'playing' ? 'fashion-stage-live' : ''}`}>
                <div className="fashion-stage-head"><span>THE RUNWAY</span><span>{state === 'playing' ? 'TAP A FALLING PIECE TO COLLECT' : event.name.toUpperCase()}</span></div>
                <div className="fashion-stage">
                  <FashionCanvas running={state === 'playing'} roundId={roundId} onSelect={collectItem} />
                  {state === 'ready' && <div className="fashion-stage-cover"><span className="fashion-cover-icon"><WandSparkles size={20} /></span><strong>A new event is waiting.</strong><span>60 seconds. Eight categories. One outfit.</span><button type="button" onClick={startGame}>Take the runway <span aria-hidden="true">↗</span></button></div>}
                </div>
              </div>

              <aside className="fashion-sidebar" aria-label="Current styling brief">
                <div className="fashion-event-card"><span className="fashion-side-label">TONIGHT’S BRIEF</span><strong>{event.name}</strong><p>{event.hint}</p><span className="fashion-secret"><Sparkles size={12} /> The exact dress code stays secret</span></div>
                <div className="fashion-stats-card">
                  <div className="fashion-stat"><span><Timer size={13} /> TIME LEFT</span><strong className={remaining < 10_000 && state === 'playing' ? 'fashion-urgent' : ''}>{timeLabel}</strong></div>
                  <div className="fashion-stat"><span>SCORE</span><strong>{score}<small>/100</small></strong></div>
                  <div className="fashion-stat"><span>COMBO</span><strong className="fashion-combo">×{1 + Math.floor(combo / 3) * .25}<small> · {combo} in a row</small></strong></div>
                  <div className="fashion-outfit-list"><span className="fashion-side-label">CURRENT OUTFIT</span>
                    {fashionCategories.map(category => <div key={category} className="fashion-outfit-line"><span>{category}</span><span>{outfit[category]?.name ?? '—'}</span></div>)}
                  </div>
                </div>
              </aside>
            </div>

            <div className="fashion-bottom-dock">
              <div className="fashion-dock-heading"><span>YOUR LOOK</span><span>{selectedItems.length} / 8 pieces</span></div>
              <div className="fashion-item-slots">
                {fashionCategories.map(category => {
                  const item = outfit[category]
                  const isIdeal = item ? event.ideal.includes(item.id) : false
                  return <div key={category} className={`fashion-slot ${item ? isIdeal ? 'slot-good' : 'slot-risk' : ''}`}><span className="fashion-slot-category">{category}</span>{item ? <><span className="fashion-swatch" style={{ background: item.color }} /><span className="fashion-slot-name">{item.name}</span><span className="fashion-slot-rating">{isIdeal ? <Check size={11} /> : '!'}</span></> : <span className="fashion-slot-empty">Waiting for a piece</span>}</div>
                })}
              </div>
              <div className="fashion-dock-bottom"><span>{state === 'playing' ? 'Wrong pieces cost points and break your combo.' : 'The brief is different every time.'}</span><button type="button" onClick={finishGame} disabled={state !== 'playing' || selectedItems.length === 0}>Submit outfit <span aria-hidden="true">↗</span></button></div>
            </div>
          </>
        ) : (
          <motion.div className="fashion-final" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45 }}>
            <div className="eyebrow"><Gem size={14} /> FASHION DISASTER · FINAL LOOK</div>
            <h1 id="fashion-title" className="game-title">The verdict is in.<br /><span>{event.name} edition.</span></h1>
            <div className="fashion-final-layout">
              <div className="fashion-final-preview"><FashionDoll outfit={outfit} /><div><span className="fashion-side-label">YOUR EVENT</span><strong>{event.name}</strong><span>{ratingLine(finalScore ?? 0)}</span></div></div>
              <div className="fashion-verdict"><span className="fashion-final-score">{finalScore}<small>/100</small></span><strong>{ratingLine(finalScore ?? 0)}</strong><p>{selectedItems.length} pieces selected · {accuracy}% good calls · best combo ×{1 + Math.floor(maxCombo / 3) * .25}</p>
                <div className="fashion-rating-list">{fashionCategories.map(category => {
                  const item = outfit[category]
                  const good = Boolean(item && event.ideal.includes(item.id))
                  return <div key={category}><span className="fashion-rating-dot" style={{ background: item?.color ?? '#55545a' }} /><span>{category}</span><strong>{item ? item.name : 'Nothing chosen'}</strong><em>{item ? good ? '10 / 10' : '2 / 10' : '0 / 10'}</em></div>
                })}</div>
                <div className="fashion-final-actions"><button type="button" className="fashion-retry" onClick={startGame}><RotateCcw size={14} /> New event</button><button type="button" className="fashion-back" onClick={onBack}>Back to Games</button></div>
              </div>
            </div>
          </motion.div>
        )}
      </section>
    </main>
  )
}
