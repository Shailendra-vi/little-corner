import { useEffect, useRef } from 'react'
import type * as THREE from 'three'

export type RoomObject = {
  id: number
  kind: string
  label: string
  zone: string
  color: string
  done: boolean
  position: [number, number, number]
  rotation: number
}

type SceneProps = {
  items: RoomObject[]
  playing: boolean
  level: number
  cleanliness: number
  sortPulse: number
  focusItemId: number | null
  event: string | null
  onDrop: (id: number, zone: string | null) => void
  onHover: (id: number | null, x?: number, y?: number) => void
}
type SceneRefs = { current: SceneProps }
type Three = typeof import('three')
type ActiveObject = { item: RoomObject; group: THREE.Group; meshes: THREE.Mesh[]; shadow: THREE.Mesh; glowMaterial: THREE.MeshStandardMaterial }
type TargetZone = { id: string; group: THREE.Group; meshes: THREE.Mesh[]; hit: THREE.Mesh; ring: THREE.Mesh; center: THREE.Vector3 }
type DragState = { object: ActiveObject; start: THREE.Vector3; pointerId: number; lastX: number; velocity: number }
type Motion = { object: ActiveObject; from: THREE.Vector3; to: THREE.Vector3; start: number; duration: number; valid: boolean }
type Burst = { points: THREE.Points; started: number }

function mountRoom(host: HTMLDivElement, three: Three, props: SceneRefs) {
  let renderer: THREE.WebGLRenderer
  try { renderer = new three.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' }) } catch { return () => undefined }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6))
  renderer.setClearColor(0x211c26, 1)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = three.PCFSoftShadowMap
  renderer.toneMapping = three.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.12
  renderer.domElement.className = 'clean-room-scene-canvas'
  renderer.domElement.setAttribute('aria-label', 'Interactive 3D bedroom. Drag the room clutter onto matching furniture.')
  renderer.domElement.tabIndex = 0
  host.appendChild(renderer.domElement)

  const scene = new three.Scene()
  scene.background = new three.Color(0x282531)
  scene.fog = new three.Fog(0x282531, 24, 43)
  const camera = new three.PerspectiveCamera(39, 1, .1, 100)
  const cameraBase = { y: 11.6, z: 20.5 }
  camera.position.set(0, cameraBase.y, cameraBase.z)
  const lookAt = new three.Vector3(0, 1.6, -.65)
  camera.lookAt(lookAt)
  const raycaster = new three.Raycaster()
  const pointer = new three.Vector2()
  const floorPlane = new three.Plane(new three.Vector3(0, 1, 0), -.05)
  const groundPoint = new three.Vector3()
  const objects = new Map<number, ActiveObject>(), bursts: Burst[] = []
  const targets: TargetZone[] = []
  const itemMeshes: THREE.Mesh[] = []
  let drag: DragState | null = null, motion: Motion | null = null, raf = 0
  let pointerX = 0, pointerY = 0, lastSortPulse = 0, lastFocusItemId: number | null = null, hovered = -1
  const colorWork = new three.Color(), wallDark = new three.Color(0x665660), wallLight = new three.Color(0x83746d), quiltDark = new three.Color(0x7c657c), quiltLight = new three.Color(0xb49a8e), floorDark = new three.Color(0x735f5c), floorLight = new three.Color(0x958276), scaleWork = new three.Vector3()

  const mat = (color: number | string, roughness = .83, metalness = .01) => new three.MeshStandardMaterial({ color, roughness, metalness })
  const wood = mat(0x806352), edgeWood = mat(0xa17d67), wallMat = mat(0x665660), floorMat = mat(0x735f5c), quilt = mat(0x7c657c), pale = mat(0xe2d1c3)
  const standard = (geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D, position: [number, number, number], cast = true) => {
    const mesh = new three.Mesh(geometry, material); mesh.position.set(...position); mesh.castShadow = cast; mesh.receiveShadow = true; parent.add(mesh); return mesh
  }
  const box = (parent: THREE.Object3D, size: [number, number, number], material: THREE.Material, position: [number, number, number], cast = true) => standard(new three.BoxGeometry(...size), material, parent, position, cast)
  const group = (parent: THREE.Object3D, position: [number, number, number] = [0, 0, 0]) => { const result = new three.Group(); result.position.set(...position); parent.add(result); return result }

  // Room shell and warm boards keep the floor readable as the primary play surface.
  box(scene, [18, .32, 14], floorMat, [0, -.19, 0], false)
  for (let i = -8; i <= 8; i += 1) box(scene, [ .018, .012, 13.8], mat(i % 2 ? 0x5d4b4b : 0x94776a), [i * 1.08, -.018, 0], false)
  box(scene, [18, 9.2, .32], wallMat, [0, 4.55, -7.05], false)
  box(scene, [.32, 9.2, 14], mat(0x554752), [-9.05, 4.55, 0], false)
  box(scene, [.18, .22, 14], edgeWood, [-8.82, .08, 0], false)
  box(scene, [18, .22, .18], edgeWood, [0, .08, -6.83], false)
  // A late-evening window, curtains and a bright pool of sun on the floor.
  const windowGroup = group(scene, [0, 5.35, -6.82])
  box(windowGroup, [5.35, 3.7, .18], mat(0x2b3042, .32), [0, 0, -.12], false)
  box(windowGroup, [5.03, 3.38, .08], new three.MeshStandardMaterial({ color: 0x687d9b, emissive: 0x303c5c, emissiveIntensity: .28, roughness: .25, metalness: .1 }), [0, 0, -.02], false)
  box(windowGroup, [.1, 3.35, .1], edgeWood, [0, 0, .06], false); box(windowGroup, [5.05, .1, .1], edgeWood, [0, 0, .06], false)
  for (let i = 0; i < 10; i += 1) { const h = .55 + (i * 7 % 5) * .3; box(windowGroup, [.28, h, .04], mat(0x353648), [-2.2 + i * .48, -1.61 + h / 2, .03], false); if (i % 2 === 0) box(windowGroup, [.07, .07, .03], mat(0xf4bb78), [-2.1 + i * .48, -1.32, .06], false) }
  standard(new three.SphereGeometry(.38, 18, 14), new three.MeshBasicMaterial({ color: 0xffe7bd }), windowGroup, [-1.45, .88, .08], false)
  const curtains: THREE.Group[] = []
  for (const x of [-2.72, 2.72]) { const curtain = group(windowGroup, [x, 0, .18]); box(curtain, [.72, 3.95, .22], mat(0x7b5a6c), [x < 0 ? .3 : -.3, -.04, 0]); box(curtain, [.12, 3.98, .25], edgeWood, [x < 0 ? .67 : -.67, -.04, .01]); curtains.push(curtain) }
  const sunPoolMat = new three.MeshBasicMaterial({ color: 0xf5c58d, transparent: true, opacity: .13, depthWrite: false })
  const sunPool = standard(new three.CircleGeometry(1, 40), sunPoolMat, scene, [-1.8, .006, 1.3], false); sunPool.rotation.x = -Math.PI / 2; sunPool.scale.set(4.8, 2.2, 1)
  // Rug and furniture. Their actual meshes are also the six drop destinations.
  const rug = box(scene, [6.9, .035, 4.5], mat(0x8c6c7d), [0, .005, 2.15], false); rug.rotation.y = -.08
  const bed = group(scene, [-4.55, 0, -1.85])
  box(bed, [4.4, .55, 4.7], wood, [0, .52, 0]); box(bed, [4.25, .2, 4.48], pale, [0, .91, .02]); box(bed, [4.28, .18, 2.65], quilt, [0, 1.08, .78]); box(bed, [4.34, .13, 1.25], mat(0x675568), [0, 1.13, -.88]); box(bed, [1.35, .26, .82], mat(0xe6d9cb), [-1.18, 1.13, -1.6]); box(bed, [1.35, .26, .82], mat(0xd8c5bb), [.42, 1.13, -1.58])
  box(bed, [4.6, 2.0, .28], wood, [0, 1.1, -2.28]);
  const desk = group(scene, [4.12, 0, -3.75])
  box(desk, [4.0, .2, 1.7], edgeWood, [0, 1.72, 0]); for (const x of [-1.72, 1.72]) for (const z of [-.65, .65]) box(desk, [.13, 1.68, .13], wood, [x, .84, z])
  box(desk, [1.35, .93, .11], mat(0x303340, .35), [-.68, 2.32, -.57]); box(desk, [1.18, .73, .035], mat(0x62708a, .22), [-.68, 2.34, -.49], false); box(desk, [.12, .3, .12], edgeWood, [-.68, 1.9, -.56]); box(desk, [1.9, .07, .58], mat(0x3f3a43), [.15, 1.86, .34]); for (let i = 0; i < 12; i += 1) box(desk, [.1, .035, .1], pale, [-.72 + (i % 6) * .22, 1.915, .2 + Math.floor(i / 6) * .17], false)
  const lamp = group(desk, [1.22, 1.83, -.38]); standard(new three.CylinderGeometry(.23, .27, .08, 12), mat(0x38323a), lamp, [0, 0, 0]); standard(new three.CylinderGeometry(.045, .06, .67, 10), edgeWood, lamp, [0, .36, 0]); const shade = standard(new three.ConeGeometry(.34, .38, 12, 1, true), mat(0xd7ae7c), lamp, [.08, .73, 0]); shade.rotation.z = Math.PI
  const mug = group(desk, [-1.42, 1.82, .34]); standard(new three.CylinderGeometry(.14, .12, .27, 12), mat(0xd8c2a9), mug, [0,.14,0]); standard(new three.TorusGeometry(.1,.028,8,14), mat(0xd8c2a9), mug, [.13,.16,0])
  const lampLight = new three.PointLight(0xffc783, 28, 10, 1.8); lampLight.position.set(4.5, 3.45, -3.9); lampLight.castShadow = false; scene.add(lampLight)
  const wardrobe = group(scene, [7.1, 0, -4.05]); box(wardrobe, [2.35, 4.45, 1.35], wood, [0, 2.25, 0]); box(wardrobe, [2.19, 4.22, .11], edgeWood, [0, 2.25, .72]); box(wardrobe, [.025, 4.12, .025], wood, [0, 2.25, .79]); for (const x of [-.18, .18]) standard(new three.SphereGeometry(.06, 10, 8), mat(0xe0bf91, .35, .4), wardrobe, [x, 2.22, .83])
  const shelf = group(scene, [-7.2, 0, -4.7]); for (let y = .45; y < 4.1; y += 1.18) { box(shelf, [2.55, .13, .78], edgeWood, [0, y, 0]); for (let j = 0; j < 4; j += 1) { const book = box(shelf, [.32, .7 + (j % 2) * .16, .48], mat([0x8b6271,0x83918e,0xb39069,0x64748c][(j + Math.round(y)) % 4]), [-.88 + j * .53, y + .39, .02]); book.rotation.z = (j % 2 ? -.06 : .035) } }
  // Nightstand, tilted chair, laundry basket, waste bin, plant and crooked posters.
  const nightstand = group(scene, [-1.45, 0, -3.75]); box(nightstand, [1.25, .9, 1], wood, [0, .48, 0]); box(nightstand, [1.32, .12, 1.08], edgeWood, [0, .98, 0]); box(nightstand, [.75, .035, .05], pale, [0, .62, .52], false)
  const chair = group(scene, [3.45, 0, -.55]); chair.rotation.y = -.23; box(chair, [1.15, .18, 1.05], mat(0x715d70), [0, 1.2, 0]); box(chair, [1.15, 1.4, .17], mat(0x68566a), [0, 1.95, -.42]); for (const x of [-.42, .42]) { box(chair, [.08, 1.12, .08], wood, [x, .58, -.36]); box(chair, [.08, 1.12, .08], wood, [x, .58, .36]) }
  const basket = group(scene, [-6.2, 0, 2.15]); standard(new three.CylinderGeometry(.52, .42, .78, 12, 1, true), mat(0xa78270), basket, [0, .42, 0]); standard(new three.TorusGeometry(.5, .055, 8, 16), edgeWood, basket, [0, .8, 0]); for (let i = 0; i < 9; i += 1) { const slat = box(basket, [.055, .62, .055], edgeWood, [Math.cos(i * Math.PI * 2 / 9) * .43, .4, Math.sin(i * Math.PI * 2 / 9) * .43]); slat.rotation.y = -i * Math.PI * 2 / 9 }
  const bin = group(scene, [6.35, 0, 1.6]); standard(new three.CylinderGeometry(.42, .33, .9, 12), mat(0x6f6372), bin, [0, .45, 0]); standard(new three.CylinderGeometry(.45, .45, .09, 12), edgeWood, bin, [0, .93, 0])
  const backpack=group(scene,[2.25,0,1.15]);const bag=standard(new three.BoxGeometry(.72,.86,.4),mat(0x647284),backpack,[0,.45,0]);bag.rotation.z=-.1;standard(new three.TorusGeometry(.18,.035,7,14,Math.PI),mat(0x504a56),backpack,[0,.86,-.02]);box(backpack,[.38,.32,.11],mat(0x826d77),[0,.3,.22]);
  const slippers=group(scene,[-2.35,0,2.45]);for(const x of [-.23,.23]){const sole=box(slippers,[.62,.08,.25],mat(0xbaa07d),[x,.06,0]);sole.rotation.y=x>0?.13:-.12;const upper=box(slippers,[.34,.1,.2],mat(0x8b657a),[x,.12,-.015]);upper.rotation.y=x>0?.13:-.12}
  const plant = group(scene, [-7.5, 0, 2.35]); standard(new three.CylinderGeometry(.32, .25, .52, 10), mat(0xb17f66), plant, [0, .26, 0]); for (let i = 0; i < 6; i += 1) { const leaf = standard(new three.SphereGeometry(.35, 10, 7), mat(i % 2 ? 0x61765e : 0x84956d), plant, [Math.cos(i) * .36, .96 + (i % 3) * .1, Math.sin(i) * .3]); leaf.scale.set(.52, 1.2, .48); leaf.rotation.z = (i - 2) * .2 }
  const living = group(scene, [0, 0, 0]);
  const sofa = group(living, [-.5, 0, -1.65]); box(sofa, [4.2, .48, 1.5], mat(0x716274), [0, .58, 0]); box(sofa, [4.2, 1.35, .38], mat(0x877488), [0, 1.25, -.55]); for (const x of [-1.92, 1.92]) box(sofa, [.38, .92, 1.28], mat(0x79697e), [x, .78, .05]); for (const x of [-1.15, 0, 1.15]) box(sofa, [1.02, .22, .78], mat(x===0?0xb28f8a:0x9c879e), [x, .92, -.04]);
  const coffee = group(living, [0, 0, 0]); box(coffee, [2.3, .14, 1.2], edgeWood, [-.25, .63, 1.05]); for(const x of [-1.15,.65])for(const z of [.62,1.48])box(coffee,[.09,.6,.09],wood,[x,.31,z]);
  const kitchen = group(scene, [0, 0, 0]);
  const counters = group(kitchen, [0,0,0]); box(counters,[5.2,1.48,.92],mat(0x64716f),[-.7,.75,-2.65]); box(counters,[5.45,.16,1.1],mat(0xd5c8b5),[-.7,1.55,-2.65]); for(let i=0;i<4;i++){box(counters,[1.22,.9,.08],edgeWood,[-2.65+i*1.3,.75,-2.15]);box(counters,[.45,.045,.035],pale,[-2.65+i*1.3,.9,-2.1],false)}
  const fridge=group(kitchen,[4.3,0,-3.1]);box(fridge,[1.55,3.8,1.2],mat(0xaeb4b1,.4),[0,1.9,0]);box(fridge,[.06,1.1,.08],edgeWood,[.55,2.45,.65]);box(fridge,[.06,.8,.08],edgeWood,[.55,1.05,.65]);
  const study = group(scene,[0,0,0]); const longDesk=group(study,[-.3,0,-2.9]);box(longDesk,[5.3,.2,1.6],edgeWood,[0,1.68,0]);for(const x of [-2.25,2.25])for(const z of [-.62,.62])box(longDesk,[.15,1.65,.15],wood,[x,.82,z]);box(longDesk,[4.8,1.9,.14],mat(0x5a4a5f),[0,3.15,-.7]);for(let i=0;i<5;i++)box(longDesk,[.37,.62,.5],mat([0x8b6271,0x83918e,0xb39069,0x64748c,0x917a72][i]),[-1.8+i*.9,2.25,-.58]);
  const frame1 = group(scene, [-4.6, 5.7, -6.82]); frame1.rotation.z = .045; box(frame1, [1.6, 1.12, .09], edgeWood, [0, 0, 0], false); box(frame1, [1.38, .9, .035], mat(0x8c7387), [0, 0, .06], false); standard(new three.SphereGeometry(.22, 12, 10), mat(0xd2aa86), frame1, [.2, -.1, .11], false)
  const frame2 = group(scene, [4.35, 5.15, -6.82]); frame2.rotation.z = -.06; box(frame2, [1.18, 1.45, .08], edgeWood, [0, 0, 0], false); box(frame2, [1.0, 1.27, .035], mat(0x778294), [0, 0, .06], false)

  // Clickable, slightly glowing destination patches sit on actual furniture surfaces.
  const targetData: Array<{ id: string; position: [number, number, number]; size: [number, number, number]; floor: [number, number, number] }> = [
    { id: 'wardrobe', position: [7.1, 2.65, -4.05], size: [2.55, 4.7, 1.8], floor: [7.1, .035, -2.85] },
    { id: 'desk', position: [4.12, 1.85, -3.75], size: [4.25, .65, 2.1], floor: [4.12, .035, -2.35] },
    { id: 'trash', position: [6.35, .58, 1.6], size: [1.15, 1.4, 1.2], floor: [6.35, .035, 2.35] },
    { id: 'bed', position: [-4.55, 1.05, -1.85], size: [4.65, .9, 4.95], floor: [-4.55, .035, .8] },
    { id: 'shelf', position: [-7.2, 2.35, -4.7], size: [2.85, 4.7, 1.2], floor: [-7.2, .035, -3.45] },
    { id: 'laundry', position: [-6.2, .58, 2.15], size: [1.35, 1.25, 1.35], floor: [-6.2, .035, 2.95] },
  ]
  for (const data of targetData) {
    const g = group(scene, data.position)
    const hit = box(g, data.size, new three.MeshBasicMaterial({ transparent: true, opacity: 0, colorWrite: false, depthWrite: false, side: three.DoubleSide }), [0, 0, 0], false)
    hit.userData.zone = data.id
    const ring = standard(new three.TorusGeometry(.72, .045, 8, 38), new three.MeshBasicMaterial({ color: 0xb9daae, transparent: true, opacity: 0, depthWrite: false }), scene, data.floor, false); ring.rotation.x = Math.PI / 2; ring.scale.set(1.4, .75, 1)
    targets.push({ id: data.id, group: g, meshes: g.children.filter((child): child is THREE.Mesh => child instanceof three.Mesh), hit, ring, center: new three.Vector3(...data.position) })
  }
  const laundryZone = targets.find(target => target.id === 'laundry')!
  const vacuum = group(scene, [-12, 0, 4.8]);
  standard(new three.CylinderGeometry(.38, .43, .42, 12), mat(0x71627a, .45), vacuum, [0, .35, 0]); standard(new three.TorusGeometry(.36, .045, 8, 16), mat(0xb7a28c), vacuum, [0, .58, 0]);
  const hoseCurve = new three.CatmullRomCurve3([new three.Vector3(.25,.45,0),new three.Vector3(.42,.83,0),new three.Vector3(.74,.86,0),new three.Vector3(.86,.33,0)]); standard(new three.TubeGeometry(hoseCurve,20,.035,7,false), mat(0x493f50), vacuum, [0,0,0]);
  for (const x of [-.25,.25]) standard(new three.SphereGeometry(.1,10,8), mat(0x2f2a32), vacuum, [x,.08,.03]);
  vacuum.visible=false

  // Soft dust catches the window light; restrained fog adds depth without hiding the floor.
  const dustCount = 72, dustGeometry = new three.BufferGeometry(), dustPositions = new Float32Array(dustCount * 3)
  for (let i = 0; i < dustCount; i += 1) { dustPositions[i * 3] = (Math.random() - .5) * 15; dustPositions[i * 3 + 1] = Math.random() * 7; dustPositions[i * 3 + 2] = Math.random() * 10 - 5 }
  dustGeometry.setAttribute('position', new three.Float32BufferAttribute(dustPositions, 3)); const dust = new three.Points(dustGeometry, new three.PointsMaterial({ color: 0xffe2bd, size: .045, transparent: true, opacity: .42, depthWrite: false })); scene.add(dust)
  const ambient = new three.AmbientLight(0xc5b7cd, 1.15); scene.add(ambient)
  const sunlight = new three.DirectionalLight(0xffcf9c, 3.1); sunlight.position.set(-5.5, 10, 4.2); sunlight.target.position.set(0, 0, -1); sunlight.castShadow = true; sunlight.shadow.mapSize.set(1536, 1536); sunlight.shadow.camera.left = -11; sunlight.shadow.camera.right = 11; sunlight.shadow.camera.top = 10; sunlight.shadow.camera.bottom = -9; sunlight.shadow.bias = -.00025; scene.add(sunlight, sunlight.target)

  function makeObject(item: RoomObject): ActiveObject {
    const g = group(scene, item.position), meshes: THREE.Mesh[] = [], objectMat = mat(item.color, .58)
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number], scale?: [number, number, number]) => { const mesh = standard(geometry, material, g, at); if (scale) mesh.scale.set(...scale); meshes.push(mesh); mesh.userData.itemId = item.id; itemMeshes.push(mesh); return mesh }
    const baseY = 0
    if (item.kind === 'books') { const b = add(new three.BoxGeometry(.48, .1, .36), objectMat, [0, baseY + .055, 0]); b.rotation.y = .28; add(new three.BoxGeometry(.42, .018, .34), pale, [0, baseY + .11, 0]) }
    else if (item.kind === 'shoes') { add(new three.BoxGeometry(.68, .1, .31), mat(0xe6d8ca), [0, .07, 0]); const toe = add(new three.SphereGeometry(.2, 12, 9), objectMat, [.2, .17, 0], [1.35, .62, .78]); toe.rotation.z = .08; add(new three.BoxGeometry(.35, .19, .3), objectMat, [-.13, .17, 0]); for (let i = 0; i < 3; i += 1) add(new three.BoxGeometry(.19, .018, .025), pale, [-.08 + i * .04, .28, .13]) }
    else if (item.kind === 'bottle') { const body = add(new three.CylinderGeometry(.14, .16, .58, 12), objectMat, [0, .18, 0]); body.rotation.z = Math.PI / 2; add(new three.CylinderGeometry(.075, .075, .13, 10), mat(0xd8c5a7), [.34, .18, 0]).rotation.z = Math.PI / 2; add(new three.BoxGeometry(.18, .14, .015), pale, [0, .18, .145], [.9, .8, 1]) }
    else if (item.kind === 'charger') { add(new three.BoxGeometry(.28, .14, .25), mat(0xd4c9c0), [0, .1, 0]); const cableCurve = new three.CatmullRomCurve3([new three.Vector3(.1,.08,.03),new three.Vector3(.35,.05,.18),new three.Vector3(.52,.06,-.08),new three.Vector3(.3,.05,-.25)]); add(new three.TubeGeometry(cableCurve, 16, .025, 6, false), mat(0x534a58), [0,0,0]); add(new three.BoxGeometry(.13,.09,.12), mat(0xdacdbf), [.36,.08,-.22]) }
    else if (item.kind === 'headphones') { const band = add(new three.TorusGeometry(.27, .045, 8, 22, Math.PI), mat(0x39343e), [0,.24,0]); band.rotation.z = Math.PI; for (const x of [-.25,.25]) { add(new three.BoxGeometry(.15,.25,.2), objectMat, [x,.1,0]); add(new three.BoxGeometry(.11,.18,.04), pale, [x,.1,.11]) } void band }
    else if (item.kind === 'receipt') { const paper = add(new three.BoxGeometry(.29,.025,.4), mat(0xf0e3cc), [0,.035,0]); paper.rotation.y = .32; for (let i=0;i<3;i+=1) { const line=add(new three.BoxGeometry(.17,.008,.012), mat(0x95847e), [.015,.05,-.08+i*.065]); line.rotation.y=.32 } }
    else if (item.kind === 'socks') { for (const x of [-.13,.13]) { const s=add(new three.CapsuleGeometry(.085,.26,4,8), objectMat, [x,.1,x*.4]); s.rotation.z = x < 0 ? -.7 : .6; add(new three.BoxGeometry(.16,.06,.13), pale, [x+.05,.08,.13]) } }
    else if (item.kind === 'clothes') { const shirt=add(new three.BoxGeometry(.62,.105,.52), objectMat, [0,.07,0]); shirt.rotation.y=.21; add(new three.BoxGeometry(.22,.08,.35), objectMat, [-.37,.065,.02]); add(new three.BoxGeometry(.22,.08,.35), objectMat, [.37,.065,.02]); add(new three.BoxGeometry(.2,.018,.08), pale, [0,.13,-.03]) }
    else if (item.kind === 'toy') { add(new three.SphereGeometry(.22,12,10), mat(0xb98669), [0,.23,0]); add(new three.SphereGeometry(.16,12,10), mat(0xc99978), [0,.52,0]); for(const x of [-.12,.12]) add(new three.SphereGeometry(.075,10,8), mat(0xc99978), [x,.65,0]); add(new three.SphereGeometry(.025,8,6), mat(0x312a32), [-.06,.54,.14]); add(new three.SphereGeometry(.025,8,6), mat(0x312a32), [.06,.54,.14]); for(const x of [-.18,.18]) add(new three.SphereGeometry(.08,9,7), mat(0xb98669), [x,.08,0]) }
    else if (item.kind === 'cable') { const curve = new three.CatmullRomCurve3([new three.Vector3(-.42,.035,-.08),new three.Vector3(-.3,.04,.22),new three.Vector3(.12,.04,.22),new three.Vector3(.35,.04,.08),new three.Vector3(.28,.04,-.16),new three.Vector3(-.12,.04,-.18),new three.Vector3(-.35,.04,-.06)]); add(new three.TubeGeometry(curve, 42, .035, 7, false), objectMat, [0,0,0]); add(new three.BoxGeometry(.12,.07,.1), pale, [-.45,.045,-.08]); add(new three.BoxGeometry(.12,.07,.1), pale, [.34,.045,.08]) }
    else { const foil = add(new three.IcosahedronGeometry(.32,1), objectMat, [0,.18,0], [1.3,.5,.72]); foil.rotation.set(.2,item.rotation,.1); add(new three.BoxGeometry(.26,.025,.2), pale, [.02,.27,.02]) }
    g.rotation.y = item.rotation; g.userData.itemId = item.id
    const shadow = standard(new three.CircleGeometry(.48, 22), new three.MeshBasicMaterial({ color: 0x17131b, transparent: true, opacity: .26, depthWrite: false }), scene, [item.position[0], .012, item.position[2]], false); shadow.rotation.x = -Math.PI/2; shadow.scale.set(.9,.58,1)
    return { item, group: g, meshes, shadow, glowMaterial: objectMat }
  }

  const raycast = (event: PointerEvent, candidates: THREE.Object3D[]) => {
    const rect = renderer.domElement.getBoundingClientRect()
    pointer.set(((event.clientX-rect.left)/rect.width)*2-1, -((event.clientY-rect.top)/rect.height)*2+1)
    raycaster.setFromCamera(pointer,camera)
    return raycaster.intersectObjects(candidates,true)
  }
  const notifyHover = (id: number | null) => {
    if (id === null) { props.current.onHover(null); return }
    const object=objects.get(id); if(!object){props.current.onHover(id);return}
    const projected=object.group.position.clone().add(new three.Vector3(0,.45,0)).project(camera),rect=renderer.domElement.getBoundingClientRect()
    props.current.onHover(id,(projected.x*.5+.5)*rect.width,(-projected.y*.5+.5)*rect.height)
  }
  const onMove = (event: PointerEvent) => {
    const rect=renderer.domElement.getBoundingClientRect(); pointerX=((event.clientX-rect.left)/rect.width-.5)*2; pointerY=((event.clientY-rect.top)/rect.height-.5)*2
    if (drag && drag.pointerId === event.pointerId) {
      raycast(event,[]); if (raycaster.ray.intersectPlane(floorPlane,groundPoint)) { groundPoint.x=three.MathUtils.clamp(groundPoint.x,-8.25,8.25);groundPoint.z=three.MathUtils.clamp(groundPoint.z,-6.25,6.25);drag.object.group.userData.dragTarget = new three.Vector3(groundPoint.x,drag.object.group.position.y,groundPoint.z); drag.velocity=groundPoint.x-drag.lastX; drag.lastX=groundPoint.x }
      return
    }
    if (!props.current.playing) { renderer.domElement.style.cursor='default'; return }
    const hits=raycast(event,itemMeshes); const id=hits.length ? hits[0].object.userData.itemId as number : -1
    renderer.domElement.style.cursor=id>=0?'grab':'default'
    if (id!==hovered) { hovered=id; notifyHover(id>=0?id:null) }
  }
  const onDown = (event: PointerEvent) => {
    if (!props.current.playing || motion) return
    const hits=raycast(event,itemMeshes); const hit=hits.find(result => result.object.userData.itemId !== undefined)
    if (!hit) return
    const id=hit.object.userData.itemId as number, object=objects.get(id); if (!object) return
    renderer.domElement.setPointerCapture(event.pointerId); renderer.domElement.style.cursor='grabbing'
    drag={object,start:object.group.position.clone(),pointerId:event.pointerId,lastX:object.group.position.x,velocity:0}; object.group.userData.dragTarget=object.group.position.clone(); object.group.scale.setScalar(1.08); object.group.position.y+=.24; if(object.shadow.material instanceof three.MeshBasicMaterial) object.shadow.material.opacity=.13
    targets.forEach(target => { const valid=target.id===object.item.zone; (target.ring.material as THREE.MeshBasicMaterial).opacity=valid?.82:0 })
    hovered=id; notifyHover(id)
    event.preventDefault()
  }
  const onUp = (event: PointerEvent) => {
    if (!drag || drag.pointerId!==event.pointerId) return
    const active=drag; drag=null; renderer.domElement.style.cursor='grab'
    const hits=raycast(event,targets.map(target=>target.hit)); const zone=hits.length ? hits[0].object.userData.zone as string : null
    const target=targets.find(candidate=>candidate.id===zone), valid=zone===active.object.item.zone
    const destination=valid && target ? target.center.clone() : active.start.clone()
    destination.y=active.start.y
    motion={object:active.object,from:active.object.group.position.clone(),to:destination,start:performance.now(),duration:valid?420:310,valid}
    if(valid&&target){const geometry=new three.BufferGeometry(),positions=new Float32Array(54);for(let i=0;i<18;i++){const angle=i*Math.PI*2/18,radius=.16+(i%3)*.06;positions[i*3]=Math.cos(angle)*radius;positions[i*3+1]=.14+(i%4)*.07;positions[i*3+2]=Math.sin(angle)*radius}geometry.setAttribute('position',new three.Float32BufferAttribute(positions,3));const points=new three.Points(geometry,new three.PointsMaterial({color:0xf5d9a8,size:.09,transparent:true,opacity:.9,depthWrite:false}));points.position.copy(destination);scene.add(points);bursts.push({points,started:performance.now()})}
    targets.forEach(candidate=>{(candidate.ring.material as THREE.MeshBasicMaterial).opacity=0})
    if (!valid) { active.object.group.userData.wrongUntil=performance.now()+320;if(target){target.ring.userData.rejectUntil=performance.now()+320;(target.ring.material as THREE.MeshBasicMaterial).color.setHex(0xd77e77);(target.ring.material as THREE.MeshBasicMaterial).opacity=.78}props.current.onDrop(active.object.item.id,zone) }
    else window.setTimeout(()=>props.current.onDrop(active.object.item.id,zone),420)
    hovered=-1; notifyHover(null)
    event.preventDefault()
  }
  const onCancel=()=>{ if(!drag)return; motion={object:drag.object,from:drag.object.group.position.clone(),to:drag.start.clone(),start:performance.now(),duration:260,valid:false}; drag=null; targets.forEach(candidate=>{(candidate.ring.material as THREE.MeshBasicMaterial).opacity=0}) }
  const onLeave=()=>{if(!drag){hovered=-1;notifyHover(null)}}
  renderer.domElement.addEventListener('pointermove',onMove); renderer.domElement.addEventListener('pointerdown',onDown); renderer.domElement.addEventListener('pointerup',onUp); renderer.domElement.addEventListener('pointercancel',onCancel); renderer.domElement.addEventListener('pointerleave',onLeave)

  const resize=()=>{const w=Math.max(host.clientWidth,1),h=Math.max(host.clientHeight,1);camera.aspect=w/h;cameraBase.z=camera.aspect<1.1?29:camera.aspect<1.55?24:camera.aspect>2.2?19:20.5;cameraBase.y=1.6+(cameraBase.z-(-.65))*((11.6-1.6)/(20.5+.65));camera.position.set(0,cameraBase.y,cameraBase.z);camera.updateProjectionMatrix();renderer.setSize(w,h,false)}
  const observer=new ResizeObserver(resize);observer.observe(host);resize()
  const clock=new three.Clock()
  const render=()=>{
    const t=clock.elapsedTime,dt=Math.min(clock.getDelta(),.05),clean=Math.max(0,Math.min(1,props.current.cleanliness))
    camera.position.x+=((drag?0:pointerX*.34)-camera.position.x)*Math.min(1,dt*.7); camera.position.y+=(cameraBase.y-(drag?0:pointerY*.12)-camera.position.y)*Math.min(1,dt*.7); camera.lookAt(lookAt.x+(drag?0:pointerX*.1),lookAt.y-(drag?0:pointerY*.07),lookAt.z)
    curtains.forEach((curtain,i)=>{curtain.rotation.z=Math.sin(t*.42+i)*.018*(1-clean*.82)}); lampLight.intensity=22+clean*18; ambient.intensity=1.05+clean*.38
    wallMat.color.copy(colorWork.copy(wallDark).lerp(wallLight,clean)); quilt.color.copy(colorWork.copy(quiltDark).lerp(quiltLight,clean)); floorMat.color.copy(colorWork.copy(floorDark).lerp(floorLight,clean*.55))
    const roomLevel=props.current.level;bed.visible=roomLevel===1;living.visible=roomLevel===2;kitchen.visible=roomLevel===3;study.visible=roomLevel===4
    const bedTarget=targets.find(target=>target.id==='bed')!
    const destinationPosition: [number,number,number]=roomLevel===2?[-.5,1,-1.65]:roomLevel===3?[-.7,1.58,-2.65]:roomLevel===4?[-.3,1.75,-2.9]:[-4.55,1.05,-1.85]
    bedTarget.group.position.set(...destinationPosition);bedTarget.center.set(...destinationPosition);bedTarget.ring.position.set(destinationPosition[0],.035,destinationPosition[2]+(roomLevel===1?2.65:1.35));bedTarget.hit.scale.set(roomLevel===3?.8:1,roomLevel===3?1.3:1,roomLevel===2?.38:roomLevel===3?.5:roomLevel===4?.38:1)
    const laundryShift=props.current.event==='laundry'?Math.sin(t*1.7)*.65:0; basket.position.x=-6.2+laundryShift; laundryZone.group.position.x=-6.2+laundryShift; laundryZone.center.x=-6.2+laundryShift; laundryZone.ring.position.x=-6.2+laundryShift
    vacuum.visible=props.current.event==='vacuum'; vacuum.position.x=props.current.event==='vacuum'?-12+((t*2.6)%1)*24:-12
    if(props.current.sortPulse!==lastSortPulse){lastSortPulse=props.current.sortPulse;objects.forEach(object=>{object.group.userData.pulseUntil=performance.now()+1800})}
    if(props.current.focusItemId!==lastFocusItemId){lastFocusItemId=props.current.focusItemId;const focused=lastFocusItemId===null?undefined:objects.get(lastFocusItemId);if(focused)focused.group.userData.pulseUntil=performance.now()+1800}
    const live=new Set(props.current.items.filter(item=>!item.done).map(item=>item.id))
    for(const [id,object] of objects){if(!live.has(id)){scene.remove(object.group);scene.remove(object.shadow);object.meshes.forEach(mesh=>{const at=itemMeshes.indexOf(mesh);if(at>=0)itemMeshes.splice(at,1);mesh.geometry.dispose()});object.glowMaterial.dispose();object.shadow.geometry.dispose();(object.shadow.material as THREE.Material).dispose();objects.delete(id)}}
    for(const item of props.current.items){if(!item.done&&!objects.has(item.id))objects.set(item.id,makeObject(item))}
    if(drag){const target=drag.object.group.userData.dragTarget as THREE.Vector3|undefined;if(target){drag.object.group.position.x+=(target.x-drag.object.group.position.x)*.34;drag.object.group.position.z+=(target.z-drag.object.group.position.z)*.34;drag.object.group.rotation.z+=(Math.max(-.18,Math.min(.18,drag.velocity*.12))-drag.object.group.rotation.z)*.16;drag.velocity*=.86}}
    if(motion){const p=Math.min(1,(performance.now()-motion.start)/motion.duration),ease=1-Math.pow(1-p,3);motion.object.group.position.lerpVectors(motion.from,motion.to,ease);motion.object.group.rotation.z*=.9;if(!motion.valid)motion.object.group.rotation.y=Math.sin(t*56)*.08*(1-p);motion.object.group.scale.setScalar(motion.valid?1.08*(1-ease*.8):1.08-.08*ease);motion.object.shadow.position.x=motion.object.group.position.x;motion.object.shadow.position.z=motion.object.group.position.z;if(p>=1){motion.object.group.scale.setScalar(1);motion=null}}
    for(const [id,object] of objects){const pulse=Number(object.group.userData.pulseUntil||0)>performance.now(),isDragged=drag?.object.item.id===id,isHovered=id===hovered&&!isDragged;const lift=isHovered ? .055 : 0;object.group.position.y+=(object.item.position[1]+lift+(isDragged ? .24 : 0)-object.group.position.y)*.18;const s=isDragged?1.08:pulse?1+Math.sin(t*10)*.06:isHovered?1.035:1;if(!motion){scaleWork.setScalar(s);object.group.scale.lerp(scaleWork,.18)}object.glowMaterial.emissive.setHex(isDragged?0x4b3957:isHovered?0x30273a:0x000000);object.glowMaterial.emissiveIntensity=isDragged?.48:isHovered?.26:0;object.shadow.position.x+=(object.group.position.x-object.shadow.position.x)*.28;object.shadow.position.z+=(object.group.position.z-object.shadow.position.z)*.28;if(object.shadow.material instanceof three.MeshBasicMaterial){object.shadow.material.opacity=isDragged?.1:isHovered?.4:.27;object.shadow.material.color.setHex(isHovered?0x75627b:0x17131b);object.shadow.scale.set(isHovered?1.14:.9,isHovered?.78:.58,1)}}
    for(const target of targets){const active=drag?.object.item.zone===target.id;const material=target.ring.material as THREE.MeshBasicMaterial;if(active){material.color.setHex(0xb9daae);material.opacity=.7+.18*Math.sin(t*6)}else if(Number(target.ring.userData.rejectUntil)>performance.now())material.opacity=.78;else material.opacity=0}
    for(let i=bursts.length-1;i>=0;i--){const burst=bursts[i],age=performance.now()-burst.started,material=burst.points.material as THREE.PointsMaterial;material.opacity=Math.max(0,.9-age/520);burst.points.scale.setScalar(1+age/500);if(age>540){scene.remove(burst.points);burst.points.geometry.dispose();material.dispose();bursts.splice(i,1)}}
    const pos=dust.geometry.getAttribute('position') as THREE.BufferAttribute;for(let i=0;i<dustCount;i++){const y=pos.getY(i)+dt*.12;pos.setY(i,y>7?0:y)}pos.needsUpdate=true
    if(sunPool.material instanceof three.MeshBasicMaterial)sunPool.material.opacity=.1+clean*.08
    renderer.render(scene,camera);raf=requestAnimationFrame(render)
  }
  render()
  return()=>{cancelAnimationFrame(raf);observer.disconnect();renderer.domElement.removeEventListener('pointermove',onMove);renderer.domElement.removeEventListener('pointerdown',onDown);renderer.domElement.removeEventListener('pointerup',onUp);renderer.domElement.removeEventListener('pointercancel',onCancel);renderer.domElement.removeEventListener('pointerleave',onLeave);renderer.dispose();renderer.domElement.remove();scene.traverse(child=>{if(child instanceof three.Mesh||child instanceof three.Points){child.geometry.dispose();const mats=Array.isArray(child.material)?child.material:[child.material];mats.forEach(material=>material.dispose())}})}
}

export default function CleanRoomScene(props: SceneProps) {
  const hostRef=useRef<HTMLDivElement>(null),propsRef=useRef(props)
  useEffect(()=>{propsRef.current=props},[props])
  useEffect(()=>{let cancelled=false,cleanup:(()=>void)|undefined;void import('three').then(three=>{if(!cancelled&&hostRef.current)cleanup=mountRoom(hostRef.current,three,propsRef)}).catch(()=>undefined);return()=>{cancelled=true;cleanup?.()}},[])
  return <div ref={hostRef} className="clean-room-scene" />
}
