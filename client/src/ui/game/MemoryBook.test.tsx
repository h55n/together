import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryBook, type MemoryView } from './MemoryBook';

let root: Root;
let host: HTMLDivElement;
const requests: Array<{ url: string; signal: AbortSignal | null | undefined }> = [];
const memories: MemoryView[] = Array.from({ length: 25 }, (_, i) => ({ id: `memory-${i}`, type: 'manual', screenshotPath: `memory-image:photo_${i}`, caption: `Moment ${i}`, locationId: 'mogra_court', weather: 'clear', participants: ['user-1'], metadata: {}, createdAt: new Date(2026, 8, 30, 0, i).toISOString() }));
const props = { memories, networkSession: { userId: 'user-1', householdId: 'home-1', accessToken: 'private-token' }, onClose() {}, onCaptionChange: async () => {}, onExport: async () => {} };

beforeEach(() => {
  requests.length = 0;
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    requests.push({ url: String(url), signal: init?.signal });
    return new Response(new Blob(['image']), { status: 200 });
  });
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => `blob:private-${requests.length}`), revokeObjectURL: vi.fn() });
});

afterEach(async () => {
  await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals();
});

async function render(open: boolean) {
  await act(async () => {
    root.render(<MemoryBook {...props} open={open} />);
    await new Promise(resolve => setTimeout(resolve, 0));
  });
}

it('loads only the visible page of a long private book and releases images on page change', async () => {
  await render(true);
  expect(host.querySelectorAll('.memory-page')).toHaveLength(12);
  expect(requests).toHaveLength(12);
  const next = [...host.querySelectorAll('button')].find(button => button.textContent === 'Older memories');
  expect(next).toBeDefined();
  await act(async () => { next?.click(); await new Promise(resolve => setTimeout(resolve, 0)); });
  expect(host.querySelectorAll('.memory-page')).toHaveLength(12);
  expect(requests).toHaveLength(24);
  expect(URL.revokeObjectURL).toHaveBeenCalledTimes(12);
});

it('aborts outstanding image requests when the book closes', async () => {
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    requests.push({ url: String(url), signal: init?.signal });
    return new Promise<Response>(() => {});
  });
  await render(true);
  expect(requests.length).toBeGreaterThan(0);
  await render(false);
  expect(requests.every(request => request.signal?.aborted)).toBe(true);
  expect(host.textContent).toBe('');
});

it('keeps a failed caption draft and lets the user retry saving', async () => {
  const save = vi.fn().mockRejectedValueOnce(new Error('Caption service unavailable')).mockResolvedValueOnce(undefined);
  await act(async () => root.render(<MemoryBook {...props} open onCaptionChange={save} />));
  await act(async () => (host.querySelector('.memory-caption') as HTMLButtonElement).click());
  await act(async () => {
    host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  expect(host.querySelector('[role="alert"]')?.textContent).toContain('Caption service unavailable');
  expect(host.querySelector('input')).not.toBeNull();
  await act(async () => {
    host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  expect(save).toHaveBeenCalledTimes(2);
  expect(host.querySelector('input')).toBeNull();
  expect(host.querySelector('[role="alert"]')).toBeNull();
});

it('reports an export failure without leaving an unhandled rejection', async () => {
  await act(async () => root.render(<MemoryBook {...props} open onExport={async () => { throw new Error('Export unavailable'); }} />));
  await act(async () => (host.querySelector('.memory-export') as HTMLButtonElement).click());
  expect(host.querySelector('[role="alert"]')?.textContent).toContain('Export unavailable');
  expect((host.querySelector('.memory-export') as HTMLButtonElement).disabled).toBe(false);
});

it('lets unavailable private images be retried without reopening the book', async () => {
  vi.stubGlobal('fetch', async () => new Response(null, { status: 503 }));
  await render(true);
  expect(host.textContent).toContain('Image unavailable');
  const retry = [...host.querySelectorAll('button')].find(button => button.textContent === 'Retry images');
  expect(retry).toBeDefined();
  vi.stubGlobal('fetch', async () => new Response(new Blob(['image']), { status: 200 }));
  await act(async () => { retry!.click(); await new Promise(resolve => setTimeout(resolve, 0)); });
  expect(host.querySelectorAll('.memory-photo')).toHaveLength(12);
  expect(host.textContent).not.toContain('Image unavailable');
});
