import type { App, InjectionKey } from 'vue';
import { shallowReactive } from 'vue';
import type { AuthStrategy } from '@jsr/mycore__js-common/auth';

/**
 * Access-key-specific configuration.
 */
export interface AccessKeyConfig {
  /**
   * Access-key permission types that may be activated for the current
   * session rather than the calling user's account.
   */
  allowedSessionPermissions?: string[];
}

/**
 * Reactive state shared between an {@link AccessKeyManagerPlugin} instance
 * and this package's components. `baseUrl` and `authStrategy` are read once
 * per mounted component and should not change after `app.use()`;
 * `accessKeyConfig` can be reassigned at any time.
 */
export interface AccessKeyManagerState {
  baseUrl: string;
  authStrategy?: AuthStrategy;
  accessKeyConfig: AccessKeyConfig;
}

/**
 * Injection key for the shared {@link AccessKeyManagerState}.
 */
export const AccessKeyManagerStateKey: InjectionKey<AccessKeyManagerState> =
  Symbol('AccessKeyManagerState');

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

export interface AccessKeyManagerOptions {
  /** Base URL of the REST API, e.g. `https://example.org/mir`. */
  baseUrl: string;
  /**
   * Strategy used to authenticate REST requests. Omit to let components
   * fetch their own access-key-scoped JWT instead.
   */
  authStrategy?: AuthStrategy;
  /** See {@link AccessKeyConfig}. */
  accessKeyConfig?: AccessKeyConfig;
}

/**
 * The Vue plugin instance created by {@link createAccessKeyManager}.
 */
export type AccessKeyManagerPlugin = AccessKeyManagerState & {
  install(app: App): void;
};

/**
 * Creates an installable configuration instance for this package's
 * components, following the `createXxx()` convention used by
 * `createI18n()`/`createRouter()`/`createPinia()`.
 *
 * ```ts
 * const accessKeyManager = createAccessKeyManager({
 *   baseUrl,
 *   authStrategy,
 *   accessKeyConfig: { allowedSessionPermissions },
 * });
 * app.use(accessKeyManager);
 * ```
 */
export function createAccessKeyManager(
  options: AccessKeyManagerOptions
): AccessKeyManagerPlugin {
  const state = shallowReactive<AccessKeyManagerState>({
    baseUrl: normalizeBaseUrl(options.baseUrl),
    authStrategy: options.authStrategy,
    accessKeyConfig: options.accessKeyConfig ?? {},
  }) as AccessKeyManagerState;

  return Object.assign(state, {
    install(app: App): void {
      app.provide(AccessKeyManagerStateKey, state);
    },
  });
}
