import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  Flame, Droplets, Zap, Eye, EyeOff,
  Wind, DoorOpen, Layers, Menu
} from 'lucide-react'

// 컴포넌트 임포트
import SmartUpload from './components/SmartUpload'
import Sidebar from './components/Sidebar'
import VisualLearning from './components/VisualLearning'
import Workbook from './components/Workbook'
import Reference from './components/Reference'
import Dashboard from './components/Dashboard'
import StrategyView from './components/StrategyView'
import StudyManager from './components/StudyManager'
import CanvasWidget from './components/CanvasWidget'
import { useFirestoreSync } from './hooks/useFirestoreSync'

// [NFTC 6대 분류 테마 설정]
const THEME_CONFIG = {
  '수계': { bg: 'bg-slate-900', border: 'border-blue-500/30', activeTab: 'bg-blue-600 text-white shadow-blue-500/20', text: 'text-blue-400', icon: Droplets },
  '가스계': { bg: 'bg-zinc-900', border: 'border-emerald-500/30', activeTab: 'bg-emerald-600 text-white shadow-emerald-500/20', text: 'text-emerald-400', icon: Wind },
  '경보': { bg: 'bg-slate-950', border: 'border-amber-500/30', activeTab: 'bg-amber-600 text-white shadow-amber-500/20', text: 'text-amber-400', icon: Zap },
  '피난': { bg: 'bg-stone-900', border: 'border-lime-500/30', activeTab: 'bg-lime-600 text-white shadow-lime-500/20', text: 'text-lime-400', icon: DoorOpen },
  '소화활동': { bg: 'bg-neutral-900', border: 'border-red-500/30', activeTab: 'bg-red-600 text-white shadow-red-500/20', text: 'text-red-400', icon: Flame },
  '공통': { bg: 'bg-slate-900', border: 'border-purple-500/30', activeTab: 'bg-purple-600 text-white shadow-purple-500/20', text: 'text-purple-400', icon: Layers }
};

const APP_VERSION = 'v3.2.55'; // 안티그래비티 이관
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.file';

function App() {
  // --- 상태 관리 ---
  const [accessToken, setAccessToken] = useState(null);
  const [isUnlocked, setIsUnlocked] = useState(() => sessionStorage.getItem('isUnlocked') === 'true');
  const [pinInput, setPinInput] = useState('');
  const pinInputRef = useRef(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // 네비게이션 & 뷰
  const [mode, setMode] = useState('dashboard');
  const [subject, setSubject] = useState('수계');
  const [isExamMode, setIsExamMode] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 1024 : false);

  // 데이터 흐름 (수정 데이터 관리)
  const [activeStrategy, setActiveStrategy] = useState(null);
  const [sharedData, setSharedData] = useState(null);

  // 인증 상태
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tokenClient, setTokenClient] = useState(null);

  // 🔴 [리팩토링] 데이터 Fetch 상단 끌어올리기 (Zero Latency)
  const globalData = useFirestoreSync();
  const [workbookFilters, setWorkbookFilters] = useState({
     activeTab: 'ALL',
     sortBy: 'latest',
     searchTerm: '',
     selectedTags: []
  });

  const theme = THEME_CONFIG[subject] || THEME_CONFIG['수계'];

  // D-Day 계산
  const dDay = useMemo(() => {
    const targetDate = new Date('2027-09-04');
    const today = new Date();
    const diff = targetDate - today;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? `D-${days}` : 'D-Day';
  }, []);

  // --- Functions: GIS 초기화 로직 보강 ---
  const initGis = useCallback(() => {
    if (!CLIENT_ID || !window.google?.accounts?.oauth2) {
      console.warn("GIS 라이브러리가 아직 로드되지 않았습니다.");
      return;
    }
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (resp) => {
          if (resp.access_token) {
            setAccessToken(resp.access_token);
            setIsAuthenticated(true);
            console.log("✅ 구글 인증 성공: 시스템 동기화 활성화");
          }
        },
      });
      setTokenClient(client);
    } catch (err) {
      console.error("GIS Init Error", err);
    }
  }, []);

  // --- Effects ---

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isUnlocked && pinInputRef.current) {
      pinInputRef.current.focus();
    }
  }, [isUnlocked]);

  useEffect(() => {
    if (isExamMode) setIsSidebarCollapsed(true);
    else setIsSidebarCollapsed(false);
  }, [isExamMode]);

  // Google GIS 초기화 실행 (지연 시간 부여하여 안정성 확보)
  useEffect(() => {
    const timer = setTimeout(() => initGis(), 1000);
    return () => clearTimeout(timer);
  }, [initGis]);

  // --- Handlers ---

  const handlePinSubmit = (e) => {
    e.preventDefault();
    const correctPin = import.meta.env.VITE_APP_PIN || '2027';
    if (pinInput === correctPin) {
      setIsUnlocked(true);
      sessionStorage.setItem('isUnlocked', 'true'); // 세션 유지 저장
    } else {
      alert("암호가 일치하지 않습니다.");
      setPinInput('');
    }
  };

  // 🔴 수정 모드 트리거: Workbook에서 수정 버튼 클릭 시 호출됨
  const handleEditProblem = (problem) => {
    setSharedData(problem);
    setMode('smart-upload');
    setIsExamMode(false);
  };

  const handleDataToss = (data) => {
    setSharedData(data);
    setMode('smart-upload');
  };

  const handleLogin = () => {
    if (tokenClient) {
      // 이미 권한이 부여된 사용자라면 불필요한 동의 화면(prompt)을 건너뜁니다.
      tokenClient.requestAccessToken({ prompt: '' });
    } else {
      initGis(); // 객체 유실 시 재초기화 시도
      alert("인증 시스템을 재가동 중입니다. 다시 시도해주세요.");
    }
  };

  // 🔴 [에러 핸들링] 55분 간격으로 토큰 만료 전 조용히 자동 갱신
  useEffect(() => {
    if (isAuthenticated && tokenClient) {
      const refreshTimer = setTimeout(() => {
        console.log("⏳ 구글 안전 동기화 유지: 토큰 갱신 중...");
        tokenClient.requestAccessToken({ prompt: '' });
      }, 55 * 60 * 1000);

      return () => clearTimeout(refreshTimer);
    }
  }, [isAuthenticated, tokenClient]);

  const handleLogout = () => {
    setAccessToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem('google_access_token');
    window.location.reload();
  };

  // --- Render Logic ---

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center w-screen bg-slate-950 text-white p-4 fixed inset-0" style={{ height: '100dvh' }}>
        <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg">
              <Flame size={48} className="text-white fill-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center mb-2 tracking-tight">Fire-Sight Access</h2>
          <p className="text-slate-400 text-center text-sm mb-8">보안을 위해 접속 암호를 입력해주세요.</p>
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <input
              type="password"
              ref={pinInputRef}
              value={pinInput}
              onChange={e => setPinInput(e.target.value)}
              className="w-full text-center text-3xl tracking-[1em] font-bold bg-slate-800 border border-slate-700 rounded-xl py-4 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
              placeholder="PIN"
            />
            <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl transition-all shadow-lg active:scale-95 uppercase tracking-widest">Unlock System</button>
          </form>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (mode) {
      case 'dashboard': return <Dashboard setMode={setMode} subject={subject} dDay={dDay} globalData={globalData} />;

      case 'smart-upload':
        return (
          <SmartUpload
            initialData={sharedData}
            onSaveComplete={() => {
              setSharedData(null);
              setMode('workbook');
            }}
            defaultCategory={subject}
          />
        );

      case 'workbook':
        return (
          <Workbook
            isExamMode={isExamMode}
            subject={subject}
            initialFilter={activeStrategy}
            onEditProblem={handleEditProblem}
            globalData={globalData}
            filterState={workbookFilters}
            setFilterState={setWorkbookFilters}
          />
        );

      case 'reference':
        return <Reference
          subject={subject}
          isAuthenticated={isAuthenticated}
          accessToken={accessToken}
          handleLogin={handleLogin}
          handleLogout={handleLogout}
          onDataToss={handleDataToss}
          isOnline={isOnline}
        />;
      case 'strategy': return <StrategyView setActiveStrategy={setActiveStrategy} />;
      case 'study-manager': 
        return <StudyManager 
          isAuthenticated={isAuthenticated} 
          accessToken={accessToken} 
          handleLogin={handleLogin} 
        />;
      case 'visual':
      default: return <VisualLearning isExamMode={isExamMode} setIsExamMode={setIsExamMode} setMode={setMode} subject={subject} />;
    }
  };

  return (
    <div
      className={`fixed inset-0 flex flex-col w-screen overflow-hidden ${theme.bg} text-white font-sans transition-all duration-500 pt-[env(safe-area-inset-top)] ${isExamMode ? 'brightness-90 saturate-50' : ''}`}
      style={{ height: '100dvh' }}
    >
      {!isOnline && (
        <div className="bg-red-600 text-white text-center py-1 text-[10px] font-black tracking-widest animate-pulse shrink-0 uppercase">
          Offline Mode: Accessing Local Cache Only
        </div>
      )}

      {!isExamMode && (
        <header className={`h-14 border-b ${theme.border} bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-4 z-50 shadow-sm shrink-0 transition-colors duration-500`}>
          <div className="flex items-center gap-2">
            {isMobile && (
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className="mr-1 p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all active:scale-95 shrink-0 cursor-pointer"
                title="메뉴 열기"
              >
                <Menu size={18} />
              </button>
            )}
            <div className="flex items-center gap-2 cursor-pointer min-w-max" onClick={() => setMode('dashboard')}>
              <div className="p-1.5 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg shadow-lg">
                <Flame size={18} className="text-white fill-white" />
              </div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Fire-Sight <span className="font-light text-slate-400">Pro</span>
                <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 border border-white/5 uppercase font-black">{APP_VERSION}</span>
              </h1>
            </div>
          </div>

          <div className="flex-1"></div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex flex-col items-end group relative cursor-help mr-2">
              <div className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-tighter">Target: {dDay}</div>
            </div>
            <button
              onClick={() => setIsExamMode(!isExamMode)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border 
                ${isExamMode ? 'bg-red-500/10 text-red-500 border-red-500/50 animate-pulse' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
            >
              {isExamMode ? <EyeOff size={14} /> : <Eye size={14} />}
              <span className="hidden sm:inline uppercase">{isExamMode ? 'Exam Mode' : 'Study Mode'}</span>
            </button>
            <div className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-emerald-500 shadow-[0_0_100px_#10b981]' : 'bg-slate-700'}`} title={isAuthenticated ? "Connected" : "Disconnected"}></div>
            <button onClick={handleLogout} className="text-[9px] font-black px-2.5 py-1.5 bg-rose-600/10 text-rose-500 border border-rose-500/20 rounded-lg hover:bg-rose-600 hover:text-white transition-all z-50 uppercase tracking-widest">Exit</button>
          </div>
        </header>
      )}

      {isExamMode && (
        <button onClick={() => setIsExamMode(false)} className="fixed top-4 right-4 z-50 flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-full shadow-2xl shadow-rose-600/30 transition-all active:scale-95 animate-in slide-in-from-top-10 fade-in duration-300 uppercase text-xs tracking-widest">
          <EyeOff size={16} /> <span>Exit Exam Mode</span>
        </button>
      )}

      <div className="flex-1 flex overflow-hidden">
        {!isExamMode && (
          <Sidebar
            currentMode={mode}
            setMode={setMode}
            subject={subject}
            setSubject={setSubject}
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={setIsSidebarCollapsed}
            isAuthenticated={isAuthenticated}
            handleLogout={handleLogout}
            isMobile={isMobile}
          />
        )}
        <main className={`flex-1 relative overflow-hidden ${theme.bg} transition-colors duration-500 ${isExamMode ? 'text-lg tracking-wide' : 'text-base'}`}>
          {renderContent()}
        </main>
      </div>

      {mode === 'workbook' && <CanvasWidget />}
    </div>
  );
}

export default App;