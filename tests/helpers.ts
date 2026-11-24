import { vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { createI18n } from 'vue-i18n';
import type { AccessKey } from '@jsr/mycore__js-common/access-key';

export const createTestI18n = (messages: Record<string, string> = {}) =>
  createI18n({
    legacy: false,
    locale: 'en',
    missingWarn: false,
    fallbackWarn: false,
    messages: { en: messages },
  });

export const BaseModalStub = defineComponent({
  name: 'BaseModal',
  props: {
    id: { type: String, default: undefined },
    title: { type: String, default: undefined },
    busy: { type: Boolean, default: false },
    visible: { type: Boolean, default: false },
  },
  emits: ['update:visible', 'hidden'],
  setup(props, { slots }) {
    return () =>
      h('div', { class: 'base-modal-stub', id: props.id }, [
        slots.default?.(),
        h('div', { class: 'modal-footer' }, slots['modal-footer']?.()),
      ]);
  },
});

export const createAccessKey = (
  overrides: Partial<AccessKey> = {}
): AccessKey => ({
  id: 'key-1',
  reference: 'test_mods_00000001',
  secret: 'hashed-secret',
  type: 'read',
  isActive: true,
  comment: undefined,
  expiration: null,
  ...overrides,
});

export const createClientMock = () => ({
  getAccessKeys: vi.fn(),
  getAccessKey: vi.fn(),
  createAccessKey: vi.fn(),
  patchAccessKey: vi.fn(),
  deleteAccessKey: vi.fn(),
});
