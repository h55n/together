import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type ClientIdentity = {
  userId: string;
  accessToken?: string;
  mode: 'supabase' | 'development';
};

type AuthEnvironment = {
  production: boolean;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

let supabase: SupabaseClient | null = null;
let identityPromise: Promise<ClientIdentity> | null = null;

export function resolveAuthStrategy(environment: AuthEnvironment): 'supabase' | 'development' {
  const hasUrl = Boolean(environment.supabaseUrl?.trim());
  const hasKey = Boolean(environment.supabaseAnonKey?.trim());
  if (hasUrl !== hasKey) throw new Error('Supabase client auth requires both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  if (hasUrl && hasKey) return 'supabase';
  if (environment.production) throw new Error('Production client requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  return 'development';
}

export function resolveClientIdentity(): Promise<ClientIdentity> {
  identityPromise ??= createClientIdentity();
  return identityPromise;
}

export function subscribeClientIdentity(listener: (identity: ClientIdentity) => void): () => void {
  if (!supabase) return () => undefined;
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!session) return;
    listener({
      userId: session.user.id,
      accessToken: session.access_token,
      mode: 'supabase',
    });
  });
  return () => data.subscription.unsubscribe();
}

export function authHeadersForIdentity(
  identity: Pick<ClientIdentity, 'userId' | 'accessToken'>,
  json = false,
): Record<string, string> {
  const headers: Record<string, string> = {};
  if (json) headers['Content-Type'] = 'application/json';
  if (identity.accessToken) headers.Authorization = `Bearer ${identity.accessToken}`;
  else headers['x-dev-user-id'] = identity.userId;
  return headers;
}

async function createClientIdentity(): Promise<ClientIdentity> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  const strategy = resolveAuthStrategy({
    production: import.meta.env.PROD,
    ...(supabaseUrl ? { supabaseUrl } : {}),
    ...(supabaseAnonKey ? { supabaseAnonKey } : {}),
  });

  if (strategy === 'development') {
    return { userId: getOrCreateDevelopmentUserId(), mode: 'development' };
  }

  supabase ??= createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  const existing = await supabase.auth.getSession();
  if (existing.error) throw new Error(`Could not restore Together sign-in: ${existing.error.message}`);
  let session = existing.data.session;

  if (!session) {
    const created = await supabase.auth.signInAnonymously();
    if (created.error || !created.data.session) {
      throw new Error(`Could not start anonymous Together session: ${created.error?.message ?? 'no session returned'}`);
    }
    session = created.data.session;
  }

  return {
    userId: session.user.id,
    accessToken: session.access_token,
    mode: 'supabase',
  };
}

function getOrCreateDevelopmentUserId(): string {
  const existing = localStorage.getItem('together:dev-user-id');
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem('together:dev-user-id', id);
  return id;
}
