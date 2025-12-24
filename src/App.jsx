import { useState, useEffect, useMemo, useRef } from 'react' // Added useRef
// ... imports

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


// ... THEME_CONFIG ...

function App() {
  // [NEW] Privacy Layer State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const pinInputRef = useRef(null);

  // Navigation & View State
  const [mode, setMode] = useState('dashboard');
  const [subject, setSubject] = useState('mechanical');
  const [isExamMode, setIsExamMode] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // ... (Data Toss, Auth States) ...
  const [activeStrategy, setActiveStrategy] = useState(null);
  const [sharedData, setSharedData] = useState(null);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tokenClient, setTokenClient] = useState(null);
  const [gapiInited, setGapiInited] = useState(false);
  const [gisInited, setGisInited] = useState(false);

  // Theme Config
  const theme = THEME_CONFIG[subject];

  // ... (D-Day and Effects) ...

  // [NEW] PIN Verification Handler
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


  // ... (Auth Init Effects) ...

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

  const handleLogin = () => {
    // ... same logic
    if (!API_KEY || !CLIENT_ID) {
      alert("API 설정 오류: .env 파일에 VITE_GOOGLE_API_KEY와 VITE_GOOGLE_CLIENT_ID가 설정되어 있는지 확인하세요.");
      return;
    }
    if (tokenClient) tokenClient.requestAccessToken({ prompt: 'consent' });
  };

  const handleLogout = () => { /* ... same */
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
