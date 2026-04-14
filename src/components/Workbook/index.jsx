import React, { useState, useEffect, useRef, memo } from 'react';
import { 
  CheckCircle2, RefreshCcw, Sparkles, Book, Search, BookCopy, Loader2,
  Filter, Tag, X, RefreshCw, ChevronDown, ChevronUp, LayoutList, AlignJustify 
} from 'lucide-react';

import DashboardWidget from './DashboardWidget';
import SubjectAccordion from './SubjectAccordion';
import ProblemCard from './ProblemCard'; 
import { useWorkbookFilter } from './useWorkbookFilter';
import ProblemSolver from '../ProblemSolver'; 
import { deleteProblem } from '../../utils/db'; 

const Workbook = ({ isExamMode, subject, initialFilter, onEditProblem, globalData, filterState, setFilterState }) => {
  const { problems, loading } = globalData || { problems: [], loading: false };
  const { processedProblems, filterStateHandlers, allTags } = useWorkbookFilter(problems, filterState, setFilterState);
  
  const { 
    activeTab, setActiveTab, 
    sortBy, setSortBy, 
    searchTerm, setSearchTerm,
    selectedTags, setSelectedTags
  } = filterStateHandlers;

  const [solveSession, setSolveSession] = useState(null);
  const [isTagsExpanded, setIsTagsExpanded] = useState(false);
  const [viewType, setViewType] = useState('group'); 

  // 무한 스크롤을 위한 상태
  const [displayCount, setDisplayCount] = useState(20);
  const observerRef = useRef(null);
  
  const sortedList = processedProblems?.sortedList || [];
  const subjects = processedProblems?.grouped ? Object.keys(processedProblems.grouped).sort() : [];

  // 무한 스크롤 감지 로직
  useEffect(() => {
    if (viewType !== 'list') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayCount < sortedList.length) {
          setDisplayCount(prev => prev + 20);
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [viewType, displayCount, sortedList.length]);

  // 필터 변경 시 리스트 초기화
  useEffect(() => {
    setDisplayCount(20);
  }, [activeTab, searchTerm, selectedTags, sortBy]);

  const toggleTag = (tag) => {
    if(setSelectedTags) setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const resetFilters = () => {
    if(setSearchTerm) setSearchTerm('');
    if(setSelectedTags) setSelectedTags([]);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full text-slate-400">
      <Loader2 className="animate-spin mb-4" size={40} />
      <p>로딩 중...</p>
    </div>
  );

  if (solveSession) {
    return (
      <ProblemSolver 
        problems={solveSession.list}       
        startIndex={solveSession.startIndex} 
        onBack={() => setSolveSession(null)}
        onComplete={() => setSolveSession(null)}
        onEditProblem={onEditProblem}
      />
    );
  }

  const handleSelectProblem = (item) => {
    const startIndex = sortedList.findIndex(p => p.id === item.id);
    if (startIndex !== -1) setSolveSession({ list: sortedList, startIndex });
  };

  const handleDeleteProblem = async (item) => {
      if (window.confirm(`'${item.title}' 삭제하시겠습니까?`)) {
          try { await deleteProblem(item.id); } catch (e) { alert("오류 발생: " + e.message); }
      }
  };

  const handleQuickReview = (subject) => {
    if(!problems) return;
    const reviewList = problems.filter(p => (p.subject === subject) && (p.studyCount > 0 && p.lastScore < 100));
    if (reviewList.length > 0) {
        reviewList.sort((a, b) => b.wrongCount - a.wrongCount);
        setSolveSession({ list: reviewList, startIndex: 0 });
    } else { alert("복습할 문제가 없습니다."); }
  };

  const renderHeader = () => (
    <div className="flex-shrink-0 z-20 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 shadow-xl sticky top-0">
      <div className="py-1.5 px-4 md:px-6 max-w-5xl mx-auto">
        
        <header className="flex items-center justify-between gap-4 mb-2">
            <h2 className="text-sm font-black text-white flex items-center gap-1.5 whitespace-nowrap drop-shadow-md">
              <BookCopy size={16} className="text-blue-500" /> 단권화 문제집
            </h2>
            <div className="flex-grow flex justify-end overflow-hidden">
              <div className="scale-90 origin-right transition-all">
                <DashboardWidget 
                  problems={problems || []} 
                  onReview={handleQuickReview} 
                  isUltraCompact={true} 
                />
              </div>
            </div>
        </header>

        <div className="flex bg-white/[0.02] rounded-t-2xl border-x border-t border-white/10 overflow-hidden shadow-inner">
            <TabButton id="ALL" label="전체" icon={Book} activeTab={activeTab} onClick={setActiveTab} />
            <TabButton id="NEW" label="미학습" icon={Sparkles} activeTab={activeTab} onClick={setActiveTab} />
            <TabButton id="REVIEW" label="복습" icon={RefreshCcw} activeTab={activeTab} onClick={setActiveTab} />
            <TabButton id="MASTERED" label="완료" icon={CheckCircle2} activeTab={activeTab} onClick={setActiveTab} />
        </div>

        <div className="p-2 bg-white/[0.03] backdrop-blur-xl rounded-b-2xl border border-white/10 flex flex-col gap-2 shadow-2xl">
            <div className="flex items-center gap-2">
                <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                        type="text"
                        placeholder="제목, 내용 검색..."
                        value={searchTerm || ''}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-9 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-white/20 shadow-inner"
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                            <X size={12} />
                        </button>
                    )}
                </div>
                
                <div className="flex items-center gap-1.5">
                    <button 
                        onClick={() => setIsTagsExpanded(!isTagsExpanded)}
                        className={`p-2 rounded-xl transition-all shadow-lg ${isTagsExpanded || selectedTags?.length > 0 ? 'bg-blue-600 border border-blue-500 text-white' : 'bg-black/50 border border-white/10 text-white/50 hover:bg-white/5 hover:text-white'}`}
                    >
                        <Tag size={14} />
                    </button>

                    <div className="flex bg-black/50 rounded-xl p-0.5 border border-white/10 shadow-inner">
                        <button onClick={() => setViewType('group')} className={`p-1.5 rounded-lg transition-all ${viewType === 'group' ? 'bg-white/10 text-white shadow' : 'text-white/40 hover:text-white/80'}`}><AlignJustify size={14} /></button>
                        <button onClick={() => setViewType('list')} className={`p-1.5 rounded-lg transition-all ${viewType === 'list' ? 'bg-white/10 text-white shadow' : 'text-white/40 hover:text-white/80'}`}><LayoutList size={14} /></button>
                    </div>

                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-black/50 border border-white/10 rounded-xl px-2 py-2 text-xs font-bold text-white focus:outline-none shadow-inner cursor-pointer appearance-none text-center">
                        <option value="latest">최신순</option>
                        <option value="wrong">오답순</option>
                        <option value="random">랜덤</option>
                    </select>
                </div>
            </div>

            {(isTagsExpanded || (selectedTags && selectedTags.length > 0)) && (
                <div className="pt-1 border-t border-slate-700/30 animate-in slide-in-from-top-1">
                    <div className="flex flex-wrap gap-1 py-0.5">
                        {allTags?.map(tag => (
                            <button 
                                key={tag} 
                                onClick={() => toggleTag(tag)}
                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold border transition-all ${selectedTags?.includes(tag) ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
                            >
                                #{tag}
                            </button>
                        ))}
                        {(selectedTags?.length > 0 || searchTerm) && (
                            <button onClick={resetFilters} className="text-[9px] text-red-400 ml-auto flex items-center gap-1 px-1 hover:underline">
                                <RefreshCw size={10} /> 초기화
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );

  const renderMainContent = () => {
    if (sortedList.length === 0) {
      return <div className="text-center py-20 text-slate-500 font-bold">조건에 맞는 문제가 없습니다.</div>;
    }

    if (viewType === 'list') {
      return (
        <div className="space-y-1 pb-20">
          {sortedList.slice(0, displayCount).map((problem) => (
            <ProblemCard 
              key={problem.id}
              data={problem} 
              onSelect={() => handleSelectProblem(problem)}
              onDelete={() => handleDeleteProblem(problem)}
              showSubjectBadge={true} 
            />
          ))}
          {displayCount < sortedList.length && (
            <div ref={observerRef} className="h-10 flex items-center justify-center py-4">
              <Loader2 className="animate-spin text-blue-500" size={20} />
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-2 pb-32">
        {subjects.map((subject) => (
            <SubjectAccordion
                key={subject}
                subject={subject}
                problems={processedProblems.grouped[subject]}
                onSelectProblem={handleSelectProblem}
                onDeleteProblem={handleDeleteProblem}
                initialExpanded={false} // ✅ 첫 번째 폴더도 닫힌 상태로 시작하도록 수정
            />
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-black text-white overflow-hidden animate-in fade-in duration-500 relative">
      {/* Background Ambience Layer */}
      <div className="absolute top-[-20%] left-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/5 blur-[150px] rounded-full pointer-events-none" />

      {renderHeader()}
      <main className="flex-grow w-full max-w-5xl mx-auto p-2 md:p-4 pt-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
        {renderMainContent()}
      </main>
    </div>
  );
};

const TabButton = ({ id, label, icon: Icon, activeTab, onClick }) => (
    <button 
      onClick={() => onClick(id)}
      className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 text-xs font-black border-b-2 transition-all duration-300 ${activeTab === id ? 'border-blue-500 text-white bg-blue-500/10 shadow-[inset_0_-20px_30px_-20px_rgba(59,130,246,0.3)]' : 'border-transparent text-white/40 hover:text-white hover:bg-white/[0.02]'}`}
    >
      <Icon size={14} /> <span>{label}</span>
    </button>
  );

export default Workbook;
