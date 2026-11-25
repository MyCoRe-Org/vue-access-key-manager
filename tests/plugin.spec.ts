import { describe, expect, it } from 'vitest';
import { createApp, defineComponent, h, inject, isReactive } from 'vue';
import { AccessTokenAuthStrategy } from '@jsr/mycore__js-common/auth';
import {
  AccessKeyManagerState,
  AccessKeyManagerStateKey,
  createAccessKeyManager,
} from '@/plugin';

const injectState = (
  plugin: ReturnType<typeof createAccessKeyManager>
): AccessKeyManagerState | undefined => {
  let injected: AccessKeyManagerState | undefined;
  const app = createApp(
    defineComponent({
      setup() {
        injected = inject(AccessKeyManagerStateKey);
        return () => h('div');
      },
    })
  );
  app.use(plugin);
  app.mount(document.createElement('div'));
  app.unmount();
  return injected;
};

describe('createAccessKeyManager', () => {
  it('adds a trailing slash to the base url', () => {
    expect(
      createAccessKeyManager({ baseUrl: 'https://example.org/mir' }).baseUrl
    ).toBe('https://example.org/mir/');
  });

  it('keeps an existing trailing slash', () => {
    expect(
      createAccessKeyManager({ baseUrl: 'https://example.org/mir/' }).baseUrl
    ).toBe('https://example.org/mir/');
  });

  it('defaults accessKeyConfig to an empty object', () => {
    const plugin = createAccessKeyManager({ baseUrl: 'https://example.org' });
    expect(plugin.accessKeyConfig).toEqual({});
    expect(plugin.authStrategy).toBeUndefined();
  });

  it('keeps the given options', () => {
    const authStrategy = new AccessTokenAuthStrategy('token');
    const plugin = createAccessKeyManager({
      baseUrl: 'https://example.org',
      authStrategy,
      accessKeyConfig: { allowedSessionPermissions: ['read'] },
    });
    expect(plugin.authStrategy).toBe(authStrategy);
    expect(plugin.accessKeyConfig).toEqual({
      allowedSessionPermissions: ['read'],
    });
  });

  it('provides its state to components', () => {
    const plugin = createAccessKeyManager({ baseUrl: 'https://example.org' });
    const injected = injectState(plugin);
    expect(injected).toBe(plugin);
    expect(injected?.baseUrl).toBe('https://example.org/');
  });

  it('is reactive so accessKeyConfig can be reassigned after install', () => {
    const plugin = createAccessKeyManager({ baseUrl: 'https://example.org' });
    const injected = injectState(plugin);
    expect(isReactive(plugin)).toBe(true);
    plugin.accessKeyConfig = { allowedSessionPermissions: ['writedb'] };
    expect(injected?.accessKeyConfig.allowedSessionPermissions).toEqual([
      'writedb',
    ]);
  });
});
