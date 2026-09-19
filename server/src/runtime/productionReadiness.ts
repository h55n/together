export type ProductionReadiness = {
  ready: boolean;
  issues: string[];
};

export function productionReadiness(env: NodeJS.ProcessEnv = process.env): ProductionReadiness {
  if (env.NODE_ENV !== 'production') return { ready: true, issues: [] };

  const issues: string[] = [];
  required(env, 'SUPABASE_URL', issues);
  required(env, 'SUPABASE_SERVICE_ROLE_KEY', issues);
  required(env, 'CLIENT_URL', issues);

  const clientUrl = env.CLIENT_URL?.trim();
  if (clientUrl) {
    try {
      const parsed = new URL(clientUrl);
      if (parsed.protocol !== 'https:') issues.push('CLIENT_URL must use https in production');
    } catch {
      issues.push('CLIENT_URL must be a valid absolute URL');
    }
  }

  if (env.ALLOW_DEV_AUTH === 'true') issues.push('ALLOW_DEV_AUTH must not be enabled in production');
  return { ready: issues.length === 0, issues };
}

function required(env: NodeJS.ProcessEnv, name: string, issues: string[]): void {
  if (!env[name]?.trim()) issues.push(`${name} is required in production`);
}
