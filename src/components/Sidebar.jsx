import React, { useState } from 'react';
import { BookOpen, PenTool, Book, ChevronLeft, ChevronRight, LayoutDashboard, Camera, RefreshCw, Zap, TableProperties } from 'lucide-react';

export default function Sidebar({ currentMode, setMode, subject, isCollapsed, setIsCollapsed, isAuthenticated, handleLogout }) {
    // const [isCollapsed, setIsCollapsed] = useState(false); // Controlled by App.jsx now

    // Dynamic styles based on Subject Theme
    const theme = subject === 'mechanical'
        ? { activeBg: 'bg-blue-600', activeText: 'text-white', hover: 'hover:bg-blue-900/30 hover:text-blue-200' }
        : { activeBg: 'bg-orange-600', activeText: 'text-white', hover: 'hover:bg-orange-900/30 hover:text-orange-200' };

    const NavItem = ({ mode, icon: Icon, label }) => (
        <button
            onClick={() => setMode(mode)}
            className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 mb-1 font-medium group relative
                ${currentMode === mode
                    ? `${theme.activeBg} ${theme.activeText} shadow-md`
                    : `text-slate-400 ${theme.hover}`
                }`}
        >
            <Icon size={22} className="shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap overflow-hidden transition-all duration-300">{label}</span>}

            {/* Tooltip for Collapsed Mode & iPad Touch */}
            {isCollapsed && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none shadow-xl border border-slate-700">
                    {label}
                </div>
            )}
        </button>
    );

    return (
        <div className={`${isCollapsed ? 'w-20' : 'w-64'} bg-slate-900 border-r border-slate-700/50 flex flex-col p-4 shadow-xl z-30 transition-all duration-300 relative`}>

            {/* Navigation Menus */}
            <nav className="flex-1 space-y-2 mt-4">
                <NavItem mode="dashboard" icon={LayoutDashboard} label="Dashboard" />
                <NavItem mode="smart-upload" icon={Camera} label="Smart Upload" />
                <NavItem mode="visual" icon={BookOpen} label="Visual Learning" />
                <NavItem mode="workbook" icon={PenTool} label="Workbook" />
                <NavItem mode="reference" icon={Book} label="Reference" />
                <NavItem mode="strategy" icon={Zap} label="Strategy" />
                <div className="my-2 h-px bg-slate-800 mx-2"></div>
                <NavItem mode="study-manager" icon={TableProperties} label="Manager" />

                {/* Reset Data Button */}
                <div className="pt-4 mt-4 border-t border-slate-800">
                    <button
                        onClick={() => {
                            if (window.confirm("모든 [스마트 업로드] 데이터를 초기화하시겠습니까?\n(복구할 수 없습니다)")) {
                                localStorage.removeItem('fireSight_customData');
                                window.location.reload();
                            }
                        }}
                        className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 mb-1 font-medium group relative text-slate-500 hover:text-red-400 hover:bg-red-900/10`}
                    >
                        <RefreshCw size={22} className="shrink-0" />
                        {!isCollapsed && <span className="whitespace-nowrap overflow-hidden transition-all duration-300">Data Reset</span>}
                        {isCollapsed && (
                            <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none shadow-xl border border-slate-700">
                                Data Reset
                            </div>
                        )}
                    </button>
                </div>
            </nav>

            {/* Collapse Toggle Button (Bottom) */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-12 bg-slate-800 border border-slate-700 rounded-r-lg flex items-center justify-center text-slate-400 hover:text-white shadow-md hover:bg-slate-700 transition"
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            {/* Footer */}
            <div className="mt-auto pt-4 border-t border-slate-800">
                <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : 'px-3'}`}>
                    <div 
                        className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`} 
                        title={isAuthenticated ? "Connected" : "Disconnected"}
                    ></div>
                    
                    {!isCollapsed && isAuthenticated && (
                        <button
                            onClick={handleLogout}
                            className="text-[10px] px-2 py-1 bg-slate-800 hover:bg-red-900/40 text-slate-400 hover:text-red-400 border border-slate-700 rounded transition-all"
                        >
                            로그아웃
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
