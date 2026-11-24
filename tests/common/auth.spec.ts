import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchJwt as mcrFetchJwt } from '@jsr/mycore__js-common/auth';
import { fetchJwt } from '@/common/auth';

vi.mock('@jsr/mycore__js-common/auth', () => ({
  fetchJwt: vi.fn(),
}));

const baseUrl = 'https://example.org/mir/';

describe('fetchJwt', () => {
  beforeEach(() => {
    vi.mocked(mcrFetchJwt).mockResolvedValue('jwt-token');
  });

  it('requests the access key user attribute for the reference', async () => {
    await expect(fetchJwt(baseUrl, 'test_mods_00000001')).resolves.toBe(
      'jwt-token'
    );
    expect(mcrFetchJwt).toHaveBeenCalledWith(baseUrl, {
      userAttributes: ['acckey_test_mods_00000001'],
      sessionAttributes: undefined,
    });
  });

  it('additionally requests the session attribute when sessions are enabled', async () => {
    await fetchJwt(baseUrl, 'test_mods_00000001', true);
    expect(mcrFetchJwt).toHaveBeenCalledWith(baseUrl, {
      userAttributes: ['acckey_test_mods_00000001'],
      sessionAttributes: ['acckey_test_mods_00000001'],
    });
  });

  it('requests no access key attributes without reference', async () => {
    await fetchJwt(baseUrl, undefined, true);
    expect(mcrFetchJwt).toHaveBeenCalledWith(baseUrl);
  });

  it('propagates errors', async () => {
    vi.mocked(mcrFetchJwt).mockRejectedValue(new Error('unauthorized'));
    await expect(fetchJwt(baseUrl, 'ref')).rejects.toThrow('unauthorized');
  });
});
