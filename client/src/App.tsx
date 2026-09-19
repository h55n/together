import { useCallback, useEffect, useState, type CSSProperties, type FormEvent, type ReactElement, type ReactNode } from 'react';
import type { AvatarConfig, HouseholdType, StarterPropertyDefinition, VoteChoice } from '@together/shared';
import { GameCanvas } from './ui/game/GameCanvas';
import { authHeadersForIdentity, resolveClientIdentity, subscribeClientIdentity, type ClientIdentity } from './auth/clientAuth';

export type HouseholdMemberSummary = {
  userId: string;
  personalWallet: number;
  membershipState: 'active' | 'left';
};

export type HouseholdSummary = {
  id: string;
  type: HouseholdType;
  name: string;
  inviteCode: string;
  propertyId?: string;
  sharedWallet: number;
  hiddenState?: Record<string, unknown>;
  members: HouseholdMemberSummary[];
};

type PropertyVote = {
  id: string;
  payload: { propertyId?: string; propertyDefinitionId?: string };
  ballots: Record<string, VoteChoice>;
  resolution: 'pending' | 'approved' | 'rejected' | 'tied';
};

type PropertyPayload = { properties: StarterPropertyDefinition[]; vote: PropertyVote | null };
type EntryStep = 'identity' | 'household' | 'home' | 'game';

const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  bodyFrame: 'average', height: 1.72, skinTone: 5, faceBase: 'face_01', hair: 'hair_01', hairColor: '#2f211b',
  homeOutfit: 'home_sage', outdoorOutfit: 'outdoor_terracotta', sleepOutfit: 'sleep_soft',
};

export default function App(): ReactElement {
  const [identity, setIdentity] = useState<ClientIdentity | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const userId = identity?.userId ?? '';
  const [displayName, setDisplayName] = useState(() => localStorage.getItem('together:display-name') ?? '');
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(() => loadAvatarConfig());
  const [step, setStep] = useState<EntryStep>(() => displayName ? 'household' : 'identity');
  const [household, setHousehold] = useState<HouseholdSummary | null>(null);
  const [properties, setProperties] = useState<StarterPropertyDefinition[]>([]);
  const [propertyVote, setPropertyVote] = useState<PropertyVote | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: () => void = () => undefined;
    void resolveClientIdentity()
      .then((resolved) => {
        if (cancelled) return;
        setIdentity(resolved);
        unsubscribe = subscribeClientIdentity((updated) => { if (!cancelled) setIdentity(updated); });
      })
      .catch((error: unknown) => { if (!cancelled) setAuthError(errorMessage(error)); });
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  const authHeaders = identity ? authHeadersForIdentity(identity, true) : { 'Content-Type': 'application/json' };

  const refreshHousehold = useCallback(async (id = household?.id) => {
    if (!id || !identity) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/households/${id}`, { headers: authHeadersForIdentity(identity) });
      const data = await readJson<HouseholdSummary>(response);
      setHousehold(data);
      localStorage.setItem('together:household-id', data.id);
      if (data.propertyId) setStep('home');
      const propertyResponse = await fetch(`/api/households/${id}/properties`, { headers: authHeadersForIdentity(identity) });
      const propertyData = await readJson<PropertyPayload>(propertyResponse);
      setProperties(propertyData.properties);
      setPropertyVote(propertyData.vote);
      if (data.propertyId) setMessage('Your home is ready.');
      else if (data.members.filter((member) => member.membershipState === 'active').length < 2) setMessage('Share the invite code. Home selection opens when someone joins you.');
      else setMessage(null);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }, [household?.id, identity]);

  useEffect(() => {
    if (!displayName || household) return;
    const rememberedHouseholdId = localStorage.getItem('together:household-id');
    if (!rememberedHouseholdId) return;
    void Promise.resolve()
      .then(() => refreshHousehold(rememberedHouseholdId))
      .catch(() => {
        localStorage.removeItem('together:household-id');
        setStep('household');
      });
  }, [displayName, household, refreshHousehold]);

  if (authError) return <EntryShell eyebrow="Together · Amaya Bay" title="Sign-in unavailable" copy={authError}><p className="status-copy error-copy">Check the client authentication configuration and reload.</p></EntryShell>;
  if (!identity) return <EntryShell eyebrow="Together · Amaya Bay" title="Arriving in Amaya Bay" copy="Starting your private session…"><p className="status-copy">Connecting securely…</p></EntryShell>;

  const startSoloExplorer = async () => {
    setBusy(true); setMessage(null);
    try {
      const response = await fetch('/api/solo-explorer', { method: 'POST', headers: authHeaders, body: '{}' });
      const data = await readJson<HouseholdSummary>(response);
      setHousehold(data); localStorage.setItem('together:household-id', data.id); setStep('home');
    } catch (error) { setMessage(errorMessage(error)); }
    finally { setBusy(false); }
  };
  const isSoloExplorer = household?.hiddenState?.soloExplorer === true;

  if (step === 'game' && household) {
    return <GameCanvas networkSession={{ userId, householdId: household.id, ...(identity.accessToken ? { accessToken: identity.accessToken } : {}) }} avatarConfig={avatarConfig} {...(household.propertyId ? { propertyId: household.propertyId } : {})} onPropertyChanged={(propertyId) => setHousehold((current) => current ? { ...current, propertyId } : current)} />;
  }

  if (step === 'identity') {
    return (
      <EntryShell eyebrow="Together · Amaya Bay" title="Who is arriving?" copy="Choose the name your household will see. Account linking comes after the first meaningful session.">
        <form onSubmit={(event) => {
          event.preventDefault();
          const value = displayName.trim();
          if (!value) return;
          setBusy(true); setMessage(null);
          void fetch('/api/profile', { method: 'PUT', headers: authHeaders, body: JSON.stringify({ displayName: value, avatarConfig, settings: {} }) })
            .then(async (response) => { if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? 'Could not save profile'); })
            .then(() => {
              localStorage.setItem('together:display-name', value);
              localStorage.setItem('together:avatar-config', JSON.stringify(avatarConfig));
              setDisplayName(value);
              setStep('household');
            })
            .catch((error: unknown) => setMessage(errorMessage(error)))
            .finally(() => setBusy(false));
        }} className="entry-form">
          <label className="field-label" htmlFor="display-name">Display name</label>
          <input id="display-name" className="text-field" value={displayName} maxLength={32} autoFocus onChange={(event) => setDisplayName(event.target.value)} placeholder="e.g. Mira" />
          <AvatarCreator config={avatarConfig} onChange={setAvatarConfig} />
          {message && <p className="status-copy error-copy">{message}</p>}
          <button className="primary-action" type="submit" disabled={!displayName.trim() || busy}>{busy ? 'Saving…' : 'Continue'}</button>
        </form>
      </EntryShell>
    );
  }

  if (step === 'household') {
    return <HouseholdEntry
      displayName={displayName}
      busy={busy}
      message={message}
      onCreate={async (name, type) => {
        setBusy(true); setMessage(null);
        try {
          const response = await fetch('/api/households', { method: 'POST', headers: authHeaders, body: JSON.stringify({ name, type }) });
          const data = await readJson<HouseholdSummary>(response);
          setHousehold(data); localStorage.setItem('together:household-id', data.id); setStep('home');
        } catch (error) { setMessage(errorMessage(error)); }
        finally { setBusy(false); }
      }}
      onExplore={startSoloExplorer}
      onJoin={async (code) => {
        setBusy(true); setMessage(null);
        try {
          const response = await fetch(`/api/households/join/${code.trim().toUpperCase()}`, { method: 'POST', headers: authHeaders, body: '{}' });
          const data = await readJson<HouseholdSummary>(response);
          setHousehold(data); localStorage.setItem('together:household-id', data.id); setStep('home');
        } catch (error) { setMessage(errorMessage(error)); }
        finally { setBusy(false); }
      }}
    />;
  }

  return (
    <EntryShell eyebrow={isSoloExplorer ? 'Solo Explorer' : `${household?.type === 'couple' ? 'Couple' : 'Friends'} household`} title={isSoloExplorer ? 'Explore Amaya Bay' : household?.name ?? 'Your household'} copy={isSoloExplorer ? 'A one-person world session with a ready home. Walk the bay, meet the town, and try the daily systems at your own pace.' : 'People first, then home. Nobody silently decides the shared life alone.'}>
      {household && (
        <div className="home-selection">
          {!isSoloExplorer && <div className="invite-strip">
            <span>Invite code</span><strong>{household.inviteCode}</strong>
            <button className="quiet-action" onClick={() => void navigator.clipboard?.writeText(household.inviteCode)}>Copy</button>
          </div>}
          <p className="member-line">{isSoloExplorer ? 'One explorer · ready home' : `${household.members.filter((member) => member.membershipState === 'active').length} member${household.members.length === 1 ? '' : 's'} present`} · shared ₹{household.sharedWallet.toLocaleString('en-IN')}</p>
          {message && <p className="status-copy">{message}</p>}
          {!household.propertyId && household.members.filter((member) => member.membershipState === 'active').length >= 2 && (
            <PropertySelection properties={properties} vote={propertyVote} userId={userId} busy={busy}
              onOpen={async (propertyId) => {
                setBusy(true); setMessage(null);
                try {
                  const response = await fetch(`/api/households/${household.id}/property-votes`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ propertyId }) });
                  setPropertyVote(await readJson<PropertyVote>(response));
                } catch (error) { setMessage(errorMessage(error)); }
                finally { setBusy(false); }
              }}
              onCast={async (choice) => {
                if (!propertyVote) return;
                setBusy(true); setMessage(null);
                try {
                  const response = await fetch(`/api/property-votes/${propertyVote.id}/cast`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ choice }) });
                  const vote = await readJson<PropertyVote>(response);
                  setPropertyVote(vote);
                  if (vote.resolution === 'approved') await refreshHousehold(household.id);
                } catch (error) { setMessage(errorMessage(error)); }
                finally { setBusy(false); }
              }}
            />
          )}
          <div className="entry-actions">
            {!isSoloExplorer && <button className="secondary-action" disabled={busy} onClick={() => void refreshHousehold(household.id)}>Refresh household</button>}
            {isSoloExplorer && <button className="secondary-action" disabled={busy} onClick={() => void startSoloExplorer()}>Start a fresh explorer</button>}
            {household.propertyId && <button className="primary-action" onClick={() => setStep('game')}>{isSoloExplorer ? 'Explore Amaya Bay' : 'Unlock the door · Enter Amaya Bay'}</button>}
          </div>
        </div>
      )}
    </EntryShell>
  );
}

function HouseholdEntry(props: {
  displayName: string; busy: boolean; message: string | null;
  onCreate: (name: string, type: HouseholdType) => Promise<void>;
  onJoin: (code: string) => Promise<void>;
  onExplore: () => Promise<void>;
}): ReactElement {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [name, setName] = useState(`${props.displayName}'s home`);
  const [type, setType] = useState<HouseholdType>('couple');
  const [code, setCode] = useState('');
  const submit = (event: FormEvent) => { event.preventDefault(); void (mode === 'create' ? props.onCreate(name.trim(), type) : props.onJoin(code)); };
  return (
    <EntryShell eyebrow={`Welcome, ${props.displayName}`} title="Create a household" copy="Couple and Friends use the same world. Only the social rules and story weighting differ.">
      <div className="segmented"><button className={mode === 'create' ? 'active' : ''} onClick={() => setMode('create')}>Create</button><button className={mode === 'join' ? 'active' : ''} onClick={() => setMode('join')}>Join</button></div>
      <form className="entry-form" onSubmit={submit}>
        {mode === 'create' ? <>
          <div className="household-types">
            <button type="button" className={type === 'couple' ? 'selection-card selected' : 'selection-card'} onClick={() => setType('couple')}><strong>Couple</strong><span>Two people · co-presence protected</span></button>
            <button type="button" className={type === 'friends' ? 'selection-card selected' : 'selection-card'} onClick={() => setType('friends')}><strong>Friends</strong><span>2–6 people · persistent shared home</span></button>
          </div>
          <label className="field-label" htmlFor="house-name">Household name</label><input id="house-name" className="text-field" value={name} maxLength={40} onChange={(event) => setName(event.target.value)} />
        </> : <><label className="field-label" htmlFor="invite-code">Six-character invite code</label><input id="invite-code" className="text-field invite-input" value={code} maxLength={6} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="ABC234" /></>}
        {props.message && <p className="status-copy error-copy">{props.message}</p>}
        <button className="primary-action" disabled={props.busy || (mode === 'create' ? !name.trim() : code.trim().length !== 6)}>{props.busy ? 'Working…' : mode === 'create' ? 'Create household' : 'Join household'}</button>
      </form>
      <div className="entry-actions"><button className="secondary-action" disabled={props.busy} onClick={() => void props.onExplore()}>Explore Amaya Bay solo</button></div>
      <p className="status-copy">Start with a ready home and explore the complete world without an invite. You can begin a fresh explorer session at any time.</p>
    </EntryShell>
  );
}

function PropertySelection(props: {
  properties: StarterPropertyDefinition[]; vote: PropertyVote | null; userId: string; busy: boolean;
  onOpen: (propertyId: string) => Promise<void>; onCast: (choice: VoteChoice) => Promise<void>;
}): ReactElement {
  const activeVote = props.vote && (props.vote.resolution === 'pending' || props.vote.resolution === 'tied') ? props.vote : null;
  if (activeVote) {
    const definition = props.properties.find((property) => property.id === activeVote.payload.propertyDefinitionId);
    const myVote = activeVote.ballots[props.userId];
    return <div className="vote-card"><p className="eyebrow">Shared property decision</p><h2>{definition?.displayName ?? 'Proposed home'}</h2><p>{activeVote.resolution === 'tied' ? 'The vote tied. Talk it through and cast again.' : myVote ? `You voted ${myVote}. Waiting for the household.` : 'A household member proposed this home.'}</p><div className="vote-actions"><button disabled={props.busy} className="secondary-action" onClick={() => void props.onCast('no')}>Not this one</button><button disabled={props.busy} className="primary-action" onClick={() => void props.onCast('yes')}>Choose this home</button></div></div>;
  }
  return <div className="property-grid">{props.properties.map((property) => <article className="property-card" key={property.id}><div><p className="eyebrow">{property.maxCapacity} people max</p><h2>{property.displayName}</h2><p>{property.rooms.slice(0, 5).join(' · ')}</p></div><button className="secondary-action" disabled={props.busy} onClick={() => void props.onOpen(property.id)}>Propose this home</button></article>)}</div>;
}

function EntryShell(props: { eyebrow: string; title: string; copy: string; children: ReactNode }): ReactElement {
  return <main className="arrival-screen"><div className="arrival-sky" aria-hidden="true" /><section className="arrival-card"><p className="eyebrow">{props.eyebrow}</p><h1>{props.title}</h1><p className="arrival-copy">{props.copy}</p>{props.children}</section></main>;
}

function AvatarCreator({ config, onChange }: { config: AvatarConfig; onChange: (next: AvatarConfig) => void }): ReactElement {
  const skinTones = [2, 4, 6, 8, 10, 12] as const;
  const frames: AvatarConfig['bodyFrame'][] = ['slim', 'average', 'broad'];
  return <div className="avatar-creator">
    <div><span className="field-label">Body frame</span><div className="segmented">{frames.map((frame) => <button type="button" key={frame} className={config.bodyFrame === frame ? 'active' : ''} onClick={() => onChange({ ...config, bodyFrame: frame })}>{frame}</button>)}</div></div>
    <div><span className="field-label">Skin tone</span><div className="avatar-swatches">{skinTones.map((tone) => <button type="button" key={tone} aria-label={`Skin tone ${tone}`} className={config.skinTone === tone ? 'avatar-swatch selected' : 'avatar-swatch'} style={{ '--swatch': skinToneCss(tone) } as CSSProperties} onClick={() => onChange({ ...config, skinTone: tone })} />)}</div></div>
    <label className="field-label" htmlFor="avatar-height">Height · {config.height.toFixed(2)}m</label>
    <input id="avatar-height" type="range" min="1.5" max="1.95" step="0.01" value={config.height} onChange={(event) => onChange({ ...config, height: Number(event.target.value) })} />
    <label className="field-label" htmlFor="outfit-style">Outdoor outfit</label>
    <select id="outfit-style" className="text-field" value={config.outdoorOutfit} onChange={(event) => onChange({ ...config, outdoorOutfit: event.target.value })}>
      <option value="outdoor_terracotta">Terracotta casual</option><option value="outdoor_blue">Rainy blue</option><option value="outdoor_sage">Sage everyday</option><option value="outdoor_mustard">Muted mustard</option>
    </select>
  </div>;
}

function skinToneCss(tone: number): string {
  return ['#f1c7a7','#eab996','#dda982','#d09a74','#c28a66','#b47a5a','#a36c50','#925e47','#80503d','#6d4334','#59362b','#472a23'][Math.max(0, Math.min(11, tone - 1))]!;
}

function loadAvatarConfig(): AvatarConfig {
  try {
    const raw = localStorage.getItem('together:avatar-config');
    return raw ? { ...DEFAULT_AVATAR_CONFIG, ...(JSON.parse(raw) as Partial<AvatarConfig>) } : DEFAULT_AVATAR_CONFIG;
  } catch { return DEFAULT_AVATAR_CONFIG; }
}

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status})`);
  return data;
}

function errorMessage(error: unknown): string { return error instanceof Error ? error.message : 'Something went wrong'; }
