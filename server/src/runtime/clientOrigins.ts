export function allowedClientOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const configured = env.CLIENT_URL?.trim();
  if (env.NODE_ENV === 'production') return configured ? [configured] : [];
  return [...new Set([
    configured || 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:4173',
  ])];
}
