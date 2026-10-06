export type FashionCategory = 'Shirt' | 'Pants / skirt' | 'Shoes' | 'Bag' | 'Glasses' | 'Jewelry' | 'Hat' | 'Accessories'

export type FashionItem = {
  id: string
  category: FashionCategory
  name: string
  color: string
  shape: 'shirt' | 'bottom' | 'shoe' | 'bag' | 'glasses' | 'jewelry' | 'hat' | 'accessory'
}

export type FashionEvent = { id: string; name: string; hint: string; ideal: string[] }

export const fashionItems: FashionItem[] = [
  { id: 'linen-shirt', category: 'Shirt', name: 'Linen shirt', color: '#a7cfbf', shape: 'shirt' },
  { id: 'graphic-tee', category: 'Shirt', name: 'Graphic tee', color: '#ed9277', shape: 'shirt' },
  { id: 'silk-blouse', category: 'Shirt', name: 'Silk blouse', color: '#e7c59b', shape: 'shirt' },
  { id: 'metallic-top', category: 'Shirt', name: 'Metallic top', color: '#ab9fdb', shape: 'shirt' },
  { id: 'tailored-trousers', category: 'Pants / skirt', name: 'Tailored trousers', color: '#8495a2', shape: 'bottom' },
  { id: 'wide-leg-jeans', category: 'Pants / skirt', name: 'Wide-leg jeans', color: '#729dc0', shape: 'bottom' },
  { id: 'pleated-skirt', category: 'Pants / skirt', name: 'Pleated skirt', color: '#db98aa', shape: 'bottom' },
  { id: 'holo-pants', category: 'Pants / skirt', name: 'Holo trousers', color: '#a9afd6', shape: 'bottom' },
  { id: 'white-sneakers', category: 'Shoes', name: 'White sneakers', color: '#e8e3d5', shape: 'shoe' },
  { id: 'strappy-sandals', category: 'Shoes', name: 'Strappy sandals', color: '#d1aa75', shape: 'shoe' },
  { id: 'black-loafers', category: 'Shoes', name: 'Black loafers', color: '#665c63', shape: 'shoe' },
  { id: 'platform-boots', category: 'Shoes', name: 'Platform boots', color: '#8b789e', shape: 'shoe' },
  { id: 'canvas-tote', category: 'Bag', name: 'Canvas tote', color: '#bbad8b', shape: 'bag' },
  { id: 'mini-clutch', category: 'Bag', name: 'Mini clutch', color: '#d39b9d', shape: 'bag' },
  { id: 'beach-bag', category: 'Bag', name: 'Beach bag', color: '#d1bd7f', shape: 'bag' },
  { id: 'chrome-sling', category: 'Bag', name: 'Chrome sling', color: '#a2b5c3', shape: 'bag' },
  { id: 'sun-shades', category: 'Glasses', name: 'Sun shades', color: '#e7b76e', shape: 'glasses' },
  { id: 'cat-eye-frames', category: 'Glasses', name: 'Cat-eye frames', color: '#bd8294', shape: 'glasses' },
  { id: 'clear-frames', category: 'Glasses', name: 'Clear frames', color: '#adc4bd', shape: 'glasses' },
  { id: 'space-visor', category: 'Glasses', name: 'Space visor', color: '#91bed0', shape: 'glasses' },
  { id: 'shell-earrings', category: 'Jewelry', name: 'Shell earrings', color: '#dfc58a', shape: 'jewelry' },
  { id: 'gold-hoops', category: 'Jewelry', name: 'Gold hoops', color: '#dfb965', shape: 'jewelry' },
  { id: 'pearl-necklace', category: 'Jewelry', name: 'Pearl necklace', color: '#e5e0d2', shape: 'jewelry' },
  { id: 'orbit-charms', category: 'Jewelry', name: 'Orbit charms', color: '#ae9cdd', shape: 'jewelry' },
  { id: 'straw-hat', category: 'Hat', name: 'Straw hat', color: '#d7bc83', shape: 'hat' },
  { id: 'soft-beret', category: 'Hat', name: 'Soft beret', color: '#a87986', shape: 'hat' },
  { id: 'baseball-cap', category: 'Hat', name: 'Baseball cap', color: '#88a98f', shape: 'hat' },
  { id: 'bubble-helmet', category: 'Hat', name: 'Bubble helmet', color: '#9fcbd3', shape: 'hat' },
  { id: 'silk-scarf', category: 'Accessories', name: 'Silk scarf', color: '#d18f83', shape: 'accessory' },
  { id: 'wrist-watch', category: 'Accessories', name: 'Wrist watch', color: '#c7a77c', shape: 'accessory' },
  { id: 'folding-umbrella', category: 'Accessories', name: 'Folding umbrella', color: '#728da0', shape: 'accessory' },
  { id: 'glow-belt', category: 'Accessories', name: 'Glow belt', color: '#a1c77f', shape: 'accessory' },
]

export const fashionEvents: FashionEvent[] = [
  { id: 'casual', name: 'Casual Day', hint: 'Easy layers, comfortable steps, nothing trying too hard.', ideal: ['graphic-tee', 'wide-leg-jeans', 'white-sneakers', 'canvas-tote', 'sun-shades', 'wrist-watch', 'baseball-cap', 'silk-scarf'] },
  { id: 'party', name: 'Party', hint: 'A little shine is welcome. Dancing is very likely.', ideal: ['silk-blouse', 'pleated-skirt', 'strappy-sandals', 'mini-clutch', 'cat-eye-frames', 'gold-hoops', 'soft-beret', 'glow-belt'] },
  { id: 'beach', name: 'Beach', hint: 'Salt air, warm sand, and absolutely no stiff shoes.', ideal: ['linen-shirt', 'pleated-skirt', 'strappy-sandals', 'beach-bag', 'sun-shades', 'shell-earrings', 'straw-hat', 'silk-scarf'] },
  { id: 'office', name: 'Office', hint: 'Clean lines, considered details, ready for the long meeting.', ideal: ['silk-blouse', 'tailored-trousers', 'black-loafers', 'chrome-sling', 'clear-frames', 'pearl-necklace', 'soft-beret', 'wrist-watch'] },
  { id: 'concert', name: 'Concert', hint: 'Room to move, a point of view, volume turned up.', ideal: ['graphic-tee', 'wide-leg-jeans', 'platform-boots', 'chrome-sling', 'sun-shades', 'gold-hoops', 'baseball-cap', 'glow-belt'] },
  { id: 'wedding', name: 'Wedding', hint: 'Polished and celebratory. Let the couple keep the spotlight.', ideal: ['silk-blouse', 'pleated-skirt', 'strappy-sandals', 'mini-clutch', 'clear-frames', 'pearl-necklace', 'soft-beret', 'silk-scarf'] },
  { id: 'date', name: 'Date', hint: 'Thoughtful, comfortable, and a little bit memorable.', ideal: ['silk-blouse', 'pleated-skirt', 'strappy-sandals', 'mini-clutch', 'cat-eye-frames', 'gold-hoops', 'soft-beret', 'silk-scarf'] },
  { id: 'airport', name: 'Airport', hint: 'Long walks, cold cabins, hands free for your passport.', ideal: ['graphic-tee', 'wide-leg-jeans', 'white-sneakers', 'canvas-tote', 'sun-shades', 'wrist-watch', 'baseball-cap', 'silk-scarf'] },
  { id: 'rainy', name: 'Rainy Day', hint: 'Expect puddles, a little drizzle, and practical choices.', ideal: ['linen-shirt', 'tailored-trousers', 'black-loafers', 'chrome-sling', 'clear-frames', 'wrist-watch', 'baseball-cap', 'folding-umbrella'] },
  { id: 'space', name: 'Space Party', hint: 'Earth dress codes do not apply. Reflective surfaces encouraged.', ideal: ['metallic-top', 'holo-pants', 'platform-boots', 'chrome-sling', 'space-visor', 'orbit-charms', 'bubble-helmet', 'glow-belt'] },
]

export const fashionCategories: FashionCategory[] = ['Shirt', 'Pants / skirt', 'Shoes', 'Bag', 'Glasses', 'Jewelry', 'Hat', 'Accessories']
