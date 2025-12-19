import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import VisualLearning from './components/VisualLearning';
import Workbook from './components/Workbook';

function App() {
  const [mode, setMode] = useState('visual'); // 'visual' | 'workbook'
  const [isHighRise, setIsHighRise] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-900 text-white font-sans">
      <Sidebar currentMode={mode} setMode={setMode} />
      <main className="flex-1 relative h-full w-full">
        {mode === 'visual'
          ? <VisualLearning isHighRise={isHighRise} setIsHighRise={setIsHighRise} />
          : <Workbook isHighRise={isHighRise} />
        }
      </main>
    </div>
  );
}

export default App;
