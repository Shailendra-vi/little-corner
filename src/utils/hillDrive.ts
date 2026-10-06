export type VehicleId = 'tiny-car' | 'cart' | 'scooter' | 'skateboard' | 'office-chair' | 'suitcase'
export type HillLevel = { id: string; name: string; subtitle: string; theme: 'mountain' | 'grocery' | 'bedroom' | 'office' | 'moon' | 'city' | 'void'; terrain: number; unlockAt: number }
export type UpgradeId = 'engine' | 'tires' | 'suspension' | 'fuel' | 'stability'

export const vehicles: Array<{ id: VehicleId; name: string; description: string; color: string; wheelbase: number; wheelRadius: number; wheelDrop: number; engine: number; weight: number; grip: number; fuel: number }> = [
  { id: 'tiny-car', name: 'Tiny Car', description: 'The sensible-ish option.', color: '#d27865', wheelbase: 66, wheelRadius: 10, wheelDrop: 17, engine: 360, weight: 1, grip: 1, fuel: 100 },
  { id: 'cart', name: 'Shopping Cart', description: 'Four wheels. Zero dignity.', color: '#c5a66f', wheelbase: 70, wheelRadius: 10, wheelDrop: 17, engine: 320, weight: 1.1, grip: .88, fuel: 94 },
  { id: 'scooter', name: 'Scooter', description: 'Small wheels, big feelings.', color: '#91a88e', wheelbase: 58, wheelRadius: 8, wheelDrop: 17, engine: 390, weight: .82, grip: .95, fuel: 92 },
  { id: 'skateboard', name: 'Skateboard', description: 'Technically transportation.', color: '#b894c5', wheelbase: 57, wheelRadius: 6, wheelDrop: 10, engine: 350, weight: .65, grip: 1.08, fuel: 88 },
  { id: 'office-chair', name: 'Office Chair', description: 'Monday has gone too far.', color: '#768ca6', wheelbase: 60, wheelRadius: 6, wheelDrop: 13, engine: 305, weight: 1.18, grip: .87, fuel: 98 },
  { id: 'suitcase', name: 'Suitcase', description: 'Rolling away from responsibility.', color: '#d29a69', wheelbase: 54, wheelRadius: 8, wheelDrop: 17, engine: 330, weight: .92, grip: .93, fuel: 105 },
]

export const hillLevels: HillLevel[] = [
  { id: 'normal-road', name: 'Normal Road', subtitle: 'A quiet drive. Suspiciously quiet.', theme: 'mountain', terrain: 0, unlockAt: 0 },
  { id: 'grocery-store', name: 'Grocery Store', subtitle: 'Aisle seven has a ramp.', theme: 'grocery', terrain: 1, unlockAt: 450 },
  { id: 'bedroom', name: 'Bedroom', subtitle: 'Mind the laundry mountain.', theme: 'bedroom', terrain: 2, unlockAt: 900 },
  { id: 'office', name: 'Office', subtitle: 'The deadline is a downhill slope.', theme: 'office', terrain: 3, unlockAt: 1350 },
  { id: 'moon', name: 'Moon', subtitle: 'One small hop for cat-kind.', theme: 'moon', terrain: 4, unlockAt: 1800 },
  { id: 'monday-morning', name: 'Monday Morning', subtitle: 'Gravity has a meeting at nine.', theme: 'city', terrain: 5, unlockAt: 2250 },
  { id: 'the-void', name: 'The Void', subtitle: 'No road. No rules. No excuses.', theme: 'void', terrain: 6, unlockAt: 2700 },
]

export const upgradeNames: Array<{ id: UpgradeId; name: string; detail: string; baseCost: number }> = [
  { id: 'engine', name: 'Engine', detail: 'More pull up the hills.', baseCost: 55 },
  { id: 'tires', name: 'Tires', detail: 'Grip the bumpy bits.', baseCost: 45 },
  { id: 'suspension', name: 'Suspension', detail: 'Take landings with grace.', baseCost: 50 },
  { id: 'fuel', name: 'Fuel tank', detail: 'Keep the nonsense going.', baseCost: 40 },
  { id: 'stability', name: 'Stability', detail: 'Less pinball, more driving.', baseCost: 60 },
]

export type HillProgress = { coins: number; bestDistance: number; unlocked: number; vehicle: VehicleId; upgrades: Record<UpgradeId, number> }
export const freshProgress = (): HillProgress => ({ coins: 0, bestDistance: 0, unlocked: 0, vehicle: 'tiny-car', upgrades: { engine: 0, tires: 0, suspension: 0, fuel: 0, stability: 0 } })
