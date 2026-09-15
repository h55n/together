import {
  furnitureById,
  homeObjectMutationSchema,
  starterPropertyById,
  validateFurniturePlacement,
  applyHomeAction,
  createStarterHomeState,
  type HomeAction,
  type HomeObjectMutation,
  type HomeState,
} from '@together/shared';
import type { GameRepository, HomeObjectRecord, HomeStateRecord } from '../db/GameRepository.js';

function emptyHome(householdId: string): HomeStateRecord {
  return {
    householdId,
    version: 0,
    objects: [],
    surfaces: {},
    roomStates: {},
    processedMutations: {},
    updatedAt: new Date(0).toISOString(),
  };
}

export class HomeService {
  constructor(private readonly repository: GameRepository) {}

  async getHome(householdId: string, userId: string): Promise<HomeStateRecord> {
    await this.authorize(householdId, userId);
    return (await this.repository.getHomeState(householdId)) ?? emptyHome(householdId);
  }

  async placeFurniture(householdId: string, userId: string, rawMutation: HomeObjectMutation): Promise<HomeStateRecord> {
    const mutation = homeObjectMutationSchema.parse(rawMutation);
    const { household, current } = await this.prepareMutation(householdId, userId, mutation.expectedVersion, mutation.idempotencyKey);
    if (current.processedMutations[mutation.idempotencyKey] !== undefined) return current;
    if (current.objects.some((object) => object.objectId === mutation.objectId)) throw new Error('Home object already exists');
    this.validatePlacement(household.propertyId, mutation, current.objects);
    const inventoryBefore = await this.takeFurnitureFromInventory(householdId, mutation.definitionId);
    try {
      return await this.commit(current, mutation.idempotencyKey, {
        objects: [...current.objects, this.toRecord(mutation)],
      });
    } catch (error) {
      await this.repository.saveInventory(inventoryBefore);
      throw error;
    }
  }

  async moveFurniture(householdId: string, userId: string, rawMutation: HomeObjectMutation): Promise<HomeStateRecord> {
    const mutation = homeObjectMutationSchema.parse(rawMutation);
    const { household, current } = await this.prepareMutation(householdId, userId, mutation.expectedVersion, mutation.idempotencyKey);
    if (current.processedMutations[mutation.idempotencyKey] !== undefined) return current;
    const index = current.objects.findIndex((object) => object.objectId === mutation.objectId);
    if (index < 0) throw new Error('Home object not found');
    if (current.objects[index]!.definitionId !== mutation.definitionId) throw new Error('Furniture definition cannot change during move');
    this.validatePlacement(household.propertyId, mutation, current.objects.filter((object) => object.objectId !== mutation.objectId));
    const objects = current.objects.map((object, objectIndex) => objectIndex === index ? this.toRecord(mutation) : object);
    return this.commit(current, mutation.idempotencyKey, { objects });
  }

  async removeFurniture(
    householdId: string,
    userId: string,
    objectId: string,
    expectedVersion: number,
    idempotencyKey: string,
  ): Promise<HomeStateRecord> {
    const { current } = await this.prepareMutation(householdId, userId, expectedVersion, idempotencyKey);
    if (current.processedMutations[idempotencyKey] !== undefined) return current;
    const removedObject = current.objects.find((object) => object.objectId === objectId);
    if (!removedObject) throw new Error('Home object not found');
    const inventoryBefore = await this.returnFurnitureToInventory(householdId, removedObject.definitionId);
    try {
      return await this.commit(current, idempotencyKey, { objects: current.objects.filter((object) => object.objectId !== objectId) });
    } catch (error) {
      await this.repository.saveInventory(inventoryBefore);
      throw error;
    }
  }

  async seedDomesticState(
    householdId: string,
    userId: string,
    state: HomeState,
    expectedVersion: number,
    idempotencyKey: string,
  ): Promise<HomeStateRecord> {
    const { current } = await this.prepareMutation(householdId, userId, expectedVersion, idempotencyKey);
    if (current.processedMutations[idempotencyKey] !== undefined) return current;
    return this.commit(current, idempotencyKey, { roomStates: { ...current.roomStates, domestic: structuredClone(state) } });
  }

  async applyDomesticAction(
    householdId: string,
    userId: string,
    action: HomeAction,
    expectedVersion: number,
    idempotencyKey: string,
  ): Promise<HomeStateRecord> {
    const { current } = await this.prepareMutation(householdId, userId, expectedVersion, idempotencyKey);
    if (current.processedMutations[idempotencyKey] !== undefined) return current;
    const domestic = this.domesticState(current);
    const nextDomestic = applyHomeAction(domestic, action);
    return this.commit(current, idempotencyKey, { roomStates: { ...current.roomStates, domestic: nextDomestic } });
  }

  async setSurface(
    householdId: string,
    userId: string,
    surfaceId: string,
    finishId: string,
    expectedVersion: number,
    idempotencyKey: string,
  ): Promise<HomeStateRecord> {
    if (!surfaceId || surfaceId.length > 120 || !finishId || finishId.length > 120) throw new Error('Invalid surface mutation');
    const { current } = await this.prepareMutation(householdId, userId, expectedVersion, idempotencyKey);
    if (current.processedMutations[idempotencyKey] !== undefined) return current;
    return this.commit(current, idempotencyKey, { surfaces: { ...current.surfaces, [surfaceId]: finishId } });
  }

  private async takeFurnitureFromInventory(householdId: string, definitionId: string) {
    const inventory = await this.repository.listInventory('household', householdId);
    const record = inventory.find((entry) => entry.itemId === definitionId);
    if (!record || record.quantity < 1) throw new Error('Furniture must be purchased before it can be placed from household inventory');
    const before = structuredClone(record);
    await this.repository.saveInventory({ ...record, quantity: record.quantity - 1 });
    return before;
  }

  private async returnFurnitureToInventory(householdId: string, definitionId: string) {
    const inventory = await this.repository.listInventory('household', householdId);
    const record = inventory.find((entry) => entry.itemId === definitionId);
    const before = record
      ? structuredClone(record)
      : { ownerType: 'household' as const, ownerId: householdId, itemId: definitionId, quantity: 0, metadata: { category: 'furniture' } };
    await this.repository.saveInventory({ ...before, quantity: before.quantity + 1 });
    return before;
  }

  private domesticState(current: HomeStateRecord): HomeState {
    const candidate = current.roomStates.domestic as Partial<HomeState> | undefined;
    const starter = createStarterHomeState();
    if (!candidate) return starter;
    return {
      dishesDirty: Number(candidate.dishesDirty ?? starter.dishesDirty),
      laundryDirty: Number(candidate.laundryDirty ?? starter.laundryDirty),
      trashBags: Number(candidate.trashBags ?? starter.trashBags),
      floorDust: Number(candidate.floorDust ?? starter.floorDust),
      bathroomGrime: Number(candidate.bathroomGrime ?? starter.bathroomGrime),
      groceries: Number(candidate.groceries ?? starter.groceries),
      unresolvedRepairs: Array.isArray(candidate.unresolvedRepairs) ? candidate.unresolvedRepairs.map(String) : starter.unresolvedRepairs,
      plants: candidate.plants && typeof candidate.plants === 'object' ? { ...candidate.plants } : starter.plants,
    };
  }

  private async prepareMutation(householdId: string, userId: string, expectedVersion: number, idempotencyKey: string) {
    if (!idempotencyKey || idempotencyKey.length < 8) throw new Error('Invalid idempotency key');
    const household = await this.authorize(householdId, userId);
    if (!household.propertyId) throw new Error('Household has no assigned property');
    const current = (await this.repository.getHomeState(householdId)) ?? emptyHome(householdId);
    if (current.processedMutations[idempotencyKey] === undefined && expectedVersion !== current.version) {
      throw new Error(`Home version conflict: expected ${expectedVersion}, current ${current.version}`);
    }
    return { household, current };
  }

  private validatePlacement(propertyId: string | undefined, mutation: HomeObjectMutation, existingObjects: readonly HomeObjectRecord[]) {
    if (!propertyId) throw new Error('Household has no assigned property');
    const property = starterPropertyById(propertyId);
    if (!property) throw new Error('Unknown assigned property');
    const room = property.roomBounds[mutation.roomId];
    if (!room) throw new Error('Unknown room for assigned property');
    const definition = furnitureById(mutation.definitionId);
    if (!definition) throw new Error('Unknown furniture definition');
    if (definition.supportedRooms !== 'any' && !definition.supportedRooms.includes(mutation.roomId)) {
      throw new Error('Furniture is not supported in this room');
    }
    const placement = validateFurniturePlacement(
      room,
      definition.footprint,
      { x: mutation.transform.position.x, z: mutation.transform.position.z, rotationY: mutation.transform.rotationY },
      existingObjects
        .filter((object) => object.roomId === mutation.roomId)
        .flatMap((object) => {
          const existingDefinition = furnitureById(object.definitionId);
          return existingDefinition ? [{
            id: object.objectId,
            footprint: existingDefinition.footprint,
            placement: { x: object.transform.position.x, z: object.transform.position.z, rotationY: object.transform.rotationY },
          }] : [];
        }),
    );
    if (!placement.valid) throw new Error(`Furniture placement rejected: ${placement.reason}`);
  }

  private toRecord(mutation: HomeObjectMutation): HomeObjectRecord {
    return {
      objectId: mutation.objectId,
      definitionId: mutation.definitionId,
      roomId: mutation.roomId,
      transform: structuredClone(mutation.transform),
    };
  }

  private async commit(
    current: HomeStateRecord,
    idempotencyKey: string,
    patch: Partial<Pick<HomeStateRecord, 'objects' | 'surfaces' | 'roomStates'>>,
  ): Promise<HomeStateRecord> {
    const nextVersion = current.version + 1;
    const next: HomeStateRecord = {
      ...current,
      ...patch,
      version: nextVersion,
      processedMutations: { ...current.processedMutations, [idempotencyKey]: nextVersion },
      updatedAt: new Date().toISOString(),
    };
    await this.repository.saveHomeState(next);
    return next;
  }

  private async authorize(householdId: string, userId: string) {
    const household = await this.repository.getHousehold(householdId);
    if (!household) throw new Error('Household not found');
    if (!household.members.some((member) => member.userId === userId && member.membershipState === 'active')) {
      throw new Error('User is not an active household member');
    }
    return household;
  }
}
