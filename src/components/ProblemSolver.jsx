import React, { useState, useEffect } from 'react';
import {
    Check, AlertTriangle, PenLine, ArrowRight, RefreshCcw,
    BookOpen, CheckCircle2, Trophy, StickyNote, Edit3, Save, X
} from 'lucide-react';
import { updateProblemResult, updateProblemInfo } from '../utils/db'; // [수정] updateProblemInfo 추가

export default function ProblemSolver({ topicId, onBack, onComplete, problems: initialProblems, startIndex = 0 }) {
    const problems = initialProblems || [];

    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [userAnswer, setUserAnswer] = useState('');
    const [showResult, setShowResult] = useState(false);
    
    // [신규] UI 모드 상태
    const [showMemo, setShowMemo] = useState(false); // 메모장 표시 여부
    const [isEditMode, setIsEditMode] = useState(false); // 문제 수정 모드 여부

    // 현재 문제 데이터 상태 (수정 가능하도록 state로 관리)
    const [currentProblem, setCurrentProblem] = useState(null);
    const [memoText, setMemoText] = useState('');

    // 문제 변경 시 데이터 동기화
    useEffect(() => {
        const p = problems[currentIndex];
        if (p) {
            setCurrentProblem(p);
            setMemoText(p.memo || ''); // 기존 메모 불러오기
            setUserAnswer('');
            setShowResult(false);
            setShowMemo(false);
            setIsEditMode(false);
        }
    }, [currentIndex, problems]);

    // 채점 로직
    const analyzeAnswer = () => {
        if (!currentProblem) return null;

        const keywords = currentProblem.keywords || [];
        if (!userAnswer.trim() || keywords.length === 0) {
            return { score: 0, percentage: 0, matched: [], missing: keywords };
        }
        const matched = keywords.filter(keyword =>
            userAnswer.includes(keyword) || userAnswer.includes(keyword.replace(/\s+/g, ''))
        );
        const missing = keywords.filter(keyword => !matched.includes(keyword));
        const percentage = keywords.length > 0 
            ? Math.round((matched.length / keywords.length) * 100) 
            : 0;
        return { percentage, matched, missing };
    };

    const result = showResult ? analyzeAnswer() : null;

    // 제출 핸들러
    const handleSubmit = async () => {
        if (!userAnswer.trim()) {
            alert("답안을 입력해주세요!");
            return;
        }
        const { percentage } = analyzeAnswer();
        setShowResult(true);

        try {
            if (currentProblem?.id) {
                await updateProblemResult(currentProblem.id, percentage);
            }
        } catch (error) {
            console.error("점수 저장 실패:", error);
        }
    };

    // 다음 문제 핸들러
    const handleNext = () => {
        if (currentIndex < problems.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            if (onComplete) onComplete();
            else alert("모든 문제를 완료했습니다! 🎉");
        }
    };

    // [신규] 메모 저장 핸들러
    const handleSaveMemo = async () => {
        try {
            await updateProblemInfo(currentProblem.id, { memo: memoText });
            // 로컬 상태 업데이트 (리스트에 즉시 반영은 안 되지만 현재 화면엔 반영)
            problems[currentIndex].memo = memoText; 
            alert("메모가 저장되었습니다 📝");
        } catch (e) {
            alert("저장 실패");
        }
    };

    // [신규] 문제 내용 수정 저장 핸들러
    const handleSaveEdit = async () => {
        try {
            // 키워드는 쉼표로 구분하여 배열로 변환
            const keywordArray = Array.isArray(currentProblem.keywords) 
                ? currentProblem.keywords 
                : String(currentProblem.keywords).split(',').map(k => k.trim());

            await updateProblemInfo(currentProblem.id, {
                title: currentProblem.title,
                content: currentProblem.question, // DB 필드명 주의 (content vs question)
                answer: currentProblem.modelAnswer,
                keywords: keywordArray
            });
            setIsEditMode(false);
            alert("문제가 수정되었습니다 ✅");
        } catch (e) {
            alert("수정 실패");
        }
    };

    if (!currentProblem) return <div className="p-10 text-center">문제를 불러올 수 없습니다.</div>;

    // 하이라이팅 컴포넌트
    const HighlightedUserAnswer = () => {
        if (!result) return null;
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
        <div className="relative flex flex-col h-full bg-slate-950 text-white overflow-hidden">
            <div className="flex flex-col h-full p-6 overflow-y-auto animate-in fade-in duration-300">
                
                {/* 상단 네비게이션 */}
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

                {/* 메인 컨텐츠 */}
                <div className="w-full max-w-4xl mx-auto space-y-6 pb-20"> 
                    
                    {/* 문제 카드 (수정 모드 지원) */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden group">
                        
                        {/* 우측 상단 툴바 */}
                        <div className="absolute top-4 right-4 flex gap-2 z-20">
                            <button 
                                onClick={() => setShowMemo(!showMemo)} 
                                className={`p-2 rounded-lg transition-colors ${showMemo ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                title="나만의 메모"
                            >
                                <StickyNote size={18} />
                            </button>
                            <button 
                                onClick={() => setIsEditMode(!isEditMode)} 
                                className={`p-2 rounded-lg transition-colors ${isEditMode ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                title="문제 수정"
                            >
                                <Edit3 size={18} />
                            </button>
                        </div>

                        {/* 배경 데코 */}
                        {!isEditMode && (
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                                <PenLine size={120} />
                            </div>
                        )}
                        
                        <div className="relative z-10">
                            {/* 태그 영역 */}
                            <div className="flex gap-2 mb-4">
                                <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-lg border border-blue-500/30">
                                    {currentProblem.subject || "서술형 연습"}
                                </span>
                            </div>

                            {/* 문제 본문 (뷰어 vs 에디터) */}
                            {isEditMode ? (
                                <div className="space-y-3 animate-in fade-in">
                                    <input 
                                        value={currentProblem.title}
                                        onChange={(e) => setCurrentProblem({...currentProblem, title: e.target.value})}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white font-bold"
                                        placeholder="문제 제목"
                                    />
                                    <textarea 
                                        value={currentProblem.question}
                                        onChange={(e) => setCurrentProblem({...currentProblem, question: e.target.value})}
                                        className="w-full h-32 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-200"
                                        placeholder="문제 내용"
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setIsEditMode(false)} className="px-3 py-1 text-slate-400 hover:text-white text-sm">취소</button>
                                        <button onClick={handleSaveEdit} className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-500 flex items-center gap-1">
                                            <Save size={14} /> 저장
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight whitespace-pre-wrap">
                                    {currentProblem.question}
                                </h1>
                            )}
                        </div>
                    </div>

                    {/* [신규] 나만의 메모장 (토글형) */}
                    {showMemo && (
                        <div className="bg-amber-100 rounded-xl border-l-4 border-amber-400 p-4 shadow-lg animate-in slide-in-from-top-2 text-slate-800 relative">
                            <h3 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                                <StickyNote size={18} /> 나만의 암기 비법
                            </h3>
                            <textarea
                                value={memoText}
                                onChange={(e) => setMemoText(e.target.value)}
                                placeholder="이 문제의 암기 팁, 청킹, 주의할 점을 적어두세요."
                                className="w-full h-24 bg-white/50 border border-amber-200 rounded p-3 text-sm focus:outline-none focus:bg-white transition-colors resize-none"
                            />
                            <div className="flex justify-end mt-2">
                                <button 
                                    onClick={handleSaveMemo}
                                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-1"
                                >
                                    <Save size={14} /> 메모 저장
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 입력 및 결과 화면 */}
                    {!showResult ? (
                        <div className="bg-white rounded-xl shadow-xl overflow-hidden border-2 border-slate-700 focus-within:border-blue-500 transition-colors relative">
                            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                                <div className="flex items-center gap-2">
                                    <PenLine size={14} /> Your Answer
                                </div>
                            </div>
                            <textarea
                                value={userAnswer}
                                onChange={(e) => setUserAnswer(e.target.value)}
                                placeholder="이곳에 답안을 서술하세요..."
                                className="w-full h-64 p-6 bg-slate-50 text-slate-900 text-lg leading-relaxed outline-none resize-none placeholder:text-slate-400 font-sans"
                                spellCheck="false"
                            />
                            <div className="absolute bottom-4 right-4 flex gap-2">
                                <button
                                    onClick={handleSubmit}
                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-blue-500/30 transition-all transform hover:-translate-y-1 active:translate-y-0"
                                >
                                    <Check size={20} /> 제출
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
                            {/* 점수 요약 */}
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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* 내 답안 */}
                                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl">
                                    <h3 className="text-slate-900 font-bold mb-4 flex items-center gap-2">
                                        <CheckCircle2 size={20} className="text-blue-600" /> 나의 답안 분석
                                    </h3>
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 h-64 overflow-y-auto">
                                        <HighlightedUserAnswer />
                                    </div>
                                </div>

                                {/* 모범 답안 (수정 가능) */}
                                <div className="space-y-4">
                                    <div className="bg-emerald-900/30 rounded-2xl p-6 border border-emerald-500/30 relative group/answer">
                                        <h3 className="text-emerald-400 font-bold mb-4 flex items-center gap-2">
                                            <BookOpen size={20} /> 모범 답안
                                            {isEditMode && <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded ml-2">수정 모드</span>}
                                        </h3>
                                        
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

                                    {/* 누락 키워드 */}
                                    {result.missing.length > 0 && (
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
                    )}
                </div>
            </div>
        </div>
    );
}