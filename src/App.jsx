import { useState, useEffect, useMemo, useRef } from 'react'
import SmartUpload from './components/SmartUpload'
import Sidebar from './components/Sidebar'
import VisualLearning from './components/VisualLearning'
import Workbook from './components/Workbook'
import Reference from './components/Reference'
import Dashboard from './components/Dashboard'
import StrategyView from './components/StrategyView'
import StudyManager from './components/StudyManager'
import { Flame, Droplets, Zap, Eye, EyeOff, TableProperties, WifiOff } from 'lucide-react'

// [CRITICAL FIX] Define THEME_CONFIG globally
const THEME_CONFIG = {
  mechanical: {
    bg: 'bg-slate-900',
    border: 'border-blue-500/30',
    activeTab: 'bg-blue-600 text-white shadow-blue-500/20',
    text: 'text-blue-400'
  },
  electrical: {
    bg: 'bg-zinc-900',
    border: 'border-orange-500/30',
    activeTab: 'bg-orange-600 text-white shadow-orange-500/20',
    text: 'text-orange-400'
  }
};

/* 
  [SECURITY NOTE] 
  실제 배포 시에는 .env 파일 등을 사용하여 환경변수로 관리하세요.
  .env.example is provided for reference.
*/
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

console.log("[App Debug] API_KEY Loaded:", !!API_KEY);
console.log("[App Debug] CLIENT_ID Loaded:", !!CLIENT_ID);

function App() {
  // [NEW] Privacy Layer State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const pinInputRef = useRef(null);

  // [NEW] Offline Detection
  const [isOnline, setIsOnline] = useState(navigator.onLine);
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

  // Navigation & View State
  const [mode, setMode] = useState('dashboard');
  const [subject, setSubject] = useState('mechanical');
  const [isExamMode, setIsExamMode] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Strategic Data Flow
  const [activeStrategy, setActiveStrategy] = useState(null);
  const [sharedData, setSharedData] = useState(null);

  // Auth States
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tokenClient, setTokenClient] = useState(null);
  const [gapiInited, setGapiInited] = useState(false);
  const [gisInited, setGisInited] = useState(false);

  // Theme Config usage inside component
  const theme = THEME_CONFIG[subject];

  // D-Day Calculation
  const dDay = useMemo(() => {
    const targetDate = new Date('2027-09-04');
    const today = new Date();
    const diff = targetDate - today;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? `D-${days}` : 'D-Day';
  }, []);

  // PIN Verification Handler
  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput === '2027') {
      setIsUnlocked(true);
    } else {
      alert("암호가 일치하지 않습니다.");
      setPinInput('');
    }
  };

  useEffect(() => {
    if (!isUnlocked && pinInputRef.current) {
      pinInputRef.current.focus();
    }
  }, [isUnlocked]);

  // Auto-Focus Mode Effect
  useEffect(() => {
    if (isExamMode) {
      setIsSidebarCollapsed(true);
    } else {
      setIsSidebarCollapsed(false);
    }
  }, [isExamMode]);

  // Data Toss Handler
  const handleDataToss = (data) => {
    setSharedData(data);
    setMode('smart-upload');
  };

  // Google Auth Init Effects
  useEffect(() => {
    const loadGapi = () => {
      if (window.gapi || document.querySelector('script[src="https://apis.google.com/js/api.js"]')) {
        if (window.gapi) initGapi();
        return;
      }
      const gapiScript = document.createElement('script');
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.onload = () => initGapi();
      document.body.appendChild(gapiScript);
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
      const gisScript = document.createElement('script');
      gisScript.src = 'https://accounts.google.com/gsi/client';
      gisScript.onload = () => initGis();
      document.body.appendChild(gisScript);
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

  const handleLogin = () => {
    if (!API_KEY || !CLIENT_ID) {
      alert("API 설정 오류: .env 파일에 VITE_GOOGLE_API_KEY와 VITE_GOOGLE_CLIENT_ID가 설정되어 있는지 확인하세요.");
      return;
    }
    if (tokenClient) tokenClient.requestAccessToken({ prompt: 'consent' });
  };

  const handleLogout = () => {
    const token = window.gapi?.client?.getToken();
    if (token) {
      window.google.accounts.oauth2.revoke(token.access_token, () => {
        window.gapi.client.setToken('');
        setIsAuthenticated(false);
      });
    } else {
      setIsAuthenticated(false);
    }
  };

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
              pattern="[0-9]*"
              maxLength={4}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="w-full text-center text-3xl tracking-[1em] font-bold bg-slate-800 border border-slate-700 rounded-xl py-4 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all placeholder:tracking-normal"
              placeholder="PIN"
              autoFocus
            />
            <button
              type="submit"
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 touch-target"
            >
              Unlock System
            </button>
          </form>
          <p className="text-center text-slate-600 text-xs mt-6">Fire Safety Manager Prep 2027</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (mode) {
      case 'dashboard':
        return <Dashboard setMode={setMode} subject={subject} dDay={dDay} />;
      case 'smart-upload':
        return <SmartUpload onSaveComplete={() => setMode('dashboard')} initialData={sharedData} />;
      case 'workbook':
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
    <div className={`flex flex-col h-screen w-screen overflow-hidden ${theme.bg} text-white font-sans transition-all duration-500
      ${isExamMode ? 'brightness-90 saturate-50' : ''} 
    `}>
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-red-600 text-white text-center py-1 text-xs animate-pulse">
          오프라인 모드: 로컬에 저장된 데이터만 열람 가능합니다.
        </div>
      )}

      {/* Header: Hide entirely in Exam Mode */}
      {!isExamMode && (
        <header className={`h-14 border-b ${theme.border} bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-4 z-50 shadow-sm shrink-0 transition-colors duration-500`}>
          <div className="flex-1 flex items-center gap-2 cursor-pointer" onClick={() => setMode('dashboard')}>
            <div className="p-1.5 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg shadow-lg">
              <Flame size={18} className="text-white fill-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-white">
              Fire-Sight <span className="font-light text-slate-400">Lite</span>
              <span className="ml-2 text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 border border-slate-700">v2.1</span>
            </h1>
          </div>

          <div className="flex-1 flex justify-center">
            <div className="flex bg-slate-950/50 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setSubject('mechanical')}
                className={`flex items-center space-x-2 px-6 py-1.5 rounded-lg text-sm font-bold transition-all duration-300
                        ${subject === 'mechanical' ? theme.activeTab : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Droplets size={16} />
                <span>기계분야</span>
              </button>
              <button
                onClick={() => setSubject('electrical')}
                className={`flex items-center space-x-2 px-6 py-1.5 rounded-lg text-sm font-bold transition-all duration-300
                        ${subject === 'electrical' ? theme.activeTab : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Zap size={16} />
                <span>전기분야</span>
              </button>
            </div>
          </div>

          <div className="flex-1 flex justify-end items-center gap-4 min-w-fit whitespace-nowrap">
            <div className="hidden lg:flex flex-col items-end group relative cursor-help">
              <div className="text-xs font-mono text-slate-500">2027 Inspection Practice</div>
              <div className="text-[10px] font-bold text-blue-400 transition-colors">Target: {dDay}</div>
              <div className="absolute top-full right-0 mt-2 p-3 bg-slate-800 border border-slate-600 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 w-48 text-center">
                <p className="text-xs text-slate-300">시험 예상일: 2027.09.04</p>
                <p className="text-xs font-bold text-white mt-1">남은 시간: {dDay}일</p>
              </div>
            </div>
            <button
              onClick={() => setIsExamMode(!isExamMode)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border 
                ${isExamMode
                  ? 'bg-red-500/10 text-red-500 border-red-500/50 shadow-lg shadow-red-500/20 animate-pulse'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
            >
              {isExamMode ? <EyeOff size={14} /> : <Eye size={14} />}
              {isExamMode ? '집중 모드 ON' : '학습 모드'}
            </button>
            <div className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`} title={isAuthenticated ? "Connected" : "Disconnected"}></div>
          </div>
        </header>
      )}

      {/* Floating Exit Button for Exam Mode */}
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
        {!isExamMode && <Sidebar currentMode={mode} setMode={setMode} subject={subject} isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />}
        <main className={`flex-1 relative overflow-hidden ${theme.bg} transition-colors duration-500 ${isExamMode ? 'text-lg tracking-wide' : 'text-base'}`}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App
