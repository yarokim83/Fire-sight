import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot } from 'firebase/firestore'; 

export const useFirestoreSync = () => {
    const [problems, setProblems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "workbook"));
        console.log("📡 워크북 전역 데이터 구독 시작 (App Level)...");
    
        const unsubscribe = onSnapshot(q, 
          (snapshot) => {
            try {
                const problemList = snapshot.docs.map(doc => {
                  const data = doc.data();
                  
                  let rawQuestion = data.content || data.description || data.problemText || "내용 없음";
                  let rawAnswer = data.answer || data.modelAnswer || "해설 없음";
                  let rawTitle = data.title || "제목 없음";
                  
                  if (data.problemType === 'drawing' || data.problemType === 'visual') {
                      if (!rawTitle.startsWith('[도면]')) rawTitle = `[도면] ${rawTitle}`; 
                  }
  
                  let gradingKeywords = [];
                  if (Array.isArray(data.keywords)) gradingKeywords = data.keywords;
                  else if (typeof data.keywords === 'string' && data.keywords.trim() !== '') gradingKeywords = data.keywords.split(',').map(k => k.trim());
                  else if (Array.isArray(data.tags)) gradingKeywords = data.tags;
                  else gradingKeywords = ["키워드 없음"];
          
                  let createdDate = new Date(0);
                  if (data.createdAt) {
                      if (typeof data.createdAt.toDate === 'function') createdDate = data.createdAt.toDate();
                      else if (typeof data.createdAt === 'string' || typeof data.createdAt === 'number') createdDate = new Date(data.createdAt);
                  }
  
                  const extractNumbers = () => {
                      const fromRoot = Array.isArray(data.numbers) ? data.numbers : [];
                      const fromGrading = data.gradingPoints?.mandatory_numbers || [];
                      return Array.from(new Set([...fromRoot, ...fromGrading]))
                          .map(n => String(n).trim())
                          .filter(n => n !== "" && n !== "null" && n !== "undefined");
                  };
  
                  return {
                    id: doc.id,
                    imageUrl: data.imageUrl || (data.images && data.images.length > 0 ? data.images[0] : null),
                    images: data.images || [],
                    answerImages: data.answerImages || [], 
                    answerImageUrl: data.answerImageUrl || (data.answerImages && data.answerImages.length > 0 ? data.answerImages[0] : null),
                    title: String(rawTitle),
                    question: String(rawQuestion),
                    modelAnswer: String(rawAnswer),
                    memo: data.memo || '', 
                    keywords: gradingKeywords,
                    numbers: extractNumbers(),
                    gradingPoints: data.gradingPoints || { 
                      mandatory_terms: gradingKeywords, 
                      mandatory_numbers: extractNumbers() 
                    },
                    tags: Array.isArray(data.tags) ? data.tags : [],
                    subject: data.category || data.subject || data.type || '기타',
                    problemType: data.problemType || 'descriptive',
                    studyCount: Number(data.studyCount || 0),
                    wrongCount: Number(data.wrongCount || 0),
                    lastScore: Number(data.lastScore || 0),
                    recentScore: Number(data.recentScore || data.lastScore || 0),
                    createdAt: createdDate,
                  };
                });
  
                problemList.sort((a, b) => b.createdAt - a.createdAt);
                setProblems(problemList);
            
            } catch (error) {
                console.error("🚨 전역 데이터 매핑 오류:", error);
                setProblems([]); 
            } finally {
                setLoading(false);
            }
          },
          (error) => {
            console.error("🚨 Firestore 전역 데이터 구독 실패:", error);
            setProblems([]);
            setLoading(false);
          }
        );
    
        return () => unsubscribe();
      }, []);

      return { problems, loading };
};
