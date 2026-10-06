import { useEffect, useRef } from 'react'
import type { WebGLRenderer } from 'three'
import type { DriveSignals } from './HillDriveCanvas'
import type { HillLevel } from '../utils/hillDrive'

type Runtime = Pick<typeof import('three'), 'WebGLRenderer' | 'Scene' | 'OrthographicCamera' | 'Group' | 'Mesh' | 'BoxGeometry' | 'SphereGeometry' | 'ConeGeometry' | 'CylinderGeometry' | 'TorusGeometry' | 'MeshStandardMaterial' | 'MeshBasicMaterial' | 'AmbientLight' | 'PointLight' | 'Clock' | 'MathUtils' | 'AdditiveBlending'>
type Spark = { mesh: InstanceType<Runtime['Mesh']>; velocity: { x: number; y: number }; life: number }

function mount(host: HTMLDivElement, runtime: Runtime, level: HillLevel, signals: { current: DriveSignals }) {
  let renderer: WebGLRenderer
  try { renderer = new runtime.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }) } catch { return () => undefined }
  const scene = new runtime.Scene()
  const viewHeight = 13
  let viewWidth = viewHeight * host.clientWidth / Math.max(host.clientHeight, 1)
  const camera = new runtime.OrthographicCamera(-viewWidth / 2, viewWidth / 2, viewHeight / 2, -viewHeight / 2, .1, 100)
  camera.position.set(0, 0, 20)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); renderer.setClearColor(0, 0)
  renderer.domElement.className = 'ambience-canvas'; renderer.domElement.setAttribute('aria-hidden', 'true'); host.appendChild(renderer.domElement)
  const shared: Array<InstanceType<Runtime['MeshStandardMaterial']> | InstanceType<Runtime['MeshBasicMaterial']>> = []
  const std = (color: number, emissive = 0, roughness = .83, metalness = .05) => { const mat = new runtime.MeshStandardMaterial({ color, emissive, emissiveIntensity: emissive ? .34 : 0, roughness, metalness }); shared.push(mat); return mat }
  const basic = (color: number, opacity = 1) => { const mat = new runtime.MeshBasicMaterial({ color, transparent: opacity < 1, opacity }); shared.push(mat); return mat }
  const addBox = (group: InstanceType<Runtime['Group']>, size: [number, number, number], color: number, x: number, y: number, z: number, emissive = 0) => { const mesh = new runtime.Mesh(new runtime.BoxGeometry(...size), std(color, emissive)); mesh.position.set(x, y, z); group.add(mesh); return mesh }
  const background = new runtime.Group(), middleground = new runtime.Group(), foreground = new runtime.Group()
  scene.add(background, middleground, foreground)
  const colors = [0xffba82, 0xd69b85, 0xe6c17e, 0x9bc5b4, 0x8588bb, 0xe57982, 0xb99cdc]
  const accent = colors[level.terrain]
  scene.add(new runtime.AmbientLight(0xbbb0c2, level.theme === 'moon' || level.theme === 'void' ? .9 : 1.15))
  const keyLight = new runtime.PointLight(accent, 19, 38); keyLight.position.set(-4, 5, 8); scene.add(keyLight)
  const fillLight = new runtime.PointLight(0x877aa8, 12, 30); fillLight.position.set(5, 1, 7); scene.add(fillLight)
  const sparkles: Array<{ mesh: InstanceType<Runtime['Mesh']>; x: number; y: number; phase: number; speed: number }> = []
  const movers: Array<{ group: InstanceType<Runtime['Group']>; x: number; phase: number; speed: number }> = []

  if (level.theme === 'mountain') {
    const sun = new runtime.Mesh(new runtime.SphereGeometry(1.1, 24, 18), basic(0xffba79)); sun.position.set(viewWidth * .29, 3.65, -7); background.add(sun)
    const halo = new runtime.Mesh(new runtime.SphereGeometry(1.65, 20, 14), basic(0xf2a46e, .12)); halo.position.copy(sun.position); background.add(halo)
    for (let i = 0; i < 9; i += 1) { const mountain = new runtime.Mesh(new runtime.ConeGeometry(2.2 + i % 3 * .65, 4.2 + i % 2 * 1.2, 5), std(i % 2 ? 0x514452 : 0x614d57)); mountain.position.set(-viewWidth * .54 + i * viewWidth * .14, -3.15, -7 + i % 2); background.add(mountain) }
    for (let i = 0; i < 3; i += 1) { const cloud = new runtime.Group(); for (let j = 0; j < 5; j += 1) { const puff = new runtime.Mesh(new runtime.SphereGeometry(.34 + (j % 2) * .18, 10, 8), basic(0xe2b4a5, .64)); puff.position.set((j - 2) * .42, Math.sin(j * 1.7) * .16, 0); cloud.add(puff) } cloud.position.set(-viewWidth * .4 + i * viewWidth * .47, 3.3 + i % 2 * 1.1, -5); background.add(cloud); movers.push({ group: cloud, x: cloud.position.x, phase: i, speed: .08 + i * .015 }) }
  }
  if (level.theme === 'grocery') {
    const wall = addBox(background, [viewWidth * 1.7, 12, .5], 0x3e343b, 0, 1.2, -9)
    for (let row = 0; row < 3; row += 1) { const shelf = addBox(middleground, [viewWidth * 1.26, .24, 1], 0x8e7060, 0, 2.45 - row * 2.1, -4); shelf.rotation.z = -.02
      for (let i = 0; i < 16; i += 1) { const product = new runtime.Mesh(new runtime.BoxGeometry(.38 + i % 3 * .13, .7 + i % 4 * .17, .58), std([0xd78b75,0x8eaa87,0xd7b66f,0x9e8db9][(i + row) % 4])); product.position.set(-viewWidth * .58 + i * viewWidth * .075, 2.94 - row * 2.1 + (i % 3) * .03, -3.7); middleground.add(product) }
    }
    for (let i = 0; i < 7; i += 1) { const cart = new runtime.Group(); addBox(cart, [1.4,.18,.35], 0xb99d7a, 0, -.3, 0); for (const x of [-.6,.6]) { const wheel = new runtime.Mesh(new runtime.TorusGeometry(.12,.035,7,14), std(0x514752)); wheel.position.set(x,-.53,.25); cart.add(wheel) } cart.position.set(-viewWidth*.48+i*viewWidth*.16,-3.2,-2); foreground.add(cart); movers.push({ group: cart, x: cart.position.x, phase: i, speed: .16 }) }
    void wall
  }
  if (level.theme === 'bedroom') {
    const wall = addBox(background, [viewWidth * 1.7, 13, .5], 0x51404b, 0, 1, -9)
    for (const side of [-1,1]) { const window = addBox(background, [5,4,.22], 0x343849, side*viewWidth*.3, 2.4, -7); addBox(background,[5.5,.17,.32],0x9a776d,window.position.x, .35,-6.8); for(let i=0;i<5;i++){const star=new runtime.Mesh(new runtime.SphereGeometry(.045,7,6),basic(0xf2d8a7));star.position.set(window.position.x-1.8+i*.8,2.7+(i%2)*.7,-6.6);background.add(star)} }
    addBox(middleground,[10,2.2,4],0x694d59,0,-2.5,-2); addBox(middleground,[9.5,.6,3.8],0xd2b6ad,0,-1.55,-1.7); addBox(middleground,[10,.55,3.8],0x927287,0,-1.18,-1.65); addBox(middleground,[3,.48,1.2],0xe8d7c3,-2.7,-1.12,-.3); addBox(middleground,[3,.48,1.2],0xc9b8cb,.5,-1.12,-.3)
    for (const side of [-1,1]) { const table = new runtime.Group(); addBox(table,[2,.2,1.3],0x745b52,0,0,0); addBox(table,[1.6,1.2,1.05],0x644c4a,0,-.68,0); table.position.set(side*viewWidth*.39,-3,-1); foreground.add(table); const lamp=new runtime.Mesh(new runtime.ConeGeometry(.55,.7,12),std(0xd5a976,0xffb66f));lamp.position.set(side*viewWidth*.39,-2,0);foreground.add(lamp) }
    void wall
  }
  if (level.theme === 'office') {
    addBox(background,[viewWidth*1.7,14,.6],0x3b3541,0,1,-9)
    for(let i=0;i<5;i++){const desk=new runtime.Group();addBox(desk,[5,.25,2],0x785e56,0,0,0);for(const x of [-2,2])addBox(desk,[.18,1.6,.2],0x584851,x,-.85,0);const monitor=addBox(desk,[2.2,1.45,.18],0x242c3c,0,1.03,-.35);addBox(desk,[1.8,1.08,.08],i%2?0x526e7c:0x665880,0,1.04,-.19,0x3e5770);monitor.rotation.y=.06;desk.position.set(-viewWidth*.54+i*viewWidth*.28,-1.3,-4);middleground.add(desk)}
    for(let i=0;i<8;i++){const lamp=new runtime.Mesh(new runtime.SphereGeometry(.11,9,7),basic(0xffd294));lamp.position.set(-viewWidth*.55+i*viewWidth*.16,4.6,-3);foreground.add(lamp)}
  }
  if (level.theme === 'moon') {
    const planet=new runtime.Mesh(new runtime.SphereGeometry(2,24,18),std(0xb6a8a1));planet.position.set(viewWidth*.34,2.9,-8);background.add(planet)
    for(let i=0;i<24;i++){const crater=new runtime.Mesh(new runtime.SphereGeometry(.1+(i%4)*.08,9,7),std(i%2?0x837e88:0x999098));crater.position.set(-viewWidth*.5+(i*37%Math.floor(viewWidth*100))/100,-2.7+(i*29%690)/100,-3);foreground.add(crater)}
    for(let i=0;i<5;i++){const ring=new runtime.Mesh(new runtime.TorusGeometry(1.15+i*.32,.018,5,56),basic(i%2?0x9da9c8:0xc8a2aa,.55));ring.position.set(viewWidth*.34,2.9,-7);ring.rotation.x=.65;background.add(ring)}
  }
  if (level.theme === 'city') {
    addBox(background,[viewWidth*1.8,15,.6],0x242633,0,1,-10)
    for(let i=0;i<17;i++){const w=1+i%3*.5,h=3+i*17%7;const tower=addBox(background,[w,h,.7],i%2?0x343441:0x2d2d3b,-viewWidth*.62+i*viewWidth*.078,-4+h/2,-7+(i%3)*.35);for(let row=0;row<8;row++)for(let col=0;col<3;col++){const light=new runtime.Mesh(new runtime.BoxGeometry(.08,.12,.025),basic((row+col+i)%4?0xf3b477:0x7585ad,.85));light.position.set(tower.position.x-w/2+.25+col*.3,-4+row*.38,tower.position.z+.38);background.add(light)}}
    for(let i=0;i<6;i++){const car=new runtime.Group();addBox(car,[1.4,.35,.5],i%2?0xb26f72:0x808ab4,0,0,0);const light=new runtime.PointLight(0xed9a76,1,2);light.position.set(.65,0,.3);car.add(light);car.position.set(-viewWidth*.5+i*viewWidth*.2,-3.7,-1);foreground.add(car);movers.push({group:car,x:car.position.x,phase:i,speed:.28+i*.04})}
  }
  if (level.theme === 'void') {
    addBox(background,[viewWidth*1.8,15,.5],0x211b32,0,1,-10)
    for(let i=0;i<18;i++){const shard=new runtime.Mesh(new runtime.ConeGeometry(.6+i%3*.3,2+i%4,5),std([0x614572,0x4a5579,0x75485d][i%3],i%3===0?0x331244:0));shard.position.set(-viewWidth*.65+i*viewWidth*.075,-3+(i%4)*.9,-5+i%3);shard.rotation.z=(i%2?-.2:.2);background.add(shard)}
    for(let i=0;i<8;i++){const platform=new runtime.Mesh(new runtime.BoxGeometry(2.4,.2,1.4),std(i%2?0x88749e:0x6b597f));platform.position.set(-viewWidth*.52+i*viewWidth*.15,-2+(i%3)*1.4,-1);foreground.add(platform);movers.push({group:new runtime.Group(),x:platform.position.x,phase:i,speed:.2})}
  }
  const dustMat = basic(accent,.72)
  for(let i=0;i<46;i++){const mote=new runtime.Mesh(new runtime.SphereGeometry(.025+Math.random()*.035,6,5),dustMat);const x=(Math.random()-.5)*viewWidth*1.6,y=(Math.random()-.5)*10;mote.position.set(x,y,1+Math.random()*2);foreground.add(mote);sparkles.push({mesh:mote,x,y,phase:Math.random()*6.28,speed:.1+Math.random()*.45})}
  const debris: Spark[]=[]
  let pointerX=0,pointerY=0,seenCrash=signals.current.crash,shake=0
  const onPointer=(event:PointerEvent)=>{const rect=host.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)return;pointerX=(event.clientX/rect.width-(rect.left/rect.width)-.5)*2;pointerY=(event.clientY-rect.top)/rect.height*2-1}
  window.addEventListener('pointermove',onPointer,{passive:true})
  const resize=()=>{const w=Math.max(host.clientWidth,1),h=Math.max(host.clientHeight,1);viewWidth=viewHeight*w/h;camera.left=-viewWidth/2;camera.right=viewWidth/2;camera.updateProjectionMatrix();renderer.setSize(w,h,false)}
  resize();const observer=new ResizeObserver(resize);observer.observe(host)
  const clock=new runtime.Clock();let raf=0
  const burst=()=>{for(let i=0;i<16;i++){const mat=new runtime.MeshBasicMaterial({color:i%2?accent:0xffcf9b,transparent:true,blending:runtime.AdditiveBlending,depthWrite:false});shared.push(mat);const mesh=new runtime.Mesh(new runtime.SphereGeometry(.045,6,5),mat);mesh.position.set(0,-1.8,3);foreground.add(mesh);debris.push({mesh,velocity:{x:(Math.random()-.5)*4,y:Math.random()*5},life:.7+Math.random()*.7})}}
  const render=()=>{const dt=Math.min(clock.getDelta(),.05),t=clock.elapsedTime,signal=signals.current;const speedFactor=Math.min(2.8,signal.speed/220);background.position.x=Math.sin(t*.025*(1+speedFactor*.25))*viewWidth*.018+pointerX*.16;middleground.position.x=Math.sin(t*.045*(1+speedFactor*.48))*viewWidth*.035+pointerX*.38;foreground.position.x=Math.sin(t*.06*(1+speedFactor*.65))*viewWidth*.05+pointerX*.68;camera.position.y+=(pointerY*.23-camera.position.y)*Math.min(1,dt);camera.position.x+=(pointerX*.18-camera.position.x)*Math.min(1,dt);movers.forEach(({group,x,phase,speed})=>{group.position.x=x+Math.sin(t*speed+phase)*.12;group.position.y+=Math.sin(t*speed+phase)*dt*.018});sparkles.forEach(({mesh,x,y,phase,speed})=>{mesh.position.x=x+Math.sin(t*speed*(1+speedFactor)+phase)*.16;mesh.position.y=y+Math.cos(t*speed*(1+speedFactor)+phase)*.19});keyLight.intensity=18+speedFactor*5+(signal.active?1:0);fillLight.intensity=10+speedFactor*3;if(signal.crash!==seenCrash){seenCrash=signal.crash;shake=.45;burst()}if(shake>0){camera.position.x+=(Math.random()-.5)*shake*.5;camera.position.y+=(Math.random()-.5)*shake*.38;shake=Math.max(0,shake-dt*1.9)}camera.zoom=1+(shake*.04);camera.updateProjectionMatrix();for(let i=debris.length-1;i>=0;i--){const p=debris[i];p.life-=dt;p.mesh.position.x+=p.velocity.x*dt;p.mesh.position.y+=p.velocity.y*dt;p.velocity.y-=7*dt;(p.mesh.material as InstanceType<Runtime['MeshBasicMaterial']>).opacity=Math.max(0,p.life);if(p.life<=0){foreground.remove(p.mesh);debris.splice(i,1)}}renderer.render(scene,camera);raf=requestAnimationFrame(render)}
  render()
  return()=>{cancelAnimationFrame(raf);observer.disconnect();window.removeEventListener('pointermove',onPointer);renderer.dispose();renderer.domElement.remove();scene.traverse(obj=>{if(obj instanceof runtime.Mesh)obj.geometry.dispose()});shared.forEach(m=>m.dispose())}
}

export default function HillEnvironment({ level, signals }: { level: HillLevel; signals: DriveSignals }) {
  const hostRef=useRef<HTMLDivElement>(null), signalRef=useRef(signals);signalRef.current=signals
  useEffect(()=>{let cancelled=false,cleanup:(()=>void)|undefined;void import('three').then(module=>{if(cancelled||!hostRef.current)return;const {WebGLRenderer,Scene,OrthographicCamera,Group,Mesh,BoxGeometry,SphereGeometry,ConeGeometry,CylinderGeometry,TorusGeometry,MeshStandardMaterial,MeshBasicMaterial,AmbientLight,PointLight,Clock,MathUtils,AdditiveBlending}=module;cleanup=mount(hostRef.current,{WebGLRenderer,Scene,OrthographicCamera,Group,Mesh,BoxGeometry,SphereGeometry,ConeGeometry,CylinderGeometry,TorusGeometry,MeshStandardMaterial,MeshBasicMaterial,AmbientLight,PointLight,Clock,MathUtils,AdditiveBlending},level,signalRef)}).catch(()=>undefined);return()=>{cancelled=true;cleanup?.()}},[level.id])
  return <div ref={hostRef} className={`page-ambience hill-environment theme-${level.theme}`} aria-hidden="true" />
}
