import { useState, useEffect, useMemo, useRef } from 'react'
import { 
  Flame, Droplets, Zap, Eye, EyeOff, 
  Wind, DoorOpen, Layers 
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

// [NFTC 6대 분류 테마 설정]
const THEME_CONFIG = {
  '수계': { bg: 'bg-slate-900', border: 'border-blue-500/30', activeTab: 'bg-blue-600 text-white shadow-blue-500/20', text: 'text-blue-400', icon: Droplets },
  '가스계': { bg: 'bg-zinc-900', border: 'border-emerald-500/30', activeTab: 'bg-emerald-600 text-white shadow-emerald-500/20', text: 'text-emerald-400', icon: Wind },
  '경보': { bg: 'bg-slate-950', border: 'border-amber-500/30', activeTab: 'bg-amber-600 text-white shadow-amber-500/20', text: 'text-amber-400', icon: Zap },
  '피난': { bg: 'bg-stone-900', border: 'border-lime-500/30', activeTab: 'bg-lime-600 text-white shadow-lime-500/20', text: 'text-lime-400', icon: DoorOpen },
  '소화활동': { bg: 'bg-neutral-900', border: 'border-red-500/30', activeTab: 'bg-red-600 text-white shadow-red-500/20', text: 'text-red-400', icon: Flame },
  '공통': { bg: 'bg-slate-900', border: 'border-purple-500/30', activeTab: 'bg-purple-600 text-white shadow-purple-500/20', text: 'text-purple-400', icon: Layers }
};

const APP_VERSION = 'v2.8.1'; // 데이터 연동 패치 버전
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

function App() {
  // --- 상태 관리 ---
  const [accessToken, setAccessToken] = useState(null); 
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const pinInputRef = useRef(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // 네비게이션 & 뷰
  const [mode, setMode] = useState('dashboard');
  const [subject, setSubject] = useState('수계'); 
  const [isExamMode, setIsExamMode] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // 데이터 흐름 (수정 데이터 관리 핵심)
  const [activeStrategy, setActiveStrategy] = useState(null);
  const [sharedData, setSharedData] = useState(null); // 수정할 문제 데이터 보관소

  // 인증 상태
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tokenClient, setTokenClient] = useState(null);

  const theme = THEME_CONFIG[subject] || THEME_CONFIG['수계'];

  // D-Day 계산
  const dDay = useMemo(() => {
    const targetDate = new Date('2027-09-04');
    const today = new Date();
    const diff = targetDate - today;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? `D-${days}` : 'D-Day';
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
    if (!isUnlocked && pinInputRef.current) {
      pinInputRef.current.focus();
    }
  }, [isUnlocked]);

  useEffect(() => {
    if (isExamMode) setIsSidebarCollapsed(true);
    else setIsSidebarCollapsed(false);
  }, [isExamMode]);

  // Google Auth 초기화
  useEffect(() => {
    const initGis = () => {
      if (!CLIENT_ID || !window.google?.accounts?.oauth2) return;
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID, scope: SCOPES,
          callback: (resp) => {
            if (resp.access_token) {
                setAccessToken(resp.access_token);
                setIsAuthenticated(true);
            }
          },
        });
        setTokenClient(client);
      } catch (err) { console.error("GIS Init Error", err); }
    };
    initGis();
  }, []);

  // --- Handlers ---

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput === '2027') setIsUnlocked(true);
    else {
      alert("암호가 일치하지 않습니다.");
      setPinInput('');
    }
  };

  // 🔴 [핵심] 수정 모드 트리거: Workbook에서 수정 버튼 클릭 시 호출됨
  const handleEditProblem = (problem) => {
    setSharedData(problem); // 수정할 데이터를 sharedData에 주입
    setMode('smart-upload'); // 전문 에디터(SmartUpload) 모드로 전환
    setIsExamMode(false);    // 수정 시에는 집중 모드 자동 해제
  };

  const handleDataToss = (data) => {
    setSharedData(data);
    setMode('smart-upload');
  };

  const handleLogin = () => {
    if (tokenClient) tokenClient.requestAccessToken({ prompt: 'consent' });
  };

  const handleLogout = () => {
    setAccessToken(null);
    setIsAuthenticated(false);
    window.location.reload();
  };

  // --- Render ---

  if (!isUnlocked) {
      return (
        <div className="flex flex-col items-center justify-center w-screen bg-slate-950 text-white p-4 fixed inset-0" style={{ height: '100dvh' }}>
            <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="flex justify-center mb-6">
                    <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg">
                        <Flame size={48} className="text-white fill-white" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-center mb-2">Fire-Sight Access</h2>
                <p className="text-slate-400 text-center text-sm mb-8">보안을 위해 접속 암호를 입력해주세요.</p>
                <form onSubmit={handlePinSubmit} className="space-y-4">
                    <input type="password" value={pinInput} onChange={e=>setPinInput(e.target.value)} className="w-full text-center text-3xl tracking-[1em] font-bold bg-slate-800 border border-slate-700 rounded-xl py-4 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none" placeholder="PIN" autoFocus />
                    <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95">Unlock System</button>
                </form>
            </div>
        </div>
      );
  }

  const renderContent = () => {
    switch (mode) {
      case 'dashboard': return <Dashboard setMode={setMode} subject={subject} dDay={dDay} />;
      
      case 'smart-upload': 
        return (
          <SmartUpload 
            initialData={sharedData} // 🔴 공유된 수정 데이터 전달
            onSaveComplete={() => {
              setSharedData(null); // 저장 완료 시 데이터 비우기
              setMode('workbook');  // 다시 문제 풀던 워크북으로 복귀
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
            onEditProblem={handleEditProblem} // 🔴 수정 핸들러 주입
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
      case 'study-manager': return <StudyManager />;
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
        <div className="bg-red-600 text-white text-center py-1 text-xs animate-pulse shrink-0">
          오프라인 모드: 로컬에 저장된 데이터만 열람 가능합니다.
        </div>
      )}

      {!isExamMode && (
        <header className={`h-14 border-b ${theme.border} bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-4 z-50 shadow-sm shrink-0 transition-colors duration-500`}>
          <div className="flex items-center gap-2 cursor-pointer min-w-max" onClick={() => setMode('dashboard')}>
            <div className="p-1.5 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg shadow-lg">
              <Flame size={18} className="text-white fill-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-white">
              Fire-Sight <span className="font-light text-slate-400">Lite</span>
              <span className="ml-2 text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 border border-slate-700 hidden md:inline">{APP_VERSION}</span>
            </h1>
          </div>

          <div className="flex-1"></div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex flex-col items-end group relative cursor-help mr-2">
              <div className="text-xs font-mono text-slate-500">Target: {dDay}</div>
            </div>
            <button
              onClick={() => setIsExamMode(!isExamMode)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border 
                ${isExamMode ? 'bg-red-500/10 text-red-500 border-red-500/50 animate-pulse' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
            >
              {isExamMode ? <EyeOff size={14} /> : <Eye size={14} />}
              <span className="hidden sm:inline">{isExamMode ? '집중 모드' : '학습 모드'}</span>
            </button>
            <div className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`} title={isAuthenticated ? "Connected" : "Disconnected"}></div>
            <button onClick={handleLogout} className="text-[10px] px-2 py-1 bg-red-600 hover:bg-red-500 text-white border border-red-400 rounded transition-all z-50">LogOut</button>
          </div>
        </header>
      )}

      {isExamMode && (
        <button onClick={() => setIsExamMode(false)} className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-full shadow-lg shadow-red-600/30 transition-all active:scale-95 animate-in slide-in-from-top-10 fade-in duration-300">
          <EyeOff size={18} /> <span>Exit Exam Mode</span>
        </button>
      )}
      
      <div className="flex-1 flex overflow-hidden">
        {!isExamMode && <Sidebar currentMode={mode} setMode={setMode} subject={subject} isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} isAuthenticated={isAuthenticated} handleLogout={handleLogout}/>}
        <main className={`flex-1 relative overflow-hidden ${theme.bg} transition-colors duration-500 ${isExamMode ? 'text-lg tracking-wide' : 'text-base'}`}>
          {renderContent()}
        </main>
      </div>

      {mode === 'workbook' && <CanvasWidget />}
    </div>
  );
}

export default App;