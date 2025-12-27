import { openDB } from 'idb';

const DB_NAME = 'fire-sight-db';
const DB_VERSION = 2;
const FILE_STORE = 'files';
const ANSWER_STORE = 'answers';
const CUSTOM_PROBLEM_STORE = 'custom_problems';

// 1. 데이터베이스 초기화 (Initialize DB)
export const initDB = async () => {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            // Files Store (PDFs)
            if (!db.objectStoreNames.contains(FILE_STORE)) {
                db.createObjectStore(FILE_STORE, { keyPath: 'id' });
            }
            // Answers Store (Workbook)
            if (!db.objectStoreNames.contains(ANSWER_STORE)) {
                db.createObjectStore(ANSWER_STORE, { keyPath: 'problemId' });
            }
            // Custom Problems Store (Smart Upload)
            if (!db.objectStoreNames.contains(CUSTOM_PROBLEM_STORE)) {
                db.createObjectStore(CUSTOM_PROBLEM_STORE, { keyPath: 'id' });
            }
        },
    });
};

// =====================================================================
// FILE OPERATIONS (Reference.jsx)
// =====================================================================

export const saveFile = async (id, meta, blob) => {
    const db = await initDB();
    const fileData = {
        id,
        meta,
        blob, // Storing Blob directly
        savedAt: new Date().toISOString()
    };
    return db.put(FILE_STORE, fileData);
};

export const getFile = async (id) => {
    const db = await initDB();
    return db.get(FILE_STORE, id);
};

export const deleteFile = async (id) => {
    const db = await initDB();
    return db.delete(FILE_STORE, id);
};

export const getAllFileIds = async () => {
    const db = await initDB();
    return db.getAllKeys(FILE_STORE);
};

export const getAllSavedFiles = async () => {
    const db = await initDB();
    return db.getAll(FILE_STORE);
};

// =====================================================================
// ANSWER OPERATIONS (Workbook.jsx / ProblemSolver.jsx)
// =====================================================================

export const saveAnswer = async (problemId, answer) => {
    const db = await initDB();
    return db.put(ANSWER_STORE, {
        problemId,
        answer,
        updatedAt: new Date().toISOString()
    });
};

export const getAnswer = async (problemId) => {
    const db = await initDB();
    const result = await db.get(ANSWER_STORE, problemId);
    return result ? result.answer : '';
};

// =====================================================================
// CUSTOM PROBLEM OPERATIONS (SmartUpload.jsx)
// =====================================================================

export const saveCustomProblem = async (problem) => {
    const db = await initDB();
    return db.put(CUSTOM_PROBLEM_STORE, {
        ...problem,
        savedAt: new Date().toISOString()
    });
};

export const getAllCustomProblems = async () => {
    const db = await initDB();
    return db.getAll(CUSTOM_PROBLEM_STORE);
};
