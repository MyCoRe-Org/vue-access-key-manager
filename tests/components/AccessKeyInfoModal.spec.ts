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
    const value = (selector: string) =>
      wrapper.get<HTMLInputElement>(selector).element.value;
    expect(value('#inputReference')).toBe('mir_mods_1');
    expect(value('#inputPermission')).toBe('read');
    expect(value('#expirationInput')).toBe('2030-06-15');
    expect(value('#commentTextarea')).toBe('initial comment');
    expect(
      wrapper.get<HTMLInputElement>('input#inputActive').element.checked
    ).toBe(true);
  });

  it('does not render a secret input', async () => {
    const wrapper = await mountModal();
    expect(wrapper.find('#inputSecret').exists()).toBe(false);
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
    expect(wrapper.get<HTMLInputElement>('#inputReference').element.value).toBe(
      'mir_mods_2'
    );
    expect(
      wrapper.get<HTMLInputElement>('#expirationInput').element.value
    ).toBe('');
    expect(
      wrapper.get<HTMLInputElement>('input#inputActive').element.checked
    ).toBe(false);
  });

  it('locks the reference when a reference is given', async () => {
    const wrapper = await mountModal({ reference: 'mir_mods_1' });
    expect(wrapper.get('#inputReference').attributes('disabled')).toBeDefined();
  });

  it('patches only the changed fields and emits the reloaded key', async () => {
    const updated = { ...accessKey, comment: 'new comment', isActive: false };
    client.patchAccessKey.mockResolvedValue(undefined);
    client.getAccessKey.mockResolvedValue(updated);
    const wrapper = await mountModal();
    await wrapper.get('#commentTextarea').setValue('new comment');
    await wrapper.get('input#inputActive').setValue(false);
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
    await wrapper.get('#inputReference').setValue('mir_mods_9');
    await wrapper.get('#inputPermission').setValue('writedb');
    await wrapper.get('#expirationInput').setValue('2031-01-01');
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
    await wrapper.get('#expirationInput').setValue('');
    await submit(wrapper);
    expect(client.patchAccessKey).toHaveBeenCalledWith('key-1', {
      expiration: null,
    });
  });

  it('does not submit with an empty reference or permission', async () => {
    const wrapper = await mountModal();
    await wrapper.get('#inputReference').setValue(' ');
    await wrapper.get('#inputPermission').setValue('');
    await submit(wrapper);
    expect(client.patchAccessKey).not.toHaveBeenCalled();
    expect(wrapper.get('#inputReference').classes()).toContain('is-invalid');
    expect(wrapper.get('#inputPermission').classes()).toContain('is-invalid');
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

  it('shows a generic error message for non-Error rejections', async () => {
    client.patchAccessKey.mockRejectedValue('boom');
    const wrapper = await mountModal();
    await submit(wrapper);
    expect(wrapper.get('.alert-danger').text()).toBe('Fatal error');
  });
});
