import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import type { HillLevel, UpgradeId, VehicleId } from '../utils/hillDrive'
import { vehicles } from '../utils/hillDrive'

export type DriveHud = { speed: number; fuel: number; distance: number; coins: number; condition: number; boost: number; air: boolean }
export type DriveResult = { distance: number; coins: number }
export type DriveControls = { accelerate: (active: boolean) => void; brake: (active: boolean) => void; rotateBack: (active: boolean) => void; rotateForward: (active: boolean) => void; jump: () => void }
export type DriveSignals = { speed: number; crash: number; active: boolean; level: number }
export type DriveHandle = DriveControls
type PickupKind = 'coin' | 'fuel' | 'boost' | 'repair'
type Pickup = { x: number; y: number; kind: PickupKind; index: number }
type Sim = { x: number; y: number; vx: number; vy: number; angle: number; angular: number; fuel: number; condition: number; coins: number; boost: number; time: number; dead: boolean; grounded: boolean; collected: Set<number>; controls: { accelerate: boolean; brake: boolean; back: boolean; forward: boolean }; hudAt: number; crash: number }
const makeSim = (): Sim => ({ x: 80, y: 90, vx: 0, vy: 0, angle: 0, angular: 0, fuel: 100, condition: 100, coins: 0, boost: 0, time: 0, dead: false, grounded: true, collected: new Set(), controls: { accelerate: false, brake: false, back: false, forward: false }, hudAt: 0, crash: 0 })

function hash(n: number, seed: number) { const x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return x - Math.floor(x) }
function noise(x: number, seed: number) { const i = Math.floor(x), f = x - i, s = f * f * (3 - 2 * f); return (hash(i, seed) * (1 - s) + hash(i + 1, seed) * s) * 2 - 1 }
function normAngle(value: number) { while (value > Math.PI) value -= Math.PI * 2; while (value < -Math.PI) value += Math.PI * 2; return value }

const HillDriveCanvas = forwardRef<DriveHandle, { running: boolean; runId: number; level: HillLevel; vehicle: VehicleId; upgrades: Record<UpgradeId, number>; onHud: (hud: DriveHud) => void; onGameOver: (result: DriveResult) => void; onCrash: () => void; onSignals: (signals: DriveSignals) => void }>(function HillDriveCanvas({ running, runId, level, vehicle: vehicleId, upgrades, onHud, onGameOver, onCrash, onSignals }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const props = useRef({ running, runId, level, vehicle: vehicleId, upgrades, onHud, onGameOver, onCrash, onSignals })
  props.current = { running, runId, level, vehicle: vehicleId, upgrades, onHud, onGameOver, onCrash, onSignals }
  const simRef = useRef(makeSim())
  const controls = useRef<DriveControls>({ accelerate() {}, brake() {}, rotateBack() {}, rotateForward() {}, jump() {} })
  useImperativeHandle(ref, () => ({ accelerate: active => controls.current.accelerate(active), brake: active => controls.current.brake(active), rotateBack: active => controls.current.rotateBack(active), rotateForward: active => controls.current.rotateForward(active), jump: () => controls.current.jump() }), [])

  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    let width = 1, height = 1, ratio = 1, raf = 0, last = 0, seenRun = props.current.runId, lastHud = 0, crashFlash = 0
    const sim = simRef.current
    const resize = () => { const rect = canvas.getBoundingClientRect(); width = Math.max(1, rect.width); height = Math.max(1, rect.height); ratio = Math.min(window.devicePixelRatio || 1, 2); canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); ctx.setTransform(ratio, 0, 0, ratio, 0, 0) }
    const observer = new ResizeObserver(resize); observer.observe(canvas); resize()
    const terrain = (x: number, currentLevel = props.current.level) => {
      const seed = currentLevel.terrain + 11
      const amplitude = [8, 11, 14, 13, 18, 21, 24][currentLevel.terrain]
      const broad = Math.sin(x * .0018 + seed) * amplitude * .72
      const hills = Math.sin(x * .0046 + seed * 1.7) * amplitude * .3
      const rough = noise(x * .006, seed) * 1.5
      const rampCell = Math.floor(x / 1480), rampCenter = rampCell * 1480 + 690 + hash(rampCell + 9, seed) * 170
      const rampPhase = (x - (rampCenter - 205)) / 410
      const rampShape = rampPhase > 0 && rampPhase < 1 ? Math.sin(rampPhase * Math.PI) ** 2 : 0
      const ramp = rampShape * (22 + currentLevel.terrain * 2.5)
      return 18 + broad + hills + rough + ramp
    }
    const gapSpan = (currentLevel = props.current.level) => 2140 - currentLevel.terrain * 70
    const gapFor = (sector: number, currentLevel = props.current.level) => {
      const span = gapSpan(currentLevel), start = sector * span + 1250 + hash(sector, currentLevel.terrain + 4) * 150
      const width = 125 + currentLevel.terrain * 12 + hash(sector + 3, currentLevel.terrain) * 65
      return { start, width }
    }
    const gapAt = (x: number, currentLevel = props.current.level) => { const sector = Math.floor(x / gapSpan(currentLevel)); const gap = gapFor(sector, currentLevel); return x > gap.start && x < gap.start + gap.width }
    const platform = (sector: number, currentLevel = props.current.level) => {
      const gap = gapFor(sector, currentLevel), w = Math.min(68 + hash(sector + 2, currentLevel.terrain + 1) * 32, gap.width * .68)
      const x = gap.start + (gap.width - w) / 2
      return { x, w, y: terrain(x + w / 2, currentLevel) + 9 + hash(sector + 5, currentLevel.terrain) * 5 }
    }
    const surfaceAt = (x: number, currentLevel = props.current.level, vehicleY?: number, vehicleSpec?: typeof vehicles[number]) => {
      if (gapAt(x, currentLevel)) {
        if (vehicleY !== undefined) {
          const sector = Math.floor(x / gapSpan(currentLevel)), item = platform(sector, currentLevel)
          const wheelClearance = (vehicleSpec?.wheelDrop ?? 0) + (vehicleSpec?.wheelRadius ?? 0)
          if (x >= item.x && x <= item.x + item.w && vehicleY > item.y + wheelClearance) return item.y
        }
        return null
      }
      return terrain(x, currentLevel)
    }
    const pickupAt = (index: number, currentLevel = props.current.level): Pickup | null => {
      const seed = currentLevel.terrain + 112
      if (hash(index, seed) > .76) return null
      const x = 350 + index * 420 + hash(index + 4, seed) * 145
      const roll = hash(index + 19, seed)
      const kind: PickupKind = roll < .61 ? 'coin' : roll < .77 ? 'fuel' : roll < .89 ? 'boost' : 'repair'
      return { x, y: terrain(x, currentLevel) + 58 + hash(index + 31, seed) * 38, kind, index }
    }
    const startingVehicle = vehicles.find(item => item.id === props.current.vehicle) ?? vehicles[0]
    sim.y = terrain(sim.x, props.current.level) + startingVehicle.wheelDrop + startingVehicle.wheelRadius + 2
    sim.grounded = true
    sim.fuel = 100 + props.current.upgrades.fuel * 14
    controls.current = {
      accelerate(active) { sim.controls.accelerate = active }, brake(active) { sim.controls.brake = active }, rotateBack(active) { sim.controls.back = active }, rotateForward(active) { sim.controls.forward = active },
      jump() { if (!props.current.running || !sim.grounded || sim.dead) return; sim.vy = 500; sim.grounded = false },
    }
    const fuelCapacity = () => 100 + props.current.upgrades.fuel * 14
    const getHud = (): DriveHud => ({ speed: Math.abs(sim.vx) * .31, fuel: Math.max(0, Math.min(100, sim.fuel / fuelCapacity() * 100)), distance: Math.floor(sim.x / 10), coins: sim.coins, condition: Math.max(0, sim.condition), boost: Math.max(0, sim.boost), air: !sim.grounded })
    const finish = () => { if (sim.dead) return; sim.dead = true; sim.controls = { accelerate: false, brake: false, back: false, forward: false }; props.current.onHud(getHud()); props.current.onGameOver({ distance: Math.floor(sim.x / 10), coins: sim.coins }) }
    const screenX = (worldX: number, cameraX: number) => worldX - cameraX
    const screenY = (worldY: number, cameraY: number) => height * .72 - (worldY - cameraY)
    const frame = (time: number) => {
      const dt = Math.min((time - (last || time)) / 1000, .034); last = time
      const cfg = props.current
      const vehicle = vehicles.find(item => item.id === cfg.vehicle) ?? vehicles[0]
      if (cfg.runId !== seenRun) { Object.assign(sim, makeSim()); sim.fuel = fuelCapacity(); seenRun = cfg.runId; lastHud = 0; crashFlash = 0; sim.y = terrain(sim.x, cfg.level) + vehicle.wheelDrop + vehicle.wheelRadius + 2; sim.grounded = true }
      const levelNow = cfg.level, upgradesNow = cfg.upgrades
      if (cfg.running && !sim.dead) {
        sim.time += dt
        const mass = vehicle.weight * Math.max(.72, 1 - upgradesNow.engine * .055)
        const engine = vehicle.engine + upgradesNow.engine * 42
        const accelerating = sim.controls.accelerate
        if (accelerating) sim.vx += engine / mass * Math.min(1.5, vehicle.grip + upgradesNow.tires * .12) * dt
        if (sim.controls.brake) { if (sim.vx > 12) sim.vx -= 680 * dt; else sim.vx -= engine * .52 / mass * dt }
        const maxSpeed = 580 + upgradesNow.engine * 35 + (sim.boost > 0 ? 270 : 0)
        sim.vx = Math.max(-105, Math.min(maxSpeed, sim.vx))
        sim.vx *= Math.max(.88, 1 - dt * (accelerating ? 0.12 : 1.1))
        sim.x += sim.vx * dt
        if (sim.x < 20) { sim.x = 20; sim.vx = Math.max(0, sim.vx) }
        sim.vy -= 850 * dt
        sim.y += sim.vy * dt
        const rotationInput = (sim.controls.forward ? 1 : 0) - (sim.controls.back ? 1 : 0)
        const wb = vehicle.wheelbase
        const leftX = sim.x - Math.cos(sim.angle) * wb / 2, rightX = sim.x + Math.cos(sim.angle) * wb / 2
        const leftY = sim.y - Math.sin(sim.angle) * wb / 2 - vehicle.wheelDrop * Math.cos(sim.angle), rightY = sim.y + Math.sin(sim.angle) * wb / 2 - vehicle.wheelDrop * Math.cos(sim.angle)
        const floorL = surfaceAt(leftX, levelNow, sim.y, vehicle), floorR = surfaceAt(rightX, levelNow, sim.y, vehicle)
        const contacts = [floorL === null ? 0 : leftY - vehicle.wheelRadius < floorL ? 1 : 0, floorR === null ? 0 : rightY - vehicle.wheelRadius < floorR ? 1 : 0]
        const grounded = contacts[0] + contacts[1] > 0
        sim.grounded = grounded
        sim.angular += rotationInput * (grounded ? 2.6 : 5.4) * dt
        if (floorL !== null && floorR !== null && grounded) {
          const slope = Math.atan2(floorR - floorL, wb)
          sim.angular += normAngle(slope - sim.angle) * (grounded ? 3.1 : .45) * dt
        }
        sim.angular *= Math.max(.86, 1 - dt * (grounded ? 3.2 + upgradesNow.stability * .42 : 1.1))
        sim.angle = normAngle(sim.angle + sim.angular * dt)
        if (grounded) {
          const penetrationL = floorL === null ? 0 : floorL + vehicle.wheelRadius - leftY, penetrationR = floorR === null ? 0 : floorR + vehicle.wheelRadius - rightY
          const penetration = Math.max(penetrationL, penetrationR, 0)
          if (penetration > 0) { sim.y += penetration; const impact = -sim.vy; if (impact > 210) { const damage = Math.min(42, Math.max(5, (impact - 175) * .075)); sim.condition -= damage; sim.crash += 1; crashFlash = .36; cfg.onCrash() } if (sim.vy < 0) sim.vy = Math.max(0, -sim.vy * Math.min(.11, .025 + upgradesNow.suspension * .014)) }
        }
        sim.vx *= Math.max(.94, 1 - dt * (sim.boost > 0 ? .04 : .12))
        if (accelerating) sim.fuel -= dt * (.36 + Math.abs(sim.vx) * .00055) / (1 + upgradesNow.fuel * .13)
        else sim.fuel -= dt * .075 / (1 + upgradesNow.fuel * .13)
        sim.boost = Math.max(0, sim.boost - dt)
        const overGap = gapAt(sim.x, levelNow)
        const fell = overGap ? sim.y < terrain(sim.x, levelNow) - 55 : sim.y < terrain(sim.x, levelNow) - 145
        const flipped = grounded && Math.abs(sim.angle) > 2.3
        if (fell || flipped) { sim.crash += 1; crashFlash = .5; cfg.onCrash(); finish() }
        else if (sim.condition <= 0 || sim.fuel <= 0) finish()

        const firstPickup = Math.max(0, Math.floor((sim.x - 500) / 420) - 1), lastPickup = Math.floor((sim.x + width + 500) / 420) + 1
        for (let index = firstPickup; !sim.dead && index <= lastPickup; index += 1) {
          if (sim.collected.has(index)) continue
          const pickup = pickupAt(index, levelNow)
          if (pickup && Math.abs(pickup.x - sim.x) < 42 && Math.abs(pickup.y - sim.y) < 66) {
            sim.collected.add(index)
            if (pickup.kind === 'coin') sim.coins += 1
            if (pickup.kind === 'fuel') sim.fuel = Math.min(fuelCapacity(), sim.fuel + 32)
            if (pickup.kind === 'boost') sim.boost = 4.5
            if (pickup.kind === 'repair') sim.condition = Math.min(100, sim.condition + 28)
          }
        }
        if (time - lastHud > 80) { lastHud = time; cfg.onHud(getHud()); cfg.onSignals({ speed: Math.abs(sim.vx), crash: sim.crash, active: true, level: levelNow.terrain }) }
      } else if (time - lastHud > 160) { lastHud = time; cfg.onSignals({ speed: Math.abs(sim.vx), crash: sim.crash, active: false, level: cfg.level.terrain }) }

      crashFlash = Math.max(0, crashFlash - dt)
      const camX = Math.max(0, sim.x - width * .27), camY = sim.y - height * .16
      ctx.clearRect(0, 0, width, height)
      const tint = ctx.createLinearGradient(0, 0, 0, height); tint.addColorStop(0, 'rgba(25,22,31,.04)'); tint.addColorStop(.67, 'rgba(28,24,31,.06)'); tint.addColorStop(1, 'rgba(23,20,27,.36)'); ctx.fillStyle = tint; ctx.fillRect(0, 0, width, height)
      if (crashFlash > 0) { ctx.fillStyle = 'rgba(245,104,105,0.12)'; ctx.fillRect(0, 0, width, height) }
      const floorColor = levelNow.theme === 'moon' ? '#554f62' : levelNow.theme === 'void' ? '#393341' : '#6b554d'
      const terrainSegments: Array<Array<[number, number]>> = []
      let segment: Array<[number, number]> = []
      for (let sx = -12; sx <= width + 15; sx += 6) {
        const ty = gapAt(camX + sx, levelNow) ? null : terrain(camX + sx, levelNow)
        if (ty === null) { if (segment.length) terrainSegments.push(segment); segment = []; continue }
        segment.push([sx, screenY(ty, camY)])
      }
      if (segment.length) terrainSegments.push(segment)
      ctx.fillStyle = floorColor
      for (const points of terrainSegments) { ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]); points.slice(1).forEach(([x,y]) => ctx.lineTo(x,y)); ctx.lineTo(points[points.length-1][0],height+5); ctx.lineTo(points[0][0],height+5); ctx.closePath(); ctx.fill() }
      ctx.strokeStyle = levelNow.theme === 'moon' ? '#a59cbe' : '#d3a17e'; ctx.lineWidth = 3
      for (const points of terrainSegments) { ctx.beginPath(); ctx.moveTo(points[0][0],points[0][1]); points.slice(1).forEach(([x,y]) => ctx.lineTo(x,y)); ctx.stroke() }
      for (let sector = Math.floor((camX - 850) / gapSpan(levelNow)); sector < Math.ceil((camX + width + 850) / gapSpan(levelNow)); sector += 1) { const p = platform(sector, levelNow); const px = screenX(p.x, camX), py = screenY(p.y, camY); if (px > -150 && px < width + 150) { ctx.fillStyle = '#4d4449'; ctx.fillRect(px + 2, py + 7, p.w - 4, 9); ctx.fillStyle = '#b38b70'; ctx.beginPath(); ctx.roundRect(px, py, p.w, 8, 3); ctx.fill(); ctx.strokeStyle = '#e2b18a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px + 4, py + 1); ctx.lineTo(px + p.w - 4, py + 1); ctx.stroke() } }
      const itemFirst = Math.max(0, Math.floor((camX - 500) / 420) - 1), itemLast = Math.floor((camX + width + 500) / 420) + 1
      for (let i = itemFirst; i <= itemLast; i += 1) { if (sim.collected.has(i)) continue; const item = pickupAt(i, levelNow); if (!item) continue; const x = screenX(item.x, camX), y = screenY(item.y, camY) + Math.sin(time * .003 + i) * 3; drawPickup(ctx, x, y, item.kind, time / 1000) }
      drawVehicle(ctx, screenX(sim.x, camX), screenY(sim.y, camY), sim.angle, vehicleId, vehicle.color, sim.time, sim.boost > 0, crashFlash)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); observer.disconnect() }
  }, [])

  return <canvas ref={canvasRef} className="hill-drive-canvas" aria-label="Physics driving game. Accelerate, brake, rotate and collect coins." />
})

function drawPickup(ctx: CanvasRenderingContext2D, x: number, y: number, kind: PickupKind, time: number) {
  ctx.save(); ctx.translate(x, y); ctx.shadowBlur = 16; ctx.shadowColor = kind === 'coin' ? '#f7d071' : kind === 'fuel' ? '#8fd6ad' : kind === 'boost' ? '#e79d77' : '#c4a4e5'
  if (kind === 'coin') { ctx.fillStyle = '#e8bc61'; ctx.beginPath(); ctx.ellipse(0, 0, 10, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff0af'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#9f703c'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center'; ctx.fillText('$', 0, 4) }
  if (kind === 'fuel') { ctx.fillStyle = '#75b98c'; ctx.beginPath(); ctx.roundRect(-9, -12, 18, 25, 4); ctx.fill(); ctx.fillStyle = '#d8f0c9'; ctx.fillRect(-4, -16, 9, 5); ctx.fillRect(-5, -4, 10, 8) }
  if (kind === 'boost') { ctx.fillStyle = '#df9270'; ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(10, 1); ctx.lineTo(3, 1); ctx.lineTo(7, 12); ctx.lineTo(-8, -3); ctx.lineTo(-1, -3); ctx.closePath(); ctx.fill() }
  if (kind === 'repair') { ctx.fillStyle = '#b99ad0'; ctx.beginPath(); ctx.roundRect(-12, -9, 24, 19, 4); ctx.fill(); ctx.fillStyle = '#fff0ec'; ctx.fillRect(-2, -6, 4, 13); ctx.fillRect(-7, -1, 14, 4) }
  ctx.globalAlpha = .72 + Math.sin(time * 5) * .2; ctx.restore()
}

function drawVehicle(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, id: VehicleId, color: string, time: number, boost: boolean, crash: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(-angle)
  if (boost) { ctx.shadowColor = '#ffb774'; ctx.shadowBlur = 23 }
  const base = color, dark = '#302a32', spin = time * 12
  const vehicle = vehicles.find(item => item.id === id) ?? vehicles[0]
  const wheelbase = vehicle.wheelbase
  const wheelRadius = vehicle.wheelRadius
  const wheelY = vehicle.wheelDrop
  const wheelXs = id === 'cart' || id === 'office-chair' ? [-wheelbase / 2, -wheelbase / 2 + 7, wheelbase / 2 - 7, wheelbase / 2] : [-wheelbase / 2, wheelbase / 2]
  for (const wheelX of wheelXs) {
    ctx.fillStyle = '#242229'; ctx.beginPath(); ctx.arc(wheelX, wheelY, wheelRadius, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = id === 'scooter' ? '#dbd0bd' : '#b9a28b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(wheelX, wheelY, wheelRadius * .55, spin, spin + Math.PI * 1.55); ctx.stroke()
    ctx.fillStyle = '#e5d4bc'; ctx.beginPath(); ctx.arc(wheelX, wheelY, 1.5, 0, Math.PI * 2); ctx.fill()
  }
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'
  if (id === 'tiny-car') {
    // A compact hatchback with its own cabin, glass, lamps and bumpers.
    ctx.fillStyle = dark; ctx.beginPath(); ctx.roundRect(-37, 4, 75, 9, 4); ctx.fill()
    ctx.fillStyle = base; ctx.strokeStyle = 'rgba(255,239,218,.78)'; ctx.lineWidth = 1.8
    ctx.beginPath(); ctx.moveTo(-35, 2); ctx.lineTo(-32, -14); ctx.quadraticCurveTo(-30, -20, -21, -20); ctx.lineTo(-9, -37); ctx.quadraticCurveTo(-6, -41, 2, -41); ctx.lineTo(17, -39); ctx.quadraticCurveTo(23, -37, 27, -28); ctx.lineTo(34, -21); ctx.quadraticCurveTo(39, -17, 39, -7); ctx.lineTo(36, 2); ctx.closePath(); ctx.fill(); ctx.stroke()
    ctx.fillStyle = '#bdd0ce'; ctx.beginPath(); ctx.moveTo(-16, -34); ctx.lineTo(-7, -34); ctx.lineTo(-7, -23); ctx.lineTo(-26, -23); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(-2, -34); ctx.lineTo(14, -33); ctx.quadraticCurveTo(19, -31, 22, -23); ctx.lineTo(-2, -23); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#f5dbad'; ctx.beginPath(); ctx.ellipse(34, -10, 3, 4, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#9f5d55'; ctx.fillRect(-34, -10, 4, 5); ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(-31, 2, 61, 2)
    ctx.strokeStyle = 'rgba(50,37,42,.75)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-4, -34); ctx.lineTo(-4, -21); ctx.moveTo(23, -23); ctx.lineTo(27, -20); ctx.stroke()
  } else if (id === 'cart') {
    ctx.strokeStyle = '#d6d0c4'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-31,-30); ctx.lineTo(28,-30); ctx.lineTo(18,-3); ctx.lineTo(-21,-3); ctx.closePath(); ctx.stroke()
    ctx.strokeStyle = '#b6ada0'; ctx.lineWidth = 1.4; for(let i=-20;i<=18;i+=9){ctx.beginPath();ctx.moveTo(i,-28);ctx.lineTo(i*.72,-5);ctx.stroke()} ctx.beginPath();ctx.moveTo(-28,-22);ctx.lineTo(25,-22);ctx.stroke()
    ctx.strokeStyle = '#ddd2be'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(28,-30); ctx.lineTo(37,-42); ctx.lineTo(42,-41); ctx.stroke()
    ctx.fillStyle = '#db8b73'; ctx.beginPath(); ctx.arc(-10,-20,4,0,7); ctx.fill(); ctx.fillStyle = '#d9bb74'; ctx.beginPath(); ctx.arc(5,-17,4,0,7); ctx.fill()
  } else if (id === 'scooter') {
    ctx.fillStyle = base; ctx.beginPath(); ctx.roundRect(-29,-12,51,8,4); ctx.fill()
    ctx.strokeStyle = base; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(16,-9); ctx.lineTo(19,-47); ctx.stroke()
    ctx.strokeStyle = '#e5d5c3'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(9,-47); ctx.lineTo(30,-47); ctx.stroke()
    ctx.fillStyle = '#4c3e44'; ctx.beginPath(); ctx.roundRect(-8,-17,15,5,2); ctx.fill()
    ctx.fillStyle = '#f2d6a6'; ctx.beginPath(); ctx.arc(18,-9,2.2,0,7); ctx.fill()
  } else if (id === 'skateboard') {
    ctx.fillStyle = '#25232b'; ctx.beginPath(); ctx.roundRect(-36,1,72,8,5); ctx.fill()
    ctx.fillStyle = base; ctx.beginPath(); ctx.roundRect(-33,-1,66,5,4); ctx.fill()
    ctx.fillStyle = '#f3d5ad'; ctx.beginPath(); ctx.moveTo(-9,0); ctx.lineTo(0,-5); ctx.lineTo(9,0); ctx.lineTo(0,4); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = '#aeb0ad'; ctx.lineWidth = 2; for(const ax of [-22,22]){ctx.beginPath();ctx.moveTo(ax,7);ctx.lineTo(ax,12);ctx.stroke()}
  } else if (id === 'office-chair') {
    ctx.fillStyle = dark; ctx.beginPath(); ctx.roundRect(-17,-43,34,38,9); ctx.fill(); ctx.strokeStyle = '#a7b4c1'; ctx.lineWidth = 1.6; ctx.stroke()
    ctx.fillStyle = base; ctx.beginPath(); ctx.roundRect(-24,-12,48,13,6); ctx.fill(); ctx.strokeStyle = 'rgba(235,235,245,.62)'; ctx.stroke()
    ctx.strokeStyle = '#b7a9a0'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,12); ctx.moveTo(0,11); ctx.lineTo(-21,18); ctx.moveTo(0,11); ctx.lineTo(21,18); ctx.moveTo(0,11); ctx.lineTo(-14,23); ctx.moveTo(0,11); ctx.lineTo(14,23); ctx.stroke()
    ctx.fillStyle = '#e1d0be'; for(const ax of [-21,21,-14,14]){ctx.beginPath();ctx.arc(ax,18+(Math.abs(ax)>17?0:5),2.2,0,7);ctx.fill()}
  } else {
    ctx.fillStyle = '#29242c'; ctx.beginPath(); ctx.roundRect(-25,-39,50,47,8); ctx.fill()
    ctx.fillStyle = base; ctx.strokeStyle = 'rgba(255,239,218,.72)'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.roundRect(-23,-42,46,44,7); ctx.fill(); ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(-15,-36,4,32); ctx.fillRect(11,-36,4,32)
    ctx.strokeStyle = '#ead4b4'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-8,-42); ctx.lineTo(-8,-52); ctx.quadraticCurveTo(0,-61,8,-52); ctx.lineTo(8,-42); ctx.stroke()
    ctx.fillStyle = '#f0c890'; ctx.beginPath(); ctx.arc(0,-19,7,0,7); ctx.fill(); ctx.fillStyle = '#765467'; ctx.font = 'bold 7px system-ui'; ctx.textAlign = 'center'; ctx.fillText('VACAY',0,-17)
  }
  if (boost) { ctx.fillStyle = '#ffa96e'; ctx.shadowColor = '#ffad70'; ctx.shadowBlur = 15; ctx.beginPath(); ctx.moveTo(-39,-5); ctx.lineTo(-56,-1); ctx.lineTo(-39,4); ctx.fill(); ctx.shadowBlur = 0 }
  if (crash > 0) { ctx.strokeStyle = 'rgba(255,235,180,.9)'; ctx.lineWidth = 2; for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(0,-53);ctx.lineTo((i-1)*12,-62-(i%2)*5);ctx.stroke()} }
  ctx.restore()
}

export default HillDriveCanvas
