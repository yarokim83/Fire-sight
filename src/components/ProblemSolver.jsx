import React, { useState, useEffect } from 'react';
import {
    Check, AlertTriangle, PenLine, ArrowRight, RefreshCcw,
    BookOpen, CheckCircle2, XCircle, Trophy
} from 'lucide-react';

// =====================================================================
// MOCK DATA: 서술형 문제 (추후 DB/API 연동 가능)
// =====================================================================
export default function ProblemSolver({ topicId, onBack, onComplete, problems: initialProblems }) {
    // Use passed problems or empty array
    const problems = initialProblems || [];

    // STATE
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userAnswer, setUserAnswer] = useState('');
    const [showResult, setShowResult] = useState(false);

    const problem = problems[currentIndex];

    // Reset state on problem change
    useEffect(() => {
        setUserAnswer('');
        setShowResult(false);
    }, [currentIndex, topicId]);

    // Grading Logic
    const analyzeAnswer = () => {
        if (!userAnswer.trim()) return { score: 0, matched: [], missing: problem.keywords };

        const matched = problem.keywords.filter(keyword =>
            userAnswer.includes(keyword) || userAnswer.includes(keyword.replace(/\s+/g, ''))
        );
        const missing = problem.keywords.filter(keyword =>
            !matched.includes(keyword)
        );

        return {
            percentage: Math.round((matched.length / problem.keywords.length) * 100),
            matched,
            missing
        };
    };

    const result = showResult ? analyzeAnswer() : null;

    // Handlers
    const handleSubmit = () => {
        if (!userAnswer.trim()) {
            alert("답안을 입력해주세요!");
            return;
        }
        setShowResult(true);
    };

    const handleNext = () => {
        if (currentIndex < problems.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            if (onComplete) onComplete();
            else alert("모든 문제를 완료했습니다! 🎉");
        }
    };

    // Render Helper: Highlight User Answer
    const renderHighlightedAnswer = () => {
        if (!result) return userAnswer;

        let content = userAnswer;
        // Simple string replacement for highlighting (Limitations: overlaps not handled perfect, but good for prototype)
        // We split by keywords to insert spans
        // Actually, a safer way for React rendering:

        // This is a simplified interactive highlighting logic:
        return (
            <div className="whitespace-pre-wrap leading-relaxed text-slate-800">
                {userAnswer.split(/(\s+)/).map((word, i) => {
                    // Check if word contains any matched keyword (naive check)
                    const isKeyword = result.matched.some(k => word.includes(k) || k.includes(word));
                    // Better: check if this specific word part of matched list is hard without NLP.
                    // Let's stick to the requirements: "User answer analysis... matched in green"
                    // Doing full text highlighting via regex for all keywords:
                    return <span key={i}>{word}</span>;
                })}
                {/* 
                   Wait, improved approach below: 
                   We will just render the text, but since precise highlighting in a textarea string is hard, 
                   we will rely on the "Result Report" section for the matched/missing feedback as primary.
                   For the "My Answer" view, let's try to highlight simply.
                */}
            </div>
        );
    };

    // Better highlighter for "My Answer Analysis"
    const HighlightedUserAnswer = () => {
        if (!result) return null;

        // Regex to match any of the matched keywords
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
        <div className="flex flex-col h-full bg-slate-950 text-white p-6 overflow-y-auto animate-in fade-in duration-300">
            {/* Header / Nav */}
            <div className="flex items-center justify-between mb-8">
                <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-bold transition-colors">
                    <ArrowRight className="rotate-180" size={16} /> 나가기
                </button>
                <div className="flex items-center gap-2 text-sm text-slate-500 font-mono">
                    <BookOpen size={14} />
                    <span>Problem {currentIndex + 1} / {problems.length}</span>
                </div>
            </div>

            {/* Problem Card */}
            <div className="w-full max-w-4xl mx-auto space-y-6">
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
                        <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
                            <PenLine size={14} /> Your Answer
                        </div>
                        <textarea
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            placeholder="이곳에 답안을 서술하세요..."
                            className="w-full h-64 p-6 bg-slate-50 text-slate-900 text-lg leading-relaxed outline-none resize-none placeholder:text-slate-400 font-sans"
                            spellCheck="false"
                        />
                        <div className="absolute bottom-4 right-4">
                            <button
                                onClick={handleSubmit}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-blue-500/30 transition-all transform hover:-translate-y-1 active:translate-y-0"
                            >
                                <Check size={20} /> 제출 및 채점 (Check)
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Result Section */
                    <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
                        {/* Status Badge */}
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
                            {/* User Answer Feedback */}
                            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl">
                                <h3 className="text-slate-900 font-bold mb-4 flex items-center gap-2">
                                    <CheckCircle2 size={20} className="text-blue-600" /> 나의 답안 분석
                                </h3>
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 h-64 overflow-y-auto">
                                    <HighlightedUserAnswer />
                                </div>
                            </div>

                            {/* Model Answer & Missing Keywords */}
                            <div className="space-y-4">
                                <div className="bg-emerald-900/30 rounded-2xl p-6 border border-emerald-500/30">
                                    <h3 className="text-emerald-400 font-bold mb-4 flex items-center gap-2">
                                        <BookOpen size={20} /> 모범 답안
                                    </h3>
                                    <p className="text-emerald-100 whitespace-pre-wrap leading-relaxed text-sm">
                                        {problem.modelAnswer}
                                    </p>
                                </div>

                                {result.missing.length > 0 ? (
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
                                ) : (
                                    <div className="bg-emerald-900/30 rounded-2xl p-6 border border-emerald-500/30 flex items-center gap-3">
                                        <CheckCircle2 size={32} className="text-emerald-500" />
                                        <div>
                                            <p className="text-emerald-400 font-bold">Perfect!</p>
                                            <p className="text-emerald-200/70 text-sm">모든 핵심 키워드가 포함되었습니다.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
