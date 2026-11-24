import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toRaw } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { AccessKeyApiClient } from '@jsr/mycore__js-common/access-key';
import {
  AccessTokenAuthStrategy,
  type AuthStrategy,
} from '@jsr/mycore__js-common/auth';
import AccessKeyManager from '@/components/AccessKeyManager.vue';
import AccessKeyInfoModal from '@/components/AccessKeyInfoModal.vue';
import CreateAccessKeyModal from '@/components/CreateAccessKeyModal.vue';
import AccessKeyTable from '@/components/AccessKeyTable.vue';
import { fetchJwt } from '@/common/auth';
import { getI18nKey } from '@/common/utils';
import { createAccessKeyManager, type AccessKeyManagerOptions } from '@/plugin';
import {
  BaseModalStub,
  createAccessKey,
  createClientMock,
  createTestI18n,
} from '../helpers';

const mocks = vi.hoisted(() => ({
  client: undefined as unknown as ReturnType<typeof createClientMock>,
  confirm: undefined as unknown as ReturnType<typeof vi.fn>,
  route: { query: {} as Record<string, string> },
  router: { push: undefined as unknown as ReturnType<typeof vi.fn> },
}));

vi.mock('@jsr/mycore__js-common/access-key', () => ({
  AccessKeyApiClient: vi.fn(function () {
    return mocks.client;
  }),
}));

vi.mock('@/common/auth', () => ({
  fetchJwt: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRoute: () => mocks.route,
  useRouter: () => mocks.router,
}));

vi.mock('@mycore-org/vue-components', async importOriginal => ({
  ...(await importOriginal<typeof import('@mycore-org/vue-components')>()),
  useConfirmModal: () => ({ confirm: mocks.confirm }),
}));

const i18n = createTestI18n({
  [getI18nKey('confirmRemove.title')]: 'Remove',
  [getI18nKey('confirmRemove.text')]: 'Remove {secret}?',
  [getI18nKey('success.add.title')]: 'Created',
  [getI18nKey('success.add')]: 'Secret: {secret}.',
  [getI18nKey('success.add.url')]: 'Link:',
  [getI18nKey('success.add.url.format')]:
    '{baseUrl}rsc/access-key/{reference}?secret={secret}',
});

const baseUrl = 'https://example.org/mir';

const mountManager = async (
  props: Record<string, unknown> = {},
  options: Partial<AccessKeyManagerOptions> = {}
) => {
  const wrapper = mount(AccessKeyManager, {
    global: {
      plugins: [i18n, createAccessKeyManager({ baseUrl, ...options })],
      stubs: { BaseModal: BaseModalStub, ConfirmModal: true },
    },
    props,
  });
  await flushPromises();
  return wrapper;
};

const keys = (count: number, offset = 0) =>
  Array.from({ length: count }, (_, i) =>
    createAccessKey({
      id: `key-${offset + i + 1}`,
      reference: `mir_mods_${offset + i + 1}`,
    })
  );

describe('AccessKeyManager', () => {
  beforeEach(() => {
    mocks.client = createClientMock();
    mocks.client.getAccessKeys.mockResolvedValue({
      accessKeys: keys(2),
      totalCount: 2,
    });
    mocks.confirm = vi.fn().mockResolvedValue(true);
    mocks.route.query = {};
    mocks.router.push = vi.fn();
    vi.mocked(fetchJwt).mockResolvedValue('jwt-token');
  });

  it('throws when the plugin is not installed', () => {
    expect(() =>
      mount(AccessKeyManager, {
        global: {
          plugins: [i18n],
          stubs: { BaseModal: BaseModalStub, ConfirmModal: true },
        },
      })
    ).toThrow(/no AccessKeyManagerPlugin installed/);
  });

  describe('authentication', () => {
    it('uses the configured auth strategy without fetching a jwt', async () => {
      const authStrategy: AuthStrategy = {
        getHeaders: vi.fn(),
      } as unknown as AuthStrategy;
      await mountManager({}, { authStrategy });
      expect(fetchJwt).not.toHaveBeenCalled();
      expect(AccessKeyApiClient).toHaveBeenCalledWith(
        'https://example.org/mir/',
        authStrategy
      );
    });

    it('fetches an access key scoped jwt without auth strategy', async () => {
      await mountManager({ reference: 'mir_mods_1' });
      expect(fetchJwt).toHaveBeenCalledWith(
        'https://example.org/mir/',
        'mir_mods_1',
        false
      );
      const [url, strategy] = vi.mocked(AccessKeyApiClient).mock.calls[0];
      expect(url).toBe('https://example.org/mir/');
      expect(strategy).toBeInstanceOf(AccessTokenAuthStrategy);
    });

    it('requests session attributes when session permissions are configured', async () => {
      await mountManager(
        { reference: 'mir_mods_1' },
        { accessKeyConfig: { allowedSessionPermissions: ['read'] } }
      );
      expect(fetchJwt).toHaveBeenCalledWith(
        'https://example.org/mir/',
        'mir_mods_1',
        true
      );
    });

    it('emits an error when fetching the jwt fails', async () => {
      const error = new Error('unauthorized');
      vi.mocked(fetchJwt).mockRejectedValue(error);
      const wrapper = await mountManager({ reference: 'mir_mods_1' });
      expect(wrapper.emitted('error')).toEqual([[error]]);
      expect(mocks.client.getAccessKeys).not.toHaveBeenCalled();
    });
  });

  describe('loading', () => {
    it('loads the first page with reference and permissions', async () => {
      await mountManager({ reference: 'mir_mods_1', permissions: ['read'] });
      expect(mocks.client.getAccessKeys).toHaveBeenCalledWith({
        permissions: ['read'],
        reference: 'mir_mods_1',
        offset: 0,
        limit: 8,
      });
    });

    it('respects current-page and page-size', async () => {
      await mountManager({ currentPage: 3, pageSize: 5 });
      expect(mocks.client.getAccessKeys).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 10, limit: 5 })
      );
    });

    it('passes the loaded access keys to the table', async () => {
      const wrapper = await mountManager();
      expect(wrapper.getComponent(AccessKeyTable).props('accessKeys')).toEqual(
        keys(2)
      );
    });

    it('emits an error when loading fails', async () => {
      const error = new Error('server error');
      mocks.client.getAccessKeys.mockRejectedValue(error);
      const wrapper = await mountManager();
      expect(wrapper.emitted('error')).toEqual([[error]]);
    });

    it('shows the loading overlay until the keys are loaded', async () => {
      let resolve: (value: unknown) => void = () => undefined;
      mocks.client.getAccessKeys.mockReturnValue(
        new Promise(r => {
          resolve = r;
        })
      );
      const wrapper = await mountManager();
      const overlay = () =>
        wrapper.get<HTMLElement>('#loading-overlay').element.style.visibility;
      expect(overlay()).toBe('visible');
      expect(
        wrapper.get('button.btn-primary').attributes('disabled')
      ).toBeDefined();

      resolve({ accessKeys: [], totalCount: 0 });
      await flushPromises();
      expect(overlay()).toBe('hidden');
    });
  });

  describe('pagination', () => {
    beforeEach(() => {
      mocks.client.getAccessKeys.mockImplementation(
        async ({ offset, limit }: { offset: number; limit: number }) => ({
          accessKeys: keys(Math.min(limit, 20 - offset), offset),
          totalCount: 20,
        })
      );
    });

    it('loads the selected page and emits page-change', async () => {
      const wrapper = await mountManager({ pageSize: 5 });
      await wrapper.get('button[aria-label="3"]').trigger('click');
      await flushPromises();

      expect(mocks.client.getAccessKeys).toHaveBeenLastCalledWith(
        expect.objectContaining({ offset: 10, limit: 5 })
      );
      expect(wrapper.emitted('page-change')).toEqual([[3]]);
      expect(
        wrapper.getComponent(AccessKeyTable).props('accessKeys')[0].id
      ).toBe('key-11');
      expect(mocks.router.push).not.toHaveBeenCalled();
    });

    it('updates the route query when the router is enabled', async () => {
      mocks.route.query = { foo: 'bar' };
      const wrapper = await mountManager({ pageSize: 5, routerEnabled: true });
      await wrapper.get('button[aria-label="2"]').trigger('click');
      await flushPromises();
      expect(mocks.router.push).toHaveBeenCalledWith({
        query: { foo: 'bar', page: '2' },
      });
    });
  });

  describe('deleting', () => {
    it('deletes the access key after confirmation', async () => {
      const wrapper = await mountManager();
      wrapper
        .getComponent(AccessKeyTable)
        .vm.$emit('remove-access-key', keys(2)[0]);
      await flushPromises();

      expect(mocks.confirm).toHaveBeenCalledWith('Remove', 'Remove key-1?');
      expect(mocks.client.deleteAccessKey).toHaveBeenCalledWith('key-1');
      expect(
        wrapper
          .getComponent(AccessKeyTable)
          .props('accessKeys')
          .map((k: { id: string }) => k.id)
      ).toEqual(['key-2']);
    });

    it('keeps the access key when the confirmation is cancelled', async () => {
      mocks.confirm.mockResolvedValue(false);
      const wrapper = await mountManager();
      wrapper
        .getComponent(AccessKeyTable)
        .vm.$emit('remove-access-key', keys(2)[0]);
      await flushPromises();

      expect(mocks.client.deleteAccessKey).not.toHaveBeenCalled();
      expect(
        wrapper.getComponent(AccessKeyTable).props('accessKeys')
      ).toHaveLength(2);
    });

    it('shortens long ids in the confirmation message', async () => {
      const wrapper = await mountManager();
      wrapper
        .getComponent(AccessKeyTable)
        .vm.$emit('remove-access-key', createAccessKey({ id: 'x'.repeat(40) }));
      await flushPromises();
      expect(mocks.confirm).toHaveBeenCalledWith(
        'Remove',
        `Remove ${'x'.repeat(27)}...?`
      );
    });
  });

  describe('viewing and updating', () => {
    it('opens the info modal with the selected access key', async () => {
      const wrapper = await mountManager();
      wrapper.getComponent(AccessKeyTable).vm.$emit('view-access-key', 1);
      await flushPromises();
      const modal = wrapper.getComponent(AccessKeyInfoModal);
      expect(modal.props('accessKey')).toEqual(keys(2)[1]);
      expect(modal.props('visible')).toBe(true);
    });

    it('replaces the updated access key and closes the modal', async () => {
      const wrapper = await mountManager();
      wrapper.getComponent(AccessKeyTable).vm.$emit('view-access-key', 0);
      await flushPromises();
      const updated = { ...keys(1)[0], comment: 'updated' };
      wrapper
        .getComponent(AccessKeyInfoModal)
        .vm.$emit('update-access-key', updated);
      await flushPromises();

      expect(
        wrapper.getComponent(AccessKeyTable).props('accessKeys')[0]
      ).toEqual(updated);
      expect(wrapper.getComponent(AccessKeyInfoModal).props('visible')).toBe(
        false
      );
    });
  });

  describe('creating', () => {
    it('opens the create modal', async () => {
      const wrapper = await mountManager();
      expect(wrapper.getComponent(CreateAccessKeyModal).props('visible')).toBe(
        false
      );
      await wrapper.get('button.btn-primary').trigger('click');
      expect(wrapper.getComponent(CreateAccessKeyModal).props('visible')).toBe(
        true
      );
    });

    it('passes client, reference and permissions to the modals', async () => {
      const wrapper = await mountManager({
        reference: 'mir_mods_1',
        permissions: ['read'],
      });
      for (const props of [
        wrapper.getComponent(CreateAccessKeyModal).props(),
        wrapper.getComponent(AccessKeyInfoModal).props(),
      ]) {
        expect(toRaw(props.accessKeyClient)).toBe(mocks.client);
        expect(props.reference).toBe('mir_mods_1');
        expect(props.permissions).toEqual(['read']);
      }
    });

    it('adds the created key and shows the secret', async () => {
      const wrapper = await mountManager();
      const created = createAccessKey({ id: 'key-new', type: 'writedb' });
      wrapper
        .getComponent(CreateAccessKeyModal)
        .vm.$emit('add-access-key', 'my-secret', created);
      await flushPromises();

      expect(mocks.confirm).toHaveBeenCalledWith(
        'Created',
        'Secret: my-secret.',
        { okOnly: true }
      );
      expect(
        wrapper
          .getComponent(AccessKeyTable)
          .props('accessKeys')
          .map((k: { id: string }) => k.id)
      ).toEqual(['key-1', 'key-2', 'key-new']);
    });

    it('appends an activation link for session permissions on mods references', async () => {
      const wrapper = await mountManager(
        {},
        { accessKeyConfig: { allowedSessionPermissions: ['read'] } }
      );
      wrapper
        .getComponent(CreateAccessKeyModal)
        .vm.$emit(
          'add-access-key',
          'a b#c',
          createAccessKey({ reference: 'mir_mods_1', type: 'read' })
        );
      await flushPromises();

      expect(mocks.confirm).toHaveBeenCalledWith(
        'Created',
        'Secret: a b#c. Link: https://example.org/mir/rsc/access-key/mir_mods_1?secret=a%20b%23c',
        { okOnly: true }
      );
    });

    it.each([
      ['a non-session permission', 'mir_mods_1', 'writedb'],
      ['a non-mods reference', 'mir_derivate_1', 'read'],
    ])('omits the activation link for %s', async (_, reference, type) => {
      const wrapper = await mountManager(
        {},
        { accessKeyConfig: { allowedSessionPermissions: ['read'] } }
      );
      wrapper
        .getComponent(CreateAccessKeyModal)
        .vm.$emit(
          'add-access-key',
          'secret',
          createAccessKey({ reference, type })
        );
      await flushPromises();
      expect(mocks.confirm).toHaveBeenCalledWith('Created', 'Secret: secret.', {
        okOnly: true,
      });
    });

    it('uses the current accessKeyConfig after reassignment', async () => {
      const plugin = createAccessKeyManager({ baseUrl });
      const wrapper = mount(AccessKeyManager, {
        global: {
          plugins: [i18n, plugin],
          stubs: { BaseModal: BaseModalStub, ConfirmModal: true },
        },
      });
      await flushPromises();
      plugin.accessKeyConfig = { allowedSessionPermissions: ['read'] };
      wrapper
        .getComponent(CreateAccessKeyModal)
        .vm.$emit(
          'add-access-key',
          'secret',
          createAccessKey({ reference: 'mir_mods_1', type: 'read' })
        );
      await flushPromises();
      expect(mocks.confirm.mock.calls[0][1]).toContain('Link:');
    });
  });
});
