import { useEffect, useMemo, useState, type ReactElement } from 'react';
import {
  FURNITURE_CATALOG,
  defaultPlacementForRoom,
  rotatePlacement,
  snapPlacement,
  starterPropertyById,
  type Placement2D,
} from '@together/shared';

export type HomeObjectView = {
  objectId: string;
  definitionId: string;
  roomId: string;
  transform: { position: { x: number; y: number; z: number }; rotationY: number; scale: number };
};
export type HomeStateView = {
  version: number;
  objects: HomeObjectView[];
  surfaces: Record<string, string>;
};

export type DecorationCommit = {
  mode: 'place' | 'move';
  objectId: string;
  definitionId: string;
  roomId: string;
  placement: Placement2D;
};

export function DecoratePanel(props: {
  open: boolean;
  propertyId: string;
  home: HomeStateView | null;
  inventory: readonly { itemId: string; quantity: number }[];
  busy: boolean;
  message: string | null;
  onPreview: (definitionId: string, roomId: string, placement: Placement2D) => void;
  onClearPreview: () => void;
  onCommit: (mutation: DecorationCommit) => Promise<void>;
  onRemove: (objectId: string) => Promise<void>;
  onSurface: (surfaceId: string, finishId: string) => Promise<void>;
  onClose: () => void;
}): ReactElement | null {
  const property = starterPropertyById(props.propertyId);
  const firstRoom = property?.rooms[0] ?? '';
  const [roomId, setRoomId] = useState(firstRoom);
  const [definitionId, setDefinitionId] = useState(FURNITURE_CATALOG[0]?.id ?? '');
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [placement, setPlacement] = useState<Placement2D>(() => property?.roomBounds[firstRoom] ? defaultPlacementForRoom(property.roomBounds[firstRoom]!) : { x: 0, z: 0, rotationY: 0 });
  const [grid, setGrid] = useState(0.25);
  const [rotationSnap, setRotationSnap] = useState(15);

  const activeRoomId = property?.rooms.includes(roomId) ? roomId : firstRoom;
  const room = property?.roomBounds[activeRoomId];
  const selectedDefinition = FURNITURE_CATALOG.find((entry) => entry.id === definitionId);
  const ownedQuantity = props.inventory.find((entry) => entry.itemId === definitionId)?.quantity ?? 0;
  const currentObject = props.home?.objects.find((entry) => entry.objectId === selectedObjectId) ?? null;
  const roomObjects = useMemo(() => props.home?.objects.filter((object) => object.roomId === activeRoomId) ?? [], [activeRoomId, props.home]);
  const { onPreview, onClearPreview } = props;

  useEffect(() => {
    if (!props.open || !room || !definitionId) return;
    onPreview(definitionId, activeRoomId, placement);
    return onClearPreview;
  }, [activeRoomId, definitionId, onClearPreview, onPreview, placement, props.open, room]);

  if (!props.open || !property || !room) return null;

  const chooseRoom = (nextRoomId: string): void => {
    const bounds = property.roomBounds[nextRoomId];
    if (!bounds) return;
    setSelectedObjectId(null);
    setRoomId(nextRoomId);
    setPlacement(defaultPlacementForRoom(bounds));
  };

  const chooseExisting = (object: HomeObjectView): void => {
    setSelectedObjectId(object.objectId);
    setRoomId(object.roomId);
    setDefinitionId(object.definitionId);
    setPlacement({ x: object.transform.position.x, z: object.transform.position.z, rotationY: object.transform.rotationY });
  };

  const updateAxis = (axis: 'x' | 'z', value: number): void => {
    setPlacement((current) => snapPlacement({ ...current, [axis]: value }, grid, rotationSnap));
  };

  const commit = async (): Promise<void> => {
    if (!selectedDefinition) return;
    const objectId = currentObject?.objectId ?? `furniture_${crypto.randomUUID().replaceAll('-', '')}`;
    await props.onCommit({
      mode: currentObject ? 'move' : 'place',
      objectId,
      definitionId,
      roomId: activeRoomId,
      placement: snapPlacement(placement, grid, rotationSnap),
    });
    if (!currentObject) {
      const bounds = property.roomBounds[activeRoomId]!;
      setPlacement(defaultPlacementForRoom(bounds));
    }
  };

  return <section className="game-panel decorate-panel" aria-label="Decorate home">
    <header className="panel-header"><div><p className="eyebrow">Home · real room</p><h2>Decorate</h2></div><button className="panel-close" onClick={props.onClose}>Close</button></header>
    <p className="panel-copy">Place objects in the room you are standing in. The preview is local; the household save only changes after server validation.</p>

    <label className="field-label" htmlFor="decorate-room">Room</label>
    <select id="decorate-room" className="text-field" value={activeRoomId} onChange={(event) => chooseRoom(event.target.value)}>{property.rooms.map((candidate) => <option value={candidate} key={candidate}>{humanize(candidate)}</option>)}</select>

    <label className="field-label" htmlFor="decorate-item">Furniture</label>
    <select id="decorate-item" className="text-field" value={definitionId} onChange={(event) => { setSelectedObjectId(null); setDefinitionId(event.target.value); }}>
      {FURNITURE_CATALOG.filter((item) => item.supportedRooms === 'any' || item.supportedRooms.includes(activeRoomId)).map((item) => <option value={item.id} key={item.id}>{item.displayName} · ₹{item.price.toLocaleString('en-IN')}</option>)}
    </select>
    {!currentObject && <p className={ownedQuantity > 0 ? 'owned-furniture available' : 'owned-furniture missing'}>{ownedQuantity > 0 ? `${ownedQuantity} in household storage` : 'Not owned yet · buy this at a furniture shop in the city'}</p>}

    <div className="decorate-controls">
      <label>X · {placement.x.toFixed(2)}m<input type="range" min={room.minX} max={room.maxX} step="0.05" value={placement.x} onChange={(event) => updateAxis('x', Number(event.target.value))} /></label>
      <label>Z · {placement.z.toFixed(2)}m<input type="range" min={room.minZ} max={room.maxZ} step="0.05" value={placement.z} onChange={(event) => updateAxis('z', Number(event.target.value))} /></label>
      <div className="decorate-row"><button className="quiet-action" onClick={() => setPlacement((current) => rotatePlacement(current, -rotationSnap || -15))}>↶ Rotate</button><span>{Math.round(placement.rotationY * 180 / Math.PI)}°</span><button className="quiet-action" onClick={() => setPlacement((current) => rotatePlacement(current, rotationSnap || 15))}>Rotate ↷</button></div>
      <div className="decorate-row"><span>Grid</span>{[0, 0.25, 0.5].map((value) => <button key={value} className={grid === value ? 'chip active' : 'chip'} onClick={() => setGrid(value)}>{value === 0 ? 'Free' : `${value}m`}</button>)}</div>
      <div className="decorate-row"><span>Rotation</span>{[15, 45, 0].map((value) => <button key={value} className={rotationSnap === value ? 'chip active' : 'chip'} onClick={() => setRotationSnap(value)}>{value === 0 ? 'Free' : `${value}°`}</button>)}</div>
    </div>

    <div className="surface-finishes"><span className="field-label">Wall finish · {humanize(activeRoomId)}</span><div className="decorate-row">{['warm_plaster','muted_sage','terracotta_wash','rainy_blue'].map((finish) => <button className="chip" key={finish} disabled={props.busy} onClick={() => void props.onSurface(`${activeRoomId}:walls`, finish)}>{humanize(finish)}</button>)}</div></div>

    {props.message && <p className="status-copy">{props.message}</p>}
    <div className="entry-actions"><button className="primary-action" disabled={props.busy || (!currentObject && ownedQuantity < 1)} onClick={() => void commit()}>{props.busy ? 'Saving…' : currentObject ? 'Move object' : ownedQuantity > 0 ? 'Place owned object' : 'Buy at a furniture shop'}</button>{currentObject && <button className="secondary-action" disabled={props.busy} onClick={() => void props.onRemove(currentObject.objectId)}>Remove</button>}</div>

    <div className="placed-object-list"><p className="eyebrow">Already in this room</p>{roomObjects.length === 0 ? <span className="muted-copy">This room is waiting for your things.</span> : roomObjects.map((object) => <button key={object.objectId} className={selectedObjectId === object.objectId ? 'placed-object selected' : 'placed-object'} onClick={() => chooseExisting(object)}>{FURNITURE_CATALOG.find((item) => item.id === object.definitionId)?.displayName ?? object.definitionId}</button>)}</div>
  </section>;
}

function humanize(value: string): string { return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }
