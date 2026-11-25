import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ActiveInput from '@/components/inputs/ActiveInput.vue';
import CommentInput from '@/components/inputs/CommentInput.vue';
import ExpirationInput from '@/components/inputs/ExpirationInput.vue';
import PermissionInput from '@/components/inputs/PermissionInput.vue';
import ReferenceInput from '@/components/inputs/ReferenceInput.vue';
import SecretInput from '@/components/inputs/SecretInput.vue';
import { createTestI18n } from '../helpers';

const global = { plugins: [createTestI18n()] };

describe('ActiveInput', () => {
  it('reflects and updates the model via the checkbox', async () => {
    const wrapper = mount(ActiveInput, {
      global,
      props: { modelValue: true },
    });
    const checkbox = wrapper.get<HTMLInputElement>('input[type="checkbox"]');
    expect(checkbox.element.checked).toBe(true);
    await checkbox.setValue(false);
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]]);
  });

  it('toggles the model when the label is clicked', async () => {
    const wrapper = mount(ActiveInput, {
      global,
      props: { modelValue: false },
    });
    await wrapper.get('label').trigger('click');
    expect(wrapper.emitted('update:modelValue')).toEqual([[true]]);
  });
});

describe('CommentInput', () => {
  it('binds the textarea to the model', async () => {
    const wrapper = mount(CommentInput, {
      global,
      props: { modelValue: 'initial' },
    });
    const textarea = wrapper.get<HTMLTextAreaElement>('textarea');
    expect(textarea.element.value).toBe('initial');
    await textarea.setValue('changed');
    expect(wrapper.emitted('update:modelValue')).toEqual([['changed']]);
  });
});

describe('ExpirationInput', () => {
  const timeZone = process.env.TZ;

  afterEach(() => {
    vi.useRealTimers();
    if (timeZone === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = timeZone;
    }
  });

  it.each([
    ['America/New_York', '2026-01-15T03:00:00Z', '2026-01-16'],
    ['Europe/Berlin', '2026-01-14T23:30:00Z', '2026-01-15'],
    ['Europe/Berlin', '2026-01-15T12:00:00Z', '2026-01-16'],
  ])(
    'only allows dates whose UTC midnight is still ahead in %s at %s',
    (zone, now, min) => {
      process.env.TZ = zone;
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(now));
      const wrapper = mount(ExpirationInput, { global });
      expect(wrapper.get('input[type="date"]').attributes('min')).toBe(min);
    }
  );

  it.each(['Tab', 'ArrowUp', ' ', '1', 'Backspace'])(
    'leaves the %s key to the browser',
    key => {
      const input = mount(ExpirationInput, { global }).get('input');
      const event = new KeyboardEvent('keydown', { key, cancelable: true });
      input.element.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    }
  );

  it('limits the year to four digits', () => {
    const wrapper = mount(ExpirationInput, { global });
    expect(wrapper.get('input').attributes('max')).toBe('9999-12-31');
  });

  it('reports an incomplete date', async () => {
    const wrapper = mount(ExpirationInput, { global });
    const input = wrapper.get('input');
    Object.defineProperty(input.element, 'validity', {
      configurable: true,
      value: { badInput: true },
    });
    await input.trigger('input');
    expect(wrapper.emitted('update:incomplete')).toEqual([[true]]);
  });

  it('marks the field as invalid', () => {
    const wrapper = mount(ExpirationInput, {
      global,
      props: { invalid: true },
    });
    expect(wrapper.get('input').classes()).toContain('is-invalid');
  });

  it('updates the earliest date when focused after midnight', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-15T23:00:00Z'));
    const wrapper = mount(ExpirationInput, { global });
    const input = wrapper.get('input[type="date"]');
    expect(input.attributes('min')).toBe('2026-01-16');
    vi.setSystemTime(new Date('2026-01-16T01:00:00Z'));
    await input.trigger('focus');
    expect(input.attributes('min')).toBe('2026-01-17');
  });

  it('binds the date input to the model', async () => {
    const wrapper = mount(ExpirationInput, {
      global,
      props: { modelValue: '2030-01-01' },
    });
    const input = wrapper.get<HTMLInputElement>('input');
    expect(input.element.value).toBe('2030-01-01');
    await input.setValue('2031-02-03');
    expect(wrapper.emitted('update:modelValue')).toEqual([['2031-02-03']]);
  });
});

describe('PermissionInput', () => {
  it('renders a select with the given permissions', async () => {
    const wrapper = mount(PermissionInput, {
      global,
      props: { permissions: ['read', 'writedb'], invalid: false },
    });
    expect(wrapper.find('input').exists()).toBe(false);
    const options = wrapper.findAll('option');
    expect(options.map(o => o.text())).toEqual(['read', 'writedb']);
    await wrapper.get('select').setValue('writedb');
    expect(wrapper.emitted('update:modelValue')).toEqual([['writedb']]);
  });

  it('renders a free text input without permissions', async () => {
    const wrapper = mount(PermissionInput, {
      global,
      props: { invalid: false },
    });
    expect(wrapper.find('select').exists()).toBe(false);
    await wrapper.get('input').setValue('custom');
    expect(wrapper.emitted('update:modelValue')).toEqual([['custom']]);
  });

  it.each([
    [['read'], 'select'],
    [undefined, 'input'],
  ])('marks the %s field as invalid', (permissions, selector) => {
    const wrapper = mount(PermissionInput, {
      global,
      props: { permissions, invalid: true },
    });
    expect(wrapper.get(selector).classes()).toContain('is-invalid');
  });
});

describe('ReferenceInput', () => {
  it('is editable without a fixed reference', async () => {
    const wrapper = mount(ReferenceInput, {
      global,
      props: { invalid: false },
    });
    const input = wrapper.get('input');
    expect(input.attributes('disabled')).toBeUndefined();
    await input.setValue('mir_mods_1');
    expect(wrapper.emitted('update:modelValue')).toEqual([['mir_mods_1']]);
  });

  it('is disabled when a reference is given', () => {
    const wrapper = mount(ReferenceInput, {
      global,
      props: { invalid: false, reference: 'mir_mods_1' },
    });
    expect(wrapper.get('input').attributes('disabled')).toBeDefined();
  });

  it('marks the field as invalid', () => {
    const wrapper = mount(ReferenceInput, {
      global,
      props: { invalid: true },
    });
    expect(wrapper.get('input').classes()).toContain('is-invalid');
  });
});

describe('SecretInput', () => {
  it('generates a random secret on button click', async () => {
    const wrapper = mount(SecretInput, {
      global,
      props: { invalid: false },
    });
    await wrapper.get('button').trigger('click');
    const emitted = wrapper.emitted<[string]>('update:modelValue');
    expect(emitted).toHaveLength(1);
    expect(emitted?.[0][0]).toHaveLength(16);
  });

  it('binds the text input to the model', async () => {
    const wrapper = mount(SecretInput, {
      global,
      props: { invalid: false },
    });
    await wrapper.get('input').setValue('my-secret');
    expect(wrapper.emitted('update:modelValue')).toEqual([['my-secret']]);
  });

  it('marks the field as invalid', () => {
    const wrapper = mount(SecretInput, {
      global,
      props: { invalid: true },
    });
    expect(wrapper.get('input').classes()).toContain('is-invalid');
  });
});
