import { describe, expect, it } from 'vitest';
import {
  convertUnixToIso,
  generateRandomString,
  getI18nKey,
  getUnixTimestamp,
  shortReference,
  urlEncode,
} from '@/common/utils';

describe('generateRandomString', () => {
  it.each([8, 16, 32])('returns a string of length %i', length => {
    expect(generateRandomString(length)).toHaveLength(length);
  });

  it('only uses letters, digits and the allowed special characters', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(generateRandomString(16)).toMatch(/^[a-zA-Z1-9!@#_%$]+$/);
    }
  });

  it('contains letters, digits and special characters in fixed amounts', () => {
    const value = generateRandomString(16);
    expect(value.match(/[a-zA-Z]/g)).toHaveLength(7);
    expect(value.match(/[1-9]/g)).toHaveLength(7);
    expect(value.match(/[!@#_%$]/g)).toHaveLength(2);
  });

  it('produces different values on consecutive calls', () => {
    const values = new Set(
      Array.from({ length: 20 }, () => generateRandomString(16))
    );
    expect(values.size).toBe(20);
  });
});

describe('getUnixTimestamp', () => {
  it('converts an ISO date string to milliseconds', () => {
    expect(getUnixTimestamp('2025-01-31')).toBe(Date.UTC(2025, 0, 31));
  });

  it('passes numeric timestamps through', () => {
    expect(getUnixTimestamp(1738281600000)).toBe(1738281600000);
  });
});

describe('convertUnixToIso', () => {
  it('formats a timestamp as YYYY-MM-DD', () => {
    expect(convertUnixToIso(Date.UTC(2025, 0, 31, 12))).toBe('2025-01-31');
  });

  it('round-trips with getUnixTimestamp', () => {
    expect(convertUnixToIso(getUnixTimestamp('2030-12-01'))).toBe('2030-12-01');
  });
});

describe('shortReference', () => {
  it('keeps references up to 20 characters', () => {
    expect(shortReference('a'.repeat(20))).toBe('a'.repeat(20));
  });

  it('truncates longer references to 20 characters with an ellipsis', () => {
    const result = shortReference('mir_mods_000000000001');
    expect(result).toBe('mir_mods_00000000...');
    expect(result).toHaveLength(20);
  });
});

describe('urlEncode', () => {
  it('encodes reserved characters', () => {
    expect(urlEncode('a!@#_%$ b/c')).toBe('a!%40%23_%25%24%20b%2Fc');
  });
});

describe('getI18nKey', () => {
  it('prefixes the key with the access key frontend namespace', () => {
    expect(getI18nKey('label.id')).toBe(
      'component.acl.accesskey.frontend.label.id'
    );
  });
});
