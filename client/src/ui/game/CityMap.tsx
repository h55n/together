import type { ReactElement } from 'react';
import { AMAYA_BAY_CITY, AMAYA_BAY_LOCATION_ANCHORS } from '@together/shared';
import { CITY_MAP_ROADS, CITY_MAP_WATERFRONT, mapPolyline, worldToMapPoint } from './cityMapGeometry';
import './CityMap.css';

const HERO_ANCHOR_IDS = new Set([
  'cafe_roshan',
  'mogra_market',
  'park_badminton',
  'bay_kayak_hut',
  'bay_cycle_hut',
  'rain_tree_nursery',
  'common_library',
]);

export function CityMap({ open, currentLocation, onClose }: { open: boolean; currentLocation?: string | null; onClose: () => void }): ReactElement | null {
  if (!open) return null;
  const waterfront = mapPolyline(CITY_MAP_WATERFRONT);
  const heroAnchors = AMAYA_BAY_LOCATION_ANCHORS.filter((anchor) => HERO_ANCHOR_IDS.has(anchor.id));

  return <div className="map-backdrop" role="dialog" aria-modal="true" aria-label="Map of Amaya Bay">
    <section className="city-map-panel">
      <header className="city-map-header">
        <div><p className="eyebrow">Walkable coastal city</p><h2>Amaya Bay</h2></div>
        <button className="paper-button" onClick={onClose}>Close · M</button>
      </header>
      <div className="map-layout">
        <svg className="city-map-svg" viewBox="-450 -450 900 900" aria-label="Street map of Amaya Bay">
          <defs>
            <filter id="map-paper-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="5" floodOpacity=".08" />
            </filter>
          </defs>
          <rect x="-450" y="-450" width="900" height="900" rx="28" className="map-land" />
          <polygon points={`${waterfront} 450,450 -450,450`} className="map-sea" />
          <polyline points={waterfront} className="map-coastline" />

          {AMAYA_BAY_CITY.districts.map((district) => {
            const point = worldToMapPoint(district.center);
            return <g key={district.id} className="map-district" transform={`translate(${point.x} ${point.y})`}>
              <circle r={Math.max(44, district.radius * .34)} className={district.hero ? 'map-district-area hero' : 'map-district-area'} />
              <text className="map-district-label" textAnchor="middle" y="4">{district.displayName}</text>
            </g>;
          })}

          {CITY_MAP_ROADS.map((road) => <polyline
            key={road.id}
            points={mapPolyline(road.points)}
            className={`map-road map-road-${road.kind}`}
            vectorEffect="non-scaling-stroke"
          />)}

          {heroAnchors.map((anchor) => {
            const point = worldToMapPoint(anchor.position);
            return <g key={anchor.id} className="map-landmark" transform={`translate(${point.x} ${point.y})`}>
              <circle r="7" />
              <circle r="2.5" className="map-landmark-core" />
              <text x="11" y="4">{anchor.displayName}</text>
            </g>;
          })}
        </svg>
        <aside className="map-legend">
          <div className="map-you-are"><span>Current area</span><strong>{currentLocation ?? 'Amaya Bay'}</strong></div>
          <p>Roads, waterfront, parks and landmarks now reflect the city as a place you can learn rather than a district planning diagram.</p>
          <div className="map-key"><span><i className="road-key" />Main streets</span><span><i className="path-key" />Walking paths</span><span><i className="landmark-key" />Landmarks</span></div>
          <ul>{AMAYA_BAY_CITY.districts.map((district) => <li key={district.id}><b>{district.displayName}</b><span>{district.ambience.replaceAll('_', ' ')}</span></li>)}</ul>
        </aside>
      </div>
    </section>
  </div>;
}
