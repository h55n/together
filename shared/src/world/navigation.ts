import { AMAYA_BAY_SURFACE_ROUTES, type CitySurfaceRoute, type SurfacePoint } from './surfaces.js';

export type SurfacePathPlan = {
  points: SurfacePoint[];
  distanceMetres: number;
  startAccessDistance: number;
  endAccessDistance: number;
};

type Projection = {
  route: CitySurfaceRoute;
  segmentIndex: number;
  t: number;
  point: SurfacePoint;
  distance: number;
};

type Edge = { to: string; cost: number };

export function planAmayaBaySurfacePath(start: SurfacePoint, end: SurfacePoint): SurfacePathPlan | null {
  const startProjection = nearestProjection(start);
  const endProjection = nearestProjection(end);
  if (!startProjection || !endProjection) return null;

  const points = new Map<string, SurfacePoint>();
  const edges = new Map<string, Edge[]>();

  const ensureNode = (id: string, point: SurfacePoint) => {
    if (!points.has(id)) points.set(id, { x: point.x, z: point.z });
    if (!edges.has(id)) edges.set(id, []);
  };
  const connect = (left: string, right: string, cost: number) => {
    edges.get(left)?.push({ to: right, cost });
    edges.get(right)?.push({ to: left, cost });
  };

  for (const route of AMAYA_BAY_SURFACE_ROUTES) {
    for (const point of route.points) ensureNode(pointId(point), point);
    for (let index = 1; index < route.points.length; index += 1) {
      const previous = route.points[index - 1]!;
      const current = route.points[index]!;
      connect(pointId(previous), pointId(current), distanceBetween(previous, current));
    }
  }

  addProjectionNode('start-access', startProjection, ensureNode, connect);
  addProjectionNode('end-access', endProjection, ensureNode, connect);
  ensureNode('start', start);
  ensureNode('end', end);
  connect('start', 'start-access', startProjection.distance);
  connect('end-access', 'end', endProjection.distance);

  if (
    startProjection.route.id === endProjection.route.id &&
    startProjection.segmentIndex === endProjection.segmentIndex
  ) {
    const segmentStart = startProjection.route.points[startProjection.segmentIndex]!;
    const segmentEnd = startProjection.route.points[startProjection.segmentIndex + 1]!;
    connect(
      'start-access',
      'end-access',
      Math.abs(startProjection.t - endProjection.t) * distanceBetween(segmentStart, segmentEnd),
    );
  }

  const path = shortestPath('start', 'end', points, edges);
  if (!path) return null;

  return {
    points: dedupeAdjacent(path.ids.map((id) => points.get(id)!)),
    distanceMetres: path.distance,
    startAccessDistance: startProjection.distance,
    endAccessDistance: endProjection.distance,
  };
}

function addProjectionNode(
  id: string,
  projection: Projection,
  ensureNode: (id: string, point: SurfacePoint) => void,
  connect: (left: string, right: string, cost: number) => void,
): void {
  const segmentStart = projection.route.points[projection.segmentIndex]!;
  const segmentEnd = projection.route.points[projection.segmentIndex + 1]!;
  const segmentLength = distanceBetween(segmentStart, segmentEnd);
  ensureNode(id, projection.point);
  connect(id, pointId(segmentStart), projection.t * segmentLength);
  connect(id, pointId(segmentEnd), (1 - projection.t) * segmentLength);
}

function shortestPath(
  startId: string,
  endId: string,
  points: ReadonlyMap<string, SurfacePoint>,
  edges: ReadonlyMap<string, readonly Edge[]>,
): { ids: string[]; distance: number } | null {
  const distances = new Map<string, number>([[startId, 0]]);
  const previous = new Map<string, string>();
  const unvisited = new Set(points.keys());

  while (unvisited.size > 0) {
    let current: string | null = null;
    let currentDistance = Number.POSITIVE_INFINITY;
    for (const id of unvisited) {
      const distance = distances.get(id) ?? Number.POSITIVE_INFINITY;
      if (distance < currentDistance) {
        current = id;
        currentDistance = distance;
      }
    }

    if (!current || !Number.isFinite(currentDistance)) break;
    unvisited.delete(current);
    if (current === endId) break;

    for (const edge of edges.get(current) ?? []) {
      if (!unvisited.has(edge.to)) continue;
      const candidate = currentDistance + edge.cost;
      if (candidate >= (distances.get(edge.to) ?? Number.POSITIVE_INFINITY)) continue;
      distances.set(edge.to, candidate);
      previous.set(edge.to, current);
    }
  }

  const distance = distances.get(endId);
  if (distance === undefined || !Number.isFinite(distance)) return null;

  const ids = [endId];
  let cursor = endId;
  while (cursor !== startId) {
    const parent = previous.get(cursor);
    if (!parent) return null;
    ids.push(parent);
    cursor = parent;
  }
  ids.reverse();
  return { ids, distance };
}

function nearestProjection(point: SurfacePoint): Projection | null {
  let best: Projection | null = null;
  for (const route of AMAYA_BAY_SURFACE_ROUTES) {
    for (let segmentIndex = 0; segmentIndex < route.points.length - 1; segmentIndex += 1) {
      const start = route.points[segmentIndex]!;
      const end = route.points[segmentIndex + 1]!;
      const projected = projectToSegment(point, start, end);
      if (!best || projected.distance < best.distance) {
        best = { route, segmentIndex, ...projected };
      }
    }
  }
  return best;
}

function projectToSegment(
  point: SurfacePoint,
  start: SurfacePoint,
  end: SurfacePoint,
): { point: SurfacePoint; t: number; distance: number } {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared <= 1e-10) {
    return {
      point: { x: start.x, z: start.z },
      t: 0,
      distance: distanceBetween(point, start),
    };
  }
  const unclamped = ((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSquared;
  const t = Math.max(0, Math.min(1, unclamped));
  const projected = { x: start.x + dx * t, z: start.z + dz * t };
  return { point: projected, t, distance: distanceBetween(point, projected) };
}

function pointId(point: SurfacePoint): string {
  return `p:${point.x.toFixed(2)}:${point.z.toFixed(2)}`;
}

function distanceBetween(left: SurfacePoint, right: SurfacePoint): number {
  return Math.hypot(right.x - left.x, right.z - left.z);
}

function dedupeAdjacent(points: readonly SurfacePoint[]): SurfacePoint[] {
  const result: SurfacePoint[] = [];
  for (const point of points) {
    const previous = result.at(-1);
    if (previous && distanceBetween(previous, point) <= 1e-6) continue;
    result.push({ x: point.x, z: point.z });
  }
  return result;
}
