import { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase'; // 경로 주의 (../../)
import { collection, query, onSnapshot } from 'firebase/firestore';

export const useWorkbookData = () => {
    const [problems, setProblems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('ALL'); 
    const [sortBy, setSortBy] = useState('latest');    
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const q = query(collection(db, "workbook"));
        console.log("📡 단권화 워크북 구독 시작...");
    
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const problemList = snapshot.docs.map(doc => {
            const data = doc.data();
            
            // 1. 기본 텍스트 가져오기
            let rawQuestion = data.content || data.description || "내용 없음";
            let rawAnswer = data.answer || data.modelAnswer || "해설 없음";
            
            // [CRITICAL FIX] 도면/계산형 문제의 데이터 매핑 수정
            // 도면형의 경우 'content'에 저장된 '도면 해석'이 문제 지문으로 나오는 것을 방지
            if (data.problemType === 'drawing' || data.problemType === 'visual') {
                // 문제 지문 -> 제목(Title)을 사용 (예: "다음 기호를 설명하시오")
                const originalContent = rawQuestion;
                rawQuestion = data.title || "도면을 참고하여 물음에 답하시오.";
                
                // 도면 해석(원래 content)을 정답/해설 쪽에 병합하여 보여줌
                if (originalContent && originalContent !== "내용 없음") {
                    rawAnswer = `[도면 해석/설명]\n${originalContent}\n\n[정답 및 핵심]\n${rawAnswer}`;
                }
            }

            // 2. 키워드 추출 로직
            let gradingKeywords = [];
            if (data.keywords && Array.isArray(data.keywords) && data.keywords.length > 0) {
                gradingKeywords = data.keywords;
            } else if (rawAnswer.length > 0 && rawAnswer !== "해설 없음") {
                gradingKeywords = rawAnswer.split(/[\s,().]+/).filter(word => word && word.length >= 2).slice(0, 15);
            } else {
                gradingKeywords = Array.isArray(data.tags) && data.tags.length > 0 ? data.tags : ["키워드 없음"];
            }
    
            return {
              id: doc.id,
              memo: data.memo || "", 
              imageUrl: data.imageUrl || (data.images && data.images.length > 0 ? data.images[0] : null),
              images: data.images || [],
              answerImageUrl: data.answerImageUrl || null,
              
              title: String(data.title || "제목 없음"),
              
              // [수정된 매핑 적용]
              question: String(rawQuestion),
              modelAnswer: String(rawAnswer),

              keywords: gradingKeywords,
              tags: Array.isArray(data.tags) ? data.tags : [],
              subject: data.category || data.subject || '기타', 
              problemType: data.problemType || 'descriptive',
              studyCount: Number(data.studyCount || 0),
              wrongCount: Number(data.wrongCount || 0),
              lastScore: Number(data.lastScore || 0),
              createdAt: data.createdAt?.toDate() || new Date(0),
            };
          });
          setProblems(problemList);
          setLoading(false);
        }, (err) => {
          console.error("🔥 데이터 로드 실패:", err);
          setLoading(false);
        });
    
        return () => unsubscribe();
      }, []);

      const processedProblems = useMemo(() => {
        let filtered = problems;
    
        if (activeTab === 'NEW') filtered = problems.filter(p => p.studyCount === 0);
        else if (activeTab === 'REVIEW') filtered = problems.filter(p => p.studyCount > 0 && p.lastScore < 100);
        else if (activeTab === 'MASTERED') filtered = problems.filter(p => p.lastScore === 100);
    
        if (searchTerm) {
          const term = searchTerm.toLowerCase().replace('#', '');
          filtered = filtered.filter(p => 
            p.tags.some(tag => tag.toLowerCase().includes(term)) ||
            p.title.toLowerCase().includes(term)
          );
        }
        
        const sorted = [...filtered];
        if (sortBy === 'wrong') sorted.sort((a, b) => b.wrongCount - a.wrongCount);
        else if (sortBy === 'latest') sorted.sort((a, b) => b.createdAt - a.createdAt);
        else if (sortBy === 'random') sorted.sort(() => Math.random() - 0.5);
        
        const grouped = sorted.reduce((acc, problem) => {
          const subject = problem.subject || '기타';
          if (!acc[subject]) acc[subject] = [];
          acc[subject].push(problem);
          return acc;
        }, {});
    
        return { grouped, sortedList: sorted };
    
      }, [problems, activeTab, sortBy, searchTerm]);

      return {
        problems, 
        loading,
        processedProblems, 
        filterState: { activeTab, setActiveTab, sortBy, setSortBy, searchTerm, setSearchTerm } 
      };
};