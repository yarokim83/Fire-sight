import { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { collection, query, onSnapshot } from 'firebase/firestore'; // orderBy 제거

export const useWorkbookData = () => {
    const [problems, setProblems] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // 필터 상태 관리
    const [activeTab, setActiveTab] = useState('ALL'); 
    const [sortBy, setSortBy] = useState('latest');    
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);

    // 1. 데이터 가져오기 (쿼리 조건 단순화)
    useEffect(() => {
        // [수정] orderBy("createdAt", "desc")를 제거하여 모든 문서를 일단 가져오게 함
        // 필드가 없는 문서도 누락되지 않도록 하기 위함입니다.
        const q = query(collection(db, "workbook"));
        console.log("📡 단권화 워크북 전체 데이터 구독 시작...");
    
        const unsubscribe = onSnapshot(q, (snapshot) => {
          try {
              const problemList = snapshot.docs.map(doc => {
                const data = doc.data();
                
                // 1. 유연한 필드 매핑 (저장 형식이 달라도 최대한 내용을 보여줌)
                let rawQuestion = data.content || data.description || data.problemText || "내용 없음";
                let rawAnswer = data.answer || data.modelAnswer || "해설 없음";
                let rawTitle = data.title || "제목 없음";
                
                // 도면/계산형 매핑
                if (data.problemType === 'drawing' || data.problemType === 'visual') {
                    const originalContent = rawQuestion;
                    rawQuestion = rawTitle; // 도면 문제는 제목을 질문으로 사용
                    
                    if (originalContent && originalContent !== "내용 없음") {
                        rawAnswer = `[도면 해석/설명]\n${originalContent}\n\n[정답 및 핵심]\n${rawAnswer}`;
                    }
                }

                // 2. 키워드 추출
                let gradingKeywords = [];
                if (data.keywords && Array.isArray(data.keywords) && data.keywords.length > 0) {
                    gradingKeywords = data.keywords;
                } else if (data.keywords && typeof data.keywords === 'string') {
                    // 키워드가 문자열로 저장된 경우 처리
                    gradingKeywords = data.keywords.split(',').map(k => k.trim());
                } else if (rawAnswer.length > 0 && rawAnswer !== "해설 없음") {
                    gradingKeywords = rawAnswer.split(/[\s,().]+/).filter(word => word && word.length >= 2).slice(0, 15);
                } else {
                    gradingKeywords = Array.isArray(data.tags) && data.tags.length > 0 ? data.tags : ["키워드 없음"];
                }
        
                // 3. [안전한 날짜 변환] 날짜가 없으면 1970년 1월 1일로 처리 (에러 방지)
                let createdDate = new Date(0);
                if (data.createdAt) {
                    if (typeof data.createdAt.toDate === 'function') {
                        createdDate = data.createdAt.toDate(); // Firestore Timestamp
                    } else if (typeof data.createdAt === 'string' || typeof data.createdAt === 'number') {
                        createdDate = new Date(data.createdAt); // 문자열/숫자
                    }
                }

                return {
                  id: doc.id,
                  // 이미지 필드 통합 처리
                  imageUrl: data.imageUrl || (data.images && data.images.length > 0 ? data.images[0] : null),
                  images: data.images || [],
                  answerImageUrl: data.answerImageUrl || null,
                  
                  title: String(rawTitle),
                  question: String(rawQuestion),
                  modelAnswer: String(rawAnswer),

                  keywords: gradingKeywords,
                  tags: Array.isArray(data.tags) ? data.tags : [],
                  subject: data.category || data.subject || '기타', // category 필드 우선
                  problemType: data.problemType || 'descriptive',
                  studyCount: Number(data.studyCount || 0),
                  wrongCount: Number(data.wrongCount || 0),
                  lastScore: Number(data.lastScore || 0),
                  createdAt: createdDate,
                };
              });

              // [NEW] 클라이언트 사이드 기본 정렬 (최신순)
              // 가져온 뒤에 정렬하므로 날짜 없는 데이터도 맨 아래에 뜸
              problemList.sort((a, b) => b.createdAt - a.createdAt);

              setProblems(problemList);
          
          } catch (error) {
              console.error("🚨 데이터 매핑 중 치명적 오류:", error);
              setProblems([]); 
          } finally {
              setLoading(false);
          }

        }, (err) => {
          console.error("🔥 Firestore 연결 실패 (권한/네트워크):", err);
          setLoading(false);
        });
    
        return () => unsubscribe();
      }, []);

      // 2. 태그 추출 로직 (그대로 유지)
      const allTags = useMemo(() => {
        const tags = new Set();
        problems.forEach(p => {
            if (Array.isArray(p.tags)) {
                p.tags.forEach(t => tags.add(t));
            }
        });
        return Array.from(tags).sort();
      }, [problems]);

      // 3. 필터링 로직 (그대로 유지)
      const processedProblems = useMemo(() => {
        let filtered = problems;
    
        if (activeTab === 'NEW') filtered = problems.filter(p => p.studyCount === 0);
        else if (activeTab === 'REVIEW') filtered = problems.filter(p => p.studyCount > 0 && p.lastScore < 100);
        else if (activeTab === 'MASTERED') filtered = problems.filter(p => p.lastScore === 100);
    
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          filtered = filtered.filter(p => 
            p.title.toLowerCase().includes(term) ||
            p.question.toLowerCase().includes(term) ||
            p.tags.some(tag => tag.toLowerCase().includes(term))
          );
        }

        if (selectedTags.length > 0) {
            filtered = filtered.filter(p => 
                selectedTags.every(tag => p.tags.includes(tag))
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
    
      }, [problems, activeTab, sortBy, searchTerm, selectedTags]);

      return {
        problems, 
        loading,
        processedProblems,
        allTags,
        filterState: { 
            activeTab, setActiveTab, 
            sortBy, setSortBy, 
            searchTerm, setSearchTerm,
            selectedTags, setSelectedTags 
        } 
      };
};