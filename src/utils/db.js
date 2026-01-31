import { openDB } from 'idb';
import { doc, updateDoc, increment, serverTimestamp, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";

const DB_NAME = 'fire-sight-db';
const DB_VERSION = 2;
const FILE_STORE = 'files';
const ANSWER_STORE = 'answers';
const CUSTOM_PROBLEM_STORE = 'custom_problems';

// 1. 데이터베이스 초기화 (IndexedDB - 오프라인 지원용)
export const initDB = async () => {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(FILE_STORE)) {
                db.createObjectStore(FILE_STORE, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(ANSWER_STORE)) {
                db.createObjectStore(ANSWER_STORE, { keyPath: 'problemId' });
            }
            if (!db.objectStoreNames.contains(CUSTOM_PROBLEM_STORE)) {
                db.createObjectStore(CUSTOM_PROBLEM_STORE, { keyPath: 'id' });
            }
        },
    });
};

// --- [FILE OPERATIONS] ---
export const saveFile = async (id, meta, blob) => {
    const db = await initDB();
    const fileData = { id, meta, blob, savedAt: new Date().toISOString() };
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

export const getAllSavedFiles = async () => {
    const db = await initDB();
    return db.getAll(FILE_STORE);
};

// --- [ANSWER OPERATIONS] ---
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

// --- [FIRESTORE OPERATIONS - 실전 채점 및 수정 연동] ---

/**
 * 🔴 [개선] 문제 풀이 결과 업데이트
 * 기능: 점수 기반 상태 변경 및 학습 횟수 누적
 */
export const updateProblemResult = async (problemId, score) => {
  try {
    const problemRef = doc(db, "workbook", problemId);
    
    // 소방 시설 암기 기준: 100점(완벽 암기)이면 MASTERED, 아니면 REVIEW
    const newStatus = score >= 100 ? 'MASTERED' : 'REVIEW';

    await updateDoc(problemRef, {
      studyCount: increment(1),      
      lastScore: score,              
      status: newStatus,             
      // 100점 미만일 때만 오답 횟수 증가 (increment(0) 불필요 최적화)
      ...(score < 100 && { wrongCount: increment(1) }), 
      lastStudiedAt: serverTimestamp() 
    });
    
    console.log(`✅ 점수 저장: ${score}점 (${newStatus})`);
  } catch (error) {
    console.error("❌ 결과 저장 실패:", error);
    throw error;
  }
};

/**
 * 🔴 [핵심 수정] 문제 정보 및 채점 포인트 업데이트
 * 기능: Smart Upload에서 수정한 gradingPoints와 tags를 Firestore에 반영
 */
export const updateProblemInfo = async (problemId, data) => {
    try {
      const problemRef = doc(db, "workbook", problemId);
      
      // ⚠️ 주의: data 객체 내부에 gradingPoints가 포함되어 있어야 
      // Result 페이지에서 수정한 내용이 DB에 최종 반영됩니다.
      await updateDoc(problemRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
      console.log(`✅ DB 업데이트 완료: ${problemId}`);
    } catch (error) {
      console.error("❌ DB 업데이트 실패:", error);
      throw error;
    }
  };

export const deleteProblem = async (problemId) => {
    try {
        const problemRef = doc(db, "workbook", problemId);
        await deleteDoc(problemRef);
        console.log(`🗑️ 문제 삭제 완료`);
    } catch (error) {
        console.error("❌ 삭제 실패:", error);
        throw error;
    }
};