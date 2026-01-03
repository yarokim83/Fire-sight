// src/components/Workbook/DashboardWidget.jsx
import React, { useMemo } from 'react';
import { PieChart, AlertCircle } from 'lucide-react';

const DashboardWidget = ({ problems, onReview }) => {
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

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* 정복률 카드 */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-5 rounded-2xl flex items-center justify-between relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <PieChart size={80} />
                </div>
                <div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Mastery</p>
                    <h3 className="text-3xl font-extrabold text-white">
                        {stats.masteryRate}<span className="text-sm text-slate-500 ml-1">%</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-2">
                        {stats.mastered} / {stats.total} 문제 정복 완료
                    </p>
                </div>
                <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path className="text-slate-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                        <path className="text-blue-500 transition-all duration-1000 ease-out" strokeDasharray={`${stats.masteryRate}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                    </svg>
                </div>
            </div>

            {/* 학습 상태 요약 */}
            <div className="bg-slate-800/50 border border-slate-700 p-5 rounded-2xl flex flex-col justify-center gap-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="text-sm text-slate-300">완료 (Mastered)</span>
                    </div>
                    <span className="text-emerald-400 font-bold">{stats.mastered}</span>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        <span className="text-sm text-slate-300">복습 필요 (Review)</span>
                    </div>
                    <span className="text-amber-400 font-bold">{stats.review}</span>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                        <span className="text-sm text-slate-300">미학습 (New)</span>
                    </div>
                    <span className="text-white font-bold">{stats.fresh}</span>
                </div>
            </div>

            {/* 집중 공략 포인트 */}
            <div className="bg-slate-800/50 border border-slate-700 p-5 rounded-2xl relative overflow-hidden">
                <p className="text-amber-500 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                    <AlertCircle size={12} /> 집중 공략 필요
                </p>
                {stats.weakSubject ? (
                    <div>
                        <h4 className="text-lg font-bold text-white line-clamp-1 mb-1">{stats.weakSubject[0]}</h4>
                        <p className="text-sm text-slate-400">
                            오답/복습 문제 <span className="text-amber-400 font-bold">{stats.weakSubject[1]}개</span>가 쌓여있습니다.
                        </p>
                        <button 
                            onClick={() => onReview(stats.weakSubject[0])}
                            className="mt-3 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-lg hover:bg-amber-500/20 transition-colors"
                        >
                            바로 복습하기 →
                        </button>
                    </div>
                ) : (
                    <div className="h-full flex flex-col justify-center">
                        <p className="text-slate-300 font-medium">현재 취약한 과목이 없습니다.</p>
                        <p className="text-xs text-slate-500">완벽합니다! 새로운 문제에 도전하세요.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardWidget;