import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
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

type MemoryBookProps = {
  open: boolean;
  memories: MemoryView[];
  networkSession: NetworkSession;
  onClose: () => void;
  onCaptionChange: (memoryId: string, caption: string) => Promise<void>;
  onExport: (memory: MemoryView) => Promise<void>;
};

export function MemoryBook(props: MemoryBookProps): ReactElement | null {
  if (!props.open) return null;
  return <MemoryBookContent key={`${props.networkSession.householdId}:${props.networkSession.userId}`} {...props} />;
}

function MemoryBookContent(props: MemoryBookProps): ReactElement | null {
  const { open, memories, networkSession } = props;
  const { userId, householdId, accessToken } = networkSession;
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState('');
  const [page, setPage] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [imageAttempt, setImageAttempt] = useState(0);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [operationBusy, setOperationBusy] = useState(false);
  const operationGeneration = useRef(0);
  const busyRef = useRef(false);

  useEffect(() => {
    return () => { operationGeneration.current += 1; };
  }, []);

  const runOperation = async (operation: () => Promise<void>, savedCaption = false): Promise<void> => {
    if (busyRef.current) return;
    const generation = operationGeneration.current;
    busyRef.current = true;
    setOperationBusy(true);
    setOperationError(null);
    try {
      await operation();
      if (generation === operationGeneration.current && savedCaption) setEditing(null);
    } catch (cause) {
      if (generation === operationGeneration.current) {
        setOperationError(cause instanceof Error ? cause.message : 'Could not complete this action. Please try again.');
      }
    } finally {
      if (generation === operationGeneration.current) {
        busyRef.current = false;
        setOperationBusy(false);
      }
    }
  };

  const sorted = useMemo(() => [...memories].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [memories]);
  const pageCount = Math.max(1, Math.ceil(sorted.length / 12));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = useMemo(() => sorted.slice(currentPage * 12, (currentPage + 1) * 12), [sorted, currentPage]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const created: string[] = [];
    let cursor = 0;
    const load = async (): Promise<void> => {
      while (!controller.signal.aborted && cursor < visible.length) {
        const memory = visible[cursor++]!;
        const imageId = memoryImageIdFromPath(memory.screenshotPath);
        if (!imageId) continue;
        try {
          const response = await apiFetch(`/api/households/${householdId}/memory-images/${imageId}`, {
            headers: authHeadersForIdentity({ userId, ...(accessToken ? { accessToken } : {}) }),
            signal: controller.signal,
          });
          if (!response.ok) throw new Error(`Image request failed (${response.status})`);
          const blob = await response.blob();
          if (controller.signal.aborted) return;
          const url = URL.createObjectURL(blob);
          created.push(url);
          setUrls(current => ({ ...current, [memory.id]: url }));
        } catch {
          if (!controller.signal.aborted) setFailedImages(current => ({ ...current, [memory.id]: true }));
        }
      }
    };
    // Bounded parallelism makes the first images responsive without downloading
    // the entire private book or opening hundreds of concurrent requests.
    void Promise.all([load(), load(), load()]);
    return () => {
      controller.abort();
      created.forEach((url) => URL.revokeObjectURL(url));
      setUrls({});
      setFailedImages({});
    };
  }, [accessToken, householdId, userId, open, visible, imageAttempt]);

  if (!open) return null;
  return <div className="memory-backdrop" role="dialog" aria-modal="true" aria-label="Household Memory Book">
    <section className="memory-book">
      <header className="memory-header">
        <div><p className="memory-kicker">Our life in Amaya Bay</p><h2>Memory Book</h2></div>
        <button className="paper-button" onClick={props.onClose}>Close · B</button>
      </header>
      {operationError && <p role="alert">{operationError}</p>}
      {Object.keys(failedImages).length > 0 && <button className="paper-button" onClick={() => setImageAttempt(attempt => attempt + 1)}>Retry images</button>}
      {sorted.length === 0 ? <div className="memory-empty"><strong>No pages yet.</strong><span>Press P in the world when a moment feels worth keeping.</span></div> :
        <div className="memory-grid">{visible.map((memory, index) => <article key={memory.id} className={`memory-page memory-page-${index % 3}`}>
          <div className="memory-photo-wrap">
            {urls[memory.id] ? <img src={urls[memory.id]} alt={memory.caption} className="memory-photo" /> : <div className="memory-photo-placeholder">{failedImages[memory.id] ? 'Image unavailable' : 'Loading private image…'}</div>}
            <span className="memory-tape" aria-hidden="true" />
          </div>
          <div className="memory-meta-row"><span>{friendlyLocation(memory.locationId)}</span><span>{friendlyWeather(memory.weather)}</span></div>
          {editing === memory.id ? <form className="memory-caption-form" onSubmit={(event) => {
            event.preventDefault();
            const value = captionDraft.trim();
            if (!value) return;
            void runOperation(() => props.onCaptionChange(memory.id, value), true);
          }}>
            <input autoFocus aria-label="Memory caption" disabled={operationBusy} value={captionDraft} maxLength={240} onChange={(event) => setCaptionDraft(event.target.value)} />
            <button type="submit" disabled={operationBusy}>{operationBusy ? 'Saving…' : 'Save'}</button>
          </form> : <button className="memory-caption" disabled={operationBusy} onClick={() => { setEditing(memory.id); setCaptionDraft(memory.caption); }}>{memory.caption}</button>}
          <footer><span>{new Date(memory.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span><span>{memory.type}</span><button className="memory-export" disabled={operationBusy} onClick={() => void runOperation(() => props.onExport(memory))}>Export card</button></footer>
        </article>)}</div>}
      {pageCount > 1 && <nav className="memory-pagination" aria-label="Memory pages"><button className="paper-button" disabled={operationBusy || currentPage === 0} onClick={() => setPage(currentPage - 1)}>Newer memories</button><span aria-live="polite">Page {currentPage + 1} of {pageCount}</span><button className="paper-button" disabled={operationBusy || currentPage + 1 >= pageCount} onClick={() => setPage(currentPage + 1)}>Older memories</button></nav>}
    </section>
  </div>;
}

function friendlyLocation(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function friendlyWeather(value: string): string {
  return value.replaceAll('_', ' ');
}
