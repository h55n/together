/** Bound an external async operation without allowing late settlement to resume startup. */
export function awaitPreparation<T>(operation: Promise<T>, signal: AbortSignal, label: string, timeoutMs = 15_000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (complete: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      complete();
    };
    const abort = (): void => finish(() => reject(new Error(`${label} was cancelled.`)));
    // Attach both handlers even when already cancelled: the underlying GPU/WASM
    // request cannot necessarily be stopped and may reject after we have left.
    operation.then(value => finish(() => resolve(value)), cause => finish(() => reject(cause)));
    if (signal.aborted) { abort(); return; }
    signal.addEventListener('abort', abort, { once: true });
    timer = setTimeout(() => finish(() => reject(new Error(`${label} timed out. Retry the world or use compatibility graphics.`))), timeoutMs);
  });
}
