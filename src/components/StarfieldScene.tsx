import { useEffect, useRef } from 'react'
import type { WebGLRenderer } from 'three'

type ThreeRuntime = Pick<typeof import('three'),
  | 'WebGLRenderer' | 'Scene' | 'PerspectiveCamera' | 'BufferGeometry' | 'BufferAttribute'
  | 'Color' | 'PointsMaterial' | 'Points' | 'Group' | 'MeshBasicMaterial' | 'DoubleSide'
  | 'Mesh' | 'TorusGeometry' | 'MeshStandardMaterial' | 'IcosahedronGeometry'
  | 'AmbientLight' | 'PointLight' | 'Clock'
>

type TwinkleStar = { mesh: InstanceType<ThreeRuntime['Mesh']>; phase: number; speed: number }

function mountStarfield(host: HTMLDivElement, THREE: ThreeRuntime) {
  let renderer: WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
  } catch {
    return () => undefined
  }

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(44, 1, .1, 100)
  camera.position.set(0, 0, 20)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6))
  renderer.setClearColor(0x000000, 0)
  renderer.domElement.className = 'starfield-canvas'
  renderer.domElement.setAttribute('aria-hidden', 'true')
  host.appendChild(renderer.domElement)

  const starCount = 380
  const positions = new Float32Array(starCount * 3)
  const colors = new Float32Array(starCount * 3)
  const palette = [0x9bdcff, 0xd6bcff, 0xffc1dc, 0xffe2ac]
  for (let index = 0; index < starCount; index += 1) {
    positions[index * 3] = (Math.random() - .5) * 31
    positions[index * 3 + 1] = (Math.random() - .5) * 18
    positions[index * 3 + 2] = -Math.random() * 18
    const color = new THREE.Color(palette[Math.floor(Math.random() * palette.length)])
    colors[index * 3] = color.r
    colors[index * 3 + 1] = color.g
    colors[index * 3 + 2] = color.b
  }
  const starGeometry = new THREE.BufferGeometry()
  starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const starMaterial = new THREE.PointsMaterial({ size: .075, vertexColors: true, transparent: true, opacity: .85, depthWrite: false, sizeAttenuation: true })
  const stars = new THREE.Points(starGeometry, starMaterial)
  scene.add(stars)

  const twinkleMats = [0x8feaff, 0xbfa2ff, 0xff8dcc, 0xffd47b].map(color => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .86, depthWrite: false }))
  const twinkleGeometry = new THREE.IcosahedronGeometry(.085, 0)
  const twinkleStars: TwinkleStar[] = []
  for (let index = 0; index < 48; index += 1) {
    const mesh = new THREE.Mesh(twinkleGeometry, twinkleMats[index % twinkleMats.length])
    const size = .48 + Math.random() * 1.1
    mesh.scale.setScalar(size)
    mesh.position.set((Math.random() - .5) * 30, (Math.random() - .5) * 17, -Math.random() * 8)
    scene.add(mesh)
    twinkleStars.push({ mesh, phase: Math.random() * Math.PI * 2, speed: .8 + Math.random() * 1.8 })
  }

  const orbitGroup = new THREE.Group()
  orbitGroup.rotation.set(.88, -.18, -.2)
  scene.add(orbitGroup)
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xc3a8ff, transparent: true, opacity: .23, side: THREE.DoubleSide, depthWrite: false })
  const ringOne = new THREE.Mesh(new THREE.TorusGeometry(7.1, .016, 4, 180), ringMaterial)
  const ringTwoMaterial = new THREE.MeshBasicMaterial({ color: 0x7fdcff, transparent: true, opacity: .18, side: THREE.DoubleSide, depthWrite: false })
  const ringTwo = new THREE.Mesh(new THREE.TorusGeometry(8.4, .009, 4, 180), ringTwoMaterial)
  ringTwo.rotation.x = .45
  ringTwo.rotation.y = .2
  orbitGroup.add(ringOne, ringTwo)

  const sphereMaterialA = new THREE.MeshStandardMaterial({ color: 0x8f6bd9, emissive: 0x54369a, emissiveIntensity: .34, roughness: .38, metalness: .2, transparent: true, opacity: .9 })
  const sphereA = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 2), sphereMaterialA)
  sphereA.position.set(-6.1, 2.15, -2.4)
  const sphereMaterialB = new THREE.MeshStandardMaterial({ color: 0x64b9d5, emissive: 0x216b90, emissiveIntensity: .38, roughness: .33, metalness: .16, transparent: true, opacity: .78 })
  const sphereB = new THREE.Mesh(new THREE.IcosahedronGeometry(.66, 1), sphereMaterialB)
  sphereB.position.set(6.4, -2.4, -1.4)
  scene.add(sphereA, sphereB)

  const ambient = new THREE.AmbientLight(0xbac7ff, 1.05)
  const keyLight = new THREE.PointLight(0xc7a6ff, 22, 35)
  keyLight.position.set(-5, 4, 5)
  const blueLight = new THREE.PointLight(0x76d9ff, 18, 28)
  blueLight.position.set(5, -3, 4)
  scene.add(ambient, keyLight, blueLight)

  const resize = () => {
    const width = Math.max(host.clientWidth, 1)
    const height = Math.max(host.clientHeight, 1)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
  }
  resize()
  const observer = new ResizeObserver(resize)
  observer.observe(host)

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let animationFrame = 0
  const clock = new THREE.Clock()
  const render = () => {
    const elapsed = clock.getElapsedTime()
    if (!prefersReducedMotion) {
      stars.rotation.z = elapsed * .003
      orbitGroup.rotation.z = -.2 + elapsed * .018
      ringOne.rotation.x = .12 * Math.sin(elapsed * .16)
      sphereA.rotation.y = elapsed * .11
      sphereA.position.y = 2.15 + Math.sin(elapsed * .45) * .12
      sphereB.rotation.x = elapsed * .13
      sphereB.position.y = -2.4 + Math.sin(elapsed * .55 + 1) * .16
      twinkleStars.forEach(({ mesh, phase, speed }) => {
        const shimmer = .58 + (Math.sin(elapsed * speed + phase) + 1) * .32
        mesh.scale.setScalar(shimmer)
        mesh.rotation.x = elapsed * .12 + phase
        mesh.rotation.y = elapsed * .18 + phase
      })
    }
    renderer.render(scene, camera)
    if (!prefersReducedMotion) animationFrame = requestAnimationFrame(render)
  }
  render()

  return () => {
    cancelAnimationFrame(animationFrame)
    observer.disconnect()
    starGeometry.dispose()
    starMaterial.dispose()
    ringOne.geometry.dispose()
    ringTwo.geometry.dispose()
    ringMaterial.dispose()
    ringTwoMaterial.dispose()
    sphereA.geometry.dispose()
    sphereMaterialA.dispose()
    sphereB.geometry.dispose()
    sphereMaterialB.dispose()
    twinkleGeometry.dispose()
    twinkleMats.forEach(material => material.dispose())
    renderer.dispose()
    renderer.domElement.remove()
  }
}

export default function StarfieldScene() {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    let cleanup: (() => void) | undefined
    void import('three').then(module => {
      if (cancelled || !hostRef.current) return
      const { WebGLRenderer, Scene, PerspectiveCamera, BufferGeometry, BufferAttribute, Color, PointsMaterial, Points, Group, MeshBasicMaterial, DoubleSide, Mesh, TorusGeometry, MeshStandardMaterial, IcosahedronGeometry, AmbientLight, PointLight, Clock } = module
      cleanup = mountStarfield(hostRef.current, { WebGLRenderer, Scene, PerspectiveCamera, BufferGeometry, BufferAttribute, Color, PointsMaterial, Points, Group, MeshBasicMaterial, DoubleSide, Mesh, TorusGeometry, MeshStandardMaterial, IcosahedronGeometry, AmbientLight, PointLight, Clock })
    }).catch(() => undefined)
    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [])

  return <div ref={hostRef} className="starfield-scene" aria-hidden="true" />
}
