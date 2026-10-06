import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Box, Heart, Moon, PawPrint, RotateCcw, Sparkles, Zap, Scissors, BedDouble, Fish, MoveUp } from 'lucide-react'
import CatBedroom from '../components/CatBedroom'
import CatSurvivalCanvas, { type CatGameHandle, type CatHud, type CatSceneEvent } from '../components/CatSurvivalCanvas'

type GameState = 'ready' | 'playing' | 'done'
const STORAGE_KEY = 'cat-vs-everything-best'
const INITIAL_HUD: CatHud = { fish: 0, score: 0, health: 3, distance: 0, combo: 0, zoomies: 0, box: 0, scratch: 0, nap: 0 }

function CatPortrait() {
  return <svg className="cat-title-art" viewBox="0 0 200 180" aria-hidden="true">
    <ellipse cx="98" cy="162" rx="60" ry="10" fill="rgba(0,0,0,.35)" />
    <path d="M55 113q-25 1-23 27t24 4" fill="none" stroke="#c79270" strokeWidth="13" strokeLinecap="round" />
    <ellipse cx="96" cy="125" rx="48" ry="31" fill="#b77f63" />
    <ellipse cx="107" cy="128" rx="28" ry="20" fill="#d8b397" />
    <path d="M60 72 65 26l34 30 33-31 7 51" fill="#b77f63" stroke="#d8aa8a" strokeWidth="3" strokeLinejoin="round" />
    <path d="m72 48 1-12 15 13m29 0 14-14 2 19" fill="#edb5a6" />
    <ellipse cx="99" cy="83" rx="43" ry="39" fill="#c38d6d" />
    <ellipse cx="100" cy="97" rx="22" ry="15" fill="#f0d9c1" />
    <ellipse cx="83" cy="79" rx="4" ry="7" fill="#302729" /><ellipse cx="115" cy="79" rx="4" ry="7" fill="#302729" />
    <path d="m96 92 5 4 5-4q-5-6-10 0m5 5q-7 8-13 0m13 0q7 8 13 0" fill="none" stroke="#78504b" strokeWidth="2" strokeLinecap="round" />
    <path d="M63 105q8 13 4 28m72-28q-8 13-4 28" fill="none" stroke="#f4ddc6" strokeWidth="7" strokeLinecap="round" />
    <path d="M78 150v9m48-9v9" stroke="#906451" strokeWidth="6" strokeLinecap="round" />
    <path d="m128 111 14 5m-14 2 15 3m-81-10-14 5m14 2-15 3" stroke="#f0dfd0" strokeWidth="1.5" strokeLinecap="round" />
    <path d="m157 57 4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill="#e9bc7e" />
  </svg>
}

function formatCooldown(value: number) { return value <= 0 ? 'READY' : `${value.toFixed(1)}s` }

export default function CatVsEverything({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<GameState>('ready')
  const [runId, setRunId] = useState(0)
  const [hud, setHud] = useState(INITIAL_HUD)
  const [best, setBest] = useState(() => { try { return Number(localStorage.getItem(STORAGE_KEY)) || 0 } catch { return 0 } })
  const [signals, setSignals] = useState({ jump: 0, hit: 0, zoomies: false, gameOver: false })
  const gameRef = useRef<CatGameHandle>(null)
  const [verdict, setVerdict] = useState('')

  function startGame() {
    setHud(INITIAL_HUD)
    setVerdict('')
    setSignals({ jump: 0, hit: 0, zoomies: false, gameOver: false })
    setRunId(value => value + 1)
    setState('playing')
  }

  function handleGameOver(result: CatHud) {
    setHud(result)
    const newBest = Math.max(best, result.score)
    setBest(newBest)
    try { localStorage.setItem(STORAGE_KEY, String(newBest)) } catch { /* Local score remains available for this round. */ }
    const messages = result.fish >= 12 ? ['Professional cat behavior.', 'A flawless display of paws and chaos.', 'The bedroom will never recover.'] : result.distance > 500 ? ['You survived the vacuum.', 'The vacuum remains undefeated.', 'Nine lives. One very rude slipper.'] : ['The cucumber was a tactical error.', 'That was definitely not a cardboard box.', 'The human almost got a cuddle. Unacceptable.']
    setVerdict(messages[Math.floor(Math.random() * messages.length)])
    setState('done')
  }

  function emit(event: CatSceneEvent) {
    setSignals(previous => ({ ...previous, ...(event === 'jump' ? { jump: previous.jump + 1 } : event === 'hit' ? { hit: previous.hit + 1 } : event === 'zoomies' ? { zoomies: true } : { gameOver: true }) }))
    if (event === 'zoomies') window.setTimeout(() => setSignals(previous => ({ ...previous, zoomies: false })), 4_600)
  }

  useEffect(() => {
    if (state !== 'playing') return
    const handleKey = (event: KeyboardEvent) => {
      if (event.repeat) return
      const target = event.target
      if (target instanceof HTMLElement && target.closest('button, input, textarea, select')) return
      const key = event.key.toLowerCase()
      if (key === ' ' || key === 'arrowup' || key === 'w') { event.preventDefault(); gameRef.current?.jump() }
      else if (key === 'a' || key === 'arrowleft') gameRef.current?.moveLeft(true)
      else if (key === 'd' || key === 'arrowright') gameRef.current?.moveRight(true)
      else if (key === 'z') gameRef.current?.zoomies()
      else if (key === 'b') gameRef.current?.box()
      else if (key === 'x') gameRef.current?.scratch()
      else if (key === 'n') gameRef.current?.nap()
    }
    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (key === 'a' || key === 'arrowleft') gameRef.current?.moveLeft(false)
      if (key === 'd' || key === 'arrowright') gameRef.current?.moveRight(false)
    }
    window.addEventListener('keydown', handleKey)
    window.addEventListener('keyup', handleKeyUp)
    return () => { window.removeEventListener('keydown', handleKey); window.removeEventListener('keyup', handleKeyUp); gameRef.current?.moveLeft(false); gameRef.current?.moveRight(false) }
  }, [state])

  const lives = Array.from({ length: 3 }, (_, index) => index < hud.health)
  return (
    <main className="explore-page game-page cat-page">
      <CatBedroom signals={signals} />
      <div className="cat-vignette" aria-hidden="true" />
      <header className="explore-header cat-header">
        <button className="back-button" onClick={onBack} type="button"><ArrowLeft size={16} /><span>Back to games</span></button>
        <div className="brand-mark"><PawPrint size={14} /><span>PLAY / 07</span></div>
      </header>
      <section className="game-content cat-content" aria-labelledby="cat-game-title">
        <AnimatePresence mode="wait">
          {state === 'ready' && <motion.div key="ready" className="cat-ready" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: .98 }} transition={{ duration: .35 }}>
            <div className="cat-ready-art"><CatPortrait /><span className="cat-ready-star star-one">✦</span><span className="cat-ready-star star-two">✧</span><span className="cat-art-tag"><Moon size={12} /> 2:17 AM · BEDROOM INCIDENT</span></div>
            <div className="cat-ready-copy"><div className="eyebrow"><PawPrint size={14} /> ONE CAT. NO PEACE.</div><h1 id="cat-game-title">CAT VS<br /><span>EVERYTHING</span></h1><p>A vacuum. A suspicious cucumber. One slipper in flight. Keep moving, collect snacks, and make it everyone else’s problem.</p>
              <div className="cat-controls"><span><kbd>A</kbd><kbd>D</kbd> Move <i /> <kbd>SPACE</kbd> Jump / double jump <i /> <kbd>Z</kbd> Zoomies <i /> <kbd>B</kbd> Box <i /> <kbd>X</kbd> Scratch <i /> <kbd>N</kbd> Cat nap</span></div>
              <button className="cat-start" type="button" onClick={startGame}><Zap size={16} /> Let the chaos begin</button>
              <span className="cat-best-line"><Sparkles size={12} /> LOCAL BEST <b>{best.toLocaleString()}</b></span>
            </div>
          </motion.div>}

          {state !== 'ready' && <motion.div key="game" className="cat-game-shell" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .35 }}>
            <div className="cat-title-row"><div><div className="eyebrow"><PawPrint size={14} /> AFTER HOURS, UNLEASHED</div><h1 id="cat-game-title">Cat vs Everything</h1></div><div className="cat-best-badge"><Sparkles size={13} /> BEST <b>{best.toLocaleString()}</b></div></div>
            <div className="cat-hud">
              <div className="cat-hud-stat"><span><Fish size={13} /> FISH</span><strong>{hud.fish}</strong></div>
              <div className="cat-hud-stat"><span> SCORE</span><strong>{hud.score.toLocaleString()}</strong></div>
              <div className="cat-hud-stat"><span><Heart size={13} /> HEALTH</span><strong className="cat-hearts">{lives.map((alive, index) => <Heart key={index} size={15} fill={alive ? 'currentColor' : 'transparent'} />)}</strong></div>
              <div className="cat-hud-stat"><span><MoveUp size={13} /> DISTANCE</span><strong>{hud.distance} <small>m</small></strong></div>
              <div className="cat-hud-stat"><span><Sparkles size={13} /> COMBO</span><strong>×{hud.combo}</strong></div>
            </div>
            <div className={`cat-arena ${signals.zoomies ? 'cat-arena-zoom' : ''} ${state === 'done' ? 'cat-arena-ended' : ''}`}>
              <CatSurvivalCanvas ref={gameRef} running={state === 'playing'} runId={runId} onHud={setHud} onGameOver={handleGameOver} onSignal={emit} />
              {state === 'done' && <motion.div className="cat-gameover" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .4 }}><div className="cat-over-sticker"><PawPrint size={19} /></div><span className="cat-over-kicker">THE BEDROOM HAS SURVIVED</span><strong>{verdict}</strong><p>The incident report is mostly claw marks.</p><div className="cat-result-stats"><span><b>{hud.score}</b> SCORE</span><span><b>{hud.distance}m</b> DISTANCE</span><span><b>{hud.fish}</b> FISH</span><span><b>{best}</b> BEST</span></div><button className="cat-start" onClick={startGame} type="button"><RotateCcw size={14} /> Run it back</button></motion.div>}
            </div>
            <div className="cat-ability-row">
              <div className="cat-ability-intro"><span>EMERGENCY CAT PROTOCOLS</span><small>One paw on chaos. One paw on escape.</small></div>
              <button type="button" className="cat-ability ability-zoom" disabled={state !== 'playing' || hud.zoomies > 0} onClick={() => gameRef.current?.zoomies()}><span className="cat-ability-icon"><Zap size={15} /></span><span><b>ZOOMIES</b><small>{formatCooldown(hud.zoomies)}</small></span><kbd>Z</kbd></button>
              <button type="button" className="cat-ability ability-box" disabled={state !== 'playing' || hud.box > 0} onClick={() => gameRef.current?.box()}><span className="cat-ability-icon"><Box size={15} /></span><span><b>BOX MODE</b><small>{formatCooldown(hud.box)}</small></span><kbd>B</kbd></button>
              <button type="button" className="cat-ability ability-scratch" disabled={state !== 'playing' || hud.scratch > 0} onClick={() => gameRef.current?.scratch()}><span className="cat-ability-icon"><Scissors size={15} /></span><span><b>SCRATCH</b><small>{formatCooldown(hud.scratch)}</small></span><kbd>X</kbd></button>
              <button type="button" className="cat-ability ability-nap" disabled={state !== 'playing' || hud.nap > 0 || hud.health >= 3} onClick={() => gameRef.current?.nap()}><span className="cat-ability-icon"><BedDouble size={15} /></span><span><b>CAT NAP</b><small>{hud.health >= 3 ? 'FULL HEALTH' : formatCooldown(hud.nap)}</small></span><kbd>N</kbd></button>
            </div>
            <div className="cat-mobile-controls"><button onPointerDown={event => { event.preventDefault(); gameRef.current?.moveLeft(true) }} onPointerUp={() => gameRef.current?.moveLeft(false)} onPointerLeave={() => gameRef.current?.moveLeft(false)} type="button">LEFT</button><button onClick={() => gameRef.current?.jump()} type="button">JUMP</button><button onPointerDown={event => { event.preventDefault(); gameRef.current?.moveRight(true) }} onPointerUp={() => gameRef.current?.moveRight(false)} onPointerLeave={() => gameRef.current?.moveRight(false)} type="button">RIGHT</button><button onClick={() => gameRef.current?.zoomies()} type="button">ZOOM</button><button onClick={() => gameRef.current?.scratch()} type="button">SCRATCH</button></div>
            <p className="cat-game-tip">Space to jump twice. Watch out for cucumbers. Seriously.</p>
          </motion.div>}
        </AnimatePresence>
      </section>
    </main>
  )
}
