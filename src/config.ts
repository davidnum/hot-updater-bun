export const Config = {
  UPLOADS_DIR: Bun.env.UPLOADS_DIR || 'uploads',
  DB_PATH: Bun.env.DB_PATH || 'app.db',
  APP_HOST: Bun.env.APP_HOST || 'localhost',
  APP_PORT: Number(Bun.env.APP_PORT) || 3000,
  SECRET: Bun.env.SECRET,
};
