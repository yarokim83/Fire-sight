// src/components/Workbook/index.jsx
import React, { useState } from 'react';
import { 
  CheckCircle2, RefreshCcw, Sparkles, Book, Search, BookCopy, Loader2
} from 'lucide-react';

// 분리한 컴포넌트와 로직 불러오기
import DashboardWidget from './DashboardWidget';
import SubjectAccordion from './SubjectAccordion';
import { useWorkbookData } from './useWorkbookData';
import ProblemSolver from '../ProblemSolver'; // 상위 폴더에 있는 기존 컴포넌트
import { deleteProblem } from '../../utils/db'; // utils 폴더 위치에 맞게 조정

const Workbook = () => {
  const { problems, loading, processedProblems, filterState } = useWorkbookData();
  const { activeTab, setActiveTab, sortBy, setSortBy, searchTerm, setSearchTerm } = filterState;
  
  const [solveSession, setSolveSession] = useState(null);

  const subjects = Object.keys(processedProblems.grouped).sort();

  // 문제 선택 핸들러
  const handleSelectProblem = (item) => {
    const fullList = processedProblems.sortedList;
    const startIndex = fullList.findIndex(p => p.id === item.id);
    if (startIndex !== -1) {
        setSolveSession({ list: fullList, startIndex: startIndex });
    } else {
        alert("문제 데이터를 찾을 수 없습니다.");
    }
  };

  // 문제 삭제 핸들러
  const handleDeleteProblem = async (item) => {
      if (window.confirm(`'${item.title}' 문제를 정말 삭제하시겠습니까?`)) {
          try {
              await deleteProblem(item.id);
          } catch (error) {
              alert("삭제 중 오류가 발생했습니다.");
          }
      }
  };

  // 취약 과목 바로 복습 핸들러
  const handleQuickReview = (subject) => {
    const reviewList = problems.filter(p => 
        (p.subject === subject) && (p.studyCount > 0 && p.lastScore < 100)
    );
    if (reviewList.length > 0) {
        alert(`${subject} 과목의 복습 문제 ${reviewList.length}개를 시작합니다!`);
        reviewList.sort((a, b) => b.wrongCount - a.wrongCount);
        setSolveSession({ list: reviewList, startIndex: 0 });
    } else {
        alert("복습할 문제가 없습니다.");
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full text-slate-400">
      <Loader2 className="animate-spin mb-4" size={40} />
      <p>문제 보관함을 불러오는 중입니다...</p>
    </div>
  );

  if (solveSession) {
    return (
      <ProblemSolver 
        problems={solveSession.list}       
        startIndex={solveSession.startIndex} 
        onBack={() => setSolveSession(null)}
        onComplete={() => {
            alert("학습 완료! 🎉");
            setSolveSession(null);
        }}
      />
    );
  }

  const TabButton = ({ id, label, icon: Icon }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`flex-1 flex items-center justify-center gap-2 p-3 text-sm font-bold border-b-4 transition-all ${activeTab === id ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
    >
      <Icon size={16} /> {label}
    </button>
  );

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto pb-20 bg-slate-900 text-white">
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
          <BookCopy size={24} /> 단권화 문제집
        </h2>
        <DashboardWidget problems={problems} onReview={handleQuickReview} />
      </header>

      <div className="flex bg-slate-800 rounded-t-lg border-b border-slate-700">
        <TabButton id="ALL" label="전체" icon={Book} />
        <TabButton id="NEW" label="미학습" icon={Sparkles} />
        <TabButton id="REVIEW" label="복습 필요" icon={RefreshCcw} />
        <TabButton id="MASTERED" label="완료" icon={CheckCircle2} />
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 my-4 p-4 bg-slate-800/50 rounded-b-lg border border-slate-700/50">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text"
            placeholder="태그 또는 제목으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-700 rounded-md pl-10 pr-4 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-slate-900/50 border border-slate-700 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        >
          <option value="latest">최신순</option>
          <option value="wrong">오답 많은 순</option>
          <option value="random">랜덤 섞기</option>
        </select>
      </div>

      <main className="space-y-3">
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
          <div className="text-center py-20 border border-dashed border-slate-700 rounded-xl bg-slate-800/30 text-slate-500">
            <p className="font-bold text-lg mb-2">표시할 문제가 없습니다.</p>
            <p>필터 조건을 변경하거나 새 문제를 추가해 보세요.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Workbook;