/**
 * IndexedDB utility for persisting project indexing states
 * Enables background processing to survive page navigation
 */

const DB_NAME = 'donna_indexing';
const DB_VERSION = 1;
const STORE_NAME = 'indexing_states';

interface ProjectIndexingState {
    projectId: string;
    projectName: string;
    status: 'pending' | 'indexing' | 'completed' | 'error';
    percent: number;
    currentStep: string;
    startedAt: number;
    completedAt?: number;
    error?: string;
    stats?: {
        thread_count: number;
        message_count: number;
        pdf_count: number;
        vector_count?: number;
    };
}

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'projectId' });
            }
        };
    });
}

export async function saveIndexingState(state: ProjectIndexingState): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(state);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();

        transaction.oncomplete = () => db.close();
    });
}

export async function getIndexingState(projectId: string): Promise<ProjectIndexingState | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(projectId);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || null);

        transaction.oncomplete = () => db.close();
    });
}

export async function getAllIndexingStates(): Promise<Record<string, ProjectIndexingState>> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const states: Record<string, ProjectIndexingState> = {};
            for (const state of request.result) {
                states[state.projectId] = state;
            }
            resolve(states);
        };

        transaction.oncomplete = () => db.close();
    });
}

export async function clearIndexingState(projectId: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(projectId);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();

        transaction.oncomplete = () => db.close();
    });
}

export async function clearAllIndexingStates(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();

        transaction.oncomplete = () => db.close();
    });
}
