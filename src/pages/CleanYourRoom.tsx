import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Check, Clock3, RotateCcw, Sparkles } from 'lucide-react'
import CleanRoomScene, { type RoomObject } from '../components/CleanRoomScene'

type Phase = 'ready' | 'playing' | 'done'
type ZoneId = 'wardrobe' | 'desk' | 'trash' | 'bed' | 'shelf' | 'laundry'
type MessKind = 'clothes' | 'books' | 'socks' | 'charger' | 'bottle' | 'headphones' | 'receipt' | 'shoes' | 'toy' | 'cable' | 'wrapper'
type MessItem = RoomObject & { emoji: string }
type RoomEvent = { kind: 'mom' | 'phone' | 'laundry' | 'vacuum'; text: string; start: number; end: number; id: number }

const zoneMeta: Array<{ id: ZoneId; label: string; emoji: string }> = [
  { id: 'wardrobe', label: 'WARDROBE', emoji: '👕' }, { id: 'desk', label: 'DESK', emoji: '🖥️' },
  { id: 'trash', label: 'TRASH', emoji: '🗑️' }, { id: 'bed', label: 'BED', emoji: '🛏️' },
  { id: 'shelf', label: 'SHELF', emoji: '📚' }, { id: 'laundry', label: 'LAUNDRY', emoji: '🧺' },
]
const messTypes: Array<{ kind: MessKind; label: string; emoji: string; zone: ZoneId; color: string }> = [
  { kind: 'clothes', label: 'Tee', emoji: '👚', zone: 'wardrobe', color: '#a9798d' },
  { kind: 'books', label: 'Book', emoji: '📕', zone: 'shelf', color: '#be9566' },
  { kind: 'socks', label: 'Socks', emoji: '🧦', zone: 'laundry', color: '#8194a0' },
  { kind: 'charger', label: 'Charger', emoji: '🔌', zone: 'desk', color: '#bca775' },
  { kind: 'bottle', label: 'Bottle', emoji: '🧴', zone: 'trash', color: '#779a88' },
  { kind: 'headphones', label: 'Headphones', emoji: '🎧', zone: 'desk', color: '#897cad' },
  { kind: 'receipt', label: 'Receipt', emoji: '🧾', zone: 'trash', color: '#c2b295' },
  { kind: 'shoes', label: 'Sneakers', emoji: '👟', zone: 'wardrobe', color: '#bd7b64' },
  { kind: 'toy', label: 'Toy', emoji: '🧸', zone: 'bed', color: '#c58b72' },
  { kind: 'cable', label: 'Cable', emoji: '〰️', zone: 'desk', color: '#78869b' },
  { kind: 'wrapper', label: 'Wrapper', emoji: '🍬', zone: 'trash', color: '#b899b3' },
]

function makeRoom(level: number): MessItem[] {
  const count = 15 + level * 3
  const result: MessItem[] = []
  for (let index = 0; index < count; index += 1) {
    const type = messTypes[(index * 7 + Math.floor(Math.random() * messTypes.length)) % messTypes.length]
    let position: [number, number, number] = [-6.5 + Math.random() * 13, 0, -.1 + Math.random() * 4.8]
    if (type.kind === 'clothes') position = [-4.5 + (Math.random() - .5) * 2.6, 1.15, -1.7 + (Math.random() - .5) * 1.8]
    if (type.kind === 'charger' || type.kind === 'headphones') position = [3.8 + (Math.random() - .5) * 1.8, 1.72, -3.3 + Math.random() * .7]
    if (type.kind === 'receipt') position = [-6.1 + Math.random() * 12, 0, .1 + Math.random() * 3.7]
    if (type.kind === 'books' && Math.random() < .45) position = [-3.8 + Math.random() * 2.1, 1.16, -2 + Math.random() * 1.1]
    const rotation = (Math.random() - .5) * 1.2
    result.push({ id: index + 1, ...type, position, rotation, done: false })
  }
  return result
}

function ratingFor(cleanliness: number) {
  if (cleanliness <= 20) return 'Disaster'
  if (cleanliness <= 40) return 'Survivable'
  if (cleanliness <= 60) return 'Respectable'
  if (cleanliness <= 80) return 'Actually Clean'
  return 'Pinterest Room'
}

export default function CleanYourRoom({ onBack }: { onBack: () => void }) {
  const [phase, setPhase] = useState<Phase>('ready')
  const [level, setLevel] = useState(1)
  const [items, setItems] = useState<MessItem[]>(() => makeRoom(1))
  const [seconds, setSeconds] = useState(90)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [event, setEvent] = useState<RoomEvent | null>(null)
  const [feedback, setFeedback] = useState('')
  const [hoverHint, setHoverHint] = useState<{ id: number; x: number; y: number } | null>(null)
  const [sortPulse, setSortPulse] = useState(0)
  const [focusItemId, setFocusItemId] = useState<number | null>(null)
  const [listOpen, setListOpen] = useState(false)
  const itemsRef = useRef(items)
  const phaseRef = useRef(phase)
  const levelRef = useRef(level)
  const timeRef = useRef(90)
  const eventRef = useRef<RoomEvent | null>(null)
  const nextEvent = useRef(15), eventSerial = useRef(0), transitionRef = useRef(false), finishRef = useRef(false)

  const cleanCount = items.filter(item => item.done).length
  const cleanliness = items.length ? cleanCount / items.length : 0
  const overallClean = Math.min(1, ((level - 1) + cleanliness) / 4)
  const hoveredItem = hoverHint ? items.find(item => item.id === hoverHint.id) : undefined
  const remainingByKind = useMemo(() => messTypes.map(type => ({ ...type, count: items.filter(item => !item.done && item.kind === type.kind).length })).filter(type => type.count > 0), [items])
  const timePercent = Math.max(0, seconds / 90)

  useEffect(() => { itemsRef.current = items; phaseRef.current = phase; levelRef.current = level }, [items, phase, level])

  const showFeedback = (message: string) => {
    setFeedback(message)
    window.setTimeout(() => setFeedback(value => value === message ? '' : value), 1450)
  }

  function startGame() {
    const initial = makeRoom(1)
    itemsRef.current = initial; setItems(initial); setLevel(1); levelRef.current = 1
    timeRef.current = 90; setSeconds(90); setScore(0); setCombo(0); eventRef.current = null; setEvent(null)
    setFocusItemId(null); setHoverHint(null)
    nextEvent.current = 13; transitionRef.current = false; finishRef.current = false
    setPhase('playing'); phaseRef.current = 'playing'; setFeedback('')
  }

  function finishGame() { if (finishRef.current) return; finishRef.current = true; setPhase('done'); phaseRef.current = 'done'; eventRef.current = null; setEvent(null) }

  function continueToNextLevel() {
    const nextLevel = Math.min(4, levelRef.current + 1), next = makeRoom(nextLevel)
    itemsRef.current = next; setItems(next); setLevel(nextLevel); levelRef.current = nextLevel
    setFocusItemId(null); setHoverHint(null)
    timeRef.current = 45; setSeconds(45); setCombo(0); transitionRef.current = false; finishRef.current = false
    setPhase('playing'); phaseRef.current = 'playing'; setFeedback('New room. Same 90-second panic.')
  }

  function updateHoveredItem(id: number | null, x = 0, y = 0) { setHoverHint(id === null ? null : { id, x, y }) }

  function handleObjectDrop(id: number, zone: string | null) {
    if (phaseRef.current !== 'playing' || finishRef.current) return
    const item = itemsRef.current.find(entry => entry.id === id && !entry.done)
    if (!item) return
    if (zone !== item.zone) {
      timeRef.current = Math.max(0, timeRef.current - 3); setSeconds(timeRef.current); setCombo(0)
      const destination = zoneMeta.find(target => target.id === item.zone)?.label.toLowerCase()
      showFeedback(zone ? `That doesn't belong there. Try the ${destination}.` : `Wrong spot. Try the ${destination}.`)
      return
    }
    item.done = true
    const next = [...itemsRef.current]; itemsRef.current = next
    const nextCombo = combo + 1, multiplier = 1 + Math.floor((nextCombo - 1) / 4)
    setItems(next); setCombo(nextCombo); setScore(value => value + 100 * multiplier)
    showFeedback(multiplier > 1 ? `Lovely sorting · ×${multiplier} combo` : 'Perfect spot · +100')
    if (next.every(entry => entry.done) && !transitionRef.current) {
      transitionRef.current = true
      window.setTimeout(() => {
        if (phaseRef.current !== 'playing' || finishRef.current) return
        const currentLevel = levelRef.current
        if (currentLevel >= 4) { finishGame(); return }
        const newLevel = currentLevel + 1, nextRoom = makeRoom(newLevel)
        levelRef.current = newLevel; setLevel(newLevel); itemsRef.current = nextRoom; setItems(nextRoom); setCombo(0)
        setFocusItemId(null); setHoverHint(null)
        timeRef.current = Math.min(99, timeRef.current + 8); setSeconds(timeRef.current); transitionRef.current = false
        showFeedback(`Room ${newLevel} unlocked · 8 seconds bonus!`)
      }, 350)
    }
  }

  useEffect(() => {
    if (phase !== 'playing') return
    const interval = window.setInterval(() => {
      if (phaseRef.current !== 'playing' || finishRef.current) return
      timeRef.current = Math.max(0, timeRef.current - .1)
      nextEvent.current -= .1
      const active = eventRef.current
      if (active && Date.now() >= active.end) { eventRef.current = null; setEvent(null) }
      if (!active && nextEvent.current <= 0) {
        const now = Date.now(), kinds: RoomEvent['kind'][] = ['mom', 'phone', 'laundry', 'vacuum'], kind = kinds[Math.floor(Math.random() * kinds.length)]
        const lines: Record<RoomEvent['kind'], string> = { mom: 'MOM: “Why is your room still messy?”', phone: 'PHONE: You have 3 very important notifications.', laundry: 'LAUNDRY: Basket on the move!', vacuum: 'VACUUM: Incoming. Protect the small stuff.' }
        const duration = kind === 'mom' ? 2600 : kind === 'phone' ? 4300 : kind === 'laundry' ? 8000 : 6500
        const next = { kind, text: lines[kind], start: now, end: now + duration, id: ++eventSerial.current }
        eventRef.current = next; setEvent(next); showFeedback(lines[kind])
        if (kind === 'mom') timeRef.current = Math.max(0, timeRef.current - 7)
        nextEvent.current = 14 + Math.random() * 8
      }
      setSeconds(timeRef.current)
      if (timeRef.current <= 0) finishGame()
    }, 100)
    return () => window.clearInterval(interval)
  }, [phase])

  const timeLabel = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`
  return <main className="explore-page game-page clean-room-page">
    {phase === 'ready' && <div className="clean-ready-scene"><CleanRoomScene items={items} playing={false} level={level} cleanliness={cleanliness} sortPulse={sortPulse} focusItemId={focusItemId} event={null} onDrop={handleObjectDrop} onHover={updateHoveredItem} /></div>}
    <header className="explore-header clean-room-header"><button className="back-button" onClick={onBack} type="button"><ArrowLeft size={16} /><span>Back to games</span></button><div className="brand-mark"><Sparkles size={14} /><span>PLAY / 09</span></div></header>
    <section className="game-content clean-room-content" aria-labelledby="clean-room-title">
      <AnimatePresence mode="wait">
        {phase === 'ready' && <motion.div key="ready" className="clean-ready" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: .98 }} transition={{ duration: .34 }}>
          <div className="clean-ready-copy"><div className="eyebrow"><Sparkles size={14} /> 90 SECONDS UNTIL MOM CHECKS</div><h1 id="clean-room-title">Clean Your<br /><span>Room Simulator</span></h1><p>The room is a disaster. Drag every stray thing to its home before the timer runs out. Put it in the wrong place and lose precious seconds.</p><div className="clean-ready-points"><span><Check size={14} /> Sort into six real room zones</span><span><Check size={14} /> Build combos for bigger scores</span><span><Check size={14} /> Survive Mom, the phone and the vacuum</span></div><button className="clean-start" type="button" onClick={startGame}><Sparkles size={16} /> Start cleaning</button></div>
          <div className="clean-ready-side"><div className="clean-ready-clock"><Clock3 size={16} /><span>YOUR WINDOW</span><strong>01:30</strong></div><div className="clean-ready-sample"><span>THE SORTING PLAN</span>{zoneMeta.map(zone => <div key={zone.id}><b>{zone.emoji}</b><span>{zone.label}</span><i>↗</i></div>)}</div></div>
        </motion.div>}
        {phase !== 'ready' && <motion.div key="game" className="clean-game" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .3 }}>
          <div className="clean-title-row"><div><div className="eyebrow"><Sparkles size={13} /> ROOM {level} OF 4 · {(['BEDROOM','LIVING ROOM','KITCHEN','STUDY'][level - 1])}</div><h1 id="clean-room-title">Clean Your Room <span>/ Level {level}</span></h1></div><div className="clean-game-actions"><button className="clean-level-pill" onClick={() => setSortPulse(value => value + 1)} type="button"><Sparkles size={13} /> SORT THE MESS</button></div></div>
          <div className="clean-hud">
            <div className={`clean-hud-stat clean-timer ${seconds < 20 ? 'low' : ''}`}><span><Clock3 size={13} /> TIME LEFT</span><strong>{timeLabel}</strong><i><b style={{ width: `${timePercent * 100}%` }} /></i></div>
            <div className="clean-hud-stat"><span><Sparkles size={13} /> CLEANLINESS</span><strong>{Math.round(overallClean * 100)}<small>%</small></strong><i><b className="clean-fill" style={{ width: `${overallClean * 100}%` }} /></i></div>
            <div className="clean-hud-stat"><span>ROOM SCORE</span><strong>{score.toLocaleString()}</strong></div>
            <div className="clean-hud-stat"><span>COMBO</span><strong>×{combo}</strong></div>
            <div className="clean-hud-stat clean-remaining"><span>OBJECTS LEFT</span><strong>{items.length - cleanCount}</strong></div>
          </div>
          <div className="clean-play-layout">
            <div className={`clean-canvas-shell ${event?.kind === 'vacuum' ? 'vacuum-active' : ''}`}>
              <CleanRoomScene items={items} playing={phase === 'playing'} level={level} cleanliness={overallClean} sortPulse={sortPulse} focusItemId={focusItemId} event={event?.kind ?? null} onDrop={handleObjectDrop} onHover={updateHoveredItem} />
              <AnimatePresence>{hoveredItem && hoverHint && <motion.div key={hoveredItem.id} className="clean-world-tooltip" style={{ left: hoverHint.x, top: hoverHint.y }} initial={{ opacity: 0, y: 6, scale: .96 }} animate={{ opacity: 1, y: -9, scale: 1 }} exit={{ opacity: 0, y: 4, scale: .97 }}><b>{hoveredItem.label}</b><span>→ {zoneMeta.find(zone => zone.id === hoveredItem.zone)?.label.toLowerCase()}</span></motion.div>}</AnimatePresence>
              <div className="clean-stage-hint"><span>Drag clutter onto its matching furniture</span><small>Objects glow where they belong</small></div>
              <AnimatePresence>{event?.kind === 'phone' && <motion.button className="clean-phone-event" type="button" onClick={() => { eventRef.current = null; setEvent(null) }} initial={{ opacity: 0, x: 40, y: -12 }} animate={{ opacity: 1, x: 0, y: 0 }} exit={{ opacity: 0, x: 40 }}><span>📱 PHONE · NOW</span><b>3 new messages</b><small>Your friends are asking why you vanished.</small><i>Tap to dismiss</i></motion.button>}</AnimatePresence>
              <AnimatePresence>{feedback && <motion.div className="clean-feedback" key={feedback} initial={{ opacity: 0, y: 8, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }}><Sparkles size={13} /> {feedback}</motion.div>}</AnimatePresence>
              {phase === 'done' && <motion.div className="clean-result" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><div className="clean-result-card"><span className="eyebrow"><Check size={13} /> {cleanCount === items.length ? 'ROOM COMPLETE' : 'TIME IS UP'}</span><h2>{ratingFor(Math.floor(overallClean * 100))}</h2><div className="clean-result-stats"><span><b>{Math.round(overallClean * 100)}%</b> ROOM CLEAN</span><span><b>{cleanCount}/{items.length}</b> SORTED</span><span><b>{score.toLocaleString()}</b> SCORE</span><span><b>×{combo}</b> BEST COMBO</span><span><b>{timeLabel}</b> TIME LEFT</span><span><b>+{Math.max(0, Math.round(seconds) * 10)}</b> TIME BONUS</span></div><div className="clean-result-actions"><button type="button" onClick={startGame}><RotateCcw size={14} /> Try again</button>{level < 4 && <button type="button" onClick={continueToNextLevel}>Next level</button>}<button type="button" onClick={onBack}>Back to games <ArrowLeft size={14} /></button></div></div></motion.div>}
            </div>
            <aside className={`clean-object-list ${listOpen ? 'open' : ''}`}><button className="clean-list-heading" type="button" onClick={() => setListOpen(value => !value)}><span>OBJECTS LEFT</span><b>{items.length - cleanCount}</b></button>{listOpen && <div className="clean-list-rows">{remainingByKind.map(type => <button className="clean-list-item" key={type.kind} type="button" onClick={() => setFocusItemId(items.find(item => !item.done && item.kind === type.kind)?.id ?? null)}><span style={{ '--item-color': type.color } as React.CSSProperties}>{type.emoji}</span><b>{type.label}</b><small>→ {zoneMeta.find(zone => zone.id === type.zone)?.label.toLowerCase()}</small><i>{type.count}</i></button>)}{!remainingByKind.length && <div className="clean-all-done"><Sparkles size={18} /><span>All clear!</span></div>}</div>}</aside>
          </div>
          <p className="clean-instructions"><span>Pick up each object and place it on its matching furniture.</span><i /> Wrong drop costs 3 seconds.</p>
        </motion.div>}
      </AnimatePresence>
    </section>
  </main>
}
