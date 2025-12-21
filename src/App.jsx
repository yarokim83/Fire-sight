import { useState } from 'react'
import Sidebar from './components/Sidebar'
import VisualLearning from './components/VisualLearning'
import Workbook from './components/Workbook'
import Reference from './components/Reference'
import { Flame, Droplets, Zap } from 'lucide-react'

function App() {
  const [mode, setMode] = useState('visual'); // 'visual' | 'workbook' | 'reference'
  const [subject, setSubject] = useState('mechanical'); // 'mechanical' | 'electrical'
  const [isExamMode, setIsExamMode] = useState(false); // false: NFTC, true: Exam

  // Theme Config based on Subject
  const theme = subject === 'mechanical'
    ? {
      bg: 'bg-slate-900',
      border: 'border-blue-500/30',
      activeTab: 'bg-blue-600 text-white shadow-blue-500/20',
      text: 'text-blue-400'
    }
    : {
      bg: 'bg-zinc-900',
      border: 'border-orange-500/30',
      activeTab: 'bg-orange-600 text-white shadow-orange-500/20',
      text: 'text-orange-400'
    };

  const renderContent = () => {
    switch (mode) {
      case 'visual':
        return <VisualLearning isExamMode={isExamMode} setIsExamMode={setIsExamMode} setMode={setMode} subject={subject} />;
      case 'workbook':
        return <Workbook isExamMode={isExamMode} subject={subject} />;
      case 'reference':
        return <Reference subject={subject} />;
      default:
        return <VisualLearning isExamMode={isExamMode} setIsExamMode={setIsExamMode} setMode={setMode} subject={subject} />;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-white font-sans">

      {/* 1. GNB (Global Navigation Bar) */}
      <header className={`h-14 border-b ${theme.border} bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-4 z-50 shadow-sm shrink-0 transition-colors duration-500`}>
        {/* Left: Logo */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg shadow-lg">
            <Flame size={18} className="text-white fill-white" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white">
            Fire-Sight <span className="font-light text-slate-400">Lite</span>
            <span className="ml-2 text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 border border-slate-700">v2.0</span>
          </h1>
        </div>

        {/* Center: Subject Tabs */}
        <div className="absolute left-1/2 transform -translate-x-1/2 flex bg-slate-950/50 p-1 rounded-xl border border-slate-800">
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

        {/* Right: Info */}
        <div className="text-xs font-mono text-slate-500 hidden md:block">
          2027 Inspection Practice
        </div>
      </header>

      {/* 2. Main Layout (Sidebar + Content) */}
      <div className="flex-1 flex overflow-hidden">

        {/* LNB (Sidebar) */}
        <Sidebar currentMode={mode} setMode={setMode} subject={subject} />

        {/* Content Area */}
        <main className={`flex-1 relative overflow-hidden bg-slate-950`}>
          {renderContent()}
        </main>
      </div>

    </div>
  );
}

export default App
