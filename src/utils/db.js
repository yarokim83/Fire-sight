const DB_NAME = 'fire-sight-db';
const DB_VERSION = 2;
const STORE_NAME = 'files';

export const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error("IndexedDB error:", event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
            // [NEW] Stores for Offline Workbooks
            if (!db.objectStoreNames.contains('answers')) {
                db.createObjectStore('answers', { keyPath: 'problemId' });
            }
            if (!db.objectStoreNames.contains('custom_problems')) {
                db.createObjectStore('custom_problems', { keyPath: 'id' });
            }
        };
    });
};

export const saveFile = async (fileId, meta, blob) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const fileData = {
            id: fileId,
            meta: meta,
            blob: blob,
            savedAt: new Date().toISOString()
        };

        const request = store.put(fileData);

        request.onsuccess = () => resolve(true);
        request.onerror = (e) => reject(e.target.error);
    });
};

export const getFile = async (fileId) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(fileId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e.target.error);
    });
};

export const deleteFile = async (fileId) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(fileId);

        request.onsuccess = () => resolve(true);
        request.onerror = (e) => reject(e.target.error);
    });
};

export const getAllFileIds = async () => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAllKeys();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = (e) => reject(e.target.error);
    });
};

export const getAllSavedFiles = async () => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        // getAll() returns all records in the store
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = (e) => reject(e.target.error);
    });
};

export const saveAnswer = async (problemId, answer) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['answers'], 'readwrite');
        const store = transaction.objectStore('answers');
        const request = store.put({ problemId, answer, updatedAt: new Date().toISOString() });
        request.onsuccess = () => resolve(true);
        request.onerror = (e) => reject(e.target.error);
    });
};

export const getAnswer = async (problemId) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['answers'], 'readonly');
        const store = transaction.objectStore('answers');
        const request = store.get(problemId);
        request.onsuccess = () => resolve(request.result ? request.result.answer : '');
        request.onerror = (e) => reject(e.target.error);
    });
};

export const saveCustomProblem = async (problem) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['custom_problems'], 'readwrite');
        const store = transaction.objectStore('custom_problems');
        const request = store.put({ ...problem, savedAt: new Date().toISOString() });
        request.onsuccess = () => resolve(true);
        request.onerror = (e) => reject(e.target.error);
    });
};

export const getAllCustomProblems = async () => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['custom_problems'], 'readonly');
        const store = transaction.objectStore('custom_problems');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = (e) => reject(e.target.error);
    });
};
