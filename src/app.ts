import { Elysia, NotFoundError, t } from 'elysia';

import { logger } from '@bogeychan/elysia-logger';
import swagger from '@elysiajs/swagger';
import { Config } from './config';
import { authPlugin } from './auth-plugin';
import { ensureFolderExists, makeFileUrl, NIL_UUID } from './utils';
import { Repository } from './repository';
import Database from 'bun:sqlite';
import { FileStorage } from './file-storage';

const BundleSchema = t.Object({
  id: t.String(),
  platform: t.UnionEnum(['android', 'ios']),
  targetAppVersion: t.String(),
  shouldForceUpdate: t.Boolean(),
  enabled: t.Boolean(),
  fileHash: t.String(),
  gitCommitHash: t.Nullable(t.String()),
  message: t.Nullable(t.String()),
  channel: t.String(),
});

ensureFolderExists(Config.DB_PATH);
ensureFolderExists(Config.UPLOADS_DIR);

const repo = new Repository(new Database(Config.DB_PATH, { strict: true }));
const fileStorage = new FileStorage(Config.UPLOADS_DIR);

new Elysia()
  .use(swagger())
  .use(
    authPlugin({
      secret: Config.SECRET,
      whiteList: ['/swagger', '/checkUpdate', '/files'],
    })
  )
  .use(logger())
  .post(
    '/uploadBundle',
    async ({ body: { bundleId, file }, request }) => {
      await fileStorage.saveFile(bundleId, file);
      return {
        key: makeFileUrl(bundleId, request.url),
        bucketName: 'local',
      };
    },
    {
      body: t.Object({
        bundleId: t.String(),
        file: t.File(),
      }),
      response: t.Object({
        bucketName: t.String(),
        key: t.String(),
      }),
    }
  )
  .post(
    '/deleteBundle',
    async ({ body: { bundleId } }) => {
      await fileStorage.deleteFile(bundleId);
      return { success: true };
    },
    {
      body: t.Object({
        bundleId: t.String(),
      }),
      response: t.Object({
        success: t.Boolean(),
      }),
    }
  )
  .get(
    '/bundles/:bundleId',
    ({ params: { bundleId } }) => {
      const bundle = repo.getBundleById(bundleId);
      if (!bundle) {
        throw new NotFoundError('Bundle not found');
      }
      return {
        ...bundle,
        shouldForceUpdate: !!bundle.shouldForceUpdate,
        enabled: !!bundle.enabled,
      };
    },
    {
      response: BundleSchema,
    }
  )
  .get(
    '/bundles',
    () => {
      const bundles = repo.getBundles();
      return bundles.map((b) => ({
        ...b,
        shouldForceUpdate: !!b.shouldForceUpdate,
        enabled: !!b.enabled,
      }));
    },
    {
      response: t.Array(BundleSchema),
    }
  )
  .post(
    '/bundles',
    ({ body: bundles }) => {
      repo.upsertBundles(
        bundles.map((b) => ({
          id: b.id,
          platform: b.platform,
          targetAppVersion: b.targetAppVersion,
          shouldForceUpdate: b.shouldForceUpdate ? 1 : 0,
          enabled: b.enabled ? 1 : 0,
          fileHash: b.fileHash,
          gitCommitHash: b.gitCommitHash,
          message: b.message,
          channel: b.channel,
        }))
      );
      return { success: true };
    },
    {
      body: t.Array(BundleSchema),
      response: t.Object({
        success: t.Boolean(),
      }),
    }
  )
  .get(
    '/files/:bundleId',
    async ({ params: { bundleId } }) => {
      const file = await fileStorage.getFile(bundleId);
      if (!file) {
        throw new NotFoundError('File not found');
      }
      return file;
    },
    {
      response: t.File(),
    }
  )
  .get(
    '/checkUpdate',
    ({ headers, request }) => {
      const platform = headers['x-app-platform'];
      // const version = headers['x-app-version'];
      const bundleId = headers['x-bundle-id'];
      const minBundleId = headers['x-min-bundle-id'] || NIL_UUID;
      const channel = headers['x-channel'] || 'production';

      const appVersionList = repo.getAppVersionList(platform, minBundleId);
      const updateCandidate = repo.getUpdateCandidate({
        platform,
        bundleId,
        minBundleId,
        channel,
        appVersionList,
      });

      if (updateCandidate && updateCandidate.id !== bundleId) {
        return {
          ...updateCandidate,
          shouldForceUpdate: !!updateCandidate.shouldForceUpdate,
          fileUrl: makeFileUrl(updateCandidate.id, request.url),
        };
      }
      const rollbackCandidate = repo.getRollbackCandidate({ platform, bundleId, minBundleId, channel, appVersionList });

      if (rollbackCandidate && rollbackCandidate.id !== bundleId) {
        return {
          ...rollbackCandidate,
          shouldForceUpdate: !!rollbackCandidate.shouldForceUpdate,
          fileUrl: makeFileUrl(rollbackCandidate.id, request.url),
        };
      }

      const bundleExists = repo.bundleExists(bundleId, platform);

      if (!bundleExists && bundleId !== NIL_UUID && bundleId > minBundleId) {
        return {
          id: NIL_UUID,
          shouldForceUpdate: true,
          message: null,
          status: 'ROLLBACK' as const,
          fileUrl: null,
        };
      }

      return null;
    },
    {
      headers: t.Object({
        'x-app-platform': t.String(),
        'x-app-version': t.String(),
        'x-bundle-id': t.String(),
        'x-min-bundle-id': t.Optional(t.String()),
        'x-channel': t.Optional(t.String()),
      }),
      response: t.Nullable(
        t.Object({
          id: t.String(),
          shouldForceUpdate: t.Boolean(),
          message: t.Nullable(t.String()),
          status: t.UnionEnum(['ROLLBACK', 'UPDATE']),
          fileUrl: t.Nullable(t.String()),
        })
      ),
    }
  )
  .listen({
    hostname: Config.APP_HOST,
    port: Config.APP_PORT,
  });

// eslint-disable-next-line no-console
console.log(`Server is running at ${Config.APP_HOST}:${Config.APP_PORT}`);
