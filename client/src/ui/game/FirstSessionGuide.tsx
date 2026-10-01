import { nextFirstSessionAction, type FirstSessionAction } from '../../game/core/FirstSession';

const LESSONS = {
  look: { title: 'Take a look around', copy: 'Click the world and move your mouse. If cursor capture is unavailable, hold and drag. Esc releases the cursor.', key: 'Mouse' },
  walk: { title: 'Find your feet', copy: 'Walk a few steps with W A S D. Hold Shift for a gentle jog. Your first day has no timer.', key: 'W A S D' },
  interact: { title: 'Make yourself at home', copy: 'Approach your kitchen, a seat, or a neighbour. When a prompt appears, press E to try it.', key: 'E' },
};
export function FirstSessionGuide({ completed, onSkip, onMap }: { completed: readonly FirstSessionAction[]; onSkip: () => void; onMap: () => void }) {
  const next = nextFirstSessionAction(completed);
  const lesson = next ? LESSONS[next] : null;
  return <aside className="first-session-guide" aria-label="Your first day" data-testid="first-session-guide">
    <div className="guide-heading"><span>YOUR FIRST DAY</span><button onClick={onSkip} aria-label="Dismiss first day guide">×</button></div>
    <div className="guide-progress" aria-label={`${completed.length} of 3 discoveries complete`}>{['look', 'walk', 'interact'].map(action => <span key={action} className={completed.includes(action as FirstSessionAction) ? 'complete' : ''}/>)}</div>
    <h2>{lesson?.title ?? 'The town is yours to discover'}</h2>
    <p>{lesson?.copy ?? 'Find a café shift, visit the park, or take the long way to the bay. Choose a place on the town map.'}</p>
    {lesson ? <kbd>{lesson.key}</kbd> : <button className="primary-action" onClick={onMap}>Find your first outing</button>}
    <button className="guide-map" onClick={onMap}>Open the town map <span>M ↗</span></button>
  </aside>;
}
