import Elysia from 'elysia';

type Options = {
  secret: string;
  whiteList: string[];
};

export const authPlugin =
  (options: Options) =>
  (app: Elysia): Elysia =>
    app.derive(({ headers, route, set }) => {
      if (options.whiteList.some((r) => route.startsWith(r))) {
        return;
      }

      const secret = headers['secret'];
      if (
        typeof secret !== 'string' ||
        typeof options.secret !== 'string' ||
        secret.length !== options.secret.length ||
        !crypto.timingSafeEqual(Buffer.from(secret), Buffer.from(options.secret))
      ) {
        set.status = 401;
        throw new Error('Unauthorized');
      }
    });
