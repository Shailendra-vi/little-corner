import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Battery, Coins, Fuel, Gauge, LockKeyhole, RotateCcw, Shield, Sparkles, Wrench, Zap, Settings2 } from 'lucide-react'
import HillDriveCanvas, { type DriveHandle, type DriveHud, type DriveSignals } from '../components/HillDriveCanvas'
import HillEnvironment from '../components/HillEnvironment'
import { freshProgress, hillLevels, upgradeNames, vehicles, type HillProgress, type UpgradeId } from '../utils/hillDrive'

type View = 'garage' | 'drive' | 'done'
const PROGRESS_KEY = 'hill-climb-chaos-progress-v1'
const START_HUD: DriveHud = { speed: 0, fuel: 100, distance: 0, coins: 0, condition: 100, boost: 0, air: false }

function loadProgress(): HillProgress {
  try {
    const saved = localStorage.getItem(PROGRESS_KEY)
    if (!saved) return freshProgress()
    const parsed = JSON.parse(saved) as Partial<HillProgress>
    const initial = freshProgress()
    return { ...initial, ...parsed, unlocked: Math.max(0, Math.min(hillLevels.length - 1, Number(parsed.unlocked) || 0)), upgrades: { ...initial.upgrades, ...parsed.upgrades } }
  } catch { return freshProgress() }
}

function messageFor(hud: DriveHud) {
  if (hud.distance > 1500) return 'You have technically invented a new road.'
  if (hud.coins > 12) return 'Financially irresponsible. Mechanically impressive.'
  if (hud.distance > 450) return 'Gravity has filed a formal complaint.'
  return 'The hill won this round. The hill is very smug.'
}

function VehicleIllustration({ id, color }: { id: string; color: string }) {
  return <svg className="vehicle-artwork" viewBox="0 0 180 78" role="img" aria-label={id.replaceAll('-', ' ')}>
    <ellipse cx="90" cy="67" rx="70" ry="7" fill="rgba(0,0,0,.24)" />
    {(id === 'tiny-car' || id === 'scooter' || id === 'cart') && <g><circle cx="48" cy="57" r="13" fill="#29252c" stroke="#dbc4a8" strokeWidth="3" /><circle cx="132" cy="57" r="13" fill="#29252c" stroke="#dbc4a8" strokeWidth="3" /><circle cx="48" cy="57" r="4" fill="#c6a88b" /><circle cx="132" cy="57" r="4" fill="#c6a88b" /></g>}
    {id === 'tiny-car' && <g><path d="M20 51 26 35q2-6 12-7l20-18q4-4 12-4h34q10 0 16 8l14 16q13 2 17 9l7 12q2 8-7 9h-8a15 15 0 0 0-29 0H64a15 15 0 0 0-29 0h-8q-9 0-7-9Z" fill={color} stroke="#f3dfc8" strokeOpacity=".65" strokeWidth="2" /><path d="m64 12-19 17h29V12Zm17 0v17h42l-14-15q-2-2-7-2Z" fill="#b6d0ce" stroke="#d9e2dd" strokeWidth="1.5" /><path d="M26 43h10m111 0h9" stroke="#f8d798" strokeWidth="5" strokeLinecap="round" /><path d="M38 51h109" stroke="rgba(50,35,38,.35)" strokeWidth="2" /></g>}
    {id === 'cart' && <g fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M33 17h105l-14 34H51Z" stroke="#d9d4ca" strokeWidth="5"/><path d="m36 23 93 0M43 34h83M48 45h74M56 20l6 30m20-30 1 30m19-30-4 30" stroke="#b9aea1" strokeWidth="2"/><path d="m138 18 17-11" stroke="#e4c8a5" strokeWidth="5"/><circle cx="69" cy="31" r="5" fill="#df8b73" stroke="none"/><circle cx="103" cy="39" r="5" fill="#d8bd72" stroke="none"/></g>}
    {id === 'scooter' && <g><path d="M38 52h86l-9-8H47Z" fill={color} stroke="#f1e1cc" strokeWidth="2"/><path d="m117 47 7-38h21" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/><path d="M132 9h25" stroke="#eee0ca" strokeWidth="5" strokeLinecap="round"/><circle cx="49" cy="57" r="11" fill="#29252c" stroke="#dbc4a8" strokeWidth="3"/><circle cx="132" cy="57" r="11" fill="#29252c" stroke="#dbc4a8" strokeWidth="3"/><path d="M71 48v-12q0-5 7-5h15" fill="none" stroke="#bb9b81" strokeWidth="4" strokeLinecap="round"/></g>}
    {id === 'skateboard' && <g><circle cx="48" cy="58" r="8" fill="#29252c" stroke="#dbc4a8" strokeWidth="3"/><circle cx="132" cy="58" r="8" fill="#29252c" stroke="#dbc4a8" strokeWidth="3"/><path d="M24 46q66 15 132 0l-5 12q-63 16-122 0Z" fill={color} stroke="#f2dfc7" strokeWidth="2"/><path d="m70 51 20-8 20 8-20 7Z" fill="#f1d4ad"/><path d="M42 54h-4v9m100-9h4v9" fill="none" stroke="#a9a5a1" strokeWidth="4"/></g>}
    {id === 'office-chair' && <g><circle cx="55" cy="66" r="6" fill="#29252c" stroke="#c4b19e" strokeWidth="2"/><circle cx="125" cy="66" r="6" fill="#29252c" stroke="#c4b19e" strokeWidth="2"/><path d="M90 49v12M90 60 53 67m37-7 36 7M90 60l-22 8m22-8 22 8" stroke="#b6aaa0" strokeWidth="4" strokeLinecap="round"/><path d="M54 21q0-9 9-9h54q9 0 9 9v15q0 8-9 8H63q-9 0-9-8Z" fill={color} stroke="#ded1c5" strokeWidth="2"/><path d="M47 44q0-5 8-5h70q8 0 8 5v5q0 7-8 7H55q-8 0-8-7Z" fill={color} stroke="#ded1c5" strokeWidth="2"/><path d="M71 18v19m38-19v19" stroke="rgba(255,255,255,.23)" strokeWidth="2"/></g>}
    {id === 'suitcase' && <g><circle cx="58" cy="62" r="9" fill="#29252c" stroke="#dbc4a8" strokeWidth="3"/><circle cx="122" cy="62" r="9" fill="#29252c" stroke="#dbc4a8" strokeWidth="3"/><path d="M62 16v-6q0-5 6-5h42q6 0 6 5v6" fill="none" stroke="#e3c7a6" strokeWidth="5" strokeLinecap="round"/><rect x="43" y="15" width="94" height="44" rx="9" fill={color} stroke="#f0ddc6" strokeWidth="2"/><path d="M58 19v36m64-36v36m-47-31h28" stroke="rgba(255,255,255,.3)" strokeWidth="3"/><rect x="78" y="29" width="24" height="18" rx="8" fill="#f1d0a5"/><text x="90" y="42" textAnchor="middle" fontSize="8" fontWeight="800" fill="#775467">TRIP</text></g>}
  </svg>
}

export default function HillClimbChaos({ onBack }: { onBack: () => void }) {
  const [view, setView] = useState<View>('garage')
  const [progress, setProgress] = useState<HillProgress>(loadProgress)
  const [levelIndex, setLevelIndex] = useState(0)
  const [runId, setRunId] = useState(0)
  const [hud, setHud] = useState(START_HUD)
  const [signals, setSignals] = useState<DriveSignals>({ speed: 0, crash: 0, active: false, level: 0 })
  const driveRef = useRef<DriveHandle>(null)
  const [verdict, setVerdict] = useState('')
  const currentLevel = hillLevels[levelIndex]
  const currentVehicle = vehicles.find(vehicle => vehicle.id === progress.vehicle) ?? vehicles[0]

  useEffect(() => { try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)) } catch { /* This round still works when local storage is unavailable. */ } }, [progress])

  const startDrive = () => {
    setHud(START_HUD)
    setSignals(previous => ({ ...previous, speed: 0, active: true, level: currentLevel.terrain }))
    setRunId(value => value + 1)
    setView('drive')
  }
  const finishRun = (result: { distance: number; coins: number }) => {
    setHud(previous => ({ ...previous, distance: result.distance, coins: result.coins }))
    setVerdict(messageFor({ ...hud, distance: result.distance, coins: result.coins }))
    setProgress(previous => {
      const bestDistance = Math.max(previous.bestDistance, result.distance)
      const unlocked = result.distance >= (hillLevels[levelIndex + 1]?.unlockAt ?? Infinity) ? Math.max(previous.unlocked, Math.min(hillLevels.length - 1, levelIndex + 1)) : previous.unlocked
      return { ...previous, coins: previous.coins + result.coins, bestDistance, unlocked }
    })
    setSignals(previous => ({ ...previous, active: false }))
    setView('done')
  }

  useEffect(() => {
    if (view !== 'drive') return
    const keydown = (event: KeyboardEvent) => {
      if (event.repeat) return
      const key = event.key.toLowerCase()
      if (event.target instanceof HTMLElement && event.target.closest('button,input,textarea,select') && key !== ' ') return
      if (key === 'arrowright' || key === 'd') { event.preventDefault(); driveRef.current?.accelerate(true) }
      if (key === 'arrowleft' || key === 'a') { event.preventDefault(); driveRef.current?.brake(true) }
      if (key === 'arrowup' || key === 'w') { event.preventDefault(); driveRef.current?.rotateBack(true) }
      if (key === 'arrowdown' || key === 's') { event.preventDefault(); driveRef.current?.rotateForward(true) }
      if (key === ' ') { event.preventDefault(); driveRef.current?.jump() }
    }
    const keyup = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (key === 'arrowright' || key === 'd') driveRef.current?.accelerate(false)
      if (key === 'arrowleft' || key === 'a') driveRef.current?.brake(false)
      if (key === 'arrowup' || key === 'w') driveRef.current?.rotateBack(false)
      if (key === 'arrowdown' || key === 's') driveRef.current?.rotateForward(false)
    }
    const release = () => { driveRef.current?.accelerate(false); driveRef.current?.brake(false); driveRef.current?.rotateBack(false); driveRef.current?.rotateForward(false) }
    window.addEventListener('keydown', keydown); window.addEventListener('keyup', keyup); window.addEventListener('blur', release)
    return () => { window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup); window.removeEventListener('blur', release); release() }
  }, [view])

  const buyUpgrade = (id: UpgradeId, baseCost: number) => {
    const level = progress.upgrades[id], cost = baseCost * (level + 1)
    if (level >= 5 || progress.coins < cost) return
    setProgress(previous => ({ ...previous, coins: previous.coins - cost, upgrades: { ...previous.upgrades, [id]: previous.upgrades[id] + 1 } }))
  }
  const bindPedal = (key: 'accelerate' | 'brake' | 'rotateBack' | 'rotateForward') => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => { event.preventDefault(); driveRef.current?.[key](true); event.currentTarget.setPointerCapture(event.pointerId) },
    onPointerUp: () => driveRef.current?.[key](false), onPointerCancel: () => driveRef.current?.[key](false), onLostPointerCapture: () => driveRef.current?.[key](false),
  })
  const jump = (event: React.PointerEvent<HTMLButtonElement>) => { event.preventDefault(); driveRef.current?.jump() }

  return (
    <main className="explore-page game-page hill-page">
      <HillEnvironment level={currentLevel} signals={signals} />
      <div className="hill-vignette" aria-hidden="true" />
      <header className="explore-header hill-header">
        <button className="back-button" onClick={onBack} type="button"><ArrowLeft size={16} /><span>Back to games</span></button>
        <div className="brand-mark"><Gauge size={14} /><span>PLAY / 08</span></div>
      </header>
      <section className="game-content hill-content" aria-labelledby="hill-title">
        <AnimatePresence mode="wait">
          {view === 'garage' && <motion.div key="garage" className="hill-garage" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .3 }}>
            <div className="hill-heading-row"><div><div className="eyebrow"><Settings2 size={14} /> THE CHAOS GARAGE</div><h1 id="hill-title">Hill Climb:<br /><span>Chaos Edition</span></h1><p>Choose your questionable vehicle. The terrain has already made its choice.</p></div><div className="hill-bank"><Coins size={17} /><span>COIN BALANCE</span><strong>{progress.coins}</strong></div></div>
            <div className="hill-garage-grid">
              <section className="hill-garage-panel hill-vehicles"><div className="hill-panel-head"><span>CHOOSE YOUR RIDE</span><small>EVERY RIDE HAS A DIFFERENT FEEL</small></div>
                <div className="hill-featured-ride" style={{ '--vehicle-accent': currentVehicle.color } as React.CSSProperties}><div className="hill-featured-copy"><span>IN THE BAY Â· READY TO ROLL</span><strong>{currentVehicle.name}</strong><p>{currentVehicle.description}</p><div className="hill-vehicle-metrics"><span>POWER <i><b style={{ width: Math.max(28, (currentVehicle.engine - 260) / 1.5) + '%' }} /></i></span><span>GRIP <i><b style={{ width: Math.max(28, currentVehicle.grip * 78) + '%' }} /></i></span><span>RANGE <i><b style={{ width: Math.max(28, currentVehicle.fuel * .72) + '%' }} /></i></span></div></div><div className="hill-featured-art"><VehicleIllustration id={currentVehicle.id} color={currentVehicle.color} /></div></div>
                <div className="hill-vehicle-grid">{vehicles.map(vehicle => <button type="button" key={vehicle.id} className={'hill-vehicle-card ' + (progress.vehicle === vehicle.id ? 'selected' : '')} style={{ '--vehicle-accent': vehicle.color } as React.CSSProperties} onClick={() => setProgress(previous => ({ ...previous, vehicle: vehicle.id }))}><span className="hill-vehicle-art-wrap"><VehicleIllustration id={vehicle.id} color={vehicle.color} /></span><strong>{vehicle.name}</strong><small>{vehicle.description}</small>{progress.vehicle === vehicle.id && <span className="hill-selected-mark"><Sparkles size={11} /> SELECTED</span>}</button>)}</div></section>
              <aside className="hill-garage-panel hill-tune"><div className="hill-panel-head"><span>UNNECESSARY MODIFICATIONS</span><small>5 LEVELS EACH</small></div>{upgradeNames.map(upgrade => { const value = progress.upgrades[upgrade.id], price = upgrade.baseCost * (value + 1); return <div className="hill-upgrade" key={upgrade.id}><span className="hill-upgrade-icon">{upgrade.id === 'engine' ? <Zap size={15} /> : upgrade.id === 'fuel' ? <Fuel size={15} /> : upgrade.id === 'stability' ? <Shield size={15} /> : <Wrench size={15} />}</span><span className="hill-upgrade-copy"><b>{upgrade.name}</b><small>{upgrade.detail}</small><i>{Array.from({ length: 5 }, (_, index) => <em key={index} className={index < value ? 'filled' : ''} />)}</i></span><button type="button" disabled={value >= 5 || progress.coins < price} onClick={() => buyUpgrade(upgrade.id, upgrade.baseCost)}>{value >= 5 ? 'MAX' : <><Coins size={11} /> {price}</>}</button></div> })}</aside>
            </div>
            <section className="hill-level-panel"><div className="hill-panel-head"><span>SELECT A WORLD</span><small>UNLOCKED: {progress.unlocked + 1} / {hillLevels.length}</small></div><div className="hill-level-list">{hillLevels.map((level, index) => <button type="button" key={level.id} disabled={index > progress.unlocked} className={'hill-level-chip ' + (index === levelIndex ? 'active ' : '') + (index > progress.unlocked ? 'locked' : '')} onClick={() => setLevelIndex(index)}><span>{index > progress.unlocked ? <LockKeyhole size={13} /> : <b>0{index + 1}</b>}</span><strong>{level.name}</strong><small>{index > progress.unlocked ? level.unlockAt + 'm to unlock' : level.subtitle}</small></button>)}</div></section>
            <div className="hill-garage-footer"><span><Gauge size={13} /> PERSONAL BEST <b>{progress.bestDistance.toLocaleString()} m</b></span><button type="button" className="hill-start" onClick={startDrive}><span>Start engine</span><ArrowRight size={16} /></button></div>
          </motion.div>}

          {view !== 'garage' && <motion.div key="drive" className="hill-drive-screen" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .3 }}>
            <div className="hill-drive-title"><div><div className="eyebrow"><Sparkles size={13} /> LEVEL 0{levelIndex + 1} Â· {currentLevel.name.toUpperCase()}</div><h1 id="hill-title">{currentLevel.name}<span> / {currentVehicle.name}</span></h1></div><button className="hill-garage-link" type="button" onClick={() => setView('garage')}><Settings2 size={14} /> Garage</button></div>
            <div className="hill-hud"><div><span><Gauge size={13} /> SPEED</span><strong>{Math.round(hud.speed)}<small> km/h</small></strong></div><div><span><Fuel size={13} /> FUEL</span><strong className={hud.fuel < 25 ? 'hill-low' : ''}>{Math.round(hud.fuel)}<small>%</small></strong><i><b style={{ width: Math.max(0,hud.fuel) + '%' }} /></i></div><div><span>DISTANCE</span><strong>{hud.distance}<small> m</small></strong></div><div><span><Coins size={13} /> COINS</span><strong>{hud.coins}</strong></div><div><span><Battery size={13} /> CONDITION</span><strong className={hud.condition < 30 ? 'hill-low' : ''}>{Math.round(hud.condition)}<small>%</small></strong><i><b className="condition-fill" style={{ width: Math.max(0,hud.condition) + '%' }} /></i></div><div><span>VEHICLE STATE</span><strong className={hud.air ? 'hill-air' : ''}>{hud.air ? 'AIRBORNE' : hud.boost > 0 ? 'BOOSTING' : 'ON ROAD'}</strong></div></div>
            <div className={'hill-canvas-frame ' + (signals.speed > 420 ? 'speeding' : '')}><HillDriveCanvas ref={driveRef} running={view === 'drive'} runId={runId} level={currentLevel} vehicle={progress.vehicle} upgrades={progress.upgrades} onHud={setHud} onGameOver={finishRun} onCrash={() => setSignals(previous => ({ ...previous, crash: previous.crash + 1 }))} onSignals={setSignals} />
              {view === 'done' && <motion.div className="hill-over" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><span className="hill-over-icon"><Wrench size={18} /></span><span className="hill-over-kicker">ENGINE OFF Â· EGO BRUISED</span><strong>{verdict}</strong><p>You made it {hud.distance} meters before the hill had other plans.</p><div className="hill-result-stats"><span><b>{hud.distance}m</b>DISTANCE</span><span><b>{hud.coins}</b>COINS THIS RUN</span><span><b>{progress.bestDistance}m</b>BEST</span></div><div className="hill-over-actions"><button type="button" onClick={startDrive}><RotateCcw size={14} /> Retry</button><button type="button" onClick={() => setView('garage')}>Garage</button>{levelIndex < progress.unlocked && <button type="button" className="next-level" onClick={() => { setLevelIndex(value => value + 1); setView('garage') }}>Next level <ArrowRight size={14} /></button>}</div></motion.div>}
            </div>
            {view === 'drive' && <><div className="hill-touch-controls"><button {...bindPedal('brake')} type="button" aria-label="Brake and reverse"><ArrowLeft size={18} /><small>BRAKE</small></button><button {...bindPedal('rotateBack')} type="button" aria-label="Rotate vehicle backward"><RotateCcw size={17} /><small>LEAN BACK</small></button><button {...bindPedal('rotateForward')} type="button" aria-label="Rotate vehicle forward"><RotateCcw size={17} className="flip-icon" /><small>LEAN FWD</small></button><button {...bindPedal('accelerate')} type="button" aria-label="Accelerate"><ArrowRight size={18} /><small>GAS</small></button><button type="button" onPointerDown={jump} aria-label="Jump"><Sparkles size={17} /><small>JUMP</small></button></div><p className="hill-controls-note">Space / HOP jump | Left / A brake | Right / D accelerate | Up / W lean back | Down / S lean forward <span> Â· Grab fuel, boost & repairs on the way.</span></p></>}
          </motion.div>}
        </AnimatePresence>
      </section>
    </main>
  )
}
