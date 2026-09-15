import type { ReactElement } from 'react';
import type { GameSettings, QualityTier } from '@together/shared';

export function GameSettingsPanel(props: {
  open: boolean;
  settings: GameSettings;
  onChange: (next: GameSettings) => void;
  onClose: () => void;
}): ReactElement | null {
  if (!props.open) return null;
  const update = <K extends keyof GameSettings>(key: K, value: GameSettings[K]): void => props.onChange({ ...props.settings, [key]: value });
  return <div className="settings-backdrop" role="dialog" aria-modal="true" aria-label="Together settings">
    <section className="settings-panel">
      <header><div><p className="eyebrow">Comfort & accessibility</p><h2>Settings</h2></div><button className="paper-button" onClick={props.onClose}>Close</button></header>
      <div className="settings-grid">
        <label><span>Field of view <strong>{Math.round(props.settings.fov)}°</strong></span><input type="range" min="70" max="95" step="1" value={props.settings.fov} onChange={(event) => update('fov', Number(event.target.value))} /></label>
        <label><span>Head bob <strong>{Math.round((props.settings.headBob / 0.04) * 100)}%</strong></span><input type="range" min="0" max="0.04" step="0.002" value={props.settings.headBob} disabled={props.settings.reducedMotion} onChange={(event) => update('headBob', Number(event.target.value))} /></label>
        <label><span>UI scale <strong>{Math.round(props.settings.uiScale * 100)}%</strong></span><input type="range" min="0.8" max="1.5" step="0.05" value={props.settings.uiScale} onChange={(event) => update('uiScale', Number(event.target.value))} /></label>
        <label><span>World audio <strong>{Math.round(props.settings.masterVolume * 100)}%</strong></span><input type="range" min="0" max="1" step="0.05" value={props.settings.masterVolume} onChange={(event) => update('masterVolume', Number(event.target.value))} /></label>
        <label><span>Quality</span><select value={props.settings.quality} onChange={(event) => update('quality', event.target.value as QualityTier)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="capture">Capture / Ultra</option></select></label>
        <label className="toggle-row"><span>Reduced motion</span><input type="checkbox" checked={props.settings.reducedMotion} onChange={(event) => update('reducedMotion', event.target.checked)} /></label>
        <label className="toggle-row"><span>High-contrast interaction prompts</span><input type="checkbox" checked={props.settings.highContrastPrompt} onChange={(event) => update('highContrastPrompt', event.target.checked)} /></label>
        <label className="toggle-row"><span>Subtitles</span><input type="checkbox" checked={props.settings.subtitles} onChange={(event) => update('subtitles', event.target.checked)} /></label>
        <fieldset className="binding-grid"><legend>Keyboard controls</legend>{(['forward','back','left','right','jog','interact','cameraToggle','dismount'] as const).map((action) => <label key={action}><span>{humanizeBinding(action)}</span><select value={props.settings.bindings[action]} onChange={(event) => update('bindings', { ...props.settings.bindings, [action]: event.target.value })}>{bindingOptions.map((code) => <option value={code} key={code}>{friendlyCode(code)}</option>)}</select></label>)}</fieldset>
      </div>
      <p className="settings-note">Controller: left stick move · right stick camera · A interact · RB jog · X dismount · Y/Menu camera. Keyboard panel shortcuts remain B Memory, Tab Life, M Map, O Settings.</p>
    </section>
  </div>;
}

const bindingOptions = ['KeyW','KeyA','KeyS','KeyD','KeyE','KeyF','KeyQ','KeyV','KeyX','ShiftLeft','ShiftRight','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'] as const;
function humanizeBinding(value: string): string { return value.replace(/([A-Z])/g, ' $1').trim().replace(/^./, (letter) => letter.toUpperCase()); }
function friendlyCode(code: string): string { return code.replace('Key','').replace('ShiftLeft','Left Shift').replace('ShiftRight','Right Shift').replace('Arrow','Arrow '); }
