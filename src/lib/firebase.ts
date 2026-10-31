import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  updateDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { SaberCommerceState } from '../core/types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testConnection();

export async function signInWithGooglePopup(): Promise<User | null> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutFirebaseUser(): Promise<void> {
  await signOut(auth);
}

export { onAuthStateChanged };
export type { User };

export async function loadUserLedgerSnapshot(uid: string): Promise<SaberCommerceState | null> {
  if (!uid || !/^[a-zA-Z0-9_-]+$/.test(uid) || uid.length > 128) return null;
  const path = `ledger_snapshots/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'ledger_snapshots', uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    if (typeof data.summaryJson === 'string') {
      return JSON.parse(data.summaryJson) as SaberCommerceState;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveUserLedgerSnapshot(
  uid: string,
  state: SaberCommerceState
): Promise<void> {
  if (!uid || !/^[a-zA-Z0-9_-]+$/.test(uid) || uid.length > 128) return;
  if (!auth.currentUser || !auth.currentUser.emailVerified) return;

  const summaryJson = JSON.stringify(state);
  if (summaryJson.length > 900000) return;

  const path = `ledger_snapshots/${uid}`;
  const docRef = doc(db, 'ledger_snapshots', uid);
  try {
    const existing = await getDoc(docRef);
    if (!existing.exists()) {
      await setDoc(docRef, {
        ownerId: uid,
        version: Math.max(1, state.version),
        summaryJson,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(docRef, {
        version: Math.max(1, state.version),
        summaryJson,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
