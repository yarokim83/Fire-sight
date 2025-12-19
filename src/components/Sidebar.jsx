import React from 'react';
import { BookOpen, PenTool } from 'lucide-react';

export default function Sidebar({ currentMode, setMode }) {
    return (
        <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col p-4 shadow-lg z-10">
            <h1 className="text-xl font-bold mb-8 text-orange-500 tracking-wider">Fire-Sight Lite</h1>
            <nav className="space-y-2">
                <button
                    onClick={() => setMode('visual')}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${currentMode === 'visual'
                            ? 'bg-orange-600 text-white shadow-md'
                            : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                >
                    <BookOpen size={20} />
                    <span className="font-medium">Visual Learning</span>
                </button>
                <button
                    onClick={() => setMode('workbook')}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${currentMode === 'workbook'
                            ? 'bg-orange-600 text-white shadow-md'
                            : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                >
                    <PenTool size={20} />
                    <span className="font-medium">Workbook</span>
                </button>
            </nav>

            <div className="mt-auto pt-4 border-t border-slate-700 text-xs text-slate-500 text-center">
                iPad Web App v1.0
            </div>
        </div>
    );
}
