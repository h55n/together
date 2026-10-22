const FOCUSABLE = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

/** One active game dialog owns keyboard focus; restore the world/opener on close. */
export function manageDialogFocus(shell: HTMLElement, fallback: HTMLElement | null): () => void {
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const inertBefore = new Map<HTMLElement, boolean>();
  let active: HTMLElement | null = null;
  const controls = (): HTMLElement[] => active ? [...active.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(element => !element.closest('[hidden], [inert], [aria-hidden="true"]') && getComputedStyle(element).display !== 'none') : [];
  const focusFirst = (): void => (controls()[0] ?? active)?.focus();
  const synchronize = (): void => {
    const dialogs = shell.querySelectorAll<HTMLElement>('[role="dialog"]');
    const next = dialogs[dialogs.length - 1] ?? null;
    if (next === active) return;
    active = next;
    for (const [element, wasInert] of inertBefore) element.inert = wasInert;
    inertBefore.clear();
    if (!active) return;
    for (const child of shell.children) {
      if (!(child instanceof HTMLElement) || child === active || child.contains(active)) continue;
      inertBefore.set(child, child.inert);
      child.inert = true;
    }
    if (!active.hasAttribute('tabindex')) active.tabIndex = -1;
    focusFirst();
  };
  const keydown = (event: KeyboardEvent): void => {
    if (!active || (event.key !== 'Tab' && event.code !== 'Tab')) return;
    const items = controls();
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) { event.preventDefault(); active.focus(); return; }
    if (!active.contains(document.activeElement) || (event.shiftKey && document.activeElement === first)) {
      event.preventDefault(); (event.shiftKey ? last : first).focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
    // Game hotkeys must never interpret a dialog's normal Tab as "open Life".
    event.stopPropagation();
  };
  const focusin = (event: FocusEvent): void => {
    if (active && event.target instanceof Node && !active.contains(event.target)) focusFirst();
  };
  const observer = new MutationObserver(synchronize);
  observer.observe(shell, { childList: true });
  document.addEventListener('keydown', keydown);
  document.addEventListener('focusin', focusin);
  synchronize();
  return () => {
    observer.disconnect();
    document.removeEventListener('keydown', keydown);
    document.removeEventListener('focusin', focusin);
    for (const [element, wasInert] of inertBefore) element.inert = wasInert;
    if (opener?.isConnected && !opener.closest('[inert]') && opener !== document.body) opener.focus();
    else if (fallback?.isConnected) fallback.focus();
  };
}
