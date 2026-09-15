import type { CityVenueCategory } from './city.js';

export type VenueVisualFamily = 'market' | 'hospitality' | 'service' | 'retail' | 'civic';

export type VenueVisualProfile = {
  family: VenueVisualFamily;
  depthLayers: number;
  signScale: number;
  canopy: boolean;
  windowGlow: boolean;
  serviceClutter: boolean;
  windowBands: number;
  accent: 'sage' | 'terracotta' | 'mustard' | 'timber' | 'charcoal';
};

export function venueVisualProfile(category: CityVenueCategory, hero: boolean): VenueVisualProfile {
  const base: VenueVisualProfile = (() => {
    switch (category) {
      case 'grocery':
        return { family: 'market', depthLayers: 3, signScale: 1, canopy: true, windowGlow: true, serviceClutter: true, windowBands: 1, accent: 'mustard' };
      case 'cafe':
      case 'bakery':
      case 'food':
        return { family: 'hospitality', depthLayers: 3, signScale: 1, canopy: true, windowGlow: true, serviceClutter: false, windowBands: 2, accent: category === 'food' ? 'terracotta' : 'sage' };
      case 'repair':
        return { family: 'service', depthLayers: 3, signScale: 0.92, canopy: true, windowGlow: false, serviceClutter: true, windowBands: 1, accent: 'charcoal' };
      case 'laundry':
        return { family: 'service', depthLayers: 2, signScale: 0.9, canopy: false, windowGlow: true, serviceClutter: false, windowBands: 3, accent: 'sage' };
      case 'community':
      case 'bank':
      case 'pharmacy':
        return { family: 'civic', depthLayers: 3, signScale: 0.95, canopy: false, windowGlow: true, serviceClutter: false, windowBands: 2, accent: 'charcoal' };
      case 'plants':
        return { family: 'retail', depthLayers: 3, signScale: 1, canopy: true, windowGlow: false, serviceClutter: true, windowBands: 1, accent: 'sage' };
      case 'rental':
        return { family: 'service', depthLayers: 3, signScale: 0.95, canopy: true, windowGlow: false, serviceClutter: true, windowBands: 1, accent: 'timber' };
      case 'furniture':
      case 'books':
      case 'clothing':
      case 'arcade':
        return { family: 'retail', depthLayers: 3, signScale: 1, canopy: category !== 'arcade', windowGlow: true, serviceClutter: false, windowBands: 2, accent: category === 'clothing' ? 'terracotta' : 'timber' };
      default: {
        const exhaustive: never = category;
        return exhaustive;
      }
    }
  })();

  return hero
    ? { ...base, depthLayers: base.depthLayers + 1, signScale: base.signScale * 1.18 }
    : base;
}

export type VenueGameplayRole =
  | 'grocery_shop'
  | 'hangout'
  | 'repair_service'
  | 'laundry_service'
  | 'furniture_shop'
  | 'plant_shop'
  | 'retail_browse'
  | 'civic_service'
  | 'rental';

export function venueGameplayRole(category: CityVenueCategory): VenueGameplayRole {
  switch (category) {
    case 'grocery': return 'grocery_shop';
    case 'cafe':
    case 'bakery':
    case 'food': return 'hangout';
    case 'repair': return 'repair_service';
    case 'laundry': return 'laundry_service';
    case 'furniture': return 'furniture_shop';
    case 'plants': return 'plant_shop';
    case 'rental': return 'rental';
    case 'community':
    case 'bank':
    case 'pharmacy': return 'civic_service';
    case 'books':
    case 'clothing':
    case 'arcade': return 'retail_browse';
    default: {
      const exhaustive: never = category;
      return exhaustive;
    }
  }
}
