import React, { memo } from 'react'; // 1. memo 불러오기
import { 
    CheckCircle2, RefreshCcw, Sparkles, 
    PenTool, Calculator, Image as ImageIcon, Trash2 
} from 'lucide-react';

// 리스트 뷰를 위한 경량화된 카드 컴포넌트
const ProblemCard = ({ data, onSelect, onDelete, showSubjectBadge = false }) => {
    
    // 데이터가 없는 경우를 대비한 방어 코드
    if (!data) return null;

    // 1. 상태 아이콘 결정 함수
    const getStatusIcon = (problem) => {
        if (problem.lastScore === 100) return <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />;
        if (problem.studyCount > 0) return <RefreshCcw className="text-amber-500 shrink-0" size={20} />;
        return <Sparkles className="text-blue-500 shrink-0" size={20} />;
    };

    // 2. 배지 렌더링 함수
    const getBadges = (item) => {
        const badges = [];
        
        // 과목 배지
        if (showSubjectBadge && item.subject) {
             badges.push(
                <span key="subject" className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded border border-slate-600">
                    {item.subject}
                </span>
            );
        }

        if (item.problemType === 'drawing') {
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

    // 태그 안전 처리
    const tags = Array.isArray(data.tags) ? data.tags : [];

    return (
        <div 
            onClick={onSelect}
            // 2. w-full 추가하여 리스트 너비 꽉 채우기
            className="relative w-full flex items-center gap-4 p-3 rounded-lg cursor-pointer bg-slate-800/40 border border-slate-700/50 hover:bg-blue-500/10 hover:border-blue-500/30 group transition-all"
        >
            {/* 아이콘 */}
            <div className="shrink-0">
                {getStatusIcon(data)}
            </div>
            
            {/* 내용 */}
            <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="truncate text-slate-200 group-hover:text-blue-300 text-sm font-bold">
                        {data.title}
                    </span>
                    <div className="flex gap-1 shrink-0 flex-wrap">
                        {getBadges(data)}
                    </div>
                </div>
                
                {/* 태그 */}
                <div className="flex gap-2 overflow-hidden text-xs text-slate-500 truncate">
                    {tags.length > 0 ? (
                        tags.map((t, i) => <span key={i}>#{t}</span>)
                    ) : (
                        <span className="opacity-50">태그 없음</span>
                    )}
                </div>
            </div>
            
            {/* 통계 및 삭제 */}
            <div className="flex items-center gap-3 shrink-0">
                <div className="hidden sm:flex flex-col items-end text-[10px] font-mono text-slate-500">
                    <span>{data.studyCount}회 학습</span>
                    <span className={data.lastScore === 100 ? 'text-emerald-500' : (data.studyCount > 0 ? 'text-amber-500' : 'text-slate-500')}>
                        최근 {data.lastScore}점
                    </span>
                </div>
                
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="문제 삭제"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
};

// 3. 성능 최적화를 위해 memo로 감싸서 내보내기
export default memo(ProblemCard);