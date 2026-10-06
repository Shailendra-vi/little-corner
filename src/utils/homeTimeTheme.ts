export type HomeTimeTheme = 'dawn' | 'day' | 'sunset' | 'night'

export function getHomeTimeTheme(hour = new Date().getHours()): HomeTimeTheme {
  if (hour >= 5 && hour < 8) return 'dawn'
  if (hour >= 8 && hour < 17) return 'day'
  if (hour >= 17 && hour < 20) return 'sunset'
  return 'night'
}
