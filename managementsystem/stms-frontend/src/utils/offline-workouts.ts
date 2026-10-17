const DB_NAME = 'stms-offline-workouts';
const DB_VERSION = 1;
const ASSIGNMENTS = 'assignments';
const COMPLETIONS = 'completionQueue';

type PendingCompletion = { id: string; assignmentId: string; payload: Record<string, unknown>; createdAt: number };

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('Offline storage is not available in this browser'));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ASSIGNMENTS)) db.createObjectStore(ASSIGNMENTS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(COMPLETIONS)) db.createObjectStore(COMPLETIONS, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open offline storage'));
  });
}

async function storeRequest<T>(storeName: string, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode); const request = action(transaction.objectStore(storeName));
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error || new Error('Offline storage request failed'));
    transaction.oncomplete = () => db.close(); transaction.onerror = () => { db.close(); reject(transaction.error); };
  });
}

export const offlineWorkouts = {
  cache: (assignment: any) => storeRequest(ASSIGNMENTS, 'readwrite', store => store.put(assignment)),
  get: (id: string) => storeRequest<any>(ASSIGNMENTS, 'readonly', store => store.get(id)),
  enqueue: (assignmentId: string, payload: Record<string, unknown>) => storeRequest(COMPLETIONS, 'readwrite', store => store.put({ id: assignmentId, assignmentId, payload, createdAt: Date.now() } satisfies PendingCompletion)),
  pending: () => storeRequest<PendingCompletion[]>(COMPLETIONS, 'readonly', store => store.getAll()),
  remove: (id: string) => storeRequest(COMPLETIONS, 'readwrite', store => store.delete(id)),
};
