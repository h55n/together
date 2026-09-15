import { describe, expect, it } from 'vitest';
import { MaterialLibrary } from './MaterialLibrary';
import { AmayaBayEnvironment } from './AmayaBayEnvironment';

describe('AmayaBayEnvironment', () => {
  it('keeps water and named hero landmarks permanent, but not streamed route geometry', () => {
    const environment = new AmayaBayEnvironment(new MaterialLibrary());
    const names = environment.root.children.map((child) => child.name);

    expect(names).not.toContain('amaya-road-network');
    expect(names).toContain('landmark:bay-steps');
    expect(names).toContain('landmark:mogra-park');
  });
});
