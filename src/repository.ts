import Database from 'bun:sqlite';
import { Bundle, UpdateInfo } from './types';

export class Repository {
  constructor(private readonly db: Database) {
    this.migrate();
  }

  private migrate = (): void => {
    this.db.exec(`
        CREATE TABLE IF NOT EXISTS bundles (
            id TEXT PRIMARY KEY,
            platform TEXT,
            targetAppVersion TEXT,
            shouldForceUpdate INTEGER,
            enabled INTEGER,
            fileHash TEXT,
            gitCommitHash TEXT,
            message TEXT,
            channel TEXT
        )
    `);
  };

  public getBundleById = (bundleId: string): Bundle | null => {
    const bundle = this.db.query<Bundle, Record<string, string>>('SELECT * FROM bundles WHERE id = $bundleId').get({ bundleId });
    if (!bundle) {
      return null;
    }
    return bundle;
  };

  public getBundles = (): Bundle[] => {
    return this.db.query<Bundle, []>('SELECT * FROM bundles').all();
  };

  public upsertBundles = (bundles: Bundle[]): void => {
    const insert = this.db.prepare<void, Bundle>(`
        INSERT OR REPLACE INTO bundles (
          id, platform, targetAppVersion, shouldForceUpdate, enabled,
          fileHash, gitCommitHash, message, channel
        ) 
        VALUES (
          $id, $platform, $targetAppVersion, $shouldForceUpdate, $enabled,
          $fileHash, $gitCommitHash, $message, $channel
        )
      `);

    const insertMany = this.db.transaction((items: Bundle[]) => {
      for (const b of items) {
        insert.run(b);
      }
    });
    insertMany(bundles);
  };

  public getAppVersionList = (platform: string, minBundleId: string): string[] => {
    const appVersionList = this.db
      .query<{ targetAppVersion: string }, Record<string, string>>(
        `
      SELECT targetAppVersion
      FROM bundles
      WHERE platform = $platform AND id >= $minBundleId
      GROUP BY targetAppVersion
      `
      )
      .all({ platform, minBundleId });

    return appVersionList.map((v) => v.targetAppVersion);
  };

  public getUpdateCandidate = (params: { platform: string; bundleId: string; minBundleId: string; channel: string; appVersionList: string[] }): UpdateInfo | null => {
    const { platform, bundleId, minBundleId, channel, appVersionList } = params;
    return this.db
      .query<UpdateInfo, Record<string, string | number>>(
        `
              SELECT b.id, b.shouldForceUpdate as shouldForceUpdate, b.message, 'UPDATE' as status
              FROM bundles b
              WHERE b.enabled = 1
                AND b.platform = $platform
                AND b.id >= $bundleId
                AND b.id > $minBundleId
                AND b.targetAppVersion IN (${appVersionList.map((_, i) => `$appVersion${i}`).join(', ')})
                AND b.channel = $channel
              ORDER BY b.id DESC
            `
      )
      .get({
        platform,
        bundleId,
        minBundleId,
        channel,
        ...Object.fromEntries(appVersionList.map((v, i) => [`appVersion${i}`, v])),
      });
  };

  public getRollbackCandidate = (params: { platform: string; bundleId: string; minBundleId: string; channel: string; appVersionList: string[] }): UpdateInfo | null => {
    const { platform, bundleId, minBundleId, channel, appVersionList } = params;
    return this.db
      .query<UpdateInfo, Record<string, string | number>>(
        `
      SELECT b.id, 1 as shouldForceUpdate, b.message, 'ROLLBACK' as status
      FROM bundles b
      WHERE b.enabled = 1
        AND b.platform = $platform
        AND b.id < $bundleId
        AND b.id > $minBundleId
        AND NOT EXISTS (
          SELECT 1 FROM bundles b2
          WHERE b2.enabled = 1
            AND b2.platform = $platform
            AND b2.id >= $bundleId
            AND b2.id > $minBundleId
            AND b2.targetAppVersion IN (${appVersionList.map((_, i) => `$appVersion${i}`).join(', ')})
            AND b2.channel = $channel
        )
      ORDER BY b.id DESC
    `
      )
      .get({
        platform,
        bundleId,
        minBundleId,
        channel,
        ...Object.fromEntries(appVersionList.map((v, i) => [`appVersion${i}`, v])),
      });
  };

  public bundleExists = (bundleId: string, platform: string): boolean => {
    const result = this.db
      .query<{ id: string }, Record<string, string>>(
        `
      SELECT id
      FROM bundles
      WHERE id = $bundleId
        AND enabled = 1
        AND platform = $platform
    `
      )
      .get({ bundleId, platform });

    return !!result;
  };
}
