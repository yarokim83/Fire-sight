import React from 'react';
import { 
    CheckCircle2, Trophy, RefreshCcw, ArrowRight, 
    XCircle, BookOpen, AlertTriangle, Trash2, 
    Target, Calculator, Edit3, Save 
} from 'lucide-react';

const GradingResult = ({ state, actions }) => {
    const { result, currentProblem, isEditMode, inputMode, userAnswer, currentIndex, problems } = state;
    const { handleNext, handleManualGrade, setCurrentProblem, handleSaveEdit, handleDeleteImage } = actions;

    // 🔴 [데이터 참조 최적화] 모든 참조를 신규 구조(pts)로 통일하고 기본값 설정
    const pts = result || { 
        matchedTerms: [], missingTerms: [], 
        matchedNumbers: [], missingNumbers: [], 
        percentage: 0, manualGradingRequired: false 
    };

    // 답안 내 키워드 하이라이트 로직 (용어와 수치 모두 강조)
    const HighlightedUserAnswer = () => {
        if (!result || inputMode === 'draw') return null;
        
        const allMatched = [...(pts.matchedTerms || []), ...(pts.matchedNumbers || [])];
        if (allMatched.length === 0) return <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{userAnswer}</p>;

        // 특수문자 이스케이프 처리하여 정규식 패턴 생성
        const pattern = new RegExp(`(${allMatched.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
        const parts = userAnswer.split(pattern);

        return (
            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                {parts.map((part, i) => {
                    const isTerm = pts.matchedTerms?.includes(part);
                    const isNum = pts.matchedNumbers?.includes(part);
                    
                    if (isTerm || isNum) {
                        return (
                            <span key={i} className={`font-black px-1.5 rounded mx-0.5 border ${
                                isTerm ? 'text-emerald-700 bg-emerald-100 border-emerald-200' : 'text-blue-700 bg-blue-100 border-blue-200'
                            }`}>
                                {part}
                            </span>
                        );
                    }
                    return part;
                })}
            </p>
        );
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500 pb-20">
            {/* --- 상단: 점수 및 액션 섹션 --- */}
            {pts.manualGradingRequired ? (
                <div className="bg-slate-900/90 p-8 rounded-[2rem] border border-slate-800 text-center space-y-4 shadow-2xl">
                    <h3 className="text-xl font-black text-white flex items-center justify-center gap-2">
                        <Edit3 className="text-amber-400" /> 자가 채점 모드
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed">드로잉이나 계산식은 아래 모범 답안과 직접 비교하여 판단해주세요.</p>
                    <div className="flex gap-4 justify-center pt-2">
                        <button onClick={() => handleManualGrade(true)} className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black shadow-lg transition-all active:scale-95">
                            <CheckCircle2 size={20} /> 정답 (O)
                        </button>
                        <button onClick={() => handleManualGrade(false)} className="flex items-center gap-2 px-8 py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black shadow-lg transition-all active:scale-95">
                            <XCircle size={20} /> 오답 (X)
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-900/80 p-6 rounded-[2rem] border border-slate-800 gap-6 shadow-xl">
                    <div className="flex items-center gap-5">
                        <div className={`p-4 rounded-2xl ${pts.percentage >= 70 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'}`}>
                            {pts.percentage >= 70 ? <Trophy size={40} /> : <RefreshCcw size={40} />}
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Grading Accuracy</p>
                            <p className={`text-4xl font-black ${pts.percentage >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {pts.percentage}%
                                <span className="text-base text-slate-500 font-normal ml-3">
                                    ({(pts.matchedTerms?.length || 0) + (pts.matchedNumbers?.length || 0)} 키워드 일치)
                                </span>
                            </p>
                        </div>
                    </div>
                    <button onClick={handleNext} className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all border border-slate-700 shadow-lg active:scale-95">
                        {currentIndex < problems.length - 1 ? <><span className="text-sm">다음 문제</span> <ArrowRight size={20} /></> : <><span className="text-sm">학습 완료</span> <CheckCircle2 size={20} /></>}
                    </button>
                </div>
            )}

            {/* --- 메인 컨텐츠 그리드 --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* 왼쪽: 나의 답안 분석 */}
                <div className="space-y-4">
                    <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-2xl h-full min-h-[450px] flex flex-col">
                        <h3 className="text-slate-900 font-black mb-6 flex items-center gap-2 text-lg">
                            <CheckCircle2 size={24} className="text-blue-600" /> 나의 답안 분석
                        </h3>
                        <div className="flex-1 p-6 bg-slate-50 rounded-2xl border border-slate-100 overflow-y-auto shadow-inner">
                            {inputMode === 'draw' ? (
                                <img src={userAnswer} alt="User Drawing" className="w-full h-auto object-contain" />
                            ) : (
                                <HighlightedUserAnswer />
                            )}
                        </div>
                    </div>
                </div>

                {/* 오른쪽: 정밀 피드백 리포트 */}
                <div className="space-y-6">
                    {!pts.manualGradingRequired && (
                        <div className="grid grid-cols-1 gap-4 animate-in fade-in duration-700">
                            {/* 🟢 필수 용어 매칭 결과 (40%) */}
                            <div className="p-5 bg-emerald-950/10 rounded-2xl border border-emerald-500/20">
                                <h4 className="text-[10px] font-black text-emerald-500 uppercase mb-3 flex items-center gap-2 tracking-tighter">
                                    <Target size={14} /> Mandatory Terms (40%)
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {pts.matchedTerms?.map(t => <span key={t} className="px-2.5 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-black shadow-md">{t}</span>)}
                                    {pts.missingTerms?.map(t => <span key={t} className="px-2.5 py-1.5 bg-slate-900 text-slate-500 rounded-lg text-xs font-bold border border-slate-800 line-through opacity-50">{t}</span>)}
                                    {(!pts.matchedTerms?.length && !pts.missingTerms?.length) && <span className="text-[10px] text-slate-600 italic">설정된 용어가 없습니다.</span>}
                                </div>
                            </div>
                            {/* 🔵 핵심 수치 매칭 결과 (60%) */}
                            <div className="p-5 bg-blue-950/10 rounded-2xl border border-blue-500/20">
                                <h4 className="text-[10px] font-black text-blue-400 uppercase mb-3 flex items-center gap-2 tracking-tighter">
                                    <Calculator size={14} /> Mandatory Numbers (60%)
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {pts.matchedNumbers?.map(n => <span key={n} className="px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-black shadow-md">{n}</span>)}
                                    {pts.missingNumbers?.map(n => <span key={n} className="px-2.5 py-1.5 bg-slate-900 text-slate-500 rounded-lg text-xs font-bold border border-slate-800 line-through opacity-50">{n}</span>)}
                                    {(!pts.matchedNumbers?.length && !pts.missingNumbers?.length) && <span className="text-[10px] text-slate-600 italic">설정된 수치가 없습니다.</span>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 모범 답안 영역 (수정 모드 포함) */}
                    <div className="bg-emerald-900/20 rounded-[2rem] p-8 border border-emerald-500/20 relative group">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-emerald-400 font-black flex items-center gap-2 text-lg">
                                <BookOpen size={24} /> Model Answer
                            </h3>
                            {isEditMode && <span className="text-[10px] bg-emerald-500 text-white px-3 py-1 rounded-full font-black animate-pulse">EDITING</span>}
                        </div>

                        {/* 답안 이미지 갤러리 */}
                        {!isEditMode && (currentProblem.questionImageUrl || currentProblem.answerImageUrl) && (
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                {currentProblem.questionImageUrl && (
                                    <div className="relative rounded-xl overflow-hidden border border-emerald-500/30 shadow-lg">
                                        <img src={currentProblem.questionImageUrl} alt="Question" className="w-full h-32 object-cover" />
                                        <button onClick={() => handleDeleteImage(currentProblem.id, 'questionImageUrl')} className="absolute top-2 right-2 p-1.5 bg-red-600/80 hover:bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"><Trash2 size={12} /></button>
                                    </div>
                                )}
                                {currentProblem.answerImageUrl && (
                                    <div className="relative rounded-xl overflow-hidden border border-emerald-500/30 shadow-lg">
                                        <img src={currentProblem.answerImageUrl} alt="Answer" className="w-full h-32 object-cover" />
                                        <button onClick={() => handleDeleteImage(currentProblem.id, 'answerImageUrl')} className="absolute top-2 right-2 p-1.5 bg-red-600/80 hover:bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"><Trash2 size={12} /></button>
                                    </div>
                                )}
                            </div>
                        )}

                        {isEditMode ? (
                            <div className="space-y-4">
                                <textarea 
                                    value={currentProblem.modelAnswer || currentProblem.answer || ""}
                                    onChange={(e) => setCurrentProblem({...currentProblem, modelAnswer: e.target.value})}
                                    className="w-full h-40 bg-slate-900/50 border border-emerald-500/30 rounded-2xl p-4 text-emerald-100 text-sm outline-none focus:border-emerald-500 transition-all shadow-inner"
                                    placeholder="모범 답안을 입력하세요"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-emerald-500 ml-1 uppercase">Terms (comma)</label>
                                        <input 
                                            value={currentProblem.gradingPoints?.mandatory_terms?.join(', ') || ''}
                                            onChange={(e) => setCurrentProblem({
                                                ...currentProblem, 
                                                gradingPoints: { ...currentProblem.gradingPoints, mandatory_terms: e.target.value.split(',').map(v => v.trim()).filter(v => v) }
                                            })}
                                            className="w-full bg-slate-900/50 border border-emerald-500/20 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-500"
                                            placeholder="필수 용어"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-blue-500 ml-1 uppercase">Numbers (comma)</label>
                                        <input 
                                            value={currentProblem.gradingPoints?.mandatory_numbers?.join(', ') || ''}
                                            onChange={(e) => setCurrentProblem({
                                                ...currentProblem, 
                                                gradingPoints: { ...currentProblem.gradingPoints, mandatory_numbers: e.target.value.split(',').map(v => v.trim()).filter(v => v) }
                                            })}
                                            className="w-full bg-slate-900/50 border border-blue-500/20 rounded-xl p-3 text-xs text-white outline-none focus:border-blue-500"
                                            placeholder="핵심 수치"
                                        />
                                    </div>
                                </div>
                                <button onClick={handleSaveEdit} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                                    <Save size={18} /> 수정 내용 저장하기
                                </button>
                            </div>
                        ) : (
                            <p className="text-emerald-100/80 whitespace-pre-wrap leading-relaxed text-sm">
                                {currentProblem.modelAnswer || currentProblem.answer || "등록된 해설이 없습니다."}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GradingResult;