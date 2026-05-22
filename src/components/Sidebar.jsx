import React from 'react';
import { 
    LayoutDashboard, Camera, BookOpen, PenTool, Book, Zap, 
    TableProperties, ChevronLeft, ChevronRight, ShieldCheck 
} from 'lucide-react';

export default function Sidebar({ 
    currentMode, setMode, subject, isCollapsed, setIsCollapsed, 
    isAuthenticated, handleLogout 
}) {
    
    // 🔴 [리팩토링] NFTC 6대 테마별 시그니처 컬러 및 글로우 효과 매핑
    const THEME_STYLES = {
        '수계': { activeBg: 'bg-blue-600', activeText: 'text-white', glow: 'shadow-[0_0_15px_rgba(37,99,235,0.4)]' },
        '가스계': { activeBg: 'bg-emerald-600', activeText: 'text-white', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.4)]' },
        '경보': { activeBg: 'bg-amber-600', activeText: 'text-white', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.4)]' },
        '피난': { activeBg: 'bg-lime-600', activeText: 'text-white', glow: 'shadow-[0_0_15px_rgba(132,204,22,0.4)]' },
        '소화활동': { activeBg: 'bg-red-600', activeText: 'text-white', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.4)]' },
        '공통': { activeBg: 'bg-purple-600', activeText: 'text-white', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.4)]' }
    };

    const theme = THEME_STYLES[subject] || THEME_STYLES['수계'];

    const navItems = [
        { mode: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { mode: 'smart-upload', icon: Camera, label: 'Smart Upload' },
        { mode: 'visual', icon: BookOpen, label: 'Visual Learning' },
        { mode: 'workbook', icon: PenTool, label: 'Workbook' },
        { mode: 'reference', icon: Book, label: 'Reference' },
        { mode: 'strategy', icon: Zap, label: 'Strategy' },
        { mode: 'study-manager', icon: TableProperties, label: 'Manager', divider: true },
    ];

    return (
        <aside className={`
            ${isCollapsed ? 'w-20' : 'w-64'} 
            h-screen bg-[#020617] border-r border-white/5 
            flex flex-col transition-all duration-300 ease-in-out relative z-50
        `}>
            
            {/* 1. 상단 로고 영역: Apple의 미니멀리즘 */}
            <div className={`h-24 flex items-center ${isCollapsed ? 'justify-center' : 'px-6'} transition-all`}>
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-2xl shrink-0">
                    <ShieldCheck size={24} className="text-black" strokeWidth={2.5} />
                </div>
                {!isCollapsed && (
                    <div className="ml-3 flex flex-col animate-in fade-in slide-in-from-left-2">
                        <span className="text-sm font-bold tracking-tight text-white/90">Fire-Sight Pro</span>
                        <span className="text-[9px] font-bold text-white/30 tracking-[0.2em] uppercase">2027 Edition</span>
                    </div>
                )}
            </div>

            {/* 2. 내비게이션: 클릭 타겟이 명확한 텍스트 기반 UI */}
            <nav className="flex-1 px-3 space-y-1">
                {navItems.map((item) => {
                    const isActive = currentMode === item.mode;
                    return (
                        <React.Fragment key={item.mode}>
                            {item.divider && <div className="my-4 h-px bg-white/5 mx-3" />}
                            <button
                                onClick={() => setMode(item.mode)}
                                className={`
                                    w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-200 group relative
                                    ${isActive 
                                        ? `${theme.activeBg} ${theme.activeText} ${theme.glow}` 
                                        : 'text-white/40 hover:text-white/80 hover:bg-white/5'}
                                `}
                            >
                                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                                
                                {!isCollapsed && (
                                    <span className="text-[14px] font-semibold tracking-tight animate-in fade-in">
                                        {item.label}
                                    </span>
                                )}

                                {/* 툴팁: 접혔을 때만 노출 */}
                                {isCollapsed && (
                                    <div className="absolute left-16 bg-white text-black px-3 py-1.5 rounded-lg text-xs font-bold opacity-0 group-hover:opacity-100 pointer-events-none transition-all translate-x-[-10px] group-hover:translate-x-0 shadow-2xl whitespace-nowrap z-[100]">
                                        {item.label}
                                    </div>
                                )}
                            </button>
                        </React.Fragment>
                    );
                })}
            </nav>

            {/* 3. 🔴 사용자님이 가장 선호하신 '핸들형 토글' (디자인 고도화) */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-14 bg-white/10 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/20 transition-all shadow-xl z-[60] group"
            >
                {isCollapsed ? <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" /> : <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />}
            </button>

            {/* 4. 하단 상태 및 로그아웃 */}
            <div className="p-4 border-t border-white/5 bg-white/[0.02]">
                <div className={`flex items-center justify-between ${isCollapsed ? 'justify-center' : 'px-2'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'bg-white/10'}`} />
                        {!isCollapsed && <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{isAuthenticated ? 'Live' : 'Offline'}</span>}
                    </div>
                    {!isCollapsed && isAuthenticated && (
                        <button onClick={handleLogout} className="text-[9px] font-bold text-white/30 hover:text-rose-400 transition-colors">EXIT</button>
                    )}
                </div>
            </div>
        </aside>
    );
}