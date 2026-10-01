import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { memoryImageIdFromPath } from '@together/shared';
import type { NetworkSession } from '../../network/GameSocketClient';
import { authHeadersForIdentity } from '../../auth/clientAuth';
import { apiFetch } from '../../network/api';

export type MemoryView = {
  id: string;
  type: 'manual' | 'automatic' | 'story' | 'milestone' | 'moving';
  screenshotPath: string;
  caption: string;
  locationId: string;
  weather: string;
  participants: string[];
  eventId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export function MemoryBook(props: {
  open: boolean;
  memories: MemoryView[];
  networkSession: NetworkSession;
  onClose: () => void;
  onCaptionChange: (memoryId: string, caption: string) => Promise<void>;
  onExport: (memory: MemoryView) => Promise<void>;
}): ReactElement | null {
  const { open, memories, networkSession } = props;
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState('');

  const sorted = useMemo(() => [...memories].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [memories]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const created: string[] = [];
    const load = async (): Promise<void> => {
      const next: Record<string, string> = {};
      for (const memory of sorted) {
        const imageId = memoryImageIdFromPath(memory.screenshotPath);
        if (!imageId) continue;
        try {
          const response = await apiFetch(`/api/households/${networkSession.householdId}/memory-images/${imageId}`, {
            headers: authHeadersForIdentity(networkSession),
          });
          if (!response.ok) continue;
          const url = URL.createObjectURL(await response.blob());
          created.push(url);
          next[memory.id] = url;
        } catch {
          // A missing image should not make the rest of the private scrapbook unreadable.
        }
      }
      if (!cancelled) setUrls(next);
      else created.forEach((url) => URL.revokeObjectURL(url));
    };
    void load();
    return () => {
      cancelled = true;
      created.forEach((url) => URL.revokeObjectURL(url));
      setUrls({});
    };
  }, [networkSession.accessToken, networkSession.householdId, networkSession.userId, open, sorted]);

  if (!open) return null;
  return <div className="memory-backdrop" role="dialog" aria-modal="true" aria-label="Household Memory Book">
    <section className="memory-book">
      <header className="memory-header">
        <div><p className="memory-kicker">Our life in Amaya Bay</p><h2>Memory Book</h2></div>
        <button className="paper-button" onClick={props.onClose}>Close · B</button>
      </header>
      {sorted.length === 0 ? <div className="memory-empty"><strong>No pages yet.</strong><span>Press P in the world when a moment feels worth keeping.</span></div> :
        <div className="memory-grid">{sorted.map((memory, index) => <article key={memory.id} className={`memory-page memory-page-${index % 3}`}>
          <div className="memory-photo-wrap">
            {urls[memory.id] ? <img src={urls[memory.id]} alt={memory.caption} className="memory-photo" /> : <div className="memory-photo-placeholder">Private image</div>}
            <span className="memory-tape" aria-hidden="true" />
          </div>
          <div className="memory-meta-row"><span>{friendlyLocation(memory.locationId)}</span><span>{friendlyWeather(memory.weather)}</span></div>
          {editing === memory.id ? <form className="memory-caption-form" onSubmit={(event) => {
            event.preventDefault();
            const value = captionDraft.trim();
            if (!value) return;
            void props.onCaptionChange(memory.id, value).then(() => setEditing(null));
          }}>
            <input autoFocus value={captionDraft} maxLength={240} onChange={(event) => setCaptionDraft(event.target.value)} />
            <button type="submit">Save</button>
          </form> : <button className="memory-caption" onClick={() => { setEditing(memory.id); setCaptionDraft(memory.caption); }}>{memory.caption}</button>}
          <footer><span>{new Date(memory.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span><span>{memory.type}</span><button className="memory-export" onClick={() => void props.onExport(memory)}>Export card</button></footer>
        </article>)}</div>}
    </section>
  </div>;
}

function friendlyLocation(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function friendlyWeather(value: string): string {
  return value.replaceAll('_', ' ');
}
