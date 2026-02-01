import { openDB } from 'idb';
import { doc, getDoc, updateDoc, increment, serverTimestamp, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";

const DB_NAME = 'fire-sight-db';
const DB_VERSION = 2;
const FILE_STORE = 'files';
const ANSWER_STORE = 'answers';
const CUSTOM_PROBLEM_STORE = 'custom_problems';

// 1. 데이터베이스 초기화 (IndexedDB - 오프라인 및 로컬 저장용)
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
    const dbLocal = await initDB();
    const fileData = { id, meta, blob, savedAt: new Date().toISOString() };
    return dbLocal.put(FILE_STORE, fileData);
};

export const getFile = async (id) => {
    const dbLocal = await initDB();
    return dbLocal.get(FILE_STORE, id);
};

export const deleteFile = async (id) => {
    const dbLocal = await initDB();
    return dbLocal.delete(FILE_STORE, id);
};

export const getAllSavedFiles = async () => {
    const dbLocal = await initDB();
    return dbLocal.getAll(FILE_STORE);
};

// --- [ANSWER OPERATIONS] ---
export const saveAnswer = async (problemId, answer) => {
    const dbLocal = await initDB();
    return dbLocal.put(ANSWER_STORE, {
        problemId,
        answer,
        updatedAt: new Date().toISOString()
    });
};

export const getAnswer = async (problemId) => {
    const dbLocal = await initDB();
    const result = await dbLocal.get(ANSWER_STORE, problemId);
    return result ? result.answer : '';
};

// --- [FIRESTORE OPERATIONS - 실전 채점 및 수정 연동] ---

/**
 * 🔴 문제 단건 조회 (메모 로딩 확인용)
 * 기능: Firestore에서 최신 문제 데이터를 직접 가져옴
 */
export const getProblem = async (problemId) => {
    try {
        const docRef = doc(db, "workbook", problemId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    } catch (error) {
        console.error("❌ 데이터 로드 실패:", error);
        throw error;
    }
};

/**
 * 🔴 문제 풀이 결과 업데이트
 * 기능: 점수 기반 상태 변경 및 학습 횟수 누적
 */
export const updateProblemResult = async (problemId, score) => {
  try {
    const problemRef = doc(db, "workbook", problemId);
    const newStatus = score >= 100 ? 'MASTERED' : 'REVIEW';

    await updateDoc(problemRef, {
      studyCount: increment(1),      
      lastScore: score,              
      status: newStatus,             
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
 * 🔴 학습 메모 전용 업데이트 함수
 * 기능: 특정 문제의 메모(memo) 필드만 정밀 수정
 */
export const updateProblemMemo = async (problemId, memoText) => {
    try {
      const problemRef = doc(db, "workbook", problemId);
      await updateDoc(problemRef, {
        memo: memoText,
        updatedAt: serverTimestamp() // 메모 수정 시 전체 업데이트 시간도 갱신
      });
      console.log(`📝 메모 저장 완료: ${problemId}`);
      return true;
    } catch (error) {
      console.error("❌ 메모 저장 실패:", error);
      throw error;
    }
};

/**
 * 🔴 문제 정보 및 채점 포인트 통합 업데이트
 */
export const updateProblemInfo = async (problemId, data) => {
    try {
      const problemRef = doc(db, "workbook", problemId);
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