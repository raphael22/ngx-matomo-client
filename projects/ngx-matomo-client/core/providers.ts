import {
  ENVIRONMENT_INITIALIZER,
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  Provider,
} from '@angular/core';
import { INTERNAL_MATOMO_CONFIGURATION, MATOMO_CONFIGURATION, MatomoConfiguration } from './tracker/configuration';
import { createMatomoInitializer, MatomoInitializerService } from './tracker/matomo-initializer.service';
import { MATOMO_SCRIPT_FACTORY, MatomoScriptFactory } from './tracker/script-factory';

import { createInternalMatomoTracker, InternalMatomoTracker } from './tracker/internal-matomo-tracker.service';
import { MatomoTracker } from './tracker/matomo-tracker.service';
import { ScriptInjector } from './utils/script-injector';

// import { MatomoFormAnalyticsInitializer } from '../form-analytics/matomo-form-analytics-initializer.service';
// import { MatomoFormAnalytics } from '../form-analytics';
// import { MatomoRouter } from '../router/matomo-router.service';

const PRIVATE_MATOMO_PROVIDERS = Symbol('MATOMO_PROVIDERS');
const PRIVATE_MATOMO_CHECKS = Symbol('MATOMO_CHECKS');

export type MatomoFeatureKind = unknown;

/**
 * Additional Matomo features kind
 */
export const enum CoreMatomoFeatureKind {
  /** @see withScriptFactory */
  ScriptFactory = 'ScriptFactory',
}

export interface MatomoFeature {
  readonly kind: MatomoFeatureKind;
  [PRIVATE_MATOMO_PROVIDERS]: Provider[];
  [PRIVATE_MATOMO_CHECKS]?: (features: MatomoFeatureKind[]) => void;
}

export function createMatomoFeature(
  kind: MatomoFeatureKind,
  providers: Provider[],
  checks?: (features: MatomoFeatureKind[]) => void,
): MatomoFeature {
  return { kind, [PRIVATE_MATOMO_PROVIDERS]: providers, [PRIVATE_MATOMO_CHECKS]: checks };
}

/**
 * Return Matomo providers (typically added to an application's root module)
 *
 * Additional features may be provided as additional arguments, like this:
 * @example
 * // Simple configuration
 * providers: [ provideMatomo({ siteId: 1, trackerUrl: '...' }) ]
 *
 * // With additional features
 * providers: [
 *     provideMatomo(
 *         { siteId: 1, trackerUrl: '...' },
 *         withScriptFactory(...),
 *     )
 * ]
 *
 * // With advanced config factory function
 * providers: [
 *     provideMatomo(
 *         () => inject(MyService).getMatomoConfig(),
 *         withScriptFactory(...),
 *     )
 * ]
 *
 * @param config Matomo configuration (or configuration factory, which can use `inject`)
 * @param features Optional additional features to enable
 *
 * @see MatomoConfiguration
 * @see withScriptFactory
 * @see withRouter
 * @see withRouterInterceptors
 * @see withRouteData
 */
export function provideMatomo(
  config: MatomoConfiguration | (() => MatomoConfiguration),
  ...features: MatomoFeature[]
): EnvironmentProviders {

  let providers: Provider[] = [];
  if (typeof config === 'function') {
    providers.push({
      provide: MATOMO_CONFIGURATION,
      useFactory: config,
    });
    providers.push({
      provide: INTERNAL_MATOMO_CONFIGURATION,
      useFactory: config,
    });
  } else {
    providers.push({
      provide: MATOMO_CONFIGURATION,
      useValue: config,
    });
    providers.push({
      provide: INTERNAL_MATOMO_CONFIGURATION,
      useValue: config,
    });
  }
  providers = providers.concat([
    {
      provide: MatomoInitializerService,
      useFactory: createMatomoInitializer
    },
    // {
    //   provide: ENVIRONMENT_INITIALIZER,
    //   multi: true,
    //   useValue() {
    //     inject(MatomoInitializerService).initialize();
    //   },
    // },
    {
      provide: InternalMatomoTracker,
      useFactory: createInternalMatomoTracker
    },
    {
      provide: MatomoTracker,
      useClass: MatomoTracker
    },
    {
      provide: ScriptInjector,
      useClass: ScriptInjector
    },
    // {
    //   provide: MatomoFormAnalyticsInitializer,
    //   useClass: MatomoFormAnalyticsInitializer
    // },
    // {
    //   provide: MatomoFormAnalytics,
    //   useClass: MatomoFormAnalytics
    // },
    // {
    //   provide: MatomoRouter,
    //   useClass: MatomoRouter
    // }
  ]);
  const featuresKind: MatomoFeatureKind[] = [];
  for (const feature of features) {
    providers.push(...feature[PRIVATE_MATOMO_PROVIDERS]);
    featuresKind.push(feature.kind);
  }

  for (const feature of features) {
    feature[PRIVATE_MATOMO_CHECKS]?.(featuresKind);
  }

  return makeEnvironmentProviders(providers);
}

/** Add a custom script factory to use for Matomo's script element */
export function withScriptFactory(scriptFactory: MatomoScriptFactory): MatomoFeature {
  return createMatomoFeature(CoreMatomoFeatureKind.ScriptFactory, [
    { provide: MATOMO_SCRIPT_FACTORY, useValue: scriptFactory },
  ]);
}
