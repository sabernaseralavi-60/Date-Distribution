import crypto from 'node:crypto';

export interface Config {
  env: 'production' | 'development' | 'test';
  port: number;
  databaseUrl: string | null;
  dataDir: string;
  sessionSecret: string;
  sessionHours: number;
  adminUsername: string;
  adminPassword: string | null;
  seedPassword: string | null;
  /** true = load the deterministic demo business of the spec (Part 45) */
  seedDemo: boolean;
  trustProxy: boolean;
}

export function loadConfig(overrides: Partial<Config> = {}): Config {
  const e = process.env;
  const env = (overrides.env ?? (e.NODE_ENV === 'production' ? 'production' : e.NODE_ENV === 'test' ? 'test' : 'development')) as Config['env'];
  const prod = env === 'production';

  let sessionSecret = overrides.sessionSecret ?? e.SESSION_SECRET ?? '';
  if (!sessionSecret) {
    if (prod) throw new Error('SESSION_SECRET is required in production (use at least 32 random characters).');
    sessionSecret = crypto.randomBytes(32).toString('hex'); // dev/test: sessions end on restart
  }
  if (prod && sessionSecret.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters.');

  return {
    env,
    port: Number(e.PORT) || 3000,
    databaseUrl: e.DATABASE_URL || null,
    dataDir: e.DATA_DIR || './data/pglite',
    sessionSecret,
    sessionHours: Number(e.SESSION_HOURS) || 12,
    adminUsername: (e.ADMIN_USERNAME || 'admin').toLowerCase(),
    adminPassword: e.ADMIN_PASSWORD || null,
    seedPassword: e.SEED_PASSWORD || null,
    seedDemo: e.SEED_DEMO ? e.SEED_DEMO === 'true' : !prod,
    trustProxy: e.TRUST_PROXY ? e.TRUST_PROXY === 'true' : prod,
    ...overrides,
  };
}
