import Elysia from 'elysia';

type Options = {
  secret?: string;
  whiteList: string[];
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const authPlugin = (options: Options) => (app: Elysia) =>
  app
    .derive(({ headers, route }) => {
      if (!options.secret || options.whiteList.some((r) => route.startsWith(r))) {
        return { isAuthenticated: true };
      }

      const secret = headers['secret'];
      const isAuthenticated =
        typeof secret === 'string' &&
        typeof options.secret === 'string' &&
        secret.length === options.secret.length &&
        crypto.timingSafeEqual(Buffer.from(secret), Buffer.from(options.secret));

      return { isAuthenticated };
    })
    .guard({
      beforeHandle: ({ isAuthenticated, set }) => {
        if (!isAuthenticated) {
          return (set.status = 'Unauthorized');
        }
      },
    });
