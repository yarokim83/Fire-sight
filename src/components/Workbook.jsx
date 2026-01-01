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
  Loader2
} from 'lucide-react';
import ProblemSolver from './ProblemSolver';

// ----------------------------------------------------------------------
// 1. 헬퍼 컴포넌트: 아코디언 섹션 (SubjectAccordion)
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
      {/* 아코디언 헤더 */}
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

      {/* 아코디언 내용 (문제 리스트) */}
      {isExpanded && (
        <div className="p-2 space-y-1 animate-in fade-in duration-300 slide-in-from-top-2">
          {problems.map(item => (
            <div 
              key={item.id}
              // [디버깅] 클릭 이벤트가 발생하는지 확인
              onClick={() => {
                  console.log("클릭됨:", item.title); // 콘솔 확인용
                  onSelectProblem(item);
              }}
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
// 2. 메인 컴포넌트: Workbook
// ----------------------------------------------------------------------
const Workbook = () => {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProblem, setSelectedProblem] = useState(null);

  // UI 상태 관리
  const [activeTab, setActiveTab] = useState('ALL'); 
  const [sortBy, setSortBy] = useState('latest');    
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, "workbook"));
    console.log("📡 단권화 워크북 구독 시작...");

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const problemList = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: String(data.title || "제목 없음"), // [안전장치] 문자열 강제 변환
          content: String(data.content || data.description || "내용 없음"),
          answer: String(data.answer || data.modelAnswer || "해설 없음"),
          tags: Array.isArray(data.tags) ? data.tags : [],
          subject: data.subject || (Array.isArray(data.tags) && data.tags.length > 0 ? data.tags[0] : '기타 과목'),
          studyCount: Number(data.studyCount || 0),
          wrongCount: Number(data.wrongCount || 0),
          lastScore: Number(data.lastScore || 0),
          status: data.status || 'NEW', 
          createdAt: data.createdAt?.toDate() || new Date(0),
        };
      });

      console.log(`📦 단권화 데이터 ${problemList.length}개 로드 완료`);
      setProblems(problemList);
      setLoading(false);
    }, (err) => {
      console.error("🔥 데이터 로드 실패:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 데이터 가공
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
    
    return sorted.reduce((acc, problem) => {
      const subject = problem.subject || '기타 과목';
      if (!acc[subject]) acc[subject] = [];
      acc[subject].push(problem);
      return acc;
    }, {});

  }, [problems, activeTab, sortBy, searchTerm]);
  
  const subjects = Object.keys(processedProblems).sort();

  // [핵심 수정] 안전장치가 추가된 문제 선택 핸들러
  const handleSelectProblem = (item) => {
    console.log("👆 핸들러 진입:", item.title); // 디버깅용

    try {
        let gradingKeywords = [];
        const answerText = String(item.answer || ""); // 에러 방지용

        if (item.keywords && Array.isArray(item.keywords) && item.keywords.length > 0) {
            gradingKeywords = item.keywords;
        } else if (answerText.length > 0 && answerText !== "해설 없음") {
            // split 에러 방지를 위해 answerText가 문자열인지 확인 후 실행
            gradingKeywords = answerText.split(/[\s,().]+/).filter(word => word && word.length >= 2).slice(0, 15);
        } else {
            gradingKeywords = item.tags && item.tags.length > 0 ? item.tags : ["키워드 없음"];
        }

        const problemData = {
          id: item.id,
          question: item.content,
          modelAnswer: item.answer,
          keywords: gradingKeywords,
          title: item.title
        };
        
        console.log("✅ 문제 데이터 세팅 완료:", problemData);
        setSelectedProblem(problemData); // 화면 전환

    } catch (error) {
        console.error("❌ 문제 선택 중 에러:", error);
        alert("문제를 여는 중 오류가 발생했습니다: " + error.message);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full text-slate-400">
      <Loader2 className="animate-spin mb-4" size={40} />
      <p>문제 보관함을 불러오는 중입니다...</p>
    </div>
  );

  if (selectedProblem) {
    return (
      <ProblemSolver 
        problems={[selectedProblem]}
        topicId={selectedProblem.id}
        onBack={() => setSelectedProblem(null)}
        onComplete={() => {
            alert("학습이 완료되었습니다.");
            setSelectedProblem(null);
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
        <p className="text-slate-400 text-sm">
          전체 {problems.length}개 문제 중, 현재 필터에 {subjects.reduce((acc, key) => acc + processedProblems[key].length, 0)}개가 표시됩니다.
        </p>
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
              problems={processedProblems[subject]}
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