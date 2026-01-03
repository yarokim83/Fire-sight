import { useState, useEffect, useMemo, useRef } from 'react'
import { 
  Flame, Droplets, Zap, Eye, EyeOff, 
  Wind, DoorOpen, Layers 
} from 'lucide-react'

// 컴포넌트 임포트
import SmartUpload from './components/SmartUpload'
import Sidebar from './components/Sidebar'
import VisualLearning from './components/VisualLearning'
import Workbook from './components/Workbook' // 리팩토링된 폴더(index.jsx)를 자동으로 찾습니다.
import Reference from './components/Reference'
import Dashboard from './components/Dashboard'
import StrategyView from './components/StrategyView'
import StudyManager from './components/StudyManager'

// [NFTC 6대 분류 테마 설정]
const THEME_CONFIG = {
  '수계': { 
    bg: 'bg-slate-900', 
    border: 'border-blue-500/30', 
    activeTab: 'bg-blue-600 text-white shadow-blue-500/20', 
    text: 'text-blue-400',
    icon: Droplets 
  },
  '가스계': { 
    bg: 'bg-zinc-900', 
    border: 'border-emerald-500/30', 
    activeTab: 'bg-emerald-600 text-white shadow-emerald-500/20', 
    text: 'text-emerald-400',
    icon: Wind 
  },
  '경보': { 
    bg: 'bg-slate-950', 
    border: 'border-amber-500/30', 
    activeTab: 'bg-amber-600 text-white shadow-amber-500/20', 
    text: 'text-amber-400',
    icon: Zap 
  },
  '피난': { 
    bg: 'bg-stone-900', 
    border: 'border-lime-500/30', 
    activeTab: 'bg-lime-600 text-white shadow-lime-500/20', 
    text: 'text-lime-400',
    icon: DoorOpen 
  },
  '소화활동': { 
    bg: 'bg-neutral-900', 
    border: 'border-red-500/30', 
    activeTab: 'bg-red-600 text-white shadow-red-500/20', 
    text: 'text-red-400',
    icon: Flame 
  },
  '공통': { 
    bg: 'bg-slate-900', 
    border: 'border-purple-500/30', 
    activeTab: 'bg-purple-600 text-white shadow-purple-500/20', 
    text: 'text-purple-400',
    icon: Layers 
  }
};

const APP_VERSION = 'v2.4 (Refactored)';
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive';

function App() {
  // --- 상태 관리 ---
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const pinInputRef = useRef(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // 네비게이션 & 뷰
  const [mode, setMode] = useState('dashboard');
  const [subject, setSubject] = useState('수계'); // 기본값: 수계
  const [isExamMode, setIsExamMode] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // 데이터 흐름
  const [activeStrategy, setActiveStrategy] = useState(null);
  const [sharedData, setSharedData] = useState(null);

  // 인증 (Google)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tokenClient, setTokenClient] = useState(null);
  const [gapiInited, setGapiInited] = useState(false);
  const [gisInited, setGisInited] = useState(false);

  // 테마 적용 (Fallback 포함)
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

  // 온라인 상태 감지
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

  // PIN 포커스
  useEffect(() => {
    if (!isUnlocked && pinInputRef.current) {
      pinInputRef.current.focus();
    }
  }, [isUnlocked]);

  // 시험 모드 시 사이드바 자동 접기
  useEffect(() => {
    if (isExamMode) setIsSidebarCollapsed(true);
    else setIsSidebarCollapsed(false);
  }, [isExamMode]);

  // Google Auth 초기화
  useEffect(() => {
    const loadGapi = () => {
      if (window.gapi || document.querySelector('script[src="https://apis.google.com/js/api.js"]')) {
        if (window.gapi) initGapi();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => initGapi();
      document.body.appendChild(script);
    };

    const initGapi = () => {
      if (!API_KEY) return;
      window.gapi.load('client', async () => {
        try {
          await window.gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
          });
          setGapiInited(true);
        } catch (err) { console.error(err); }
      });
    };

    const loadGis = () => {
      if (window.google?.accounts?.oauth2 || document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
        if (window.google?.accounts?.oauth2) initGis();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => initGis();
      document.body.appendChild(script);
    };

    const initGis = () => {
      if (!CLIENT_ID) return;
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID, scope: SCOPES,
          callback: (resp) => {
            if (resp.error) throw (resp);
            setIsAuthenticated(true);
          },
        });
        setTokenClient(client);
        setGisInited(true);
      } catch (err) { console.error(err); }
    };

    loadGapi();
    loadGis();
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

  const handleDataToss = (data) => {
    setSharedData(data);
    setMode('smart-upload');
  };

  const handleLogin = () => {
    if (!API_KEY || !CLIENT_ID) {
      alert("API 설정 오류: .env 파일을 확인하세요.");
      return;
    }
    if (tokenClient) tokenClient.requestAccessToken({ prompt: 'consent' });
  };

  const handleLogout = () => {
    try {
      if (window.gapi?.client) window.gapi.client.setToken('');
      setIsAuthenticated(false);
      window.location.reload(); 
    } catch (err) {
      console.error(err);
      window.location.reload();
    }
  };

  // --- Render ---

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-slate-950 text-white p-4">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg">
              <Flame size={48} className="text-white fill-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">Fire-Sight Access</h2>
          <p className="text-slate-400 text-center text-sm mb-8">보안을 위해 접속 암호를 입력해주세요.</p>
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <input
              ref={pinInputRef}
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="w-full text-center text-3xl tracking-[1em] font-bold bg-slate-800 border border-slate-700 rounded-xl py-4 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              placeholder="PIN"
              autoFocus
            />
            <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95">
              Unlock System
            </button>
          </form>
          <div className="text-center mt-6">
            <p className="text-slate-600 text-xs">Fire Safety Manager Prep 2027</p>
            <p className="text-slate-500 text-[10px] mt-1 font-mono">{APP_VERSION}</p>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (mode) {
      case 'dashboard':
        return <Dashboard setMode={setMode} subject={subject} dDay={dDay} />;
      case 'smart-upload':
        return <SmartUpload 
          onSaveComplete={() => setMode('dashboard')} 
          initialData={sharedData}
          defaultCategory={subject} // [UX] 현재 선택된 과목 전달
        />;
      case 'workbook':
        // [Refactoring] 이제 Workbook은 내부적으로 데이터를 로드하지만, 
        // 필요한 경우 초기 필터나 주제를 prop으로 받을 수 있도록 유지합니다.
        return <Workbook isExamMode={isExamMode} subject={subject} initialFilter={activeStrategy} />;
      case 'reference':
        return <Reference
          subject={subject}
          isAuthenticated={isAuthenticated}
          handleLogin={handleLogin}
          handleLogout={handleLogout}
          gapiInited={gapiInited}
          gisInited={gisInited}
          onDataToss={handleDataToss}
          isOnline={isOnline}
        />;
      case 'strategy':
        return <StrategyView setActiveStrategy={setActiveStrategy} />;
      case 'study-manager':
        return <StudyManager />;
      case 'visual':
      default:
        return <VisualLearning isExamMode={isExamMode} setIsExamMode={setIsExamMode} setMode={setMode} subject={subject} />;
    }
  };

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden ${theme.bg} text-white font-sans transition-all duration-500 ${isExamMode ? 'brightness-90 saturate-50' : ''}`}>
      {!isOnline && (
        <div className="bg-red-600 text-white text-center py-1 text-xs animate-pulse">
          오프라인 모드: 로컬에 저장된 데이터만 열람 가능합니다.
        </div>
      )}

      {!isExamMode && (
        <header className={`h-14 border-b ${theme.border} bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-4 z-50 shadow-sm shrink-0 transition-colors duration-500`}>
          <div className="flex-1 flex items-center gap-2 cursor-pointer min-w-max" onClick={() => setMode('dashboard')}>
            <div className="p-1.5 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg shadow-lg">
              <Flame size={18} className="text-white fill-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-white">
              Fire-Sight <span className="font-light text-slate-400">Lite</span>
              <span className="ml-2 text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 border border-slate-700 hidden md:inline">{APP_VERSION}</span>
            </h1>
          </div>

          {/* NFTC 6대 분류 탭 (가로 스크롤) */}
          <div className="flex-1 flex justify-center mx-4 overflow-x-auto no-scrollbar">
            <div className="flex bg-slate-950/50 p-1 rounded-xl border border-slate-800 gap-1 min-w-max">
              {Object.keys(THEME_CONFIG).map((key) => {
                const Conf = THEME_CONFIG[key];
                const Icon = Conf.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setSubject(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-300
                      ${subject === key ? Conf.activeTab : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    <Icon size={14} />
                    <span className="hidden md:inline">{key}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 flex justify-end items-center gap-4 min-w-fit whitespace-nowrap">
            <div className="hidden lg:flex flex-col items-end group relative cursor-help">
              <div className="text-xs font-mono text-slate-500">2027 Inspection Practice</div>
              <div className="text-[10px] font-bold text-blue-400 transition-colors">Target: {dDay}</div>
            </div>
            <button
              onClick={() => setIsExamMode(!isExamMode)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border 
                ${isExamMode ? 'bg-red-500/10 text-red-500 border-red-500/50 animate-pulse' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
            >
              {isExamMode ? <EyeOff size={14} /> : <Eye size={14} />}
              <span className="hidden sm:inline">{isExamMode ? '집중 모드' : '학습 모드'}</span>
            </button>
            
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`} title={isAuthenticated ? "Connected" : "Disconnected"}></div>
              <button onClick={handleLogout} className="text-[10px] px-2 py-1 bg-red-600 hover:bg-red-500 text-white border border-red-400 rounded transition-all z-50">LogOut</button>
            </div>
          </div>
        </header>
      )}

      {isExamMode && (
        <button
          onClick={() => setIsExamMode(false)}
          className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-full shadow-lg shadow-red-600/30 transition-all active:scale-95 animate-in slide-in-from-top-10 fade-in duration-300"
        >
          <EyeOff size={18} />
          <span>Exit Exam Mode</span>
        </button>
      )}
      <div className="flex-1 flex overflow-hidden">
        {!isExamMode && <Sidebar currentMode={mode} setMode={setMode} subject={subject} isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} isAuthenticated={isAuthenticated} handleLogout={handleLogout}/>}
        <main className={`flex-1 relative overflow-hidden ${theme.bg} transition-colors duration-500 ${isExamMode ? 'text-lg tracking-wide' : 'text-base'}`}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;