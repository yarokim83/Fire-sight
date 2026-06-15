import { 
    CheckCircle2, RefreshCcw, Sparkles, 
    PenTool, Calculator, Image as ImageIcon, Trash2, Volume2 
} from 'lucide-react';

import React, { memo } from 'react';

// 리스트 뷰를 위한 경량화된 카드 컴포넌트
const ProblemCard = ({ data, onSelect, onDelete, showSubjectBadge = false, hasCachedTts = false }) => {
    
    if (!data) return null;

    const getStatusIcon = (problem) => {
        if (problem.lastScore === 100) return <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />;
        if (problem.studyCount > 0) return <RefreshCcw className="text-amber-500 shrink-0" size={20} />;
        return <Sparkles className="text-blue-500 shrink-0" size={20} />;
    };

    const getBadges = (item) => {
        const badges = [];
        
        if (showSubjectBadge && item.subject) {
             badges.push(
                <span key="subject" className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded border border-slate-600">
                    {item.subject}
                </span>
            );
        }

        if (hasCachedTts) {
            badges.push(
                <span key="tts" className="flex items-center gap-0.5 text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    <Volume2 size={10} /> AI 음성
                </span>
            );
        }

        if (item.problemType === 'drawing' || item.problemType === 'visual') {
            badges.push(
                <span key="draw" className="flex items-center gap-0.5 text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/30">
                    <PenTool size={10} /> 도면
                </span>
            );
        }
        if (item.problemType === 'calculation') {
            badges.push(
                <span key="calc" className="flex items-center gap-0.5 text-[10px] bg-pink-500/20 text-pink-400 px-1.5 py-0.5 rounded border border-pink-500/30">
                    <Calculator size={10} /> 계산
                </span>
            );
        }
        if (item.imageUrl || (item.images && item.images.length > 0)) {
            badges.push(
                <span key="img" className="flex items-center gap-0.5 text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-500/30">
                    <ImageIcon size={10} /> IMG
                </span>
            );
        }
        return badges;
    };

    const tags = Array.isArray(data.tags) ? data.tags : [];

    return (
        <div 
            onClick={onSelect}
            className="relative w-full flex items-center gap-4 p-4 rounded-xl cursor-pointer bg-white/[0.02] backdrop-blur-xl border border-white/10 hover:bg-white/[0.05] hover:border-white/20 hover:shadow-[0_0_25px_rgba(255,255,255,0.03)] group transition-all duration-300"
        >
            <div className="shrink-0">
                {getStatusIcon(data)}
            </div>
            
            <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="truncate text-slate-200 group-hover:text-blue-300 text-sm font-bold">
                        {data.title}
                    </span>
                    <div className="flex gap-1 shrink-0 flex-wrap">
                        {getBadges(data)}
                    </div>
                </div>
                
                {/* 🔴 수치 데이터 존재 여부 및 태그 표시 */}
                <div className="flex gap-2 overflow-hidden text-[10px] text-slate-500 items-center">
                    {data.numbers && data.numbers.length > 0 && (
                        <span className="text-blue-400 font-black shrink-0 bg-blue-500/10 px-1 rounded border border-blue-500/20">
                            #수치 추출 완료
                        </span>
                    )}
                    <div className="flex gap-2 truncate opacity-70">
                        {tags.length > 0 ? (
                            tags.map((t, i) => <span key={i}>#{t}</span>)
                        ) : (
                            (!data.numbers || data.numbers.length === 0) && <span className="opacity-50 italic">태그 없음</span>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
                <div className="hidden sm:flex flex-col items-end text-[10px] font-mono text-slate-500">
                    <span>{data.studyCount}회 학습</span>
                    <span className={data.lastScore === 100 ? 'text-emerald-400' : (data.studyCount > 0 ? 'text-amber-400' : 'text-slate-500')}>
                        최근 {data.lastScore}점
                    </span>
                </div>
                
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
};

export default memo(ProblemCard);
