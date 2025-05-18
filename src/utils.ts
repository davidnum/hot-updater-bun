export const NIL_UUID = '00000000-0000-0000-0000-000000000000';

export const makeFileUrl = (bundleId: string, requestUrl: string): string => {
  const url = new URL(requestUrl);
  return `${url.origin}/files/${bundleId}`;
};
