import { describe, expect, it } from 'vitest';
import * as entry from '@/index';
import AccessKeyInfoModal from '@/components/AccessKeyInfoModal.vue';
import AccessKeyManager from '@/components/AccessKeyManager.vue';
import AccessKeyTable from '@/components/AccessKeyTable.vue';
import CreateAccessKeyModal from '@/components/CreateAccessKeyModal.vue';
import { AccessKeyManagerStateKey, createAccessKeyManager } from '@/plugin';

describe('package entry', () => {
  it('exports the components and the plugin', () => {
    expect(Object.keys(entry).sort()).toEqual([
      'AccessKeyInfoModal',
      'AccessKeyManager',
      'AccessKeyManagerStateKey',
      'AccessKeyTable',
      'CreateAccessKeyModal',
      'createAccessKeyManager',
    ]);
    expect(entry).toMatchObject({
      AccessKeyInfoModal,
      AccessKeyManager,
      AccessKeyManagerStateKey,
      AccessKeyTable,
      CreateAccessKeyModal,
      createAccessKeyManager,
    });
  });
});
