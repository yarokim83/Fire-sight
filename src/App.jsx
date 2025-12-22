import { useState, useEffect } from 'react'
import SmartUpload from './components/SmartUpload'
import Sidebar from './components/Sidebar'
import VisualLearning from './components/VisualLearning'
import Workbook from './components/Workbook'
import Reference from './components/Reference'
import Dashboard from './components/Dashboard'
import { Flame, Droplets, Zap, Eye, EyeOff } from 'lucide-react'


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
  const [mode, setMode] = useState('dashboard'); // 'dashboard' | 'visual' | 'workbook' | 'reference'
  const [subject, setSubject] = useState('mechanical'); // 'mechanical' | 'electrical'
  const [isExamMode, setIsExamMode] = useState(false); // false: NFTC, true: Exam

  // Auth States (Lifted from Reference.jsx)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tokenClient, setTokenClient] = useState(null);
  const [gapiInited, setGapiInited] = useState(false);
  const [gisInited, setGisInited] = useState(false);

  // Theme Config based on Subject
  const theme = THEME_CONFIG[subject];

  // 1. Initial Load: Load Google Scripts (gapi & gis)
  useEffect(() => {
    const loadGapi = () => {
      if (window.gapi || document.querySelector('script[src="https://apis.google.com/js/api.js"]')) {
        if (window.gapi) initGapi();
        return;
      }
      console.log("[App] Loading gapi script...");
      const gapiScript = document.createElement('script');
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.onload = () => {
        console.log("[App] gapi script loaded.");
        initGapi();
      };
      document.body.appendChild(gapiScript);
    };

    const initGapi = () => {
      if (!API_KEY) {
        console.warn("[App] API_KEY is missing. Skipping gapi init.");
        return;
      }
      window.gapi.load('client', async () => {
        try {
          await window.gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
          });
          setGapiInited(true);
          console.log("[App] gapi client initialized!");
        } catch (err) {
          console.error("[App] Error initializing gapi client:", err);
        }
      });
    };

    const loadGis = () => {
      if (window.google?.accounts?.oauth2 || document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
        if (window.google?.accounts?.oauth2) initGis();
        return;
      }
      console.log("[App] Loading gis script...");
      const gisScript = document.createElement('script');
      gisScript.src = 'https://accounts.google.com/gsi/client';
      gisScript.onload = () => {
        console.log("[App] gis script loaded.");
        initGis();
      };
      document.body.appendChild(gisScript);
    };

    const initGis = () => {
      if (!CLIENT_ID) {
        console.warn("[App] CLIENT_ID is missing. Skipping gis init.");
        return;
      }
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: (resp) => {
            if (resp.error) {
              console.error("[App] Auth Error:", resp);
              throw (resp);
            }
            setIsAuthenticated(true);
            console.log("[App] Authenticated successfully.");
          },
        });
        setTokenClient(client);
        setGisInited(true);
        console.log("[App] gis token client initialized!");
      } catch (err) {
        console.error("[App] Error initializing gis:", err);
      }
    };

    loadGapi();
    loadGis();
  }, []);

  // 2. Auth Handlers
  const handleLogin = () => {
    if (!API_KEY || !CLIENT_ID) {
      alert("API 설정 오류: 소스 코드의 API_KEY와 CLIENT_ID를 먼저 설정해주세요.");
      return;
    }
    if (tokenClient) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      alert("구글 서비스 초기화 중입니다. 잠시 후 다시 시도해주세요.");
    }
  };

  const handleLogout = () => {
    const token = window.gapi?.client?.getToken();
    if (token !== null) {
      window.google?.accounts?.oauth2?.revoke(token.access_token, () => {
        console.log('Revoked: ' + token.access_token);
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
        return <Dashboard setMode={setMode} subject={subject} />;
      case 'smart-upload':
        return <SmartUpload onSaveComplete={() => setMode('dashboard')} />;
      case 'workbook':
        return <Workbook isExamMode={isExamMode} subject={subject} />;
      case 'reference':
        return <Reference
          subject={subject}
          isAuthenticated={isAuthenticated}
          handleLogin={handleLogin}
          handleLogout={handleLogout}
          gapiInited={gapiInited}
          gisInited={gisInited}
        />;
      case 'visual':
      default:
        return <VisualLearning isExamMode={isExamMode} setIsExamMode={setIsExamMode} setMode={setMode} subject={subject} />;
    }
  };

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden ${theme.bg} text-white font-sans transition-colors duration-500`}>

      {/* 1. GNB (Global Navigation Bar) */}
      <header className={`h-14 border-b ${theme.border} bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-4 z-50 shadow-sm shrink-0 transition-colors duration-500`}>
        {/* Left: Logo */}
        <div className="flex-1 flex items-center gap-2">
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
        <div className="flex-1 flex justify-end items-center gap-4">
          <div className="text-xs font-mono text-slate-500 hidden md:block">
            2027 Inspection Practice
          </div>

          {/* Global Exam Mode Toggle */}
          <button
            onClick={() => setIsExamMode(!isExamMode)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border 
              ${isExamMode
                ? 'bg-red-500/10 text-red-500 border-red-500/50 shadow-lg shadow-red-500/20'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
          >
            {isExamMode ? <EyeOff size={14} /> : <Eye size={14} />}
            {isExamMode ? '암기 모드 ON' : '학습 모드'}
          </button>

          {/* Global Auth Status Indicator (Optional) */}
          <div className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-emerald-500' : 'bg-slate-700'}`} title={isAuthenticated ? "Connected" : "Disconnected"}></div>
        </div>
      </header>


      {/* 2. Main Layout (Sidebar + Content) */}
      <div className="flex-1 flex overflow-hidden">

        {/* LNB (Sidebar) */}
        <Sidebar currentMode={mode} setMode={setMode} subject={subject} />

        {/* Content Area */}
        <main className={`flex-1 relative overflow-hidden ${theme.bg} transition-colors duration-500`}>
          {renderContent()}
        </main>
      </div>

    </div>
  );
}

export default App
