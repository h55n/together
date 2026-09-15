export type MovingDisposition = 'keep' | 'sell' | 'donate';
export type MovingPlan = {
  fromPropertyId: string;
  targetPropertyId: string;
  requiredPackedObjects: number;
  packedObjectIds: string[];
  dispositionByObject: Record<string, MovingDisposition>;
  status: 'packing' | 'ready' | 'moved';
};

export function createMovingPlan(fromPropertyId: string, targetPropertyId: string, requiredPackedObjects = 1): MovingPlan {
  if (!fromPropertyId || !targetPropertyId || fromPropertyId === targetPropertyId) throw new Error('Moving requires a different target property');
  return {
    fromPropertyId,
    targetPropertyId,
    requiredPackedObjects: Math.max(1, Math.floor(requiredPackedObjects)),
    packedObjectIds: [],
    dispositionByObject: {},
    status: 'packing',
  };
}

export function packMovingObject(plan: MovingPlan, objectId: string, disposition: MovingDisposition): MovingPlan {
  if (plan.status === 'moved') return plan;
  if (!objectId) throw new Error('Moving object id is required');
  const packedObjectIds = plan.packedObjectIds.includes(objectId) ? [...plan.packedObjectIds] : [...plan.packedObjectIds, objectId];
  const dispositionByObject = { ...plan.dispositionByObject, [objectId]: disposition };
  return {
    ...plan,
    packedObjectIds,
    dispositionByObject,
    status: packedObjectIds.length >= plan.requiredPackedObjects ? 'ready' : 'packing',
  };
}

export function completeMovingPlan(plan: MovingPlan): MovingPlan {
  if (plan.status !== 'ready') throw new Error('Moving plan is not ready');
  return { ...plan, status: 'moved' };
}
