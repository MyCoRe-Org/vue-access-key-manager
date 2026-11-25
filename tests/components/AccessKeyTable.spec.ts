import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import AccessKeyTable from '@/components/AccessKeyTable.vue';
import { getI18nKey } from '@/common/utils';
import { createAccessKey, createTestI18n } from '../helpers';

const i18n = createTestI18n({
  [getI18nKey('button.yes')]: 'Yes',
  [getI18nKey('button.no')]: 'No',
  [getI18nKey('label.id')]: 'ID',
});

const accessKeys = [
  createAccessKey({
    id: 'key-1',
    reference: 'mir_mods_1',
    type: 'read',
    isActive: true,
    expiration: Date.UTC(2030, 5, 15),
  }),
  createAccessKey({
    id: 'key-2',
    reference: 'mir_mods_2',
    type: 'writedb',
    isActive: false,
    expiration: null,
  }),
];

const mountTable = () =>
  mount(AccessKeyTable, {
    global: { plugins: [i18n] },
    props: { accessKeys },
  });

describe('AccessKeyTable', () => {
  it('renders translated column headers', () => {
    const headers = mountTable().findAll('th');
    expect(headers).toHaveLength(6);
    expect(headers[0].text()).toBe('ID');
  });

  it('renders one row per access key', () => {
    const rows = mountTable().findAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].findAll('td').map(td => td.text())).toEqual([
      'key-1',
      'mir_mods_1',
      'read',
      'Yes',
      '2030-06-15',
      '',
    ]);
    expect(rows[1].findAll('td').map(td => td.text())).toEqual([
      'key-2',
      'mir_mods_2',
      'writedb',
      'No',
      '-',
      '',
    ]);
  });

  it('renders an empty body without access keys', () => {
    const wrapper = mount(AccessKeyTable, {
      global: { plugins: [i18n] },
      props: { accessKeys: [] },
    });
    expect(wrapper.findAll('tbody tr')).toHaveLength(0);
  });

  it('emits view-access-key with the row index', async () => {
    const wrapper = mountTable();
    await wrapper.findAll('tbody tr')[1].get('.fa-edit').trigger('click');
    expect(wrapper.emitted('view-access-key')).toEqual([[1]]);
  });

  it('emits remove-access-key with the access key', async () => {
    const wrapper = mountTable();
    await wrapper.findAll('tbody tr')[0].get('.fa-trash').trigger('click');
    expect(wrapper.emitted('remove-access-key')).toEqual([[accessKeys[0]]]);
  });
});
