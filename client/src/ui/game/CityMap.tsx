import type { ReactElement } from 'react';
import { AMAYA_BAY_CITY, AMAYA_BAY_LOCATION_ANCHORS } from '@together/shared';

export function CityMap({ open, currentLocation, onClose }: { open: boolean; currentLocation?: string | null; onClose: () => void }): ReactElement | null {
  if (!open) return null;
  return <div className="map-backdrop" role="dialog" aria-modal="true" aria-label="Map of Amaya Bay">
    <section className="city-map-panel">
      <header><div><p className="eyebrow">One complete city</p><h2>Amaya Bay</h2></div><button className="paper-button" onClick={onClose}>Close · M</button></header>
      <div className="map-layout">
        <svg className="city-map-svg" viewBox="-450 -450 900 900" aria-label="Stylized map of Amaya Bay">
          <rect x="-450" y="-450" width="900" height="900" rx="28" fill="#d8d2bf" />
          <path d="M-450 365 C-180 335 130 380 450 330 L450 450 L-450 450 Z" fill="#95aaa7" />
          {AMAYA_BAY_CITY.districts.map((district) => <g key={district.id} transform={`translate(${district.center.x} ${-district.center.z})`}>
            <circle r={Math.max(48, district.radius * .42)} fill={district.hero ? '#aebd9f' : '#c3c5aa'} opacity=".82" />
            <text textAnchor="middle" y="4" fontSize="18" fill="#39483f" fontFamily="system-ui" fontWeight="650">{district.displayName}</text>
          </g>)}
          {AMAYA_BAY_LOCATION_ANCHORS.map((anchor) => <circle key={anchor.id} cx={anchor.position.x} cy={-anchor.position.z} r="5" fill="#795f4a"><title>{anchor.displayName}</title></circle>)}
        </svg>
        <div className="map-legend"><p>Almost the whole city is open from day one. Capability grows; streets do not arbitrarily lock.</p><strong>You are around</strong><span>{currentLocation ?? 'Amaya Bay'}</span><ul>{AMAYA_BAY_CITY.districts.map((district) => <li key={district.id}><b>{district.displayName}</b><span>{district.ambience.replaceAll('_', ' ')}</span></li>)}</ul></div>
      </div>
    </section>
  </div>;
}
