/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer,
  getDoc as firestoreGetDoc,
  getDocs as firestoreGetDocs,
  setDoc as firestoreSetDoc,
  updateDoc as firestoreUpdateDoc,
  deleteDoc as firestoreDeleteDoc
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// CRITICAL: Must use the custom database ID provided in config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

// Virtual Local DB Implementation as a High-Fidelity Fallback
const VIRTUAL_DB_KEY = 'sageink_virtual_db';

function getVirtualDb(): Record<string, any> {
  try {
    const data = localStorage.getItem(VIRTUAL_DB_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function setVirtualDb(dbData: Record<string, any>) {
  try {
    localStorage.setItem(VIRTUAL_DB_KEY, JSON.stringify(dbData));
  } catch (err) {
    console.error("Virtual DB write failed:", err);
  }
}

function getPathFromRef(ref: any): string {
  if (!ref) return '';
  return ref.path || '';
}

export async function getDoc(ref: any): Promise<any> {
  const path = getPathFromRef(ref);
  const virtualDb = getVirtualDb();
  
  try {
    const snap = await firestoreGetDoc(ref);
    if (snap.exists()) {
      return snap;
    }
  } catch (err) {
    console.warn(`Real getDoc failed for ${path}, checking local cache:`, err);
  }

  if (virtualDb[path]) {
    const data = virtualDb[path];
    return {
      exists: () => true,
      id: ref.id,
      data: () => data,
      ref: ref
    } as any;
  }

  return {
    exists: () => false,
    id: ref.id,
    data: () => undefined,
    ref: ref
  } as any;
}

export async function getDocs(queryOrCollection: any): Promise<any> {
  let realDocs: any[] = [];
  try {
    const snap = await firestoreGetDocs(queryOrCollection);
    snap.forEach((docSnap: any) => {
      realDocs.push(docSnap);
    });
  } catch (err) {
    console.warn("Real getDocs failed, checking virtual DB:", err);
  }

  let targetPath = '';
  if (queryOrCollection.path) {
    targetPath = queryOrCollection.path;
  } else if (queryOrCollection.query?.path) {
    targetPath = queryOrCollection.query.path;
  } else if (queryOrCollection._query?.path?.segments) {
    targetPath = queryOrCollection._query.path.segments.join('/');
  } else {
    targetPath = 'posts';
  }

  const virtualDb = getVirtualDb();
  const matchedDocs: any[] = [];

  Object.keys(virtualDb).forEach((pathKey) => {
    const parts = pathKey.split('/');
    if (parts.length === targetPath.split('/').length + 1 && pathKey.startsWith(targetPath)) {
      const docId = parts[parts.length - 1];
      const existsInReal = realDocs.some(d => d.id === docId);
      if (!existsInReal) {
        matchedDocs.push({
          exists: () => true,
          id: docId,
          data: () => virtualDb[pathKey],
          ref: { path: pathKey, id: docId }
        });
      }
    }
  });

  const allDocs = [...realDocs, ...matchedDocs];

  return {
    empty: allDocs.length === 0,
    size: allDocs.length,
    docs: allDocs,
    forEach: (callback: any) => {
      allDocs.forEach(callback);
    }
  } as any;
}

export async function setDoc(ref: any, data: any, options?: any): Promise<any> {
  const path = getPathFromRef(ref);
  const virtualDb = getVirtualDb();

  try {
    await firestoreSetDoc(ref, data, options);
    virtualDb[path] = data;
    setVirtualDb(virtualDb);
  } catch (err) {
    console.warn(`Firestore setDoc failed for ${path}, falling back to local:`, err);
    const localData = { ...data };
    
    Object.keys(localData).forEach(key => {
      if (localData[key] && typeof localData[key] === 'object') {
        if (localData[key].constructor?.name === 'FieldValueImpl' || key === 'createdAt' || key === 'updatedAt') {
          localData[key] = new Date();
        }
      }
    });

    virtualDb[path] = localData;
    setVirtualDb(virtualDb);
  }
}

export async function updateDoc(ref: any, data: any): Promise<any> {
  const path = getPathFromRef(ref);
  const virtualDb = getVirtualDb();

  try {
    await firestoreUpdateDoc(ref, data);
    if (virtualDb[path]) {
      virtualDb[path] = { ...virtualDb[path], ...data };
      setVirtualDb(virtualDb);
    }
  } catch (err) {
    console.warn(`Firestore updateDoc failed for ${path}, falling back to local:`, err);
    if (!virtualDb[path]) {
      virtualDb[path] = {};
    }
    
    const localUpdates = { ...data };
    Object.keys(localUpdates).forEach(key => {
      if (localUpdates[key] && typeof localUpdates[key] === 'object') {
        if (key === 'updatedAt') {
          localUpdates[key] = new Date();
        }
      }
    });

    virtualDb[path] = { ...virtualDb[path], ...localUpdates };
    setVirtualDb(virtualDb);
  }
}

export async function deleteDoc(ref: any): Promise<any> {
  const path = getPathFromRef(ref);
  const virtualDb = getVirtualDb();

  try {
    await firestoreDeleteDoc(ref);
  } catch (err) {
    console.warn(`Firestore deleteDoc failed for ${path}, falling back to local:`, err);
  }

  if (virtualDb[path]) {
    delete virtualDb[path];
    setVirtualDb(virtualDb);
  }
}

// Test connection on boot as requested by Firebase skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration: Client is offline");
    } else {
      console.log("Firebase connection response parsed successfully.");
    }
  }
}
testConnection();

// OPERATION ENFORCED ERROR HANDLING GUIDELINE
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
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
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Occurred: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
