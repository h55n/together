import { socketEvents } from '@together/shared';
import { createApp as createCoreApp, type AppDependencies as CoreAppDependencies } from './appCore.js';
import type { HomeService } from './game/HomeService.js';
import type { CookingService } from './game/CookingService.js';
import { logger } from './logging/logger.js';

export type PublishHouseholdEvent = (householdId: string, event: string, payload: unknown) => void;

export type AppDependencies = CoreAppDependencies & {
  publishHouseholdEvent?: PublishHouseholdEvent;
};

export function createApp(dependencies: AppDependencies) {
  const { publishHouseholdEvent, ...coreDependencies } = dependencies;
  if (!publishHouseholdEvent) return createCoreApp(coreDependencies);

  return createCoreApp({
    ...coreDependencies,
    homeService: withRealtimeHomePublishing(coreDependencies.homeService, publishHouseholdEvent),
    cookingService: withRealtimeCookingPublishing(coreDependencies.cookingService, publishHouseholdEvent),
  });
}

function withRealtimeHomePublishing(homeService: HomeService, publish: PublishHouseholdEvent): HomeService {
  const notify = (householdId: string, event: string, version: number): void => {
    try {
      publish(householdId, event, { version });
    } catch (error) {
      logger.warn('Could not publish household home update', {
        householdId,
        event,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return new Proxy(homeService, {
    get(target, property) {
      if (property === 'placeFurniture') {
        return async (...args: Parameters<HomeService['placeFurniture']>) => {
          const home = await target.placeFurniture(...args);
          notify(args[0], socketEvents.homeFurniturePlace, home.version);
          return home;
        };
      }
      if (property === 'moveFurniture') {
        return async (...args: Parameters<HomeService['moveFurniture']>) => {
          const home = await target.moveFurniture(...args);
          notify(args[0], socketEvents.homeFurnitureMove, home.version);
          return home;
        };
      }
      if (property === 'removeFurniture') {
        return async (...args: Parameters<HomeService['removeFurniture']>) => {
          const home = await target.removeFurniture(...args);
          notify(args[0], socketEvents.homeFurnitureRemove, home.version);
          return home;
        };
      }
      if (property === 'setSurface') {
        return async (...args: Parameters<HomeService['setSurface']>) => {
          const home = await target.setSurface(...args);
          notify(args[0], socketEvents.homeSurfaceChange, home.version);
          return home;
        };
      }
      if (property === 'applyDomesticAction') {
        return async (...args: Parameters<HomeService['applyDomesticAction']>) => {
          const home = await target.applyDomesticAction(...args);
          notify(args[0], socketEvents.homeObjectState, home.version);
          return home;
        };
      }
      if (property === 'applyDomesticStep') {
        return async (...args: Parameters<HomeService['applyDomesticStep']>) => {
          const home = await target.applyDomesticStep(...args);
          notify(args[0], socketEvents.homeObjectState, home.version);
          return home;
        };
      }

      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as HomeService;
}


function withRealtimeCookingPublishing(cookingService: CookingService, publish: PublishHouseholdEvent): CookingService {
  const notify = (householdId: string, sessionId: string): void => {
    try {
      publish(householdId, socketEvents.cookingState, { sessionId });
    } catch (error) {
      logger.warn('Could not publish household cooking update', {
        householdId,
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return new Proxy(cookingService, {
    get(target, property) {
      if (property === 'start') {
        return async (...args: Parameters<CookingService['start']>) => {
          const session = await target.start(...args);
          notify(args[0], session.id);
          return session;
        };
      }
      if (property === 'claimStation') {
        return async (...args: Parameters<CookingService['claimStation']>) => {
          const session = await target.claimStation(...args);
          notify(args[0], session.id);
          return session;
        };
      }
      if (property === 'releaseStation') {
        return async (...args: Parameters<CookingService['releaseStation']>) => {
          const session = await target.releaseStation(...args);
          notify(args[0], session.id);
          return session;
        };
      }
      if (property === 'completeStep') {
        return async (...args: Parameters<CookingService['completeStep']>) => {
          const session = await target.completeStep(...args);
          notify(args[0], session.id);
          return session;
        };
      }

      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as CookingService;
}
