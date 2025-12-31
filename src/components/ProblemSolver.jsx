import React, { useState, useEffect } from 'react';
import {
    Check, AlertTriangle, PenLine, ArrowRight, RefreshCcw,
    BookOpen, CheckCircle2, Trophy, Save, PenTool // PenTool 아이콘 추가
} from 'lucide-react';
import { saveAnswer, getAnswer } from '../utils/db';
import DrawingCanvas from './DrawingCanvas'; // DrawingCanvas 컴포넌트 import 경로 확인 필요

// 화면 크기 감지 훅 (캔버스 해상도 최적화용)
const useWindowSize = () => {
    const [windowSize, setWindowSize] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 0,
        height: typeof window !== 'undefined' ? window.innerHeight : 0,
    });

    useEffect(() => {
        function handleResize() {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        }
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);
    return windowSize;
};

// =====================================================================
// MAIN COMPONENT
// =====================================================================
export default function ProblemSolver({ topicId, onBack, onComplete, problems: initialProblems }) {
    // Use passed problems or empty array
    const problems = initialProblems || [];

    // STATE
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userAnswer, setUserAnswer] = useState('');
    const [showResult, setShowResult] = useState(false);
    
    // Drawing State
    const [isDrawingMode, setIsDrawingMode] = useState(false);
    const { width, height } = useWindowSize(); // 윈도우 크기 가져오기

    const problem = problems[currentIndex];

    // Reset state and Load Saved Answer on problem change
    useEffect(() => {
        setUserAnswer('');
        setShowResult(false);
        setIsSaving(false);
        setIsDrawingMode(false); // 문제 변경 시 드로잉 모드 해제 (선택 사항)

        if (problem) {
            getAnswer(problem.id).then(saved => {
                if (saved) setUserAnswer(saved);
            }).catch(console.error);
        }
    }, [currentIndex, topicId, problem]);

    // Auto-Save Effect
    const [isSaving, setIsSaving] = useState(false);
    useEffect(() => {
        if (!problem || !userAnswer) return;

        const timer = setTimeout(async () => {
            setIsSaving(true);
            try {
                await saveAnswer(problem.id, userAnswer);
            } catch (err) {
                console.error("Auto-save failed", err);
            } finally {
                setTimeout(() => setIsSaving(false), 500);
            }
        }, 1000); // 1s debounce

        return () => clearTimeout(timer);
    }, [userAnswer, problem]);

    // [수정] 채점 로직 안전장치 추가
    const analyzeAnswer = () => {
        // 1. 키워드 데이터가 없는 경우 방어 코드
        const keywords = problem.keywords || []; 
        
        // 2. 답안이 없거나 키워드가 아예 없는 경우 0점 처리
        if (!userAnswer.trim() || keywords.length === 0) {
            return { score: 0, percentage: 0, matched: [], missing: keywords };
        }

        // 3. 채점 로직
        const matched = keywords.filter(keyword =>
            userAnswer.includes(keyword) || userAnswer.includes(keyword.replace(/\s+/g, ''))
        );
        const missing = keywords.filter(keyword =>
            !matched.includes(keyword)
        );

        // 4. 점수 계산 (0으로 나누기 방지)
        const percentage = keywords.length > 0 
            ? Math.round((matched.length / keywords.length) * 100) 
            : 0;

        return {
            percentage,
            matched,
            missing
        };
    };

    const result = showResult ? analyzeAnswer() : null;

    // [수정] 핸들러 디버깅용 로그 추가
    const handleSubmit = () => {
        console.log("👆 제출 버튼 클릭됨");
        console.log("입력된 답안:", userAnswer);
        
        if (!userAnswer.trim()) {
            alert("답안을 입력해주세요!");
            return;
        }
        
        // 에러가 나지 않도록 try-catch로 감싸서 확인
        try {
            setShowResult(true);
            setIsDrawingMode(false); 
            console.log("✅ 결과 화면으로 전환");
        } catch (error) {
            console.error("❌ 제출 처리 중 에러 발생:", error);
            alert("채점 중 오류가 발생했습니다.");
        }
    };

    const handleNext = () => {
        if (currentIndex < problems.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            if (onComplete) onComplete();
            else alert("모든 문제를 완료했습니다! 🎉");
        }
    };

    // Better highlighter for "My Answer Analysis"
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
            
            {/* Drawing Canvas Overlay */}
            <DrawingCanvas 
                width={width}
                height={height}
                isActive={isDrawingMode}
                onClose={() => setIsDrawingMode(false)}
            />

            {/* Main Content Area - 드로잉 모드일 때 스크롤 방지 등의 처리를 할 수도 있으나, 
                DrawingCanvas가 pointer-events를 제어하므로 그대로 둡니다. */}
            <div className={`flex flex-col h-full p-6 overflow-y-auto animate-in fade-in duration-300 ${isDrawingMode ? 'overflow-hidden' : ''}`}>
                
                {/* Header / Nav */}
                <div className="flex items-center justify-between mb-8 z-10">
                    <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-bold transition-colors">
                        <ArrowRight className="rotate-180" size={16} /> 나가기
                    </button>
                    
                    <div className="flex items-center gap-4">
                        {/* 펜 모드 토글 버튼 (헤더) */}
                        <button 
                            onClick={() => setIsDrawingMode(!isDrawingMode)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold transition-all border ${
                                isDrawingMode 
                                ? 'bg-amber-500 text-white border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]' 
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                            }`}
                        >
                            <PenTool size={14} />
                            {isDrawingMode ? 'Drawing On' : 'Pen Mode'}
                        </button>

                        <div className="flex items-center gap-2 text-sm text-slate-500 font-mono">
                            <BookOpen size={14} />
                            <span>Problem {currentIndex + 1} / {problems.length}</span>
                        </div>
                    </div>
                </div>

                {/* Problem Card Container */}
                <div className="w-full max-w-4xl mx-auto space-y-6 pb-20"> {/* pb-20 for bottom space */}
                    
                    {/* Question Section */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <PenLine size={120} />
                        </div>
                        <div className="relative z-10">
                            <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-lg mb-4 border border-blue-500/30">
                                서술형 연습
                            </span>
                            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                                {problem.question}
                            </h1>
                        </div>
                    </div>

                    {/* Input Section */}
                    {!showResult ? (
                        <div className="bg-white rounded-xl shadow-xl overflow-hidden border-2 border-slate-700 focus-within:border-blue-500 transition-colors relative">
                            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                                <div className="flex items-center gap-2">
                                    <PenLine size={14} /> Your Answer
                                </div>
                                {isSaving && <div className="flex items-center gap-1 text-emerald-500 animate-pulse"><Save size={12} /> Saving...</div>}
                            </div>
                            
                            {/* Text Area */}
                            <textarea
                                value={userAnswer}
                                onChange={(e) => setUserAnswer(e.target.value)}
                                placeholder="이곳에 답안을 서술하거나, 상단의 펜 모드를 켜서 필기하세요..."
                                className="w-full h-64 p-6 bg-slate-50 text-slate-900 text-lg leading-relaxed outline-none resize-none placeholder:text-slate-400 font-sans"
                                spellCheck="false"
                            />

                            <div className="absolute bottom-4 right-4 flex gap-2">
                                {/* Floating Pen Toggle (Optional duplication for convenience) */}
                                <button
                                    onClick={() => setIsDrawingMode(!isDrawingMode)}
                                    className={`p-3 rounded-xl transition-all shadow-lg ${isDrawingMode ? 'bg-amber-500 text-white' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}
                                    title="Toggle Pen"
                                >
                                    <PenTool size={20} />
                                </button>

                                <button
                                    onClick={handleSubmit}
                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-blue-500/30 transition-all transform hover:-translate-y-1 active:translate-y-0"
                                >
                                    <Check size={20} /> 제출
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Result Section (기존 코드 동일) */
                        <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
                             {/* ... Result UI Code (기존과 동일) ... */}
                             {/* (여기에 기존 결과 화면 코드를 그대로 두시면 됩니다) */}
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
                                            {result.percentage}% <span className="text-base text-slate-500 font-normal">({result.matched.length}/{problem.keywords.length})</span>
                                        </p>
                                    </div>
                                </div>
                                <button onClick={handleNext} className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all border border-slate-700 hover:border-slate-500">
                                    다음 문제 <ArrowRight size={18} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl">
                                    <h3 className="text-slate-900 font-bold mb-4 flex items-center gap-2">
                                        <CheckCircle2 size={20} className="text-blue-600" /> 나의 답안 분석
                                    </h3>
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 h-64 overflow-y-auto">
                                        <HighlightedUserAnswer />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="bg-emerald-900/30 rounded-2xl p-6 border border-emerald-500/30">
                                        <h3 className="text-emerald-400 font-bold mb-4 flex items-center gap-2">
                                            <BookOpen size={20} /> 모범 답안
                                        </h3>
                                        <p className="text-emerald-100 whitespace-pre-wrap leading-relaxed text-sm">
                                            {problem.modelAnswer}
                                        </p>
                                    </div>
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