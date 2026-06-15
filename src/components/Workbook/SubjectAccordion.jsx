import React, { useState, useMemo } from 'react';
import { 
    ChevronDown, CheckCircle2, RefreshCcw, Sparkles, Folder, 
    Calculator, PenTool, Image as ImageIcon, Volume2 
} from 'lucide-react';

const SubjectAccordion = ({ subject, problems, onSelectProblem, onDeleteProblem, initialExpanded = false, cachedTtsProblemIds = new Set() }) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const completedCount = useMemo(() => problems.filter(p => p.lastScore === 100).length, [problems]);
  const totalCount = problems.length;

  const getStatusIcon = (problem) => {
    if (problem.lastScore === 100) return <CheckCircle2 className="text-emerald-500" size={16} />;
    if (problem.studyCount > 0) return <RefreshCcw className="text-amber-500" size={16} />;
    return <Sparkles className="text-blue-500" size={16} />;
  };

  const getBadges = (item) => {
      const badges = [];
      if ((cachedTtsProblemIds && cachedTtsProblemIds.has(item.id)) || item.hasPremiumAudio === true) {
          badges.push(
              <span key="tts" className="flex items-center gap-0.5 text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  <Volume2 size={10} /> AI 음성
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

  return (
    <div className="border border-white/10 bg-white/[0.01] backdrop-blur-xl rounded-2xl overflow-hidden transition-all duration-300 shadow-lg">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-5 bg-white/[0.01] hover:bg-white/[0.04] active:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <Folder className="text-blue-400" size={20} />
          <span className="font-bold text-lg text-white">{subject}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm font-mono text-slate-400">
            <span className={completedCount === totalCount ? 'text-emerald-400' : 'text-slate-400'}>{completedCount}</span>
            <span className="text-slate-600"> / </span>
            <span>{totalCount}</span>
          </div>
          <ChevronDown 
            className={`text-slate-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
            size={22} 
          />
        </div>
      </button>

      {isExpanded && (
        <div className="p-2 space-y-1 animate-in fade-in duration-300 slide-in-from-top-2">
          {problems.map(item => (
            <div 
              key={item.id}
              onClick={() => onSelectProblem(item)}
              className="relative flex items-center gap-4 p-3 rounded-xl cursor-pointer hover:bg-white/[0.05] group transition-all duration-300"
            >
              {getStatusIcon(item)}
              
              {/* [FIX] pr-8 제거: 삭제 버튼이 없어졌으므로 텍스트 영역을 최대로 활용 */}
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="truncate text-slate-300 group-hover:text-blue-300 text-sm font-medium">
                        {item.title}
                    </span>
                    <div className="flex gap-1 shrink-0">
                        {getBadges(item)}
                    </div>
                </div>
                <div className="text-xs text-slate-500 truncate">
                    {item.tags.map(t => `#${t}`).join(' ')}
                </div>
              </div>
              
              <div className="flex items-center gap-3 text-xs text-slate-500 font-mono shrink-0">
                <span>{item.studyCount}회</span>
                <span className={item.lastScore === 100 ? 'text-emerald-500' : (item.studyCount > 0 ? 'text-amber-500' : 'text-slate-500')}>
                    {item.lastScore}점
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SubjectAccordion;