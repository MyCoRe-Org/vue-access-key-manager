import { fetchJwt as mcrFetchJwt } from '@mycore/js-common/auth';

export const fetchJwt = async (
  baseUrl: string,
  reference?: string,
  isSessionEnabled?: boolean
): Promise<string> => {
  const attributeName = `acckey_${reference}`;
  return await mcrFetchJwt(baseUrl, {
    userAttributes: [attributeName],
    sessionAttributes: isSessionEnabled ? [attributeName] : undefined,
  });
};
