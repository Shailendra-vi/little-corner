import { useEffect, useRef } from 'react'
import type { WebGLRenderer } from 'three'

type RoomSignals = { jump: number; hit: number; zoomies: boolean; gameOver: boolean }
type Runtime = Pick<typeof import('three'), 'WebGLRenderer' | 'Scene' | 'OrthographicCamera' | 'Group' | 'Mesh' | 'BoxGeometry' | 'SphereGeometry' | 'CylinderGeometry' | 'ConeGeometry' | 'TorusGeometry' | 'MeshStandardMaterial' | 'MeshBasicMaterial' | 'AmbientLight' | 'PointLight' | 'Clock'>
type Dust = { mesh: InstanceType<Runtime['Mesh']>; x: number; y: number; phase: number; speed: number }

function mount(host: HTMLDivElement, THREE: Runtime, signals: { current: RoomSignals }) {
  let renderer: WebGLRenderer
  try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }) } catch { return () => undefined }
  const scene = new THREE.Scene()
  const aspect = host.clientWidth / Math.max(host.clientHeight, 1)
  const height = 13
  let width = height * aspect
  const camera = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, .1, 80)
  camera.position.set(0, 0, 20)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
  renderer.setClearColor(0, 0)
  renderer.domElement.className = 'ambience-canvas'
  renderer.domElement.setAttribute('aria-hidden', 'true')
  host.appendChild(renderer.domElement)

  const materials: Array<InstanceType<Runtime['MeshStandardMaterial']> | InstanceType<Runtime['MeshBasicMaterial']>> = []
  const material = (color: number, roughness = .8, emissive = 0) => { const m = new THREE.MeshStandardMaterial({ color, roughness, emissive, emissiveIntensity: emissive ? .28 : 0 }); materials.push(m); return m }
  const basic = (color: number, opacity = 1) => { const m = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity }); materials.push(m); return m }
  const box = (parent: InstanceType<Runtime['Group']> | InstanceType<Runtime['Scene']>, size: [number, number, number], color: number, x: number, y: number, z: number, roughness = .8) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material(color, roughness)); mesh.position.set(x, y, z); parent.add(mesh); return mesh }
  const room = new THREE.Group(); scene.add(room)
  box(room, [Math.max(width * 1.5, 28), 15, .6], 0x342d3b, 0, 1.4, -7)
  box(room, [Math.max(width * 1.5, 28), 3, 13], 0x4b3c45, 0, -6.4, -3)
  box(room, [Math.max(width * 1.5, 28), .08, 13], 0x9b7766, 0, -4.89, -2.95)

  // Window, moonlit skyline and softly animated curtains.
  const windowGroup = new THREE.Group(); windowGroup.position.set(-width * .28, 2.5, -2); scene.add(windowGroup)
  box(windowGroup, [6.2, 4.45, .28], 0x805c5c, 0, 0, 0)
  box(windowGroup, [5.75, 4.02, .18], 0x191f32, 0, 0, .19)
  box(windowGroup, [5.65, .075, .12], 0x9f7c68, 0, -.15, .3)
  box(windowGroup, [.09, 3.95, .12], 0xb18c70, 0, 0, .31)
  box(windowGroup, [5.7, .08, .12], 0xb18c70, 0, 0, .31)
  const moon = new THREE.Mesh(new THREE.SphereGeometry(.62, 24, 18), basic(0xf3d7a5)); moon.position.set(1.65, 1.25, -.1); windowGroup.add(moon)
  const moonHalo = new THREE.Mesh(new THREE.SphereGeometry(.9, 22, 14), basic(0xe8b975, .095)); moonHalo.position.copy(moon.position); windowGroup.add(moonHalo)
  for (let i = 0; i < 15; i += 1) {
    const bW = .42 + i % 3 * .25, bH = .7 + (i * 7 % 11) * .19
    const building = new THREE.Mesh(new THREE.BoxGeometry(bW, bH, .12), basic(i % 2 ? 0x30354a : 0x252c40))
    building.position.set(-2.45 + (i % 8) * .72, -1.92 + bH / 2, -.05 - Math.floor(i / 8) * .1); windowGroup.add(building)
    for (let row = 0; row < Math.floor(bH * 2); row += 1) { const lamp = new THREE.Mesh(new THREE.SphereGeometry(.025, 5, 4), basic(i % 3 ? 0xf2bd76 : 0x9eafd4)); lamp.position.set(building.position.x + (row % 2 ? .11 : -.11), -1.85 + row * .17, .04); windowGroup.add(lamp) }
  }
  const curtains: InstanceType<Runtime['Group']>[] = []
  for (const side of [-1, 1]) { const curtain = new THREE.Group(); curtain.position.set(side * 2.82, 0, .5); const panel = new THREE.Mesh(new THREE.BoxGeometry(.72, 4.55, .18), material(side < 0 ? 0x825966 : 0x76515f)); panel.position.x = -side * .2; curtain.add(panel); for (let pleat = 0; pleat < 4; pleat += 1) { const fold = new THREE.Mesh(new THREE.BoxGeometry(.08, 4.5, .22), material(0x9c6e73)); fold.position.set(-side * .46 + pleat * .16, 0, .13); curtain.add(fold) } windowGroup.add(curtain); curtains.push(curtain) }
  box(windowGroup, [6.55, .26, .65], 0x9a7665, 0, -2.29, .48)

  // Bed and furniture are modeled as layered 3D blocks with warm fabric detail.
  const bed = new THREE.Group(); bed.position.set(.4, -3.2, 1.3); scene.add(bed)
  box(bed, [7.8, .7, 3.3], 0x513944, 0, -.64, 0)
  box(bed, [7.5, .52, 3.12], 0xd2b5a4, 0, -.22, 0)
  box(bed, [7.65, .22, 3.28], 0x87677b, 0, .12, 0)
  box(bed, [7.5, 1.05, .35], 0x614753, 0, .34, -1.42)
  box(bed, [1.7, .36, 1.04], 0xe4d1bc, -2.2, .1, .55)
  box(bed, [1.7, .36, 1.04], 0xcab8cc, -.25, .1, .55)
  const blanket = new THREE.Mesh(new THREE.BoxGeometry(3.6, .17, 2.3), material(0x725568)); blanket.position.set(1.55, .21, -.25); bed.add(blanket)
  for (const x of [-3.35, 3.35]) for (const z of [-1.15, 1.15]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(.1, .13, .7, 8), material(0x76594b)); leg.position.set(x, -1.12, z); bed.add(leg) }
  const table = new THREE.Group(); table.position.set(width * .36, -3.65, .6); scene.add(table)
  box(table, [2.25, .25, 1.55], 0x76584f, 0, -.25, 0)
  box(table, [1.85, .95, 1.3], 0x5e4747, 0, -.83, 0)
  for (const x of [-.75, .75]) box(table, [.16, 1.45, .18], 0x795b4f, x, -.9, 0)
  const lamp = new THREE.Group(); lamp.position.set(-.12, -.05, .1); table.add(lamp)
  const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(.07, .12, .64, 9), material(0xb18a65)); lampStem.position.y = .42; lamp.add(lampStem)
  const shade = new THREE.Mesh(new THREE.ConeGeometry(.51, .62, 12), material(0xd4a875, .65, 0xf3b972)); shade.position.y = .95; lamp.add(shade)
  const glow = new THREE.PointLight(0xe9ac76, 7, 8); glow.position.set(0, .85, 1.25); scene.add(glow)
  // A dresser, books and plant add detail in the room corners.
  const dresser = new THREE.Group(); dresser.position.set(-width * .42, -3.82, -1); scene.add(dresser)
  box(dresser, [2.65, 1.55, 1.45], 0x624d52, 0, 0, 0)
  for (const y of [-.44, .05, .54]) { box(dresser, [2.22, .035, .05], 0xaa8169, 0, y, .76); const knob = new THREE.Mesh(new THREE.SphereGeometry(.065, 8, 7), material(0xc5a174)); knob.position.set(0, y - .2, .82); dresser.add(knob) }
  const plantPot = new THREE.Mesh(new THREE.CylinderGeometry(.28, .34, .44, 10), material(0xb5786b)); plantPot.position.set(0, .99, 0); dresser.add(plantPot)
  for (let i = 0; i < 5; i += 1) { const leaf = new THREE.Mesh(new THREE.SphereGeometry(.2, 9, 7), material(0x70836b)); leaf.scale.set(.6, 1.8, .55); leaf.position.set(Math.cos(i * 1.25) * .24, 1.38 + (i % 2) * .18, Math.sin(i * 1.25) * .13); dresser.add(leaf) }
  const toyColors = [0xe4ad7a, 0xc39ad2, 0xc99c7b]
  const toys: Array<{ group: InstanceType<Runtime['Group']>; phase: number; speed: number }> = []
  for (let i = 0; i < 4; i += 1) { const toy = new THREE.Group(); const ball = new THREE.Mesh(new THREE.SphereGeometry(.26, 14, 10), material(toyColors[i % toyColors.length], .42)); toy.add(ball); if (i % 2 === 0) { const ring = new THREE.Mesh(new THREE.TorusGeometry(.4, .045, 8, 24), material(0xd8b7a1, .35, 0x553e38)); toy.add(ring) } toy.position.set(-width * .34 + i * width * .22, -1 + (i % 2) * 1.2, 1.4); scene.add(toy); toys.push({ group: toy, phase: i * 1.7, speed: .3 + i * .06 }) }

  const dust: Dust[] = []
  for (let i = 0; i < 36; i += 1) { const mote = new THREE.Mesh(new THREE.SphereGeometry(.025 + Math.random() * .028, 6, 5), basic(0xffd9ad, .42)); const x = (Math.random() - .5) * width * 1.45, y = (Math.random() - .5) * 9; mote.position.set(x, y, 2 + Math.random() * 3); scene.add(mote); dust.push({ mesh: mote, x, y, phase: Math.random() * Math.PI * 2, speed: .12 + Math.random() * .35 }) }
  const ambient = new THREE.AmbientLight(0xb8a6c3, 1.1); scene.add(ambient)
  const moonLight = new THREE.PointLight(0x9caddd, 15, 28); moonLight.position.set(-5, 5, 4); scene.add(moonLight)

  let pointerX = 0, pointerY = 0, seenJump = signals.current.jump, seenHit = signals.current.hit, seenOver = signals.current.gameOver
  let hitFlash = 0, jumpPulse = 0, endFade = 0
  const pointerMove = (event: PointerEvent) => { const rect = host.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return; pointerX = ((event.clientX - rect.left) / rect.width - .5) * 2; pointerY = ((event.clientY - rect.top) / rect.height - .5) * 2 }
  window.addEventListener('pointermove', pointerMove, { passive: true })
  const resize = () => { const w = Math.max(host.clientWidth, 1), h = Math.max(host.clientHeight, 1); width = height * w / h; camera.left = -width / 2; camera.right = width / 2; camera.updateProjectionMatrix(); renderer.setSize(w, h, false) }
  resize(); const observer = new ResizeObserver(resize); observer.observe(host)
  const clock = new THREE.Clock(); let raf = 0
  const render = () => {
    const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime, signal = signals.current
    camera.position.x += (pointerX * .62 - camera.position.x) * Math.min(1, dt * .8)
    camera.position.y += (pointerY * .34 - camera.position.y) * Math.min(1, dt * .9)
    if (signal.jump !== seenJump) { seenJump = signal.jump; jumpPulse = .38 }
    if (signal.hit !== seenHit) { seenHit = signal.hit; hitFlash = .5 }
    if (signal.gameOver && !seenOver) { seenOver = true; endFade = 1 }
    jumpPulse = Math.max(0, jumpPulse - dt); hitFlash = Math.max(0, hitFlash - dt * 1.8); endFade = Math.max(0, endFade - dt * .16)
    const zoomRate = signal.zoomies ? 2.5 : 1
    curtains.forEach((curtain, i) => { curtain.rotation.y = Math.sin(t * .48 + i * Math.PI) * .075 + pointerX * .012 })
    toys.forEach(({ group, phase, speed }) => { group.rotation.x = Math.sin(t * speed + phase) * .16; group.rotation.y = Math.cos(t * speed * .8 + phase) * .19; group.position.y += (Math.sin(t * speed * zoomRate + phase) * .09 - (group.position.y - (-1 + (Math.floor(phase / 1.7) % 2) * 1.2))) * Math.min(1, dt) })
    dust.forEach(({ mesh, x, y, phase, speed }) => { mesh.position.x = x + Math.sin(t * speed * zoomRate + phase) * .13 + Math.sin(t * .15 * zoomRate) * .08; mesh.position.y = y + Math.sin(t * speed * zoomRate + phase * 2) * .17; (mesh.material as InstanceType<Runtime['MeshBasicMaterial']>).opacity = .22 + (Math.sin(t + phase) + 1) * .18 })
    moonLight.intensity = 15 + jumpPulse * 16 + (signal.zoomies ? 5 : 0)
    glow.intensity = 7 + jumpPulse * 2
    if (hitFlash > 0) { camera.position.x += Math.sin(t * 75) * hitFlash * .22; camera.position.y += Math.cos(t * 83) * hitFlash * .16; ambient.color.setHex(0xe9a19a) } else if (signal.gameOver) ambient.color.setHex(0x956f8c); else ambient.color.setHex(0xb8a6c3)
    if (endFade > 0) moonLight.intensity += endFade * 7
    renderer.render(scene, camera); raf = requestAnimationFrame(render)
  }
  render()
  return () => { cancelAnimationFrame(raf); observer.disconnect(); window.removeEventListener('pointermove', pointerMove); renderer.dispose(); renderer.domElement.remove(); scene.traverse(object => { if (object instanceof THREE.Mesh) object.geometry.dispose() }); materials.forEach(m => m.dispose()) }
}

export default function CatBedroom({ signals }: { signals: RoomSignals }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const signalsRef = useRef(signals); signalsRef.current = signals
  useEffect(() => { let cancelled = false, cleanup: (() => void) | undefined; void import('three').then(module => { if (cancelled || !hostRef.current) return; const { WebGLRenderer, Scene, OrthographicCamera, Group, Mesh, BoxGeometry, SphereGeometry, CylinderGeometry, ConeGeometry, TorusGeometry, MeshStandardMaterial, MeshBasicMaterial, AmbientLight, PointLight, Clock } = module; cleanup = mount(hostRef.current, { WebGLRenderer, Scene, OrthographicCamera, Group, Mesh, BoxGeometry, SphereGeometry, CylinderGeometry, ConeGeometry, TorusGeometry, MeshStandardMaterial, MeshBasicMaterial, AmbientLight, PointLight, Clock }, signalsRef) }).catch(() => undefined); return () => { cancelled = true; cleanup?.() } }, [])
  return <div ref={hostRef} className="page-ambience cat-bedroom" aria-hidden="true" />
}
