import { createInitialSeedState } from '../src/core/seed.ts';
import type { SaberCommerceState } from '../src/core/types.ts';
import { hashPassword } from './auth.ts';
import type { Config } from './config.ts';
import type { Db } from './db.ts';
import { MIN_PASSWORD } from './app.ts';

/** A real (non-demo) business starts with its settings and nothing else: no products, people or movements. */
export function createBlankState(): SaberCommerceState {
  const s = createInitialSeedState();
  return {
    ...s,
    version: 1,
    products: [], priceHistory: [], commissionRules: [], agents: [], retailers: [], customers: [], inventoryTransactions: [], documents: [],
    consignmentDeliveries: [], salesReports: [], invoices: [], payments: [], agentCashCollections: [], agentRemittances: [], commissions: [],
    commissionPayments: [], visits: [], restockRequests: [], discrepancies: [], inventoryCounts: [], b2cOrders: [], refunds: [], expenses: [],
    journalEntries: [], notifications: [], qrLogs: [], auditLogs: [], cashBankTransactions: [], financialAdjustments: [],
  };
}

/**
 * First start: creates the ledger (demo business of spec Part 45 when SEED_DEMO=true, otherwise a blank business), the
 * administrator, and - for the demo - one login per agent and per store. Passwords come from the environment, never from code.
 */
export async function bootstrap(db: Db, cfg: Config): Promise<{ createdAdmin: boolean; demo: boolean }> {
  const has = await db.query('SELECT 1 FROM ledger_state WHERE id = 1');
  const state = has.length ? null : cfg.seedDemo ? createInitialSeedState() : createBlankState();
  if (state) {
    await db.query(`INSERT INTO ledger_state (id, version, state) VALUES (1, $1, $2::jsonb) ON CONFLICT (id) DO NOTHING`, [state.version, JSON.stringify(state)]);
  }
  const users = await db.query('SELECT count(*)::int AS n FROM users');
  if (users[0].n > 0) return { createdAdmin: false, demo: cfg.seedDemo };
  if (!cfg.adminPassword || cfg.adminPassword.length < MIN_PASSWORD) {
    throw new Error(`ADMIN_PASSWORD (at least ${MIN_PASSWORD} characters) is required to create the first administrator.`);
  }
  await db.query(`INSERT INTO users (username, password_hash, full_name, role) VALUES ($1,$2,$3,'admin') ON CONFLICT (username) DO NOTHING`,
    [cfg.adminUsername, await hashPassword(cfg.adminPassword), 'مدیر سیستم']);
  if (cfg.seedDemo) {
    if (!cfg.seedPassword || cfg.seedPassword.length < MIN_PASSWORD) throw new Error(`SEED_PASSWORD (at least ${MIN_PASSWORD} characters) is required when SEED_DEMO=true.`);
    const pw = await hashPassword(cfg.seedPassword);
    const live = (await db.query('SELECT state FROM ledger_state WHERE id = 1'))[0].state as SaberCommerceState;
    for (const a of live.agents) {
      await db.query(`INSERT INTO users (username, password_hash, full_name, role, entity_id) VALUES ($1,$2,$3,'agent',$4) ON CONFLICT DO NOTHING`, [a.username.toLowerCase(), pw, a.fullName, a.id]);
    }
    for (const r of live.retailers) {
      await db.query(`INSERT INTO users (username, password_hash, full_name, role, entity_id) VALUES ($1,$2,$3,'retailer',$4) ON CONFLICT DO NOTHING`, [r.code.toLowerCase().replace('-', ''), pw, r.ownerName, r.id]);
    }
  }
  return { createdAdmin: true, demo: cfg.seedDemo };
}
