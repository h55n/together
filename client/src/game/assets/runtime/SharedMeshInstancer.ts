import * as THREE from 'three';

/** Instance identical registry meshes; keep chunk ownership and canonical geometry separate. */
export function instanceSharedMeshes(root: THREE.Group): THREE.Group {
  root.updateMatrixWorld(true);
  const inverseRoot = root.matrixWorld.clone().invert();
  const batches = new Map<string, THREE.Mesh[]>();
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh) || object instanceof THREE.InstancedMesh || Array.isArray(object.material)) return;
    if (!object.geometry.userData.togetherShared) return;
    const key = `${object.geometry.uuid}:${object.material.uuid}:${object.castShadow}:${object.receiveShadow}`;
    const batch = batches.get(key) ?? [];
    batch.push(object); batches.set(key, batch);
  });
  const transform = new THREE.Matrix4();
  for (const meshes of batches.values()) {
    if (meshes.length < 2) continue;
    const source = meshes[0]!;
    const instance = new THREE.InstancedMesh(source.geometry, source.material, meshes.length);
    instance.name = `shared-instances:${source.geometry.uuid}`;
    instance.castShadow = source.castShadow;
    instance.receiveShadow = source.receiveShadow;
    meshes.forEach((mesh, index) => {
      transform.multiplyMatrices(inverseRoot, mesh.matrixWorld);
      instance.setMatrixAt(index, transform);
      mesh.removeFromParent();
    });
    instance.computeBoundingBox();
    instance.computeBoundingSphere();
    root.add(instance);
  }
  return root;
}
