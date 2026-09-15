import type { ReactElement } from 'react';
import { namedNpcs, npcDialogue } from '@together/content';

export type NpcRelationshipView = { npcId: string; flags: string[]; familiarity: number; lastInteraction?: string };

export function NpcPanel(props: {
  npcId: string | null;
  relationship: NpcRelationshipView | null;
  weather: string;
  busy: boolean;
  onTalk: () => Promise<void>;
  onClose: () => void;
}): ReactElement | null {
  if (!props.npcId) return null;
  const npc = namedNpcs.find((entry) => entry.id === props.npcId);
  const dialogue = npcDialogue[props.npcId];
  if (!npc || !dialogue) return null;
  const rainy = props.weather.includes('rain') || props.weather === 'thunderstorm';
  const familiar = (props.relationship?.familiarity ?? 0) >= 2 || (props.relationship?.flags.length ?? 0) > 1;
  const line = rainy ? dialogue.weather : familiar ? dialogue.familiar : dialogue.greeting;
  return <section className="game-panel npc-panel" aria-label={`Talk to ${npc.displayName}`}>
    <header className="panel-header"><div><p className="eyebrow">Amaya Bay resident</p><h2>{npc.displayName}</h2></div><button className="panel-close" onClick={props.onClose}>Close</button></header>
    <p className="muted-copy">{npc.role}</p>
    <blockquote className="npc-dialogue">“{line}”</blockquote>
    <div className="entry-actions"><button className="primary-action" disabled={props.busy} onClick={() => void props.onTalk()}>{props.busy ? 'Talking…' : familiar ? 'Stay and chat' : 'Introduce yourself'}</button></div>
  </section>;
}
