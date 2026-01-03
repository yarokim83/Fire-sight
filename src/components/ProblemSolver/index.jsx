import React from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import { useProblemSolver } from './useProblemSolver';
import ProblemCard from './ProblemCard';
import AnswerInput from './AnswerInput';
import GradingResult from './GradingResult';

const ProblemSolver = ({ onBack, onComplete, problems: initialProblems, startIndex = 0 }) => {
    // [FIX] onBack을 hook에 전달
    const { state, actions } = useProblemSolver(initialProblems, startIndex, onComplete, onBack);
    const { currentProblem, currentIndex, problems, showResult } = state;

    if (!currentProblem) return <div className="p-10 text-center text-white">문제를 불러올 수 없습니다.</div>;

    return (
        <div className="relative flex flex-col h-full bg-slate-950 text-white overflow-hidden">
            <div className="flex flex-col h-full p-6 overflow-y-auto animate-in fade-in duration-300">
                <div className="flex items-center justify-between mb-8 z-10">
                    <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-bold transition-colors">
                        <ArrowRight className="rotate-180" size={16} /> 목록으로
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-slate-500 font-mono">
                            <BookOpen size={14} />
                            <span>Problem {currentIndex + 1} / {problems.length}</span>
                        </div>
                    </div>
                </div>

                <div className="w-full max-w-4xl mx-auto space-y-6 pb-20"> 
                    <ProblemCard state={state} actions={actions} />

                    {!showResult ? (
                        <AnswerInput state={state} actions={actions} />
                    ) : (
                        <GradingResult state={state} actions={actions} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProblemSolver;