import { beforeEach, describe, expect, it } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import type { AccessKeyApiClient } from '@jsr/mycore__js-common/access-key';
import CreateAccessKeyModal from '@/components/CreateAccessKeyModal.vue';
import { getI18nKey } from '@/common/utils';
import {
  BaseModalStub,
  createAccessKey,
  createClientMock,
  createTestI18n,
  field,
  typeIncompleteDate,
} from '../helpers';

const i18n = createTestI18n({
  [getI18nKey('error.fatal')]: 'Fatal error',
  [getI18nKey('title.createAccessKey')]: 'Create access key',
});

let client: ReturnType<typeof createClientMock>;

const mountModal = (props: Record<string, unknown> = {}) =>
  mount(CreateAccessKeyModal, {
    global: { plugins: [i18n], stubs: { BaseModal: BaseModalStub } },
    props: {
      visible: true,
      accessKeyClient: client as unknown as AccessKeyApiClient,
      ...props,
    },
  });

const fillForm = async (
  wrapper: ReturnType<typeof mountModal>,
  values: { reference?: string; secret?: string; type?: string } = {}
) => {
  if (values.reference !== undefined) {
    await field(wrapper, 'reference').setValue(values.reference);
  }
  await field(wrapper, 'secret').setValue(values.secret ?? 'secret');
  await field(wrapper, 'permission').setValue(values.type ?? 'read');
};

const submit = async (wrapper: ReturnType<typeof mountModal>) => {
  await wrapper.get('form').trigger('submit');
  await flushPromises();
};

describe('CreateAccessKeyModal', () => {
  beforeEach(() => {
    client = createClientMock();
  });

  it('uses the create title', () => {
    expect(mountModal().getComponent(BaseModalStub).props('title')).toBe(
      'Create access key'
    );
  });

  it('links every label to its own input', () => {
    const wrapper = mountModal();
    const ids = wrapper.findAll('label').map(l => l.attributes('for'));
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(wrapper.find(`[id="${id}"]`).exists()).toBe(true);
    }
  });

  it('shows an error instead of getting stuck without a client', async () => {
    const wrapper = mountModal({ accessKeyClient: undefined });
    await fillForm(wrapper, { reference: 'mir_mods_1' });
    await submit(wrapper);
    expect(
      wrapper.get('button[type="submit"]').attributes('disabled')
    ).toBeUndefined();
    expect(wrapper.get('.alert-danger').text()).toBe('Fatal error');
  });

  it('refuses an incomplete expiration instead of dropping it', async () => {
    const wrapper = mountModal({ reference: 'mir_mods_1' });
    await fillForm(wrapper);
    await typeIncompleteDate(field(wrapper, 'expiration'));
    await submit(wrapper);
    expect(client.createAccessKey).not.toHaveBeenCalled();
    expect(field(wrapper, 'expiration').classes()).toContain('is-invalid');
  });

  it('refuses a year with more than four digits', async () => {
    const wrapper = mountModal({ reference: 'mir_mods_1' });
    await fillForm(wrapper);
    await field(wrapper, 'expiration').setValue('20301-01-01');
    await submit(wrapper);
    expect(client.createAccessKey).not.toHaveBeenCalled();
  });

  it('refuses an expiration whose UTC midnight has passed', async () => {
    const wrapper = mountModal({ reference: 'mir_mods_1' });
    await fillForm(wrapper);
    await field(wrapper, 'expiration').setValue('2020-01-01');
    await submit(wrapper);
    expect(client.createAccessKey).not.toHaveBeenCalled();
    expect(field(wrapper, 'expiration').classes()).toContain('is-invalid');
  });

  it('prefills and locks the reference when given', () => {
    const wrapper = mountModal({ reference: 'mir_mods_1' });
    const input = field<HTMLInputElement>(wrapper, 'reference');
    expect(input.element.value).toBe('mir_mods_1');
    expect(input.attributes('disabled')).toBeDefined();
  });

  it('follows a changed reference', async () => {
    const wrapper = mountModal({ reference: 'mir_mods_1' });
    await wrapper.setProps({ reference: 'mir_mods_2' });
    expect(field<HTMLInputElement>(wrapper, 'reference').element.value).toBe(
      'mir_mods_2'
    );
    wrapper.getComponent(BaseModalStub).vm.$emit('hidden');
    await flushPromises();
    expect(field<HTMLInputElement>(wrapper, 'reference').element.value).toBe(
      'mir_mods_2'
    );
  });

  it('starts with an active key', () => {
    const wrapper = mountModal();
    expect(field<HTMLInputElement>(wrapper, 'active').element.checked).toBe(
      true
    );
  });

  it('marks required fields as invalid and does not submit an empty form', async () => {
    const wrapper = mountModal();
    await submit(wrapper);
    expect(client.createAccessKey).not.toHaveBeenCalled();
    expect(field(wrapper, 'reference').classes()).toContain('is-invalid');
    expect(field(wrapper, 'secret').classes()).toContain('is-invalid');
    expect(field(wrapper, 'permission').classes()).toContain('is-invalid');
  });

  it('treats whitespace-only values as invalid', async () => {
    const wrapper = mountModal();
    await fillForm(wrapper, { reference: '  ', secret: ' ', type: ' ' });
    await submit(wrapper);
    expect(client.createAccessKey).not.toHaveBeenCalled();
  });

  it('does not show validation errors before the first submit', () => {
    const wrapper = mountModal();
    expect(wrapper.findAll('.is-invalid')).toHaveLength(0);
  });

  it('creates the access key, emits it with the secret and closes', async () => {
    const created = createAccessKey({ id: 'new-key' });
    client.createAccessKey.mockResolvedValue('new-key');
    client.getAccessKey.mockResolvedValue(created);
    const wrapper = mountModal({ reference: 'mir_mods_1' });
    await fillForm(wrapper, { secret: 'my-secret', type: 'read' });
    await submit(wrapper);

    expect(client.createAccessKey).toHaveBeenCalledWith({
      reference: 'mir_mods_1',
      secret: 'my-secret',
      isActive: true,
      type: 'read',
      expiration: undefined,
    });
    expect(client.getAccessKey).toHaveBeenCalledWith('new-key');
    expect(wrapper.emitted('add-access-key')).toEqual([['my-secret', created]]);
    expect(wrapper.emitted('update:visible')).toEqual([[false]]);
  });

  it('sends expiration as timestamp and the comment when set', async () => {
    client.createAccessKey.mockResolvedValue('new-key');
    client.getAccessKey.mockResolvedValue(createAccessKey());
    const wrapper = mountModal();
    await fillForm(wrapper, { reference: 'mir_mods_2' });
    await field(wrapper, 'expiration').setValue('2030-06-15');
    await field(wrapper, 'comment').setValue('for reviewers');
    await field(wrapper, 'active').setValue(false);
    await submit(wrapper);

    expect(client.createAccessKey).toHaveBeenCalledWith({
      reference: 'mir_mods_2',
      secret: 'secret',
      isActive: false,
      type: 'read',
      expiration: Date.UTC(2030, 5, 15),
      comment: 'for reviewers',
    });
  });

  it('offers the given permissions as select options', () => {
    const wrapper = mountModal({ permissions: ['read', 'writedb'] });
    expect(field(wrapper, 'permission').element.tagName).toBe('SELECT');
    expect(wrapper.findAll('option').map(o => o.text())).toEqual([
      'read',
      'writedb',
    ]);
  });

  it('shows the error message and stays open when creation fails', async () => {
    client.createAccessKey.mockRejectedValue(new Error('Duplicate secret'));
    const wrapper = mountModal({ reference: 'mir_mods_1' });
    await fillForm(wrapper);
    await submit(wrapper);

    expect(wrapper.get('.alert-danger').text()).toBe('Duplicate secret');
    expect(wrapper.emitted('add-access-key')).toBeUndefined();
    expect(wrapper.emitted('update:visible')).toBeUndefined();
    expect(
      wrapper.get('button[type="submit"]').attributes('disabled')
    ).toBeUndefined();
  });

  it('shows a generic error message for non-Error rejections', async () => {
    client.createAccessKey.mockRejectedValue('boom');
    const wrapper = mountModal({ reference: 'mir_mods_1' });
    await fillForm(wrapper);
    await submit(wrapper);
    expect(wrapper.get('.alert-danger').text()).toBe('Fatal error');
  });

  it('disables the submit button while busy and ignores double submits', async () => {
    let resolveCreate: (id: string) => void = () => undefined;
    client.createAccessKey.mockReturnValue(
      new Promise<string>(resolve => {
        resolveCreate = resolve;
      })
    );
    client.getAccessKey.mockResolvedValue(createAccessKey());
    const wrapper = mountModal({ reference: 'mir_mods_1' });
    await fillForm(wrapper);
    await wrapper.get('form').trigger('submit');
    await wrapper.get('form').trigger('submit');

    expect(
      wrapper.get('button[type="submit"]').attributes('disabled')
    ).toBeDefined();
    expect(client.createAccessKey).toHaveBeenCalledTimes(1);

    resolveCreate('key-1');
    await flushPromises();
    expect(
      wrapper.get('button[type="submit"]').attributes('disabled')
    ).toBeUndefined();
  });

  it('resets form and error when the modal is hidden', async () => {
    client.createAccessKey.mockRejectedValue(new Error('failed'));
    const wrapper = mountModal({ reference: 'mir_mods_1' });
    await fillForm(wrapper, { secret: 'typed-secret' });
    await submit(wrapper);
    expect(wrapper.find('.alert-danger').exists()).toBe(true);

    wrapper.getComponent(BaseModalStub).vm.$emit('hidden');
    await flushPromises();

    expect(wrapper.find('.alert-danger').exists()).toBe(false);
    expect(wrapper.findAll('.is-invalid')).toHaveLength(0);
    expect(field<HTMLInputElement>(wrapper, 'secret').element.value).toBe('');
    expect(field<HTMLInputElement>(wrapper, 'reference').element.value).toBe(
      'mir_mods_1'
    );
  });
});
