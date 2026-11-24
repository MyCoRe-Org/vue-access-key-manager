import { beforeEach, describe, expect, it } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import type {
  AccessKey,
  AccessKeyApiClient,
} from '@jsr/mycore__js-common/access-key';
import AccessKeyInfoModal from '@/components/AccessKeyInfoModal.vue';
import { getI18nKey } from '@/common/utils';
import {
  BaseModalStub,
  createAccessKey,
  createClientMock,
  createTestI18n,
  field,
  hasField,
} from '../helpers';

const i18n = createTestI18n({
  [getI18nKey('error.fatal')]: 'Fatal error',
});

let client: ReturnType<typeof createClientMock>;

const accessKey = createAccessKey({
  id: 'key-1',
  reference: 'mir_mods_1',
  type: 'read',
  isActive: true,
  comment: 'initial comment',
  expiration: Date.UTC(2030, 5, 15),
});

const mountModal = async (
  props: Record<string, unknown> = {},
  selected: AccessKey | undefined = accessKey
) => {
  const wrapper = mount(AccessKeyInfoModal, {
    global: { plugins: [i18n], stubs: { BaseModal: BaseModalStub } },
    props: {
      visible: true,
      accessKey: undefined,
      accessKeyClient: client as unknown as AccessKeyApiClient,
      ...props,
    },
  });
  if (selected) {
    await wrapper.setProps({ accessKey: selected });
  }
  return wrapper;
};

const submit = async (wrapper: Awaited<ReturnType<typeof mountModal>>) => {
  await wrapper.get('form').trigger('submit');
  await flushPromises();
};

describe('AccessKeyInfoModal', () => {
  beforeEach(() => {
    client = createClientMock();
  });

  it('fills the form from the selected access key', async () => {
    const wrapper = await mountModal();
    const value = (name: string) =>
      field<HTMLInputElement>(wrapper, name).element.value;
    expect(value('reference')).toBe('mir_mods_1');
    expect(value('permission')).toBe('read');
    expect(value('expiration')).toBe('2030-06-15');
    expect(value('comment')).toBe('initial comment');
    expect(field<HTMLInputElement>(wrapper, 'active').element.checked).toBe(
      true
    );
  });

  it('does not render a secret input', async () => {
    const wrapper = await mountModal();
    expect(hasField(wrapper, 'secret')).toBe(false);
  });

  it('updates the form when another access key is selected', async () => {
    const wrapper = await mountModal();
    await wrapper.setProps({
      accessKey: createAccessKey({
        id: 'key-2',
        reference: 'mir_mods_2',
        isActive: false,
        expiration: null,
      }),
    });
    expect(field<HTMLInputElement>(wrapper, 'reference').element.value).toBe(
      'mir_mods_2'
    );
    expect(field<HTMLInputElement>(wrapper, 'expiration').element.value).toBe(
      ''
    );
    expect(field<HTMLInputElement>(wrapper, 'active').element.checked).toBe(
      false
    );
  });

  it('discards unsaved changes when reopened with the same key', async () => {
    const wrapper = await mountModal();
    await field(wrapper, 'comment').setValue('discarded');
    await wrapper.setProps({ visible: false });
    await wrapper.setProps({ visible: true });
    expect(field<HTMLTextAreaElement>(wrapper, 'comment').element.value).toBe(
      'initial comment'
    );
  });

  it('clears the error and validation state when reopened', async () => {
    client.patchAccessKey.mockRejectedValue(new Error('Forbidden'));
    const wrapper = await mountModal();
    await field(wrapper, 'reference').setValue(' ');
    await submit(wrapper);
    expect(field(wrapper, 'reference').classes()).toContain('is-invalid');
    await field(wrapper, 'reference').setValue('mir_mods_1');
    await submit(wrapper);
    expect(wrapper.find('.alert-danger').exists()).toBe(true);

    await wrapper.setProps({ visible: false });
    await wrapper.setProps({ visible: true });
    expect(wrapper.find('.alert-danger').exists()).toBe(false);
    expect(wrapper.findAll('.is-invalid')).toHaveLength(0);
  });

  it('clears the previous error on a new submit', async () => {
    client.patchAccessKey.mockRejectedValueOnce(new Error('Forbidden'));
    client.getAccessKey.mockResolvedValue(accessKey);
    let resolvePatch: () => void = () => undefined;
    const wrapper = await mountModal();
    await submit(wrapper);
    expect(wrapper.find('.alert-danger').exists()).toBe(true);
    client.patchAccessKey.mockReturnValueOnce(
      new Promise<void>(resolve => {
        resolvePatch = resolve;
      })
    );
    await wrapper.get('form').trigger('submit');
    expect(wrapper.find('.alert-danger').exists()).toBe(false);
    resolvePatch();
    await flushPromises();
  });

  it('locks the reference when a reference is given', async () => {
    const wrapper = await mountModal({ reference: 'mir_mods_1' });
    expect(field(wrapper, 'reference').attributes('disabled')).toBeDefined();
  });

  it('patches only the changed fields and emits the reloaded key', async () => {
    const updated = { ...accessKey, comment: 'new comment', isActive: false };
    client.patchAccessKey.mockResolvedValue(undefined);
    client.getAccessKey.mockResolvedValue(updated);
    const wrapper = await mountModal();
    await field(wrapper, 'comment').setValue('new comment');
    await field(wrapper, 'active').setValue(false);
    await submit(wrapper);

    expect(client.patchAccessKey).toHaveBeenCalledWith('key-1', {
      comment: 'new comment',
      isActive: false,
    });
    expect(client.getAccessKey).toHaveBeenCalledWith('key-1');
    expect(wrapper.emitted('update-access-key')).toEqual([[updated]]);
    expect(wrapper.emitted('update:visible')).toEqual([[false]]);
  });

  it('sends an empty patch when nothing changed', async () => {
    client.getAccessKey.mockResolvedValue(accessKey);
    const wrapper = await mountModal();
    await submit(wrapper);
    expect(client.patchAccessKey).toHaveBeenCalledWith('key-1', {});
  });

  it('patches reference, type and expiration', async () => {
    client.getAccessKey.mockResolvedValue(accessKey);
    const wrapper = await mountModal();
    await field(wrapper, 'reference').setValue('mir_mods_9');
    await field(wrapper, 'permission').setValue('writedb');
    await field(wrapper, 'expiration').setValue('2031-01-01');
    await submit(wrapper);
    expect(client.patchAccessKey).toHaveBeenCalledWith('key-1', {
      reference: 'mir_mods_9',
      type: 'writedb',
      expiration: Date.UTC(2031, 0, 1),
    });
  });

  it('sends expiration null when the expiration is removed', async () => {
    client.getAccessKey.mockResolvedValue(accessKey);
    const wrapper = await mountModal();
    await field(wrapper, 'expiration').setValue('');
    await submit(wrapper);
    expect(client.patchAccessKey).toHaveBeenCalledWith('key-1', {
      expiration: null,
    });
  });

  it('does not submit with an empty reference or permission', async () => {
    const wrapper = await mountModal();
    await field(wrapper, 'reference').setValue(' ');
    await field(wrapper, 'permission').setValue('');
    await submit(wrapper);
    expect(client.patchAccessKey).not.toHaveBeenCalled();
    expect(field(wrapper, 'reference').classes()).toContain('is-invalid');
    expect(field(wrapper, 'permission').classes()).toContain('is-invalid');
  });

  it('shows the error message and stays open when the update fails', async () => {
    client.patchAccessKey.mockRejectedValue(new Error('Forbidden'));
    const wrapper = await mountModal();
    await submit(wrapper);
    expect(wrapper.get('.alert-danger').text()).toBe('Forbidden');
    expect(wrapper.emitted('update-access-key')).toBeUndefined();
    expect(wrapper.emitted('update:visible')).toBeUndefined();
    expect(
      wrapper.get('button[type="submit"]').attributes('disabled')
    ).toBeUndefined();
  });

  it('does not get stuck busy without a client', async () => {
    const wrapper = await mountModal({ accessKeyClient: undefined });
    await submit(wrapper);
    expect(
      wrapper.get('button[type="submit"]').attributes('disabled')
    ).toBeUndefined();
  });

  it('shows a generic error message for non-Error rejections', async () => {
    client.patchAccessKey.mockRejectedValue('boom');
    const wrapper = await mountModal();
    await submit(wrapper);
    expect(wrapper.get('.alert-danger').text()).toBe('Fatal error');
  });
});
