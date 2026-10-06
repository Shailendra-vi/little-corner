import { Fragment, useEffect, useRef, useState } from 'react'
import type { WebGLRenderer } from 'three'
import type { HomeTimeTheme } from '../utils/homeTimeTheme'
import { calculateSolarState, pauseSolarClock, resumeSolarClock, setDebugSolarHour, shiftSolarClock, type SolarState } from '../utils/solarTime'

type ThreeRuntime = Pick<typeof import('three'),
  | 'WebGLRenderer' | 'Scene' | 'PerspectiveCamera' | 'Group' | 'Mesh' | 'BoxGeometry'
  | 'SphereGeometry' | 'ConeGeometry' | 'CylinderGeometry' | 'PlaneGeometry' | 'MeshStandardMaterial'
  | 'MeshBasicMaterial' | 'AmbientLight' | 'DirectionalLight' | 'CatmullRomCurve3' | 'TubeGeometry'
  | 'Vector2' | 'Vector3' | 'Raycaster' | 'Sprite' | 'SpriteMaterial' | 'CanvasTexture'
  | 'BufferGeometry' | 'Float32BufferAttribute' | 'Points' | 'PointsMaterial' | 'DoubleSide'
  | 'CircleGeometry' | 'AdditiveBlending' | 'Clock' | 'TorusGeometry' | 'Plane' | 'MathUtils' | 'PCFSoftShadowMap' | 'Fog'
>

const palette: Record<HomeTimeTheme, { far: number; building: number; roof: number; trim: number; cat: number; window: number; sky: number; sun: number; moon: number }> = {
  dawn: { far: 0x56404d, building: 0x29252d, roof: 0x594653, trim: 0xb3818b, cat: 0xc8a5b1, window: 0xffc999, sky: 0x654653, sun: 0xffa06f, moon: 0xe2d9ff },
  day: { far: 0x66504d, building: 0x342a2b, roof: 0x655158, trim: 0xb58c8f, cat: 0xbba3c2, window: 0xffd6a0, sky: 0x77534f, sun: 0xffca8d, moon: 0xe2d9ff },
  sunset: { far: 0x53303c, building: 0x261e29, roof: 0x59404a, trim: 0xe15f5b, cat: 0xd19ca5, window: 0xffba78, sky: 0x773947, sun: 0xff413f, moon: 0xe2d9ff },
  night: { far: 0x302a3a, building: 0x1b1a22, roof: 0x443c4d, trim: 0x75637e, cat: 0xb3a4c8, window: 0xf3c884, sky: 0x33283e, sun: 0xff554e, moon: 0xe2dcff },
}

function mountHomeScene(host: HTMLDivElement, theme: HomeTimeTheme, THREE: ThreeRuntime) {
  let renderer: WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
  } catch {
    return () => undefined
  }
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const colors = palette[theme]
  const mixHex = (from: number, to: number, amount: number) => {
    const t = Math.max(0, Math.min(1, amount))
    const channel = (shift: number) => Math.round(((from >> shift) & 255) * (1 - t) + ((to >> shift) & 255) * t)
    return (channel(16) << 16) | (channel(8) << 8) | channel(0)
  }
  const scene = new THREE.Scene()
  const atmosphereFog = new THREE.Fog(colors.sky, 62, 145)
  scene.fog = atmosphereFog
  const fov = 48
  const camera = new THREE.PerspectiveCamera(fov, host.clientWidth / Math.max(host.clientHeight, 1), .1, 150)
  const target = new THREE.Vector3(0, 18, 0)
  camera.position.set(11, 32.5, 26)
  camera.lookAt(target)
  const targetDistance = camera.position.distanceTo(target)
  const viewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(fov / 2)) * targetDistance
  let viewWidth = viewHeight * host.clientWidth / Math.max(host.clientHeight, 1)
  const cameraForward = new THREE.Vector3().subVectors(target, camera.position).normalize()
  const cameraRight = new THREE.Vector3().crossVectors(cameraForward, new THREE.Vector3(0, 1, 0)).normalize()
  const cameraUp = new THREE.Vector3().crossVectors(cameraRight, cameraForward).normalize()
  const pointOnViewPlane = (x: number, y: number, distance: number, result = new THREE.Vector3()) => {
    const halfHeight = distance * Math.tan(THREE.MathUtils.degToRad(fov / 2))
    return result.copy(camera.position)
      .addScaledVector(cameraForward, distance)
      .addScaledVector(cameraRight, x * halfHeight * camera.aspect)
      .addScaledVector(cameraUp, y * halfHeight)
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.setClearColor(0x000000, 0)
  renderer.domElement.className = 'home-scene-canvas'
  renderer.domElement.setAttribute('aria-hidden', 'true')
  host.appendChild(renderer.domElement)

  // Render a soft, time-matched sky behind the city instead of exposing a flat page color.
  const skyCanvas = document.createElement('canvas')
  skyCanvas.width = 8
  skyCanvas.height = 256
  const skyContext = skyCanvas.getContext('2d')
  const skyTexture = new THREE.CanvasTexture(skyCanvas)
  const skyStops: Record<SolarState['phase'], [string, string, string]> = {
    night: ['#171a2a', '#343044', '#55404b'], dawn: ['#514052', '#9a6471', '#e5a17b'],
    morning: ['#52637a', '#93a3b1', '#dfbea0'], noon: ['#657f99', '#aebdc0', '#e9d0b2'],
    afternoon: ['#5d687b', '#b09a98', '#e8c19c'], 'golden-hour': ['#40364a', '#84505b', '#d18469'],
    sunset: ['#372d45', '#884953', '#ee9870'], dusk: ['#27283d', '#56405a', '#bd7e75'],
  }
  const skyTimeline: Array<[number, SolarState['phase']]> = [[0, 'night'], [5, 'night'], [6, 'dawn'], [7, 'morning'], [10, 'noon'], [14, 'afternoon'], [16, 'golden-hour'], [18, 'sunset'], [19.5, 'dusk'], [22, 'night'], [24, 'night']]
  const mixCss = (a: string, b: string, t: number) => {
    const channel = (index: number) => Math.round(parseInt(a.slice(index, index + 2), 16) * (1 - t) + parseInt(b.slice(index, index + 2), 16) * t).toString(16).padStart(2, '0')
    return `#${channel(1)}${channel(3)}${channel(5)}`
  }
  const paintSky = (solar: SolarState) => {
    if (!skyContext) return
    const gradient = skyContext.createLinearGradient(0, 0, 0, skyCanvas.height)
    let index = skyTimeline.findIndex(([hour]) => solar.hour < hour)
    if (index < 1) index = skyTimeline.length - 1
    const [beforeHour, beforePhase] = skyTimeline[index - 1]
    const [afterHour, afterPhase] = skyTimeline[index]
    const amount = Math.max(0, Math.min(1, (solar.hour - beforeHour) / Math.max(.001, afterHour - beforeHour)))
    const before = skyStops[beforePhase], after = skyStops[afterPhase]
    const stops = before.map((color, i) => mixCss(color, after[i], amount))
    gradient.addColorStop(0, stops[0]); gradient.addColorStop(.54, stops[1]); gradient.addColorStop(1, stops[2])
    skyContext.fillStyle = gradient; skyContext.fillRect(0, 0, skyCanvas.width, skyCanvas.height)
    skyTexture.needsUpdate = true
  }
  if (skyContext) paintSky(calculateSolarState())
  const skyMaterial = new THREE.SpriteMaterial({ map: skyTexture, depthWrite: false, depthTest: true })
  const sky = new THREE.Sprite(skyMaterial)
  const skyDirection = new THREE.Vector3(-11, target.y - camera.position.y, -26)
  const skyDistance = Math.hypot(skyDirection.x, skyDirection.y, skyDirection.z)
  sky.position.set(
    camera.position.x + skyDirection.x / skyDistance * 90,
    camera.position.y + skyDirection.y / skyDistance * 90,
    camera.position.z + skyDirection.z / skyDistance * 90,
  )
  sky.scale.set(viewWidth * 3.3, viewHeight * 3.3, 1)
  scene.add(sky)

  const ambientLight = new THREE.AmbientLight(theme === 'night' ? 0x9f9abe : 0xffe5dc, theme === 'night' ? .68 : 1.08)
  scene.add(ambientLight)
  const sunLight = new THREE.DirectionalLight(theme === 'night' ? 0xc8c5f2 : theme === 'sunset' ? 0xff7965 : 0xffd09b, theme === 'night' ? .62 : theme === 'sunset' ? 2.2 : 1.8)
  sunLight.position.set(-8, 17, 15)
  sunLight.castShadow = true
  sunLight.shadow.mapSize.set(1024, 1024)
  sunLight.shadow.camera.left = -32
  sunLight.shadow.camera.right = 32
  sunLight.shadow.camera.top = 34
  sunLight.shadow.camera.bottom = -28
  sunLight.shadow.camera.far = 150
  sunLight.shadow.bias = -.00025
  sunLight.target.position.set(0, 18.1, 0)
  scene.add(sunLight.target)
  scene.add(sunLight)

  // Slow layered cloud banks add depth without competing with the rooftop.
  const cloudMaterial = new THREE.MeshStandardMaterial({
    color: theme === 'night' ? 0x756b83 : theme === 'sunset' ? 0xb77a70 : 0xc3a8a4,
    roughness: 1, transparent: true, opacity: theme === 'night' ? .5 : .68,
  })
  const clouds: Array<{ group: InstanceType<ThreeRuntime['Group']>; speed: number; span: number; x: number; y: number; distance: number }> = []
  for (let index = 0; index < 7; index += 1) {
    const cloud = new THREE.Group()
    const puffCount = 4 + index % 3
    for (let puff = 0; puff < puffCount; puff += 1) {
      const shape = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 9), cloudMaterial)
      shape.scale.set(1.7 + (puff % 2) * .5, .52 + (puff % 3) * .12, .58)
      shape.position.set(puff * 1.25, Math.sin(puff * 1.7) * .18, Math.cos(puff) * .16)
      cloud.add(shape)
    }
    const span = 2.8
    const x = -1.2 + index * .4
    const y = .18 + (index % 4) * .105
    const distance = 72 + (index % 3) * 3
    cloud.position.copy(pointOnViewPlane(x, y, distance))
    cloud.scale.setScalar(1.4 + (index % 3) * .2)
    scene.add(cloud)
    clouds.push({ group: cloud, speed: .012 + (index % 3) * .004, span, x, y, distance })
  }

  // A soft atmospheric disc with a canvas-generated glow, behind the skyline.
  const glowCanvas = document.createElement('canvas')
  glowCanvas.width = 128
  glowCanvas.height = 128
  const context = glowCanvas.getContext('2d')
  if (context) {
    const glowGradient = context.createRadialGradient(64, 64, 4, 64, 64, 63)
    glowGradient.addColorStop(0, theme === 'night' ? 'rgba(226,220,255,.5)' : 'rgba(255,130,91,.54)')
    glowGradient.addColorStop(.24, theme === 'night' ? 'rgba(196,177,255,.25)' : 'rgba(255,71,63,.28)')
    glowGradient.addColorStop(1, 'rgba(245,105,88,0)')
    context.fillStyle = glowGradient
    context.fillRect(0, 0, 128, 128)
  }
  const glowTexture = new THREE.CanvasTexture(glowCanvas)
  const glowMaterial = new THREE.SpriteMaterial({ map: glowTexture, color: colors.sun, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
  const glow = new THREE.Sprite(glowMaterial)
  glow.scale.set(23, 23, 1)
  scene.add(glow)
  const moonGlowMaterial = new THREE.SpriteMaterial({ map: glowTexture, color: colors.moon, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
  const moonGlow = new THREE.Sprite(moonGlowMaterial)
  moonGlow.scale.set(17, 17, 1)
  scene.add(moonGlow)
  const celestialMaterial = new THREE.MeshBasicMaterial({ color: colors.sun, transparent: true, opacity: 0, depthWrite: false })
  const celestial = new THREE.Mesh(new THREE.SphereGeometry(2.2, 32, 24), celestialMaterial)
  const moonMaterial = new THREE.MeshBasicMaterial({ color: colors.moon, transparent: true, opacity: 0, depthWrite: false })
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1.25, 28, 20), moonMaterial)
  const celestialShade = new THREE.Mesh(new THREE.SphereGeometry(.98, 28, 20), new THREE.MeshBasicMaterial({ color: 0x24263a }))
  scene.add(celestial, moon, celestialShade)

  const starMaterial = new THREE.PointsMaterial({ color: 0xf0e4ff, size: .1, transparent: true, opacity: .2, depthWrite: false })
  {
    const starCount = 240
    const starPositions = new Float32Array(starCount * 3)
    for (let index = 0; index < starCount; index += 1) {
      const star = pointOnViewPlane((Math.random() - .5) * 2.5, Math.random() * .9, 66)
      starPositions[index * 3] = star.x
      starPositions[index * 3 + 1] = star.y
      starPositions[index * 3 + 2] = star.z
    }
    const starGeometry = new THREE.BufferGeometry()
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3))
    const stars = new THREE.Points(starGeometry, starMaterial)
    scene.add(stars)
  }

  // Distant high-rises set the skyline behind the foreground tower.
  const skyline = new THREE.Group()
  const skylineMaterial = new THREE.MeshStandardMaterial({ color: colors.far, roughness: .95, metalness: .08 })
  const skylineLit = new THREE.MeshBasicMaterial({ color: colors.window, transparent: true, opacity: theme === 'day' ? .26 : .73 })
  scene.add(skyline)
  const skylineSpecs = [
    [-15, -19, 9, 4.2], [-9, -23, 13, 3.5], [0, -26, 10, 3.6], [9, -22, 14, 4.4], [16, -18, 8, 3.8],
  ]
  for (const [x, z, height, width] of skylineSpecs) {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(width, height, 3.8), skylineMaterial)
    tower.position.set(x, height / 2 - 2, z)
    skyline.add(tower)
    for (let row = 0; row < Math.floor(height / 1.05); row += 1) {
      for (let column = 0; column < Math.floor(width / .62); column += 1) {
        if ((row * 7 + column * 3 + Math.round(x)) % 4 === 0) continue
        const window = new THREE.Mesh(new THREE.PlaneGeometry(.2, .12), skylineLit)
        window.position.set(x - width / 2 + .4 + column * .58, -.9 + row * 1.02, z + 1.92)
        skyline.add(window)
      }
    }
  }

  // City blocks, roads and street furniture sit below the high-rise.
  const groundMaterial = new THREE.MeshStandardMaterial({ color: theme === 'night' ? 0x25232d : 0x493a3d, roughness: 1 })
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(150, 120), groundMaterial)
  ground.rotation.x = -Math.PI / 2
  ground.position.set(0, -2.15, -12)
  ground.receiveShadow = true
  scene.add(ground)
  const roadMaterial = new THREE.MeshStandardMaterial({ color: theme === 'night' ? 0x34323b : 0x625154, roughness: .94 })
  const roadMarking = new THREE.MeshBasicMaterial({ color: theme === 'night' ? 0xc0aab8 : 0xe7c1a5, transparent: true, opacity: .68 })
  const road = new THREE.Mesh(new THREE.PlaneGeometry(150, 5.5), roadMaterial)
  road.rotation.x = -Math.PI / 2
  road.position.set(0, -2.08, -13)
  const crossRoad = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 120), roadMaterial)
  crossRoad.rotation.x = -Math.PI / 2
  crossRoad.position.set(-22, -2.07, -12)
  scene.add(road, crossRoad)
  for (let mark = -68; mark < 70; mark += 7) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(3.2, .12), roadMarking)
    dash.rotation.x = -Math.PI / 2
    dash.position.set(mark, -2.035, -13)
    scene.add(dash)
  }

  const carColors = [0xf0a879, 0xb5a2cb, 0xd75e57, 0xe6d2b5]
  const cars: Array<{ group: InstanceType<ThreeRuntime['Group']>; speed: number; start: number; end: number }> = []
  for (let index = 0; index < 4; index += 1) {
    const car = new THREE.Group()
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.45, .42, .68), new THREE.MeshStandardMaterial({ color: carColors[index], roughness: .48, metalness: .16 }))
    body.position.y = .36
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(.72, .32, .58), new THREE.MeshStandardMaterial({ color: 0x302c38, roughness: .25, metalness: .3 }))
    cabin.position.set(-.04, .7, 0)
    car.add(body, cabin)
    car.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true
        object.receiveShadow = true
      }
    })
    for (const x of [-.46, .46]) for (const z of [-.34, .34]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .09, 10), new THREE.MeshStandardMaterial({ color: 0x19191f, roughness: .9 }))
      wheel.rotation.x = Math.PI / 2
      wheel.position.set(x, .18, z)
      car.add(wheel)
    }
    const start = -43 - index * 7
    car.position.set(start, -2.02, -14.4 + (index % 2) * 2.6)
    scene.add(car)
    cars.push({ group: car, speed: 1.5 + index * .24, start, end: -11 })
  }

  // Small planted trees break up the street edges and frame the tower base.
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x57403a, roughness: .95 })
  const leafMaterial = new THREE.MeshStandardMaterial({ color: theme === 'night' ? 0x55475e : 0x68775e, roughness: .9 })
  for (const [x, z] of [[-15, -8], [-19, -8], [-25, -8], [-30, -8], [-15, -22], [-19, -22], [-25, -22], [-30, -22], [15, -8], [22, -8], [30, -8], [15, -22], [22, -22], [30, -22]]) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.13, .19, 1.4, 7), trunkMaterial)
    trunk.position.set(x, -1.4, z)
    trunk.castShadow = true
    const crown = new THREE.Mesh(new THREE.SphereGeometry(.85, 10, 8), leafMaterial)
    crown.scale.set(1, 1.35, .92)
    crown.position.set(x, -.42, z)
    crown.castShadow = true
    scene.add(trunk, crown)
  }

  // Tiny paired wing arcs make the birds read as silhouettes at this distance.
  const birds: Array<{ group: InstanceType<ThreeRuntime['Group']>; speed: number; start: number; end: number; phase: number; y: number; distance: number }> = []
  const birdMaterial = new THREE.MeshBasicMaterial({ color: theme === 'night' ? 0xaaa0bd : 0x3b3038 })
  for (let index = 0; index < 4; index += 1) {
    const bird = new THREE.Group()
    const left = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(-.5, 0, 0), new THREE.Vector3(-.22, .2, 0), new THREE.Vector3(0, .05, 0),
    ]), 8, .035, 5, false), birdMaterial)
    const right = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, .05, 0), new THREE.Vector3(.22, .2, 0), new THREE.Vector3(.5, 0, 0),
    ]), 8, .035, 5, false), birdMaterial)
    bird.add(left, right)
    const start = -1.35 - index * .22
    const end = 1.4
    const y = .25 + (index % 3) * .12
    const distance = 62 + index * 2
    bird.position.copy(pointOnViewPlane(start, y, distance))
    scene.add(bird)
    birds.push({ group: bird, speed: .045 + index * .008, start, end, phase: index * 1.8, y, distance })
  }

  // The foreground skyscraper is tall enough to carry a readable rooftop silhouette.
  const buildingWidth = 19
  const buildingDepth = 12
  const buildingHeight = 20
  const roofY = 18.1
  const buildingMaterial = new THREE.MeshStandardMaterial({ color: colors.building, roughness: .87, metalness: .12 })
  const building = new THREE.Mesh(new THREE.BoxGeometry(buildingWidth, buildingHeight, buildingDepth), buildingMaterial)
  building.position.set(0, 8.1, 0)
  building.castShadow = true
  building.receiveShadow = true
  scene.add(building)
  const roofMaterial = new THREE.MeshStandardMaterial({ color: colors.roof, roughness: .7, metalness: .16 })
  const roof = new THREE.Mesh(new THREE.BoxGeometry(buildingWidth + .3, .28, buildingDepth + .3), roofMaterial)
  roof.position.set(0, roofY, 0)
  roof.castShadow = true
  roof.receiveShadow = true
  scene.add(roof)
  const roofTrim = new THREE.MeshStandardMaterial({ color: colors.trim, emissive: theme === 'sunset' ? 0x70272b : 0x211820, emissiveIntensity: .34, roughness: .7 })
  const edgeFront = new THREE.Mesh(new THREE.BoxGeometry(buildingWidth + .4, .2, .2), roofTrim)
  edgeFront.position.set(0, roofY + .17, buildingDepth / 2)
  const edgeSide = new THREE.Mesh(new THREE.BoxGeometry(.2, .2, buildingDepth + .25), roofTrim)
  edgeSide.position.set(buildingWidth / 2, roofY + .17, 0)
  scene.add(edgeFront, edgeSide)
  const roofSeamMaterial = new THREE.MeshStandardMaterial({ color: colors.trim, roughness: .72, metalness: .08, transparent: true, opacity: .23 })
  for (let seam = -4; seam <= 4; seam += 2) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(buildingWidth - .8, .025, .035), roofSeamMaterial)
    line.position.set(0, roofY + .155, seam)
    scene.add(line)
  }

  const facadeWindowOff = new THREE.MeshBasicMaterial({ color: 0x211e25, transparent: true, opacity: .78 })
  const facadeWindowWarm = new THREE.MeshBasicMaterial({ color: colors.window, transparent: true, opacity: theme === 'day' ? .68 : .94 })
  const facadeFront = new THREE.Group()
  const facadeSide = new THREE.Group()
  scene.add(facadeFront, facadeSide)
  for (let row = 0; row < 15; row += 1) {
    const y = -1.05 + row * 1.23
    for (let column = 0; column < 11; column += 1) {
      const lit = (row * 11 + column * 7) % 6 < (theme === 'night' ? 3 : 2)
      const window = new THREE.Mesh(new THREE.BoxGeometry(.82, .48, .045), lit ? facadeWindowWarm : facadeWindowOff)
      window.position.set(-8.9 + column * 1.78, y, buildingDepth / 2 + .024)
      facadeFront.add(window)
    }
    for (let column = 0; column < 7; column += 1) {
      const lit = (row * 5 + column * 3) % 5 < 2
      const window = new THREE.Mesh(new THREE.BoxGeometry(.045, .48, .84), lit ? facadeWindowWarm : facadeWindowOff)
      window.position.set(buildingWidth / 2 + .024, y, -5.1 + column * 1.68)
      facadeSide.add(window)
    }
  }
  for (let column = 0; column <= 11; column += 1) {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(.075, buildingHeight, .07), roofTrim)
    mullion.position.set(-9.5 + column * (buildingWidth / 11), 8.1, buildingDepth / 2 + .01)
    facadeFront.add(mullion)
  }

  // Rooftop service room, air units and a slim antenna make the roof read as a skyscraper.
  const serviceMaterial = new THREE.MeshStandardMaterial({ color: theme === 'night' ? 0x766b86 : theme === 'sunset' ? 0xa36269 : 0x927b91, roughness: .74, metalness: .12 })
  const ventWarmMaterial = new THREE.MeshStandardMaterial({ color: theme === 'night' ? 0xa16d76 : 0xc77c70, roughness: .68, metalness: .16 })
  const ventLavenderMaterial = new THREE.MeshStandardMaterial({ color: theme === 'night' ? 0x958aa9 : 0xb6a0b9, roughness: .68, metalness: .16 })
  const serviceTopMaterial = new THREE.MeshStandardMaterial({ color: theme === 'sunset' ? 0xd48a7d : 0xb98ca1, roughness: .65, metalness: .13 })
  const serviceRoom = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.3, 3.2), serviceMaterial)
  serviceRoom.position.set(-5.5, roofY + 1.25, -3.25)
  serviceRoom.castShadow = true
  serviceRoom.receiveShadow = true
  const serviceRoof = new THREE.Mesh(new THREE.BoxGeometry(3.8, .15, 3.5), serviceTopMaterial)
  serviceRoof.position.set(-5.5, roofY + 2.48, -3.25)
  serviceRoof.castShadow = true
  serviceRoof.receiveShadow = true
  const ventOne = new THREE.Mesh(new THREE.BoxGeometry(1.7, .8, 1.4), ventWarmMaterial)
  ventOne.position.set(4.6, roofY + .48, -2.9)
  ventOne.castShadow = true
  const ventTwo = new THREE.Mesh(new THREE.BoxGeometry(1.1, .56, 1), ventLavenderMaterial)
  ventTwo.position.set(6.3, roofY + .36, -1.4)
  ventTwo.castShadow = true
  scene.add(serviceRoom, serviceRoof, ventOne, ventTwo)
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(.035, .055, 3.8, 8), roofTrim)
  antenna.position.set(-3.5, roofY + 2.0, -4.2)
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(.1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff544b }))
  beacon.position.set(-3.5, roofY + 3.95, -4.2)
  scene.add(antenna, beacon)

  type ClimbPoint = { x: number; z: number; y: number }
  type ClimbSurface = { id: string; bounds: [number, number, number, number]; points: ClimbPoint[]; top: ClimbPoint; plane: InstanceType<ThreeRuntime['Plane']> }
  const climbSurfaces: ClimbSurface[] = []
  const addStair = (surfaceId: string, bounds: [number, number, number, number], top: ClimbPoint, base: ClimbPoint, stairs: Array<{ x: number; z: number; height: number; width: number; depth: number }>) => {
    const points: ClimbPoint[] = [base]
    for (const stair of stairs) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(stair.width, stair.height, stair.depth), serviceMaterial)
      step.position.set(stair.x, roofY + .14 + stair.height / 2, stair.z)
      step.castShadow = true
      step.receiveShadow = true
      scene.add(step)
      points.push({ x: stair.x, z: stair.z, y: roofY + .34 + stair.height })
    }
    points.push(top)
    climbSurfaces.push({ id: surfaceId, bounds, points, top, plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), -(top.y - .2)) })
  }
  // The service room has a narrow exterior stair flight leading up to its roof.
  const serviceSteps = Array.from({ length: 8 }, (_, index) => ({
    x: -3.3 - index * .31, z: -5.18, height: (index + 1) * .3, width: .48, depth: .78,
  }))
  addStair('service-room', [-7.35, -3.65, -5.05, -1.4],
    { x: -5.5, z: -4.35, y: roofY + 2.76 }, { x: -3.05, z: -5.18, y: roofY + .2 }, serviceSteps)
  // Short service ladders make the two rooftop vents reachable as well.
  addStair('vent-one', [3.65, 5.55, -3.75, -2.0],
    { x: 4.6, z: -2.9, y: roofY + 1.08 }, { x: 5.72, z: -3.88, y: roofY + .2 },
    [
      { x: 5.42, z: -3.88, height: .4, width: .38, depth: .72 },
      { x: 5.1, z: -3.88, height: .8, width: .38, depth: .72 },
    ])
  addStair('vent-two', [5.65, 6.95, -2.0, -.8],
    { x: 6.3, z: -1.4, y: roofY + .84 }, { x: 7.12, z: -2.16, y: roofY + .2 },
    [
      { x: 6.82, z: -2.16, height: .32, width: .38, depth: .62 },
      { x: 6.52, z: -2.16, height: .64, width: .38, depth: .62 },
    ])

  // A small, softly shaded cat with a visible collar, tail and running gait.
  const cat = new THREE.Group()
  cat.position.set(1.2, roofY + .2, .8)
  scene.add(cat)
  const catMaterial = new THREE.MeshStandardMaterial({ color: colors.cat, roughness: .67, metalness: .015 })
  const paleFur = new THREE.MeshStandardMaterial({ color: 0xf1d9d1, roughness: .77 })
  const earPink = new THREE.MeshStandardMaterial({ color: theme === 'sunset' ? 0xf07176 : 0xd889a5, roughness: .72 })
  const bodyGroup = new THREE.Group()
  cat.add(bodyGroup)
  const torso = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), catMaterial)
  torso.scale.set(.48, .23, .27)
  torso.position.set(-.04, .28, 0)
  bodyGroup.add(torso)
  const bib = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 14), paleFur)
  bib.scale.set(.17, .2, .2)
  bib.position.set(.29, .25, .035)
  bodyGroup.add(bib)

  const head = new THREE.Group()
  head.position.set(.37, .39, .015)
  bodyGroup.add(head)
  const headShape = new THREE.Mesh(new THREE.SphereGeometry(.22, 24, 18), catMaterial)
  headShape.scale.set(1.02, .94, .96)
  head.add(headShape)
  const earShape = new THREE.ConeGeometry(.095, .24, 5)
  const earLeft = new THREE.Mesh(earShape, catMaterial)
  earLeft.position.set(-.13, .2, -.005)
  earLeft.rotation.z = -.16
  const earRight = new THREE.Mesh(earShape, catMaterial)
  earRight.position.set(.11, .2, .01)
  earRight.rotation.z = .12
  head.add(earLeft, earRight)
  const earInnerShape = new THREE.ConeGeometry(.046, .13, 5)
  const earLeftInner = new THREE.Mesh(earInnerShape, earPink)
  earLeftInner.position.set(-.13, .19, .085)
  const earRightInner = new THREE.Mesh(earInnerShape, earPink)
  earRightInner.position.set(.11, .19, .1)
  head.add(earLeftInner, earRightInner)
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(.085, 16, 12), paleFur)
  muzzle.scale.set(1.28, .68, .95)
  muzzle.position.set(.17, -.07, .1)
  head.add(muzzle)
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x34242d })
  for (const x of [.015, .13]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.021, 10, 8), eyeMat)
    eye.position.set(x, .015, .195)
    head.add(eye)
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(.025, 10, 8), earPink)
  nose.position.set(.23, -.045, .17)
  head.add(nose)
  const collar = new THREE.Mesh(new THREE.TorusGeometry(.125, .022, 8, 20), new THREE.MeshStandardMaterial({ color: 0xc67da4, roughness: .5 }))
  collar.position.set(.29, .2, .02)
  collar.rotation.y = Math.PI / 2
  head.add(collar)

  const legs: Array<InstanceType<ThreeRuntime['Group']>> = []
  for (const [index, x] of [-.34, -.22, .26, .37].entries()) {
    const leg = new THREE.Group()
    leg.position.set(x, .19, index % 2 === 0 ? -.14 : .14)
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(.045, .035, .19, 9), catMaterial)
    shin.position.y = -.085
    const paw = new THREE.Mesh(new THREE.SphereGeometry(.052, 10, 8), paleFur)
    paw.scale.set(1.12, .62, 1)
    paw.position.set(.018, -.18, .012)
    leg.add(shin, paw)
    cat.add(leg)
    legs.push(leg)
  }
  const tailPivot = new THREE.Group()
  tailPivot.position.set(-.39, .35, -.015)
  cat.add(tailPivot)
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(-.17, .1, 0), new THREE.Vector3(-.2, .35, 0), new THREE.Vector3(-.08, .52, 0), new THREE.Vector3(.06, .47, 0),
  ])
  const tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 18, .042, 8, false), catMaterial)
  tailPivot.add(tail)
  cat.traverse(object => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true
      object.receiveShadow = true
    }
  })

  const rooftopPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -roofY - .14)
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const hitPoint = new THREE.Vector3()
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(.42, 20), new THREE.MeshBasicMaterial({ color: 0x17131a, transparent: true, opacity: .31, depthWrite: false, side: THREE.DoubleSide }))
  shadow.rotation.x = -Math.PI / 2
  shadow.scale.set(1.4, .9, 1)
  shadow.position.set(cat.position.x, roofY + .145, cat.position.z)
  scene.add(shadow)
  let targetX = cat.position.x
  let targetZ = cat.position.z
  let targetY = roofY + .2
  let route: ClimbPoint[] = []
  let routeIndex = 0
  let activeClimbId: string | null = null
  let requestedClimbId: string | null = null
  let routeGoalClimbId: string | null = null
  const queueClimbRoute = (destinationId: string | null) => {
    route = []
    routeIndex = 0
    if (activeClimbId) {
      const currentSurface = climbSurfaces.find(surface => surface.id === activeClimbId)
      if (currentSurface) route.push(...currentSurface.points.slice(0, -1).reverse())
      activeClimbId = null
    }
    const destination = climbSurfaces.find(surface => surface.id === destinationId)
    if (destination) route.push(...destination.points)
    routeGoalClimbId = destinationId
  }

  const resize = () => {
    const width = Math.max(host.clientWidth, 1)
    const height = Math.max(host.clientHeight, 1)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    viewWidth = viewHeight * width / height
    sky.scale.set(viewWidth * 3.3, viewHeight * 3.3, 1)
    renderer.setSize(width, height, false)
  }
  resize()
  const observer = new ResizeObserver(resize)
  observer.observe(host)

  const trackPointer = (event: PointerEvent) => {
    const bounds = host.getBoundingClientRect()
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) return
    pointer.set(((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * 2 - 1, -((event.clientY - bounds.top) / Math.max(bounds.height, 1)) * 2 + 1)
    cameraPointerX = pointer.x
    cameraPointerY = pointer.y
    raycaster.setFromCamera(pointer, camera)
    let requestedSurface: ClimbSurface | undefined
    for (const surface of climbSurfaces) {
      const surfaceHit = new THREE.Vector3()
      if (raycaster.ray.intersectPlane(surface.plane, surfaceHit)
        && surfaceHit.x >= surface.bounds[0] && surfaceHit.x <= surface.bounds[1]
        && surfaceHit.z >= surface.bounds[2] && surfaceHit.z <= surface.bounds[3]) {
        requestedSurface = surface
        break
      }
    }
    const roofHit = raycaster.ray.intersectPlane(rooftopPlane, hitPoint)
    if (requestedSurface || roofHit) {
      const roofMargin = .85
      const pointerHit = requestedSurface ? undefined : hitPoint
      targetX = requestedSurface?.top.x ?? THREE.MathUtils.clamp(pointerHit!.x, -buildingWidth / 2 + roofMargin, buildingWidth / 2 - roofMargin)
      targetZ = requestedSurface?.top.z ?? THREE.MathUtils.clamp(pointerHit!.z, -buildingDepth / 2 + roofMargin, buildingDepth / 2 - roofMargin)
      targetY = requestedSurface?.top.y ?? roofY + .2
      const nextClimbId = requestedSurface?.id ?? null
      if (nextClimbId !== requestedClimbId) {
        requestedClimbId = nextClimbId
        if (route.length === 0) queueClimbRoute(nextClimbId)
      }
    }
  }
  window.addEventListener('pointermove', trackPointer, { passive: true })
  const resetPointer = () => { cameraPointerX = 0; cameraPointerY = 0 }
  host.addEventListener('pointerleave', resetPointer)

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const isNarrowViewport = window.matchMedia('(max-width: 720px)').matches
  const clock = new THREE.Clock()
  let animationFrame = 0, motionTimer = 0
  let lastSkyPaint = -10
  let lastDebugUpdate = -10
  let cameraPointerX = 0, cameraPointerY = 0
  const sunPosition = new THREE.Vector3(), moonPosition = new THREE.Vector3()
  const sunGlowOffset = new THREE.Vector3(0, 0, -.5), moonGlowOffset = new THREE.Vector3(0, 0, -.45)
  const moonShadeOffset = new THREE.Vector3(.38, .18, .28)
  const render = () => {
    const delta = Math.min(clock.getDelta(), .05)
    const elapsed = clock.elapsedTime
    const solar = calculateSolarState()
    const night = solar.nightAmount
    const warm = Math.max(0, Math.min(1, (Math.sin((solar.hour - 12) / 12 * Math.PI) + .15) * 1.1))
    pointOnViewPlane(.42 + solar.sunHorizontal * 1.08, .1 + solar.sunAltitude * .55, 74, sunPosition)
    pointOnViewPlane(.42 + solar.moonHorizontal * 1.08, .1 + solar.moonAltitude * .55, 73, moonPosition)
    celestial.position.copy(sunPosition)
    glow.position.copy(sunPosition).add(sunGlowOffset)
    moon.position.copy(moonPosition)
    celestialShade.position.copy(moonPosition).add(moonShadeOffset)
    moonGlow.position.copy(moonPosition).add(moonGlowOffset)
    const sunsetColor = mixHex(0xfff0c2, 0xff735c, warm)
    celestialMaterial.color.setHex(sunsetColor)
    glowMaterial.color.setHex(sunsetColor)
    celestialMaterial.opacity = solar.sunOpacity
    glowMaterial.opacity = solar.sunOpacity * (.28 + warm * .5)
    celestial.scale.setScalar(1.9 + warm * .75)
    glow.scale.setScalar(19 + warm * 11)
    moonMaterial.opacity = solar.moonOpacity * .96
    moonGlowMaterial.opacity = solar.moonOpacity * .38
    moonMaterial.color.setHex(mixHex(0xd8d7f2, 0xf5debf, 1 - night))
    starMaterial.opacity = .03 + night * .75
    sunLight.position.copy(sunPosition)
    sunLight.color.setHex(mixHex(0xffc887, 0xff704e, warm))
    sunLight.intensity = solar.sunIntensity * 1.8
    sunLight.shadow.radius = 2 + warm * 3 + night * 2
    ambientLight.color.setHex(mixHex(0xffdfcf, 0x9292bb, night))
    ambientLight.intensity = .45 + (1 - night) * .73
    atmosphereFog.color.setHex(mixHex(0x9b777d, 0x343247, night))
    cloudMaterial.color.setHex(mixHex(mixHex(0xc9c2c5, 0xeab09a, warm), 0x655d75, night))
    cloudMaterial.opacity = .4 + (1 - night) * .28
    skylineLit.opacity = .12 + night * .7
    facadeWindowWarm.opacity = .14 + night * .82
    facadeWindowWarm.color.setHex(mixHex(0xffd7a0, 0xffad69, night))
    facadeWindowOff.opacity = .48 + night * .35
    skylineMaterial.color.setHex(mixHex(0x66504d, 0x302a3a, night))
    buildingMaterial.color.setHex(mixHex(0x342a2b, 0x1b1a22, night))
    roofMaterial.color.setHex(mixHex(mixHex(0x655158, 0x91635e, warm), 0x443c4d, night))
    roofTrim.color.setHex(mixHex(0xb58c8f, 0x75637e, night))
    groundMaterial.color.setHex(mixHex(0x493a3d, 0x25232d, night))
    roadMaterial.color.setHex(mixHex(0x625154, 0x34323b, night))
    leafMaterial.color.setHex(mixHex(0x68775e, 0x55475e, night))
    serviceMaterial.color.setHex(mixHex(0x927b91, 0x766b86, night))
    serviceTopMaterial.color.setHex(mixHex(0xb98ca1, 0x8d7890, night))
    catMaterial.color.setHex(mixHex(0xbba3c2, 0xb3a4c8, night))
    if (elapsed * 1000 - lastSkyPaint > 650) { lastSkyPaint = elapsed * 1000; paintSky(solar) }
    celestialShade.visible = solar.moonOpacity > .01
    if (elapsed - lastDebugUpdate > .75) {
      lastDebugUpdate = elapsed
      host.dataset.solarTime = `${Math.floor(solar.hour).toString().padStart(2, '0')}:${Math.floor((solar.hour % 1) * 60).toString().padStart(2, '0')}`
      host.dataset.solarPhase = solar.phase
      host.dataset.sunX = sunPosition.x.toFixed(1); host.dataset.sunY = sunPosition.y.toFixed(1); host.dataset.sunZ = sunPosition.z.toFixed(1)
      host.dataset.sunIntensity = solar.sunIntensity.toFixed(2)
      host.dataset.catX = cat.position.x.toFixed(1); host.dataset.catY = cat.position.y.toFixed(1); host.dataset.catZ = cat.position.z.toFixed(1)
    }

    const reducedParallax = prefersReducedMotion ? .06 : isNarrowViewport ? .14 : .34
    camera.position.x += (11 + cameraPointerX * reducedParallax - camera.position.x) * Math.min(1, delta * 2.2)
    camera.position.y += (32.5 - cameraPointerY * reducedParallax * .65 - camera.position.y) * Math.min(1, delta * 2.2)
    camera.lookAt(target.x + cameraPointerX * .1, target.y - cameraPointerY * .08, target.z)
    if (!prefersReducedMotion) {
      for (const cloud of clouds) {
        const wrappedX = THREE.MathUtils.euclideanModulo(cloud.x + elapsed * cloud.speed + cloud.span / 2, cloud.span) - cloud.span / 2
        pointOnViewPlane(wrappedX, cloud.y, cloud.distance, cloud.group.position)
        cloud.group.rotation.y = Math.sin(elapsed * .055 + cloud.x) * .022
      }
      for (const car of cars) {
        const distanceOnRoad = THREE.MathUtils.euclideanModulo(elapsed * car.speed, car.end - car.start)
        car.group.position.x = car.start + distanceOnRoad
      }
      for (const bird of birds) {
        const distanceAcrossSky = THREE.MathUtils.euclideanModulo(elapsed * bird.speed, bird.end - bird.start)
        pointOnViewPlane(bird.start + distanceAcrossSky, bird.y + Math.sin(elapsed * 2.1 + bird.phase) * .012, bird.distance, bird.group.position)
      }
      const waypoint = route[routeIndex]
      const destinationX = waypoint?.x ?? targetX
      const destinationY = waypoint?.y ?? targetY
      const destinationZ = waypoint?.z ?? targetZ
      const dx = destinationX - cat.position.x
      const dy = destinationY - cat.position.y
      const dz = destinationZ - cat.position.z
      const distance = Math.hypot(dx, dz)
      const isRunning = distance > .055 || Math.abs(dy) > .055
      if (isRunning) {
        const stride = Math.min(distance, delta * 3.1)
        if (distance > .001) {
          cat.position.x += dx / distance * stride
          cat.position.z += dz / distance * stride
          cat.rotation.y = Math.atan2(-dz, dx)
        }
        cat.position.y += dy * Math.min(1, delta * 5)
      }
      if (waypoint && distance < .09 && Math.abs(dy) < .09) {
        cat.position.set(waypoint.x, waypoint.y, waypoint.z)
        routeIndex += 1
        if (routeIndex >= route.length) {
          route = []
          routeIndex = 0
          activeClimbId = routeGoalClimbId
          if (activeClimbId !== requestedClimbId) queueClimbRoute(requestedClimbId)
        }
      }
      bodyGroup.position.y = isRunning ? .015 + Math.abs(Math.sin(elapsed * 14)) * .052 : Math.sin(elapsed * 2) * .008
      bodyGroup.scale.set(1 + (isRunning ? Math.sin(elapsed * 14) * .035 : Math.sin(elapsed * 1.8) * .012), 1 - (isRunning ? Math.abs(Math.sin(elapsed * 14)) * .035 : 0), 1)
      legs.forEach((leg, index) => {
        leg.rotation.z = isRunning ? Math.sin(elapsed * 14 + index * Math.PI / 2) * .48 : Math.sin(elapsed * 1.7 + index) * .015
      })
      tailPivot.rotation.z = Math.sin(elapsed * (isRunning ? 6 : 1.8)) * (isRunning ? .2 : .08)
      head.rotation.z = isRunning ? Math.sin(elapsed * 14) * .02 : 0
      glow.material.rotation = Math.sin(elapsed * .12) * .035
      shadow.position.x = cat.position.x
      shadow.position.y = cat.position.y - .055
      shadow.position.z = cat.position.z
      const shadowHeight = Math.max(0, cat.position.y - (roofY + .2))
      shadow.material.opacity = Math.max(.08, .31 - shadowHeight * .075)
      shadow.scale.set(1.4 + shadowHeight * .08, .9 + shadowHeight * .05, 1)
    }
    renderer.render(scene, camera)
    if (prefersReducedMotion) motionTimer = window.setTimeout(render, 250)
    else animationFrame = requestAnimationFrame(render)
  }
  render()

  return () => {
    cancelAnimationFrame(animationFrame)
    window.clearTimeout(motionTimer)
    window.removeEventListener('pointermove', trackPointer)
    host.removeEventListener('pointerleave', resetPointer)
    observer.disconnect()
    renderer.dispose()
    renderer.domElement.remove()
    glowTexture.dispose()
    skyTexture.dispose()
    scene.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
        object.geometry.dispose()
        const material = object.material
        if (Array.isArray(material)) material.forEach(item => item.dispose())
        else material.dispose()
      }
      if (object instanceof THREE.Sprite) object.material.dispose()
    })
  }
}

export default function HomeScene({ theme }: { theme: HomeTimeTheme }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const initialTheme = useRef(theme)
  const debugEnabled = import.meta.env.DEV && new URLSearchParams(window.location.search).get('debugScene') === 'true'
  const [debugTick, setDebugTick] = useState(0)
  const [debugPaused, setDebugPaused] = useState(false)

  useEffect(() => {
    let cancelled = false
    let cleanup: (() => void) | undefined
    void import('three').then(module => {
      if (cancelled || !hostRef.current) return
      const { WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, BoxGeometry, SphereGeometry, ConeGeometry, CylinderGeometry, PlaneGeometry, MeshStandardMaterial, MeshBasicMaterial, AmbientLight, DirectionalLight, CatmullRomCurve3, TubeGeometry, Vector2, Vector3, Raycaster, Sprite, SpriteMaterial, CanvasTexture, BufferGeometry, Float32BufferAttribute, Points, PointsMaterial, DoubleSide, CircleGeometry, AdditiveBlending, Clock, MathUtils, TorusGeometry, Plane, PCFSoftShadowMap, Fog } = module
      cleanup = mountHomeScene(hostRef.current, initialTheme.current, { WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, BoxGeometry, SphereGeometry, ConeGeometry, CylinderGeometry, PlaneGeometry, MeshStandardMaterial, MeshBasicMaterial, AmbientLight, DirectionalLight, CatmullRomCurve3, TubeGeometry, Vector2, Vector3, Raycaster, Sprite, SpriteMaterial, CanvasTexture, BufferGeometry, Float32BufferAttribute, Points, PointsMaterial, DoubleSide, CircleGeometry, AdditiveBlending, Clock, MathUtils, TorusGeometry, Plane, PCFSoftShadowMap, Fog })
    }).catch(() => undefined)
    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [])

  useEffect(() => {
    if (!debugEnabled) return
    const interval = window.setInterval(() => setDebugTick(value => value + 1), 1000)
    return () => window.clearInterval(interval)
  }, [debugEnabled])

  const state = calculateSolarState()
  const readout = (key: string) => hostRef.current?.dataset[key] ?? '—'
  const setTime = (hour: number) => { setDebugSolarHour(hour); setDebugPaused(true); setDebugTick(value => value + 1) }
  return <Fragment>
    <div ref={hostRef} className="home-scene" aria-hidden="true" />
    {debugEnabled && <aside className="home-scene-debug" aria-label="Homepage scene developer controls">
      <strong>SCENE DEBUG</strong><span>Local time <b>{readout('solarTime')}</b></span><span>Phase <b>{state.phase}</b></span>
      <span>Sun XYZ <b>{readout('sunX')}, {readout('sunY')}, {readout('sunZ')}</b></span><span>Sun intensity <b>{readout('sunIntensity')}</b></span>
      <span>Sunrise / sunset <b>06:00 / 18:00</b></span><span>Cat XYZ <b>{readout('catX')}, {readout('catY')}, {readout('catZ')}</b></span>
      <div><button type="button" onClick={() => { debugPaused ? resumeSolarClock() : pauseSolarClock(); setDebugPaused(!debugPaused); setDebugTick(value => value + 1) }}>{debugPaused ? 'Resume time' : 'Pause time'}</button><button type="button" onClick={() => { shiftSolarClock(-1); setDebugPaused(true); setDebugTick(value => value + 1) }}>−1 hour</button><button type="button" onClick={() => { shiftSolarClock(1); setDebugPaused(true); setDebugTick(value => value + 1) }}>+1 hour</button></div>
      <div>{[['Sunrise', 6], ['Noon', 12], ['Sunset', 18], ['Midnight', 0]].map(([label, hour]) => <button type="button" key={label} onClick={() => setTime(Number(hour))}>{label}</button>)}</div>
      <i hidden>{debugTick}</i>
    </aside>}
  </Fragment>
}
