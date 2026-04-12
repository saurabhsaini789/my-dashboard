export type WardrobeCategory = 
  | 'TOPS'
  | 'BOTTOMS'
  | 'OUTERWEAR / LAYERS'
  | 'INNERWEAR / BASE LAYERS'
  | 'FOOTWEAR'
  | 'TRADITIONAL / OCCASION'
  | 'ACCESSORIES';

export const WARDROBE_CATEGORIES: WardrobeCategory[] = [
  'TOPS',
  'BOTTOMS',
  'OUTERWEAR / LAYERS',
  'INNERWEAR / BASE LAYERS',
  'FOOTWEAR',
  'TRADITIONAL / OCCASION',
  'ACCESSORIES'
];

export const CATEGORY_TYPES: Record<WardrobeCategory, string[]> = {
  'TOPS': [
    'T-Shirt (Solid)', 'T-Shirt (Graphic)', 'Polo Shirt', 
    'Casual Shirt (Full Sleeve)', 'Casual Shirt (Half Sleeve)', 
    'Formal Shirt (Full Sleeve)', 'Formal Shirt (Half Sleeve)', 
    'Henley', 'Tank Top / Vest'
  ],
  'BOTTOMS': [
    'Jeans (Slim)', 'Jeans (Regular)', 'Jeans (Relaxed)', 
    'Chinos', 'Formal Trousers', 'Casual Trousers', 
    'Joggers', 'Track Pants', 'Shorts (Casual)', 'Shorts (Athletic)'
  ],
  'OUTERWEAR / LAYERS': [
    'Hoodie', 'Sweater', 'Cardigan', 'Light Jacket', 
    'Winter Jacket (Heavy)', 'Coat / Overcoat', 
    'Blazer (Casual)', 'Blazer (Formal)', 'Windbreaker', 'Rain Jacket'
  ],
  'INNERWEAR / BASE LAYERS': [
    'Undershirt', 'Thermal Top', 'Thermal Bottom', 
    'Briefs', 'Boxers', 'Socks (Ankle)', 'Socks (Crew)', 'Socks (Winter/Thick)'
  ],
  'FOOTWEAR': [
    'Sneakers (Casual)', 'Sneakers (Sport)', 'Running Shoes', 
    'Training Shoes', 'Formal Shoes (Black)', 'Formal Shoes (Brown)', 
    'Boots (Winter)', 'Boots (Casual)', 'Sandals', 'Slippers / Flip-flops'
  ],
  'TRADITIONAL / OCCASION': [
    'Kurta', 'Kurta Set (with pajama)', 'Pajama', 'Nehru Jacket', 'Sherwani'
  ],
  'ACCESSORIES': [
    'Cap', 'Beanie (Winter Cap)', 'Scarf', 'Gloves', 'Belt (Formal)', 'Belt (Casual)'
  ]
};

export const WARDROBE_COLOURS = [
  'Black', 'White', 'Grey', 'Navy', 'Blue', 'Beige', 
  'Brown', 'Green', 'Red', 'Multi/Pattern'
];

export const WARDROBE_SEASONS = [
  'All Season', 'Summer', 'Winter', 'Rain'
];

export const WARDROBE_OCCASIONS = [
  'Work (Casual)', 'Work (Formal)', 'Casual', 'Home', 
  'Travel', 'Social/Outing', 'Festival/Traditional', 'Exercise', 'Winter'
];

export const WARDROBE_FITS = [
  'Slim', 'Regular', 'Relaxed'
];

export const WARDROBE_FREQUENCIES = [
  'Very High (weekly)', 'High (bi-weekly)', 'Medium (monthly)', 'Low (rarely)'
];

export const WARDROBE_STATUSES = [
  'Active', 'Stored (seasonal)', 'Inactive', 'Discarded'
];

export const WARDROBE_CONDITIONS = [
  'Excellent', 'Good', 'Worn', 'Replace Soon'
];

export const WARDROBE_VERSATILITIES = [
  'High (matches many outfits)', 'Medium', 'Low (limited use)'
];

export const WARDROBE_PURCHASE_REASONS = [
  'Replacement', 'New Need', 'Impulse', 'Upgrade'
];

export const WARDROBE_OUTFIT_ROLES = [
  'Core (used in many outfits)', 'Support (used sometimes)', 'Single-use (rare occasions)'
];

export interface WardrobeItem {
  id: string;
  itemName: string;
  category: WardrobeCategory;
  type: string;
  colour: string;
  season: string;
  occasion: string;
  fit: string;
  frequency: string;
  status: string;
  condition: string;
  versatility: string;
  cost: number;
  purchaseReason: string;
  purchaseDate: string;
  outfitRole: string;
  replacementCycle: string;
  rating: number; // 1-5 rating, as requested by user
  createdAt: string;
}
