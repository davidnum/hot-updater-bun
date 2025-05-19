import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'path';

export const NIL_UUID = '00000000-0000-0000-0000-000000000000';

export const makeFileUrl = (bundleId: string, requestUrl: string): string => {
  const url = new URL(requestUrl);
  return `${url.origin}/files/${bundleId}`;
};

export const ensureFolderExists = (path: string): void => {
  const folderPath = dirname(path);

  // eslint-disable-next-line security/detect-non-literal-fs-filename
  if (!existsSync(folderPath)) {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    mkdirSync(folderPath, { recursive: true });
  }
};
