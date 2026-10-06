import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

export type CatHud = { fish: number; score: number; health: number; distance: number; combo: number; zoomies: number; box: number; scratch: number; nap: number }
export type CatGameHandle = { jump: () => void; moveLeft: (active: boolean) => void; moveRight: (active: boolean) => void; zoomies: () => void; box: () => void; scratch: () => void; nap: () => void }
export type CatSceneEvent = 'jump' | 'hit' | 'zoomies' | 'gameOver'
type ItemKind = 'fish' | 'yarn' | 'box' | 'treat'
type HazardKind = 'vacuum' | 'water' | 'dog' | 'falling' | 'laser' | 'human' | 'alarm' | 'cucumber' | 'slipper'
type Thing = { kind: ItemKind | HazardKind; x: number; y: number; w: number; h: number; phase: number; taken?: boolean; vy?: number }
type Run = { things: Thing[]; lastSpawn: number; lastItem: number; distance: number; elapsed: number; score: number; fish: number; health: number; combo: number; comboAt: number; speed: number; catY: number; vy: number; jumps: number; playerX: number; left: boolean; right: boolean; invulnerableUntil: number; zoomUntil: number; boxUntil: number; napUntil: number; slowUntil: number; hitAt: number; cooldowns: { zoomies: number; box: number; scratch: number; nap: number }; dead: boolean; squash: number; event: number }
const ITEM_KINDS: ItemKind[] = ['fish', 'yarn', 'box', 'treat']
const HAZARD_KINDS: HazardKind[] = ['vacuum', 'water', 'dog', 'falling', 'laser', 'human', 'alarm', 'cucumber', 'slipper']

const freshRun = (): Run => ({ things: [], lastSpawn: 0, lastItem: 0, distance: 0, elapsed: 0, score: 0, fish: 0, health: 3, combo: 0, comboAt: 0, speed: 255, catY: 0, vy: 0, jumps: 0, playerX: 0, left: false, right: false, invulnerableUntil: 0, zoomUntil: 0, boxUntil: 0, napUntil: 0, slowUntil: 0, hitAt: -10, cooldowns: { zoomies: 0, box: 0, scratch: 0, nap: 0 }, dead: false, squash: 0, event: 0 })

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath(); ctx.roundRect(x, y, width, height, radius)
}

function drawCat(ctx: CanvasRenderingContext2D, x: number, ground: number, time: number, run: Run, active: boolean) {
  const airborne = run.catY < -.5
  const zoom = time < run.zoomUntil
  const nap = time < run.napUntil
  const anim = active && !airborne && !nap ? Math.sin(time * (zoom ? 25 : 13)) : 0
  const stretch = airborne ? .78 : 1 + Math.max(0, anim) * .08
  const squash = run.squash > 0 ? 1 - run.squash * .24 : 1
  const scaleX = (zoom ? 1.15 : 1) * squash / stretch
  const scaleY = stretch * squash
  ctx.save(); ctx.translate(x, ground + run.catY); ctx.scale(scaleX, scaleY)
  if (zoom) { ctx.shadowColor = '#f5a268'; ctx.shadowBlur = 22 }
  if (time < run.invulnerableUntil) ctx.globalAlpha = .45 + Math.abs(Math.sin(time * 20)) * .45
  ctx.strokeStyle = '#d6a77e'; ctx.lineWidth = 7; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(-19, -23); ctx.bezierCurveTo(-37, -25 + Math.sin(time * 9) * 5, -34, -51, -19, -43); ctx.stroke()
  ctx.fillStyle = '#b77f63'; ctx.beginPath(); ctx.ellipse(-1, -21, 25, 17, -.08, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#cca083'; ctx.beginPath(); ctx.ellipse(5, -19, 16, 10, -.05, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#b77f63'; ctx.beginPath(); ctx.arc(19, -39, 15, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.moveTo(8, -48); ctx.lineTo(10, -64); ctx.lineTo(21, -51); ctx.closePath(); ctx.fill()
  ctx.beginPath(); ctx.moveTo(22, -51); ctx.lineTo(32, -63); ctx.lineTo(33, -43); ctx.closePath(); ctx.fill()
  ctx.fillStyle = '#e9b1a6'; ctx.beginPath(); ctx.moveTo(12, -51); ctx.lineTo(13, -57); ctx.lineTo(18, -51); ctx.closePath(); ctx.fill()
  ctx.beginPath(); ctx.moveTo(26, -51); ctx.lineTo(30, -56); ctx.lineTo(30, -48); ctx.closePath(); ctx.fill()
  ctx.fillStyle = '#f2dec9'; ctx.beginPath(); ctx.ellipse(20, -35, 8, 5.5, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#342a2b'; ctx.beginPath(); ctx.ellipse(15, -40, 1.7, 3.4, 0, 0, Math.PI * 2); ctx.ellipse(24, -40, 1.7, 3.4, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#bd6e70'; ctx.beginPath(); ctx.arc(20, -35, 1.6, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#f2dec9'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(14, -34); ctx.lineTo(4, -36); ctx.moveTo(14, -32); ctx.lineTo(4, -31); ctx.moveTo(25, -34); ctx.lineTo(35, -36); ctx.moveTo(25, -32); ctx.lineTo(35, -31); ctx.stroke()
  ctx.strokeStyle = '#906451'; ctx.lineWidth = 4
  const stride = active && !airborne && !nap ? Math.sin(time * (zoom ? 25 : 13)) * 7 : airborne ? -3 : 0
  ctx.beginPath(); ctx.moveTo(-11, -10); ctx.lineTo(-12 + stride, -2); ctx.moveTo(10, -10); ctx.lineTo(11 - stride, -2); ctx.stroke()
  if (time < run.boxUntil) { ctx.strokeStyle = '#e3bd7a'; ctx.lineWidth = 2; ctx.strokeRect(-36, -68, 75, 71); ctx.fillStyle = 'rgba(218,176,111,.13)'; ctx.fillRect(-36, -68, 75, 71) }
  if (nap) { ctx.strokeStyle = '#e9d6ff'; ctx.lineWidth = 2; ctx.font = 'bold 13px system-ui'; ctx.fillText('Z z z', 23, -63) }
  ctx.restore()
}

function drawThing(ctx: CanvasRenderingContext2D, item: Thing, time: number) {
  const x = item.x, y = item.y
  ctx.save(); ctx.translate(x + item.w / 2, y + item.h / 2); ctx.rotate(Math.sin(time * 3 + item.phase) * .035)
  if (ITEM_KINDS.includes(item.kind as ItemKind)) {
    const kind = item.kind as ItemKind
    const colors: Record<ItemKind, string> = { fish: '#f3b86f', yarn: '#da9ac8', box: '#c3976e', treat: '#eaa275' }
    ctx.shadowColor = colors[kind]; ctx.shadowBlur = 13
    if (kind === 'fish') {
      ctx.fillStyle = colors.fish; ctx.beginPath(); ctx.ellipse(0, 0, 13, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(-20, -7); ctx.lineTo(-20, 7); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#352728'; ctx.beginPath(); ctx.arc(7, -2, 1.5, 0, Math.PI * 2); ctx.fill()
    } else if (kind === 'yarn') {
      ctx.fillStyle = colors.yarn; ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#f4d8ed'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, 0, 8, -.8, 2.5); ctx.moveTo(-7, 5); ctx.quadraticCurveTo(-17, 13, -18, 2); ctx.stroke()
    } else if (kind === 'box') {
      ctx.fillStyle = colors.box; roundRect(ctx, -13, -11, 26, 22, 3); ctx.fill(); ctx.strokeStyle = '#edd0a9'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-13, -3); ctx.lineTo(13, -3); ctx.moveTo(0, -11); ctx.lineTo(0, -3); ctx.stroke()
    } else {
      ctx.fillStyle = colors.treat; roundRect(ctx, -13, -8, 26, 16, 6); ctx.fill(); ctx.fillStyle = '#ffe4a6'; ctx.beginPath(); ctx.arc(-13, 0, 4, 0, Math.PI * 2); ctx.arc(13, 0, 4, 0, Math.PI * 2); ctx.fill()
    }
  } else {
    const kind = item.kind as HazardKind
    ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 9; ctx.shadowOffsetY = 4
    if (kind === 'vacuum') {
      ctx.fillStyle = '#c85c55'; roundRect(ctx, -25, -16, 43, 28, 10); ctx.fill(); ctx.fillStyle = '#39313a'; ctx.beginPath(); ctx.arc(-13, 13, 4, 0, 7); ctx.arc(11, 13, 4, 0, 7); ctx.fill(); ctx.strokeStyle = '#d7c3a4'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(15, -10); ctx.quadraticCurveTo(31, -29, 26, -36); ctx.stroke(); ctx.fillStyle = '#f7c878'; ctx.beginPath(); ctx.arc(-13, -7, 3, 0, 7); ctx.fill()
    } else if (kind === 'water') {
      ctx.fillStyle = '#6eb5bc'; ctx.beginPath(); ctx.ellipse(0, 3, 34, 12, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#b5e7dc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-20, 2); ctx.quadraticCurveTo(-10, -5, 0, 2); ctx.quadraticCurveTo(10, 8, 20, 1); ctx.stroke()
    } else if (kind === 'dog') {
      ctx.fillStyle = '#9f785f'; ctx.beginPath(); ctx.ellipse(-1, -8, 20, 17, 0, 0, 7); ctx.arc(16, -18, 11, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(10, -26); ctx.lineTo(7, -39); ctx.lineTo(19, -29); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#f3d4b5'; ctx.beginPath(); ctx.ellipse(20, -14, 6, 4, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#33272a'; ctx.beginPath(); ctx.arc(18, -20, 1.5, 0, 7); ctx.fill(); ctx.strokeStyle = '#9f785f'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-16, -11); ctx.quadraticCurveTo(-31, -23, -26, -31); ctx.stroke()
    } else if (kind === 'falling') {
      ctx.fillStyle = '#d1a77d'; roundRect(ctx, -12, -14, 24, 28, 4); ctx.fill(); ctx.fillStyle = '#f1d2a7'; ctx.fillRect(-5, -14, 10, 28)
    } else if (kind === 'laser') {
      ctx.strokeStyle = '#f47786'; ctx.lineWidth = 3; ctx.shadowColor = '#f47786'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(34, 0); ctx.stroke(); ctx.fillStyle = '#fff0dc'; ctx.beginPath(); ctx.arc(-30, 0, 4, 0, 7); ctx.fill()
    } else if (kind === 'human') {
      ctx.fillStyle = '#d3a384'; ctx.beginPath(); ctx.arc(0, -22, 9, 0, 7); ctx.fill(); ctx.fillStyle = '#786378'; roundRect(ctx, -11, -15, 22, 34, 7); ctx.fill(); ctx.fillStyle = '#d3a384'; ctx.beginPath(); ctx.ellipse(17, -3, 12, 5, -.5, 0, 7); ctx.fill()
    } else if (kind === 'alarm') {
      ctx.fillStyle = '#db7b67'; ctx.beginPath(); ctx.arc(0, -1, 15, 0, 7); ctx.fill(); ctx.fillStyle = '#f4ddb2'; ctx.beginPath(); ctx.arc(0, -1, 10, 0, 7); ctx.fill(); ctx.strokeStyle = '#4b3640'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(0, -7); ctx.moveTo(0, -1); ctx.lineTo(5, 2); ctx.stroke(); ctx.fillStyle = '#db7b67'; ctx.beginPath(); ctx.arc(-10, -17, 5, Math.PI, 0); ctx.arc(10, -17, 5, Math.PI, 0); ctx.fill()
    } else if (kind === 'cucumber') {
      ctx.fillStyle = '#76a275'; roundRect(ctx, -24, -7, 48, 14, 7); ctx.fill(); ctx.fillStyle = '#c5d58f'; for (let i = -15; i <= 15; i += 10) { ctx.beginPath(); ctx.arc(i, 0, 1.7, 0, 7); ctx.fill() }
    } else {
      ctx.fillStyle = '#b97056'; ctx.beginPath(); ctx.moveTo(-24, 5); ctx.quadraticCurveTo(-9, 9, -3, -13); ctx.lineTo(6, -9); ctx.lineTo(13, 2); ctx.lineTo(24, 5); ctx.quadraticCurveTo(27, 12, 18, 13); ctx.lineTo(-20, 13); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#e3b18d'; ctx.fillRect(-15, 9, 31, 3)
    }
  }
  ctx.restore()
}

function drawScene(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, run: Run, active: boolean) {
  const ground = height * .79
  ctx.clearRect(0, 0, width, height)
  const wash = ctx.createLinearGradient(0, 0, 0, ground); wash.addColorStop(0, 'rgba(28,25,38,.04)'); wash.addColorStop(1, 'rgba(34,27,36,.24)'); ctx.fillStyle = wash; ctx.fillRect(0, 0, width, ground)
  for (let i = 0; i < 12; i += 1) { const x = (i * 91 - run.distance * .12 % (width + 90) + width + 90) % (width + 90); const y = 16 + (i * 37 % Math.max(ground - 40, 40)); ctx.fillStyle = `rgba(247,222,181,${.1 + .12 * Math.sin(time * 1.5 + i) ** 2})`; ctx.beginPath(); ctx.arc(x, y, i % 3 === 0 ? 1.4 : 1, 0, 7); ctx.fill() }
  ctx.fillStyle = 'rgba(42,34,42,.56)'; ctx.fillRect(0, ground, width, height - ground); ctx.fillStyle = 'rgba(174,132,107,.66)'; ctx.fillRect(0, ground, width, 6); ctx.fillStyle = 'rgba(36,30,38,.66)'; ctx.fillRect(0, ground + 7, width, 5)
  const floorOffset = run.distance % 95; ctx.strokeStyle = 'rgba(224,187,145,.09)'; ctx.lineWidth = 1; for (let x = -floorOffset; x < width + 95; x += 95) { ctx.beginPath(); ctx.moveTo(x, ground + 12); ctx.lineTo(x - 22, height); ctx.stroke() }
  for (const thing of run.things) if (!thing.taken) drawThing(ctx, thing, time)
  const catX = Math.max(38, Math.min(width * .62, width * .22 + run.playerX))
  drawCat(ctx, catX, ground, time, run, active)
  if (active) { ctx.fillStyle = '#d7b17d'; ctx.font = '600 9px system-ui'; ctx.fillText(`${Math.floor(run.distance)} m`, width - 51, 19) }
}

const CatSurvivalCanvas = forwardRef<CatGameHandle, { running: boolean; runId: number; onHud: (hud: CatHud) => void; onGameOver: (hud: CatHud) => void; onSignal: (event: CatSceneEvent) => void }>(function CatSurvivalCanvas({ running, runId, onHud, onGameOver, onSignal }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const current = useRef({ running, runId, onHud, onGameOver, onSignal })
  current.current = { running, runId, onHud, onGameOver, onSignal }
  const actions = useRef<CatGameHandle>({ jump() {}, moveLeft() {}, moveRight() {}, zoomies() {}, box() {}, scratch() {}, nap() {} })
  useImperativeHandle(ref, () => ({ jump: () => actions.current.jump(), moveLeft: active => actions.current.moveLeft(active), moveRight: active => actions.current.moveRight(active), zoomies: () => actions.current.zoomies(), box: () => actions.current.box(), scratch: () => actions.current.scratch(), nap: () => actions.current.nap() }), [])

  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    let width = 1, height = 1, dpr = 1, raf = 0, previous = 0, lastHud = 0, seenRunId = current.current.runId
    const run = freshRun()
    const resize = () => { const rect = canvas.getBoundingClientRect(); width = Math.max(1, rect.width); height = Math.max(1, rect.height); dpr = Math.min(window.devicePixelRatio || 1, 2); canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0) }
    const observer = new ResizeObserver(resize); observer.observe(canvas); resize()
    const groundY = () => height * .79
    const hud = (): CatHud => ({ fish: run.fish, score: run.score, health: run.health, distance: Math.floor(run.distance), combo: run.combo, zoomies: Math.max(0, run.cooldowns.zoomies - run.elapsed), box: Math.max(0, run.cooldowns.box - run.elapsed), scratch: Math.max(0, run.cooldowns.scratch - run.elapsed), nap: Math.max(0, run.cooldowns.nap - run.elapsed) })
    const jump = () => { if (!current.current.running || run.jumps >= 2) return; run.vy = run.jumps === 0 ? -615 : -530; run.jumps += 1; run.squash = .5; current.current.onSignal('jump') }
    const moveLeft = (active: boolean) => { run.left = active }
    const moveRight = (active: boolean) => { run.right = active }
    const zoomies = () => { if (!current.current.running || run.elapsed < run.cooldowns.zoomies) return; run.zoomUntil = run.elapsed + 4.6; run.cooldowns.zoomies = run.elapsed + 12; run.score += 2; current.current.onSignal('zoomies') }
    const box = () => { if (!current.current.running || run.elapsed < run.cooldowns.box) return; run.boxUntil = run.elapsed + 3.5; run.invulnerableUntil = Math.max(run.invulnerableUntil, run.boxUntil); run.cooldowns.box = run.elapsed + 15 }
    const scratch = () => { if (!current.current.running || run.elapsed < run.cooldowns.scratch) return; const playerX = Math.max(38, Math.min(width * .62, width * .22 + run.playerX)); const target = run.things.find(item => HAZARD_KINDS.includes(item.kind as HazardKind) && item.kind !== 'water' && item.x + item.w > playerX - 45 && item.x < playerX + 165); if (!target) return; target.taken = true; run.score += 8; run.cooldowns.scratch = run.elapsed + 7 }
    const nap = () => { if (!current.current.running || run.elapsed < run.cooldowns.nap || run.health >= 3) return; run.health = Math.min(3, run.health + 1); run.napUntil = run.elapsed + 2.1; run.slowUntil = run.elapsed + 2.6; run.cooldowns.nap = run.elapsed + 18 }
    actions.current = { jump, moveLeft, moveRight, zoomies, box, scratch, nap }
    const collect = (item: Thing) => {
      item.taken = true; const now = run.elapsed
      run.combo = now - run.comboAt < 2.7 ? run.combo + 1 : 1; run.comboAt = now
      if (item.kind === 'fish') { run.fish += 1; run.score += 10 + Math.min(20, run.combo * 2) }
      else if (item.kind === 'yarn') { run.score += 14; run.combo += 1 }
      else if (item.kind === 'box') { run.score += 5; run.boxUntil = now + 3.8; run.invulnerableUntil = Math.max(run.invulnerableUntil, run.boxUntil) }
      else if (item.kind === 'treat') { run.score += 8; run.health = Math.min(3, run.health + 1) }
    }
    const hit = () => { if (run.elapsed < run.invulnerableUntil || run.elapsed - run.hitAt < 1.15) return; run.health -= 1; run.hitAt = run.elapsed; run.combo = 0; run.invulnerableUntil = run.elapsed + 1.2; run.squash = 1; run.event += 1; current.current.onSignal('hit'); if (run.health <= 0 && !run.dead) { run.dead = true; current.current.onSignal('gameOver'); current.current.onGameOver(hud()) } }
    const spawn = () => {
      const kind = HAZARD_KINDS[Math.floor(Math.random() * HAZARD_KINDS.length)]
      const size: Record<HazardKind, [number, number]> = { vacuum: [56, 42], water: [70, 24], dog: [53, 49], falling: [27, 33], laser: [72, 22], human: [43, 60], alarm: [40, 38], cucumber: [48, 25], slipper: [49, 29] }
      const [w, h] = size[kind]
      let y = groundY() - h
      if (kind === 'water') y = groundY() - 7
      if (kind === 'falling') y = groundY() - 138
      if (kind === 'laser') y = groundY() - 47
      run.things.push({ kind, x: width + 35, y, w, h, phase: Math.random() * 6.28, ...(kind === 'falling' ? { vy: 18 } : {}) })
      run.lastSpawn = run.elapsed
    }
    const spawnItem = () => {
      const kind = ITEM_KINDS[Math.floor(Math.random() * ITEM_KINDS.length)]
      const w = kind === 'fish' ? 40 : 32, h = kind === 'fish' ? 30 : 29
      run.things.push({ kind, x: width + 45, y: groundY() - (kind === 'box' ? 55 : 92 + Math.random() * 88), w, h, phase: Math.random() * 6.28 })
      run.lastItem = run.elapsed
    }
    const frame = (time: number) => {
      const dt = Math.min((time - (previous || time)) / 1000, .04); previous = time
      const state = current.current
      if (state.runId !== seenRunId) { Object.assign(run, freshRun()); seenRunId = state.runId; lastHud = 0 }
      if (state.running && !run.dead) {
        run.elapsed += dt
        const difficulty = Math.min(1.7, run.distance / 1800)
        const zoom = run.elapsed < run.zoomUntil, napping = run.elapsed < run.slowUntil
        run.speed = (255 + difficulty * 130) * (zoom ? 1.6 : 1) * (napping ? .55 : 1)
        run.playerX += ((run.right ? 1 : 0) - (run.left ? 1 : 0)) * 250 * dt
        run.playerX = Math.max(-width * .12, Math.min(width * .4, run.playerX))
        run.distance += run.speed * dt * .035
        const ground = groundY()
        run.vy += 1520 * dt; run.catY += run.vy * dt
        if (ground + run.catY >= ground) { if (run.catY < -.5) run.squash = .8; run.catY = 0; run.vy = 0; run.jumps = 0 }
        run.squash = Math.max(0, run.squash - dt * 2.7)
        const spawnDelay = Math.max(.9, 2.1 - difficulty * .55) * (zoom ? .82 : 1)
        if (run.elapsed - run.lastSpawn >= spawnDelay) spawn()
        if (run.elapsed - run.lastItem >= 1.6 + Math.random() * .7) spawnItem()
        for (const thing of run.things) {
          thing.x -= run.speed * dt
          if (thing.kind === 'falling' && thing.vy !== undefined) { thing.vy += 520 * dt; thing.y += thing.vy * dt }
          if (thing.kind === 'laser') thing.y += Math.sin(run.elapsed * 4 + thing.phase) * 16 * dt
          const playerX = Math.max(38, Math.min(width * .62, width * .22 + run.playerX))
          const catLeft = playerX - 21, catRight = playerX + 26, catTop = ground + run.catY - 55, catBottom = ground + run.catY - 2
          const overlaps = catRight > thing.x + 4 && catLeft < thing.x + thing.w - 4 && catBottom > thing.y + 4 && catTop < thing.y + thing.h - 3
          if (!thing.taken && overlaps) {
            if (ITEM_KINDS.includes(thing.kind as ItemKind)) collect(thing)
            else hit()
          }
        }
        run.things = run.things.filter(thing => !thing.taken && thing.x + thing.w > -50)
        if (time - lastHud > 95) { lastHud = time; state.onHud(hud()) }
      }
      drawScene(ctx, width, height, time / 1000, run, state.running && !run.dead)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); observer.disconnect() }
  }, [])

  return <canvas ref={canvasRef} className="cat-survival-canvas" aria-label="Cat versus Everything side-scrolling survival game" />
})

export default CatSurvivalCanvas
