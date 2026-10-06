import { useEffect, useRef } from 'react'
import { fashionItems, type FashionItem } from '../utils/fashion'

type FallingItem = FashionItem & { key: number; x: number; y: number; speed: number; rotation: number; phase: number }
type Props = { running: boolean; roundId: number; onSelect: (item: FashionItem) => void }

function drawSilhouette(context: CanvasRenderingContext2D, item: FashionItem, x: number, y: number) {
  context.save()
  context.translate(x, y)
  context.strokeStyle = item.color
  context.fillStyle = item.color
  context.lineWidth = 2.2
  context.lineCap = 'round'
  context.lineJoin = 'round'
  if (item.shape === 'shirt') {
    context.beginPath(); context.moveTo(-8, -13); context.lineTo(-19, -7); context.lineTo(-15, 2); context.lineTo(-10, -1); context.lineTo(-10, 15); context.lineTo(10, 15); context.lineTo(10, -1); context.lineTo(15, 2); context.lineTo(19, -7); context.lineTo(8, -13); context.quadraticCurveTo(0, -7, -8, -13); context.closePath(); context.fill()
  } else if (item.shape === 'bottom') {
    context.beginPath(); context.moveTo(-11, -14); context.lineTo(11, -14); context.lineTo(8, 14); context.lineTo(1, 14); context.lineTo(0, 0); context.lineTo(-2, 14); context.lineTo(-10, 14); context.closePath(); context.fill()
  } else if (item.shape === 'shoe') {
    context.beginPath(); context.moveTo(-16, 5); context.quadraticCurveTo(-9, 4, -6, -9); context.lineTo(1, -5); context.lineTo(4, 2); context.lineTo(15, 5); context.quadraticCurveTo(19, 8, 15, 11); context.lineTo(-15, 11); context.quadraticCurveTo(-19, 9, -16, 5); context.fill()
  } else if (item.shape === 'bag') {
    context.beginPath(); context.roundRect(-13, -5, 26, 21, 5); context.fill(); context.beginPath(); context.arc(0, -5, 8, Math.PI, 0); context.stroke()
  } else if (item.shape === 'glasses') {
    context.beginPath(); context.roundRect(-18, -8, 15, 14, 5); context.roundRect(3, -8, 15, 14, 5); context.moveTo(-3, -2); context.lineTo(3, -2); context.moveTo(-18, -5); context.lineTo(-23, -8); context.moveTo(18, -5); context.lineTo(23, -8); context.stroke()
  } else if (item.shape === 'jewelry') {
    context.beginPath(); context.arc(-9, -3, 6, 0, Math.PI * 2); context.arc(9, -3, 6, 0, Math.PI * 2); context.moveTo(-10, 5); context.quadraticCurveTo(0, 20, 10, 5); context.stroke(); context.beginPath(); context.arc(0, 13, 2.5, 0, Math.PI * 2); context.fill()
  } else if (item.shape === 'hat') {
    context.beginPath(); context.ellipse(0, 7, 20, 5, 0, 0, Math.PI * 2); context.fill(); context.beginPath(); context.roundRect(-11, -10, 22, 17, 7); context.fill()
  } else {
    context.beginPath(); context.moveTo(-15, -13); context.lineTo(2, -13); context.lineTo(-2, -2); context.lineTo(14, -2); context.lineTo(10, 13); context.lineTo(-6, 13); context.lineTo(-2, 1); context.lineTo(-18, 1); context.closePath(); context.fill()
  }
  context.restore()
}

function drawItem(context: CanvasRenderingContext2D, item: FallingItem, time: number, hovered: boolean) {
  const width = 126
  const height = 89
  const x = item.x
  const y = item.y + Math.sin(time * .0015 + item.phase) * 3
  context.save()
  context.translate(x + width / 2, y + height / 2)
  context.rotate(item.rotation)
  context.shadowColor = hovered ? `${item.color}88` : 'rgba(0,0,0,.32)'
  context.shadowBlur = hovered ? 24 : 15
  context.shadowOffsetY = 8
  context.fillStyle = hovered ? 'rgba(38,43,47,.98)' : 'rgba(27,32,36,.96)'
  context.strokeStyle = hovered ? `${item.color}b8` : 'rgba(235,225,208,.16)'
  context.lineWidth = 1
  context.beginPath(); context.roundRect(-width / 2, -height / 2, width, height, 13); context.fill(); context.stroke()
  context.shadowColor = 'transparent'
  context.beginPath(); context.roundRect(-width / 2 + 9, -height / 2 + 9, 45, 48, 9); context.fillStyle = `${item.color}22`; context.fill()
  drawSilhouette(context, item, -width / 2 + 31, 0)
  context.fillStyle = '#8e999b'
  context.font = '600 7px Inter, system-ui, sans-serif'
  context.textAlign = 'left'
  context.fillText(item.category.toUpperCase(), -width / 2 + 62, -height / 2 + 24)
  context.fillStyle = '#f0eee6'
  context.font = '500 11px Inter, system-ui, sans-serif'
  context.fillText(item.name, -width / 2 + 62, -height / 2 + 43, 56)
  context.fillStyle = item.color
  context.beginPath(); context.arc(width / 2 - 12, -height / 2 + 12, 3, 0, Math.PI * 2); context.fill()
  context.restore()
}

export default function FashionCanvas({ running, roundId, onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({ running, roundId, onSelect })
  stateRef.current = { running, roundId, onSelect }

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    let items: FallingItem[] = []
    let lastSpawn = 0
    let seenRound = stateRef.current.roundId
    let animationFrame = 0
    let width = 1
    let height = 1
    let pixelRatio = 1
    let pointer = { x: -1000, y: -1000 }
    let previousTime = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * pixelRatio)
      canvas.height = Math.round(height * pixelRatio)
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()

    const pointFromEvent = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      return { x: event.clientX - rect.left, y: event.clientY - rect.top }
    }
    const pointerMove = (event: PointerEvent) => { pointer = pointFromEvent(event) }
    const pointerLeave = () => { pointer = { x: -1000, y: -1000 } }
    const pointerDown = (event: PointerEvent) => {
      if (!stateRef.current.running) return
      event.preventDefault()
      const point = pointFromEvent(event)
      const target = [...items].reverse().find(item => point.x >= item.x - 7 && point.x <= item.x + 133 && point.y >= item.y - 7 && point.y <= item.y + 96)
      if (!target) return
      items = items.filter(item => item.key !== target.key)
      stateRef.current.onSelect(target)
    }

    canvas.addEventListener('pointermove', pointerMove)
    canvas.addEventListener('pointerleave', pointerLeave)
    canvas.addEventListener('pointerdown', pointerDown)

    const frame = (time: number) => {
      const current = stateRef.current
      const delta = Math.min((time - (previousTime || time)) / 1000, .05)
      previousTime = time
      if (current.roundId !== seenRound) {
        seenRound = current.roundId
        items = []
        lastSpawn = time + 240
      }
      if (current.running && time >= lastSpawn) {
        const item = fashionItems[Math.floor(Math.random() * fashionItems.length)]
        const cardWidth = 126
        items.push({ ...item, key: time + Math.random(), x: 12 + Math.random() * Math.max(width - cardWidth - 24, 8), y: -100, speed: 52 + Math.random() * 37, rotation: (Math.random() - .5) * .12, phase: Math.random() * Math.PI * 2 })
        lastSpawn = time + 880
      }
      items.forEach(item => { if (current.running) item.y += item.speed * delta })
      items = items.filter(item => item.y < height + 100)

      context.clearRect(0, 0, width, height)
      const runway = context.createLinearGradient(0, 0, width, height)
      runway.addColorStop(0, 'rgba(247,222,178,.025)')
      runway.addColorStop(.52, 'rgba(255,255,255,.008)')
      runway.addColorStop(1, 'rgba(210,174,127,.04)')
      context.fillStyle = runway
      context.fillRect(0, 0, width, height)
      context.setLineDash([3, 12])
      context.strokeStyle = 'rgba(226,211,187,.11)'
      context.beginPath(); context.moveTo(width / 2, 0); context.lineTo(width / 2, height); context.stroke()
      context.setLineDash([])
      items.forEach(item => drawItem(context, item, time, pointer.x >= item.x && pointer.x <= item.x + 126 && pointer.y >= item.y && pointer.y <= item.y + 89))
      animationFrame = requestAnimationFrame(frame)
    }
    animationFrame = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(animationFrame)
      observer.disconnect()
      canvas.removeEventListener('pointermove', pointerMove)
      canvas.removeEventListener('pointerleave', pointerLeave)
      canvas.removeEventListener('pointerdown', pointerDown)
    }
  }, [])

  return <canvas ref={canvasRef} className="fashion-canvas" aria-label="Tap a falling fashion item to add it to your outfit" />
}
