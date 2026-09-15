import type { ReactElement } from 'react';
import type { StoryDefinition, StoryTaskStateValue } from '@together/shared';

export type StoryInstanceView = {
  id: string;
  eventId: string;
  state: 'active' | 'resolved';
  branch?: string;
  taskState: Record<string, StoryTaskStateValue>;
  memoryTag?: string;
};

export function StoryPanel(props: {
  open: boolean;
  active: StoryInstanceView | null;
  eligible: readonly StoryDefinition[];
  definitions: readonly StoryDefinition[];
  busy: boolean;
  message: string | null;
  onStart: (eventId: string) => Promise<void>;
  onTask: (instanceId: string, taskId: string, state: StoryTaskStateValue) => Promise<void>;
  onResolve: (instanceId: string) => Promise<void>;
  onClose: () => void;
}): ReactElement | null {
  if (!props.open) return null;
  const definition = props.active ? props.definitions.find((item) => item.id === props.active?.eventId) : undefined;
  const tasks = definition?.tasks ?? [];
  const ready = props.active && tasks.every((task) => task.optional || (props.active?.taskState[task.id] ?? 'pending') !== 'pending');
  return <section className="game-panel story-panel" aria-label="Current life story">
    <header className="panel-header"><div><p className="eyebrow">Life · quiet stories</p><h2>{definition?.title ?? 'What is happening lately'}</h2></div><button className="panel-close" onClick={props.onClose}>Close</button></header>
    {props.active && definition ? <>
      <p className="panel-copy">This is a situation in your household, not a quest timer. Do these things naturally in the world; use the buttons only to acknowledge the outcome when the physical system cannot infer it yet.</p>
      <div className="story-task-list">{tasks.map((task) => { const state = props.active?.taskState[task.id] ?? 'pending'; return <div key={task.id} className={`story-task ${state}`}><div><strong>{taskPrompt(task.type, task.target)}</strong><span>{state === 'pending' ? humanize(task.type) : humanize(state)}</span></div>{state === 'pending' && <div className="story-task-actions"><button className="quiet-action" disabled={props.busy} onClick={() => void props.onTask(props.active!.id, task.id, 'complete')}>Done</button><button className="quiet-action" disabled={props.busy} onClick={() => void props.onTask(props.active!.id, task.id, 'failed')}>It went wrong</button>{task.optional && <button className="quiet-action" disabled={props.busy} onClick={() => void props.onTask(props.active!.id, task.id, 'skipped')}>Skip</button>}</div>}</div>; })}</div>
      <button className="primary-action" disabled={props.busy || !ready} onClick={() => void props.onResolve(props.active!.id)}>Let this moment settle</button>
    </> : props.eligible.length > 0 ? <>
      <p className="panel-copy">One or two situations are ready to emerge from your current life. Start one when it feels natural; the city remains open either way.</p>
      <div className="story-card-list">{props.eligible.slice(0, 3).map((story) => <button key={story.id} className="story-card" disabled={props.busy} onClick={() => void props.onStart(story.id)}><strong>{story.title}</strong><span>{story.tasks.slice(0, 2).map((task) => taskPrompt(task.type, task.target)).join(' · ')}</span></button>)}</div>
    </> : <p className="panel-copy">Nothing is asking for attention right now. Walk, work, cook, sit somewhere, or simply go home.</p>}
    {props.message && <p className="status-copy">{props.message}</p>}
  </section>;
}

function taskPrompt(type: string, target: string): string {
  const value = humanize(target);
  if (type === 'location') return `Go to ${value}`;
  if (type === 'photo') return `Take a photo · ${value}`;
  if (type === 'purchase') return `Pick up ${value}`;
  if (type === 'micro_action') return value;
  if (type === 'vote') return `Decide together · ${value}`;
  if (type === 'choice') return `Talk it through · ${value}`;
  return value;
}
function humanize(value: string): string { return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }
