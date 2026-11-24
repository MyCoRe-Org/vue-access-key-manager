const randomInt = (max: number): number => {
  const limit = Math.floor(0x100000000 / max) * max;
  const buffer = new Uint32Array(1);
  do {
    crypto.getRandomValues(buffer);
  } while (buffer[0] >= limit);
  return buffer[0] % max;
};

const randomChars = (charset: string, count: number): string[] =>
  Array.from({ length: count }, () =>
    charset.charAt(randomInt(charset.length))
  );

export const generateRandomString = (length: number): string => {
  const keylistalpha = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const keylistint = '123456789';
  const keylistspec = '!@#_%$';
  const len = Math.max(0, Math.floor(length / 2) - 1);
  const chars = [
    ...randomChars(keylistalpha, len),
    ...randomChars(keylistspec, length - 2 * len),
    ...randomChars(keylistint, len),
  ];
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
};

export const getUnixTimestamp = (date: number | string): number =>
  Math.floor(new Date(date).getTime());

export const convertUnixToIso = (unixTimestamp: number): string => {
  return new Date(unixTimestamp).toISOString().slice(0, 10);
};

const shortString = (input: string, len: number): string =>
  input.length > len ? `${input.slice(0, len - 3)}...` : input;

export const shortReference = (reference: string): string =>
  shortString(reference, 20);

export const urlEncode = (value: string): string => encodeURIComponent(value);

export const getI18nKey = (value: string): string =>
  `component.acl.accesskey.frontend.${value}`;
