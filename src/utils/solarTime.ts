export type DayPhase = 'night' | 'dawn' | 'morning' | 'noon' | 'afternoon' | 'golden-hour' | 'sunset' | 'dusk'

export type SolarState = {
  hour: number
  phase: DayPhase
  dayProgress: number
  sunAltitude: number
  sunHorizontal: number
  sunOpacity: number
  sunIntensity: number
  moonAltitude: number
  moonHorizontal: number
  moonOpacity: number
  nightAmount: number
  sunrise: number
  sunset: number
}

export const solarConfig = { sunrise: 6, sunset: 18 }

let pausedHour: number | null = null

export function setDebugSolarHour(hour: number) { pausedHour = ((hour % 24) + 24) % 24 }
export function pauseSolarClock() { pausedHour = pausedHour ?? getSolarHour() }
export function resumeSolarClock() { pausedHour = null }
export function shiftSolarClock(hours: number) { pausedHour = ((getSolarHour() + hours) % 24 + 24) % 24 }
export function getSolarHour(date = new Date()) {
  if (pausedHour !== null) return pausedHour
  const localHour = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600
  return localHour
}

export function calculateSolarState(date = new Date()): SolarState {
  const hour = getSolarHour(date)
  const { sunrise, sunset } = solarConfig
  const daylightHours = sunset - sunrise
  const dayProgress = (hour - sunrise) / daylightHours
  const hourAngle = hour >= sunrise && hour < sunset
    ? (dayProgress - .5) * Math.PI
    : Math.PI / 2 + (((hour - sunset + 24) % 24) / (24 - daylightHours)) * Math.PI
  const sunAltitude = Math.cos(hourAngle)
  const sunHorizontal = Math.sin(hourAngle)
  const moonAngle = hourAngle + Math.PI
  const moonAltitude = Math.cos(moonAngle)
  const edgeFade = (value: number) => Math.max(0, Math.min(1, value * 4))
  const sunOpacity = edgeFade(sunAltitude + .12)
  const moonOpacity = edgeFade(moonAltitude + .12)
  const sunIntensity = Math.max(0, Math.min(1.8, sunAltitude * 1.6 + .12))
  const nightAmount = Math.max(0, Math.min(1, (1 - Math.max(sunAltitude, 0) * 1.8)))

  let phase: DayPhase
  if (hour < 5 || hour >= 22) phase = 'night'
  else if (hour < 7) phase = 'dawn'
  else if (hour < 10) phase = 'morning'
  else if (hour < 14) phase = 'noon'
  else if (hour < 16) phase = 'afternoon'
  else if (hour < 18) phase = 'golden-hour'
  else if (hour < 19.5) phase = 'sunset'
  else phase = 'dusk'

  return { hour, phase, dayProgress, sunAltitude, sunHorizontal, sunOpacity, sunIntensity, moonAltitude, moonHorizontal: Math.sin(moonAngle), moonOpacity, nightAmount, sunrise, sunset }
}
