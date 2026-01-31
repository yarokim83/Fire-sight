import { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { collection, query, onSnapshot } from 'firebase/firestore'; 

export const useWorkbookData = () => {
    const [problems, setProblems] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // 필터 상태 관리
    const [activeTab, setActiveTab] = useState('ALL'); 
    const [sortBy, setSortBy] = useState('latest');    
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);

    useEffect(() => {
        const q = query(collection(db, "workbook"));
        console.log("📡 워크북 데이터 파이프라인 가동 및 동기화 시작...");
    
        const unsubscribe = onSnapshot(q, (snapshot) => {
          try {
              const problemList = snapshot.docs.map(doc => {
                const data = doc.data();
                
                // 1. 다중 필드 호환성 매핑 (content/question, answer/modelAnswer)
                let rawQuestion = data.content || data.question || data.description || "내용 없음";
                let rawAnswer = data.answer || data.modelAnswer || "해설 없음";
                let rawTitle = data.title || "제목 없음";
                
                // 도면 문제 처리
                if (data.problemType === 'drawing' || data.problemType === 'visual') {
                    if (!rawTitle.startsWith('[도면]')) rawTitle = `[도면] ${rawTitle}`; 
                }

                // 🔴 2. [근본 해결] Numbers 및 GradingPoints 유실 방지 매핑
                // DB의 'numbers' 필드(AI 추출)와 'gradingPoints'(채점 엔진)를 완벽하게 수화합니다.
                const dbGradingPoints = data.gradingPoints || { mandatory_terms: [], mandatory_numbers: [] };
                
                // 루트 레벨의 numbers 배열이 있다면 이를 우선적으로 사용하여 유실을 차단합니다.
                const finalNumbers = Array.isArray(data.numbers) && data.numbers.length > 0 
                    ? data.numbers 
                    : (dbGradingPoints.mandatory_numbers || []);

                const finalTerms = Array.isArray(data.keywords) && data.keywords.length > 0
                    ? data.keywords
                    : (dbGradingPoints.mandatory_terms || []);
        
                // 3. 날짜 처리
                let createdDate = new Date(0);
                if (data.createdAt) {
                    if (typeof data.createdAt.toDate === 'function') createdDate = data.createdAt.toDate();
                    else if (typeof data.createdAt === 'string' || typeof data.createdAt === 'number') createdDate = new Date(data.createdAt);
                }

                return {
                  id: doc.id,
                  // 이미지 필드 매핑
                  imageUrl: data.imageUrl || (data.images && data.images.length > 0 ? data.images[0] : null),
                  images: data.images || [], 
                  answerImages: data.answerImages || [], 
                  answerImageUrl: data.answerImageUrl || (data.answerImages && data.answerImages.length > 0 ? data.answerImages[0] : null),
                  
                  title: String(rawTitle),
                  question: String(rawQuestion),
                  modelAnswer: String(rawAnswer),
                  
                  memo: data.memo || '', 

                  // 🔴 4. 정밀 채점 데이터 명시적 할당 (ProblemSolver 전달용)
                  // 이 객체가 ProblemSolver의 'currentProblem'으로 전달됩니다.
                  numbers: finalNumbers, 
                  gradingPoints: {
                      mandatory_terms: finalTerms,
                      mandatory_numbers: finalNumbers
                  },

                  keywords: finalTerms,
                  tags: Array.isArray(data.tags) ? data.tags : [],
                  subject: data.category || data.subject || '기타',
                  problemType: data.problemType || 'descriptive',
                  
                  studyCount: Number(data.studyCount || 0),
                  wrongCount: Number(data.wrongCount || 0),
                  lastScore: Number(data.lastScore || 0),
                  createdAt: createdDate,
                };
              });

              // 최신순 정렬
              problemList.sort((a, b) => b.createdAt - a.createdAt);
              setProblems(problemList);
          
          } catch (error) {
              console.error("🚨 워크북 데이터 수화 오류:", error);
              setProblems([]); 
          } finally {
              setLoading(false);
          }
        });
    
        return () => unsubscribe();
      }, []);

      // --- [이하 필터링 및 정렬 로직 동일하게 유지] ---
      const allTags = useMemo(() => {
        const tags = new Set();
        problems.forEach(p => { if (Array.isArray(p.tags)) p.tags.forEach(t => tags.add(t)); });
        return Array.from(tags).sort();
      }, [problems]);

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
            filtered = filtered.filter(p => selectedTags.every(tag => p.tags.includes(tag)));
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
        problems, loading, processedProblems, allTags,
        filterState: { activeTab, setActiveTab, sortBy, setSortBy, searchTerm, setSearchTerm, selectedTags, setSelectedTags } 
      };
};