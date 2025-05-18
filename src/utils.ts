import { Config } from './config';

export const NIL_UUID = '00000000-0000-0000-0000-000000000000';

export const makeFileUrl = (bundleId: string): string => `${Config.APP_HOST}/files/${bundleId}`;
