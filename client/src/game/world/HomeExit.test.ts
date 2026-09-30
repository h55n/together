import { expect, it } from 'vitest';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { MaterialLibrary } from './MaterialLibrary';
import { buildPropertyInterior } from './PropertyInterior';
import { createAmayaBayChunkFactory } from './AmayaBayChunkFactory';

it('lets a resident walk through the one-BHK doorway into the streamed neighbourhood', async () => {
  const physics=await PhysicsWorld.create(),materials=new MaterialLibrary();
  const home=buildPropertyInterior(materials,physics,'one_bhk');
  const chunk=createAmayaBayChunkFactory(materials,physics)(-3,1,'active');
  const player=physics.createPlayer(home.spawn);
  for(let i=0;i<300;i+=1){physics.moveCharacter(player,{x:0,y:-0.075,z:-1.6/60});physics.step();}
  const position=player.body.translation();
  physics.disposePlayer(player);(chunk.userData.disposeChunk as ()=>void)();physics.dispose();materials.dispose();
  expect(position.z).toBeLessThan(195);
});
