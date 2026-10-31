import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { createApp } from './server/app.ts';
import { loadConfig } from './server/config.ts';
import { migrate, openDb } from './server/db.ts';
import { bootstrap } from './server/seed.ts';

if (!process.env.DATABASE_URL && process.env.POSTGRES_URL) process.env.DATABASE_URL = process.env.POSTGRES_URL;
const cfg = loadConfig();
const db = await openDb({ databaseUrl: cfg.databaseUrl, dataDir: cfg.databaseUrl ? null : cfg.dataDir });
await migrate(db);
const boot = await bootstrap(db, cfg);
if (boot.createdAdmin) console.log(`[bootstrap] administrator "${cfg.adminUsername}" created${boot.demo ? ' with the demo business' : ''}`);

const api = createApp(cfg, db);
const root = express();
root.use(api);
const dist = path.resolve('dist');
if (fs.existsSync(dist)) {
  root.use(express.static(dist, { index: false, maxAge: '1h' }));
  root.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}
root.listen(cfg.port, '0.0.0.0', () => console.log(`Saber Date Commerce on http://localhost:${cfg.port} (${db.kind}, ${cfg.env}${cfg.seedDemo ? ', demo data' : ''})`));
