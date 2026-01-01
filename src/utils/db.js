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
/* src/utils/db.js 에 추가 */
import { doc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase"; // firebase 설정 파일 경로 확인

// 문제 풀이 결과 업데이트 함수
export const updateProblemResult = async (problemId, score) => {
  try {
    const problemRef = doc(db, "workbook", problemId);
    
    // 100점이면 'MASTERED', 아니면 'REVIEW'로 상태 변경
    // (이미 MASTERED였던 것도 점수가 떨어지면 다시 REVIEW가 될 수 있음)
    const newStatus = score >= 100 ? 'MASTERED' : 'REVIEW';

    await updateDoc(problemRef, {
      studyCount: increment(1),      // 학습 횟수 +1
      lastScore: score,              // 최근 점수 갱신
      status: newStatus,             // 상태 갱신
      wrongCount: score < 100 ? increment(1) : increment(0), // 100점 아니면 오답 횟수 증가
      lastStudiedAt: serverTimestamp() // 학습 시간 기록
    });
    
    console.log(`✅ 결과 저장 완료: ${score}점, 상태: ${newStatus}`);
  } catch (error) {
    console.error("❌ 결과 저장 실패:", error);
    throw error;
  }
};
/* src/utils/db.js 에 추가 */

// 문제의 메모(암기팁) 및 내용 수정 함수
export const updateProblemInfo = async (problemId, data) => {
    try {
      const problemRef = doc(db, "workbook", problemId);
      
      // data 객체에는 { memo: "...", question: "...", keywords: [...] } 등이 포함될 수 있음
      await updateDoc(problemRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
      console.log(`✅ 문제 정보 업데이트 완료: ${problemId}`);
    } catch (error) {
      console.error("❌ 문제 정보 업데이트 실패:", error);
      throw error;
    }
  };