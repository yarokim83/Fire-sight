/* src/firebase.js - 최종 정리본 */
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 👇 아까 복사해둔 '진짜 설정값'으로 채워주세요.
const firebaseConfig = {
  apiKey: "AIzaSyCVyPVC8MIQRiuIajxzx2A5If9rldUtEoo",
  authDomain: "fire-sight-dc376.firebaseapp.com",
  projectId: "fire-sight-dc376",
  storageBucket: "fire-sight-dc376.firebasestorage.app",
  messagingSenderId: "46911392890",
  appId: "1:46911392890:web:4d3ecdc4300ec209513fc3",
  measurementId: "G-LQ9Y4THJH5"
};

// 초기화 (이 줄이 두 번 있으면 절대 안 됩니다!)
const app = initializeApp(firebaseConfig);

// DB 내보내기 (Workbook.jsx 등에서 가져다 씀)
export const db = getFirestore(app);