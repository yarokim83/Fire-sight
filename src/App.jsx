import { useState, useEffect, useMemo } from 'react'
import SmartUpload from './components/SmartUpload'
import Sidebar from './components/Sidebar'
import VisualLearning from './components/VisualLearning'
import Workbook from './components/Workbook'
import Reference from './components/Reference'
import Dashboard from './components/Dashboard'
import StrategyView from './components/StrategyView'
import StudyManager from './components/StudyManager'
import { Flame, Droplets, Zap, Eye, EyeOff, TableProperties } from 'lucide-react'

// ... (Security Note remains same)

/* 
  [SECURITY NOTE] 
  실제 배포 시에는 .env 파일 등을 사용하여 환경변수로 관리하세요.
  For Development: Paste your keys here temporarily.
*/
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

console.log("[App Debug] API_KEY Loaded:", !!API_KEY, API_KEY?.slice(0, 5) + "...");
console.log("[App Debug] CLIENT_ID Loaded:", !!CLIENT_ID, CLIENT_ID?.slice(0, 5) + "...");


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

function App() {
  // Navigation & View State
  const [mode, setMode] = useState('dashboard'); // 'dashboard' | 'visual' | 'workbook' | 'reference' | 'strategy' | 'smart-upload'
  const [subject, setSubject] = useState('mechanical'); // 'mechanical' | 'electrical'
  const [isExamMode, setIsExamMode] = useState(false); // false: NFTC, true: Exam (Auto-collapse sidebar)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Lifted state

  // [NEW] Strategic Data Flow
  const [activeStrategy, setActiveStrategy] = useState(null); // StrategyView -> Workbook Filter
  const [sharedData, setSharedData] = useState(null); // Reference -> SmartUpload (Data Toss)

  // Auth States
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tokenClient, setTokenClient] = useState(null);
  const [gapiInited, setGapiInited] = useState(false);
  const [gisInited, setGisInited] = useState(false);

  // Theme Config
  const theme = THEME_CONFIG[subject];

  // [NEW] D-Day Calculation (2027 Exam Target) - Optimized with useMemo
  const dDay = useMemo(() => {
    const targetDate = new Date('2027-09-04'); // Updated Target Date
    const today = new Date();
    const diff = targetDate - today;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? `D-${days}` : 'D-Day';
  }, []); // Run once on mount

  // [NEW] Auto-Focus Mode Effect
  useEffect(() => {
    if (isExamMode) {
      setIsSidebarCollapsed(true);
    } else {
      setIsSidebarCollapsed(false);
    }
  }, [isExamMode]);

  // [NEW] Data Toss Handler
  const handleDataToss = (data) => {
    // console.log("Data Tossed:", data);
    setSharedData(data);
    setMode('smart-upload');
  };

  // Google Auth Init Effects (Unchanged ...)
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
      alert("API 설정 오류: 소스 코드의 API_KEY와 CLIENT_ID를 먼저 설정해주세요.");
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

  const renderContent = () => {
    switch (mode) {
      case 'dashboard':
        return <Dashboard setMode={setMode} subject={subject} dDay={dDay} />;
      case 'smart-upload':
        // [UPDATE] Pass sharedData to SmartUpload
        return <SmartUpload onSaveComplete={() => setMode('dashboard')} initialData={sharedData} />;
      case 'workbook':
        // [UPDATE] Pass activeStrategy filter
        return <Workbook isExamMode={isExamMode} subject={subject} initialFilter={activeStrategy} />;
      case 'reference':
        // [UPDATE] Pass onDataToss handler
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
        // [UPDATE] Pass setter to activate strategy
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

      {/* 1. GNB (Global Navigation Bar) */}
      <header className={`h-14 border-b ${theme.border} bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-4 z-50 shadow-sm shrink-0 transition-colors duration-500`}>
        {/* Left: Logo */}
        <div className="flex-1 flex items-center gap-2 cursor-pointer" onClick={() => setMode('dashboard')}>
          <div className="p-1.5 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg shadow-lg">
            <Flame size={18} className="text-white fill-white" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white">
            Fire-Sight <span className="font-light text-slate-400">Lite</span>
            <span className="ml-2 text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 border border-slate-700">v2.0</span>
          </h1>
        </div>

        {/* Center: Subject Tabs */}
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

        {/* Right: Info */}
        <div className="flex-1 flex justify-end items-center gap-4 min-w-fit whitespace-nowrap" style={{ scrollbarGutter: 'stable' }}>
          <div className="hidden lg:flex flex-col items-end group relative cursor-help">
            <div className="text-xs font-mono text-slate-500">2027 Inspection Practice</div>
            <div className="text-[10px] font-bold text-blue-400 transition-colors">
              Target: {dDay}
            </div>
            {/* Tooltip */}
            <div className="absolute top-full right-0 mt-2 p-3 bg-slate-800 border border-slate-600 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 w-48 text-center">
              <p className="text-xs text-slate-300">시험 예상일: 2027.09.04</p>
              <p className="text-xs font-bold text-white mt-1">남은 시간: {dDay}일</p>
            </div>
          </div>

          {/* Global Exam Mode Toggle */}
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

          {/* Global Auth Status Indicator */}
          <div className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`} title={isAuthenticated ? "Connected" : "Disconnected"}></div>
        </div>
      </header>


      {/* 2. Main Layout (Sidebar + Content) */}
      <div className="flex-1 flex overflow-hidden">

        {/* LNB (Sidebar) - Now Controlled */}
        <Sidebar
          currentMode={mode}
          setMode={setMode}
          subject={subject}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />

        {/* Content Area */}
        <main className={`flex-1 relative overflow-hidden ${theme.bg} transition-colors duration-500
           ${isExamMode ? 'text-lg tracking-wide' : 'text-base'}
        `}>
          {renderContent()}
        </main>
      </div>

    </div>
  );
}

export default App
