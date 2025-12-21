import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Eraser, Eye, PenTool, CheckCircle2, ChevronLeft, ChevronRight, Shuffle } from 'lucide-react';
import { QUESTIONS } from '../data/questions';

export default function Workbook({ isExamMode, subject }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    // State
    const [isRandom, setIsRandom] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0); // Index within filteredQuestions
    const [showAnswer, setShowAnswer] = useState(false);
    const [shuffledIndices, setShuffledIndices] = useState([]);

    const [isDrawing, setIsDrawing] = useState(false);
    const [context, setContext] = useState(null);

    // 4. Visual Synchronization (Theme)
    // Blue for Mechanical, Orange for Electrical
    const theme = subject === 'mechanical'
        ? {
            accent: 'text-blue-400',
            bg: 'bg-blue-600',
            border: 'border-blue-500',
            highlight: 'bg-blue-500/10',
            ring: 'ring-blue-500'
        }
        : {
            accent: 'text-orange-400',
            bg: 'bg-orange-600',
            border: 'border-orange-500',
            highlight: 'bg-orange-500/10',
            ring: 'ring-orange-500'
        };

    // 2. Category Filtering Logic
    const filteredQuestions = useMemo(() => {
        return QUESTIONS.filter(q => q.category === subject);
    }, [subject]);

    // Shuffle & Reset Logic
    useEffect(() => {
        const indices = filteredQuestions.map((_, i) => i);
        if (isRandom) {
            // Fisher-Yates Shuffle
            for (let i = indices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [indices[i], indices[j]] = [indices[j], indices[i]];
            }
        }
        setShuffledIndices(indices);
        setCurrentIndex(0);
        setShowAnswer(false);
    }, [subject, isRandom, filteredQuestions]);

    const activeQuestionIndex = shuffledIndices[currentIndex] || 0;
    const currentData = filteredQuestions[activeQuestionIndex];

    // Auto-Clear Canvas on Question Change
    useEffect(() => {
        if (context && canvasRef.current) {
            context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            setShowAnswer(false);
        }
    }, [activeQuestionIndex, context, subject]);

    // Navigation
    const goNext = () => setCurrentIndex((prev) => (prev + 1) % filteredQuestions.length);
    const goPrev = () => setCurrentIndex((prev) => (prev - 1 + filteredQuestions.length) % filteredQuestions.length);

    // Canvas Init
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas && containerRef.current) {
            const parent = containerRef.current;
            const initCanvas = () => {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
                const ctx = canvas.getContext('2d');
                ctx.strokeStyle = subject === 'mechanical' ? '#60a5fa' : '#fb923c';
                ctx.lineWidth = 2.5;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                setContext(ctx);
            };
            initCanvas();
            const handleResize = () => initCanvas();
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, [currentIndex, subject]);

    // Drawing
    const getPos = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    }
    const startDrawing = (e) => {
        if (e.cancelable) e.preventDefault();
        setIsDrawing(true);
        const { x, y } = getPos(e);
        context?.beginPath();
        context?.moveTo(x, y);
    };
    const draw = (e) => {
        if (e.cancelable) e.preventDefault();
        if (!isDrawing) return;
        const { x, y } = getPos(e);
        context?.lineTo(x, y);
        context?.stroke();
    };
    const stopDrawing = () => { setIsDrawing(false); context?.closePath(); };

    // 3. Highlight Logic (#FEF08A)
    const renderAnswer = (text, keywords = []) => {
        if (!text) return null;

        let parts = [{ text: text, highlight: false }];

        // Iteratively split by keywords
        keywords.forEach(keyword => {
            let newParts = [];
            parts.forEach(part => {
                if (part.highlight) {
                    newParts.push(part);
                } else {
                    const regex = new RegExp(`(${keyword})`, 'gi');
                    const split = part.text.split(regex);
                    split.forEach(s => {
                        if (s.toLowerCase() === keyword.toLowerCase()) {
                            newParts.push({ text: s, highlight: true });
                        } else if (s.length > 0) {
                            newParts.push({ text: s, highlight: false });
                        }
                    });
                }
            });
            parts = newParts;
        });

        return (
            <div className="leading-relaxed whitespace-pre-line text-lg">
                {parts.map((part, i) => (
                    <span key={i} className={part.highlight ? "bg-[#FEF08A] text-slate-900 px-1.5 py-0.5 rounded box-decoration-clone font-extrabold shadow-sm mx-0.5" : ""}>
                        {part.text}
                    </span>
                ))}
            </div>
        );
    };

    if (!currentData) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center h-full bg-slate-900 text-slate-500">
                <p className="text-xl font-bold">No Questions Found</p>
                <p>해당 분야({subject})의 문제가 없습니다.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-900/50 font-sans">

            {/* Header: Controls & Title */}
            <div className={`flex flex-col md:flex-row md:items-center justify-between px-6 py-4 border-b ${theme.border} bg-slate-900/60 backdrop-blur-md shadow-sm gap-3 transition-colors duration-500`}>
                <div className="flex items-center gap-4">
                    <div className={`p-1.5 rounded-lg flex gap-1 border ${theme.border} bg-slate-800/50`}>
                        <span className={`px-3 py-1 text-xs font-bold rounded-md uppercase tracking-wider transition-colors duration-500 ${theme.accent}`}>
                            {subject === 'mechanical' ? 'MECHANICAL (기계)' : 'ELECTRICAL (전기)'}
                        </span>
                    </div>

                    <button
                        onClick={() => setIsRandom(!isRandom)}
                        className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${isRandom ? 'bg-purple-600 text-white border-purple-500 shadow-lg' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}`}
                    >
                        <Shuffle size={14} />
                        <span className="hidden sm:inline">{isRandom ? 'RANDOM MODE' : 'NORMAL MODE'}</span>
                    </button>
                </div>

                {/* Top Navigation Buttons */}
                <div className="flex gap-2">
                    <button onClick={goPrev} className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition active:scale-95 border border-slate-700">
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={goNext} className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition active:scale-95 border border-slate-700">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Question Display Area */}
            <div className={`px-8 py-6 border-b ${theme.border} bg-slate-900/80 backdrop-blur-xl shadow-lg relative z-10 transition-colors duration-500`}>
                <div className="flex flex-col gap-3">
                    <span className={`self-start text-[10px] font-bold px-2 py-1 rounded border tracking-wider uppercase
                        ${theme.highlight} ${theme.accent} ${theme.border}`}>
                        {currentData.tag}
                    </span>
                    <h2 className="text-xl md:text-2xl font-bold text-slate-50 leading-snug">
                        Q{currentData.id}. {currentData.q}
                    </h2>
                </div>
            </div>

            {/* Canvas & Answer Area */}
            <div ref={containerRef} className="flex-1 relative bg-slate-900 overflow-hidden">
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                {/* Answer Overlay */}
                <div className={`absolute inset-0 p-8 overflow-y-auto transition-all duration-300 pointer-events-none z-0 scrollbar-hide flex items-center justify-center
                        ${showAnswer ? 'opacity-100 backdrop-blur-sm bg-slate-900/80' : 'opacity-0'}`}>
                    <div className="max-w-3xl w-full">
                        <div className="font-mono text-slate-200 drop-shadow-xl p-6 rounded-2xl border border-white/10 bg-white/5 shadow-2xl">
                            <div className="flex items-center gap-2 mb-4 text-emerald-400 font-bold uppercase tracking-widest text-xs">
                                <CheckCircle2 size={16} />
                                Model Answer
                            </div>
                            {renderAnswer(currentData.a, currentData.keywords)}
                        </div>
                    </div>
                </div>

                {/* Canvas */}
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full cursor-cell touch-none z-10"
                    onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
                />

                {!isDrawing && !showAnswer && (
                    <div className="absolute bottom-6 right-6 text-slate-500/50 text-xs pointer-events-none flex items-center bg-slate-900/40 px-4 py-2 rounded-full backdrop-blur border border-white/5 animate-pulse">
                        <PenTool className="inline mr-2" size={14} />
                        Write your answer here
                    </div>
                )}
            </div>

            {/* Footer Control Bar */}
            <div className="p-4 bg-slate-900/90 border-t border-white/5 flex justify-between items-center z-20 backdrop-blur-md">

                {/* Progress Indicator (Bottom Left) */}
                <div className={`text-sm font-bold font-mono ${theme.accent}`}>
                    현재 분야 문제: {currentIndex + 1} / {filteredQuestions.length}
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => { if (context) { context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); } }}
                        className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-slate-800 text-slate-400 hover:text-white border border-slate-700 hover:bg-slate-700 transition font-bold text-sm"
                    >
                        <Eraser size={18} />
                        <span className="hidden sm:inline">지우기</span>
                    </button>

                    <button
                        onClick={() => setShowAnswer(!showAnswer)}
                        className={`flex items-center space-x-2 px-8 py-3 rounded-xl transition-all font-bold text-sm shadow-xl active:scale-95 border
                            ${showAnswer
                                ? 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500 shadow-emerald-900/50'
                                : `${theme.bg} text-white ${theme.border} hover:opacity-90`}`}
                    >
                        <Eye size={18} />
                        <span>{showAnswer ? '정답 확인' : '정답 확인'}</span>
                    </button>
                </div>
            </div>

        </div>
    );
}
