import { useEffect, useState, useMemo } from 'react';
import { db } from '../firebase'; 
import { collection, query, onSnapshot } from 'firebase/firestore'; 
import { 
  ChevronDown,
  CheckCircle2,
  RefreshCcw,
  Sparkles,
  Book,
  Search,
  BookCopy,
  Folder,
  Loader2,
  PieChart,
  AlertCircle
} from 'lucide-react';
import ProblemSolver from './ProblemSolver';

// ----------------------------------------------------------------------
// 1. 대시보드 위젯 컴포넌트
// ----------------------------------------------------------------------
const DashboardWidget = ({ problems, onReview }) => {
    const stats = useMemo(() => {
        const total = problems.length;
        if (total === 0) return null;

        const mastered = problems.filter(p => p.lastScore === 100).length;
        const review = problems.filter(p => p.studyCount > 0 && p.lastScore < 100).length;
        const fresh = total - mastered - review;
        
        const masteryRate = Math.round((mastered / total) * 100);

        // 취약 과목 분석
        const subjectCounts = {};
        problems.forEach(p => {
            if (p.studyCount > 0 && p.lastScore < 100) {
                const subj = p.subject || "기타";
                subjectCounts[subj] = (subjectCounts[subj] || 0) + 1;
            }
        });
        const sortedWeakSubjects = Object.entries(subjectCounts).sort((a,b) => b[1] - a[1]);
        const weakSubject = sortedWeakSubjects.length > 0 ? sortedWeakSubjects[0] : null;

        return { total, mastered, review, fresh, masteryRate, weakSubject };
    }, [problems]);

    if (!stats) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* 정복률 카드 */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-5 rounded-2xl flex items-center justify-between relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <PieChart size={80} />
                </div>
                <div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Mastery</p>
                    <h3 className="text-3xl font-extrabold text-white">
                        {stats.masteryRate}<span className="text-sm text-slate-500 ml-1">%</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-2">
                        {stats.mastered} / {stats.total} 문제 정복 완료
                    </p>
                </div>
                <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path className="text-slate-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                        <path className="text-blue-500 transition-all duration-1000 ease-out" strokeDasharray={`${stats.masteryRate}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                    </svg>
                </div>
            </div>

            {/* 학습 상태 요약 */}
            <div className="bg-slate-800/50 border border-slate-700 p-5 rounded-2xl flex flex-col justify-center gap-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="text-sm text-slate-300">완료 (Mastered)</span>
                    </div>
                    <span className="text-emerald-400 font-bold">{stats.mastered}</span>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        <span className="text-sm text-slate-300">복습 필요 (Review)</span>
                    </div>
                    <span className="text-amber-400 font-bold">{stats.review}</span>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                        <span className="text-sm text-slate-300">미학습 (New)</span>
                    </div>
                    <span className="text-white font-bold">{stats.fresh}</span>
                </div>
            </div>

            {/* 집중 공략 포인트 */}
            <div className="bg-slate-800/50 border border-slate-700 p-5 rounded-2xl relative overflow-hidden">
                <p className="text-amber-500 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                    <AlertCircle size={12} /> 집중 공략 필요
                </p>
                {stats.weakSubject ? (
                    <div>
                        <h4 className="text-lg font-bold text-white line-clamp-1 mb-1">{stats.weakSubject[0]}</h4>
                        <p className="text-sm text-slate-400">
                            오답/복습 문제 <span className="text-amber-400 font-bold">{stats.weakSubject[1]}개</span>가 쌓여있습니다.
                        </p>
                        <button 
                            onClick={() => onReview(stats.weakSubject[0])}
                            className="mt-3 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-lg hover:bg-amber-500/20 transition-colors"
                        >
                            바로 복습하기 →
                        </button>
                    </div>
                ) : (
                    <div className="h-full flex flex-col justify-center">
                        <p className="text-slate-300 font-medium">현재 취약한 과목이 없습니다.</p>
                        <p className="text-xs text-slate-500">완벽합니다! 새로운 문제에 도전하세요.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------
// 2. 헬퍼 컴포넌트: 아코디언 섹션
// ----------------------------------------------------------------------
const SubjectAccordion = ({ subject, problems, onSelectProblem, initialExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  const completedCount = useMemo(() => problems.filter(p => p.lastScore === 100).length, [problems]);
  const totalCount = problems.length;

  const getStatusIcon = (problem) => {
    if (problem.lastScore === 100) return <CheckCircle2 className="text-emerald-500" size={16} />;
    if (problem.studyCount > 0) return <RefreshCcw className="text-amber-500" size={16} />;
    return <Sparkles className="text-blue-500" size={16} />;
  };

  return (
    <div className="border border-slate-700/50 bg-slate-800/20 rounded-xl overflow-hidden transition-all duration-300">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-slate-800 hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Folder className="text-blue-400" size={20} />
          <span className="font-bold text-lg text-white">{subject}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm font-mono text-slate-400">
            <span className={completedCount === totalCount ? 'text-emerald-400' : 'text-slate-400'}>{completedCount}</span>
            <span className="text-slate-600"> / </span>
            <span>{totalCount}</span>
          </div>
          <ChevronDown 
            className={`text-slate-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
            size={22} 
          />
        </div>
      </button>

      {isExpanded && (
        <div className="p-2 space-y-1 animate-in fade-in duration-300 slide-in-from-top-2">
          {problems.map(item => (
            <div 
              key={item.id}
              onClick={() => onSelectProblem(item)}
              className="flex items-center gap-4 p-3 rounded-lg cursor-pointer hover:bg-blue-500/10 group transition-colors"
            >
              {getStatusIcon(item)}
              <div className="flex-grow min-w-0">
                <div className="truncate text-slate-300 group-hover:text-blue-300 text-sm font-medium">
                    {item.title}
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500 font-mono shrink-0">
                <span>{item.studyCount}회</span>
                <span className={item.lastScore === 100 ? 'text-emerald-500' : (item.studyCount > 0 ? 'text-amber-500' : 'text-slate-500')}>
                    {item.lastScore}점
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// 3. 메인 컴포넌트: Workbook
// ----------------------------------------------------------------------
const Workbook = () => {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [solveSession, setSolveSession] = useState(null);

  const [activeTab, setActiveTab] = useState('ALL'); 
  const [sortBy, setSortBy] = useState('latest');    
  const [searchTerm, setSearchTerm] = useState('');

  // 데이터 로드
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
          
          // [수정] 이미지 데이터 추가 (ProblemSolver로 전달용)
          imageUrl: data.imageUrl || null,

          title: String(data.title || "제목 없음"),
          question: String(data.content || data.description || "내용 없음"),
          modelAnswer: String(data.answer || data.modelAnswer || "해설 없음"),
          keywords: gradingKeywords,
          tags: Array.isArray(data.tags) ? data.tags : [],
          subject: data.subject || (Array.isArray(data.tags) && data.tags.length > 0 ? data.tags[0] : '기타 과목'),
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

  // 필터링된 데이터 계산
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
      const subject = problem.subject || '기타 과목';
      if (!acc[subject]) acc[subject] = [];
      acc[subject].push(problem);
      return acc;
    }, {});

    return { grouped, sortedList: sorted };

  }, [problems, activeTab, sortBy, searchTerm]);
  
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

  // 취약 과목 바로 복습 핸들러
  const handleQuickReview = (subject) => {
    const reviewList = problems.filter(p => 
        (p.subject === subject) && 
        (p.studyCount > 0 && p.lastScore < 100)
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
            alert("선택한 모든 문제 학습을 완료했습니다! 🎉");
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