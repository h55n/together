import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { ActivityTravelHint } from './ActivityTravelHint';

describe('free-roam activity controls', () => {
  it('keeps the outing nonmodal and allows cancellation during save', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = createRoot(host);
    const finish = vi.fn(), cancel = vi.fn();
    try {
      await act(async () => root.render(<ActivityTravelHint kind="kayak" busy={false} message={null} onFinish={finish} onCancel={cancel} />));
      expect(host.querySelector('[aria-modal], [role="dialog"]')).toBeNull();
      expect(host.textContent).toContain('Take your time');
      const buttons = () => Array.from(host.querySelectorAll('button'));
      await act(async () => buttons()[0]!.click());
      expect(finish).toHaveBeenCalledOnce();
      await act(async () => root.render(<ActivityTravelHint kind="kayak" busy message="Saving…" onFinish={finish} onCancel={cancel} />));
      await act(async () => { buttons()[0]!.click(); buttons()[1]!.click(); });
      expect(finish).toHaveBeenCalledOnce();
      expect(cancel).toHaveBeenCalledOnce();
    } finally { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); }
  });
});
