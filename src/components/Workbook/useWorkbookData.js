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
        console.log("📡 워크북 데이터 구독 시작...");
    
        const unsubscribe = onSnapshot(q, (snapshot) => {
          try {
              const problemList = snapshot.docs.map(doc => {
                const data = doc.data();
                
                // 1. 기본 필드 매핑
                let rawQuestion = data.content || data.description || data.problemText || "내용 없음";
                let rawAnswer = data.answer || data.modelAnswer || "해설 없음";
                let rawTitle = data.title || "제목 없음";
                
                // 도면 문제 처리 (제목에 [도면] 태그 추가)
                if (data.problemType === 'drawing' || data.problemType === 'visual') {
                    if (!rawTitle.startsWith('[도면]')) rawTitle = `[도면] ${rawTitle}`; 
                }

                // 2. 키워드 처리
                let gradingKeywords = [];
                if (Array.isArray(data.keywords)) gradingKeywords = data.keywords;
                else if (typeof data.keywords === 'string' && data.keywords.trim() !== '') gradingKeywords = data.keywords.split(',').map(k => k.trim());
                else if (Array.isArray(data.tags)) gradingKeywords = data.tags;
                else gradingKeywords = ["키워드 없음"];
        
                // 3. 날짜 처리
                let createdDate = new Date(0);
                if (data.createdAt) {
                    if (typeof data.createdAt.toDate === 'function') createdDate = data.createdAt.toDate();
                    else if (typeof data.createdAt === 'string' || typeof data.createdAt === 'number') createdDate = new Date(data.createdAt);
                }

                // [추가] 수치 데이터 안전하게 추출 (0 포함)
                const extractNumbers = () => {
                    const fromRoot = Array.isArray(data.numbers) ? data.numbers : [];
                    const fromGrading = data.gradingPoints?.mandatory_numbers || [];
                    return Array.from(new Set([...fromRoot, ...fromGrading]))
                        .map(n => String(n).trim())
                        .filter(n => n !== "" && n !== "null" && n !== "undefined");
                };

                return {
                  id: doc.id,
                  // [중요] 이미지 필드 매핑 (다중 이미지 지원)
                  imageUrl: data.imageUrl || (data.images && data.images.length > 0 ? data.images[0] : null),
                  images: data.images || [], // 문제 이미지 배열
                  
                  // [핵심] 해설 이미지 배열 매핑
                  answerImages: data.answerImages || [], 
                  answerImageUrl: data.answerImageUrl || (data.answerImages && data.answerImages.length > 0 ? data.answerImages[0] : null),
                  
                  title: String(rawTitle),
                  question: String(rawQuestion),
                  modelAnswer: String(rawAnswer),
                  
                  memo: data.memo || '', 

                  keywords: gradingKeywords,
                  // 수치 데이터 매핑 추가
                  numbers: extractNumbers(),
                  gradingPoints: data.gradingPoints || { 
                    mandatory_terms: gradingKeywords, 
                    mandatory_numbers: extractNumbers() 
                  },
                  
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
              console.error("🚨 데이터 매핑 오류:", error);
              setProblems([]); 
          } finally {
              setLoading(false);
          }
        });
    
        return () => unsubscribe();
      }, []);

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
