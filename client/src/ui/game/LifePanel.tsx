import type { ReactElement } from 'react';

export type LifePanelData = {
  displayName?: string | undefined;
  personalWallet?: number | undefined;
  householdWallet?: number | undefined;
  location?: string | null | undefined;
  time?: string | undefined;
  weather?: string | undefined;
  activeStory?: string | null | undefined;
  householdNote?: string | null | undefined;
};

export function LifePanel({ open, data, onClose }: { open: boolean; data: LifePanelData; onClose: () => void }): ReactElement | null {
  if (!open) return null;
  return <aside className="life-panel" role="dialog" aria-label="Life panel">
    <header><div><p className="eyebrow">Right now</p><h2>Life</h2></div><button className="paper-button" onClick={onClose}>Close · Tab</button></header>
    <div className="life-block"><span>Place</span><strong>{data.location ?? 'Amaya Bay'}</strong></div>
    <div className="life-row"><div><span>Time</span><strong>{data.time ?? '—'}</strong></div><div><span>Weather</span><strong>{friendly(data.weather ?? 'clear')}</strong></div></div>
    <div className="life-row"><div><span>Personal</span><strong>₹{(data.personalWallet ?? 0).toLocaleString('en-IN')}</strong></div><div><span>Household</span><strong>₹{(data.householdWallet ?? 0).toLocaleString('en-IN')}</strong></div></div>
    {data.activeStory && <div className="life-paper"><span>In our life</span><strong>{data.activeStory}</strong></div>}
    {data.householdNote && <div className="life-paper"><span>On the board</span><strong>{data.householdNote}</strong></div>}
    <p className="life-hint">No needs bars. Walk outside, work if you want something, cook when it feels right, or do nothing useful at all.</p>
  </aside>;
}

function friendly(value: string): string { return value.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }
