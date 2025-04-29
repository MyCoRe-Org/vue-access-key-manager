export const generateRandomString = (length: number): string => {
  const keylistalpha = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const keylistint = '123456789';
  const keylistspec = '!@#_%$';
  let temp = '';
  let len = length / 2;
  len -= 1;
  const lenspec = length - len - len;
  for (let i = 0; i < len; i += 1) {
    temp += keylistalpha.charAt(
      Math.floor(Math.random() * keylistalpha.length)
    );
  }
  for (let i = 0; i < lenspec; i += 1) {
    temp += keylistspec.charAt(Math.floor(Math.random() * keylistspec.length));
  }
  for (let i = 0; i < len; i += 1) {
    temp += keylistint.charAt(Math.floor(Math.random() * keylistint.length));
  }
  temp = temp
    .split('')
    .sort(() => 0.5 - Math.random())
    .join('');
  return temp;
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
