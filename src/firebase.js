/* src/firebase.js */
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // [필수] Storage 임포트

const firebaseConfig = {

  apiKey: "AIzaSyCVyPVC8MIQRiuIajxzx2A5If9rldUtEoo",
  authDomain: "fire-sight-dc376.firebaseapp.com",
  projectId: "fire-sight-dc376",
  storageBucket: "fire-sight-dc376.firebasestorage.app",
  messagingSenderId: "46911392890",
  appId: "1:46911392890:web:4d3ecdc4300ec209513fc3",
  measurementId: "G-LQ9Y4THJH5"
};

const app = initializeApp(firebaseConfig);

// DB와 Storage 둘 다 내보내기
export const db = getFirestore(app);
export const storage = getStorage(app); // [중요] 꼭 export 해야 합니다.