// src/components/Workbook/useWorkbookData.js
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
            let gradingKeywords = [];
            const answerText = String(data.answer || data.modelAnswer || "");
            
            if (data.keywords && Array.isArray(data.keywords) && data.keywords.length > 0) {
                gradingKeywords = data.keywords;
            } else if (answerText.length > 0 && answerText !== "해설 없음") {
                gradingKeywords = answerText.split(/[\s,().]+/).filter(word => word && word.length >= 2).slice(0, 15);
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
              question: String(data.content || data.description || "내용 없음"),
              modelAnswer: String(data.answer || data.modelAnswer || "해설 없음"),
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
        problems, // 원본 데이터
        loading,
        processedProblems, // 필터링된 데이터
        filterState: { activeTab, setActiveTab, sortBy, setSortBy, searchTerm, setSearchTerm } // 필터 상태 제어 함수들
      };
};