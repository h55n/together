import * as THREE from 'three';

export type RemoteMemoryParticipant = {
  userId: string;
  position: { x: number; y: number; z: number };
};

export type MemoryParticipantFraming = {
  visibleUserIds: string[];
  composition: number;
};

export function assessMemoryParticipantFraming(
  camera: THREE.PerspectiveCamera,
  participants: readonly RemoteMemoryParticipant[],
  maxDistanceMetres = 28,
): MemoryParticipantFraming {
  camera.updateMatrixWorld(true);
  const visibleUserIds: string[] = [];
  const compositionScores: number[] = [];

  for (const participant of participants) {
    const chest = new THREE.Vector3(
      participant.position.x,
      participant.position.y + 1.2,
      participant.position.z,
    );
    if (camera.position.distanceTo(chest) > maxDistanceMetres) continue;
    const projected = chest.clone().project(camera);
    const visible = projected.z >= -1 && projected.z <= 1
      && Math.abs(projected.x) <= 0.94
      && Math.abs(projected.y) <= 0.9;
    if (!visible) continue;

    visibleUserIds.push(participant.userId);
    const radial = Math.min(1, Math.hypot(projected.x, projected.y) / 1.15);
    compositionScores.push(1 - radial);
  }

  const composition = compositionScores.length
    ? 0.56 + average(compositionScores) * 0.44
    : participants.length ? 0.46 : 0.82;
  return { visibleUserIds, composition };
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}
