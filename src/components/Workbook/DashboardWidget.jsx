import React, { useMemo } from 'react';
import { PieChart, AlertCircle, Zap, CheckCircle2, RefreshCcw, BookOpen } from 'lucide-react';

const DashboardWidget = ({ problems, onReview, isUltraCompact = true }) => {
    const stats = useMemo(() => {
        const total = problems.length;
        if (total === 0) return null;

        const mastered = problems.filter(p => p.lastScore === 100).length;
        const review = problems.filter(p => p.studyCount > 0 && p.lastScore < 100).length;
        const fresh = total - mastered - review;
        
        const masteryRate = Math.round((mastered / total) * 100);

        const subjectCounts = {};
        problems.forEach(p => {
            if (p.studyCount > 0 && p.lastScore < 100) {
                const subj = p.subject || "기타";
                subjectCounts[subj] = (subjectCounts[subj] || 0) + 1;
            }
        });
        const sortedWeakSubjects = Object.entries(subjectCounts).sort((a,b) => b[1] - a[1]);
        const weakSubject = sortedWeakSubjects.length > 0 ? sortedWeakSubjects[0] : null;

        return { total, mastered, review, fresh, masteryRate, weakSubject };
    }, [problems]);

    if (!stats) return null;

    // 🟢 울트라 컴팩트 모드 (Workbook 상단용)
    if (isUltraCompact) {
        return (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 py-1 px-3 bg-slate-800/30 border border-slate-700/50 rounded-xl backdrop-blur-sm shadow-inner">
                
                {/* 1. 정복률 요약 */}
                <div className="flex items-center gap-2 pr-4 border-r border-slate-700/50">
                    <div className="relative w-8 h-8">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                            <circle className="text-slate-700" strokeWidth="4" stroke="currentColor" fill="transparent" r="16" cx="18" cy="18" />
                            <circle className="text-blue-500 transition-all duration-1000" strokeWidth="4" strokeDasharray={`${stats.masteryRate}, 100`} strokeLinecap="round" stroke="currentColor" fill="transparent" r="16" cx="18" cy="18" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white">
                            {stats.masteryRate}%
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold leading-none mb-0.5">MASTERY</span>
                        <span className="text-[11px] text-slate-200 font-mono leading-none">{stats.mastered}/{stats.total}</span>
                    </div>
                </div>

                {/* 2. 상태별 카운트 (인라인) */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-emerald-500" />
                        <span className="text-[11px] font-bold text-slate-300">{stats.mastered}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <RefreshCcw size={12} className="text-amber-500" />
                        <span className="text-[11px] font-bold text-slate-300">{stats.review}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <BookOpen size={12} className="text-slate-500" />
                        <span className="text-[11px] font-bold text-slate-300">{stats.fresh}</span>
                    </div>
                </div>

                {/* 3. 취약 과목 및 즉시 복습 버튼 */}
                {stats.weakSubject && (
                    <div className="ml-auto flex items-center gap-3 pl-4 border-l border-slate-700/50">
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] text-amber-500/80 font-bold uppercase tracking-tighter">Weak point</span>
                            <span className="text-[11px] text-white font-bold max-w-[100px] truncate">{stats.weakSubject[0]}</span>
                        </div>
                        <button 
                            onClick={() => onReview(stats.weakSubject[0])}
                            className="flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-1 rounded-md hover:bg-amber-500/20 transition-all text-[10px] font-bold active:scale-95 shadow-lg shadow-amber-500/5"
                        >
                            <Zap size={10} fill="currentColor" />
                            바로 복습
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // ⚪ 기본 모드 (기존 3단 그리드 레이아웃 유지)
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* ... 기존의 큰 카드 3개 코드 (필요 시 유지, 혹은 삭제 가능) ... */}
            {/* (여기에 기존 제공해주신 원본 return 코드를 넣으시면 됩니다) */}
        </div>
    );
};

export default DashboardWidget;