export type Platform = 'ios' | 'android';

export type Bundle = {
  /**
   * The unique identifier for the bundle. uuidv7
   */
  id: string;
  /**
   * The platform the bundle is for.
   */
  platform: Platform;
  /**
   * The target app version of the bundle.
   */
  targetAppVersion: string;
  /**
   * Whether the bundle should force an update.
   */
  shouldForceUpdate: 1 | 0;
  /**
   * Whether the bundle is enabled.
   */
  enabled: 1 | 0;
  /**
   * The hash of the bundle.
   */
  fileHash: string;
  /**
   * The git commit hash of the bundle.
   */
  gitCommitHash: string | null;
  /**
   * The message of the bundle.
   */
  message: string | null;
  /**
   * The name of the channel where the bundle is deployed.
   *
   * Examples:
   * - production: Production channel for end users
   * - development: Development channel for testing
   * - staging: Staging channel for quality assurance before production
   * - app-name: Channel for specific app instances (e.g., my-app, app-test)
   *
   * Different channel values can be used based on each app's requirements.
   */
  channel: string;
};

export type UpdateStatus = 'ROLLBACK' | 'UPDATE';

export type UpdateInfo = {
  id: string;
  shouldForceUpdate: 1 | 0;
  message: string | null;
  status: UpdateStatus;
};
