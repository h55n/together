export function apiUrl(path: string, serverBase = (import.meta.env.VITE_SERVER_URL as string | undefined) ?? ''): string {
  if (!path.startsWith('/')) throw new Error('API path must begin with /');
  const base = serverBase.trim().replace(/\/$/, '');
  return base ? `${base}${path}` : path;
}

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), init);
}
