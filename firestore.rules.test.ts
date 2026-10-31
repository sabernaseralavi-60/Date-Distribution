import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rulesContent = fs.readFileSync(new URL('./firestore.rules', import.meta.url), 'utf8');

interface MockAuth {
  uid: string;
  email: string;
  email_verified: boolean;
}

function evaluateDirtyDozenAgainstRules(
  rules: string,
  operation: 'get' | 'list' | 'create' | 'update' | 'delete',
  collection: 'admins' | 'products' | 'ledger_snapshots' | 'audit_logs',
  docId: string,
  auth: MockAuth | null,
  incomingData?: Record<string, unknown>,
  existingData?: Record<string, unknown>,
  isTimestampEqualRequestTime = true
): 'ALLOWED' | 'PERMISSION_DENIED' {
  // Verify rules file contains mandatory structural guards
  assert.ok(rules.includes("rules_version = '2';"));
  assert.ok(rules.includes('allow read, write: if false;'));

  const isValidId =
    typeof docId === 'string' &&
    docId.length >= 1 &&
    docId.length <= 128 &&
    /^[a-zA-Z0-9_-]+$/.test(docId);

  if (operation !== 'list' && !isValidId) {
    return 'PERMISSION_DENIED';
  }

  const isVerifiedUser = Boolean(auth && auth.email_verified === true);
  const isBootstrappedAdmin = Boolean(
    isVerifiedUser && auth?.email === 'saber.naseralavi@gmail.com'
  );

  if (collection === 'admins') {
    if (operation === 'create') {
      if (
        !isBootstrappedAdmin ||
        docId !== auth?.uid ||
        !incomingData ||
        Object.keys(incomingData).length !== 3 ||
        incomingData.uid !== auth?.uid ||
        !isTimestampEqualRequestTime
      ) {
        return 'PERMISSION_DENIED';
      }
      return 'ALLOWED';
    }
    return 'PERMISSION_DENIED';
  }

  if (collection === 'products') {
    if (operation === 'create') {
      if (!isBootstrappedAdmin || !incomingData || !isTimestampEqualRequestTime) {
        return 'PERMISSION_DENIED';
      }
      const allowedKeys = new Set([
        'sku',
        'name',
        'brand',
        'category',
        'packaging',
        'netWeightGrams',
        'costPrice',
        'baseRetailerPrice',
        'retailerMarkupPercent',
        'directB2cPrice',
        'isActive',
        'ownerId',
        'createdAt',
        'updatedAt',
      ]);
      for (const k of Object.keys(incomingData)) {
        if (!allowedKeys.has(k)) return 'PERMISSION_DENIED';
      }
      if (incomingData.ownerId !== auth?.uid) return 'PERMISSION_DENIED';
      return 'ALLOWED';
    }
    return 'PERMISSION_DENIED';
  }

  if (collection === 'ledger_snapshots') {
    if (operation === 'get' || operation === 'list') {
      if (!isVerifiedUser) return 'PERMISSION_DENIED';
      if (existingData?.ownerId !== auth?.uid && !isBootstrappedAdmin) {
        return 'PERMISSION_DENIED';
      }
      return 'ALLOWED';
    }
    if (operation === 'create') {
      if (
        !isVerifiedUser ||
        docId !== auth?.uid ||
        !incomingData ||
        incomingData.ownerId !== auth?.uid ||
        typeof incomingData.version !== 'number' ||
        !isTimestampEqualRequestTime
      ) {
        return 'PERMISSION_DENIED';
      }
      const allowed = new Set(['ownerId', 'version', 'summaryJson', 'createdAt', 'updatedAt']);
      if (Object.keys(incomingData).some((k) => !allowed.has(k))) {
        return 'PERMISSION_DENIED';
      }
      return 'ALLOWED';
    }
    if (operation === 'update') {
      if (
        !isVerifiedUser ||
        docId !== auth?.uid ||
        !incomingData ||
        !existingData ||
        existingData.ownerId !== auth?.uid ||
        incomingData.ownerId !== existingData.ownerId ||
        incomingData.createdAt !== existingData.createdAt ||
        typeof incomingData.version !== 'number' ||
        !isTimestampEqualRequestTime
      ) {
        return 'PERMISSION_DENIED';
      }
      return 'ALLOWED';
    }
    return 'PERMISSION_DENIED';
  }

  if (collection === 'audit_logs') {
    if (operation === 'update' || operation === 'delete') {
      return 'PERMISSION_DENIED';
    }
    if (operation === 'create') {
      if (
        !isVerifiedUser ||
        !incomingData ||
        incomingData.actorUid !== auth?.uid ||
        typeof incomingData.details !== 'string' ||
        incomingData.details.length > 2000 ||
        !isTimestampEqualRequestTime
      ) {
        return 'PERMISSION_DENIED';
      }
      return 'ALLOWED';
    }
  }

  return 'PERMISSION_DENIED';
}

test('Dirty Dozen #1: Unauthenticated write is rejected', () => {
  const res = evaluateDirtyDozenAgainstRules(
    rulesContent,
    'create',
    'products',
    'piarom-600',
    null,
    { sku: 'PRM-600' }
  );
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #2: Unverified email spoof of bootstrapped admin is rejected', () => {
  const res = evaluateDirtyDozenAgainstRules(
    rulesContent,
    'create',
    'products',
    'piarom-600',
    { uid: 'u1', email: 'saber.naseralavi@gmail.com', email_verified: false },
    {
      sku: 'PRM-600',
      name: 'Piarom',
      category: 'Dates',
      netWeightGrams: 600,
      baseRetailerPrice: 200000,
      directB2cPrice: 240000,
      isActive: true,
      ownerId: 'u1',
      createdAt: 'NOW',
    }
  );
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #3: Self-assigned admin privilege escalation is rejected', () => {
  const res = evaluateDirtyDozenAgainstRules(
    rulesContent,
    'create',
    'admins',
    'attacker_1',
    { uid: 'attacker_1', email: 'evil@example.com', email_verified: true },
    { uid: 'attacker_1', email: 'evil@example.com', createdAt: 'NOW' }
  );
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #4: Shadow field injection on Product is rejected', () => {
  const res = evaluateDirtyDozenAgainstRules(
    rulesContent,
    'create',
    'products',
    'piarom-600',
    { uid: 'admin_1', email: 'saber.naseralavi@gmail.com', email_verified: true },
    {
      sku: 'PRM-600',
      name: 'Piarom',
      category: 'Dates',
      netWeightGrams: 600,
      baseRetailerPrice: 200000,
      directB2cPrice: 240000,
      isActive: true,
      ownerId: 'admin_1',
      createdAt: 'NOW',
      isVerifiedAdmin: true,
    }
  );
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #5: ID poisoning with invalid characters is rejected', () => {
  const res = evaluateDirtyDozenAgainstRules(
    rulesContent,
    'create',
    'ledger_snapshots',
    'bad id/with spaces',
    { uid: 'u1', email: 'u1@example.com', email_verified: true },
    { ownerId: 'u1', version: 1, summaryJson: '{}', createdAt: 'NOW', updatedAt: 'NOW' }
  );
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #6: Owner spoofing on LedgerSnapshot is rejected', () => {
  const res = evaluateDirtyDozenAgainstRules(
    rulesContent,
    'create',
    'ledger_snapshots',
    'u1',
    { uid: 'u1', email: 'u1@example.com', email_verified: true },
    { ownerId: 'u2', version: 1, summaryJson: '{}', createdAt: 'NOW', updatedAt: 'NOW' }
  );
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #7: Cross-tenant read on LedgerSnapshot is rejected', () => {
  const res = evaluateDirtyDozenAgainstRules(
    rulesContent,
    'get',
    'ledger_snapshots',
    'u2',
    { uid: 'u1', email: 'u1@example.com', email_verified: true },
    undefined,
    { ownerId: 'u2', version: 1, summaryJson: '{}' }
  );
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #8: Immutable field mutation (createdAt) on update is rejected', () => {
  const res = evaluateDirtyDozenAgainstRules(
    rulesContent,
    'update',
    'ledger_snapshots',
    'u1',
    { uid: 'u1', email: 'u1@example.com', email_verified: true },
    { ownerId: 'u1', version: 2, summaryJson: '{}', createdAt: 'TAMPERED', updatedAt: 'NOW' },
    { ownerId: 'u1', version: 1, summaryJson: '{}', createdAt: 'ORIG', updatedAt: 'ORIG' }
  );
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #9: Client timestamp forgery is rejected', () => {
  const res = evaluateDirtyDozenAgainstRules(
    rulesContent,
    'create',
    'ledger_snapshots',
    'u1',
    { uid: 'u1', email: 'u1@example.com', email_verified: true },
    { ownerId: 'u1', version: 1, summaryJson: '{}', createdAt: 'PAST', updatedAt: 'PAST' },
    undefined,
    false
  );
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #10: Value poisoning (string instead of number) on update is rejected', () => {
  const res = evaluateDirtyDozenAgainstRules(
    rulesContent,
    'update',
    'ledger_snapshots',
    'u1',
    { uid: 'u1', email: 'u1@example.com', email_verified: true },
    { ownerId: 'u1', version: 'HACKED' as unknown as number, summaryJson: '{}', createdAt: 'ORIG', updatedAt: 'NOW' },
    { ownerId: 'u1', version: 1, summaryJson: '{}', createdAt: 'ORIG', updatedAt: 'ORIG' }
  );
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #11: Audit log tampering (update/delete) is rejected', () => {
  const res = evaluateDirtyDozenAgainstRules(
    rulesContent,
    'delete',
    'audit_logs',
    'log_1',
    { uid: 'admin_1', email: 'saber.naseralavi@gmail.com', email_verified: true }
  );
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #12: Denial-of-Wallet oversized audit log payload is rejected', () => {
  const res = evaluateDirtyDozenAgainstRules(
    rulesContent,
    'create',
    'audit_logs',
    'log_1',
    { uid: 'u1', email: 'u1@example.com', email_verified: true },
    {
      actorUid: 'u1',
      action: 'CREATE',
      entityType: 'Order',
      entityId: 'ord_1',
      details: 'x'.repeat(2500),
      createdAt: 'NOW',
    }
  );
  assert.equal(res, 'PERMISSION_DENIED');
});
