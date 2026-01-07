import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, RefreshCcw, Sparkles, Book, Search, BookCopy, Loader2,
  Filter, Tag, X, RefreshCw 
} from 'lucide-react';

import DashboardWidget from './DashboardWidget';
import SubjectAccordion from './SubjectAccordion';
import { useWorkbookData } from './useWorkbookData';
import ProblemSolver from '../ProblemSolver'; 
import { deleteProblem } from '../../utils/db'; 

const Workbook = () => {
  const { problems, loading, processedProblems, filterState, allTags } = useWorkbookData();
  const { 
    activeTab, setActiveTab, 
    sortBy, setSortBy, 
    searchTerm, setSearchTerm,
    selectedTags, setSelectedTags
  } = filterState;
  
  const [solveSession, setSolveSession] = useState(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const scrollContainerRef = useRef(null);

  const subjects = Object.keys(processedProblems.grouped).sort();

  useEffect(() => {
      if (scrollContainerRef.current) scrollContainerRef.current.focus();
  }, [loading]);

  const toggleTag = (tag) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedTags([]);
  };

  const handleSelectProblem = (item) => {
    const fullList = processedProblems.sortedList;
    const startIndex = fullList.findIndex(p => p.id === item.id);
    if (startIndex !== -1) setSolveSession({ list: fullList, startIndex });
  };

  const handleDeleteProblem = async (item) => {
      if (window.confirm(`'${item.title}' 삭제하시겠습니까?`)) {
          try { await deleteProblem(item.id); } catch (e) { alert("오류 발생: " + e.message); }
      }
  };

  const handleQuickReview = (subject) => {
    const reviewList = problems.filter(p => (p.subject === subject) && (p.studyCount > 0 && p.lastScore < 100));
    if (reviewList.length > 0) {
        reviewList.sort((a, b) => b.wrongCount - a.wrongCount);
        setSolveSession({ list: reviewList, startIndex: 0 });
    } else { alert("복습할 문제가 없습니다."); }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full text-slate-400">
      <Loader2 className="animate-spin mb-4" size={40} />
      <p>로딩 중...</p>
    </div>
  );

  // 문제 풀이 화면 전환
  if (solveSession) {
    return (
      <ProblemSolver 
        problems={solveSession.list}       
        startIndex={solveSession.startIndex} 
        onBack={() => setSolveSession(null)}
        onComplete={() => setSolveSession(null)}
      />
    );
  }

  const TabButton = ({ id, label, icon: Icon }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`flex-1 flex items-center justify-center gap-2 p-3 text-sm font-bold border-b-4 transition-all ${activeTab === id ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
    >
      <Icon size={16} /> <span className="hidden md:inline">{label}</span>
      <span className="md:hidden">{id === 'ALL' ? '전체' : ''}</span>
    </button>
  );

  return (
    <div 
        ref={scrollContainerRef}
        className="h-full overflow-y-auto bg-slate-900 text-white outline-none scrollbar-thin scrollbar-thumb-slate-700"
        style={{ WebkitOverflowScrolling: 'touch' }}
        tabIndex={0} 
    >
      <div className="p-4 md:p-6 pb-32 max-w-5xl mx-auto flex flex-col min-h-full">
        
        <header className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
            <BookCopy size={24} /> 단권화 문제집
            </h2>
            <DashboardWidget problems={problems} onReview={handleQuickReview} />
        </header>

        {/* Sticky Header */}
        <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md pb-2 -mx-4 px-4 md:-mx-6 md:px-6 border-b border-slate-800 shadow-xl transition-all">
            <div className="flex bg-slate-800 rounded-t-lg border-b border-slate-700 mt-2">
                <TabButton id="ALL" label="전체" icon={Book} />
                <TabButton id="NEW" label="미학습" icon={Sparkles} />
                <TabButton id="REVIEW" label="복습 필요" icon={RefreshCcw} />
                <TabButton id="MASTERED" label="완료" icon={CheckCircle2} />
            </div>
            
            <div className="flex flex-col gap-3 p-4 bg-slate-800/50 rounded-b-lg border-x border-b border-slate-700/50">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input 
                            type="text"
                            placeholder="제목, 내용, 키워드 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-md pl-10 pr-10 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="bg-slate-900/50 border border-slate-700 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="latest">최신순</option>
                            <option value="wrong">오답순</option>
                            <option value="random">랜덤</option>
                        </select>
                        <button 
                            onClick={() => setShowFilterPanel(!showFilterPanel)}
                            className={`md:hidden px-3 py-2 rounded-md border ${selectedTags.length > 0 ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900/50 border-slate-700 text-slate-400'}`}
                        >
                            <Filter size={18} />
                        </button>
                    </div>
                </div>

                {/* 필터 패널 애니메이션 적용 */}
                <div className={`${showFilterPanel ? 'max-h-40 opacity-100 mt-2 pb-1' : 'max-h-0 opacity-0 overflow-hidden'} transition-all duration-300 ease-in-out md:max-h-none md:opacity-100 md:block`}>
                    <div className="flex flex-wrap gap-2 items-center pt-2 border-t border-slate-700/30">
                        <div className="text-xs font-bold text-slate-500 flex items-center gap-1 mr-2 shrink-0">
                            <Tag size={12} /> 태그:
                        </div>
                        {allTags.length > 0 ? allTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => toggleTag(tag)}
                                className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all active:scale-95
                                    ${selectedTags.includes(tag) 
                                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' 
                                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                                    }`}
                            >
                                #{tag}
                            </button>
                        )) : (
                            <span className="text-xs text-slate-600">등록된 태그 없음</span>
                        )}
                        {(selectedTags.length > 0 || searchTerm) && (
                            <button 
                                onClick={resetFilters}
                                className="ml-auto text-xs text-red-400 hover:text-red-300 flex items-center gap-1 px-2 py-1 bg-red-500/10 rounded-lg border border-red-500/20 transition-colors"
                            >
                                <RefreshCw size={12} /> 초기화
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>

        <main className="space-y-3 mt-4 flex-grow">
            {subjects.length > 0 ? (
            subjects.map((subject, index) => (
                <SubjectAccordion
                    key={subject}
                    subject={subject}
                    problems={processedProblems.grouped[subject]}
                    onSelectProblem={handleSelectProblem}
                    onDeleteProblem={handleDeleteProblem}
                    initialExpanded={index === 0} 
                />
            ))
            ) : (
            <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-700 rounded-xl bg-slate-800/30 text-slate-500 mt-10">
                <Filter size={48} className="mb-4 opacity-30 text-slate-400" />
                <p className="font-bold text-lg mb-1 text-slate-300">조건에 맞는 문제가 없습니다.</p>
                <p className="text-sm">검색어나 태그 필터를 변경해 보세요.</p>
                <button onClick={resetFilters} className="mt-6 px-4 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg text-sm font-bold transition-all">
                    필터 초기화
                </button>
            </div>
            )}
        </main>
      </div>
    </div>
  );
};

export default Workbook;