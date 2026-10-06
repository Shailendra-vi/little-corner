import { useEffect, useRef } from 'react'
import type { WebGLRenderer } from 'three'

export type AmbienceKind = 'balloons' | 'fireworks' | 'cosmos'

type ThreeRuntime = Pick<typeof import('three'),
  | 'WebGLRenderer' | 'Scene' | 'OrthographicCamera' | 'Group' | 'Mesh' | 'SphereGeometry'
  | 'ConeGeometry' | 'CylinderGeometry' | 'BoxGeometry' | 'CircleGeometry' | 'TorusGeometry'
  | 'MeshStandardMaterial' | 'MeshBasicMaterial' | 'AmbientLight' | 'PointLight' | 'Vector2'
  | 'Vector3' | 'Raycaster' | 'Clock' | 'AdditiveBlending' | 'MathUtils'
>

type Balloon = { group: InstanceType<ThreeRuntime['Group']>; hit: InstanceType<ThreeRuntime['Mesh']>; baseX: number; baseY: number; phase: number; popped: boolean; dragging: boolean; dragX: number; dragY: number }
type Particle = { mesh: InstanceType<ThreeRuntime['Mesh']>; velocity: InstanceType<ThreeRuntime['Vector3']>; life: number; initialLife: number; material: InstanceType<ThreeRuntime['MeshBasicMaterial']> }
type Rocket = { mesh: InstanceType<ThreeRuntime['Mesh']>; from: InstanceType<ThreeRuntime['Vector3']>; to: InstanceType<ThreeRuntime['Vector3']>; elapsed: number; material: InstanceType<ThreeRuntime['MeshStandardMaterial']> }
type DiyaFlame = { mesh: InstanceType<ThreeRuntime['Mesh']>; phase: number }
type ChildMotion = { body: InstanceType<ThreeRuntime['Group']>; arm: InstanceType<ThreeRuntime['Group']>; spark: InstanceType<ThreeRuntime['Mesh']>; phase: number }

const balloonColors = [0xe9a0b1, 0xc5a5df, 0xf0c28d, 0xd9867f, 0xa4bfd6]
const fireworkColors = [0xff4e54, 0xffa14e, 0xc99bff, 0xffdf75, 0x76e2ce, 0xff75b7]
const cosmicColors = [0xffd887, 0xe49bff, 0x82dcff, 0xff8496]

function mountAmbience(host: HTMLDivElement, kind: AmbienceKind, THREE: ThreeRuntime) {
  let renderer: WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
  } catch {
    return () => undefined
  }

  const scene = new THREE.Scene()
  const viewHeight = 12
  let viewWidth = viewHeight * host.clientWidth / Math.max(host.clientHeight, 1)
  const camera = new THREE.OrthographicCamera(-viewWidth / 2, viewWidth / 2, viewHeight / 2, -viewHeight / 2, .1, 80)
  camera.position.set(0, 0, 20)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.setClearColor(0, 0)
  renderer.domElement.className = 'ambience-canvas'
  renderer.domElement.setAttribute('aria-hidden', 'true')
  host.appendChild(renderer.domElement)

  const ambienceColors = kind === 'balloons' ? [0xbda1da, 0xe8837b, 0xf0bb82] : kind === 'fireworks' ? [0xe69183, 0xd8a0de, 0xf4c276] : [0xb895e5, 0x83cce7, 0xf1a1b4]
  scene.add(new THREE.AmbientLight(0xffe8ed, 1.2))
  const light = new THREE.PointLight(ambienceColors[0], 24, 40)
  light.position.set(-3, 4, 8)
  scene.add(light)

  const balloonGeometry = new THREE.SphereGeometry(.39, 24, 18)
  const neckGeometry = new THREE.ConeGeometry(.085, .18, 8)
  const stringGeometry = new THREE.CylinderGeometry(.006, .006, .52, 5)
  const hitGeometry = new THREE.SphereGeometry(.5, 12, 10)
  const highlightGeometry = new THREE.SphereGeometry(.07, 8, 6)
  const particleGeometry = new THREE.SphereGeometry(.055, 8, 6)
  const rocketGeometry = new THREE.ConeGeometry(.07, .24, 7)
  const sharedMaterials: Array<{ dispose: () => void }> = []
  const balloons: Balloon[] = []
  const particles: Particle[] = []
  const rockets: Rocket[] = []
  const diyaFlames: DiyaFlame[] = []
  const children: ChildMotion[] = []
  const clickableObjects: InstanceType<ThreeRuntime['Mesh']>[] = []
  const replacementTimers: number[] = []
  let disposed = false
  let audioContext: AudioContext | null = null
  let draggedBalloon: Balloon | null = null
  let dragPointerId: number | null = null
  let dragOffsetX = 0
  let dragOffsetY = 0
  let dragStartClientX = 0
  let dragStartClientY = 0
  let hasDragged = false
  let pointerWorldX = 0
  let pointerWorldY = 0
  let pointerVelocityX = 0
  let pointerVelocityY = 0
  let lastPointerX = 0
  let lastPointerY = 0
  let lastPointerTime = 0
  let pointerActive = false
  const ensureAudioContext = () => {
    try {
      audioContext ??= new window.AudioContext()
      if (audioContext.state === 'suspended') void audioContext.resume().catch(() => undefined)
      return audioContext
    } catch {
      return null
    }
  }

  const playFireworkSound = () => {
    const context = ensureAudioContext()
    if (!context) return
    const now = context.currentTime
    const duration = .58
    const noiseBuffer = context.createBuffer(1, Math.floor(context.sampleRate * duration), context.sampleRate)
    const noiseData = noiseBuffer.getChannelData(0)
    for (let index = 0; index < noiseData.length; index += 1) {
      noiseData[index] = (Math.random() * 2 - 1) * (1 - index / noiseData.length) ** 1.7
    }
    const noise = context.createBufferSource()
    noise.buffer = noiseBuffer
    const filter = context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(1900, now)
    filter.frequency.exponentialRampToValueAtTime(220, now + duration)
    const crackleGain = context.createGain()
    crackleGain.gain.setValueAtTime(.0001, now)
    crackleGain.gain.exponentialRampToValueAtTime(.48, now + .012)
    crackleGain.gain.exponentialRampToValueAtTime(.0001, now + duration)
    noise.connect(filter)
    filter.connect(crackleGain)
    crackleGain.connect(context.destination)
    noise.start(now)
    noise.stop(now + duration)

    const boom = context.createOscillator()
    const boomGain = context.createGain()
    boom.type = 'sine'
    boom.frequency.setValueAtTime(112, now)
    boom.frequency.exponentialRampToValueAtTime(43, now + .32)
    boomGain.gain.setValueAtTime(.0001, now)
    boomGain.gain.exponentialRampToValueAtTime(.25, now + .015)
    boomGain.gain.exponentialRampToValueAtTime(.0001, now + .38)
    boom.connect(boomGain)
    boomGain.connect(context.destination)
    boom.start(now)
    boom.stop(now + .4)
  }

  const addDiwaliHome = () => {
    const scale = Math.min(1, Math.max(.56, viewWidth / 19))
    const home = new THREE.Group()
    home.position.set(0, 0, -4.8)
    home.scale.set(scale, 1, 1)
    scene.add(home)
    const material = (color: number, emissive = 0x000000, emissiveIntensity = 0) => {
      const next = new THREE.MeshStandardMaterial({ color, roughness: .8, metalness: .06, emissive, emissiveIntensity })
      sharedMaterials.push(next)
      return next
    }
    const wallMat = material(0x69434a)
    const wallTrim = material(0xe1af72, 0x4d2e1f, .18)
    const roofMat = material(0x914f4b)
    const roofEdgeMat = material(0xb76b5c)
    const windowMat = material(0x382832)
    const litWindowMat = material(0xffc978, 0xff9c3d, .65)
    const doorMat = material(0x493039)
    const brassMat = material(0xc98b45, 0x693b17, .2)
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffb944 })
    const clothMats = [material(0xa85156), material(0x76639c)]
    const skinMat = material(0xd9a27d)
    const hairMat = material(0x302630)
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfff0a1 })
    sharedMaterials.push(flameMat, sparkMat)

    // A deep blue evening sky gives the warm house lights the contrast in the
    // reference, while keeping the scene entirely local and interactive.
    const skyMat = new THREE.MeshBasicMaterial({ color: 0x102c52 })
    sharedMaterials.push(skyMat)
    const sky = new THREE.Mesh(new THREE.BoxGeometry(Math.max(viewWidth * 1.7, 30), 22, .2), skyMat)
    sky.position.set(0, 1.5, -15)
    scene.add(sky)
    for (let index = 0; index < 22; index += 1) {
      const starMat = new THREE.MeshBasicMaterial({ color: index % 4 === 0 ? 0xffd28a : 0xb8cce8, transparent: true, opacity: .45 + Math.random() * .45 })
      sharedMaterials.push(starMat)
      const star = new THREE.Mesh(new THREE.SphereGeometry(.018 + Math.random() * .028, 6, 5), starMat)
      star.position.set((Math.random() - .5) * Math.max(viewWidth * 1.45, 25), 2.3 + Math.random() * 7, -13.8)
      scene.add(star)
    }

    const wall = new THREE.Mesh(new THREE.BoxGeometry(14.5, 3.6, .72), wallMat)
    wall.position.set(0, -3.65, 0)
    home.add(wall)
    const foundation = new THREE.Mesh(new THREE.BoxGeometry(15.2, .34, 1.05), wallTrim)
    foundation.position.set(0, -5.45, .02)
    home.add(foundation)
    const roof = new THREE.Mesh(new THREE.ConeGeometry(8.65, 2.8, 4), roofMat)
    roof.rotation.y = Math.PI / 4
    roof.position.set(0, -1.58, -.12)
    home.add(roof)
    const eave = new THREE.Mesh(new THREE.BoxGeometry(15.4, .2, 1), roofEdgeMat)
    eave.position.set(0, -2.82, .5)
    home.add(eave)

    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(2.15, 2.7, .16), wallTrim)
    doorFrame.position.set(0, -4.14, .42)
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.78, 2.42, .2), doorMat)
    door.position.set(0, -4.25, .54)
    home.add(doorFrame, door)
    const doorInset = new THREE.Mesh(new THREE.BoxGeometry(1.34, 1.92, .04), material(0x67404a))
    doorInset.position.set(0, -4.31, .67)
    home.add(doorInset)
    const knob = new THREE.Mesh(new THREE.SphereGeometry(.09, 10, 8), brassMat)
    knob.position.set(.48, -4.42, .78)
    home.add(knob)

    for (const x of [-5.4, -2.8, 2.8, 5.4]) {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.68, .16), wallTrim)
      frame.position.set(x, -3.25, .42)
      const pane = new THREE.Mesh(new THREE.BoxGeometry(1.36, 1.34, .08), litWindowMat)
      pane.position.set(x, -3.25, .54)
      const mullion = new THREE.Mesh(new THREE.BoxGeometry(.075, 1.34, .05), windowMat)
      mullion.position.set(x, -3.25, .6)
      const sill = new THREE.Mesh(new THREE.BoxGeometry(1.95, .13, .32), wallTrim)
      sill.position.set(x, -4.12, .52)
      home.add(frame, pane, mullion, sill)
    }

    const diyaBowl = new THREE.SphereGeometry(.24, 14, 10)
    const diyaFlame = new THREE.ConeGeometry(.115, .33, 9)
    const addDiya = (x: number, y: number, z: number) => {
      const diya = new THREE.Group()
      const bowl = new THREE.Mesh(diyaBowl, brassMat)
      bowl.scale.set(1, .38, .76)
      const flame = new THREE.Mesh(diyaFlame, flameMat)
      flame.position.y = .24
      diya.add(bowl, flame)
      diya.position.set(x, y, z)
      home.add(diya)
      diyaFlames.push({ mesh: flame, phase: Math.random() * Math.PI * 2 })
    }
    for (let index = 0; index < 9; index += 1) {
      const x = -6.8 + index * 1.7
      const roofY = -.2 - Math.abs(x) * .27
      addDiya(x, roofY, 1.25)
    }
    for (const x of [-6.8, -4.1, -1.35, 1.35, 4.1, 6.8]) addDiya(x, -4.12, .82)

    const lightCord = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, 13.6, 6), wallTrim)
    lightCord.rotation.z = Math.PI / 2
    lightCord.position.set(0, -2.7, 1.1)
    home.add(lightCord)
    for (let index = 0; index < 13; index += 1) {
      const bulbColor = index % 3 === 0 ? 0xff7773 : index % 3 === 1 ? 0xffd47d : 0xd7a8ed
      const bulbMat = material(bulbColor, bulbColor, .45)
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 6), bulbMat)
      bulb.position.set(-6.4 + index * 1.07, -2.79, 1.13)
      home.add(bulb)
    }

    // Marigold garlands and hanging lanterns frame the entry like the decorated
    // balconies in the supplied reference image.
    const flowerMats = [material(0xf39a32, 0x9a4214, .22), material(0xffd36d, 0x9b631b, .2)]
    for (const rowY of [-2.96, -2.7]) {
      for (let index = 0; index <= 24; index += 1) {
        const t = index / 24
        const x = -6.45 + t * 12.9
        const y = rowY - Math.sin(t * Math.PI) * .62
        const flower = new THREE.Mesh(new THREE.SphereGeometry(.105, 8, 7), flowerMats[index % 2])
        flower.position.set(x, y, 1.19)
        home.add(flower)
      }
    }
    for (const x of [-6.1, -3.65, 3.65, 6.1]) {
      const lantern = new THREE.Group()
      const glow = new THREE.Mesh(new THREE.SphereGeometry(.22, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffa640 }))
      const cap = new THREE.Mesh(new THREE.ConeGeometry(.19, .22, 8), brassMat)
      cap.position.y = .2
      lantern.add(glow, cap)
      lantern.position.set(x, -3.2, 1.3)
      home.add(lantern)
    }

    const floor = new THREE.Mesh(new THREE.BoxGeometry(Math.max(viewWidth * 1.2, 18), .22, 9), material(0x32262d))
    floor.position.set(0, -5.77, -4.2)
    scene.add(floor)
    for (let index = 0; index < 11; index += 1) {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(.018, .012, 8.6), material(0x78605a))
      seam.position.set(-8 + index * 1.6, -5.645, -4.1)
      scene.add(seam)
    }
    for (const x of [-1.9, 1.9]) {
      const fireworkCone = new THREE.Mesh(new THREE.ConeGeometry(.2, .54, 8), material(0xd98a42, 0x713713, .18))
      fireworkCone.position.set(x, -5.31, -.9)
      scene.add(fireworkCone)
      const fountain = new THREE.Mesh(new THREE.SphereGeometry(.16, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffda83 }))
      fountain.position.set(x, -5.02, -.9)
      sharedMaterials.push(fountain.material as InstanceType<ThreeRuntime['MeshBasicMaterial']>)
      scene.add(fountain)
    }
    const rangoli = new THREE.Mesh(new THREE.TorusGeometry(1.05, .035, 8, 40), material(0xd99b72, 0x673923, .25))
    rangoli.position.set(0, -5.58, -2.5)
    scene.add(rangoli)
    for (let index = 0; index < 8; index += 1) {
      const angle = index / 8 * Math.PI * 2
      const petal = new THREE.Mesh(new THREE.SphereGeometry(.12, 8, 6), index % 2 ? litWindowMat : material(0xc87d8e))
      petal.position.set(Math.cos(angle) * .72, -5.55, -2.48 + Math.sin(angle) * .72)
      petal.scale.set(1, .25, 1)
      scene.add(petal)
    }

    const addChild = (x: number, shirt: InstanceType<ThreeRuntime['MeshStandardMaterial']>, phase: number) => {
      const child = new THREE.Group()
      child.position.set(x * scale, -5.45, -2.1)
      child.scale.set(.82 * scale, .82, .82)
      const body = new THREE.Group()
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(.23, .34, .8, 9), shirt)
      torso.position.y = .82
      const head = new THREE.Mesh(new THREE.SphereGeometry(.31, 14, 12), skinMat)
      head.position.y = 1.48
      const hair = new THREE.Mesh(new THREE.SphereGeometry(.32, 12, 8), hairMat)
      hair.scale.set(1, .56, 1)
      hair.position.set(0, 1.67, -.02)
      body.add(torso, head, hair)
      child.add(body)
      for (const legX of [-.17, .17]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(.11, .14, .55, 7), shirt)
        leg.position.set(legX, .26, 0)
        child.add(leg)
      }
      const arm = new THREE.Group()
      arm.position.set(x < 0 ? .25 : -.25, 1.12, .02)
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(.1, .12, .58, 7), shirt)
      sleeve.position.y = -.27
      sleeve.rotation.z = x < 0 ? -.66 : .66
      const sparkStick = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .48, 6), brassMat)
      sparkStick.position.set(x < 0 ? .4 : -.4, -.43, .08)
      sparkStick.rotation.z = x < 0 ? -.5 : .5
      const spark = new THREE.Mesh(new THREE.SphereGeometry(.17, 10, 8), sparkMat)
      spark.position.set(x < 0 ? .61 : -.61, -.64, .12)
      arm.add(sleeve, sparkStick)
      child.add(arm, spark)
      scene.add(child)
      children.push({ body, arm, spark, phase })
    }
    addChild(-8.45, clothMats[0], .6)
    addChild(8.45, clothMats[1], 2.7)
  }

  const addBalloon = (preferredX?: number) => {
    const group = new THREE.Group()
    const tint = balloonColors[Math.floor(Math.random() * balloonColors.length)]
    const shellMaterial = new THREE.MeshStandardMaterial({ color: tint, roughness: .25, metalness: .04, transparent: true, opacity: .91, emissive: tint, emissiveIntensity: .1 })
    const highlightMaterial = new THREE.MeshBasicMaterial({ color: 0xfff1ed, transparent: true, opacity: .62 })
    const stringMaterial = new THREE.MeshBasicMaterial({ color: 0xe7cbd5, transparent: true, opacity: .55 })
    sharedMaterials.push(shellMaterial, highlightMaterial, stringMaterial)
    const shell = new THREE.Mesh(balloonGeometry, shellMaterial)
    shell.scale.set(.84, 1.12, .74)
    const highlight = new THREE.Mesh(highlightGeometry, highlightMaterial)
    highlight.position.set(-.12, .16, .27)
    const neck = new THREE.Mesh(neckGeometry, shellMaterial)
    neck.position.y = -.44
    const string = new THREE.Mesh(stringGeometry, stringMaterial)
    string.position.y = -.79
    group.add(shell, highlight, neck, string)
    const x = preferredX ?? (Math.random() - .5) * viewWidth * .78
    const baseY = (Math.random() - .5) * 7.3
    group.position.set(x, baseY, -2 + Math.random() * 1.3)
    const hitMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    sharedMaterials.push(hitMaterial)
    const hit = new THREE.Mesh(hitGeometry, hitMaterial)
    hit.material.color.set(tint)
    group.add(hit)
    const balloon = { group, hit, baseX: x, baseY, phase: Math.random() * Math.PI * 2, popped: false, dragging: false, dragX: x, dragY: baseY }
    hit.userData.balloon = balloon
    balloons.push(balloon)
    clickableObjects.push(hit)
    scene.add(group)
  }

  const addBurst = (x: number, y: number, z: number, colors: number[], amount: number) => {
    for (let index = 0; index < amount; index += 1) {
      const color = colors[Math.floor(Math.random() * colors.length)]
      const material = new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
      const mesh = new THREE.Mesh(particleGeometry, material)
      mesh.position.set(x, y, z)
      const velocity = new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize().multiplyScalar(.8 + Math.random() * 2.8)
      scene.add(mesh)
      const life = kind === 'balloons' ? 2.15 + Math.random() * .65 : 1.1 + Math.random() * .5
      particles.push({ mesh, velocity, life, initialLife: life, material })
    }
  }

  if (kind === 'balloons') {
    for (let index = 0; index < 19; index += 1) addBalloon()
  }
  if (kind === 'fireworks') addDiwaliHome()

  const pointer = new THREE.Vector2()
  const raycaster = new THREE.Raycaster()
  const eventPoint = (event: PointerEvent) => {
    const bounds = host.getBoundingClientRect()
    pointer.x = ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * 2 - 1
    pointer.y = -((event.clientY - bounds.top) / Math.max(bounds.height, 1)) * 2 + 1
    pointerWorldX = pointer.x * viewWidth / 2
    pointerWorldY = pointer.y * viewHeight / 2
    const now = performance.now()
    if (lastPointerTime > 0) {
      const elapsed = Math.max((now - lastPointerTime) / 1000, .012)
      pointerVelocityX = THREE.MathUtils.clamp((pointerWorldX - lastPointerX) / elapsed, -18, 18)
      pointerVelocityY = THREE.MathUtils.clamp((pointerWorldY - lastPointerY) / elapsed, -18, 18)
    }
    lastPointerX = pointerWorldX
    lastPointerY = pointerWorldY
    lastPointerTime = now
    pointerActive = true
    raycaster.setFromCamera(pointer, camera)
    return raycaster
  }
  const isInteractiveTarget = (target: EventTarget | null) => target instanceof Element && Boolean(target.closest('button, a, input, [role="button"], [data-game-surface]'))

  const handlePointerMove = (event: PointerEvent) => {
    if (kind !== 'balloons') return
    eventPoint(event)
    if (draggedBalloon && dragPointerId === event.pointerId) {
      if (Math.hypot(event.clientX - dragStartClientX, event.clientY - dragStartClientY) > 7) hasDragged = true
      const margin = .55
      draggedBalloon.dragX = THREE.MathUtils.clamp(pointerWorldX + dragOffsetX, -viewWidth / 2 + margin, viewWidth / 2 - margin)
      draggedBalloon.dragY = THREE.MathUtils.clamp(pointerWorldY + dragOffsetY, -viewHeight / 2 + margin, viewHeight / 2 - margin)
    }
  }

  const playPopSound = () => {
    try {
      const context = ensureAudioContext()
      if (!context) return
      const now = context.currentTime
      const tone = context.createOscillator()
      const volume = context.createGain()
      tone.type = 'sine'
      tone.frequency.setValueAtTime(440 + Math.random() * 100, now)
      tone.frequency.exponentialRampToValueAtTime(105, now + .16)
      volume.gain.setValueAtTime(.0001, now)
      volume.gain.exponentialRampToValueAtTime(.22, now + .008)
      volume.gain.exponentialRampToValueAtTime(.0001, now + .19)
      tone.connect(volume)
      volume.connect(context.destination)
      tone.start(now)
      tone.stop(now + .2)
    } catch {
      // Keep the balloon interaction available if browser audio is disabled.
    }
  }

  const popBalloon = (balloon: Balloon) => {
    if (balloon.popped) return
    balloon.popped = true
    scene.remove(balloon.group)
    const index = balloons.indexOf(balloon)
    if (index >= 0) balloons.splice(index, 1)
    const clickableIndex = clickableObjects.indexOf(balloon.hit)
    if (clickableIndex >= 0) clickableObjects.splice(clickableIndex, 1)
    addBurst(balloon.group.position.x, balloon.group.position.y, balloon.group.position.z, balloonColors, 34)
    playPopSound()
    replacementTimers.push(window.setTimeout(() => { if (!disposed) addBalloon() }, 1200))
  }

  const handlePointerDown = (event: PointerEvent) => {
    if (isInteractiveTarget(event.target)) return
    const bounds = host.getBoundingClientRect()
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) return
    const ray = eventPoint(event)
    const x = pointer.x * viewWidth / 2
    const y = pointer.y * viewHeight / 2

    if (kind === 'balloons') {
      const hit = ray.intersectObjects(clickableObjects, false)[0]?.object
      const balloon = hit?.userData.balloon as Balloon | undefined
      if (!balloon || balloon.popped) return
      draggedBalloon = balloon
      dragPointerId = event.pointerId
      dragStartClientX = event.clientX
      dragStartClientY = event.clientY
      dragOffsetX = balloon.group.position.x - pointerWorldX
      dragOffsetY = balloon.group.position.y - pointerWorldY
      balloon.dragX = balloon.group.position.x
      balloon.dragY = balloon.group.position.y
      balloon.dragging = true
      hasDragged = false
    } else if (kind === 'fireworks') {
      ensureAudioContext()
      const material = new THREE.MeshStandardMaterial({ color: 0xff8d70, emissive: 0xff4d5d, emissiveIntensity: 1.8 })
      const rocket = new THREE.Mesh(rocketGeometry, material)
      const from = new THREE.Vector3(x, -viewHeight / 2 - .4, 1)
      const to = new THREE.Vector3(x + (Math.random() - .5) * 1.5, Math.max(-.5, Math.min(viewHeight * .34, y)), 0)
      rocket.position.copy(from)
      rocket.rotation.z = -.12
      scene.add(rocket)
      rockets.push({ mesh: rocket, from, to, elapsed: 0, material })
    } else {
      addBurst(x, y, 1, cosmicColors, 28)
    }
  }

  const handlePointerUp = (event: PointerEvent) => {
    if (!draggedBalloon || dragPointerId !== event.pointerId) return
    const balloon = draggedBalloon
    balloon.dragging = false
    if (hasDragged) {
      balloon.baseX = balloon.dragX
      balloon.baseY = balloon.dragY
    } else {
      popBalloon(balloon)
    }
    draggedBalloon = null
    dragPointerId = null
    hasDragged = false
  }

  const handlePointerOut = (event: PointerEvent) => {
    if (event.relatedTarget === null && !draggedBalloon) {
      pointerActive = false
      pointerVelocityX = 0
      pointerVelocityY = 0
    }
  }

  window.addEventListener('pointermove', handlePointerMove, { passive: true })
  window.addEventListener('pointerdown', handlePointerDown)
  window.addEventListener('pointerup', handlePointerUp)
  window.addEventListener('pointercancel', handlePointerUp)
  window.addEventListener('pointerout', handlePointerOut)
  const resize = () => {
    const width = Math.max(host.clientWidth, 1)
    const height = Math.max(host.clientHeight, 1)
    viewWidth = viewHeight * width / height
    camera.left = -viewWidth / 2
    camera.right = viewWidth / 2
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
  }
  resize()
  const observer = new ResizeObserver(resize)
  observer.observe(host)

  const clock = new THREE.Clock()
  let animationFrame = 0
  const render = () => {
    const delta = Math.min(clock.getDelta(), .05)
    const elapsed = clock.elapsedTime
    diyaFlames.forEach(({ mesh, phase }) => {
      mesh.scale.y = .78 + (Math.sin(elapsed * 8 + phase) + 1) * .17
      mesh.rotation.z = Math.sin(elapsed * 4.2 + phase) * .09
    })
    children.forEach(({ body, arm, spark, phase }) => {
      body.position.y = Math.sin(elapsed * 2.2 + phase) * .055
      arm.rotation.z = Math.sin(elapsed * 2.6 + phase) * .12 + (phase < 1 ? -.55 : .55)
      const flicker = .78 + (Math.sin(elapsed * 15 + phase) + 1) * .42
      spark.scale.setScalar(flicker)
    })
    balloons.forEach(balloon => {
      const currentX = balloon.group.position.x
      const currentY = balloon.group.position.y
      let targetX = balloon.baseX + Math.sin(elapsed * .23 + balloon.phase) * .27 + Math.sin(elapsed * .15) * .22
      let targetY = balloon.baseY + Math.sin(elapsed * .38 + balloon.phase) * .2 + Math.sin(elapsed * .28) * .13
      if (balloon.dragging) {
        targetX = balloon.dragX
        targetY = balloon.dragY
      } else if (pointerActive) {
        const dx = currentX - pointerWorldX
        const dy = currentY - pointerWorldY
        const distance = Math.hypot(dx, dy)
        if (distance < 4.8) {
          const closeness = 1 - distance / 4.8
          const awayX = distance > .001 ? dx / distance : 0
          const awayY = distance > .001 ? dy / distance : 0
          targetX += awayX * closeness * .72 - pointerVelocityX * closeness * .018
          targetY += awayY * closeness * .72 - pointerVelocityY * closeness * .018
        }
      }
      const smoothing = Math.min(1, delta * (balloon.dragging ? 9 : 2.8))
      balloon.group.position.x += (targetX - currentX) * smoothing
      balloon.group.position.y += (targetY - currentY) * smoothing
      balloon.group.rotation.z = Math.sin(elapsed * .42 + balloon.phase) * .055
    })
    pointerVelocityX *= Math.max(0, 1 - delta * 5)
    pointerVelocityY *= Math.max(0, 1 - delta * 5)

    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index]
      particle.life -= delta
      particle.mesh.position.addScaledVector(particle.velocity, delta)
      particle.velocity.y -= kind === 'fireworks' ? .75 * delta : 1.1 * delta
      const fade = Math.max(0, Math.min(1, particle.life / particle.initialLife))
      particle.mesh.scale.setScalar(.2 + fade * .8)
      particle.material.opacity = fade
      if (particle.life <= 0) {
        scene.remove(particle.mesh)
        particle.material.dispose()
        particles.splice(index, 1)
      }
    }

    for (let index = rockets.length - 1; index >= 0; index -= 1) {
      const rocket = rockets[index]
      rocket.elapsed += delta
      const progress = Math.min(rocket.elapsed / .82, 1)
      const eased = 1 - (1 - progress) ** 2
      rocket.mesh.position.lerpVectors(rocket.from, rocket.to, eased)
      if (progress >= 1) {
        const { x, y, z } = rocket.to
        scene.remove(rocket.mesh)
        rocket.material.dispose()
        rockets.splice(index, 1)
        addBurst(x, y, z, fireworkColors, 54)
        if (kind === 'fireworks') playFireworkSound()
      }
    }

    renderer.render(scene, camera)
    animationFrame = requestAnimationFrame(render)
  }
  render()

  return () => {
    disposed = true
    replacementTimers.forEach(window.clearTimeout)
    cancelAnimationFrame(animationFrame)
    observer.disconnect()
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerdown', handlePointerDown)
    window.removeEventListener('pointerup', handlePointerUp)
    window.removeEventListener('pointercancel', handlePointerUp)
    window.removeEventListener('pointerout', handlePointerOut)
    void audioContext?.close()
    renderer.dispose()
    renderer.domElement.remove()
    scene.traverse(object => {
      if (object instanceof THREE.Mesh) object.geometry.dispose()
    })
    balloonGeometry.dispose()
    neckGeometry.dispose()
    stringGeometry.dispose()
    hitGeometry.dispose()
    highlightGeometry.dispose()
    particleGeometry.dispose()
    rocketGeometry.dispose()
    sharedMaterials.forEach(material => material.dispose())
    particles.forEach(particle => particle.material.dispose())
    rockets.forEach(rocket => rocket.material.dispose())
  }
}

export default function GameAmbience({ kind }: { kind: AmbienceKind }) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    let cleanup: (() => void) | undefined
    void import('three').then(module => {
      if (cancelled || !hostRef.current) return
      const { WebGLRenderer, Scene, OrthographicCamera, Group, Mesh, SphereGeometry, ConeGeometry, CylinderGeometry, BoxGeometry, CircleGeometry, TorusGeometry, MeshStandardMaterial, MeshBasicMaterial, AmbientLight, PointLight, Vector2, Vector3, Raycaster, Clock, AdditiveBlending, MathUtils } = module
      cleanup = mountAmbience(hostRef.current, kind, { WebGLRenderer, Scene, OrthographicCamera, Group, Mesh, SphereGeometry, ConeGeometry, CylinderGeometry, BoxGeometry, CircleGeometry, TorusGeometry, MeshStandardMaterial, MeshBasicMaterial, AmbientLight, PointLight, Vector2, Vector3, Raycaster, Clock, AdditiveBlending, MathUtils })
    }).catch(() => undefined)
    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [kind])

  return <div ref={hostRef} className={`page-ambience ambience-${kind}`} aria-hidden="true" />
}
