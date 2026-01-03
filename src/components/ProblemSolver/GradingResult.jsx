// src/components/ProblemSolver/GradingResult.jsx
import React from 'react';
import { CheckCircle2, Trophy, RefreshCcw, ArrowRight, CheckCircle2 as OIcon, XCircle, BookOpen, AlertTriangle } from 'lucide-react';

const GradingResult = ({ state, actions }) => {
    const { result, currentProblem, isEditMode, inputMode, userAnswer, currentIndex, problems } = state;
    const { handleNext, handleManualGrade, setCurrentProblem, handleSaveEdit } = actions;

    const HighlightedUserAnswer = () => {
        if (!result || inputMode === 'draw') return null;
        if (result.matched.length === 0) return <p className="text-slate-700 whitespace-pre-wrap">{userAnswer}</p>;
        const pattern = new RegExp(`(${result.matched.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
        const parts = userAnswer.split(pattern);
        return (
            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                {parts.map((part, i) => {
                    if (result.matched.includes(part)) {
                        return <span key={i} className="text-emerald-600 font-bold bg-emerald-100 px-1 rounded mx-0.5 border border-emerald-200">{part}</span>;
                    }
                    return part;
                })}
            </p>
        );
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
            {/* 상단: 점수 또는 자가채점 버튼 */}
            {result.manualGradingRequired ? (
                <div className="flex flex-col items-center justify-center bg-slate-900/80 p-6 rounded-2xl border border-slate-800 text-center space-y-4">
                    <h3 className="text-xl font-bold text-white">자가 채점 (Self-Evaluation)</h3>
                    <p className="text-slate-400 text-sm">드로잉/계산 문제는 자동 채점이 어렵습니다.<br/>아래 모범 답안과 비교하여 채점해주세요.</p>
                    <div className="flex gap-4">
                        <button onClick={() => handleManualGrade(true)} className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg transition-all">
                            <OIcon size={20} /> 정답 (O)
                        </button>
                        <button onClick={() => handleManualGrade(false)} className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold shadow-lg transition-all">
                            <XCircle size={20} /> 오답 (X)
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-between bg-slate-900/80 p-6 rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-4">
                        {result.percentage >= 70 ? (
                            <div className="p-3 bg-emerald-500/20 rounded-full text-emerald-500"><Trophy size={32} /></div>
                        ) : (
                            <div className="p-3 bg-amber-500/20 rounded-full text-amber-500"><RefreshCcw size={32} /></div>
                        )}
                        <div>
                            <p className="text-sm text-slate-400">키워드 달성률</p>
                            <p className={`text-2xl font-bold ${result.percentage >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {result.percentage}% <span className="text-base text-slate-500 font-normal">({result.matched.length}/{currentProblem.keywords.length})</span>
                            </p>
                        </div>
                    </div>
                    <button onClick={handleNext} className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all border border-slate-700 hover:border-slate-500">
                        {currentIndex < problems.length - 1 ? (
                            <>다음 문제 <ArrowRight size={18} /></>
                        ) : (
                            <>학습 완료 <CheckCircle2 size={18} /></>
                        )}
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 내 답안 (텍스트 모드일 때만) */}
                {inputMode === 'text' && (
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl">
                        <h3 className="text-slate-900 font-bold mb-4 flex items-center gap-2">
                            <CheckCircle2 size={20} className="text-blue-600" /> 나의 답안 분석
                        </h3>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 h-64 overflow-y-auto">
                            <HighlightedUserAnswer />
                        </div>
                    </div>
                )}

                {/* 모범 답안 */}
                <div className={`space-y-4 ${inputMode === 'draw' ? 'col-span-2' : ''}`}>
                    <div className="bg-emerald-900/30 rounded-2xl p-6 border border-emerald-500/30 relative group/answer">
                        <h3 className="text-emerald-400 font-bold mb-4 flex items-center gap-2">
                            <BookOpen size={20} /> 모범 답안
                            {isEditMode && <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded ml-2">수정 모드</span>}
                        </h3>
                        
                        {/* 답안지 이미지 */}
                        {currentProblem.answerImageUrl && !isEditMode && (
                            <div className="mb-4 rounded-lg overflow-hidden border border-emerald-500/30">
                                <img src={currentProblem.answerImageUrl} alt="Answer Key" className="w-full object-contain" />
                            </div>
                        )}

                        {isEditMode ? (
                            <div className="space-y-2">
                                <textarea 
                                    value={currentProblem.modelAnswer}
                                    onChange={(e) => setCurrentProblem({...currentProblem, modelAnswer: e.target.value})}
                                    className="w-full h-32 bg-slate-800/80 border border-emerald-500/50 rounded p-2 text-emerald-100 text-sm"
                                />
                                <input 
                                    value={Array.isArray(currentProblem.keywords) ? currentProblem.keywords.join(', ') : currentProblem.keywords}
                                    onChange={(e) => setCurrentProblem({...currentProblem, keywords: e.target.value.split(',').map(k => k.trim())})}
                                    className="w-full bg-slate-800/80 border border-emerald-500/50 rounded p-2 text-emerald-100 text-sm"
                                    placeholder="키워드 (쉼표로 구분)"
                                />
                                <button onClick={handleSaveEdit} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-bold">
                                    답안 및 키워드 저장
                                </button>
                            </div>
                        ) : (
                            <p className="text-emerald-100 whitespace-pre-wrap leading-relaxed text-sm">
                                {currentProblem.modelAnswer}
                            </p>
                        )}
                    </div>

                    {/* 누락 키워드 (텍스트 모드만) */}
                    {inputMode === 'text' && result?.missing.length > 0 && (
                        <div className="bg-red-900/20 rounded-2xl p-6 border border-red-500/30">
                            <h3 className="text-red-400 font-bold mb-4 flex items-center gap-2">
                                <AlertTriangle size={20} /> 누락된 키워드
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {result.missing.map((kw, i) => (
                                    <span key={i} className="px-3 py-1 bg-red-500/20 text-red-300 rounded-lg text-sm border border-red-500/30">
                                        {kw}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GradingResult;