import { useMemo } from 'react';

export const useWorkbookFilter = (problems, filterState, setFilterState) => {
    const { activeTab, sortBy, searchTerm, selectedTags } = filterState;

    const setActiveTab = (val) => setFilterState(prev => ({...prev, activeTab: val}));
    const setSortBy = (val) => setFilterState(prev => ({...prev, sortBy: val}));
    const setSearchTerm = (val) => setFilterState(prev => ({...prev, searchTerm: val}));
    // 콜백 함수형 업데이트 지원
    const setSelectedTags = (val) => setFilterState(prev => ({
        ...prev, 
        selectedTags: typeof val === 'function' ? val(prev.selectedTags) : val
    }));

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
            (Array.isArray(p.tags) && p.tags.some(tag => tag.toLowerCase().includes(term)))
          );
        }

        if (selectedTags.length > 0) {
            filtered = filtered.filter(p => selectedTags.every(tag => Array.isArray(p.tags) && p.tags.includes(tag)));
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
        processedProblems, 
        allTags,
        filterStateHandlers: { activeTab, setActiveTab, sortBy, setSortBy, searchTerm, setSearchTerm, selectedTags, setSelectedTags } 
    };
};
